import type { Module, SharedList, Tab } from '../../../shared/api-types'
import { formatDate } from '../../../shared/format'
import { getHomeListEntries, resolveHomeWidgetState } from '../../app-shell/homeWidgets'

export function ListsWidget({
  module,
  lists,
  onSetActiveTab,
}: {
  module: Module
  lists: SharedList[]
  onSetActiveTab: (tab: Tab) => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const orderedLists = getHomeListEntries(lists, widget.mode).slice(0, 4)

  return (
    <article id={module.id} className={'panel module-' + module.size}>
      <p className="kicker">Lists</p>
      <h2>{widget.mode === 'starred' ? 'Starred first' : 'Active lists'}</h2>
      <div className="stack-list">
        {orderedLists.map(({ list, starred, incompleteCount }) => (
          <button key={list.id} type="button" className="plain-row" onClick={() => onSetActiveTab('lists')}>
            <strong>{starred ? '? ' : ''}{list.name}</strong>
            <span>
              {widget.mode === 'starred'
                ? `${incompleteCount} open`
                : `${incompleteCount} open, updated ${formatDate(list.updatedAt)}`}
            </span>
          </button>
        ))}
        {orderedLists.length === 0 && <div className="plain-row"><strong>No active lists</strong><span>Create or update a list to surface it here.</span></div>}
      </div>
    </article>
  )
}
