import type { Dispatch, SetStateAction } from 'react'
import { formatFullDateTime, greetingForNow } from '../../shared/format'

export function TopNavigation({
  displayName,
  now,
  activeTab,
  adminOpen,
  editMode,
  setEditMode,
  onOpenSettings,
  onOpenAdmin,
  onLogout,
}: {
  displayName: string
  now: number
  activeTab: string
  adminOpen: boolean
  editMode: boolean
  setEditMode: Dispatch<SetStateAction<boolean>>
  onOpenSettings: () => void
  onOpenAdmin: () => void
  onLogout: () => void
}) {
  const showEditHome = activeTab === 'home' && !adminOpen
  return (
    <header className="top-strip">
      <div>
        <h1>{greetingForNow()}, {displayName} <span aria-hidden="true">🌿</span></h1>
        <p>{formatFullDateTime(now)}</p>
      </div>
      <div className="top-actions">
        {showEditHome && (
          <button
            type="button"
            className={editMode ? 'ghost edit-mode-active' : 'ghost'}
            onClick={() => setEditMode((prev) => !prev)}
          >
            {editMode ? 'Done' : 'Edit home'}
          </button>
        )}
        <button type="button" className="icon-settings" aria-label="Settings" title="Settings" onClick={onOpenSettings}>⚙️</button>
        <button type="button" className="icon-cog" aria-label="Admin settings" title="Admin settings" onClick={onOpenAdmin}>Admin</button>
        <button type="button" className="ghost" onClick={onLogout}>Logout</button>
      </div>
    </header>
  )
}
