import { describe, expect, it } from 'vitest'
import type { Module, SharedList } from '../../shared/api-types'
import { getHomeListEntries, isListStarred, resolveHomeWidgetState } from './homeWidgets'

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: 'lists',
    title: 'Lists',
    description: '',
    category: 'core',
    installed: true,
    enabled: true,
    position: 10,
    size: 'medium',
    options: {},
    ...overrides,
  }
}

function makeList(id: string, overrides: Partial<SharedList> = {}): SharedList {
  return {
    id,
    name: id,
    listType: 'shopping',
    resetKey: '',
    metadata: {},
    createdByName: null,
    updatedByName: null,
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  }
}

describe('resolveHomeWidgetState', () => {
  it('returns null for a module with no homeWidget definition', () => {
    const module = makeModule({ homeWidget: undefined })
    expect(resolveHomeWidgetState(module)).toBeNull()
  })

  it('uses the definition defaultMode when no current options are set', () => {
    const module = makeModule({
      homeWidget: { label: 'Lists', description: '', defaultEnabled: true, defaultMode: 'active', modes: [{ id: 'active', label: 'Active', description: '' }, { id: 'starred', label: 'Starred', description: '' }] },
      options: {},
    })
    const result = resolveHomeWidgetState(module)
    expect(result?.mode).toBe('active')
  })

  it('uses the stored mode when it is a valid mode id', () => {
    const module = makeModule({
      homeWidget: { label: 'Lists', description: '', defaultEnabled: true, defaultMode: 'active', modes: [{ id: 'active', label: 'Active', description: '' }, { id: 'starred', label: 'Starred', description: '' }] },
      options: { homeWidget: { enabled: true, mode: 'starred' } },
    })
    const result = resolveHomeWidgetState(module)
    expect(result?.mode).toBe('starred')
  })

  it('falls back to defaultMode when stored mode is not in the modes list', () => {
    const module = makeModule({
      homeWidget: { label: 'Lists', description: '', defaultEnabled: true, defaultMode: 'active', modes: [{ id: 'active', label: 'Active', description: '' }] },
      options: { homeWidget: { enabled: true, mode: 'nonexistent' } },
    })
    const result = resolveHomeWidgetState(module)
    expect(result?.mode).toBe('active')
  })

  it('reads explicit enabled=false from options', () => {
    const module = makeModule({
      homeWidget: { label: 'Lists', description: '', defaultEnabled: true, defaultMode: 'active', modes: [{ id: 'active', label: 'Active', description: '' }] },
      options: { homeWidget: { enabled: false, mode: 'active' } },
    })
    const result = resolveHomeWidgetState(module)
    expect(result?.enabled).toBe(false)
  })

  it('uses defaultEnabled when options.homeWidget.enabled is not a boolean', () => {
    const module = makeModule({
      homeWidget: { label: 'Lists', description: '', defaultEnabled: false, defaultMode: 'active', modes: [{ id: 'active', label: 'Active', description: '' }] },
      options: {},
    })
    const result = resolveHomeWidgetState(module)
    expect(result?.enabled).toBe(false)
  })
})

describe('isListStarred', () => {
  it('returns true when metadata.starred is true', () => {
    const list = makeList('a', { metadata: { starred: true } })
    expect(isListStarred(list)).toBe(true)
  })

  it('returns false when metadata.starred is false', () => {
    const list = makeList('a', { metadata: { starred: false } })
    expect(isListStarred(list)).toBe(false)
  })

  it('returns false when metadata.starred is absent', () => {
    const list = makeList('a', { metadata: {} })
    expect(isListStarred(list)).toBe(false)
  })

  it('returns false when metadata.starred is a non-boolean truthy value', () => {
    const list = makeList('a', { metadata: { starred: 'yes' } })
    expect(isListStarred(list)).toBe(true)
  })

  it('returns false when metadata.starred is 0', () => {
    const list = makeList('a', { metadata: { starred: 0 } })
    expect(isListStarred(list)).toBe(false)
  })
})

describe('getHomeListEntries', () => {
  it('returns all lists sorted by recency when none have incomplete items in default mode', () => {
    const older = makeList('older', { updatedAt: '2026-01-01T00:00:00Z', items: [{ id: 'i1', text: 'x', done: true, completedAt: null, createdByName: null, updatedByName: null }] })
    const newer = makeList('newer', { updatedAt: '2026-06-01T00:00:00Z', items: [{ id: 'i2', text: 'y', done: true, completedAt: null, createdByName: null, updatedByName: null }] })
    const entries = getHomeListEntries([older, newer], 'active')
    expect(entries[0].list.id).toBe('newer')
    expect(entries[1].list.id).toBe('older')
  })

  it('surfaces lists with incomplete items first in default mode', () => {
    const noItems = makeList('empty', { updatedAt: '2026-06-01T00:00:00Z' })
    const withItem = makeList('active', { updatedAt: '2026-01-01T00:00:00Z', items: [{ id: 'i1', text: 'x', done: false, completedAt: null, createdByName: null, updatedByName: null }] })
    const entries = getHomeListEntries([noItems, withItem], 'active')
    expect(entries[0].list.id).toBe('active')
  })

  it('counts only incomplete items for incompleteCount', () => {
    const list = makeList('a', {
      items: [
        { id: 'i1', text: 'done', done: true, completedAt: null, createdByName: null, updatedByName: null },
        { id: 'i2', text: 'open', done: false, completedAt: null, createdByName: null, updatedByName: null },
        { id: 'i3', text: 'open2', done: false, completedAt: null, createdByName: null, updatedByName: null },
      ],
    })
    const [entry] = getHomeListEntries([list], 'active')
    expect(entry.incompleteCount).toBe(2)
  })

  it('in starred mode, starred lists come before active unstarred lists', () => {
    const starred = makeList('starred', { metadata: { starred: true }, updatedAt: '2026-01-01T00:00:00Z' })
    const active = makeList('active', { updatedAt: '2026-06-01T00:00:00Z', items: [{ id: 'i1', text: 'x', done: false, completedAt: null, createdByName: null, updatedByName: null }] })
    const entries = getHomeListEntries([active, starred], 'starred')
    expect(entries[0].list.id).toBe('starred')
    expect(entries[1].list.id).toBe('active')
  })

  it('in starred mode, falls back to active lists when no starred lists exist', () => {
    const active = makeList('active', { updatedAt: '2026-06-01T00:00:00Z', items: [{ id: 'i1', text: 'x', done: false, completedAt: null, createdByName: null, updatedByName: null }] })
    const inactive = makeList('inactive', { updatedAt: '2026-01-01T00:00:00Z' })
    const entries = getHomeListEntries([inactive, active], 'starred')
    expect(entries).toHaveLength(1)
    expect(entries[0].list.id).toBe('active')
  })

  it('in starred mode, falls back to all lists by recency when nothing is starred or active', () => {
    const older = makeList('older', { updatedAt: '2026-01-01T00:00:00Z' })
    const newer = makeList('newer', { updatedAt: '2026-06-01T00:00:00Z' })
    const entries = getHomeListEntries([older, newer], 'starred')
    expect(entries[0].list.id).toBe('newer')
    expect(entries).toHaveLength(2)
  })
})
