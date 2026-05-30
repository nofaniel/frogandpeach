import { describe, expect, it } from 'vitest'
import { isAdminUnlockActive } from './auth'

describe('admin unlock helper', () => {
  it('only treats future timestamps as active', () => {
    const now = new Date('2026-05-30T12:00:00Z').getTime()

    expect(isAdminUnlockActive('2026-05-30T12:05:00Z', now)).toBe(true)
    expect(isAdminUnlockActive('2026-05-30T11:59:59Z', now)).toBe(false)
    expect(isAdminUnlockActive('', now)).toBe(false)
    expect(isAdminUnlockActive('not-a-date', now)).toBe(false)
  })
})
