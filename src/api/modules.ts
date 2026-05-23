import { rowNumber, rowString } from './http'
import type { DbRow, Env } from './types'

export type ModuleDefinition = {
  id: string
  title: string
  description: string
  position: number
  enabled: boolean
}

const definitions: ModuleDefinition[] = [
  { id: 'weather', title: 'Weather', description: 'Current Newquay weather and three-day forecast.', position: 10, enabled: true },
  { id: 'tides', title: 'Tides', description: 'Approximate tide trends from Open-Meteo marine model data.', position: 20, enabled: true },
  { id: 'lists', title: 'Lists', description: 'Shared shopping and household lists.', position: 30, enabled: true },
  { id: 'notes', title: 'Notes', description: 'Pinned and tagged shared notes.', position: 40, enabled: true },
  { id: 'pages', title: 'Pages', description: 'Editable markdown pages and static page launchers.', position: 50, enabled: true },
  { id: 'network', title: 'Network', description: 'Router, Wi-Fi, deployment, and household details.', position: 60, enabled: true },
]

export async function listModules(env: Env) {
  const rows = await env.DB.prepare('SELECT id, enabled, position FROM module_settings').all<DbRow>()
  const settings = new Map((rows.results ?? []).map((row) => [rowString(row, 'id'), row]))

  return definitions
    .map((definition) => {
      const row = settings.get(definition.id)
      return {
        ...definition,
        enabled: row ? rowNumber(row, 'enabled') === 1 : definition.enabled,
        position: row ? rowNumber(row, 'position') : definition.position,
      }
    })
    .sort((left, right) => left.position - right.position)
}

export async function updateModules(env: Env, patch: Array<{ id: string; enabled?: boolean; position?: number }>) {
  const validIds = new Set(definitions.map((definition) => definition.id))
  const statement = env.DB.prepare(
    'INSERT INTO module_settings (id, enabled, position) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, position = excluded.position',
  )

  const current = new Map((await listModules(env)).map((module) => [module.id, module]))
  for (const entry of patch) {
    if (!validIds.has(entry.id)) continue
    const existing = current.get(entry.id)
    await statement.bind(entry.id, entry.enabled === undefined ? (existing?.enabled ? 1 : 0) : entry.enabled ? 1 : 0, entry.position ?? existing?.position ?? 0).run()
  }

  return listModules(env)
}
