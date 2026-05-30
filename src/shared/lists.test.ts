import { describe, expect, it } from 'vitest'
import { normaliseListType, resetKeyForListType, shouldRefreshList } from './lists'

describe('list type period refresh', () => {
  it('normalises unknown list types to basic', () => {
    expect(normaliseListType('shopping')).toBe('shopping')
    expect(normaliseListType('unknown')).toBe('basic')
  })

  it('uses calendar dates for daily checklists', () => {
    const date = new Date('2026-05-30T10:00:00Z')

    expect(resetKeyForListType('daily_checklist', date)).toBe('2026-05-30')
    expect(shouldRefreshList('daily_checklist', '2026-05-29', date)).toBe(true)
    expect(shouldRefreshList('daily_checklist', '2026-05-30', date)).toBe(false)
  })

  it('uses ISO week keys for weekly chores', () => {
    expect(resetKeyForListType('weekly_chore', new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01')
    expect(shouldRefreshList('weekly_chore', '2025-W52', new Date('2026-01-01T12:00:00Z'))).toBe(true)
  })
})
