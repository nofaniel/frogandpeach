import { sha256Hex } from './crypto'
import { ApiError, id, nowIso } from './http'
import type { Env } from './types'

/** Maximum number of failed attempts within the window before a bucket is blocked. */
const MAX_ATTEMPTS = 5

/** Sliding-window duration in seconds. Each failure record expires after this interval. */
const WINDOW_SECONDS = 15 * 60

/**
 * Build a stable, opaque bucket key for a given (action, username, client-IP) tuple.
 *
 * - action:   'login' | 'unlock' — prevents cross-endpoint key collisions.
 * - username: trimmed + lower-cased; falls back to '_blank_' when absent.
 * - IP:       taken from CF-Connecting-IP then X-Forwarded-For; falls back to '_unknown_'.
 *             The raw IP is hashed before being embedded in the bucket so no raw address
 *             is stored in D1.
 */
async function buildBucket(request: Request, action: string, username: string): Promise<string> {
  const rawIp =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ??
    '_unknown_'
  const ipHash = await sha256Hex(rawIp)
  const user = username.trim().toLowerCase() || '_blank_'
  return sha256Hex(`${action}|${user}|${ipHash}`)
}

/**
 * Assert that this (action, username, IP) bucket has not exceeded the failure threshold.
 * Throws HTTP 429 if blocked. Must be called before any credential verification.
 */
export async function assertAuthNotRateLimited(env: Env, request: Request, action: string, username: string): Promise<void> {
  const bucket = await buildBucket(request, action, username)
  const now = nowIso()
  const row = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM auth_attempts WHERE bucket = ? AND expires_at > ?',
  )
    .bind(bucket, now)
    .first<{ count: number }>()
  if ((row?.count ?? 0) >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many failed attempts. Please try again later.')
  }
}

/**
 * Record one failed authentication attempt for this bucket.
 * Opportunistically deletes expired rows from the table.
 */
export async function recordAuthFailure(env: Env, request: Request, action: string, username: string): Promise<void> {
  const bucket = await buildBucket(request, action, username)
  const now = nowIso()
  const expiresAt = new Date(Date.now() + WINDOW_SECONDS * 1000).toISOString()
  await env.DB.prepare(
    'INSERT INTO auth_attempts (id, bucket, action, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id('atmp'), bucket, action, now, expiresAt)
    .run()
  // Opportunistic cleanup: remove rows already past their expiry window.
  await env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at <= ?').bind(now).run()
}

/**
 * Clear all unexpired failure records for this bucket after a successful authentication.
 */
export async function clearAuthFailures(env: Env, request: Request, action: string, username: string): Promise<void> {
  const bucket = await buildBucket(request, action, username)
  await env.DB.prepare('DELETE FROM auth_attempts WHERE bucket = ?').bind(bucket).run()
}
