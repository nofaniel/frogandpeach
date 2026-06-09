import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { ListItem, ListType, SharedList } from '../../shared/api-types'
import { ITEM_METADATA_FIELDS, STATUS_LABELS, STATUS_PRIORITY, computeListStatus, type ListStatus, type ListTypeId } from '../../shared/lists'
import { LIST_TYPE_EXAMPLES, LIST_TYPE_EMPTY_MESSAGES } from '../../shared/lists'
import { labelForListType } from '../../shared/format'

export function ListsWorkspace({
  lists,
  listTypes,
  listDraft,
  setListDraft,
  itemDrafts,
  setItemDrafts,
  itemMetadataDrafts,
  setItemMetadataDrafts,
  listFilter,
  setListFilter,
  onCreateList,
  onCreateItem,
  onToggleItem,
  onUpdateItemMetadata,
  onRemoveItem,
  onRemoveList,
  onToggleListStar,
}: {
  lists: SharedList[]
  listTypes: ListType[]
  listDraft: { name: string; listType: string }
  setListDraft: Dispatch<SetStateAction<{ name: string; listType: string }>>
  itemDrafts: Record<string, string>
  setItemDrafts: Dispatch<SetStateAction<Record<string, string>>>
  itemMetadataDrafts: Record<string, Record<string, unknown>>
  setItemMetadataDrafts: Dispatch<SetStateAction<Record<string, Record<string, unknown>>>>
  listFilter: Record<string, string>
  setListFilter: Dispatch<SetStateAction<Record<string, string>>>
  onCreateList: (event: FormEvent<HTMLFormElement>) => void
  onCreateItem: (event: FormEvent<HTMLFormElement>, listId: string) => void
  onToggleItem: (item: ListItem) => void
  onUpdateItemMetadata: (item: ListItem, patch: { metadata?: unknown }) => void
  onRemoveItem: (id: string) => void
  onRemoveList: (id: string) => void
  onToggleListStar: (list: SharedList) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortMode, setSortMode] = useState('attention')

  const selectedType = listTypes.find((t) => t.id === listDraft.listType)

  const filteredLists = useMemo(() => {
    let result = lists
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((list) =>
        list.name.toLowerCase().includes(q) ||
        list.items.some((item) => item.text.toLowerCase().includes(q))
      )
    }
    if (typeFilter !== 'all') {
      result = result.filter((list) => list.listType === typeFilter)
    }
    if (sortMode === 'attention') {
      result = [...result].sort((a, b) => {
        const aStarred = Boolean(a.metadata?.starred)
        const bStarred = Boolean(b.metadata?.starred)
        if (aStarred !== bStarred) return aStarred ? -1 : 1
        const aIncomplete = a.items.filter((i) => !i.done).length
        const bIncomplete = b.items.filter((i) => !i.done).length
        return bIncomplete - aIncomplete
      })
    } else if (sortMode === 'az') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      result = [...result].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    }
    return result
  }, [lists, searchQuery, typeFilter, sortMode])

  return (
    <section className="workspace-grid">
      <div className="lists-toolbar">
        <input
          className="lists-search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search lists and items..."
        />
        <select className="lists-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">All types</option>
          {listTypes.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}
        </select>
        <select className="lists-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
          <option value="attention">Needs attention</option>
          <option value="recent">Recently updated</option>
          <option value="az">A-Z</option>
        </select>
      </div>

      <form className="panel form-panel" onSubmit={onCreateList}>
        <p className="kicker">Lists</p>
        <h2>New list</h2>
        <input value={listDraft.name} onChange={(event) => setListDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder={selectedType ? LIST_TYPE_EXAMPLES[selectedType.id as ListTypeId] ?? 'List name...' : 'Big shop, chores, goals...'} />
        <select value={listDraft.listType} onChange={(event) => setListDraft((draft) => ({ ...draft, listType: event.target.value }))}>
          {listTypes.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}
        </select>
        {selectedType && (
          <div className="list-type-description">
            <p>{selectedType.description}</p>
            {LIST_TYPE_EXAMPLES[selectedType.id as ListTypeId] && (
              <p className="list-type-examples">Example: {LIST_TYPE_EXAMPLES[selectedType.id as ListTypeId]}</p>
            )}
          </div>
        )}
        <button type="submit">Add list</button>
      </form>

      {filteredLists.map((list) => (
        <ListPanel
          key={list.id}
          list={list}
          listTypes={listTypes}
          itemDraft={itemDrafts[list.id] ?? ''}
          setItemDraft={(text) => setItemDrafts((drafts) => ({ ...drafts, [list.id]: text }))}
          itemMetadataDraft={itemMetadataDrafts[list.id] ?? {}}
          setItemMetadataDraft={(meta) => setItemMetadataDrafts((drafts) => ({ ...drafts, [list.id]: meta }))}
          filter={listFilter[list.id] ?? 'all'}
          setFilter={(f) => setListFilter((drafts) => ({ ...drafts, [list.id]: f }))}
          onCreateItem={onCreateItem}
          onToggleItem={onToggleItem}
          onUpdateItemMetadata={onUpdateItemMetadata}
          onRemoveItem={onRemoveItem}
          onRemoveList={onRemoveList}
          onToggleListStar={onToggleListStar}
        />
      ))}
    </section>
  )
}

function ListPanel({
  list,
  listTypes,
  itemDraft,
  setItemDraft,
  itemMetadataDraft,
  setItemMetadataDraft,
  filter,
  setFilter,
  onCreateItem,
  onToggleItem,
  onUpdateItemMetadata,
  onRemoveItem,
  onRemoveList,
  onToggleListStar,
}: {
  list: SharedList
  listTypes: ListType[]
  itemDraft: string
  setItemDraft: (text: string) => void
  itemMetadataDraft: Record<string, unknown>
  setItemMetadataDraft: (meta: Record<string, unknown>) => void
  filter: string
  setFilter: (f: string) => void
  onCreateItem: (event: FormEvent<HTMLFormElement>, listId: string) => void
  onToggleItem: (item: ListItem) => void
  onUpdateItemMetadata: (item: ListItem, patch: { metadata?: unknown }) => void
  onRemoveItem: (id: string) => void
  onRemoveList: (id: string) => void
  onToggleListStar: (list: SharedList) => void
}) {
  const now = useMemo(() => new Date(), [list.items])
  const listTypeId = list.listType as ListTypeId
  const metadataFields = ITEM_METADATA_FIELDS[listTypeId]
  const [editingMeta, setEditingMeta] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})

  const itemsWithStatus = useMemo(() => {
    return list.items.map((item) => ({
      item,
      status: computeListStatus(item, listTypeId, now),
    }))
  }, [list.items, listTypeId, now])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return itemsWithStatus
    return itemsWithStatus.filter((entry) => entry.status === filter)
  }, [itemsWithStatus, filter])

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status]
      const pb = STATUS_PRIORITY[b.status]
      if (pa !== pb) return pa - pb
      return a.item.text.localeCompare(b.item.text)
    })
  }, [filteredItems])

  const statusCounts = useMemo(() => {
    const counts: Record<ListStatus, number> = { open: 0, done: 0, overdue: 0, due_soon: 0, missed: 0 }
    for (const entry of itemsWithStatus) {
      counts[entry.status]++
    }
    return counts
  }, [itemsWithStatus])

  const hasFilters = filter !== 'all'
  const emptyMessage = LIST_TYPE_EMPTY_MESSAGES[listTypeId] ?? 'Add items to this list.'
  const isRecurring = listTypeId === 'daily_checklist' || listTypeId === 'weekly_chore'

  function startEditMeta(item: ListItem) {
    setEditingMeta(item.id)
    setEditValues(item.metadata ?? {})
  }

  function cancelEditMeta() {
    setEditingMeta(null)
    setEditValues({})
  }

  function saveEditMeta(item: ListItem) {
    onUpdateItemMetadata(item, { metadata: editValues })
    setEditingMeta(null)
    setEditValues({})
  }

  return (
    <article className="panel list-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">{labelForListType(list.listType, listTypes)}{list.resetKey ? ` / ${list.resetKey}` : ''}{list.updatedByName ? ` / ${list.updatedByName}` : ''}</p>
          <h2>{Boolean(list.metadata?.starred) ? '★ ' : ''}{list.name}</h2>
        </div>
        <div className="button-row">
          <button type="button" className="ghost" onClick={() => void onToggleListStar(list)}>{Boolean(list.metadata?.starred) ? 'Unstar' : 'Star'}</button>
          <button type="button" className="ghost danger" onClick={() => void onRemoveList(list.id)}>Delete</button>
        </div>
      </div>

      <form className="inline-form" onSubmit={(event) => void onCreateItem(event, list.id)}>
        <input value={itemDraft} onChange={(event) => setItemDraft(event.target.value)} placeholder="Add item" />
        <button type="submit">Add</button>
      </form>

      {metadataFields && metadataFields.length > 0 && (
        <ItemMetadataForm
          fields={metadataFields}
          values={itemMetadataDraft}
          onChange={setItemMetadataDraft}
        />
      )}

      {isRecurring && (
        <p className="list-recurring-hint">
          {listTypeId === 'daily_checklist' ? 'Items reset each day. Missed items show a warning.' : 'Items reset each Monday. Missed items show a warning.'}
        </p>
      )}

      {itemsWithStatus.some((e) => e.status !== 'open' && e.status !== 'done') && (
        <div className="list-filter-row">
          <button type="button" className={!hasFilters ? 'ghost active' : 'ghost'} onClick={() => setFilter('all')}>All</button>
          {(Object.keys(statusCounts) as ListStatus[]).map((status) => (
            statusCounts[status] > 0 && status !== 'open' && status !== 'done' ? (
              <button
                key={status}
                type="button"
                className={filter === status ? 'ghost active' : 'ghost'}
                onClick={() => setFilter(filter === status ? 'all' : status)}
              >
                {STATUS_LABELS[status]} ({statusCounts[status]})
              </button>
            ) : null
          ))}
        </div>
      )}

      <div className="items">
        {sortedItems.length === 0 && (
          <div className="list-empty-state">{emptyMessage}</div>
        )}
        {sortedItems.map(({ item, status }) => {
          const meta = item.metadata ?? {}
          const dueDate = meta.dueDate ?? meta.targetDate
          const quantity = meta.quantity
          const category = meta.category
          return (
            <div key={item.id} className="item-row">
              <label className={item.done ? 'item done' : 'item'}>
                <input type="checkbox" checked={item.done} onChange={() => void onToggleItem(item)} />
                <span>
                  {quantity ? `${quantity} x ` : ''}
                  {item.text}
                  {status !== 'open' && status !== 'done' && (
                    <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>
                  )}
                  {typeof dueDate === 'string' && dueDate && (
                    <span className="metadata-chip">{dueDate}</span>
                  )}
                  {typeof category === 'string' && category && (
                    <span className="metadata-chip">{category}</span>
                  )}
                  {item.updatedByName ? ` / ${item.updatedByName}` : ''}
                </span>
                <button type="button" className="icon-button" aria-label={`Delete ${item.text}`} onClick={() => void onRemoveItem(item.id)}>x</button>
              </label>
              {metadataFields && metadataFields.length > 0 && !item.done && (
                <ItemMetadataDisplay
                  item={item}
                  fields={metadataFields}
                  isEditing={editingMeta === item.id}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  onStartEdit={() => startEditMeta(item)}
                  onCancelEdit={cancelEditMeta}
                  onSaveEdit={() => saveEditMeta(item)}
                />
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

function ItemMetadataForm({
  fields,
  values,
  onChange,
}: {
  fields: Array<{ key: string; label: string; type: 'text' | 'number' | 'date' }>
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}) {
  return (
    <div className="item-metadata-form">
      {fields.map((field) => (
        <label key={field.key} className="metadata-field">
          <span className="metadata-label">{field.label}</span>
          <input
            type={field.type}
            value={String(values[field.key] ?? '')}
            onChange={(e) => onChange({ ...values, [field.key]: e.target.value || undefined })}
            placeholder={field.label}
          />
        </label>
      ))}
    </div>
  )
}

function ItemMetadataDisplay({
  item,
  fields,
  isEditing,
  editValues,
  setEditValues,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  item: ListItem
  fields: Array<{ key: string; label: string; type: 'text' | 'number' | 'date' }>
  isEditing: boolean
  editValues: Record<string, unknown>
  setEditValues: (values: Record<string, unknown>) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
}) {
  const meta = item.metadata ?? {}

  if (isEditing) {
    return (
      <div className="item-metadata-edit">
        {fields.map((field) => (
          <label key={field.key} className="metadata-field">
            <span className="metadata-label">{field.label}</span>
            <input
              type={field.type}
              value={String(editValues[field.key] ?? '')}
              onChange={(e) => setEditValues({ ...editValues, [field.key]: e.target.value || undefined })}
              placeholder={field.label}
            />
          </label>
        ))}
        <div className="button-row">
          <button type="button" className="ghost" onClick={onCancelEdit}>Cancel</button>
          <button type="button" className="ghost" onClick={onSaveEdit}>Save</button>
        </div>
      </div>
    )
  }

  const hasValues = fields.some((f) => meta[f.key] != null && meta[f.key] !== '')
  if (!hasValues) {
    return (
      <div className="item-metadata-inline">
        <button type="button" className="ghost metadata-add" onClick={onStartEdit}>+ details</button>
      </div>
    )
  }

  return (
    <div className="item-metadata-inline">
      {fields.map((field) => {
        const val = meta[field.key]
        if (val == null || val === '') return null
        return (
          <span key={field.key} className="metadata-chip">
            {field.label}: {String(val)}
          </span>
        )
      })}
      <button type="button" className="ghost metadata-edit" onClick={onStartEdit}>edit</button>
    </div>
  )
}
