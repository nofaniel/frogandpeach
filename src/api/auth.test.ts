import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { isAdminUnlockActive, requireSetupToken } from './auth'

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
