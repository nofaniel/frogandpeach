import { describe, expect, it } from 'vitest'
import { normaliseModules, normaliseModuleSize } from './modules'

describe('module registry normalisation', () => {
  it('falls back to definition defaults when settings are absent', () => {
    const modules = normaliseModules(new Map())

    expect(modules[0]).toMatchObject({ id: 'weather', installed: true, enabled: true, size: 'wide' })
    expect(modules.map((module) => module.id)).toContain('settings')
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

  it('guards invalid sizes', () => {
    expect(normaliseModuleSize('giant')).toBe('medium')
  })
})
