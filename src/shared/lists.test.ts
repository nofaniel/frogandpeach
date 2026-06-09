import { describe, expect, it } from 'vitest'
import { computeListStatus, normaliseListType, resetKeyForListType, shouldRefreshList } from './lists'

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

describe('deadline list type', () => {
  it('is included in the list types array', () => {
    expect(normaliseListType('deadline')).toBe('deadline')
  })

  it('never resets', () => {
    expect(resetKeyForListType('deadline')).toBe('')
    expect(shouldRefreshList('deadline', '')).toBe(false)
  })
})

describe('computeListStatus', () => {
  const now = new Date('2026-06-15T12:00:00Z')

  it('returns done for completed items', () => {
    expect(computeListStatus({ done: true }, 'basic', now)).toBe('done')
  })

  it('returns open for items without dates', () => {
    expect(computeListStatus({ done: false }, 'basic', now)).toBe('open')
  })

  it('returns overdue for deadline items past due date', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-14' } }, 'deadline', now)).toBe('overdue')
  })

  it('returns due_soon for deadline items due within 2 days', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-16' } }, 'deadline', now)).toBe('due_soon')
  })

  it('returns open for deadline items due later', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-20' } }, 'deadline', now)).toBe('open')
  })

  it('uses targetDate as fallback for deadline lists', () => {
    expect(computeListStatus({ done: false, metadata: { targetDate: '2026-06-14' } }, 'deadline', now)).toBe('overdue')
  })

  it('returns missed for daily_checklist items from previous day', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-14' } }, 'daily_checklist', now)).toBe('missed')
  })

  it('returns open for daily_checklist items due today', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-15' } }, 'daily_checklist', now)).toBe('open')
  })

  it('returns missed for weekly_chore items from previous week', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-08' } }, 'weekly_chore', now)).toBe('missed')
  })

  it('returns open for weekly_chore items due this week', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-15' } }, 'weekly_chore', now)).toBe('open')
  })

  it('returns open for basic lists regardless of dates', () => {
    expect(computeListStatus({ done: false, metadata: { dueDate: '2026-06-14' } }, 'basic', now)).toBe('open')
  })
})
