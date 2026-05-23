import { sha256Hex, verifyPassword } from './crypto'
import { ApiError, json, nowIso, readJson } from './http'
import type { ApiContext, Env } from './types'

const COOKIE_NAME = 'fp_session'

type LoginBody = {
  username?: string
  password?: string
}

export type Session = {
  userName: string
}

export async function handleAuth(context: ApiContext, parts: string[]) {
  const { request, env } = context

  if (parts[0] === 'login' && request.method === 'POST') return login(request, env)
  if (parts[0] === 'logout' && request.method === 'POST') return logout(request, env)
  if (parts[0] === 'me' && request.method === 'GET') {
    const session = await getSession(request, env)
    return json({ authenticated: Boolean(session), userName: session?.userName ?? null })
  }

  return json({ error: 'Not found' }, { status: 404 })
}

export async function requireSession(request: Request, env: Env) {
  const session = await getSession(request, env)
  if (!session) throw new ApiError(401, 'Login required.')
  return session
}

async function login(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD_HASH) {
    throw new ApiError(503, 'ADMIN_PASSWORD_HASH is not configured.')
  }

  const body = await readJson<LoginBody>(request)
  const configuredUser = env.ADMIN_USERNAME || 'admin'
  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')

  if (username !== configuredUser || !(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
    throw new ApiError(401, 'Invalid username or password.')
  }

  const rawSession = crypto.randomUUID()
  const sessionId = await sha256Hex(rawSession)
  const createdAt = nowIso()
  const maxAge = sessionMaxAgeSeconds(env)
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString()

  await env.DB.prepare('INSERT INTO sessions (id, user_name, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(sessionId, username, createdAt, expiresAt).run()

  return json(
    { authenticated: true, userName: username },
    {
      headers: {
        'set-cookie': buildCookie(request, rawSession, maxAge),
      },
    },
  )
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

async function getSession(request: Request, env: Env): Promise<Session | null> {
  const raw = getCookie(request.headers.get('cookie') || '', COOKIE_NAME)
  if (!raw) return null

  const sessionId = await sha256Hex(raw)
  const row = await env.DB.prepare('SELECT user_name, expires_at FROM sessions WHERE id = ?').bind(sessionId).first<{ user_name: string; expires_at: string }>()
  if (!row) return null

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
    return null
  }

  return { userName: row.user_name }
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
