import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { ListItem, ListType, SharedList } from '../../shared/api-types'
import { ITEM_METADATA_FIELDS, STATUS_LABELS, STATUS_PRIORITY, computeListStatus, type ListStatus, type ListTypeId } from '../../shared/lists'
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
  return (
    <section className="workspace-grid">
      <form className="panel form-panel" onSubmit={onCreateList}>
        <p className="kicker">Lists</p>
        <h2>New list</h2>
        <input value={listDraft.name} onChange={(event) => setListDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Big shop, chores, goals..." />
        <select value={listDraft.listType} onChange={(event) => setListDraft((draft) => ({ ...draft, listType: event.target.value }))}>
          {listTypes.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}
        </select>
        <button type="submit">Add list</button>
      </form>
      {lists.map((list) => (
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
        {sortedItems.map(({ item, status }) => (
          <div key={item.id} className="item-row">
            <label className={item.done ? 'item done' : 'item'}>
              <input type="checkbox" checked={item.done} onChange={() => void onToggleItem(item)} />
              <span>
                {item.text}
                {status !== 'open' && status !== 'done' && (
                  <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>
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
        ))}
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
