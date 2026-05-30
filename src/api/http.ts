import type { JsonResponseInit } from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function json(data: unknown, init: JsonResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError(400, 'Expected a JSON request body.')
  }
}

export function methodNotAllowed() {
  return json({ error: 'Method not allowed' }, { status: 405 })
}

export function notFound() {
  return json({ error: 'Not found' }, { status: 404 })
}

export function rowString(row: Record<string, unknown>, key: string) {
  return String(row[key] ?? '')
}

export function rowNumber(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return typeof value === 'number' ? value : Number(value ?? 0)
}

export function nowIso() {
  return new Date().toISOString()
}

export function id(prefix = 'fp') {
  return `${prefix}_${crypto.randomUUID()}`
}

export function normaliseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(',')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}
