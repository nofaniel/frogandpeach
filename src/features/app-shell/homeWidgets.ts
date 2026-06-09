import type { Module, SharedList } from '../../shared/api-types'
import { computeListStatus, STATUS_PRIORITY, type ListTypeId } from '../../shared/lists'

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
  attentionScore: number
}

export function isListStarred(list: SharedList): boolean {
  return Boolean(list.metadata?.starred)
}

function worstItemStatus(list: SharedList): number {
  let worst = 4
  const listType = list.listType as ListTypeId
  for (const item of list.items) {
    if (item.done) continue
    const status = computeListStatus(item, listType)
    const priority = STATUS_PRIORITY[status]
    if (priority < worst) worst = priority
  }
  return worst
}

function attentionScore(list: SharedList): number {
  let score = 0
  if (list.metadata?.starred) score += 100
  score += (4 - worstItemStatus(list)) * 10
  const incomplete = list.items.filter((item) => !item.done).length
  score += Math.min(incomplete, 10)
  return score
}

export function getHomeListEntries(lists: SharedList[], mode: string): HomeListEntry[] {
  const entries = lists.map((list) => ({
    list,
    starred: isListStarred(list),
    incompleteCount: list.items.filter((item) => !item.done).length,
    attentionScore: attentionScore(list),
  }))

  if (mode === 'starred') {
    const starred = entries
      .filter((entry) => entry.starred)
      .sort((a, b) => b.attentionScore - a.attentionScore || Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
    const active = entries
      .filter((entry) => !entry.starred && entry.incompleteCount > 0)
      .sort((a, b) => b.attentionScore - a.attentionScore || Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
    if (starred.length > 0) return [...starred, ...active]
    if (active.length > 0) return active
    return entries.sort((a, b) => b.attentionScore - a.attentionScore || Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
  }

  const active = entries
    .filter((entry) => entry.incompleteCount > 0)
    .sort((a, b) => b.attentionScore - a.attentionScore || Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
  if (active.length > 0) return active
  return entries.sort((a, b) => b.attentionScore - a.attentionScore || Date.parse(b.list.updatedAt) - Date.parse(a.list.updatedAt))
}
