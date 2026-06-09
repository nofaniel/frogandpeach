import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ListItem, ListType, SharedList } from '../../shared/api-types'
import { labelForListType } from '../../shared/format'

export function ListsWorkspace({
  lists,
  listTypes,
  listDraft,
  setListDraft,
  itemDrafts,
  setItemDrafts,
  onCreateList,
  onCreateItem,
  onToggleItem,
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
  onCreateList: (event: FormEvent<HTMLFormElement>) => void
  onCreateItem: (event: FormEvent<HTMLFormElement>, listId: string) => void
  onToggleItem: (item: ListItem) => void
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
        <article className="panel list-panel" key={list.id}>
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
            <input value={itemDrafts[list.id] ?? ''} onChange={(event) => setItemDrafts((drafts) => ({ ...drafts, [list.id]: event.target.value }))} placeholder="Add item" />
            <button type="submit">Add</button>
          </form>
          <div className="items">
            {list.items.map((item) => (
              <label key={item.id} className={item.done ? 'item done' : 'item'}>
                <input type="checkbox" checked={item.done} onChange={() => void onToggleItem(item)} />
                <span>{item.text}{item.updatedByName ? ` / ${item.updatedByName}` : ''}</span>
                <button type="button" className="icon-button" aria-label={`Delete ${item.text}`} onClick={() => void onRemoveItem(item.id)}>x</button>
              </label>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}
