import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { ToastTray } from '../../components/ToastTray'
import type { Tab, Toast } from '../../shared/api-types'
import { isNavigationEntryActive, type NavigationEntry } from './navigation'
import { AdminUnlockModal } from './AdminUnlockModal'
import { SettingsPanel } from './SettingsPanel'
import { TopNavigation } from './TopNavigation'

export function AppShellLayout({
  displayName,
  now,
  adminUnlockLabel,
  adminUnlockRemainingMs,
  busy,
  onRefresh,
  onOpenSettings,
  onCloseSettings,
  onOpenAdmin,
  onLogout,
  navigationEntries,
  activeTab,
  adminOpen,
  settingsOpen,
  editMode,
  setEditMode,
  onNavigate,
  error,
  unlockOpen,
  unlockDraft,
  setUnlockDraft,
  onUnlockAdmin,
  onCancelUnlock,
  toasts,
  onDismissToast,
  children,
}: {
  displayName: string
  now: number
  adminUnlockLabel: string | null
  adminUnlockRemainingMs: number
  busy: boolean
  onRefresh: () => void
  onOpenSettings: () => void
  onCloseSettings: () => void
  onOpenAdmin: () => void
  onLogout: () => void
  navigationEntries: NavigationEntry[]
  activeTab: Tab
  adminOpen: boolean
  settingsOpen: boolean
  editMode: boolean
  setEditMode: Dispatch<SetStateAction<boolean>>
  onNavigate: (entry: NavigationEntry) => void
  error: string
  unlockOpen: boolean
  unlockDraft: { username: string; password: string }
  setUnlockDraft: Dispatch<SetStateAction<{ username: string; password: string }>>
  onUnlockAdmin: (event: FormEvent<HTMLFormElement>) => void
  onCancelUnlock: () => void
  toasts: Toast[]
  onDismissToast: (id: string) => void
  children: ReactNode
}) {
  return (
    <main className="app-shell">
      <TopNavigation
        displayName={displayName}
        now={now}
        adminUnlockLabel={adminUnlockLabel}
        adminUnlockRemainingMs={adminUnlockRemainingMs}
        busy={busy}
        activeTab={activeTab}
        adminOpen={adminOpen}
        editMode={editMode}
        setEditMode={setEditMode}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
        onOpenAdmin={onOpenAdmin}
        onLogout={onLogout}
      />
      <nav className="tab-bar" aria-label="Sections">
        {navigationEntries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={isNavigationEntryActive(entry, activeTab, adminOpen) ? 'active' : ''}
            onClick={() => onNavigate(entry)}
          >
            <span aria-hidden="true">{entry.icon}</span>
            <span>{entry.label}</span>
          </button>
        ))}
      </nav>
      {error && <section className="notice error">{error}</section>}
      {unlockOpen && (
        <AdminUnlockModal
          unlockDraft={unlockDraft}
          setUnlockDraft={setUnlockDraft}
          onUnlock={onUnlockAdmin}
          onCancel={onCancelUnlock}
        />
      )}
      {settingsOpen && <SettingsPanel onClose={onCloseSettings} />}
      {children}
      <ToastTray toasts={toasts} onDismiss={onDismissToast} />
    </main>
  )
}
