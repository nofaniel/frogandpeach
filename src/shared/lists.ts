export type ListTypeId = 'basic' | 'shopping' | 'life_goal' | 'daily_checklist' | 'weekly_chore'

export type ListTypeDefinition = {
  id: ListTypeId
  title: string
  description: string
  reset: 'never' | 'daily' | 'weekly'
}

export const listTypes: ListTypeDefinition[] = [
  { id: 'basic', title: 'Basic list', description: 'A simple shared list.', reset: 'never' },
  { id: 'shopping', title: 'Shopping list', description: 'Reusable shopping or supply list.', reset: 'never' },
  { id: 'life_goal', title: 'Life goal list', description: 'Longer-running goals and milestones.', reset: 'never' },
  { id: 'daily_checklist', title: 'Daily checklist', description: 'Tasks that clear down each day.', reset: 'daily' },
  { id: 'weekly_chore', title: 'Weekly chore checklist', description: 'Tasks that reset at the start of each ISO week.', reset: 'weekly' },
]

const listTypeIds = new Set(listTypes.map((type) => type.id))

export function normaliseListType(value: unknown): ListTypeId {
  return listTypeIds.has(value as ListTypeId) ? (value as ListTypeId) : 'basic'
}

export function resetKeyForListType(type: ListTypeId, date = new Date()) {
  const definition = listTypes.find((entry) => entry.id === type)
  if (definition?.reset === 'daily') return date.toISOString().slice(0, 10)
  if (definition?.reset === 'weekly') return isoWeekKey(date)
  return ''
}

export function shouldRefreshList(type: ListTypeId, storedResetKey: string, date = new Date()) {
  const nextResetKey = resetKeyForListType(type, date)
  return Boolean(nextResetKey && storedResetKey !== nextResetKey)
}

function isoWeekKey(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
