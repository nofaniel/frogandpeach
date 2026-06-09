import { formatFullDateTime, greetingForNow } from '../../shared/format'

export function TopNavigation({
  displayName,
  now,
  deploymentOrigin,
  adminUnlockLabel,
  adminUnlockRemainingMs,
  busy,
  onRefresh,
  onOpenAdmin,
  onLogout,
}: {
  displayName: string
  now: number
  deploymentOrigin: string | null
  adminUnlockLabel: string | null
  adminUnlockRemainingMs: number
  busy: boolean
  onRefresh: () => void
  onOpenAdmin: () => void
  onLogout: () => void
}) {
  return (
    <header className="top-strip">
      <div>
        <h1>{greetingForNow()}, {displayName} <span aria-hidden="true">🌿</span></h1>
        <p>{formatFullDateTime(now)}</p>
      </div>
      <div className="top-actions">
        {deploymentOrigin && (
          <a className="origin-link" href={deploymentOrigin} target="_blank" rel="noreferrer">
            {deploymentOrigin}
          </a>
        )}
        {adminUnlockLabel && (
          <span className={adminUnlockRemainingMs <= 120000 ? 'unlock-status warning' : 'unlock-status'}>
            {adminUnlockLabel}
          </span>
        )}
        <button type="button" onClick={onRefresh} disabled={busy}>Refresh</button>
        <button type="button" className="icon-cog" aria-label="Admin settings" title="Admin settings" onClick={onOpenAdmin}>Admin</button>
        <button type="button" className="ghost" onClick={onLogout}>Logout</button>
      </div>
    </header>
  )
}
