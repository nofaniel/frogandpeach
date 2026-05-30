import DOMPurify from 'dompurify'
import { marked } from 'marked'
import QRCode from 'qrcode'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTheme } from './theme/ThemeProvider'

type Tab = 'home' | 'lists' | 'notes' | 'pages' | 'network'

type Module = {
  id: string
  title: string
  description: string
  category: string
  installed: boolean
  enabled: boolean
  position: number
  size: 'small' | 'medium' | 'wide' | 'full'
  options: Record<string, unknown>
}

type ListType = {
  id: string
  title: string
  description: string
  reset: string
}

type Note = {
  id: string
  title: string
  body: string
  tags: string
  noteType: string
  pinned: boolean
  createdByName: string | null
  updatedByName: string | null
  updatedAt: string
}

type ListItem = {
  id: string
  text: string
  done: boolean
  completedAt: string | null
  createdByName: string | null
  updatedByName: string | null
}

type SharedList = {
  id: string
  name: string
  listType: string
  resetKey: string
  createdByName: string | null
  updatedByName: string | null
  updatedAt: string
  items: ListItem[]
}

type Page = {
  id: string
  slug: string
  title: string
  body: string
  theme: string
  occasion: string
  emoji: string
  updatedAt: string
}

type PageLink = {
  id: string
  title: string
  href: string
  description: string
  kind: string
}

type CacheEntry = {
  key: string
  expiresAt: string
  updatedAt: string
  payloadBytes: number
  expired: boolean
}

type PageManifestReport = {
  pages: PageLink[]
  warnings: Array<{ path: string; message: string }>
}

type ActivityEntry = {
  id: string
  actorUserId: string | null
  actorName: string
  action: string
  entityType: string
  entityId: string
  summary: string
  metadata: Record<string, unknown>
  createdAt: string
}

type Settings = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  wifiUsagePeriod: string
  wifiUsageMonthlyGb: string
  wifiUsageUpdatedAt: string
  wifiDevicesJson: string
  binDay: string
  flatNotes: string
  locationName: string
  locationRegion: string
  latitude: string
  longitude: string
  timezone: string
  themeId: string
}

type Appearance = Pick<Settings, 'themeId'>

type WeatherSummary = {
  location: string
  current: {
    temperature: number | null
    feelsLike: number | null
    windSpeed: number | null
    windGusts: number | null
    precipitation: number | null
    label: string
    time: string | null
  }
  daily: Array<{
    date: string
    label: string
    max: number | null
    min: number | null
    precipitationChance: number | null
  }>
}

type TideSummary = {
  events: Array<{
    id: string
    type: 'high' | 'low'
    time: string
    height: number | null
  }>
  note: string
}

type HomeData = {
  weather: WeatherSummary | null
  tides: TideSummary | null
  notes: Note[]
  lists: SharedList[]
  pages: PageLink[]
  settings: Partial<Settings>
  modules: Module[]
  appearance: Appearance
  listTypes: ListType[]
  deployment: {
    origin: string
    host: string
    mode: string
    ready: boolean
    note: string
  }
}

type NetworkDevice = {
  id: string
  name: string
  type: string
  ip: string
  mac: string
  connection: string
  status: string
  lastSeen: string
  usageGb: number | null
}

type NetworkOverview = {
  wifiName: string
  wifiPassword: string
  wifiSecurity: string
  routerUrl: string
  adminUrl: string
  usage: {
    period: string
    monthlyGb: number | null
    updatedAt: string | null
  }
  devices: NetworkDevice[]
}

type Session = {
  authenticated: boolean
  userId: string | null
  userName: string | null
  displayName: string | null
  role: 'admin' | 'member' | null
  adminUnlocked: boolean
  adminUnlockedUntil: string | null
}

type UserRecord = {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'member'
  active: boolean
}

type Toast = {
  id: string
  message: string
  kind: 'info' | 'warn'
}

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'lists', label: 'Lists', icon: '🛒' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'pages', label: 'Pages', icon: '🌺' },
  { id: 'network', label: 'Network', icon: '📡' },
]

const emptySettings: Settings = {
  wifiName: '',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  routerUrl: '',
  adminUrl: '',
  wifiUsagePeriod: '',
  wifiUsageMonthlyGb: '',
  wifiUsageUpdatedAt: '',
  wifiDevicesJson: '[]',
  binDay: '',
  flatNotes: '',
  locationName: 'Newquay',
  locationRegion: 'Cornwall',
  latitude: '50.4155',
  longitude: '-5.0737',
  timezone: 'Europe/London',
  themeId: 'base',
}

function App() {
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [adminOpen, setAdminOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [home, setHome] = useState<HomeData | null>(null)
  const [network, setNetwork] = useState<NetworkOverview | null>(null)
  const [lists, setLists] = useState<SharedList[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [pageLinks, setPageLinks] = useState<PageLink[]>([])
  const [viewedPage, setViewedPage] = useState<Page | null>(null)
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([])
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [customPages, setCustomPages] = useState<PageLink[]>([])
  const [pageManifestWarnings, setPageManifestWarnings] = useState<Array<{ path: string; message: string }>>([])
  const { setTheme } = useTheme()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastSeqRef = useRef(0)
  const warnedNearExpiryRef = useRef(false)

  const [loginDraft, setLoginDraft] = useState({ username: 'admin', password: '', displayName: '' })
  const [unlockDraft, setUnlockDraft] = useState({ username: 'admin', password: '' })
  const [userDraft, setUserDraft] = useState({ username: '', displayName: '', role: 'member', password: '' })
  const [listDraft, setListDraft] = useState({ name: '', listType: 'shopping' })
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '', tags: '' })
  const [pageDraft, setPageDraft] = useState({ title: '', slug: '', body: '', theme: 'shell', occasion: '', emoji: '' })
  const [linkDraft, setLinkDraft] = useState({ title: '', href: 'index.html', description: '', kind: 'static' })

  useEffect(() => {
    void boot()
  }, [])

  useEffect(() => {
    if (!session?.adminUnlockedUntil) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session?.adminUnlockedUntil])

  useEffect(() => {
    if (!session?.adminUnlocked || !session.adminUnlockedUntil) return
    const expiresAt = Date.parse(session.adminUnlockedUntil)
    if (!Number.isFinite(expiresAt) || expiresAt > now) return
    setSession((current) => (current ? { ...current, adminUnlocked: false, adminUnlockedUntil: null } : current))
    setAdminOpen(false)
    addToast('Admin session expired', 'warn')
  }, [now, session?.adminUnlocked, session?.adminUnlockedUntil])

  useEffect(() => {
    if (!session?.adminUnlocked || !session.adminUnlockedUntil) {
      warnedNearExpiryRef.current = false
      return
    }
    const expiresAt = Date.parse(session.adminUnlockedUntil)
    if (!Number.isFinite(expiresAt)) return
    const remainingMs = Math.max(0, expiresAt - now)
    if (remainingMs > 120000) {
      warnedNearExpiryRef.current = false
    } else if (remainingMs > 0 && !warnedNearExpiryRef.current) {
      warnedNearExpiryRef.current = true
      addToast('Admin unlock expires in 2 minutes', 'warn')
    }
  }, [now, session?.adminUnlocked, session?.adminUnlockedUntil])

  async function boot() {
    setError('')
    try {
      const setup = await api<{ needsSetup: boolean }>('/api/setup/status', {}, false)
      setSetupNeeded(setup.needsSetup)
      const current = await api<Session>('/api/auth/me', {}, false)
      setSession(current)
      if (current.authenticated) await refreshAll()
    } catch (caught) {
      setSession({ authenticated: false, userId: null, userName: null, displayName: null, role: null, adminUnlocked: false, adminUnlockedUntil: null })
      setError(caught instanceof Error ? caught.message : 'Unable to reach API. Run `npm run dev:worker` for full local development.')
    }
  }

  async function refreshAll() {
    setBusy(true)
    setError('')
    try {
      const [homeData, listData, noteData, pageData, linkData, appearanceData, networkData] = await Promise.all([
        api<HomeData>('/api/home'),
        api<SharedList[]>('/api/lists'),
        api<Note[]>('/api/notes'),
        api<Page[]>('/api/pages'),
        api<PageLink[]>('/api/page-links'),
        api<Appearance>('/api/appearance'),
        api<NetworkOverview>('/api/network'),
      ])
      setHome(homeData)
      setLists(listData)
      setNotes(noteData)
      setPages(pageData)
      setPageLinks(linkData)
      setModules(homeData.modules)
      setSettings((current) => ({ ...current, ...homeData.settings, ...appearanceData }))
      setNetwork(networkData)
      void setTheme(appearanceData.themeId)
      if (window.location.pathname.startsWith('/page/')) {
        const slug = window.location.pathname.replace(/^\/page\//, '')
        setViewedPage(await api<Page>(`/api/pages/${slug}`))
      } else {
        setViewedPage(null)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function refreshAdmin() {
    const [settingsData, usersData, modulesData, cacheData, manifestData, activityData] = await Promise.all([
      api<Settings>('/api/settings'),
      api<UserRecord[]>('/api/users'),
      api<Module[]>('/api/modules'),
      api<CacheEntry[]>('/api/cache'),
      api<PageManifestReport>('/api/page-manifest-report'),
      api<ActivityEntry[]>('/api/activity'),
    ])
    setSettings(settingsData)
    setUsers(usersData)
    setModules(modulesData)
    setCacheEntries(cacheData)
    setCustomPages(manifestData.pages)
    setPageManifestWarnings(manifestData.warnings)
    setActivityEntries(activityData)
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const path = setupNeeded ? '/api/setup/admin' : '/api/auth/login'
      const next = await api<Session>(path, { method: 'POST', body: loginDraft }, false)
      setSession(next)
      setSetupNeeded(false)
      await refreshAll()
      if (next.adminUnlocked) {
        setAdminOpen(true)
        await refreshAdmin()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed')
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }, false)
    setSession({ authenticated: false, userId: null, userName: null, displayName: null, role: null, adminUnlocked: false, adminUnlockedUntil: null })
    setHome(null)
    setAdminOpen(false)
  }

  async function openAdmin() {
    if (!session?.adminUnlocked) {
      setUnlockDraft((draft) => ({ ...draft, username: session?.userName ?? 'admin' }))
      setUnlockOpen(true)
      return
    }
    setAdminOpen(true)
    await refreshAdmin()
  }

  async function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      const unlocked = await api<{ adminUnlocked: boolean; unlockedUntil: string }>('/api/admin/unlock', { method: 'POST', body: unlockDraft })
      setSession((current) => (current ? { ...current, adminUnlocked: unlocked.adminUnlocked, adminUnlockedUntil: unlocked.unlockedUntil } : current))
      setUnlockDraft((draft) => ({ ...draft, password: '' }))
      setUnlockOpen(false)
      setAdminOpen(true)
      await refreshAdmin()
    })
  }

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!listDraft.name.trim()) return
    await run(async () => {
      await api('/api/lists', { method: 'POST', body: listDraft })
      setListDraft({ name: '', listType: listDraft.listType })
      await refreshAll()
    })
  }

  async function createItem(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault()
    const text = itemDrafts[listId]?.trim()
    if (!text) return
    await run(async () => {
      await api(`/api/lists/${listId}/items`, { method: 'POST', body: { text } })
      setItemDrafts((drafts) => ({ ...drafts, [listId]: '' }))
      await refreshAll()
    })
  }

  async function toggleItem(item: ListItem) {
    await run(async () => {
      await api(`/api/items/${item.id}`, { method: 'PATCH', body: { done: !item.done } })
      await refreshAll()
    })
  }

  async function removeItem(id: string) {
    await run(async () => {
      await api(`/api/items/${id}`, { method: 'DELETE' })
      await refreshAll()
    })
  }

  async function removeList(id: string) {
    await run(async () => {
      await api(`/api/lists/${id}`, { method: 'DELETE' })
      await refreshAll()
    })
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) return
    await run(async () => {
      await api('/api/notes', { method: 'POST', body: noteDraft })
      setNoteDraft({ title: '', body: '', tags: '' })
      await refreshAll()
    })
  }

  async function toggleNote(note: Note) {
    await run(async () => {
      await api(`/api/notes/${note.id}`, { method: 'PATCH', body: { pinned: !note.pinned } })
      await refreshAll()
    })
  }

  async function removeNote(id: string) {
    await run(async () => {
      await api(`/api/notes/${id}`, { method: 'DELETE' })
      await refreshAll()
    })
  }

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pageDraft.title.trim() && !pageDraft.body.trim()) return
    await run(async () => {
      await api('/api/pages', { method: 'POST', body: pageDraft })
      setPageDraft({ title: '', slug: '', body: '', theme: 'shell', occasion: '', emoji: '' })
      await refreshAll()
    })
  }

  async function removePage(id: string) {
    await run(async () => {
      await api(`/api/pages/${id}`, { method: 'DELETE' })
      await refreshAll()
    })
  }

  async function createPageLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!linkDraft.title.trim() || !linkDraft.href.trim()) return
    await run(async () => {
      await api('/api/page-links', { method: 'POST', body: linkDraft })
      setLinkDraft({ title: '', href: '', description: '', kind: 'static' })
      await refreshAll()
    })
  }

  async function removePageLink(id: string) {
    await run(async () => {
      await api(`/api/page-links/${id}`, { method: 'DELETE' })
      await refreshAll()
    })
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      const updated = await api<Settings>('/api/settings', { method: 'PUT', body: settings })
      setSettings(updated)
      await refreshAll()
    })
  }

  async function saveAppearance(next: Appearance) {
    await run(async () => {
      void setTheme(next.themeId)
      const updated = await api<Appearance>('/api/appearance', { method: 'PUT', body: next })
      setSettings((current) => ({ ...current, ...updated }))
      void setTheme(updated.themeId)
    })
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      await api('/api/users', { method: 'POST', body: userDraft })
      setUserDraft({ username: '', displayName: '', role: 'member', password: '' })
      await refreshAdmin()
    })
  }

  async function patchUser(user: UserRecord, patch: Partial<UserRecord>) {
    await run(async () => {
      await api(`/api/users/${user.id}`, { method: 'PATCH', body: patch })
      await refreshAdmin()
    })
  }

  async function patchModule(module: Module, patch: Partial<Module> & { deleteData?: boolean }) {
    await run(async () => {
      await api('/api/modules', { method: 'PATCH', body: [{ id: module.id, ...patch }] })
      await refreshAdmin()
      await refreshAll()
    })
  }

  async function clearCache(key?: string) {
    await run(async () => {
      const next = await api<CacheEntry[]>(key ? `/api/cache/${encodeURIComponent(key)}` : '/api/cache', { method: 'DELETE' })
      setCacheEntries(next)
    })
  }

  function addToast(message: string, kind: Toast['kind'] = 'info') {
    const id = String(++toastSeqRef.current)
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 5000)
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((t) => t.id !== id))
  }

  async function run(fn: () => Promise<void>) {
    try {
      await fn()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Something went wrong', 'warn')
    }
  }

  const dashboardModules = useMemo(() => modules.filter((module) => module.installed && module.enabled), [modules])
  const listTypes = home?.listTypes ?? []
  const adminUnlockExpiresAt = session?.adminUnlockedUntil ? Date.parse(session.adminUnlockedUntil) : NaN
  const adminUnlockRemainingMs = Number.isFinite(adminUnlockExpiresAt) ? Math.max(0, adminUnlockExpiresAt - now) : 0
  const adminUnlockLabel = session?.adminUnlockedUntil ? `Admin ${formatDuration(adminUnlockRemainingMs)} left` : null
  const displayName = session?.displayName || session?.userName || 'there'

  if (session === null) {
    return <main className="loading-screen">Opening Frog & Peach...</main>
  }

  if (!session.authenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="kicker">{setupNeeded ? 'First run setup' : 'Private home hub'}</p>
          <h1>Frog & Peach</h1>
          <p>{setupNeeded ? 'Create the first administrator account. After this, household members can sign in with their own accounts.' : 'Sign in with your household account.'}</p>
          <form onSubmit={login}>
            <label>
              Username
              <input value={loginDraft.username} onChange={(event) => setLoginDraft((draft) => ({ ...draft, username: event.target.value }))} autoComplete="username" />
            </label>
            {setupNeeded && (
              <label>
                Display name
                <input value={loginDraft.displayName} onChange={(event) => setLoginDraft((draft) => ({ ...draft, displayName: event.target.value }))} autoComplete="name" />
              </label>
            )}
            <label>
              Password
              <input value={loginDraft.password} onChange={(event) => setLoginDraft((draft) => ({ ...draft, password: event.target.value }))} type="password" autoComplete={setupNeeded ? 'new-password' : 'current-password'} />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button type="submit">{setupNeeded ? 'Create admin' : 'Sign in'}</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="top-strip">
        <div>
          <h1>{greetingForNow()}, {displayName} <span aria-hidden="true">🌿</span></h1>
          <p>{formatFullDateTime(now)}</p>
        </div>
        <div className="top-actions">
          {home?.deployment.origin && (
            <a className="origin-link" href={home.deployment.origin} target="_blank" rel="noreferrer">
              {home.deployment.origin}
            </a>
          )}
          {adminUnlockLabel && (
            <span className={adminUnlockRemainingMs <= 120000 ? 'unlock-status warning' : 'unlock-status'}>
              {adminUnlockLabel}
            </span>
          )}
          <button type="button" onClick={refreshAll} disabled={busy}>Refresh</button>
          <button type="button" className="icon-cog" aria-label="Admin settings" title="Admin settings" onClick={openAdmin}>Admin</button>
          <button type="button" className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Sections">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {error && <section className="notice error">{error}</section>}

      {unlockOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="panel modal-panel" onSubmit={unlockAdmin}>
            <p className="kicker">Admin unlock</p>
            <h2>Confirm admin credentials</h2>
            <label>Admin username<input value={unlockDraft.username} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, username: event.target.value }))} autoComplete="username" /></label>
            <label>Password<input type="password" value={unlockDraft.password} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, password: event.target.value }))} autoComplete="current-password" autoFocus /></label>
            <div className="button-row">
              <button type="submit">Unlock</button>
              <button type="button" className="ghost" onClick={() => setUnlockOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {viewedPage && (
        <section className={`standalone-page ${viewedPage.theme}`}>
          <a className="button-link" href="/">Back</a>
          <p className="kicker">{viewedPage.emoji} {viewedPage.occasion || 'Editable page'}</p>
          <h1>{viewedPage.title}</h1>
          <Markdown body={viewedPage.body} />
        </section>
      )}

      {!viewedPage && adminOpen && (
        <AdminPanel
          settings={settings}
          users={users}
          modules={modules}
          pageLinks={pageLinks}
          customPages={customPages}
          pageManifestWarnings={pageManifestWarnings}
          cacheEntries={cacheEntries}
          activityEntries={activityEntries}
          deployment={home?.deployment ?? null}
          userDraft={userDraft}
          onClose={() => setAdminOpen(false)}
          onSettingsChange={setSettings}
          onSaveSettings={saveSettings}
          onAppearanceChange={saveAppearance}
          onUserDraftChange={setUserDraft}
          onCreateUser={createUser}
          onPatchUser={patchUser}
          onPatchModule={patchModule}
          onClearCache={clearCache}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'home' && home && (
        <section className="dashboard-grid home-dashboard">
          {dashboardModules
            .filter((module) => module.id === 'weather' || module.id === 'tides')
            .map((module) => renderModule(module, home, setActiveTab))}
        </section>
      )}

      {!viewedPage && !adminOpen && activeTab === 'home' && !home && (
        <section className="panel empty-state">
          <p className="kicker">Home</p>
          <h2>{busy ? 'Loading dashboard...' : 'Dashboard unavailable'}</h2>
          <p>{error || 'Use Refresh to load the dashboard again.'}</p>
        </section>
      )}

      {!viewedPage && !adminOpen && activeTab === 'lists' && (
        <section className="workspace-grid">
          <form className="panel form-panel" onSubmit={createList}>
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
                  <h2>{list.name}</h2>
                </div>
                <button type="button" className="ghost danger" onClick={() => removeList(list.id)}>Delete</button>
              </div>
              <form className="inline-form" onSubmit={(event) => createItem(event, list.id)}>
                <input value={itemDrafts[list.id] ?? ''} onChange={(event) => setItemDrafts((drafts) => ({ ...drafts, [list.id]: event.target.value }))} placeholder="Add item" />
                <button type="submit">Add</button>
              </form>
              <div className="items">
                {list.items.map((item) => (
                  <label key={item.id} className={item.done ? 'item done' : 'item'}>
                    <input type="checkbox" checked={item.done} onChange={() => toggleItem(item)} />
                    <span>{item.text}{item.updatedByName ? ` / ${item.updatedByName}` : ''}</span>
                    <button type="button" className="icon-button" aria-label={`Delete ${item.text}`} onClick={() => removeItem(item.id)}>x</button>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {!viewedPage && !adminOpen && activeTab === 'notes' && (
        <section className="workspace-grid">
          <form className="panel form-panel" onSubmit={createNote}>
            <p className="kicker">Notes</p>
            <h2>Capture</h2>
            <input value={noteDraft.title} onChange={(event) => setNoteDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
            <textarea value={noteDraft.body} onChange={(event) => setNoteDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Markdown note" />
            <input value={noteDraft.tags} onChange={(event) => setNoteDraft((draft) => ({ ...draft, tags: event.target.value }))} placeholder="Tags, comma separated" />
            <button type="submit">Save note</button>
          </form>
          {notes.map((note) => (
            <article className="panel note-panel" key={note.id}>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{note.pinned ? 'Pinned' : formatDate(note.updatedAt)} / {note.noteType}{note.updatedByName ? ` / ${note.updatedByName}` : ''}</p>
                  <h2>{note.title}</h2>
                </div>
                <button type="button" className="ghost" onClick={() => toggleNote(note)}>{note.pinned ? 'Unpin' : 'Pin'}</button>
              </div>
              <Markdown body={note.body} />
              {note.tags && <p className="tag-line">{note.tags}</p>}
              <button type="button" className="ghost danger" onClick={() => removeNote(note.id)}>Delete</button>
            </article>
          ))}
        </section>
      )}

      {!viewedPage && !adminOpen && activeTab === 'pages' && (
        <section className="workspace-grid">
          <form className="panel form-panel" onSubmit={createPage}>
            <p className="kicker">Editable page</p>
            <h2>New markdown page</h2>
            <input value={pageDraft.title} onChange={(event) => setPageDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
            <input value={pageDraft.slug} onChange={(event) => setPageDraft((draft) => ({ ...draft, slug: event.target.value }))} placeholder="custom-slug" />
            <div className="two-col">
              <select value={pageDraft.theme} onChange={(event) => setPageDraft((draft) => ({ ...draft, theme: event.target.value }))}>
                <option value="shell">Shell</option>
                <option value="peach">Peach</option>
                <option value="moon">Moon</option>
                <option value="fern">Fern</option>
                <option value="botanical">Botanical</option>
              </select>
              <input value={pageDraft.emoji} onChange={(event) => setPageDraft((draft) => ({ ...draft, emoji: event.target.value }))} placeholder="Icon" />
            </div>
            <input value={pageDraft.occasion} onChange={(event) => setPageDraft((draft) => ({ ...draft, occasion: event.target.value }))} placeholder="Occasion or short description" />
            <textarea value={pageDraft.body} onChange={(event) => setPageDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Markdown body" />
            <button type="submit">Create page</button>
          </form>

          <form className="panel form-panel" onSubmit={createPageLink}>
            <p className="kicker">Custom launcher</p>
            <h2>Link a page file</h2>
            <input value={linkDraft.title} onChange={(event) => setLinkDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="House rules" />
            <input value={linkDraft.href} onChange={(event) => setLinkDraft((draft) => ({ ...draft, href: event.target.value }))} placeholder="house-rules/index.html" />
            <input value={linkDraft.description} onChange={(event) => setLinkDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description" />
            <button type="submit">Add launcher</button>
          </form>

          {pages.map((page) => (
            <article className={`panel page-panel ${page.theme}`} key={page.id}>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{page.emoji} /page/{page.slug}</p>
                  <h2>{page.title}</h2>
                </div>
                <a className="button-link" href={`/page/${page.slug}`}>Open</a>
              </div>
              <Markdown body={page.body} />
              <button type="button" className="ghost danger" onClick={() => removePage(page.id)}>Delete</button>
            </article>
          ))}

          {pageLinks.map((link) => (
            <article className="panel page-panel" key={`${link.kind}-${link.id}`}>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{link.kind}</p>
                  <h2>{link.title}</h2>
                </div>
                <a className="button-link" href={link.href}>Open</a>
              </div>
              <p>{link.description}</p>
              {link.kind !== 'editable' && link.kind !== 'custom' && <button type="button" className="ghost danger" onClick={() => removePageLink(link.id)}>Delete launcher</button>}
            </article>
          ))}
        </section>
      )}

      {!viewedPage && !adminOpen && activeTab === 'network' && (
        <NetworkWorkspace
          network={network}
          deployment={home?.deployment ?? null}
        />
      )}
      <ToastTray toasts={toasts} onDismiss={dismissToast} />
    </main>
  )
}

function renderModule(module: Module, home: HomeData, setActiveTab: (tab: Tab) => void, settings?: Settings) {
  const className = `panel module-${module.size}`
  if (module.id === 'weather') {
    return (
      <article className={`${className} weather-panel`} key={module.id}>
        <div className="weather-orb" aria-hidden="true" />
        <div className="weather-place">{(home.weather?.location ?? 'Newquay, Cornwall').toUpperCase()}</div>
        <div className="weather-current">
          <div className="weather-icon" aria-hidden="true">{weatherIcon(home.weather?.current.label)}</div>
          <div>
            <strong className="big-number">{formatTemperature(home.weather?.current.temperature)}</strong>
            <p>{home.weather?.current.label ?? 'Weather unavailable'}</p>
          </div>
        </div>
        <div className="metric-row">
          {home.weather?.daily[0] && <span>↑ {formatTemperature(home.weather.daily[0].max)} ↓ {formatTemperature(home.weather.daily[0].min)}</span>}
          <span>💨 {formatNumber(home.weather?.current.windSpeed)} mph</span>
          <span>💧 {formatNumber(home.weather?.daily[0]?.precipitationChance)}%</span>
          <span>☂️ {formatNumber(home.weather?.current.precipitation)}% rain</span>
          <span>Feels {formatTemperature(home.weather?.current.feelsLike)}</span>
        </div>
      </article>
    )
  }
  if (module.id === 'tides') {
    const tideLocation = settings?.locationName?.trim() || home.settings.locationName || 'Local coast'
    return (
      <article className={`${className} tide-panel`} key={module.id}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Tides · Predicted</p>
            <h2>{tideLocation}</h2>
          </div>
          <span className="tide-mark" aria-hidden="true">🌊</span>
        </div>
        <div className="tide-track">
          {(home.tides?.events ?? []).slice(0, 4).map((event) => (
            <div key={event.id} className={`tide-card ${event.type}`}>
              <span>{event.type === 'high' ? '▲ High' : '▼ Low'}</span>
              <em>{formatDayDate(event.time)}</em>
              <strong>{formatTime(event.time)}</strong>
              <small>{event.height === null ? 'No height' : `${event.height} m`}</small>
            </div>
          ))}
        </div>
        <p className="tide-source-note">
          {home.tides?.note ?? 'Model-based estimate only. Not for navigation.'}{' '}
          <a href="https://www.cornwalls.co.uk/weather/tide_times.htm" target="_blank" rel="noreferrer">
            Cornwall tide times reference
          </a>
        </p>
      </article>
    )
  }
  if (module.id === 'lists') {
    return (
      <article className={className} key={module.id}>
        <p className="kicker">Lists</p>
        <h2>Active</h2>
        <div className="stack-list">
          {home.lists.map((list) => (
            <button key={list.id} type="button" className="plain-row" onClick={() => setActiveTab('lists')}>
              <strong>{list.name}</strong>
              <span>{list.items.filter((item) => !item.done).length} left</span>
            </button>
          ))}
        </div>
      </article>
    )
  }
  if (module.id === 'notes') {
    return (
      <article className={className} key={module.id}>
        <p className="kicker">Notes</p>
        <h2>Pinned & recent</h2>
        <div className="stack-list">
          {home.notes.map((note) => (
            <button key={note.id} type="button" className="plain-row" onClick={() => setActiveTab('notes')}>
              <strong>{note.pinned ? 'Pinned: ' : ''}{note.title}</strong>
              <span>{note.tags || firstLine(note.body) || 'No detail yet'}</span>
            </button>
          ))}
        </div>
      </article>
    )
  }
  if (module.id === 'pages') {
    return (
      <article className={className} key={module.id}>
        <p className="kicker">Pages</p>
        <h2>Custom launchpad</h2>
        <div className="page-chip-row">
          {home.pages.map((page) => (
            <a key={`${page.kind}-${page.id}`} href={page.href} className="page-chip">
              <span>{page.kind}</span>
              <strong>{page.title}</strong>
            </a>
          ))}
        </div>
      </article>
    )
  }
  if (module.id === 'network') {
    const routerUrl = normaliseExternalUrl(settings?.routerUrl)
    const adminUrl = normaliseExternalUrl(settings?.adminUrl)
    return (
      <article className={`${className} network-panel`} key={module.id}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Deployment</p>
            <h2>{home.deployment.host}</h2>
          </div>
          <span className={home.deployment.ready ? 'status-badge ok' : 'status-badge warn'}>
            {home.deployment.ready ? 'Connected' : 'Needs setup'}
          </span>
        </div>
        <p>{home.deployment.note}</p>
        <div className="stack-list">
          <a className="plain-row" href={home.deployment.origin} target="_blank" rel="noreferrer">
            <strong>Open current host</strong>
            <span>{home.deployment.origin}</span>
          </a>
          {routerUrl && (
            <a className="plain-row" href={routerUrl} target="_blank" rel="noreferrer">
              <strong>Router</strong>
              <span>{routerUrl}</span>
            </a>
          )}
          {adminUrl && (
            <a className="plain-row" href={adminUrl} target="_blank" rel="noreferrer">
              <strong>Admin panel</strong>
              <span>{adminUrl}</span>
            </a>
          )}
          <a className="plain-row" href="/docs/cloudflare-hosting.md">
            <strong>Cloudflare hosting guide</strong>
            <span>Functions + D1 setup and deploy steps</span>
          </a>
        </div>
      </article>
    )
  }
  return null
}

function AdminPanel({
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
  onAppearanceChange,
  onUserDraftChange,
  onCreateUser,
  onPatchUser,
  onPatchModule,
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
  onAppearanceChange: (appearance: Appearance) => void
  onUserDraftChange: (draft: { username: string; displayName: string; role: string; password: string }) => void
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void
  onPatchUser: (user: UserRecord, patch: Partial<UserRecord>) => void
  onPatchModule: (module: Module, patch: Partial<Module> & { deleteData?: boolean }) => void
  onClearCache: (key?: string) => void
}) {
  const { themes, themeId } = useTheme()
  const selectedTheme = themes.find((theme) => theme.id === themeId)
  const [pendingUninstall, setPendingUninstall] = useState<Module | null>(null)
  const [tideApiKeyDraft, setTideApiKeyDraft] = useState('')
  const [activityFilter, setActivityFilter] = useState({ entityType: '', search: '' })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingDisplayName, setEditingDisplayName] = useState('')
  const editablePages = pageLinks.filter((page) => page.kind === 'editable')
  const manualLinks = pageLinks.filter((page) => page.kind !== 'editable' && page.kind !== 'custom')
  const uniqueEntityTypes = [...new Set(activityEntries.map((e) => e.entityType))].sort()
  const filteredActivity = activityEntries.filter((entry) => {
    if (activityFilter.entityType && entry.entityType !== activityFilter.entityType) return false
    if (activityFilter.search && !entry.summary.toLowerCase().includes(activityFilter.search.toLowerCase())) return false
    return true
  })
  const deploymentChecks = [
    { label: 'D1 binding', ok: true, detail: 'DB is reachable through the worker API.' },
    { label: 'Admin users', ok: users.some((user) => user.role === 'admin' && user.active), detail: 'At least one active admin account is required.' },
    { label: 'Location', ok: Boolean(settings.latitude && settings.longitude && settings.timezone), detail: 'Weather and tide modules need coordinates and timezone.' },
    { label: 'Custom pages', ok: pageManifestWarnings.length === 0, detail: pageManifestWarnings.length === 0 ? 'Manifest has no warnings.' : 'Resolve manifest warnings before deploy.' },
  ]
  const tidesModule = modules.find((module) => module.id === 'tides')
  const tideSource = String(tidesModule?.options?.source ?? 'model')

  useEffect(() => {
    const key = String(tidesModule?.options?.apiKey ?? '')
    setTideApiKeyDraft(key)
  }, [tidesModule?.options])

  return (
    <section className="workspace-grid admin-grid">
      {pendingUninstall && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="panel modal-panel">
            <p className="kicker">Module uninstall</p>
            <h2>{pendingUninstall.title}</h2>
            <p>Choose whether to keep this module's data for later reinstall, or delete its stored rows now.</p>
            <div className="button-row">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  onPatchModule(pendingUninstall, { installed: false, enabled: false })
                  setPendingUninstall(null)
                }}
              >
                Preserve data
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onPatchModule(pendingUninstall, { installed: false, enabled: false, deleteData: true })
                  setPendingUninstall(null)
                }}
              >
                Delete data
              </button>
              <button type="button" className="ghost" onClick={() => setPendingUninstall(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}

      <article className="panel span-2">
        <div className="panel-heading">
          <div>
            <p className="kicker">Admin</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>
      </article>

      <form className="panel form-panel" onSubmit={onCreateUser}>
        <p className="kicker">Users</p>
        <h2>Add household user</h2>
        <input value={userDraft.username} onChange={(event) => onUserDraftChange({ ...userDraft, username: event.target.value })} placeholder="username" autoComplete="username" />
        <input value={userDraft.displayName} onChange={(event) => onUserDraftChange({ ...userDraft, displayName: event.target.value })} placeholder="Display name" autoComplete="name" />
        <select value={userDraft.role} onChange={(event) => onUserDraftChange({ ...userDraft, role: event.target.value })}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <input type="password" value={userDraft.password} onChange={(event) => onUserDraftChange({ ...userDraft, password: event.target.value })} placeholder="Temporary password" autoComplete="new-password" />
        <button type="submit">Create user</button>
      </form>

      <article className="panel">
        <p className="kicker">Active accounts</p>
        <h2>Users</h2>
        <div className="stack-list">
          {users.map((user) => (
            <div className={`user-row ${user.active ? '' : 'inactive'}`} key={user.id}>
              {editingUserId === user.id ? (
                <>
                  <input
                    className="inline-edit user-edit-input"
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { onPatchUser(user, { displayName: editingDisplayName }); setEditingUserId(null) }
                      if (e.key === 'Escape') setEditingUserId(null)
                    }}
                  />
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => { onPatchUser(user, { displayName: editingDisplayName }); setEditingUserId(null) }}>Save</button>
                    <button type="button" className="ghost" onClick={() => setEditingUserId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="user-meta">
                    <strong>{user.displayName}</strong>
                    <span>{user.username} / {user.role}{user.active ? '' : ' / disabled'}</span>
                  </div>
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => { setEditingUserId(user.id); setEditingDisplayName(user.displayName) }}>Rename</button>
                    <button type="button" className="ghost" onClick={() => onPatchUser(user, { active: !user.active })}>{user.active ? 'Disable' : 'Enable'}</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-2">
        <p className="kicker">Modules</p>
        <h2>Built-in registry</h2>
        <div className="module-list">
          {modules.map((module) => (
            <div key={module.id} className={`module-row module-config-row ${module.enabled ? 'enabled' : ''} ${module.installed ? '' : 'uninstalled'}`}>
              <div className="module-summary">
                <strong>{module.title}</strong>
                <span>{module.description}</span>
                <div className="module-meta">
                  <small>{module.category}</small>
                  <small>{module.installed ? 'Installed' : 'Not installed'}</small>
                  <small>{module.enabled ? 'Visible' : 'Hidden'}</small>
                </div>
              </div>
              <div className="module-controls">
                <div className="inline-controls">
                  <button type="button" className="ghost" onClick={() => (module.installed ? setPendingUninstall(module) : onPatchModule(module, { installed: true, enabled: true }))}>{module.installed ? 'Uninstall' : 'Install'}</button>
                  {module.installed && <button type="button" className="ghost" onClick={() => onPatchModule(module, { enabled: !module.enabled })}>{module.enabled ? 'Disable' : 'Enable'}</button>}
                </div>
                {module.installed && (
                  <label className="compact-field">
                    Size
                    <select value={module.size} onChange={(event) => onPatchModule(module, { size: event.target.value as Module['size'] })}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="wide">Wide</option>
                      <option value="full">Full</option>
                    </select>
                  </label>
                )}
                {module.id === 'tides' && module.installed && (
                  <>
                    <label className="compact-field">
                      Tide source
                      <select
                        value={String(module.options?.source ?? 'model')}
                        onChange={(event) => onPatchModule(module, { options: { ...module.options, source: event.target.value } })}
                      >
                        <option value="model">Built-in estimate</option>
                        <option value="api">API</option>
                      </select>
                    </label>
                    {tideSource === 'api' && (
                      <>
                        <label className="compact-field">
                          API key
                          <input
                            value={tideApiKeyDraft}
                            onChange={(event) => setTideApiKeyDraft(event.target.value)}
                            onBlur={() => onPatchModule(module, { options: { ...module.options, apiKey: tideApiKeyDraft.trim() } })}
                            placeholder="Paste API key"
                          />
                        </label>
                        <a className="plain-row compact-link" href="https://tidesatlas.com/api/register" target="_blank" rel="noreferrer">
                          <strong>Get API key</strong>
                          <span>Open TidesAtlas signup page</span>
                        </a>
                      </>
                    )}
                  </>
                )}
                <label className="compact-field position-field">
                  Order
                  <input type="number" value={module.position} onChange={(event) => onPatchModule(module, { position: Number(event.target.value) })} aria-label={`${module.title} position`} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <p className="kicker">Appearance</p>
        <h2>Theme</h2>
        <label>Active theme
          <select value={themeId} onChange={(event) => onAppearanceChange({ themeId: event.target.value })}>
            {themes.length === 0 && <option value={themeId}>{themeId}</option>}
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
        </label>
        {selectedTheme && (
          <p className="small-note">
            {selectedTheme.author !== 'Unknown' ? `By ${selectedTheme.author} · ` : ''}v{selectedTheme.version}
          </p>
        )}
        <p className="small-note">
          Themes control colour, type, density, and layout. Drop a new theme folder into <code>themes/</code> to add your own — see <a href="/docs/theming.md">docs/theming.md</a>.
        </p>
      </article>

      <form className="panel form-panel" onSubmit={onSaveSettings}>
        <p className="kicker">Household and location</p>
        <h2>Private settings</h2>
        <div className="two-col">
          <label>Wi-Fi name<input value={settings.wifiName} onChange={(event) => onSettingsChange({ ...settings, wifiName: event.target.value })} /></label>
          <label>Wi-Fi password<input value={settings.wifiPassword} onChange={(event) => onSettingsChange({ ...settings, wifiPassword: event.target.value })} /></label>
          <label>Wi-Fi security
            <select value={settings.wifiSecurity} onChange={(event) => onSettingsChange({ ...settings, wifiSecurity: event.target.value })}>
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Open (no password)</option>
            </select>
          </label>
          <label>Router URL<input value={settings.routerUrl} onChange={(event) => onSettingsChange({ ...settings, routerUrl: event.target.value })} /></label>
          <label>Admin URL<input value={settings.adminUrl} onChange={(event) => onSettingsChange({ ...settings, adminUrl: event.target.value })} /></label>
          <label>Usage period<input value={settings.wifiUsagePeriod} onChange={(event) => onSettingsChange({ ...settings, wifiUsagePeriod: event.target.value })} placeholder="May 2026" /></label>
          <label>Usage this period (GB)<input value={settings.wifiUsageMonthlyGb} onChange={(event) => onSettingsChange({ ...settings, wifiUsageMonthlyGb: event.target.value })} placeholder="612.4" /></label>
          <label>Usage updated at<input value={settings.wifiUsageUpdatedAt} onChange={(event) => onSettingsChange({ ...settings, wifiUsageUpdatedAt: event.target.value })} placeholder="2026-05-30T15:30:00Z" /></label>
          <label>Bin day<input value={settings.binDay} onChange={(event) => onSettingsChange({ ...settings, binDay: event.target.value })} /></label>
          <label>Timezone<input value={settings.timezone} onChange={(event) => onSettingsChange({ ...settings, timezone: event.target.value })} /></label>
          <label>Location<input value={settings.locationName} onChange={(event) => onSettingsChange({ ...settings, locationName: event.target.value })} /></label>
          <label>Region<input value={settings.locationRegion} onChange={(event) => onSettingsChange({ ...settings, locationRegion: event.target.value })} /></label>
          <label>Latitude<input value={settings.latitude} onChange={(event) => onSettingsChange({ ...settings, latitude: event.target.value })} /></label>
          <label>Longitude<input value={settings.longitude} onChange={(event) => onSettingsChange({ ...settings, longitude: event.target.value })} /></label>
        </div>
        <label>Network devices JSON<textarea value={settings.wifiDevicesJson} onChange={(event) => onSettingsChange({ ...settings, wifiDevicesJson: event.target.value })} placeholder='[{"name":"Living Room TV","type":"tv","ip":"192.168.1.28","status":"online"}]' /></label>
        <label>Flat notes<textarea value={settings.flatNotes} onChange={(event) => onSettingsChange({ ...settings, flatNotes: event.target.value })} /></label>
        <button type="submit">Save settings</button>
      </form>

      <article className="panel span-2">
        <div className="panel-heading">
          <div>
            <p className="kicker">Pages</p>
            <h2>Page inventory</h2>
          </div>
          <span className={pageManifestWarnings.length === 0 ? 'status-badge ok' : 'status-badge warn'}>
            {pageManifestWarnings.length === 0 ? 'Ready' : 'Needs review'}
          </span>
        </div>
        <div className="stat-grid">
          <div><strong>{editablePages.length}</strong><span>Editable</span></div>
          <div><strong>{customPages.length}</strong><span>Discovered</span></div>
          <div><strong>{manualLinks.length}</strong><span>Manual links</span></div>
          <div><strong>{pageManifestWarnings.length}</strong><span>Warnings</span></div>
        </div>
        {pageManifestWarnings.length > 0 && (
          <div className="stack-list">
            {pageManifestWarnings.map((warning) => (
              <div className="plain-row warning-row" key={`${warning.path}-${warning.message}`}>
                <strong>{warning.path || 'Manifest'}</strong>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}
        {customPages.length > 0 && (
          <div className="manifest-detail-grid">
            {customPages.map((page) => (
              <article className="manifest-card" key={page.id}>
                <div className="panel-heading">
                  <div>
                    <strong>{page.title}</strong>
                    <span>{page.description || 'No description set.'}</span>
                  </div>
                  <a className="button-link ghost compact-link" href={page.href}>Open</a>
                </div>
                <dl className="manifest-fields">
                  <div>
                    <dt>HTML source</dt>
                    <dd>{customPageSourcePath(page.href)}</dd>
                  </div>
                  <div>
                    <dt>Metadata file</dt>
                    <dd>{customPageMetadataPath(page.href)}</dd>
                  </div>
                  <div>
                    <dt>Manifest href</dt>
                    <dd>{page.href}</dd>
                  </div>
                </dl>
                <div className="metadata-preview">
                  <div className="metadata-preview-header">
                    <span>Suggested page.json</span>
                    <button type="button" className="ghost compact-link" onClick={() => void navigator.clipboard.writeText(suggestedPageMetadata(page))}>Copy</button>
                  </div>
                  <textarea readOnly value={suggestedPageMetadata(page)} />
                </div>
              </article>
            ))}
          </div>
        )}
        {manualLinks.length > 0 && (
          <div className="stack-list">
            {manualLinks.slice(0, 8).map((page) => (
              <a className="plain-row" key={`${page.kind}-${page.id}`} href={page.href}>
                <strong>{page.title}</strong>
                <span>{page.kind} / {page.href}</span>
              </a>
            ))}
          </div>
        )}
        {customPages.length === 0 && manualLinks.length === 0 && <p>No custom or manual page links discovered.</p>}
      </article>

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

      <article className="panel">
        <p className="kicker">Site review</p>
        <h2>Review notes</h2>
        <div className="stack-list">
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

function NetworkWorkspace({ network, deployment }: { network: NetworkOverview | null; deployment: HomeData['deployment'] | null }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copyState, setCopyState] = useState('')
  const hasWifi = Boolean(network?.wifiName)
  const wifiPayload = useMemo(() => {
    if (!network || !network.wifiName) return ''
    return toWifiPayload(network.wifiName, network.wifiPassword, network.wifiSecurity)
  }, [network])

  useEffect(() => {
    let cancelled = false
    if (!wifiPayload) {
      setQrDataUrl('')
      return
    }
    void QRCode.toDataURL(wifiPayload, { width: 300, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [wifiPayload])

  async function copyValue(text: string, label: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyState(`${label} copied`)
      window.setTimeout(() => setCopyState(''), 1400)
    } catch {
      setCopyState('Clipboard blocked')
      window.setTimeout(() => setCopyState(''), 1400)
    }
  }

  const routerUrl = normaliseExternalUrl(network?.routerUrl)
  const adminUrl = normaliseExternalUrl(network?.adminUrl)
  const devices = network?.devices ?? []
  const usagePeriod = network?.usage.period || 'Current period'
  const usageValue = network?.usage.monthlyGb

  return (
    <section className="workspace-grid network-grid">
      <article className="panel span-2 network-share">
        <div className="panel-heading">
          <div>
            <p className="kicker">Network join</p>
            <h2>Share local Wi-Fi</h2>
          </div>
          {copyState && <span className="status-badge ok">{copyState}</span>}
        </div>
        {hasWifi ? (
          <div className="network-share-grid">
            <div className="network-credentials">
              <div className="plain-row">
                <strong>SSID</strong>
                <span>{network?.wifiName}</span>
              </div>
              <div className="plain-row">
                <strong>Password</strong>
                <span>{network?.wifiPassword || '(none)'}</span>
              </div>
              <div className="plain-row">
                <strong>Security</strong>
                <span>{network?.wifiSecurity}</span>
              </div>
              <div className="button-row">
                <button type="button" className="ghost" onClick={() => void copyValue(network?.wifiName ?? '', 'SSID')}>Copy SSID</button>
                <button type="button" className="ghost" onClick={() => void copyValue(network?.wifiPassword ?? '', 'Password')}>Copy password</button>
              </div>
            </div>
            <div className="network-qr-wrap">
              {qrDataUrl ? (
                <img className="network-qr" src={qrDataUrl} alt="Wi-Fi join QR code" />
              ) : (
                <div className="plain-row">
                  <strong>QR unavailable</strong>
                  <span>Add SSID/security details in Admin settings.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>Set Wi-Fi details in Admin settings to enable one-scan join sharing.</p>
        )}
      </article>

      <article className="panel">
        <p className="kicker">Usage</p>
        <h2>{usageValue === null || usageValue === undefined ? '--' : `${usageValue.toFixed(1)} GB`}</h2>
        <p>{usagePeriod}</p>
        <p className="small-note">
          {network?.usage.updatedAt ? `Updated ${formatDateTime(network.usage.updatedAt)}` : 'Add usage values in Admin settings.'}
        </p>
      </article>

      <article className="panel">
        <p className="kicker">Quick links</p>
        <h2>Router access</h2>
        <div className="stack-list">
          {routerUrl && <a className="plain-row" href={routerUrl} target="_blank" rel="noreferrer"><strong>Router</strong><span>{routerUrl}</span></a>}
          {adminUrl && <a className="plain-row" href={adminUrl} target="_blank" rel="noreferrer"><strong>Admin</strong><span>{adminUrl}</span></a>}
          <a className="plain-row" href={deployment?.origin ?? '/'}><strong>Current app host</strong><span>{deployment?.origin ?? 'No host loaded'}</span></a>
        </div>
      </article>

      <article className="panel span-2">
        <div className="panel-heading">
          <div>
            <p className="kicker">Connected devices</p>
            <h2>{devices.length} known</h2>
          </div>
        </div>
        <div className="stack-list">
          {devices.map((device) => (
            <div className="device-row" key={device.id}>
              <div>
                <strong>{device.name}</strong>
                <span>{device.type} / {device.connection} / {device.status}</span>
              </div>
              <small>{device.ip || device.mac || 'No address'}</small>
              <small>{device.usageGb === null ? '--' : `${device.usageGb.toFixed(1)} GB`}</small>
            </div>
          ))}
          {devices.length === 0 && <p>No devices configured yet. Add JSON entries in Admin settings.</p>}
        </div>
      </article>
    </section>
  )
}

function Markdown({ body }: { body: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(body || '') as string), [body])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html || '<p>No content yet.</p>' }} />
}

function ToastTray({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-tray" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span>{toast.message}</span>
          <button type="button" className="ghost" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>×</button>
        </div>
      ))}
    </div>
  )
}

async function api<T>(path: string, options: { method?: string; body?: unknown } = {}, requireOk = true): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api/')) {
      throw new Error('API not found in Vite-only mode. Use `npm run dev:worker` and open http://localhost:8788.')
    }
    if (!requireOk && response.status === 401) return { authenticated: false, userId: null, userName: null, displayName: null, role: null, adminUnlocked: false, adminUnlockedUntil: null } as T
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function labelForListType(value: string, listTypes: ListType[]) {
  return listTypes.find((type) => type.id === value)?.title ?? value
}

function formatTemperature(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${Math.round(value)}°`
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : Math.round(value).toString()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDayDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value))
}

function formatFullDateTime(value: number) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function weatherIcon(label: string | undefined) {
  const value = label?.toLowerCase() ?? ''
  if (value.includes('rain') || value.includes('drizzle')) return '🌧️'
  if (value.includes('clear') || value.includes('sun')) return '☀️'
  if (value.includes('cloud')) return '🌥️'
  if (value.includes('snow')) return '❄️'
  return '🌤️'
}

function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

function customPageSourcePath(href: string) {
  const relativePath = href.replace(/^\/custom-pages\//, '')
  return relativePath && relativePath !== href ? `custom-pages/${relativePath}` : href
}

function customPageMetadataPath(href: string) {
  const sourcePath = customPageSourcePath(href)
  if (!sourcePath.startsWith('custom-pages/')) return 'custom-pages/<page-folder>/page.json'
  const parts = sourcePath.split('/')
  parts.pop()
  return `${parts.join('/') || 'custom-pages'}/page.json`
}

function suggestedPageMetadata(page: PageLink) {
  return JSON.stringify(
    {
      title: page.title,
      description: page.description,
    },
    null,
    2,
  )
}

function toWifiPayload(ssid: string, password: string, security: string) {
  const type = security.trim().toUpperCase() === 'WEP' ? 'WEP' : (security.trim().toLowerCase() === 'nopass' ? 'nopass' : 'WPA')
  const escapedSsid = escapeWifiQrValue(ssid)
  const escapedPassword = escapeWifiQrValue(password)
  return `WIFI:T:${type};S:${escapedSsid};P:${escapedPassword};H:false;;`
}

function escapeWifiQrValue(value: string) {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

function normaliseExternalUrl(value: string | undefined) {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const withProtocol = raw.includes('://') ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export default App
