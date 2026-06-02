import { hashPassword, sha256Hex, verifyPassword } from './crypto'
import { ApiError, id, json, nowIso, readJson, rowNumber, rowString } from './http'
import type { ApiContext, DbRow, Env } from './types'

const COOKIE_NAME = 'fp_session'
const ADMIN_UNLOCK_SECONDS = 15 * 60

type LoginBody = {
  username?: string
  password?: string
}

type PasswordBody = {
  password?: string
  currentPassword?: string
}

type SetupBody = LoginBody & {
  displayName?: string
  setupToken?: string
}

export type UserRole = 'admin' | 'member'

export type Session = {
  userId: string
  userName: string
  displayName: string
  role: UserRole
  adminUnlocked: boolean
  adminUnlockedUntil: string | null
  passwordSetupRequired: boolean
}

export type UserRecord = {
  id: string
  username: string
  displayName: string
  role: UserRole
  active: boolean
  passwordResetRequired: boolean
  createdAt: string
  updatedAt: string
}

export async function handleSetup(context: ApiContext, parts: string[]) {
  if (parts[0] === 'status' && context.request.method === 'GET') return json(await getSetupStatus(context.env))
  if (parts[0] === 'admin' && context.request.method === 'POST') return setupAdmin(context.request, context.env)
  return json({ error: 'Not found' }, { status: 404 })
}

export async function handleAuth(context: ApiContext, parts: string[]) {
  const { request, env } = context

  if (parts[0] === 'login' && request.method === 'POST') return login(request, env)
  if (parts[0] === 'password' && request.method === 'POST') return updateOwnPassword(request, env)
  if (parts[0] === 'logout' && request.method === 'POST') return logout(request, env)
  if (parts[0] === 'me' && request.method === 'GET') {
    const session = await getSession(request, env)
    return json({
      authenticated: Boolean(session),
      userId: session?.userId ?? null,
      userName: session?.userName ?? null,
      displayName: session?.displayName ?? null,
      role: session?.role ?? null,
      adminUnlocked: session?.adminUnlocked ?? false,
      adminUnlockedUntil: session?.adminUnlockedUntil ?? null,
      passwordSetupRequired: session?.passwordSetupRequired ?? false,
    })
  }

  return json({ error: 'Not found' }, { status: 404 })
}

export async function handleAdmin(context: ApiContext, parts: string[]) {
  if (parts[0] === 'unlock' && context.request.method === 'POST') return unlockAdmin(context.request, context.env)
  if (parts[0] === 'status' && context.request.method === 'GET') {
    const session = await requireSession(context.request, context.env)
    return json({ adminUnlocked: session.adminUnlocked, role: session.role })
  }
  return json({ error: 'Not found' }, { status: 404 })
}

export async function getSetupStatus(env: Env) {
  return { needsSetup: !(await hasAdmin(env)) }
}

export async function requireSession(request: Request, env: Env) {
  const session = await getSession(request, env)
  if (!session) throw new ApiError(401, 'Login required.')
  return session
}

export async function requireAdminUnlock(request: Request, env: Env) {
  const session = await requireSession(request, env)
  if (!session.adminUnlocked) throw new ApiError(403, 'Admin unlock required.')
  return session
}

export async function listUsers(env: Env) {
  const rows = (await env.DB.prepare('SELECT id, username, display_name, role, active, password_reset_required, created_at, updated_at FROM users ORDER BY role, username').all<DbRow>()).results ?? []
  return rows.map(toUser)
}

export async function createUser(env: Env, input: { username?: string; displayName?: string; role?: string; password?: string }) {
  const username = cleanUsername(input.username)
  const displayName = String(input.displayName ?? '').trim() || username
  const role = normaliseRole(input.role)
  const password = String(input.password ?? '')
  if (!username) throw new ApiError(400, 'Username is required.')
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.')

  const stamp = nowIso()
  const userId = id('user')
  try {
    await env.DB.prepare('INSERT INTO users (id, username, display_name, role, password_hash, active, password_reset_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)')
      .bind(userId, username, displayName, role, await hashPassword(password), stamp, stamp)
      .run()
  } catch (err) {
    const msg = String((err as { message?: string }).message ?? err)
    if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
      throw new ApiError(409, 'Username already taken.')
    }
    throw err
  }
  return getUserById(env, userId)
}

export async function updateUser(env: Env, userId: string, patch: { username?: string; displayName?: string; role?: string; password?: string; active?: boolean; passwordResetRequired?: boolean }) {
  const row = await getUserRowById(env, userId)
  if (!row) return null

  const username = patch.username === undefined ? rowString(row, 'username') : cleanUsername(patch.username)
  const displayName = patch.displayName === undefined ? rowString(row, 'display_name') : String(patch.displayName).trim() || username
  const role = patch.role === undefined ? rowString(row, 'role') : normaliseRole(patch.role)
  const active = patch.active === undefined ? rowNumber(row, 'active') === 1 : Boolean(patch.active)
  const passwordResetRequired = patch.passwordResetRequired === undefined ? rowNumber(row, 'password_reset_required') === 1 : Boolean(patch.passwordResetRequired)
  if (!username) throw new ApiError(400, 'Username is required.')

  if (patch.password !== undefined && String(patch.password).length > 0) {
    if (String(patch.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters.')
    try {
      await env.DB.prepare('UPDATE users SET username = ?, display_name = ?, role = ?, active = ?, password_hash = ?, password_reset_required = 0, updated_at = ? WHERE id = ?')
        .bind(username, displayName, role, active ? 1 : 0, await hashPassword(String(patch.password)), nowIso(), userId)
        .run()
    } catch (err) {
      const msg = String((err as { message?: string }).message ?? err)
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) throw new ApiError(409, 'Username already taken.')
      throw err
    }
  } else {
    try {
      await env.DB.prepare('UPDATE users SET username = ?, display_name = ?, role = ?, active = ?, password_reset_required = ?, updated_at = ? WHERE id = ?')
        .bind(username, displayName, role, active ? 1 : 0, passwordResetRequired ? 1 : 0, nowIso(), userId)
        .run()
    } catch (err) {
      const msg = String((err as { message?: string }).message ?? err)
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) throw new ApiError(409, 'Username already taken.')
      throw err
    }
  }

  return getUserById(env, userId)
}

export async function getSession(request: Request, env: Env): Promise<Session | null> {
  const raw = getCookie(request.headers.get('cookie') || '', COOKIE_NAME)
  if (!raw) return null

  const sessionId = await sha256Hex(raw)
  const row = await env.DB.prepare('SELECT user_id, user_name, role, admin_unlocked_until, expires_at FROM sessions WHERE id = ?').bind(sessionId).first<DbRow>()
  if (!row) return null

  if (new Date(rowString(row, 'expires_at')).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
    return null
  }

  const userId = rowString(row, 'user_id')
  const user = userId ? await getUserRowById(env, userId) : await getUserRowByUsername(env, rowString(row, 'user_name'))
  if (!user || rowNumber(user, 'active') !== 1) return null

  const adminUnlockedUntil = rowString(row, 'admin_unlocked_until')
  const passwordSetupRequired = rowNumber(user, 'password_reset_required') === 1
  return {
    userId: rowString(user, 'id'),
    userName: rowString(user, 'username'),
    displayName: rowString(user, 'display_name'),
    role: normaliseRole(rowString(user, 'role')),
    adminUnlocked: isAdminUnlockActive(adminUnlockedUntil),
    adminUnlockedUntil: adminUnlockedUntil || null,
    passwordSetupRequired,
  }
}

export function isAdminUnlockActive(value: string, now = Date.now()) {
  return Boolean(value && new Date(value).getTime() > now)
}

async function setupAdmin(request: Request, env: Env) {
  if (await hasAdmin(env)) throw new ApiError(409, 'Admin account already exists.')
  const body = await readJson<SetupBody>(request)
  requireSetupToken(request, env, body)
  const created = await createUser(env, { ...body, role: 'admin' })
  if (!created) throw new ApiError(500, 'Admin account could not be created.')
  return createSessionResponse(request, env, created.id, created.username, created.role, true)
}

export function requireSetupToken(request: Request, env: Env, body: SetupBody) {
  const expected = String(env.SETUP_TOKEN ?? '').trim()
  const isLocal = isLocalRequest(request)

  if (!expected && isLocal) return
  if (!expected) throw new ApiError(403, 'First-run setup is disabled until SETUP_TOKEN is configured.')

  const supplied = String(body.setupToken ?? request.headers.get('x-setup-token') ?? '').trim()
  if (supplied !== expected) throw new ApiError(403, 'Invalid setup token.')
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

async function login(request: Request, env: Env) {
  const body = await readJson<LoginBody>(request)
  const username = cleanUsername(body.username)
  const password = String(body.password ?? '')
  const user = await getUserRowByUsername(env, username)
  const passwordSetupRequired = Boolean(user && rowNumber(user, 'password_reset_required') === 1)

  if (!user || rowNumber(user, 'active') !== 1) {
    throw new ApiError(401, 'Invalid username or password.')
  }

  if (passwordSetupRequired) {
    if (password.length > 0) {
      throw new ApiError(401, 'Use your username only, then set a new password.')
    }
  } else if (!(await verifyPassword(password, rowString(user, 'password_hash')))) {
    throw new ApiError(401, 'Invalid username or password.')
  }

  return createSessionResponse(request, env, rowString(user, 'id'), rowString(user, 'username'), normaliseRole(rowString(user, 'role')), false, passwordSetupRequired)
}

async function unlockAdmin(request: Request, env: Env) {
  const session = await requireSession(request, env)
  const body = await readJson<LoginBody>(request)
  const username = cleanUsername(body.username || session.userName)
  const password = String(body.password ?? '')
  const user = await getUserRowByUsername(env, username)

  if (!user || normaliseRole(rowString(user, 'role')) !== 'admin' || rowNumber(user, 'active') !== 1 || !(await verifyPassword(password, rowString(user, 'password_hash')))) {
    throw new ApiError(401, 'Invalid admin credentials.')
  }

  const raw = getCookie(request.headers.get('cookie') || '', COOKIE_NAME)
  if (!raw) throw new ApiError(401, 'Login required.')
  const unlockedUntil = new Date(Date.now() + ADMIN_UNLOCK_SECONDS * 1000).toISOString()
  await env.DB.prepare('UPDATE sessions SET admin_unlocked_until = ? WHERE id = ?').bind(unlockedUntil, await sha256Hex(raw)).run()
  return json({ adminUnlocked: true, unlockedUntil })
}

async function updateOwnPassword(request: Request, env: Env) {
  const session = await requireSession(request, env)
  const body = await readJson<PasswordBody>(request)
  const password = String(body.password ?? '')
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.')

  const user = await getUserRowById(env, session.userId)
  if (!user) throw new ApiError(404, 'User not found.')

  const passwordResetRequired = rowNumber(user, 'password_reset_required') === 1
  if (!passwordResetRequired) {
    const currentPassword = String(body.currentPassword ?? '')
    if (!currentPassword || !(await verifyPassword(currentPassword, rowString(user, 'password_hash')))) {
      throw new ApiError(401, 'Current password is required.')
    }
  }

  await env.DB.prepare('UPDATE users SET password_hash = ?, password_reset_required = 0, updated_at = ? WHERE id = ?')
    .bind(await hashPassword(password), nowIso(), session.userId)
    .run()

  const updatedSession = await getSession(request, env)
  if (!updatedSession) throw new ApiError(500, 'Password could not be updated.')
  return json({ authenticated: true, ...updatedSession })
}

async function logout(request: Request, env: Env) {
  const raw = getCookie(request.headers.get('cookie') || '', COOKIE_NAME)
  if (raw) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(raw)).run()
  }

  return json(
    { authenticated: false },
    {
      headers: {
        'set-cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    },
  )
}

async function createSessionResponse(request: Request, env: Env, userId: string, username: string, role: UserRole, unlockAdminNow: boolean, passwordSetupRequired = false) {
  const rawSession = crypto.randomUUID()
  const sessionId = await sha256Hex(rawSession)
  const createdAt = nowIso()
  const maxAge = sessionMaxAgeSeconds(env)
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString()
  const adminUnlockedUntil = unlockAdminNow && role === 'admin' ? new Date(Date.now() + ADMIN_UNLOCK_SECONDS * 1000).toISOString() : null

  await env.DB.prepare('INSERT INTO sessions (id, user_id, user_name, role, admin_unlocked_until, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(sessionId, userId, username, role, adminUnlockedUntil, createdAt, expiresAt)
    .run()

  const user = await getUserById(env, userId)
  return json(
    { authenticated: true, userId, userName: username, displayName: user?.displayName ?? username, role, adminUnlocked: Boolean(adminUnlockedUntil), adminUnlockedUntil, passwordSetupRequired },
    {
      headers: {
        'set-cookie': buildCookie(request, rawSession, maxAge),
      },
    },
  )
}

async function hasAdmin(env: Env) {
  const row = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").first<DbRow>()
  return Boolean(row)
}

async function getUserById(env: Env, userId: string) {
  const row = await getUserRowById(env, userId)
  return row ? toUser(row) : null
}

async function getUserRowById(env: Env, userId: string) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<DbRow>()
}

async function getUserRowByUsername(env: Env, username: string) {
  if (!username) return null
  return env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<DbRow>()
}

function toUser(row: DbRow): UserRecord {
  return {
    id: rowString(row, 'id'),
    username: rowString(row, 'username'),
    displayName: rowString(row, 'display_name'),
    role: normaliseRole(rowString(row, 'role')),
    active: rowNumber(row, 'active') === 1,
    passwordResetRequired: rowNumber(row, 'password_reset_required') === 1,
    createdAt: rowString(row, 'created_at'),
    updatedAt: rowString(row, 'updated_at'),
  }
}

function normaliseRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'member'
}

function cleanUsername(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function sessionMaxAgeSeconds(env: Env) {
  const days = Number(env.SESSION_TTL_DAYS ?? 14)
  return Math.max(1, Math.min(days, 90)) * 24 * 60 * 60
}

function buildCookie(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function getCookie(header: string, name: string) {
  return header
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}
