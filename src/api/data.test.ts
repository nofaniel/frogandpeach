import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMarineCacheKey, getMarine, getNetworkSummary, getSettings, getWeather, normaliseThemeId, parseCustomPageManifest, parseCustomPageManifestReport, updateList, updateSettings } from './data'

type FakeDbState = {
  settings: Map<string, string>
  cache: Array<{ cache_key: string; payload: string; expires_at: string; updated_at: string }>
  lists: Array<{
    id: string
    name: string
    list_type: string
    reset_key: string
    metadata_json: string
    created_by: string
    updated_by: string
    created_at: string
    updated_at: string
  }>
  listItems: Array<Record<string, string | number | null>>
}

function createFakeEnv(
  initialSettings: Record<string, string> = {},
  cacheKeys: string[] = [],
  initialLists: Array<Partial<FakeDbState['lists'][number]> & { id: string; name: string; list_type: string; reset_key?: string; metadata_json?: string }> = [],
) {
  const state: FakeDbState = {
    settings: new Map(Object.entries(initialSettings)),
    cache: cacheKeys.map((cacheKey) => ({
      cache_key: cacheKey,
      payload: JSON.stringify({ cacheKey }),
      expires_at: '2999-01-01T00:00:00.000Z',
      updated_at: '2999-01-01T00:00:00.000Z',
    })),
    lists: initialLists.map((list) => ({
      id: list.id,
      name: list.name,
      list_type: list.list_type,
      reset_key: list.reset_key ?? '',
      metadata_json: list.metadata_json ?? '{}',
      created_by: list.created_by ?? '',
      updated_by: list.updated_by ?? '',
      created_at: list.created_at ?? '2999-01-01T00:00:00.000Z',
      updated_at: list.updated_at ?? '2999-01-01T00:00:00.000Z',
    })),
    listItems: [],
  }

  const db = {
    prepare(sql: string) {
      const statement = {
        params: [] as unknown[],
        bind(...params: unknown[]) {
          statement.params = params
          return statement
        },
        async all() {
          if (sql === 'SELECT key, value FROM settings') {
            return { results: [...state.settings.entries()].map(([key, value]) => ({ key, value })) }
          }
          if (sql === 'SELECT * FROM cache ORDER BY updated_at DESC') {
            return { results: [...state.cache] }
          }
          if (sql === 'SELECT * FROM lists ORDER BY updated_at DESC') {
            return { results: [...state.lists] }
          }
          if (sql === 'SELECT * FROM list_items ORDER BY done ASC, created_at ASC') {
            return { results: [...state.listItems] }
          }
          if (sql === 'SELECT id, list_type, reset_key, metadata_json FROM lists') {
            return { results: [...state.lists] }
          }
          return { results: [] }
        },
        async first() {
          if (sql === 'SELECT payload FROM cache WHERE cache_key = ? AND expires_at > ?') {
            const [key, now] = statement.params as [string, string]
            const row = state.cache.find((entry: FakeDbState['cache'][number]) => entry.cache_key === key && entry.expires_at > now)
            return row ? { payload: row.payload } : null
          }
          return null
        },
        async run() {
          if (sql.startsWith('INSERT INTO settings')) {
            const [key, value] = statement.params as [string, string]
            state.settings.set(key, value)
            return { success: true }
          }
          if (sql === 'UPDATE lists SET name = ?, list_type = ?, reset_key = ?, metadata_json = ?, updated_by = ?, updated_at = ? WHERE id = ?') {
            const [name, listType, resetKey, metadataJson, updatedBy, updatedAt, id] = statement.params as [string, string, string, string, string, string, string]
            const row = state.lists.find((entry) => entry.id === id)
            if (row) {
              row.name = name
              row.list_type = listType
              row.reset_key = resetKey
              row.metadata_json = metadataJson
              row.updated_by = updatedBy
              row.updated_at = updatedAt
            }
            return { success: true }
          }
          if (sql.startsWith('DELETE FROM cache')) {
            if (sql.includes('cache_key = ?')) {
              const [key] = statement.params as [string]
              state.cache = state.cache.filter((entry: FakeDbState['cache'][number]) => entry.cache_key !== key)
            } else if (sql.includes("weather-%") || sql.includes("marine-%")) {
              state.cache = state.cache.filter((entry: FakeDbState['cache'][number]) => !entry.cache_key.startsWith('weather-') && !entry.cache_key.startsWith('marine-'))
            } else {
              state.cache = []
            }
            return { success: true }
          }
          return { success: true }
        },
      }
      return statement
    },
  }

  return { DB: db, state } as any
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('settings validation', () => {
  it('accepts slug-shaped theme ids and falls back to base otherwise', () => {
    expect(normaliseThemeId('coastal')).toBe('coastal')
    expect(normaliseThemeId('Mono-Dark')).toBe('mono-dark')
    expect(normaliseThemeId('')).toBe('base')
    expect(normaliseThemeId('../etc/passwd')).toBe('base')
    expect(normaliseThemeId('has spaces')).toBe('base')
  })
})

describe('settings defaults', () => {
  it('keeps location fields blank on a fresh database', async () => {
    const settings = await getSettings(createFakeEnv())

    expect(settings).toMatchObject({
      locationName: '',
      locationRegion: '',
      latitude: '',
      longitude: '',
      timezone: '',
    })
  })
})

describe('location-gated weather and tides', () => {
  it('returns null without calling upstream weather or tide services when no location is configured', async () => {
    const env = createFakeEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(getWeather(env)).resolves.toBeNull()
    await expect(getMarine(env)).resolves.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears cached weather and tide rows when location settings change', async () => {
    const env = createFakeEnv(
      {
        locationName: 'Newquay',
        locationRegion: 'Cornwall',
        latitude: '50.4155',
        longitude: '-5.0737',
        timezone: 'Europe/London',
      },
      ['weather-v4', 'marine-v4-model', 'other-cache'],
    )

    await updateSettings(env, {
      locationName: 'Penzance',
      locationRegion: 'Cornwall',
      latitude: '50.1186',
      longitude: '-5.5371',
      timezone: 'Europe/London',
    })

    expect(env.state.cache.map((entry: FakeDbState['cache'][number]) => entry.cache_key)).toEqual(['other-cache'])
    const nextSettings = await getSettings(env)
    expect(nextSettings).toMatchObject({
      locationName: 'Penzance',
      locationRegion: 'Cornwall',
      latitude: '50.1186',
      longitude: '-5.5371',
      timezone: 'Europe/London',
    })
  })
})

describe('weather precipitation mapping', () => {
  it('keeps current precipitation as an amount and daily precipitation as a chance', async () => {
    const env = createFakeEnv({
      locationName: 'Newquay',
      locationRegion: 'Cornwall',
      latitude: '50.4155',
      longitude: '-5.0737',
      timezone: 'Europe/London',
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 13.2,
          apparent_temperature: 12.1,
          wind_speed_10m: 18.4,
          wind_gusts_10m: 26.7,
          precipitation: 1.75,
          weather_code: 61,
          time: '2026-06-08T12:00:00Z',
        },
        daily: {
          time: ['2026-06-08', '2026-06-09', '2026-06-10'],
          weather_code: [61, 3, 2],
          temperature_2m_max: [15.2, 16.4, 17.1],
          temperature_2m_min: [9.8, 10.1, 11.3],
          precipitation_probability_max: [42, 18, 7],
          sunrise: ['2026-06-08T05:00:00Z', '2026-06-09T05:00:00Z', '2026-06-10T05:00:00Z'],
          sunset: ['2026-06-08T20:00:00Z', '2026-06-09T20:00:00Z', '2026-06-10T20:00:00Z'],
        },
        hourly: { time: [], precipitation_probability: [], temperature_2m: [], weather_code: [] },
      }),
    } as Response)

    const weather = await getWeather(env)

    expect(weather?.current.precipitationMm).toBe(1.75)
    expect(weather?.daily[0]?.precipitationChance).toBe(42)
    expect(weather?.daily[1]?.precipitationChance).toBe(18)
  })
})

describe('marine cache keying', () => {
  it('keeps tide API keys out of cache keys and separates different API options', async () => {
    const modelKey = await buildMarineCacheKey('model', 'ignored-secret')
    const apiKeyA = await buildMarineCacheKey('api', 'alpha-secret')
    const apiKeyB = await buildMarineCacheKey('api', 'beta-secret')

    expect(modelKey).toBe('marine-v6-model')
    expect(apiKeyA).toMatch(/^marine-v6-api-[0-9a-f]{64}$/)
    expect(apiKeyA).not.toContain('alpha-secret')
    expect(apiKeyB).not.toContain('beta-secret')
    expect(apiKeyA).not.toBe(apiKeyB)
    expect(await buildMarineCacheKey('model', 'another-secret')).toBe(modelKey)
  })
})

describe('custom page manifest parsing', () => {
  it('keeps valid pages and normalises relative hrefs', () => {
    expect(
      parseCustomPageManifest({
        pages: [
          { id: 'rules', title: 'House rules', href: 'rules/index.html', description: 'Shared house page' },
          { title: '', href: 'missing-title.html' },
          { title: 'External', href: 'https://example.com' },
        ],
      }),
    ).toEqual([
      { id: 'rules', title: 'House rules', href: '/custom-pages/rules/index.html', description: 'Shared house page', kind: 'custom' },
      { id: 'https://example.com', title: 'External', href: 'https://example.com', description: '', kind: 'custom' },
    ])
  })

  it('returns an empty list for malformed manifests', () => {
    expect(parseCustomPageManifest(null)).toEqual([])
    expect(parseCustomPageManifest({ pages: 'nope' })).toEqual([])
  })

  it('returns validation warnings for generated manifest issues', () => {
    expect(
      parseCustomPageManifestReport({
        pages: [{ title: 'Missing href' }],
        warnings: [{ path: 'bad/page.json', message: 'page.json is not valid JSON.' }],
      }),
    ).toEqual({
      pages: [],
      warnings: [
        { path: 'bad/page.json', message: 'page.json is not valid JSON.' },
        { path: 'unknown', message: 'Manifest page is missing title or href.' },
      ],
    })
  })
})

describe('getNetworkSummary', () => {
  it('returns only safe fields and never includes wifiPassword, routerUrl, adminUrl, or devices', async () => {
    const env = createFakeEnv({
      wifiName: 'HomeNet',
      wifiPassword: 'supersecret',
      wifiSecurity: 'WPA',
      routerUrl: 'http://192.168.1.1',
      adminUrl: 'http://192.168.1.1/admin',
      wifiUsagePeriod: 'June 2026',
      wifiUsageMonthlyGb: '45.5',
      wifiUsageUpdatedAt: '2026-06-01T00:00:00Z',
      wifiDevicesJson: JSON.stringify([
        { name: 'Laptop', type: 'computer', ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:FF', connection: 'wifi', status: 'online' },
        { name: 'Phone', type: 'mobile', ip: '192.168.1.11', mac: '11:22:33:44:55:66', connection: 'wifi', status: 'offline' },
      ]),
    })

    const summary = await getNetworkSummary(env)

    expect(summary.wifiName).toBe('HomeNet')
    expect(summary.wifiSecurity).toBe('WPA')
    expect(summary.deviceCount).toBe(2)
    expect(summary.usage.period).toBe('June 2026')
    expect(summary.usage.monthlyGb).toBe(45.5)
    expect(summary.usage.updatedAt).toBe('2026-06-01T00:00:00Z')

    expect(summary).not.toHaveProperty('wifiPassword')
    expect(summary).not.toHaveProperty('routerUrl')
    expect(summary).not.toHaveProperty('adminUrl')
    expect(summary).not.toHaveProperty('devices')
  })

  it('returns deviceCount zero and null usage values on a fresh database', async () => {
    const env = createFakeEnv()

    const summary = await getNetworkSummary(env)

    expect(summary.deviceCount).toBe(0)
    expect(summary.usage.monthlyGb).toBeNull()
    expect(summary.usage.updatedAt).toBeNull()
    expect(summary).not.toHaveProperty('wifiPassword')
    expect(summary).not.toHaveProperty('routerUrl')
    expect(summary).not.toHaveProperty('adminUrl')
    expect(summary).not.toHaveProperty('devices')
  })
})

describe('list starring metadata', () => {
  it('preserves existing metadata when toggling star state', async () => {
    const env = createFakeEnv(
      {},
      [],
      [
        {
          id: 'list-1',
          name: 'Groceries',
          list_type: 'shopping',
          metadata_json: '{"note":"keep","starred":false}',
        },
      ],
    )

    const updated = await updateList(env, 'list-1', {
      metadata: {
        note: 'keep',
        starred: true,
      },
    })

    expect(updated?.metadata).toMatchObject({
      note: 'keep',
      starred: true,
    })
  })
})
