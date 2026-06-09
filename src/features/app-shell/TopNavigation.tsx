import type { Dispatch, SetStateAction } from 'react'
import { formatFullDateTime, greetingForNow } from '../../shared/format'

export function TopNavigation({
  displayName,
  now,
  deploymentOrigin,
  adminUnlockLabel,
  adminUnlockRemainingMs,
  busy,
  activeTab,
  adminOpen,
  editMode,
  setEditMode,
  onRefresh,
  onOpenSettings,
  onOpenAdmin,
  onLogout,
}: {
  displayName: string
  now: number
  deploymentOrigin: string | null
  adminUnlockLabel: string | null
  adminUnlockRemainingMs: number
  busy: boolean
  activeTab: string
  adminOpen: boolean
  editMode: boolean
  setEditMode: Dispatch<SetStateAction<boolean>>
  onRefresh: () => void
  onOpenSettings: () => void
  onOpenAdmin: () => void
  onLogout: () => void
}) {
  const showEditHome = adminUnlockLabel && activeTab === 'home' && !adminOpen
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
        {showEditHome && (
          <button
            type="button"
            className={editMode ? 'ghost edit-mode-active' : 'ghost'}
            onClick={() => setEditMode((prev) => !prev)}
          >
            {editMode ? 'Done' : 'Edit home'}
          </button>
        )}
        <button type="button" onClick={onRefresh} disabled={busy}>Refresh</button>
        <button type="button" className="icon-settings" aria-label="Settings" title="Settings" onClick={onOpenSettings}>⚙️</button>
        <button type="button" className="icon-cog" aria-label="Admin settings" title="Admin settings" onClick={onOpenAdmin}>Admin</button>
        <button type="button" className="ghost" onClick={onLogout}>Logout</button>
      </div>
    </header>
  )
}
