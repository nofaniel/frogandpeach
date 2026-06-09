import type { CacheEntry } from '../../../shared/api-types'
import { formatDateTime } from '../../../shared/format'

export function CacheSection({
  cacheEntries,
  onClearCache,
}: {
  cacheEntries: CacheEntry[]
  onClearCache: (key?: string) => void
}) {
  return (
    <article className="panel span-2">
      <div className="panel-heading">
        <div>
          <p className="kicker">Cache and data</p>
          <h2>Cached API payloads</h2>
        </div>
        <button type="button" className="ghost danger" onClick={() => onClearCache()}>Clear all</button>
      </div>
      <div className="module-list">
        {cacheEntries.map((entry) => (
          <div className={entry.expired ? 'module-row' : 'module-row enabled'} key={entry.key}>
            <div>
              <strong>{entry.key}</strong>
              <span>{entry.payloadBytes} bytes / expires {formatDateTime(entry.expiresAt)}</span>
            </div>
            <small>{entry.expired ? 'Expired' : 'Active'}</small>
            <button type="button" className="ghost danger" onClick={() => onClearCache(entry.key)}>Clear</button>
          </div>
        ))}
        {cacheEntries.length === 0 && <p>No cache rows are currently stored.</p>}
      </div>
    </article>
  )
}
