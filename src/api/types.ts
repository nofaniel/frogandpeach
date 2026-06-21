export type Env = {
  DB: D1Database
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD_HASH?: string
  APP_ORIGIN?: string
  SETUP_TOKEN?: string
  SESSION_TTL_DAYS?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  TOKEN_ENC_KEY?: string
}

export type ApiContext = EventContext<Env, string, Record<string, unknown>>

export type JsonResponseInit = ResponseInit & {
  headers?: HeadersInit
}

export type DbRow = Record<string, unknown>
