import type { Appearance, ActivityEntry, CacheEntry, HomeData, Module, PageLink, Settings, UserPatch, UserRecord } from '../../shared/api-types'
import type { FormEvent } from 'react'
import { isLocationConfigured } from '../../shared/location'
import { ActivitySection } from './sections/ActivitySection'
import { AppearanceSection } from './sections/AppearanceSection'
import { CacheSection } from './sections/CacheSection'
import { ModulesSection } from './sections/ModulesSection'
import { PageInventorySection } from './sections/PageInventorySection'
import { SettingsSection } from './sections/SettingsSection'
import { UsersSection } from './sections/UsersSection'

export function AdminPanel({
  settings,
  users,
  modules,
  pageLinks,
  customPages,
  pageManifestWarnings,
  cacheEntries,
  activityEntries,
  deployment,
  userDraft,
  onClose,
  onSettingsChange,
  onSaveSettings,
  onUseDeviceLocation,
  onAppearanceChange,
  onUserDraftChange,
  onCreateUser,
  onPatchUser,
  onPatchModule,
  onBatchPatchModules,
  onClearCache,
}: {
  settings: Settings
  users: UserRecord[]
  modules: Module[]
  pageLinks: PageLink[]
  customPages: PageLink[]
  pageManifestWarnings: Array<{ path: string; message: string }>
  cacheEntries: CacheEntry[]
  activityEntries: ActivityEntry[]
  deployment: HomeData['deployment'] | null
  userDraft: { username: string; displayName: string; role: string; password: string }
  onClose: () => void
  onSettingsChange: (settings: Settings) => void
  onSaveSettings: (event: FormEvent<HTMLFormElement>) => void
  onUseDeviceLocation: () => Promise<void>
  onAppearanceChange: (appearance: Appearance) => void
  onUserDraftChange: (draft: { username: string; displayName: string; role: string; password: string }) => void
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void
  onPatchUser: (user: UserRecord, patch: UserPatch) => void
  onPatchModule: (module: Module, patch: Partial<Module> & { deleteData?: boolean }) => void
  onBatchPatchModules: (patches: Array<{ id: string; position: number }>) => void
  onClearCache: (key?: string) => void
}) {
  const deploymentChecks = [
    { label: 'D1 binding', ok: true, detail: 'DB is reachable through the worker API.' },
    { label: 'Admin users', ok: users.some((user) => user.role === 'admin' && user.active), detail: 'At least one active admin account is required.' },
    { label: 'Location', ok: isLocationConfigured(settings), detail: 'Weather and tide modules stay neutral until valid coordinates and timezone are saved.' },
    { label: 'Custom pages', ok: pageManifestWarnings.length === 0, detail: pageManifestWarnings.length === 0 ? 'Manifest has no warnings.' : 'Resolve manifest warnings before deploy.' },
  ]

  return (
    <section className="workspace-grid admin-grid">
      <article className="panel span-2">
        <div className="panel-heading">
          <div>
            <p className="kicker">Admin</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>
      </article>

      <UsersSection
        users={users}
        userDraft={userDraft}
        onUserDraftChange={onUserDraftChange}
        onCreateUser={onCreateUser}
        onPatchUser={onPatchUser}
      />

      <ModulesSection
        modules={modules}
        onPatchModule={onPatchModule}
        onBatchPatchModules={onBatchPatchModules}
      />

      <AppearanceSection onAppearanceChange={onAppearanceChange} />

      <SettingsSection
        settings={settings}
        onSettingsChange={onSettingsChange}
        onSaveSettings={onSaveSettings}
        onUseDeviceLocation={onUseDeviceLocation}
      />

      <PageInventorySection
        pageLinks={pageLinks}
        customPages={customPages}
        pageManifestWarnings={pageManifestWarnings}
      />

      <CacheSection cacheEntries={cacheEntries} onClearCache={onClearCache} />

      <ActivitySection activityEntries={activityEntries} />

      <article className="panel">
        <p className="kicker">Site review</p>
        <h2>Review notes</h2>
        <div className="stack-list">
          <a className="plain-row" href="/docs/project-purpose.md"><strong>Project purpose</strong><span>Goals, scope, module direction, and hosting principles</span></a>
          <a className="plain-row" href="/docs/site-review.md"><strong>Current review</strong><span>Bugs, risks, and visual improvement ideas</span></a>
          <a className="plain-row" href="/docs/modular-hub-upgrade-plan.md"><strong>Plan progress</strong><span>Completed, partial, and deferred work</span></a>
        </div>
      </article>

      <article className="panel span-2">
        <p className="kicker">Deployment</p>
        <h2>{deployment?.host ?? 'Local app'}</h2>
        <div className="stat-grid">
          {deploymentChecks.map((check) => (
            <div className={check.ok ? 'check-card ok' : 'check-card warn'} key={check.label}>
              <strong>{check.ok ? 'OK' : 'Check'}</strong>
              <span>{check.label}</span>
              <small>{check.detail}</small>
            </div>
          ))}
        </div>
        <div className="stack-list">
          <a className="plain-row" href="/docs/cloudflare-hosting.md"><strong>Cloudflare hosting</strong><span>Pages, Functions, D1, and migrations</span></a>
          <a className="plain-row" href="/docs/router-hosting.md"><strong>Router hosting</strong><span>Static-only limits and local runtime options</span></a>
          <div className="plain-row"><strong>{deployment?.origin ?? 'No origin loaded'}</strong><span>{deployment?.note ?? 'Refresh the dashboard to load deployment details.'}</span></div>
        </div>
      </article>
    </section>
  )
}
