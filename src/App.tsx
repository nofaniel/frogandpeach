import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

type Tab = 'home' | 'lists' | 'notes' | 'pages'

type Module = {
  id: string
  title: string
  description: string
  category: string
  installed: boolean
  enabled: boolean
  position: number
  size: 'small' | 'medium' | 'wide' | 'full'
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

type Settings = {
  wifiName: string
  wifiPassword: string
  routerUrl: string
  adminUrl: string
  binDay: string
  flatNotes: string
  locationName: string
  locationRegion: string
  latitude: string
  longitude: string
  timezone: string
  colourTheme: string
  styleTheme: string
}

type Appearance = Pick<Settings, 'colourTheme' | 'styleTheme'>

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
    note: string
  }
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

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'lists', label: 'Lists' },
  { id: 'notes', label: 'Notes' },
  { id: 'pages', label: 'Pages' },
]

const emptySettings: Settings = {
  wifiName: '',
  wifiPassword: '',
  routerUrl: '',
  adminUrl: '',
  binDay: '',
  flatNotes: '',
  locationName: 'Newquay',
  locationRegion: 'Cornwall',
  latitude: '50.4155',
  longitude: '-5.0737',
  timezone: 'Europe/London',
  colourTheme: 'frog-peach',
  styleTheme: 'classic',
}

function App() {
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [adminOpen, setAdminOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [home, setHome] = useState<HomeData | null>(null)
  const [lists, setLists] = useState<SharedList[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [pageLinks, setPageLinks] = useState<PageLink[]>([])
  const [viewedPage, setViewedPage] = useState<Page | null>(null)
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([])
  const [customPages, setCustomPages] = useState<PageLink[]>([])
  const [pageManifestWarnings, setPageManifestWarnings] = useState<Array<{ path: string; message: string }>>([])
  const [appearance, setAppearance] = useState<Appearance>({ colourTheme: 'frog-peach', styleTheme: 'classic' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
      const [homeData, listData, noteData, pageData, linkData, appearanceData] = await Promise.all([
        api<HomeData>('/api/home'),
        api<SharedList[]>('/api/lists'),
        api<Note[]>('/api/notes'),
        api<Page[]>('/api/pages'),
        api<PageLink[]>('/api/page-links'),
        api<Appearance>('/api/appearance'),
      ])
      setHome(homeData)
      setLists(listData)
      setNotes(noteData)
      setPages(pageData)
      setPageLinks(linkData)
      setModules(homeData.modules)
      setAppearance(appearanceData)
      setSettings((current) => ({ ...current, ...homeData.settings, ...appearanceData }))
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
    const [settingsData, usersData, modulesData, cacheData, manifestData] = await Promise.all([
      api<Settings>('/api/settings'),
      api<UserRecord[]>('/api/users'),
      api<Module[]>('/api/modules'),
      api<CacheEntry[]>('/api/cache'),
      api<PageManifestReport>('/api/page-manifest-report'),
    ])
    setSettings(settingsData)
    setUsers(usersData)
    setModules(modulesData)
    setCacheEntries(cacheData)
    setCustomPages(manifestData.pages)
    setPageManifestWarnings(manifestData.warnings)
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
    const unlocked = await api<{ adminUnlocked: boolean; unlockedUntil: string }>('/api/admin/unlock', { method: 'POST', body: unlockDraft })
    setSession((current) => (current ? { ...current, adminUnlocked: unlocked.adminUnlocked, adminUnlockedUntil: unlocked.unlockedUntil } : current))
    setUnlockDraft((draft) => ({ ...draft, password: '' }))
    setUnlockOpen(false)
    setAdminOpen(true)
    await refreshAdmin()
  }

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!listDraft.name.trim()) return
    await api('/api/lists', { method: 'POST', body: listDraft })
    setListDraft({ name: '', listType: listDraft.listType })
    await refreshAll()
  }

  async function createItem(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault()
    const text = itemDrafts[listId]?.trim()
    if (!text) return
    await api(`/api/lists/${listId}/items`, { method: 'POST', body: { text } })
    setItemDrafts((drafts) => ({ ...drafts, [listId]: '' }))
    await refreshAll()
  }

  async function toggleItem(item: ListItem) {
    await api(`/api/items/${item.id}`, { method: 'PATCH', body: { done: !item.done } })
    await refreshAll()
  }

  async function removeItem(id: string) {
    await api(`/api/items/${id}`, { method: 'DELETE' })
    await refreshAll()
  }

  async function removeList(id: string) {
    await api(`/api/lists/${id}`, { method: 'DELETE' })
    await refreshAll()
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) return
    await api('/api/notes', { method: 'POST', body: noteDraft })
    setNoteDraft({ title: '', body: '', tags: '' })
    await refreshAll()
  }

  async function toggleNote(note: Note) {
    await api(`/api/notes/${note.id}`, { method: 'PATCH', body: { pinned: !note.pinned } })
    await refreshAll()
  }

  async function removeNote(id: string) {
    await api(`/api/notes/${id}`, { method: 'DELETE' })
    await refreshAll()
  }

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pageDraft.title.trim() && !pageDraft.body.trim()) return
    await api('/api/pages', { method: 'POST', body: pageDraft })
    setPageDraft({ title: '', slug: '', body: '', theme: 'shell', occasion: '', emoji: '' })
    await refreshAll()
  }

  async function removePage(id: string) {
    await api(`/api/pages/${id}`, { method: 'DELETE' })
    await refreshAll()
  }

  async function createPageLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!linkDraft.title.trim() || !linkDraft.href.trim()) return
    await api('/api/page-links', { method: 'POST', body: linkDraft })
    setLinkDraft({ title: '', href: '', description: '', kind: 'static' })
    await refreshAll()
  }

  async function removePageLink(id: string) {
    await api(`/api/page-links/${id}`, { method: 'DELETE' })
    await refreshAll()
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const updated = await api<Settings>('/api/settings', { method: 'PUT', body: settings })
    setSettings(updated)
    await refreshAll()
  }

  async function saveAppearance(next: Appearance) {
    const updated = await api<Appearance>('/api/appearance', { method: 'PUT', body: next })
    setAppearance(updated)
    setSettings((current) => ({ ...current, ...updated }))
    await refreshAll()
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await api('/api/users', { method: 'POST', body: userDraft })
    setUserDraft({ username: '', displayName: '', role: 'member', password: '' })
    await refreshAdmin()
  }

  async function patchUser(user: UserRecord, patch: Partial<UserRecord>) {
    await api(`/api/users/${user.id}`, { method: 'PATCH', body: patch })
    await refreshAdmin()
  }

  async function patchModule(module: Module, patch: Partial<Module> & { deleteData?: boolean }) {
    await api('/api/modules', { method: 'PATCH', body: [{ id: module.id, ...patch }] })
    await refreshAdmin()
    await refreshAll()
  }

  async function clearCache(key?: string) {
    const next = await api<CacheEntry[]>(key ? `/api/cache/${encodeURIComponent(key)}` : '/api/cache', { method: 'DELETE' })
    setCacheEntries(next)
  }

  const dashboardModules = useMemo(() => modules.filter((module) => module.installed && module.enabled), [modules])
  const listTypes = home?.listTypes ?? []

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
    <main className="app-shell" data-theme={appearance.colourTheme} data-style={appearance.styleTheme}>
      <header className="top-strip">
        <div>
          <p className="kicker">Modular home page tool</p>
          <h1>Frog & Peach</h1>
        </div>
        <div className="top-actions">
          {home?.deployment.origin && <span>{home.deployment.origin}</span>}
          {session.adminUnlockedUntil && <span>Admin until {formatTime(session.adminUnlockedUntil)}</span>}
          <button type="button" onClick={refreshAll} disabled={busy}>Refresh</button>
          <button type="button" className="icon-cog" aria-label="Admin settings" title="Admin settings" onClick={openAdmin}>Admin</button>
          <button type="button" className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Sections">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <section className="notice error">{error}</section>}

      {unlockOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="panel modal-panel" onSubmit={unlockAdmin}>
            <p className="kicker">Admin unlock</p>
            <h2>Confirm admin credentials</h2>
            <label>Admin username<input value={unlockDraft.username} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, username: event.target.value }))} /></label>
            <label>Password<input type="password" value={unlockDraft.password} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, password: event.target.value }))} autoFocus /></label>
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
        <section className="dashboard-grid">
          {dashboardModules.map((module) => renderModule(module, home, setActiveTab))}
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
    </main>
  )
}

function renderModule(module: Module, home: HomeData, setActiveTab: (tab: Tab) => void) {
  const className = `panel module-${module.size}`
  if (module.id === 'weather') {
    return (
      <article className={`${className} weather-panel`} key={module.id}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Weather</p>
            <h2>{weatherMark(home.weather?.current.label)} {home.weather?.current.label ?? 'Unavailable'}</h2>
            <p>{home.weather?.location}</p>
          </div>
          <strong className="big-number">{formatTemperature(home.weather?.current.temperature)}</strong>
        </div>
        <div className="metric-row">
          <span>Feels {formatTemperature(home.weather?.current.feelsLike)}</span>
          <span>Wind {formatNumber(home.weather?.current.windSpeed)} km/h</span>
          <span>Gusts {formatNumber(home.weather?.current.windGusts)} km/h</span>
          <span>Rain {formatNumber(home.weather?.current.precipitation)} mm</span>
        </div>
        <div className="day-grid">
          {home.weather?.daily.map((day) => (
            <div key={day.date}>
              <span>{formatDay(day.date)}</span>
              <strong>{day.label}</strong>
              <small>{formatTemperature(day.min)} / {formatTemperature(day.max)} | {formatNumber(day.precipitationChance)}% rain</small>
            </div>
          ))}
        </div>
      </article>
    )
  }
  if (module.id === 'tides') {
    return (
      <article className={`${className} tide-panel`} key={module.id}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Tides</p>
            <h2>Newquay trend</h2>
          </div>
          <span className="pill">modelled</span>
        </div>
        <div className="tide-track">
          {(home.tides?.events ?? []).slice(0, 6).map((event) => (
            <div key={event.id} className={`tide-card ${event.type}`}>
              <span>{event.type}</span>
              <strong>{formatDateTime(event.time)}</strong>
              <small>{event.height === null ? 'No height' : `${event.height} m`}</small>
            </div>
          ))}
        </div>
        <p className="small-note">{home.tides?.note}</p>
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
    return (
      <article className={className} key={module.id}>
        <p className="kicker">Deployment</p>
        <h2>{home.deployment.host}</h2>
        <p>{home.deployment.note}</p>
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
  const [pendingUninstall, setPendingUninstall] = useState<Module | null>(null)
  const editablePages = pageLinks.filter((page) => page.kind === 'editable')
  const manualLinks = pageLinks.filter((page) => page.kind !== 'editable' && page.kind !== 'custom')
  const deploymentChecks = [
    { label: 'D1 binding', ok: true, detail: 'DB is reachable through the worker API.' },
    { label: 'Admin users', ok: users.some((user) => user.role === 'admin' && user.active), detail: 'At least one active admin account is required.' },
    { label: 'Location', ok: Boolean(settings.latitude && settings.longitude && settings.timezone), detail: 'Weather and tide modules need coordinates and timezone.' },
    { label: 'Custom pages', ok: pageManifestWarnings.length === 0, detail: pageManifestWarnings.length === 0 ? 'Manifest has no warnings.' : 'Resolve manifest warnings before deploy.' },
  ]

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
        <input value={userDraft.username} onChange={(event) => onUserDraftChange({ ...userDraft, username: event.target.value })} placeholder="username" />
        <input value={userDraft.displayName} onChange={(event) => onUserDraftChange({ ...userDraft, displayName: event.target.value })} placeholder="Display name" />
        <select value={userDraft.role} onChange={(event) => onUserDraftChange({ ...userDraft, role: event.target.value })}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <input type="password" value={userDraft.password} onChange={(event) => onUserDraftChange({ ...userDraft, password: event.target.value })} placeholder="Temporary password" />
        <button type="submit">Create user</button>
      </form>

      <article className="panel">
        <p className="kicker">Active accounts</p>
        <h2>Users</h2>
        <div className="stack-list">
          {users.map((user) => (
            <div className="module-row" key={user.id}>
              <strong>{user.displayName}</strong>
              <span>{user.username} / {user.role}</span>
              <button type="button" className="ghost" onClick={() => onPatchUser(user, { active: !user.active })}>{user.active ? 'Disable' : 'Enable'}</button>
            </div>
          ))}
        </div>
      </article>

      <article className="panel span-2">
        <p className="kicker">Modules</p>
        <h2>Built-in registry</h2>
        <div className="module-list">
          {modules.map((module) => (
            <div key={module.id} className={module.enabled ? 'module-row enabled' : 'module-row'}>
              <div>
                <strong>{module.title}</strong>
                <span>{module.description}</span>
              </div>
              <div className="inline-controls">
                <button type="button" className="ghost" onClick={() => (module.installed ? setPendingUninstall(module) : onPatchModule(module, { installed: true, enabled: true }))}>{module.installed ? 'Uninstall' : 'Install'}</button>
                {module.installed && <button type="button" className="ghost" onClick={() => onPatchModule(module, { enabled: !module.enabled })}>{module.enabled ? 'Disable' : 'Enable'}</button>}
                {module.installed && (
                  <select value={module.size} onChange={(event) => onPatchModule(module, { size: event.target.value as Module['size'] })}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="wide">Wide</option>
                    <option value="full">Full</option>
                  </select>
                )}
              </div>
              <input type="number" value={module.position} onChange={(event) => onPatchModule(module, { position: Number(event.target.value) })} aria-label={`${module.title} position`} />
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <p className="kicker">Appearance</p>
        <h2>Theme</h2>
        <div className="two-col">
          <label>Colour theme
            <select value={settings.colourTheme} onChange={(event) => onAppearanceChange({ colourTheme: event.target.value, styleTheme: settings.styleTheme })}>
              <option value="frog-peach">Frog & Peach</option>
              <option value="coastal">Coastal</option>
              <option value="botanical">Botanical</option>
              <option value="mono-dark">Mono dark</option>
            </select>
          </label>
          <label>Style theme
            <select value={settings.styleTheme} onChange={(event) => onAppearanceChange({ colourTheme: settings.colourTheme, styleTheme: event.target.value })}>
              <option value="classic">Classic</option>
              <option value="compact">Compact</option>
              <option value="soft">Soft</option>
              <option value="high-contrast">High contrast</option>
            </select>
          </label>
        </div>
      </article>

      <form className="panel form-panel" onSubmit={onSaveSettings}>
        <p className="kicker">Household and location</p>
        <h2>Private settings</h2>
        <div className="two-col">
          <label>Wi-Fi name<input value={settings.wifiName} onChange={(event) => onSettingsChange({ ...settings, wifiName: event.target.value })} /></label>
          <label>Wi-Fi password<input value={settings.wifiPassword} onChange={(event) => onSettingsChange({ ...settings, wifiPassword: event.target.value })} /></label>
          <label>Router URL<input value={settings.routerUrl} onChange={(event) => onSettingsChange({ ...settings, routerUrl: event.target.value })} /></label>
          <label>Admin URL<input value={settings.adminUrl} onChange={(event) => onSettingsChange({ ...settings, adminUrl: event.target.value })} /></label>
          <label>Bin day<input value={settings.binDay} onChange={(event) => onSettingsChange({ ...settings, binDay: event.target.value })} /></label>
          <label>Timezone<input value={settings.timezone} onChange={(event) => onSettingsChange({ ...settings, timezone: event.target.value })} /></label>
          <label>Location<input value={settings.locationName} onChange={(event) => onSettingsChange({ ...settings, locationName: event.target.value })} /></label>
          <label>Region<input value={settings.locationRegion} onChange={(event) => onSettingsChange({ ...settings, locationRegion: event.target.value })} /></label>
          <label>Latitude<input value={settings.latitude} onChange={(event) => onSettingsChange({ ...settings, latitude: event.target.value })} /></label>
          <label>Longitude<input value={settings.longitude} onChange={(event) => onSettingsChange({ ...settings, longitude: event.target.value })} /></label>
        </div>
        <label>Flat notes<textarea value={settings.flatNotes} onChange={(event) => onSettingsChange({ ...settings, flatNotes: event.target.value })} /></label>
        <button type="submit">Save settings</button>
      </form>

      <article className="panel span-2">
        <p className="kicker">Pages</p>
        <h2>Page inventory</h2>
        <div className="stat-grid">
          <div><strong>{editablePages.length}</strong><span>Editable</span></div>
          <div><strong>{customPages.length}</strong><span>Discovered</span></div>
          <div><strong>{manualLinks.length}</strong><span>Manual links</span></div>
          <div><strong>{pageManifestWarnings.length}</strong><span>Warnings</span></div>
        </div>
        <div className="stack-list">
          {pageManifestWarnings.map((warning) => (
            <div className="plain-row warning-row" key={`${warning.path}-${warning.message}`}>
              <strong>{warning.path || 'Manifest'}</strong>
              <span>{warning.message}</span>
            </div>
          ))}
          {[...customPages, ...manualLinks].slice(0, 8).map((page) => (
            <a className="plain-row" key={`${page.kind}-${page.id}`} href={page.href}>
              <strong>{page.title}</strong>
              <span>{page.kind} / {page.href}</span>
            </a>
          ))}
          {customPages.length === 0 && manualLinks.length === 0 && <p>No custom or manual page links discovered.</p>}
        </div>
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

function Markdown({ body }: { body: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(body || '') as string), [body])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html || '<p>No content yet.</p>' }} />
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
  return value === null || value === undefined ? '--' : `${Math.round(value)} deg`
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : Math.round(value).toString()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function weatherMark(label: string | undefined) {
  if (!label) return 'Weather'
  const value = label.toLowerCase()
  if (value.includes('rain') || value.includes('drizzle')) return 'Rain'
  if (value.includes('clear')) return 'Clear'
  if (value.includes('cloud')) return 'Cloud'
  return 'Weather'
}

function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

export default App
