import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { hashPassword, sha256Hex } from './crypto'
import { handleAdmin, handleAuth, isAdminUnlockActive, requireSetupToken } from './auth'

type TestUserRow = {
  id: string
  username: string
  display_name: string
  role: 'admin' | 'member'
  password_hash: string
  active: number
  password_reset_required: number
  created_at: string
  updated_at: string
}

type TestSessionRow = {
  id: string
  user_id: string
  user_name: string
  role: 'admin' | 'member'
  admin_unlocked_until: string | null
  created_at: string
  expires_at: string
}

type TestAttemptRow = {
  id: string
  bucket: string
  action: string
  created_at: string
  expires_at: string
}

type TestUserSeed = {
  id: string
  username: string
  displayName?: string
  role?: 'admin' | 'member'
  passwordHash: string
  active?: boolean
  passwordResetRequired?: boolean
}

function createAuthEnv(users: TestUserSeed[]) {
  const stamp = '2026-06-01T00:00:00.000Z'
  const state = {
    users: new Map<string, TestUserRow>(),
    sessions: new Map<string, TestSessionRow>(),
    auth_attempts: new Map<string, TestAttemptRow>(),
  }

  for (const user of users) {
    state.users.set(user.id, {
      id: user.id,
      username: user.username,
      display_name: user.displayName ?? user.username,
      role: user.role ?? 'member',
      password_hash: user.passwordHash,
      active: user.active === false ? 0 : 1,
      password_reset_required: user.passwordResetRequired ? 1 : 0,
      created_at: stamp,
      updated_at: stamp,
    })
  }

  const db = {
    prepare(sql: string) {
      const statement = {
        params: [] as unknown[],
        bind(...params: unknown[]) {
          statement.params = params
          return statement
        },
        async first<T>() {
          if (sql === 'SELECT * FROM users WHERE username = ?') {
            const [username] = statement.params as [string]
            const row = [...state.users.values()].find((candidate) => candidate.username === username)
            return row ? ({ ...row } as T) : null
          }

          if (sql === 'SELECT * FROM users WHERE id = ?') {
            const [userId] = statement.params as [string]
            const row = state.users.get(userId)
            return row ? ({ ...row } as T) : null
          }

          if (sql === 'SELECT user_id, user_name, role, admin_unlocked_until, expires_at FROM sessions WHERE id = ?') {
            const [sessionId] = statement.params as [string]
            const row = state.sessions.get(sessionId)
            return row
              ? ({
                  user_id: row.user_id,
                  user_name: row.user_name,
                  role: row.role,
                  admin_unlocked_until: row.admin_unlocked_until,
                  expires_at: row.expires_at,
                } as T)
              : null
          }

          if (sql === "SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1") {
            const row = [...state.users.values()].find((candidate) => candidate.role === 'admin' && candidate.active === 1)
            return row ? ({ id: row.id } as T) : null
          }

          if (sql === 'SELECT COUNT(*) as count FROM auth_attempts WHERE bucket = ? AND expires_at > ?') {
            const [bucket, now] = statement.params as [string, string]
            const count = [...state.auth_attempts.values()].filter((r) => r.bucket === bucket && r.expires_at > now).length
            return { count } as T
          }

          return null
        },
        async all<T>() {
          return { results: [] as T[] }
        },
        async run() {
          if (sql === 'INSERT INTO sessions (id, user_id, user_name, role, admin_unlocked_until, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)') {
            const [id, userId, userName, role, adminUnlockedUntil, createdAt, expiresAt] = statement.params as [string, string, string, 'admin' | 'member', string | null, string, string]
            state.sessions.set(id, {
              id,
              user_id: userId,
              user_name: userName,
              role,
              admin_unlocked_until: adminUnlockedUntil,
              created_at: createdAt,
              expires_at: expiresAt,
            })
            return { success: true }
          }

          if (sql === 'DELETE FROM sessions WHERE id = ?') {
            const [sessionId] = statement.params as [string]
            state.sessions.delete(sessionId)
            return { success: true }
          }

          if (sql === 'UPDATE users SET password_hash = ?, password_reset_required = 0, updated_at = ? WHERE id = ?') {
            const [passwordHash, updatedAt, userId] = statement.params as [string, string, string]
            const row = state.users.get(userId)
            if (row) {
              row.password_hash = passwordHash
              row.password_reset_required = 0
              row.updated_at = updatedAt
            }
            return { success: true }
          }

          if (sql === 'UPDATE sessions SET admin_unlocked_until = ? WHERE id = ?') {
            const [adminUnlockedUntil, sessionId] = statement.params as [string, string]
            const row = state.sessions.get(sessionId)
            if (row) row.admin_unlocked_until = adminUnlockedUntil
            return { success: true }
          }

          if (sql === 'INSERT INTO auth_attempts (id, bucket, action, created_at, expires_at) VALUES (?, ?, ?, ?, ?)') {
            const [id, bucket, action, created_at, expires_at] = statement.params as [string, string, string, string, string]
            state.auth_attempts.set(id, { id, bucket, action, created_at, expires_at })
            return { success: true }
          }

          if (sql === 'DELETE FROM auth_attempts WHERE expires_at <= ?') {
            const [now] = statement.params as [string]
            for (const [key, row] of state.auth_attempts) {
              if (row.expires_at <= now) state.auth_attempts.delete(key)
            }
            return { success: true }
          }

          if (sql === 'DELETE FROM auth_attempts WHERE bucket = ?') {
            const [bucket] = statement.params as [string]
            for (const [key, row] of state.auth_attempts) {
              if (row.bucket === bucket) state.auth_attempts.delete(key)
            }
            return { success: true }
          }

          return { success: true }
        },
      }

      return statement
    },
  }

  return { env: { DB: db } as any, state }
}

function createAuthRequest(path: 'login' | 'password', body: Record<string, unknown>, cookie = '') {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (cookie) headers.cookie = cookie

  return new Request(`https://frog-peach-home-hub.pages.dev/api/auth/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function postAuth(env: any, path: 'login' | 'password', body: Record<string, unknown>, cookie = '') {
  return handleAuth({ request: createAuthRequest(path, body, cookie), env } as any, [path])
}

function sessionCookie(response: Response) {
  return response.headers.get('set-cookie')?.split(';')[0] ?? ''
}

function createAdminUnlockRequest(body: Record<string, unknown>, cookie: string) {
  return new Request('https://frog-peach-home-hub.pages.dev/api/admin/unlock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

async function postAdminUnlock(env: any, body: Record<string, unknown>, cookie: string) {
  return handleAdmin({ request: createAdminUnlockRequest(body, cookie), env } as any, ['unlock'])
}

/**
 * Pre-populate a session for an admin user so admin-unlock tests don't need to go through login.
 * Returns the cookie string ready to be passed to a request.
 */
async function seedAdminSession(state: { sessions: Map<string, TestSessionRow> }, userId: string, userName: string): Promise<string> {
  const rawSession = 'test-admin-raw-session'
  const sessionId = await sha256Hex(rawSession)
  state.sessions.set(sessionId, {
    id: sessionId,
    user_id: userId,
    user_name: userName,
    role: 'admin',
    admin_unlocked_until: null,
    created_at: '2026-06-01T00:00:00.000Z',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  })
  return `fp_session=${rawSession}`
}

// ---------------------------------------------------------------------------
// Existing test suites (unchanged from Phase 1/2)
// ---------------------------------------------------------------------------

describe('admin unlock helper', () => {
  it('only treats future timestamps as active', () => {
    const now = new Date('2026-05-30T12:00:00Z').getTime()

    expect(isAdminUnlockActive('2026-05-30T12:05:00Z', now)).toBe(true)
    expect(isAdminUnlockActive('2026-05-30T11:59:59Z', now)).toBe(false)
    expect(isAdminUnlockActive('', now)).toBe(false)
    expect(isAdminUnlockActive('not-a-date', now)).toBe(false)
  })
})

describe('first-run setup token', () => {
  it('allows local setup without a token for development', () => {
    expect(() => requireSetupToken(new Request('http://localhost:8788/api/setup/admin', { method: 'POST' }), { SETUP_TOKEN: '' } as any, {})).not.toThrow()
  })

  it('blocks production setup when no token is configured', () => {
    expect(() => requireSetupToken(new Request('https://frog-peach-home-hub.pages.dev/api/setup/admin', { method: 'POST' }), {} as any, {})).toThrow(ApiError)
  })

  it('requires the configured setup token in production', () => {
    const request = new Request('https://frog-peach-home-hub.pages.dev/api/setup/admin', { method: 'POST' })

    expect(() => requireSetupToken(request, { SETUP_TOKEN: 'secret-token' } as any, { setupToken: 'wrong' })).toThrow(ApiError)
    expect(() => requireSetupToken(request, { SETUP_TOKEN: 'secret-token' } as any, { setupToken: 'secret-token' })).not.toThrow()
  })
})

describe('password reset login hardening', () => {
  it('rejects blank and wrong passwords for reset-required users', async () => {
    const { env } = createAuthEnv([
      {
        id: 'user-reset',
        username: 'reset-user',
        passwordHash: await hashPassword('TempPassword123!'),
        passwordResetRequired: true,
      },
    ])

    await expect(postAuth(env, 'login', { username: 'reset-user', password: '' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    })

    await expect(postAuth(env, 'login', { username: 'reset-user', password: 'wrong-password' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    })
  })

  it('allows reset-required users with the current password and flags password setup', async () => {
    const tempPassword = 'TempPassword123!'
    const { env } = createAuthEnv([
      {
        id: 'user-reset',
        username: 'reset-user',
        passwordHash: await hashPassword(tempPassword),
        passwordResetRequired: true,
      },
    ])

    const response = await postAuth(env, 'login', { username: 'reset-user', password: tempPassword })
    const payload = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      authenticated: true,
      userName: 'reset-user',
      passwordSetupRequired: true,
    })
    expect(sessionCookie(response)).toContain('fp_session=')
  })

  it('clears password_reset_required after setting a new password', async () => {
    const tempPassword = 'TempPassword123!'
    const nextPassword = 'BrandNewPassword456!'
    const { env, state } = createAuthEnv([
      {
        id: 'user-reset',
        username: 'reset-user',
        passwordHash: await hashPassword(tempPassword),
        passwordResetRequired: true,
      },
    ])

    const loginResponse = await postAuth(env, 'login', { username: 'reset-user', password: tempPassword })
    const cookie = sessionCookie(loginResponse)
    expect(cookie).toContain('fp_session=')

    const updateResponse = await postAuth(env, 'password', { password: nextPassword }, cookie)
    const updatePayload = await updateResponse.json() as Record<string, unknown>
    expect(updateResponse.status).toBe(200)
    expect(updatePayload).toMatchObject({
      authenticated: true,
      passwordSetupRequired: false,
    })
    expect(state.users.get('user-reset')?.password_reset_required).toBe(0)

    await expect(postAuth(env, 'login', { username: 'reset-user', password: tempPassword })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    })

    const relogin = await postAuth(env, 'login', { username: 'reset-user', password: nextPassword })
    const reloginPayload = await relogin.json() as Record<string, unknown>
    expect(reloginPayload).toMatchObject({
      authenticated: true,
      passwordSetupRequired: false,
    })
  })

  it('still requires the correct password for non-reset users', async () => {
    const currentPassword = 'CurrentPassword789!'
    const { env } = createAuthEnv([
      {
        id: 'user-normal',
        username: 'normal-user',
        passwordHash: await hashPassword(currentPassword),
        passwordResetRequired: false,
      },
    ])

    await expect(postAuth(env, 'login', { username: 'normal-user', password: '' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    })

    await expect(postAuth(env, 'login', { username: 'normal-user', password: 'wrong-password' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    })

    const login = await postAuth(env, 'login', { username: 'normal-user', password: currentPassword })
    const payload = await login.json() as Record<string, unknown>
    expect(payload).toMatchObject({
      authenticated: true,
      passwordSetupRequired: false,
    })
  })
})

// ---------------------------------------------------------------------------
// Phase 3: login rate limiting
// ---------------------------------------------------------------------------

describe('login rate limiting', () => {
  it('records a failed attempt when login fails', async () => {
    const { env, state } = createAuthEnv([])
    await expect(postAuth(env, 'login', { username: 'alice', password: 'wrong' })).rejects.toMatchObject({ status: 401 })
    expect(state.auth_attempts.size).toBe(1)
  })

  it('blocks login after reaching the failure threshold', async () => {
    const { env } = createAuthEnv([])
    for (let i = 0; i < 5; i++) {
      await expect(postAuth(env, 'login', { username: 'alice', password: 'wrong' })).rejects.toMatchObject({ status: 401 })
    }
    // 6th attempt must be rate-limited
    await expect(postAuth(env, 'login', { username: 'alice', password: 'wrong' })).rejects.toMatchObject({ status: 429 })
  })

  it('successful login before threshold succeeds and clears failed attempts', async () => {
    const password = 'GoodPassword123!'
    const { env, state } = createAuthEnv([
      { id: 'u1', username: 'alice', passwordHash: await hashPassword(password) },
    ])

    // Record one failure
    await expect(postAuth(env, 'login', { username: 'alice', password: 'wrong' })).rejects.toMatchObject({ status: 401 })
    expect(state.auth_attempts.size).toBe(1)

    // Successful login clears the failure record
    const res = await postAuth(env, 'login', { username: 'alice', password })
    expect(res.status).toBe(200)
    expect(state.auth_attempts.size).toBe(0)
  })

  it('rate-limits blank username attempts using the _blank_ bucket', async () => {
    const { env } = createAuthEnv([])
    for (let i = 0; i < 5; i++) {
      await expect(postAuth(env, 'login', { username: '', password: 'anything' })).rejects.toMatchObject({ status: 401 })
    }
    await expect(postAuth(env, 'login', { username: '', password: 'anything' })).rejects.toMatchObject({ status: 429 })
  })

  it('rate-limits missing username field using the _blank_ bucket', async () => {
    const { env } = createAuthEnv([])
    for (let i = 0; i < 5; i++) {
      await expect(postAuth(env, 'login', { password: 'anything' })).rejects.toMatchObject({ status: 401 })
    }
    await expect(postAuth(env, 'login', { password: 'anything' })).rejects.toMatchObject({ status: 429 })
  })
})

// ---------------------------------------------------------------------------
// Phase 3: admin unlock rate limiting
// ---------------------------------------------------------------------------

describe('admin unlock rate limiting', () => {
  const ADMIN_ID = 'admin-rl-1'
  const ADMIN_USERNAME = 'admin-rl'

  it('records a failed attempt when admin unlock fails', async () => {
    const password = 'AdminPass123!'
    const { env, state } = createAuthEnv([
      { id: ADMIN_ID, username: ADMIN_USERNAME, role: 'admin', passwordHash: await hashPassword(password) },
    ])
    const cookie = await seedAdminSession(state, ADMIN_ID, ADMIN_USERNAME)

    await expect(postAdminUnlock(env, { password: 'wrong' }, cookie)).rejects.toMatchObject({ status: 401 })
    expect(state.auth_attempts.size).toBe(1)
  })

  it('blocks admin unlock after reaching the failure threshold', async () => {
    const password = 'AdminPass123!'
    const { env, state } = createAuthEnv([
      { id: ADMIN_ID, username: ADMIN_USERNAME, role: 'admin', passwordHash: await hashPassword(password) },
    ])
    const cookie = await seedAdminSession(state, ADMIN_ID, ADMIN_USERNAME)

    for (let i = 0; i < 5; i++) {
      await expect(postAdminUnlock(env, { password: 'wrong' }, cookie)).rejects.toMatchObject({ status: 401 })
    }
    // 6th attempt must be rate-limited
    await expect(postAdminUnlock(env, { password: 'wrong' }, cookie)).rejects.toMatchObject({ status: 429 })
  })

  it('successful admin unlock clears failed attempts', async () => {
    const password = 'AdminPass123!'
    const { env, state } = createAuthEnv([
      { id: ADMIN_ID, username: ADMIN_USERNAME, role: 'admin', passwordHash: await hashPassword(password) },
    ])
    const cookie = await seedAdminSession(state, ADMIN_ID, ADMIN_USERNAME)

    // Record one failure
    await expect(postAdminUnlock(env, { password: 'wrong' }, cookie)).rejects.toMatchObject({ status: 401 })
    expect(state.auth_attempts.size).toBe(1)

    // Successful unlock clears the failure record
    const res = await postAdminUnlock(env, { password }, cookie)
    expect(res.status).toBe(200)
    expect(state.auth_attempts.size).toBe(0)
  })
})
