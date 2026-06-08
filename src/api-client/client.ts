import type { Session } from '../shared/api-types'

export const loggedOutSession: Session = {
  authenticated: false,
  userId: null,
  userName: null,
  displayName: null,
  role: null,
  adminUnlocked: false,
  adminUnlockedUntil: null,
  passwordSetupRequired: false,
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}, requireOk = true): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api/')) {
      throw new Error('API not found in Vite-only mode. Use `npm run dev:worker` and open http://localhost:8788.')
    }
    if (!requireOk && response.status === 401) return { ...loggedOutSession } as T
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
