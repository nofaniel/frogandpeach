import { describe, expect, it } from 'vitest'
import type { Module } from '../../shared/api-types'
import {
  buildNavigationEntries,
  coreNavigation,
  isNavigationEntryActive,
  moduleNavigationTargets,
  navigationIconForModule,
} from './navigation'

function makeModule(id: string, overrides: Partial<Module> = {}): Module {
  return {
    id,
    title: id,
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

describe('buildNavigationEntries', () => {
  it('always includes Home regardless of modules', () => {
    const entries = buildNavigationEntries([])
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('home')
  })

  it('includes a core tab entry when its module is installed, enabled, and nav-visible', () => {
    const lists = makeModule('lists', { options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([lists])
    expect(entries.some((e) => e.id === 'lists')).toBe(true)
  })

  it('excludes a core tab entry when nav is disabled', () => {
    const notes = makeModule('notes', { options: { navigationBar: { enabled: false, mode: 'default' } } })
    const entries = buildNavigationEntries([notes])
    expect(entries.some((e) => e.id === 'notes')).toBe(false)
  })

  it('keeps weather reachable when its nav option is disabled', () => {
    const weather = makeModule('weather', { options: { navigationBar: { enabled: false, mode: 'default' } } })
    const entries = buildNavigationEntries([weather])
    expect(entries.some((e) => e.id === 'weather')).toBe(true)
  })

  it('excludes a core tab entry when module is not installed', () => {
    const pages = makeModule('pages', { installed: false, options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([pages])
    expect(entries.some((e) => e.id === 'pages')).toBe(false)
  })

  it('excludes a core tab entry when module is disabled', () => {
    const network = makeModule('network', { enabled: false, options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([network])
    expect(entries.some((e) => e.id === 'network')).toBe(false)
  })

  it('adds extra module entries with module- prefix for non-core modules', () => {
    const custom = makeModule('tides', { title: 'Tides', options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([custom])
    expect(entries.some((e) => e.id === 'module-tides')).toBe(true)
  })

  it('uses known moduleNavigationTarget for extra modules that have one', () => {
    const tides = makeModule('tides', { title: 'Tides', options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([tides])
    const entry = entries.find((e) => e.id === 'module-tides')
    expect(entry?.target).toEqual(moduleNavigationTargets['tides'])
  })

  it('falls back to home target for unknown extra module ids', () => {
    const custom = makeModule('my-custom-module', { title: 'Custom', options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([custom])
    const entry = entries.find((e) => e.id === 'module-my-custom-module')
    expect(entry?.target).toEqual({ kind: 'home', moduleId: 'my-custom-module' })
  })

  it('does not duplicate core entries as extra entries', () => {
    const lists = makeModule('lists', { title: 'Lists', options: { navigationBar: { enabled: true, mode: 'default' } } })
    const entries = buildNavigationEntries([lists])
    const listsEntries = entries.filter((e) => e.id === 'lists' || e.id === 'module-lists')
    expect(listsEntries).toHaveLength(1)
    expect(listsEntries[0].id).toBe('lists')
  })
})

describe('isNavigationEntryActive', () => {
  it('marks a tab entry active when activeTab matches', () => {
    const entry = coreNavigation.find((e) => e.id === 'lists')!
    expect(isNavigationEntryActive(entry, 'lists', false)).toBe(true)
  })

  it('marks a tab entry inactive when activeTab does not match', () => {
    const entry = coreNavigation.find((e) => e.id === 'lists')!
    expect(isNavigationEntryActive(entry, 'home', false)).toBe(false)
  })

  it('marks an admin entry active when adminOpen is true', () => {
    const entry = { id: 'settings', label: 'Settings', icon: '⚙️', target: { kind: 'admin' as const } }
    expect(isNavigationEntryActive(entry, 'home', true)).toBe(true)
  })

  it('marks an admin entry inactive when adminOpen is false', () => {
    const entry = { id: 'settings', label: 'Settings', icon: '⚙️', target: { kind: 'admin' as const } }
    expect(isNavigationEntryActive(entry, 'home', false)).toBe(false)
  })

  it('never marks a home-scroll entry as active', () => {
    const entry = { id: 'module-weather', label: 'Weather', icon: '🌦️', target: { kind: 'home' as const, moduleId: 'weather' } }
    expect(isNavigationEntryActive(entry, 'home', false)).toBe(false)
    expect(isNavigationEntryActive(entry, 'home', true)).toBe(false)
  })
})

describe('navigationIconForModule', () => {
  it('returns weather icon for weather module', () => {
    expect(navigationIconForModule('weather')).toBe('🌦️')
  })

  it('returns tides icon for tides module', () => {
    expect(navigationIconForModule('tides')).toBe('🌊')
  })

  it('returns settings icon for settings module', () => {
    expect(navigationIconForModule('settings')).toBe('⚙️')
  })

  it('returns fallback icon for unknown modules', () => {
    expect(navigationIconForModule('unknown-thing')).toBe('▣')
  })
})
