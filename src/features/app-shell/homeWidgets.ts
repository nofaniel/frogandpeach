import type { Module, SharedList } from '../../shared/api-types'

export type HomeWidgetState = {
  definition: NonNullable<Module['homeWidget']>
  mode: string
  enabled: boolean
}

export function resolveHomeWidgetState(module: Module): HomeWidgetState | null {
  const definition = module.homeWidget
  if (!definition) return null
  const current = module.options.homeWidget
  const validModes = new Set(definition.modes.map((mode) => mode.id))
  const mode = typeof current?.mode === 'string' && validModes.has(current.mode) ? current.mode : definition.defaultMode
  const enabled = typeof current?.enabled === 'boolean' ? current.enabled : definition.defaultEnabled
  return { definition, mode, enabled }
}

export type HomeListEntry = {
  list: SharedList
  starred: boolean
  incompleteCount: number
}

export function isListStarred(list: SharedList): boolean {
  return Boolean(list.metadata?.starred)
}

export function getHomeListEntries(lists: SharedList[], mode: string): HomeListEntry[] {
  const entries = lists.map((list) => ({
    list,
    starred: isListStarred(list),
    incompleteCount: list.items.filter((item) => !item.done).length,
  }))

  if (mode === 'starred') {
    const starred = entries
      .filter((entry) => entry.starred)
      .sort((a, b) => Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
    const active = entries
      .filter((entry) => !entry.starred && entry.incompleteCount > 0)
      .sort((a, b) => Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
    if (starred.length > 0) return [...starred, ...active]
    if (active.length > 0) return active
    return entries.sort((a, b) => Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
  }

  const active = entries
    .filter((entry) => entry.incompleteCount > 0)
    .sort((a, b) => Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
  if (active.length > 0) return active
  return entries.sort((a, b) => Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
}
