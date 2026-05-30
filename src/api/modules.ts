import { nowIso, rowNumber, rowString } from './http'
import type { DbRow, Env } from './types'

export type ModuleSize = 'small' | 'medium' | 'wide' | 'full'

export type ModuleDefinition = {
  id: string
  title: string
  description: string
  category: 'content' | 'data' | 'admin' | 'system'
  defaultPosition: number
  defaultEnabled: boolean
  defaultInstalled: boolean
  defaultSize: ModuleSize
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
  { id: 'weather', title: 'Weather', description: 'Current weather and three-day forecast.', category: 'data', defaultPosition: 10, defaultEnabled: true, defaultInstalled: true, defaultSize: 'wide' },
  { id: 'tides', title: 'Tides', description: 'Approximate tide trends from Open-Meteo marine model data.', category: 'data', defaultPosition: 20, defaultEnabled: true, defaultInstalled: true, defaultSize: 'wide' },
  { id: 'lists', title: 'Lists', description: 'Shared household lists, shopping lists, goals, and checklists.', category: 'content', defaultPosition: 30, defaultEnabled: true, defaultInstalled: true, defaultSize: 'medium' },
  { id: 'notes', title: 'Notes', description: 'Pinned and tagged shared notes with metadata for future note types.', category: 'content', defaultPosition: 40, defaultEnabled: true, defaultInstalled: true, defaultSize: 'medium' },
  { id: 'pages', title: 'Pages', description: 'Editable markdown pages and discovered custom static pages.', category: 'content', defaultPosition: 50, defaultEnabled: true, defaultInstalled: true, defaultSize: 'wide' },
  { id: 'network', title: 'Network', description: 'Wi-Fi sharing, usage snapshots, and connected device overview.', category: 'system', defaultPosition: 60, defaultEnabled: true, defaultInstalled: true, defaultSize: 'wide' },
  { id: 'settings', title: 'Admin tools', description: 'Users, modules, appearance, household settings, cache, and review tools.', category: 'admin', defaultPosition: 70, defaultEnabled: false, defaultInstalled: true, defaultSize: 'wide' },
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
      return {
        ...definition,
        installed,
        enabled: installed && (row ? rowNumber(row, 'enabled') === 1 : definition.defaultEnabled),
        position: row ? rowNumber(row, 'position') : definition.defaultPosition,
        size: normaliseModuleSize(rowString(row ?? {}, 'size') || definition.defaultSize),
        options: parseOptions(rowString(row ?? {}, 'options_json')),
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
    const options = entry.options === undefined ? existing?.options ?? {} : entry.options
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
