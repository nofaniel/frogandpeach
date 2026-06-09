export type ListTypeId = 'basic' | 'shopping' | 'life_goal' | 'daily_checklist' | 'weekly_chore' | 'deadline'

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
  { id: 'deadline', title: 'Deadline list', description: 'Tasks with due dates and target dates.', reset: 'never' },
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

export type ListStatus = 'open' | 'done' | 'overdue' | 'due_soon' | 'missed'

export function computeListStatus(item: { done: boolean; metadata?: Record<string, unknown> }, listType: ListTypeId, now = new Date()): ListStatus {
  if (item.done) return 'done'

  const meta = item.metadata ?? {}
  const dueDateRaw = meta.dueDate ?? meta.targetDate
  if (typeof dueDateRaw !== 'string' || !dueDateRaw) return 'open'

  const dueDate = new Date(dueDateRaw)
  if (!Number.isFinite(dueDate.getTime())) return 'open'

  if (listType === 'deadline') {
    const diffMs = dueDate.getTime() - now.getTime()
    if (diffMs < 0) return 'overdue'
    if (diffMs < 2 * 24 * 60 * 60 * 1000) return 'due_soon'
    return 'open'
  }

  if (listType === 'daily_checklist') {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (dueDate.getTime() < dayStart.getTime()) return 'missed'
    return 'open'
  }

  if (listType === 'weekly_chore') {
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() || 7) - 1)))
    if (dueDate.getTime() < weekStart.getTime()) return 'missed'
    return 'open'
  }

  return 'open'
}

export const STATUS_LABELS: Record<ListStatus, string> = {
  open: 'Open',
  done: 'Done',
  overdue: 'Overdue',
  due_soon: 'Due soon',
  missed: 'Missed',
}

export const STATUS_PRIORITY: Record<ListStatus, number> = {
  overdue: 0,
  missed: 1,
  due_soon: 2,
  open: 3,
  done: 4,
}

export const ITEM_METADATA_FIELDS: Partial<Record<ListTypeId, Array<{ key: string; label: string; type: 'text' | 'number' | 'date' }>>> = {
  shopping: [
    { key: 'quantity', label: 'Qty', type: 'number' },
    { key: 'category', label: 'Category', type: 'text' },
  ],
  life_goal: [
    { key: 'targetDate', label: 'Target date', type: 'date' },
    { key: 'progress', label: 'Progress %', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ],
  deadline: [
    { key: 'dueDate', label: 'Due date', type: 'date' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ],
  daily_checklist: [
    { key: 'dueDate', label: 'Due date', type: 'date' },
  ],
  weekly_chore: [
    { key: 'dueDate', label: 'Due date', type: 'date' },
  ],
}
