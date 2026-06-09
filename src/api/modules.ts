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
    navigationBar: { defaultEnabled: false },
    homeWidget: {
      label: 'Homepage weather widget',
      description: 'Controls whether weather appears on the home screen and which density is used.',
      defaultEnabled: true,
      defaultMode: 'current',
      modes: [
        { id: 'current', label: 'Current conditions', description: 'Compact current weather with today’s key metrics.' },
        { id: 'forecast', label: 'Forecast', description: 'Current weather plus the next 5 days.' },
      ],
    },
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
        { id: 'starred', label: 'Starred first', description: 'Pinned lists first, then recent active lists.' },
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
      defaultEnabled: true,
      defaultMode: 'status',
      modes: [
        { id: 'status', label: 'Status', description: 'Deployment, router, and admin links.' },
        { id: 'details', label: 'Details', description: 'Status plus usage and device summary.' },
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

  if (definition?.id === 'weather') {
    normalised.iconStyle = options.iconStyle === 'icons' ? 'icons' : 'emoji'
    normalised.showExtendedForecast = options.showExtendedForecast === true
  }

  if (definition?.id === 'tides') {
    normalised.source = String(options.source ?? '').toLowerCase() === 'api' ? 'api' : 'model'
    normalised.apiKey = typeof options.apiKey === 'string' ? options.apiKey : ''
    normalised.showCurrentTide = options.showCurrentTide !== false
    normalised.showTimeUntilNext = options.showTimeUntilNext !== false
    normalised.showNextTides = options.showNextTides !== false
    normalised.showTideSourceNote = options.showTideSourceNote !== false
    const rawCount = typeof options.nextTideCount === 'number' && Number.isFinite(options.nextTideCount) ? Math.round(options.nextTideCount) : 5
    normalised.nextTideCount = Math.max(1, Math.min(5, rawCount))
  }

  return normalised
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
