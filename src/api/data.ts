import { listTypes, normaliseListType, resetKeyForListType, shouldRefreshList, type ListTypeId } from '../shared/lists'
import { deriveTideEvents, extractTideSeries, numericOrNull } from '../shared/tide'
import { id, normaliseTags, nowIso, rowNumber, rowString, slugify } from './http'
import type { DbRow, Env } from './types'

export type Settings = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  wifiUsagePeriod: string
  wifiUsageMonthlyGb: string
  wifiUsageUpdatedAt: string
  wifiDevicesJson: string
  binDay: string
  flatNotes: string
  locationName: string
  locationRegion: string
  latitude: string
  longitude: string
  timezone: string
  themeId: string
}

export type Appearance = Pick<Settings, 'themeId'>

export type CustomPageManifestEntry = {
  id: string
  title: string
  href: string
  description: string
  kind: 'custom'
}

export type CustomPageManifestReport = {
  pages: CustomPageManifestEntry[]
  warnings: Array<{ path: string; message: string }>
}

export type ActivityEntry = {
  id: string
  actorUserId: string | null
  actorName: string
  action: string
  entityType: string
  entityId: string
  summary: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type NetworkDevice = {
  id: string
  name: string
  type: string
  ip: string
  mac: string
  connection: string
  status: string
  lastSeen: string
  usageGb: number | null
}

export type NetworkOverview = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  usage: {
    period: string
    monthlyGb: number | null
    updatedAt: string | null
  }
  devices: NetworkDevice[]
}

const settingDefaults: Settings = {
  wifiName: '',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  routerUrl: '',
  adminUrl: '',
  wifiUsagePeriod: '',
  wifiUsageMonthlyGb: '',
  wifiUsageUpdatedAt: '',
  wifiDevicesJson: '[]',
  binDay: '',
  flatNotes: 'Frog & Peach is private by default. Keep admin credentials out of shared notes.',
  locationName: 'Newquay',
  locationRegion: 'Cornwall',
  latitude: '50.4155',
  longitude: '-5.0737',
  timezone: 'Europe/London',
  themeId: 'base',
}

const settingKeys = Object.keys(settingDefaults) as Array<keyof Settings>
const publicSettingKeys: Array<keyof Settings> = ['binDay', 'flatNotes', 'locationName', 'locationRegion', 'latitude', 'longitude', 'timezone', 'themeId']
// Legacy appearance keys retained only so existing databases migrate their look.
const LEGACY_THEME_KEY = 'colourTheme'

export async function getDashboard(env: Env, request: Request) {
  const [weather, tides, notes, lists, pages, settings, modules, appearance] = await Promise.all([
    optionalData('weather', () => getWeather(env)),
    optionalData('marine', () => getMarine(env)),
    listNotes(env, {}),
    listLists(env),
    listPageLinks(env, request),
    getPublicSettings(env),
    import('./modules').then(({ listModules }) => listModules(env)),
    getAppearance(env),
  ])

  return {
    weather,
    tides,
    notes: notes.slice(0, 6),
    lists: lists.slice(0, 6),
    pages: pages.slice(0, 10),
    settings,
    modules,
    appearance,
    listTypes,
    deployment: getDeploymentInfo(request),
  }
}

async function optionalData<T>(label: string, producer: () => Promise<T>): Promise<T | null> {
  try {
    return await producer()
  } catch (error) {
    console.warn(`${label} data unavailable`, error)
    return null
  }
}

export async function getSettings(env: Env): Promise<Settings> {
  const rows = await env.DB.prepare('SELECT key, value FROM settings').all<DbRow>()
  const settings = { ...settingDefaults }
  let themeIdStored = false
  let legacyTheme = ''

  for (const row of rows.results ?? []) {
    const key = rowString(row, 'key')
    if (key === LEGACY_THEME_KEY) legacyTheme = rowString(row, 'value')
    if (key === 'themeId') themeIdStored = true
    if (settingKeys.includes(key as keyof Settings)) settings[key as keyof Settings] = rowString(row, 'value')
  }

  // Migrate pre-theme-system databases: fall back to the old colour theme name,
  // which now matches a bundled theme folder (frog-peach/coastal/botanical/mono-dark).
  if (!themeIdStored && legacyTheme) settings.themeId = legacyTheme
  settings.themeId = normaliseThemeId(settings.themeId)
  return settings
}

export async function getPublicSettings(env: Env) {
  const settings = await getSettings(env)
  return Object.fromEntries(publicSettingKeys.map((key) => [key, settings[key]]))
}

export async function getNetworkOverview(env: Env): Promise<NetworkOverview> {
  const settings = await getSettings(env)
  return {
    wifiName: settings.wifiName,
    wifiPassword: settings.wifiPassword,
    wifiSecurity: normaliseWifiSecurity(settings.wifiSecurity),
    routerUrl: settings.routerUrl,
    adminUrl: settings.adminUrl,
    usage: {
      period: settings.wifiUsagePeriod.trim(),
      monthlyGb: parseOptionalNumber(settings.wifiUsageMonthlyGb),
      updatedAt: settings.wifiUsageUpdatedAt.trim() || null,
    },
    devices: parseNetworkDevices(settings.wifiDevicesJson),
  }
}

export async function updateSettings(env: Env, patch: Partial<Settings>) {
  const statement = env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const key of settingKeys) {
    if (Object.hasOwn(patch, key)) {
      const value = key === 'themeId' ? normaliseThemeId(String(patch[key] ?? '')) : String(patch[key] ?? '')
      await statement.bind(key, value).run()
    }
  }
  return getSettings(env)
}

export async function getAppearance(env: Env): Promise<Appearance> {
  const settings = await getSettings(env)
  return { themeId: settings.themeId }
}

export async function updateAppearance(env: Env, patch: Partial<Appearance>, request?: Request) {
  const next: Partial<Appearance> = {}
  if (patch.themeId !== undefined) next.themeId = await validateThemeId(patch.themeId, request)
  const settings = await updateSettings(env, next)
  return { themeId: settings.themeId }
}

export async function listActivity(env: Env, limit = 24): Promise<ActivityEntry[]> {
  try {
    const rows = (await env.DB.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').bind(Math.max(1, Math.min(limit, 100))).all<DbRow>()).results ?? []
    return rows.map(toActivity)
  } catch (error) {
    console.warn('activity log unavailable', error)
    return []
  }
}

export async function logActivity(
  env: Env,
  input: {
    actorUserId?: string | null
    actorName?: string | null
    action: string
    entityType: string
    entityId?: string | null
    summary: string
    metadata?: Record<string, unknown>
  },
) {
  try {
    await env.DB.prepare('INSERT INTO activity_log (id, actor_user_id, actor_name, action, entity_type, entity_id, summary, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        id('activity'),
        input.actorUserId ?? null,
        input.actorName ?? '',
        input.action,
        input.entityType,
        input.entityId ?? '',
        input.summary,
        safeJson(input.metadata ?? {}),
        nowIso(),
      )
      .run()
  } catch (error) {
    console.warn('activity log write skipped', error)
  }
}

export async function listNotes(env: Env, filters: { q?: string; tag?: string }) {
  const q = filters.q?.trim()
  const tag = filters.tag?.trim()
  let rows: DbRow[]
  const users = await getUserNameMap(env)

  if (q) {
    const like = `%${q}%`
    rows = (await env.DB.prepare('SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? OR tags LIKE ? ORDER BY pinned DESC, updated_at DESC').bind(like, like, like).all<DbRow>()).results ?? []
  } else if (tag) {
    rows =
      (await env.DB.prepare("SELECT * FROM notes WHERE ',' || tags || ',' LIKE ? ORDER BY pinned DESC, updated_at DESC").bind(`%,${tag},%`).all<DbRow>()).results ?? []
  } else {
    rows = (await env.DB.prepare('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC').all<DbRow>()).results ?? []
  }

  return rows.map((row) => toNote(row, users))
}

export async function createNote(env: Env, input: { title?: string; body?: string; tags?: string; pinned?: boolean; noteType?: string; metadata?: unknown }, userId?: string) {
  const stamp = nowIso()
  const noteId = id('note')
  const body = String(input.body ?? '')
  const title = String(input.title ?? '').trim() || firstLine(body) || 'Untitled note'

  await env.DB.prepare('INSERT INTO notes (id, title, body, tags, note_type, metadata_json, pinned, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(noteId, title, body, normaliseTags(String(input.tags ?? '')), String(input.noteType ?? 'text') || 'text', safeJson(input.metadata), input.pinned ? 1 : 0, userId ?? null, userId ?? null, stamp, stamp)
    .run()

  return getNote(env, noteId)
}

export async function getNote(env: Env, noteId: string) {
  const row = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(noteId).first<DbRow>()
  return row ? toNote(row, await getUserNameMap(env)) : null
}

export async function updateNote(env: Env, noteId: string, patch: { title?: string; body?: string; tags?: string; pinned?: boolean; noteType?: string; metadata?: unknown }, userId?: string) {
  const existing = await getNote(env, noteId)
  if (!existing) return null

  const title = patch.title === undefined ? existing.title : String(patch.title).trim() || 'Untitled note'
  const body = patch.body === undefined ? existing.body : String(patch.body)
  const tags = patch.tags === undefined ? existing.tags : normaliseTags(String(patch.tags))
  const pinned = patch.pinned === undefined ? existing.pinned : Boolean(patch.pinned)
  const noteType = patch.noteType === undefined ? existing.noteType : String(patch.noteType || 'text')
  const metadata = patch.metadata === undefined ? existing.metadata : patch.metadata

  await env.DB.prepare('UPDATE notes SET title = ?, body = ?, tags = ?, note_type = ?, metadata_json = ?, pinned = ?, updated_by = ?, updated_at = ? WHERE id = ?')
    .bind(title, body, tags, noteType, safeJson(metadata), pinned ? 1 : 0, userId ?? existing.updatedBy ?? null, nowIso(), noteId)
    .run()
  return getNote(env, noteId)
}

export async function deleteNote(env: Env, noteId: string) {
  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run()
}

export async function listLists(env: Env) {
  await refreshPeriodicLists(env)
  const users = await getUserNameMap(env)
  const listRows = (await env.DB.prepare('SELECT * FROM lists ORDER BY updated_at DESC').all<DbRow>()).results ?? []
  const itemRows = (await env.DB.prepare('SELECT * FROM list_items ORDER BY done ASC, created_at ASC').all<DbRow>()).results ?? []
  const itemMap = new Map<string, ReturnType<typeof toListItem>[]>()

  for (const row of itemRows) {
    const item = toListItem(row, users)
    itemMap.set(item.listId, [...(itemMap.get(item.listId) ?? []), item])
  }

  return listRows.map((row) => ({ ...toList(row, users), items: itemMap.get(rowString(row, 'id')) ?? [] }))
}

export async function createList(env: Env, input: { name?: string; listType?: string }, userId?: string) {
  const stamp = nowIso()
  const listId = id('list')
  const listType = normaliseListType(input.listType ?? 'shopping')
  await env.DB.prepare('INSERT INTO lists (id, name, list_type, reset_key, metadata_json, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(listId, String(input.name ?? '').trim() || defaultListName(listType), listType, resetKeyForListType(listType), '{}', userId ?? null, userId ?? null, stamp, stamp)
    .run()
  return getList(env, listId)
}

export async function getList(env: Env, listId: string) {
  return (await listLists(env)).find((list) => list.id === listId) ?? null
}

export async function updateList(env: Env, listId: string, patch: { name?: string; listType?: string }, userId?: string) {
  const existing = await getList(env, listId)
  if (!existing) return null
  const listType = patch.listType === undefined ? existing.listType : normaliseListType(patch.listType)
  await env.DB.prepare('UPDATE lists SET name = ?, list_type = ?, reset_key = ?, updated_by = ?, updated_at = ? WHERE id = ?')
    .bind(patch.name === undefined ? existing.name : String(patch.name).trim() || defaultListName(listType), listType, resetKeyForListType(listType), userId ?? existing.updatedBy ?? null, nowIso(), listId)
    .run()
  return getList(env, listId)
}

export async function deleteList(env: Env, listId: string) {
  await env.DB.prepare('DELETE FROM lists WHERE id = ?').bind(listId).run()
}

export async function createListItem(env: Env, listId: string, text: string, userId?: string) {
  if (!(await getList(env, listId))) return null
  const stamp = nowIso()
  const itemId = id('item')
  await env.DB.prepare('INSERT INTO list_items (id, list_id, text, done, completed_at, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, 0, NULL, ?, ?, ?, ?)')
    .bind(itemId, listId, text.trim() || 'Something useful', userId ?? null, userId ?? null, stamp, stamp)
    .run()
  await env.DB.prepare('UPDATE lists SET updated_by = ?, updated_at = ? WHERE id = ?').bind(userId ?? null, stamp, listId).run()
  return getListItem(env, itemId)
}

export async function getListItem(env: Env, itemId: string) {
  const row = await env.DB.prepare('SELECT * FROM list_items WHERE id = ?').bind(itemId).first<DbRow>()
  return row ? toListItem(row, await getUserNameMap(env)) : null
}

export async function updateListItem(env: Env, itemId: string, patch: { text?: string; done?: boolean }, userId?: string) {
  const existing = await getListItem(env, itemId)
  if (!existing) return null
  const stamp = nowIso()
  const text = patch.text === undefined ? existing.text : String(patch.text).trim() || 'Something useful'
  const done = patch.done === undefined ? existing.done : Boolean(patch.done)
  const completedAt = done ? existing.completedAt ?? stamp : null

  await env.DB.prepare('UPDATE list_items SET text = ?, done = ?, completed_at = ?, updated_by = ?, updated_at = ? WHERE id = ?')
    .bind(text, done ? 1 : 0, completedAt, userId ?? existing.updatedBy ?? null, stamp, itemId)
    .run()
  await env.DB.prepare('UPDATE lists SET updated_by = ?, updated_at = ? WHERE id = ?').bind(userId ?? null, stamp, existing.listId).run()
  return getListItem(env, itemId)
}

export async function deleteListItem(env: Env, itemId: string) {
  const existing = await getListItem(env, itemId)
  await env.DB.prepare('DELETE FROM list_items WHERE id = ?').bind(itemId).run()
  if (existing) await env.DB.prepare('UPDATE lists SET updated_at = ? WHERE id = ?').bind(nowIso(), existing.listId).run()
}

export async function listPages(env: Env) {
  const rows = (await env.DB.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all<DbRow>()).results ?? []
  return rows.map(toPage)
}

export async function getPage(env: Env, pageIdOrSlug: string) {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ? OR slug = ?').bind(pageIdOrSlug, pageIdOrSlug).first<DbRow>()
  return row ? toPage(row) : null
}

export async function createPage(env: Env, input: { title?: string; body?: string; theme?: string; occasion?: string; emoji?: string; slug?: string }) {
  const stamp = nowIso()
  const title = String(input.title ?? '').trim() || 'Untitled page'
  const pageId = id('page')
  const slug = slugify(String(input.slug ?? '') || title) || pageId
  await env.DB.prepare('INSERT INTO pages (id, slug, title, body, theme, occasion, emoji, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(pageId, slug, title, String(input.body ?? ''), normaliseTheme(String(input.theme ?? 'shell')), String(input.occasion ?? ''), String(input.emoji ?? ''), stamp, stamp)
    .run()
  return getPage(env, pageId)
}

export async function updatePage(env: Env, pageId: string, patch: { title?: string; body?: string; theme?: string; occasion?: string; emoji?: string; slug?: string }) {
  const existing = await getPage(env, pageId)
  if (!existing) return null

  const title = patch.title === undefined ? existing.title : String(patch.title).trim() || 'Untitled page'
  const slug = patch.slug === undefined ? existing.slug : slugify(String(patch.slug)) || existing.slug
  const body = patch.body === undefined ? existing.body : String(patch.body)
  const theme = patch.theme === undefined ? existing.theme : normaliseTheme(String(patch.theme))
  const occasion = patch.occasion === undefined ? existing.occasion : String(patch.occasion)
  const emoji = patch.emoji === undefined ? existing.emoji : String(patch.emoji)

  await env.DB.prepare('UPDATE pages SET slug = ?, title = ?, body = ?, theme = ?, occasion = ?, emoji = ?, updated_at = ? WHERE id = ?')
    .bind(slug, title, body, theme, occasion, emoji, nowIso(), existing.id)
    .run()
  return getPage(env, existing.id)
}

export async function deletePage(env: Env, pageId: string) {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(pageId).run()
}

export async function listPageLinks(env: Env, request?: Request) {
  const [editable, links, manifest] = await Promise.all([
    listPages(env),
    env.DB.prepare('SELECT * FROM page_links ORDER BY updated_at DESC').all<DbRow>(),
    getCustomPageManifest(request),
  ])

  return [
    ...editable.map((page) => ({
      id: page.id,
      title: page.title,
      href: `/page/${page.slug}`,
      description: page.occasion || firstLine(page.body),
      kind: 'editable',
    })),
    ...manifest,
    ...((links.results ?? []).map(toPageLink)),
  ]
}

export async function listCustomPageManifest(request?: Request) {
  return getCustomPageManifest(request)
}

export async function getCustomPageManifestReport(request?: Request): Promise<CustomPageManifestReport> {
  if (!request) return { pages: [], warnings: [] }
  try {
    const manifestUrl = new URL('/custom-pages/manifest.json', request.url)
    const response = await fetch(manifestUrl, { headers: { cookie: request.headers.get('cookie') ?? '' } })
    if (!response.ok) return { pages: [], warnings: [{ path: '/custom-pages/manifest.json', message: `Manifest returned ${response.status}.` }] }
    return parseCustomPageManifestReport(await response.json())
  } catch {
    return { pages: [], warnings: [{ path: '/custom-pages/manifest.json', message: 'Manifest could not be read.' }] }
  }
}

export async function createPageLink(env: Env, input: { title?: string; href?: string; description?: string; kind?: string }) {
  const stamp = nowIso()
  const linkId = id('link')
  await env.DB.prepare('INSERT INTO page_links (id, title, href, description, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(linkId, String(input.title ?? '').trim() || 'Untitled link', normaliseHref(String(input.href ?? '')), String(input.description ?? ''), String(input.kind ?? 'static') || 'static', stamp, stamp)
    .run()
  return listPageLinks(env)
}

export async function deletePageLink(env: Env, linkId: string) {
  await env.DB.prepare('DELETE FROM page_links WHERE id = ?').bind(linkId).run()
}

export async function getWeather(env: Env) {
  return cached(env, 'weather-v4', 45 * 60, async () => {
    const settings = await getSettings(env)
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', settings.latitude)
    url.searchParams.set('longitude', settings.longitude)
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation')
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset')
    url.searchParams.set('hourly', 'precipitation_probability,temperature_2m,weather_code')
    url.searchParams.set('timezone', settings.timezone)
    url.searchParams.set('forecast_days', '3')

    const raw = await fetchJson<Record<string, any>>(url)
    const current = raw.current ?? {}
    const daily = raw.daily ?? {}
    const hourly = raw.hourly ?? {}
    const now = Date.now()

    return {
      location: `${settings.locationName}, ${settings.locationRegion}`,
      current: {
        temperature: numericOrNull(current.temperature_2m),
        feelsLike: numericOrNull(current.apparent_temperature),
        windSpeed: numericOrNull(current.wind_speed_10m),
        windGusts: numericOrNull(current.wind_gusts_10m),
        precipitation: numericOrNull(current.precipitation),
        code: numericOrNull(current.weather_code),
        label: weatherLabel(current.weather_code),
        time: typeof current.time === 'string' ? current.time : null,
      },
      daily: (daily.time ?? []).slice(0, 3).map((date: string, index: number) => ({
        date,
        label: weatherLabel(daily.weather_code?.[index]),
        code: numericOrNull(daily.weather_code?.[index]),
        max: numericOrNull(daily.temperature_2m_max?.[index]),
        min: numericOrNull(daily.temperature_2m_min?.[index]),
        precipitationChance: numericOrNull(daily.precipitation_probability_max?.[index]),
        sunrise: typeof daily.sunrise?.[index] === 'string' ? daily.sunrise[index] : null,
        sunset: typeof daily.sunset?.[index] === 'string' ? daily.sunset[index] : null,
      })),
      hourly: (hourly.time ?? [])
        .map((time: string, index: number) => ({ time, index, timestamp: new Date(time).getTime() }))
        .filter((entry: { timestamp: number }) => Number.isFinite(entry.timestamp) && entry.timestamp >= now - 60 * 60 * 1000)
        .slice(0, 8)
        .map((entry: { time: string; index: number }) => ({
          time: entry.time,
          temperature: numericOrNull(hourly.temperature_2m?.[entry.index]),
          precipitationChance: numericOrNull(hourly.precipitation_probability?.[entry.index]),
          label: weatherLabel(hourly.weather_code?.[entry.index]),
        })),
    }
  })
}

export async function getMarine(env: Env) {
  const options = await getTidesModuleOptions(env)
  const source = normaliseTideSource(options.source)
  const cacheKey = source === 'api' ? 'marine-v4-api' : 'marine-v4-model'
  return cached(env, cacheKey, 6 * 60 * 60, async () => {
    const settings = await getSettings(env)
    if (source === 'api') {
      const fromApi = await getMarineFromApi(settings, options.apiKey)
      if (fromApi) return fromApi
    }

    const url = new URL('https://marine-api.open-meteo.com/v1/marine')
    url.searchParams.set('latitude', settings.latitude)
    url.searchParams.set('longitude', settings.longitude)
    url.searchParams.set('minutely_15', 'sea_level_height_msl')
    url.searchParams.set('current', 'sea_level_height_msl,wave_height')
    url.searchParams.set('timezone', settings.timezone)
    url.searchParams.set('forecast_minutely_15', '1344')
    url.searchParams.set('cell_selection', 'sea')

    const raw = await fetchJson<Record<string, any>>(url)
    const series = extractTideSeries(raw)
    const events = deriveTideEvents(series)
    const lastPoint = [...series].reverse().find((point) => point.height !== null)

    return {
      current: {
        seaLevel: numericOrNull(raw.current?.sea_level_height_msl),
        waveHeight: numericOrNull(raw.current?.wave_height),
        time: typeof raw.current?.time === 'string' ? raw.current.time : null,
      },
      forecastUntil: lastPoint?.time ?? null,
      events,
      note: source === 'api'
        ? 'API mode selected but unavailable (missing/invalid key or upstream issue), so built-in estimate is shown. Not for navigation.'
        : 'Approximate tide trend from Open-Meteo marine model, not official tide-table data. Not for navigation.',
    }
  })
}

async function getMarineFromApi(settings: Settings, apiKey: string) {
  const key = String(apiKey ?? '').trim()
  if (!key) return null

  const url = new URL('https://tidesatlas.com/api/v1/tides')
  url.searchParams.set('lat', settings.latitude)
  url.searchParams.set('lon', settings.longitude)
  url.searchParams.set('days', '3')

  const response = await fetch(url, { headers: { 'X-API-Key': key } })
  if (!response.ok) return null
  const raw = (await response.json()) as Record<string, unknown>
  const extremes = Array.isArray(raw.extremes) ? raw.extremes : []
  const events = extremes
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      const timeRaw = typeof row.datetime === 'string' ? row.datetime : (typeof row.time === 'string' ? row.time : '')
      const parsed = new Date(timeRaw)
      if (!Number.isFinite(parsed.getTime())) return null
      const typeRaw = String(row.type ?? '').toLowerCase()
      const type = typeRaw === 'high' || typeRaw === 'h' ? 'high' : (typeRaw === 'low' || typeRaw === 'l' ? 'low' : null)
      if (!type) return null
      return {
        id: `api-${parsed.toISOString()}`,
        type,
        time: parsed.toISOString(),
        height: numericOrNull(row.height_m ?? row.height),
      }
    })
    .filter((event): event is { id: string; type: 'high' | 'low'; time: string; height: number | null } => Boolean(event))
    .slice(0, 12)

  if (events.length === 0) return null

  return {
    current: {
      seaLevel: null,
      waveHeight: null,
      time: null,
    },
    forecastUntil: events.at(-1)?.time ?? null,
    events,
    note: 'Tide events via configured external API. Not for navigation.',
  }
}

async function getTidesModuleOptions(env: Env): Promise<{ source: unknown; apiKey: string }> {
  try {
    const row = await env.DB.prepare('SELECT options_json FROM module_settings WHERE id = ?').bind('tides').first<DbRow>()
    const parsed = row ? JSON.parse(rowString(row, 'options_json') || '{}') : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { source: 'model', apiKey: '' }
    const record = parsed as Record<string, unknown>
    return {
      source: record.source,
      apiKey: String(record.apiKey ?? ''),
    }
  } catch {
    return { source: 'model', apiKey: '' }
  }
}

function normaliseTideSource(value: unknown): 'model' | 'api' {
  return String(value ?? '').toLowerCase() === 'api' ? 'api' : 'model'
}

export async function deleteModuleData(env: Env, moduleId: string) {
  if (moduleId === 'lists') {
    await env.DB.prepare('DELETE FROM list_items').run()
    await env.DB.prepare('DELETE FROM lists').run()
  } else if (moduleId === 'notes') {
    await env.DB.prepare('DELETE FROM notes').run()
  } else if (moduleId === 'pages') {
    await env.DB.prepare('DELETE FROM pages').run()
    await env.DB.prepare('DELETE FROM page_links').run()
  } else if (moduleId === 'weather' || moduleId === 'tides') {
    await env.DB.prepare("DELETE FROM cache WHERE cache_key LIKE 'weather-%' OR cache_key LIKE 'marine-%' OR cache_key LIKE 'weather-v%' OR cache_key LIKE 'marine-v%'").run()
  }
}

export async function listCacheEntries(env: Env) {
  const rows =
    (
      await env.DB.prepare(
        'SELECT cache_key, expires_at, updated_at, length(payload) AS payload_bytes FROM cache ORDER BY updated_at DESC',
      ).all<DbRow>()
    ).results ?? []

  return rows.map((row) => ({
    key: rowString(row, 'cache_key'),
    expiresAt: rowString(row, 'expires_at'),
    updatedAt: rowString(row, 'updated_at'),
    payloadBytes: rowNumber(row, 'payload_bytes'),
    expired: new Date(rowString(row, 'expires_at')).getTime() <= Date.now(),
  }))
}

export async function clearCache(env: Env, key?: string) {
  if (key) {
    await env.DB.prepare('DELETE FROM cache WHERE cache_key = ?').bind(key).run()
  } else {
    await env.DB.prepare('DELETE FROM cache').run()
  }
  return listCacheEntries(env)
}

async function refreshPeriodicLists(env: Env) {
  const rows = (await env.DB.prepare('SELECT id, list_type, reset_key, metadata_json FROM lists').all<DbRow>()).results ?? []
  for (const row of rows) {
    const listType = normaliseListType(rowString(row, 'list_type'))
    if (!shouldRefreshList(listType, rowString(row, 'reset_key'))) continue
    const nextKey = resetKeyForListType(listType)
    const metadata = parseJsonObject(rowString(row, 'metadata_json'))
    metadata.lastResetAt = nowIso()
    metadata.lastResetKey = rowString(row, 'reset_key')
    await env.DB.prepare('UPDATE list_items SET done = 0, completed_at = NULL, updated_at = ? WHERE list_id = ?').bind(nowIso(), rowString(row, 'id')).run()
    await env.DB.prepare('UPDATE lists SET reset_key = ?, metadata_json = ?, updated_at = ? WHERE id = ?').bind(nextKey, JSON.stringify(metadata), nowIso(), rowString(row, 'id')).run()
  }
}

async function cached<T>(env: Env, key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
  const cachedRow = await env.DB.prepare('SELECT payload FROM cache WHERE cache_key = ? AND expires_at > ?').bind(key, nowIso()).first<DbRow>()
  if (cachedRow) return JSON.parse(rowString(cachedRow, 'payload')) as T

  const payload = await producer()
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  await env.DB.prepare(
    'INSERT INTO cache (cache_key, payload, expires_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at, updated_at = excluded.updated_at',
  )
    .bind(key, JSON.stringify(payload), expiresAt, nowIso())
    .run()
  return payload
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

async function getCustomPageManifest(request?: Request): Promise<CustomPageManifestEntry[]> {
  if (!request) return []
  try {
    const manifestUrl = new URL('/custom-pages/manifest.json', request.url)
    const response = await fetch(manifestUrl, { headers: { cookie: request.headers.get('cookie') ?? '' } })
    if (!response.ok) return []
    return parseCustomPageManifest(await response.json())
  } catch {
    return []
  }
}

export function parseCustomPageManifest(payload: unknown): CustomPageManifestEntry[] {
  return parseCustomPageManifestReport(payload).pages
}

export function parseCustomPageManifestReport(payload: unknown): CustomPageManifestReport {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { pages?: unknown }).pages)) {
    return { pages: [], warnings: [{ path: '/custom-pages/manifest.json', message: 'Manifest is malformed or missing a pages array.' }] }
  }
  const warnings = Array.isArray((payload as { warnings?: unknown }).warnings)
    ? ((payload as { warnings: Array<{ path?: unknown; message?: unknown }> }).warnings ?? []).map((warning) => ({
        path: String(warning.path ?? ''),
        message: String(warning.message ?? ''),
      }))
    : []

  const pages: CustomPageManifestEntry[] = []
  for (const page of (payload as { pages: Array<{ id?: unknown; title?: unknown; href?: unknown; description?: unknown }> }).pages ?? []) {
    if (!page.href || !page.title) {
      warnings.push({ path: String(page.href ?? 'unknown'), message: 'Manifest page is missing title or href.' })
      continue
    }
    pages.push({
      id: String(page.id ?? page.href),
      title: String(page.title),
      href: normaliseHref(String(page.href)),
      description: String(page.description ?? ''),
      kind: 'custom',
    })
  }

  return { pages, warnings }
}

function weatherLabel(code: unknown) {
  const numericCode = numericOrNull(code)
  if (numericCode === null) return 'Unknown'
  if (numericCode === 0) return 'Clear'
  if ([1, 2, 3].includes(numericCode)) return 'Cloudy spells'
  if ([45, 48].includes(numericCode)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(numericCode)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(numericCode)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(numericCode)) return 'Snow'
  if ([95, 96, 99].includes(numericCode)) return 'Thunder'
  return 'Changeable'
}

async function getUserNameMap(env: Env) {
  const rows = (await env.DB.prepare('SELECT id, display_name FROM users').all<DbRow>()).results ?? []
  return new Map(rows.map((row) => [rowString(row, 'id'), rowString(row, 'display_name')]))
}

function displayNameFor(users: Map<string, string>, userId: string) {
  return userId ? users.get(userId) ?? userId : null
}

function toNote(row: DbRow, users = new Map<string, string>()) {
  const createdBy = rowString(row, 'created_by')
  const updatedBy = rowString(row, 'updated_by')
  return {
    id: rowString(row, 'id'),
    title: rowString(row, 'title'),
    body: rowString(row, 'body'),
    tags: rowString(row, 'tags'),
    noteType: rowString(row, 'note_type') || 'text',
    metadata: parseJsonObject(rowString(row, 'metadata_json')),
    pinned: rowNumber(row, 'pinned') === 1,
    createdBy: createdBy || null,
    createdByName: displayNameFor(users, createdBy),
    updatedBy: updatedBy || null,
    updatedByName: displayNameFor(users, updatedBy),
    createdAt: rowString(row, 'created_at'),
    updatedAt: rowString(row, 'updated_at'),
  }
}

function toList(row: DbRow, users = new Map<string, string>()) {
  const createdBy = rowString(row, 'created_by')
  const updatedBy = rowString(row, 'updated_by')
  return {
    id: rowString(row, 'id'),
    name: rowString(row, 'name'),
    listType: normaliseListType(rowString(row, 'list_type')),
    resetKey: rowString(row, 'reset_key'),
    metadata: parseJsonObject(rowString(row, 'metadata_json')),
    createdBy: createdBy || null,
    createdByName: displayNameFor(users, createdBy),
    updatedBy: updatedBy || null,
    updatedByName: displayNameFor(users, updatedBy),
    createdAt: rowString(row, 'created_at'),
    updatedAt: rowString(row, 'updated_at'),
  }
}

function toListItem(row: DbRow, users = new Map<string, string>()) {
  const createdBy = rowString(row, 'created_by')
  const updatedBy = rowString(row, 'updated_by')
  return {
    id: rowString(row, 'id'),
    listId: rowString(row, 'list_id'),
    text: rowString(row, 'text'),
    done: rowNumber(row, 'done') === 1,
    completedAt: rowString(row, 'completed_at') || null,
    createdBy: createdBy || null,
    createdByName: displayNameFor(users, createdBy),
    updatedBy: updatedBy || null,
    updatedByName: displayNameFor(users, updatedBy),
    createdAt: rowString(row, 'created_at'),
    updatedAt: rowString(row, 'updated_at'),
  }
}

function toPage(row: DbRow) {
  return {
    id: rowString(row, 'id'),
    slug: rowString(row, 'slug'),
    title: rowString(row, 'title'),
    body: rowString(row, 'body'),
    theme: rowString(row, 'theme'),
    occasion: rowString(row, 'occasion'),
    emoji: rowString(row, 'emoji'),
    createdAt: rowString(row, 'created_at'),
    updatedAt: rowString(row, 'updated_at'),
  }
}

function toPageLink(row: DbRow) {
  return {
    id: rowString(row, 'id'),
    title: rowString(row, 'title'),
    href: normaliseHref(rowString(row, 'href')),
    description: rowString(row, 'description'),
    kind: rowString(row, 'kind') || 'static',
  }
}

function toActivity(row: DbRow): ActivityEntry {
  return {
    id: rowString(row, 'id'),
    actorUserId: rowString(row, 'actor_user_id') || null,
    actorName: rowString(row, 'actor_name') || 'System',
    action: rowString(row, 'action'),
    entityType: rowString(row, 'entity_type'),
    entityId: rowString(row, 'entity_id'),
    summary: rowString(row, 'summary'),
    metadata: parseJsonObject(rowString(row, 'metadata_json')),
    createdAt: rowString(row, 'created_at'),
  }
}

function defaultListName(listType: ListTypeId) {
  return listTypes.find((type) => type.id === listType)?.title ?? 'List'
}

function normaliseTheme(theme: string) {
  return ['shell', 'peach', 'moon', 'fern', 'botanical'].includes(theme) ? theme : 'shell'
}

function normaliseHref(href: string) {
  if (!href) return '/custom-pages/'
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/')) return href
  return `/custom-pages/${href.replace(/^\/+/, '')}`
}

export function normaliseThemeId(value: string) {
  const slug = String(value ?? '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : 'base'
}

export type ThemeManifestEntry = {
  id: string
  name: string
  author: string
  version: string
}

export async function listThemeManifest(request?: Request): Promise<ThemeManifestEntry[]> {
  if (!request) return []
  try {
    const manifestUrl = new URL('/themes/manifest.json', request.url)
    const response = await fetch(manifestUrl, { headers: { cookie: request.headers.get('cookie') ?? '' } })
    if (!response.ok) return []
    return parseThemeManifestEntries(await response.json())
  } catch {
    return []
  }
}

function parseThemeManifestEntries(payload: unknown): ThemeManifestEntry[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { themes?: unknown }).themes)) return []
  const entries: ThemeManifestEntry[] = []
  for (const theme of (payload as { themes: Array<Record<string, unknown>> }).themes) {
    if (!theme || typeof theme !== 'object' || !theme.id) continue
    entries.push({
      id: String(theme.id),
      name: String(theme.name ?? theme.id),
      author: String(theme.author ?? 'Unknown'),
      version: String(theme.version ?? '0.0.0'),
    })
  }
  return entries
}

// Validate a requested theme id against the generated manifest when a request is
// available; an unknown id (or no manifest) falls back to the neutral base theme.
async function validateThemeId(value: string, request?: Request): Promise<string> {
  const id = normaliseThemeId(value)
  if (id === 'base') return id
  const manifest = await listThemeManifest(request)
  if (manifest.length === 0) return id
  return manifest.some((theme) => theme.id === id) ? id : 'base'
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function safeJson(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '{}'
  return JSON.stringify(value)
}

function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

function getDeploymentInfo(request: Request) {
  const url = new URL(request.url)
  const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0'
  const isCloudflarePages = url.hostname.endsWith('.pages.dev')
  const mode = isLocalHost ? 'local-worker' : (isCloudflarePages ? 'cloudflare-pages' : 'worker-runtime')
  const note = isLocalHost
    ? 'Local worker runtime is active. API routes and D1-backed features are available.'
    : (isCloudflarePages
      ? 'Cloudflare Pages Functions runtime is active. D1-backed features are online.'
      : 'Worker runtime is active. API routes and data-backed features are available.')
  return {
    origin: url.origin,
    host: url.host,
    mode,
    ready: true,
    note,
  }
}

function normaliseWifiSecurity(value: string) {
  const upper = value.trim().toUpperCase()
  if (upper === 'WEP') return 'WEP'
  if (upper === 'NOPASS' || upper === 'OPEN') return 'nopass'
  return 'WPA'
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNetworkDevices(value: string): NetworkDevice[] {
  let raw: unknown
  try {
    raw = JSON.parse(value || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const name = String(record.name ?? '').trim()
      if (!name) return null
      return {
        id: String(record.id ?? `device-${index + 1}`),
        name,
        type: String(record.type ?? '').trim() || 'device',
        ip: String(record.ip ?? '').trim(),
        mac: String(record.mac ?? '').trim(),
        connection: String(record.connection ?? '').trim() || 'wifi',
        status: String(record.status ?? '').trim() || 'online',
        lastSeen: String(record.lastSeen ?? '').trim(),
        usageGb: record.usageGb === undefined || record.usageGb === null ? null : parseOptionalNumber(String(record.usageGb)),
      }
    })
    .filter((entry): entry is NetworkDevice => Boolean(entry))
}
