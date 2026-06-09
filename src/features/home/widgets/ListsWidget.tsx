import type { Module, SharedList, Tab } from '../../../shared/api-types'
import { computeListStatus, type ListTypeId } from '../../../shared/lists'
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
      <h2>{widget.mode === 'starred' ? 'Starred' : 'Active lists'}</h2>
      <div className="stack-list">
        {orderedLists.map(({ list, starred, incompleteCount }) => {
          const listType = list.listType as ListTypeId
          const overdueCount = list.items.filter((item) => !item.done && computeListStatus(item, listType) === 'overdue').length
          const dueSoonCount = list.items.filter((item) => !item.done && computeListStatus(item, listType) === 'due_soon').length
          const missedCount = list.items.filter((item) => !item.done && computeListStatus(item, listType) === 'missed').length
          const totalCount = list.items.length
          return (
            <button key={list.id} type="button" className="plain-row" onClick={() => onSetActiveTab('lists')}>
              {starred && <span aria-label="Starred" className="star-marker" aria-hidden="true">★ </span>}
              <strong>{list.name}</strong>
              <span>
                {widget.mode === 'starred'
                  ? `${incompleteCount} open`
                  : list.listType === 'shopping'
                    ? `${totalCount} items, updated ${formatDate(list.updatedAt)}`
                    : `${incompleteCount} open, updated ${formatDate(list.updatedAt)}`}
                {overdueCount > 0 && <span className="home-status-overdue"> {overdueCount} overdue</span>}
                {dueSoonCount > 0 && <span className="home-status-due-soon"> {dueSoonCount} due soon</span>}
                {missedCount > 0 && <span className="home-status-missed"> {missedCount} missed</span>}
              </span>
            </button>
          )
        })}
        {orderedLists.length === 0 && <div className="plain-row"><strong>No active lists</strong><span>Create or update a list to surface it here.</span></div>}
      </div>
    </article>
  )
}
