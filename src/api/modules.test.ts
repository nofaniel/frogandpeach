import { describe, expect, it } from 'vitest'
import { normaliseModules, normaliseModuleSize, redactModuleOptions, moduleDefinitions } from './modules'

describe('module registry normalisation', () => {
  it('falls back to definition defaults when settings are absent', () => {
    const modules = normaliseModules(new Map())

    expect(modules[0]).toMatchObject({ id: 'weather', installed: true, enabled: true, size: 'wide' })
    expect(modules.map((module) => module.id)).toContain('settings')
    expect(modules.find((module) => module.id === 'settings')?.homeWidget).toBeUndefined()
  })

  it('enables homepage widgets by default for suitable built-in modules', () => {
    const modules = normaliseModules(new Map())
    const widgetIds = ['weather', 'tides', 'lists', 'notes', 'pages']

    for (const id of widgetIds) {
      const module = modules.find((entry) => entry.id === id)
      expect(module?.homeWidget).toBeDefined()
      expect(module?.options.homeWidget).toMatchObject({
        enabled: true,
        mode: module?.homeWidget?.defaultMode,
      })
    }
  })

  it('disables the network home widget by default while keeping the module enabled', () => {
    const modules = normaliseModules(new Map())
    const network = modules.find((entry) => entry.id === 'network')

    expect(network?.enabled).toBe(true)
    expect(network?.homeWidget).toBeDefined()
    expect(network?.options.homeWidget).toMatchObject({
      enabled: false,
      mode: 'status',
    })
  })

  it('defaults navigation bar visibility from the module registry', () => {
    const modules = normaliseModules(new Map())

    expect(modules.find((module) => module.id === 'lists')?.options.navigationBar).toMatchObject({ enabled: true, mode: 'default' })
    expect(modules.find((module) => module.id === 'weather')?.options.navigationBar).toMatchObject({ enabled: true, mode: 'default' })
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

  it('normalises invalid navigation bar state while preserving unrelated options', () => {
    const modules = normaliseModules(
      new Map([
        ['lists', { id: 'lists', installed: 1, enabled: 1, position: 5, size: 'full', options_json: '{"view":"dense","navigationBar":{"enabled":"yes"}}' }],
      ]),
    )

    const lists = modules.find((module) => module.id === 'lists')
    expect(lists).toMatchObject({
      options: {
        view: 'dense',
        navigationBar: {
          enabled: true,
          mode: 'default',
        },
      },
    })
  })

  it('defaults weather icon display to emoji and preserves the line icon option', () => {
    const defaults = normaliseModules(new Map()).find((module) => module.id === 'weather')
    expect(defaults?.options['iconStyle']).toBe('emoji')

    const modules = normaliseModules(
      new Map([
        ['weather', { id: 'weather', installed: 1, enabled: 1, position: 10, size: 'wide', options_json: '{"iconStyle":"icons"}' }],
      ]),
    )
    const weather = modules.find((module) => module.id === 'weather')
    expect(weather?.options['iconStyle']).toBe('icons')
  })

  it('normalises invalid weather icon display to emoji', () => {
    const modules = normaliseModules(
      new Map([
        ['weather', { id: 'weather', installed: 1, enabled: 1, position: 10, size: 'wide', options_json: '{"iconStyle":"bogus"}' }],
      ]),
    )

    const weather = modules.find((module) => module.id === 'weather')
    expect(weather?.options['iconStyle']).toBe('emoji')
  })

  it('guards invalid sizes', () => {
    expect(normaliseModuleSize('giant')).toBe('medium')
  })

  it('defaults tide display options to enabled with count of 5', () => {
    const modules = normaliseModules(new Map())
    const tides = modules.find((module) => module.id === 'tides')
    expect(tides?.options).toMatchObject({
      source: 'model',
      apiKey: '',
      showCurrentTide: true,
      showTimeUntilNext: true,
      showNextTides: true,
      showTideSourceNote: true,
      nextTideCount: 5,
    })
  })

  it('normalises invalid tide source to model', () => {
    const modules = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"source":"bogus"}' }],
      ]),
    )
    const tides = modules.find((module) => module.id === 'tides')
    expect(tides?.options['source']).toBe('model')
  })

  it('preserves tide api key as a string', () => {
    const modules = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"apiKey":"sk-test-123"}' }],
      ]),
    )
    const tides = modules.find((module) => module.id === 'tides')
    expect(tides?.options['apiKey']).toBe('sk-test-123')
  })

  it('clamps nextTideCount to 1..5 range', () => {
    const tooHigh = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"nextTideCount":10}' }],
      ]),
    )
    expect(tooHigh.find((m) => m.id === 'tides')?.options['nextTideCount']).toBe(5)

    const tooLow = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"nextTideCount":0}' }],
      ]),
    )
    expect(tooLow.find((m) => m.id === 'tides')?.options['nextTideCount']).toBe(1)

    const valid = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"nextTideCount":3}' }],
      ]),
    )
    expect(valid.find((m) => m.id === 'tides')?.options['nextTideCount']).toBe(3)
  })

  it('defaults tide display booleans to true when explicitly false in stored options', () => {
    const modules = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"showCurrentTide":false,"showTimeUntilNext":false,"showNextTides":false,"showTideSourceNote":false}' }],
      ]),
    )
    const tides = modules.find((module) => module.id === 'tides')
    expect(tides?.options['showCurrentTide']).toBe(false)
    expect(tides?.options['showTimeUntilNext']).toBe(false)
    expect(tides?.options['showNextTides']).toBe(false)
    expect(tides?.options['showTideSourceNote']).toBe(false)
  })

  it('includes settings metadata on returned modules', () => {
    const modules = normaliseModules(new Map())
    const weather = modules.find((m) => m.id === 'weather')
    expect(weather?.settings).toBeDefined()
    expect(weather?.settings?.length).toBe(5)
    expect(weather?.settings?.map((s) => s.key)).toEqual(['iconStyle', 'showExtendedForecast', 'showUvIndex', 'showAirQuality', 'showPollen'])

    const tides = modules.find((m) => m.id === 'tides')
    expect(tides?.settings).toBeDefined()
    expect(tides?.settings?.length).toBe(7)
    expect(tides?.settings?.map((s) => s.key)).toEqual(['source', 'apiKey', 'showCurrentTide', 'showTimeUntilNext', 'showNextTides', 'nextTideCount', 'showTideSourceNote'])
  })

  it('normalises boolean setting defaults when value is missing', () => {
    const modules = normaliseModules(new Map())
    const weather = modules.find((m) => m.id === 'weather')
    expect(weather?.options['showExtendedForecast']).toBe(false)

    const tides = modules.find((m) => m.id === 'tides')
    expect(tides?.options['showCurrentTide']).toBe(true)
  })

  it('normalises number setting with min/max clamping', () => {
    const modules = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"nextTideCount":99}' }],
      ]),
    )
    expect(modules.find((m) => m.id === 'tides')?.options['nextTideCount']).toBe(5)

    const low = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"nextTideCount":-3}' }],
      ]),
    )
    expect(low.find((m) => m.id === 'tides')?.options['nextTideCount']).toBe(1)
  })

  it('normalises non-string text/secret values to defaults', () => {
    const modules = normaliseModules(
      new Map([
        ['tides', { id: 'tides', installed: 1, enabled: 1, position: 20, size: 'wide', options_json: '{"apiKey":12345}' }],
      ]),
    )
    expect(modules.find((m) => m.id === 'tides')?.options['apiKey']).toBe('')
  })

  it('redacts secret setting values', () => {
    const definition = moduleDefinitions.find((d) => d.id === 'tides')
    const options = { source: 'api', apiKey: 'sk-secret-123', showCurrentTide: true }
    const redacted = redactModuleOptions(definition, options)
    expect(redacted.apiKey).toBe('[redacted]')
    expect(redacted.source).toBe('api')
    expect(redacted.showCurrentTide).toBe(true)
  })

  it('does not redact empty secret values', () => {
    const definition = moduleDefinitions.find((d) => d.id === 'tides')
    const options = { source: 'model', apiKey: '' }
    const redacted = redactModuleOptions(definition, options)
    expect(redacted.apiKey).toBe('')
  })

  it('returns options unchanged when definition has no settings', () => {
    const definition = moduleDefinitions.find((d) => d.id === 'lists')
    const options = { view: 'dense', customKey: 'value' }
    const redacted = redactModuleOptions(definition, options)
    expect(redacted).toEqual(options)
  })
})
