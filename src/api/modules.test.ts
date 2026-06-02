import { describe, expect, it } from 'vitest'
import { normaliseModules, normaliseModuleSize } from './modules'

describe('module registry normalisation', () => {
  it('falls back to definition defaults when settings are absent', () => {
    const modules = normaliseModules(new Map())

    expect(modules[0]).toMatchObject({ id: 'weather', installed: true, enabled: true, size: 'wide' })
    expect(modules.map((module) => module.id)).toContain('settings')
    expect(modules.find((module) => module.id === 'settings')?.homeWidget).toBeUndefined()
  })

  it('enables homepage widgets by default for suitable built-in modules', () => {
    const modules = normaliseModules(new Map())
    const widgetIds = ['weather', 'tides', 'lists', 'notes', 'pages', 'network']

    for (const id of widgetIds) {
      const module = modules.find((entry) => entry.id === id)
      expect(module?.homeWidget).toBeDefined()
      expect(module?.options.homeWidget).toMatchObject({
        enabled: true,
        mode: module?.homeWidget?.defaultMode,
      })
    }
  })

  it('disables modules when uninstalled regardless of enabled flag', () => {
    const modules = normaliseModules(
      new Map([
        ['lists', { id: 'lists', installed: 0, enabled: 1, position: 5, size: 'full', options_json: '{"view":"dense"}' }],
      ]),
    )

    const lists = modules.find((module) => module.id === 'lists')
    expect(lists).toMatchObject({ installed: false, enabled: false, position: 5, size: 'full', options: { view: 'dense' } })
  })

  it('normalises invalid widget mode while preserving unrelated options', () => {
    const modules = normaliseModules(
      new Map([
        ['lists', { id: 'lists', installed: 1, enabled: 1, position: 5, size: 'full', options_json: '{"view":"dense","homeWidget":{"enabled":false,"mode":"bogus"}}' }],
      ]),
    )

    const lists = modules.find((module) => module.id === 'lists')
    expect(lists).toMatchObject({
      options: {
        view: 'dense',
        homeWidget: {
          enabled: false,
          mode: 'starred',
        },
      },
    })
  })

  it('guards invalid sizes', () => {
    expect(normaliseModuleSize('giant')).toBe('medium')
  })
})
