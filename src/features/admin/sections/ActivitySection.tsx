import { useState } from 'react'
import type { ActivityEntry } from '../../../shared/api-types'
import { formatDateTime } from '../../../shared/format'

export function ActivitySection({ activityEntries }: { activityEntries: ActivityEntry[] }) {
  const [activityFilter, setActivityFilter] = useState({ entityType: '', search: '' })
  const uniqueEntityTypes = [...new Set(activityEntries.map((e) => e.entityType))].sort()
  const filteredActivity = activityEntries.filter((entry) => {
    if (activityFilter.entityType && entry.entityType !== activityFilter.entityType) return false
    if (activityFilter.search && !entry.summary.toLowerCase().includes(activityFilter.search.toLowerCase())) return false
    return true
  })
  return (
    <article className="panel span-2">
      <div className="panel-heading">
        <div>
          <p className="kicker">Activity</p>
          <h2>Recent changes</h2>
        </div>
        {(activityFilter.entityType || activityFilter.search) && (
          <button type="button" className="ghost compact-link" onClick={() => setActivityFilter({ entityType: '', search: '' })}>Clear filter</button>
        )}
      </div>
      <div className="activity-filter">
        <select value={activityFilter.entityType} onChange={(event) => setActivityFilter((f) => ({ ...f, entityType: event.target.value }))}>
          <option value="">All types</option>
          {uniqueEntityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input value={activityFilter.search} onChange={(event) => setActivityFilter((f) => ({ ...f, search: event.target.value }))} placeholder="Filter by summary" />
      </div>
      <div className="activity-list">
        {filteredActivity.map((entry) => (
          <div className="activity-row" key={entry.id}>
            <div>
              <strong>{entry.summary}</strong>
              <span>{entry.actorName} / {formatDateTime(entry.createdAt)}</span>
            </div>
            <div className="activity-tags">
              <small>{entry.action}</small>
              <small>{entry.entityType}</small>
            </div>
          </div>
        ))}
        {filteredActivity.length === 0 && activityEntries.length === 0 && <p>No activity has been recorded yet.</p>}
        {filteredActivity.length === 0 && activityEntries.length > 0 && <p>No entries match the current filter.</p>}
      </div>
    </article>
  )
}
