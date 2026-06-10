import { nowIso, rowNumber, rowString } from './http'
import type { DbRow, Env } from './types'

export type ModuleSize = 'small' | 'medium' | 'wide' | 'full'

export type HomeWidgetModeDefinition = {
  id: string
  label: string
  description: string
}

export type HomeWidgetDefinition = {
  label: string
  description: string
  defaultEnabled: boolean
  defaultMode: string
  modes: HomeWidgetModeDefinition[]
}

export type HomeWidgetState = {
  enabled: boolean
  mode: string
}

export type ModuleNavigationBarDefinition = {
  defaultEnabled: boolean
}

export type ModuleNavigationBarState = {
  enabled: boolean
  mode: string
}

export type ModuleSettingSelect = {
  key: string
  type: 'select'
  label: string
  description: string
  defaultValue: string
  options: Array<{ value: string; label: string; description?: string }>
}

export type ModuleSettingBoolean = {
  key: string
  type: 'boolean'
  label: string
  description: string
  defaultValue: boolean
}

export type ModuleSettingText = {
  key: string
  type: 'text'
  label: string
  description: string
  defaultValue: string
  placeholder?: string
}

export type ModuleSettingSecret = {
  key: string
  type: 'secret'
  label: string
  description: string
  defaultValue: string
  placeholder?: string
}

export type ModuleSettingNumber = {
  key: string
  type: 'number'
  label: string
  description: string
  defaultValue: number
  min?: number
  max?: number
}

export type ModuleSettingDefinition = ModuleSettingSelect | ModuleSettingBoolean | ModuleSettingText | ModuleSettingSecret | ModuleSettingNumber

export type ModuleDefinition = {
  id: string
  title: string
  description: string
  category: 'content' | 'data' | 'admin' | 'system'
  defaultPosition: number
  defaultEnabled: boolean
  defaultInstalled: boolean
  defaultSize: ModuleSize
  navigationBar: ModuleNavigationBarDefinition
  homeWidget?: HomeWidgetDefinition
  settings?: ModuleSettingDefinition[]
}

export type ModuleState = ModuleDefinition & {
  installed: boolean
  enabled: boolean
  position: number
  size: ModuleSize
  options: Record<string, unknown>
}

export type ModulePatch = {
  id: string
  installed?: boolean
  enabled?: boolean
  position?: number
  size?: string
  options?: Record<string, unknown>
}

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: 'weather',
    title: 'Weather',
    description: 'Current weather and 5-day forecast.',
    category: 'data',
    defaultPosition: 10,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'wide',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage weather widget',
      description: 'Controls whether weather appears on the home screen and which density is used.',
      defaultEnabled: true,
      defaultMode: 'current',
      modes: [
        { id: 'current', label: 'Current conditions', description: "Compact current weather with today's key metrics." },
        { id: 'forecast', label: 'Forecast', description: 'Current weather plus the next 5 days.' },
      ],
    },
    settings: [
      {
        key: 'iconStyle',
        type: 'select',
        label: 'Weather icons',
        description: 'Choose how weather conditions are displayed on cards and widgets.',
        defaultValue: 'emoji',
        options: [
          { value: 'emoji', label: 'Emoji', description: 'Native emoji characters for weather conditions.' },
          { value: 'icons', label: 'Line icons', description: 'Minimal line-art icons for a cleaner look.' },
        ],
      },
      {
        key: 'showExtendedForecast',
        type: 'boolean',
        label: '5-day forecast',
        description: 'Show a 5-day forecast row below the current weather card.',
        defaultValue: false,
      },
      {
        key: 'showUvIndex',
        type: 'boolean',
        label: 'UV index',
        description: 'Show current and daily-maximum UV index data.',
        defaultValue: false,
      },
      {
        key: 'showAirQuality',
        type: 'boolean',
        label: 'Air quality',
        description: 'Show European Air Quality Index (AQI), PM2.5, and PM10 levels.',
        defaultValue: false,
      },
      {
        key: 'showPollen',
        type: 'boolean',
        label: 'Pollen levels',
        description: 'Show grass, birch, alder, mugwort, olive, and ragweed pollen counts. Data is available for European locations only.',
        defaultValue: false,
      },
      {
        key: 'enhancedAnimations',
        type: 'boolean',
        label: 'Weather animations',
        description: 'Show immersive CSS animations that reflect current weather conditions on the observatory page.',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'tides',
    title: 'Tides',
    description: 'Approximate tide trends from Open-Meteo marine model data.',
    category: 'data',
    defaultPosition: 20,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'wide',
    navigationBar: { defaultEnabled: false },
    homeWidget: {
      label: 'Homepage tides widget',
      description: 'Controls whether tide events appear on the home screen and how much detail is shown.',
      defaultEnabled: true,
      defaultMode: 'next',
      modes: [
        { id: 'next', label: 'Next tides', description: 'Compact next-two tide overview.' },
        { id: 'timeline', label: 'Timeline', description: 'Next tide events plus a short multi-day timeline.' },
      ],
    },
    settings: [
      {
        key: 'source',
        type: 'select',
        label: 'Tide source',
        description: 'Built-in estimate uses a marine model. API provides measured data from tidal stations.',
        defaultValue: 'model',
        options: [
          { value: 'model', label: 'Built-in estimate', description: 'Open-Meteo marine model data, no key required.' },
          { value: 'api', label: 'API', description: 'Measured station data from TidesAtlas. Requires an API key.' },
        ],
      },
      {
        key: 'apiKey',
        type: 'secret',
        label: 'API key',
        description: 'Required when using the API tide source. Your key is stored securely and never shared.',
        defaultValue: '',
        placeholder: 'Paste API key',
      },
      {
        key: 'showCurrentTide',
        type: 'boolean',
        label: 'Current tide',
        description: 'Show the current sea level reading on the tide card.',
        defaultValue: true,
      },
      {
        key: 'showTimeUntilNext',
        type: 'boolean',
        label: 'Time until next',
        description: 'Show the countdown to the next high or low tide.',
        defaultValue: true,
      },
      {
        key: 'showNextTides',
        type: 'boolean',
        label: 'Next tides list',
        description: 'Show upcoming tide events in a list below the summary.',
        defaultValue: true,
      },
      {
        key: 'nextTideCount',
        type: 'number',
        label: 'Number of tides',
        description: 'How many upcoming tide events to display in the list.',
        defaultValue: 5,
        min: 1,
        max: 5,
      },
      {
        key: 'showTideSourceNote',
        type: 'boolean',
        label: 'Source note',
        description: 'Show a note about the tide data source below the card.',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'lists',
    title: 'Lists',
    description: 'Shared household lists, shopping lists, goals, and checklists.',
    category: 'content',
    defaultPosition: 30,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'medium',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage lists widget',
      description: 'Controls whether list shortcuts appear on the home screen and how they are ranked.',
      defaultEnabled: true,
      defaultMode: 'starred',
      modes: [
        { id: 'starred', label: 'Starred', description: 'Starred lists first, then recent active lists.' },
        { id: 'active', label: 'Active lists', description: 'Recently updated active lists with incomplete counts.' },
      ],
    },
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Pinned and tagged shared notes with metadata for future note types.',
    category: 'content',
    defaultPosition: 40,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'medium',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage notes widget',
      description: 'Controls whether notes appear on the home screen and how much text is shown.',
      defaultEnabled: true,
      defaultMode: 'small',
      modes: [
        { id: 'small', label: 'Small', description: 'Three pinned or recent notes.' },
        { id: 'large', label: 'Large', description: 'Six notes with snippets and tags.' },
      ],
    },
  },
  {
    id: 'pages',
    title: 'Pages',
    description: 'Editable markdown pages and discovered custom static pages.',
    category: 'content',
    defaultPosition: 50,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'wide',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage pages widget',
      description: 'Controls whether page links appear on the home screen and whether they stay compact or expanded.',
      defaultEnabled: true,
      defaultMode: 'compact',
      modes: [
        { id: 'compact', label: 'Compact', description: 'Page chips for quick launch.' },
        { id: 'launchpad', label: 'Launchpad', description: 'Richer cards with descriptions and quick-open links.' },
      ],
    },
  },
  {
    id: 'network',
    title: 'Network',
    description: 'Wi-Fi sharing, usage snapshots, and connected device overview.',
    category: 'system',
    defaultPosition: 60,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'wide',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage network widget',
      description: 'Controls whether deployment and network information appears on the home screen.',
      defaultEnabled: false,
      defaultMode: 'status',
      modes: [
        { id: 'status', label: 'Status', description: 'Deployment, router, and admin links.' },
        { id: 'details', label: 'Details', description: 'Status plus usage and device summary.' },
      ],
    },
  },
  {
    id: 'whiteboard',
    title: 'Whiteboard',
    description: 'Shared drawing board for the household.',
    category: 'content',
    defaultPosition: 35,
    defaultEnabled: true,
    defaultInstalled: true,
    defaultSize: 'wide',
    navigationBar: { defaultEnabled: true },
    homeWidget: {
      label: 'Homepage whiteboard widget',
      description: 'Controls whether a whiteboard preview appears on the home screen.',
      defaultEnabled: true,
      defaultMode: 'compact',
      modes: [
        { id: 'compact', label: 'Compact', description: 'Stroke count and last drawn time.' },
        { id: 'expanded', label: 'Expanded', description: 'More detail about recent activity.' },
      ],
    },
  },
  { id: 'settings', title: 'Admin tools', description: 'Users, modules, appearance, household settings, cache, and review tools.', category: 'admin', defaultPosition: 70, defaultEnabled: false, defaultInstalled: true, defaultSize: 'wide', navigationBar: { defaultEnabled: false } },
]

const validSizes: ModuleSize[] = ['small', 'medium', 'wide', 'full']

export async function listModules(env: Env) {
  const rows = await env.DB.prepare('SELECT id, installed, enabled, position, size, options_json FROM module_settings').all<DbRow>()
  const settings = new Map((rows.results ?? []).map((row) => [rowString(row, 'id'), row]))
  return normaliseModules(settings)
}

export function normaliseModules(settings: Map<string, DbRow>) {
  return moduleDefinitions
    .map((definition) => {
      const row = settings.get(definition.id)
      const installed = row ? rowNumber(row, 'installed') === 1 : definition.defaultInstalled
      const options = normaliseModuleOptions(definition, parseOptions(rowString(row ?? {}, 'options_json')))
      return {
        ...definition,
        installed,
        enabled: installed && (row ? rowNumber(row, 'enabled') === 1 : definition.defaultEnabled),
        position: row ? rowNumber(row, 'position') : definition.defaultPosition,
        size: normaliseModuleSize(rowString(row ?? {}, 'size') || definition.defaultSize),
        options,
      }
    })
    .sort((left, right) => left.position - right.position || left.defaultPosition - right.defaultPosition)
}

export async function updateModules(env: Env, patch: ModulePatch[]) {
  const validIds = new Set(moduleDefinitions.map((definition) => definition.id))
  const statement = env.DB.prepare(
    'INSERT INTO module_settings (id, installed, enabled, position, size, options_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET installed = excluded.installed, enabled = excluded.enabled, position = excluded.position, size = excluded.size, options_json = excluded.options_json, updated_at = excluded.updated_at',
  )

  const current = new Map((await listModules(env)).map((module) => [module.id, module]))
  for (const entry of patch) {
    if (!validIds.has(entry.id)) continue
    const existing = current.get(entry.id)
    const installed = entry.installed === undefined ? (existing?.installed ?? true) : Boolean(entry.installed)
    const enabled = installed && (entry.enabled === undefined ? (existing?.enabled ?? true) : Boolean(entry.enabled))
    const position = Number.isFinite(entry.position) ? Number(entry.position) : existing?.position ?? 0
    const size = normaliseModuleSize(entry.size ?? existing?.size ?? 'medium')
    const definition = moduleDefinitions.find((module) => module.id === entry.id)
    const options = normaliseModuleOptions(definition, entry.options === undefined ? existing?.options ?? {} : entry.options)
    await statement.bind(entry.id, installed ? 1 : 0, enabled ? 1 : 0, position, size, JSON.stringify(options ?? {}), nowIso()).run()
  }

  return listModules(env)
}

export function normaliseModuleSize(size: string): ModuleSize {
  return validSizes.includes(size as ModuleSize) ? (size as ModuleSize) : 'medium'
}

function parseOptions(value: string) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function normaliseModuleOptions(definition: ModuleDefinition | undefined, options: Record<string, unknown>) {
  const navigationBar = normaliseNavigationBarState(definition, options.navigationBar)
  const normalised: Record<string, unknown> = {
    ...options,
    navigationBar,
  }

  if (definition?.homeWidget) {
    normalised.homeWidget = normaliseHomeWidgetState(definition.homeWidget, options.homeWidget)
  } else {
    delete normalised.homeWidget
  }

  if (definition?.settings) {
    for (const setting of definition.settings) {
      normalised[setting.key] = normaliseSettingValue(setting, options[setting.key])
    }
  }

  return normalised
}

function normaliseSettingValue(setting: ModuleSettingDefinition, raw: unknown): unknown {
  switch (setting.type) {
    case 'select': {
      const values = setting.options.map((o) => o.value)
      const str = String(raw ?? '').toLowerCase()
      return values.includes(str) ? str : setting.defaultValue
    }
    case 'boolean':
      return raw === true || raw === false ? raw : setting.defaultValue
    case 'text':
      return typeof raw === 'string' ? raw : setting.defaultValue
    case 'secret':
      return typeof raw === 'string' ? raw : setting.defaultValue
    case 'number': {
      const num = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : setting.defaultValue
      const min = setting.min ?? num
      const max = setting.max ?? num
      return Math.max(min, Math.min(max, num))
    }
  }
}

export function redactModuleOptions(definition: ModuleDefinition | undefined, options: Record<string, unknown>): Record<string, unknown> {
  if (!definition?.settings) return options
  const redacted = { ...options }
  for (const setting of definition.settings) {
    if (setting.type === 'secret' && typeof redacted[setting.key] === 'string' && (redacted[setting.key] as string).length > 0) {
      redacted[setting.key] = '[redacted]'
    }
  }
  return redacted
}

function normaliseHomeWidgetState(definition: HomeWidgetDefinition, value: unknown): HomeWidgetState {
  const current = value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<HomeWidgetState>) : {}
  const validModes = new Set(definition.modes.map((mode) => mode.id))

  return {
    enabled: typeof current.enabled === 'boolean' ? current.enabled : definition.defaultEnabled,
    mode: typeof current.mode === 'string' && validModes.has(current.mode) ? current.mode : definition.defaultMode,
  }
}

function normaliseNavigationBarState(definition: ModuleDefinition | undefined, value: unknown): ModuleNavigationBarState {
  const current = value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<ModuleNavigationBarState>) : {}
  return {
    enabled: typeof current.enabled === 'boolean' ? current.enabled : Boolean(definition?.navigationBar?.defaultEnabled),
    mode: typeof current.mode === 'string' && current.mode.trim() ? current.mode.trim() : 'default',
  }
}
