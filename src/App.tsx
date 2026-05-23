import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

type Tab = 'home' | 'lists' | 'notes' | 'pages' | 'settings'

type Module = {
  id: string
  title: string
  description: string
  position: number
  enabled: boolean
}

type Note = {
  id: string
  title: string
  body: string
  tags: string
  pinned: boolean
  updatedAt: string
}

type ShoppingItem = {
  id: string
  text: string
  done: boolean
}

type ShoppingList = {
  id: string
  name: string
  updatedAt: string
  items: ShoppingItem[]
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
}

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
  hourly: Array<{
    time: string
    temperature: number | null
    precipitationChance: number | null
    label: string
  }>
}

type TideSummary = {
  current: {
    seaLevel: number | null
    waveHeight: number | null
    time: string | null
  }
  forecastUntil: string | null
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
  lists: ShoppingList[]
  pages: PageLink[]
  settings: Settings
  modules: Module[]
  deployment: {
    origin: string
    host: string
    note: string
  }
}

type Session = {
  authenticated: boolean
  userName: string | null
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'lists', label: 'Lists' },
  { id: 'notes', label: 'Notes' },
  { id: 'pages', label: 'Pages' },
  { id: 'settings', label: 'Settings' },
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
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [home, setHome] = useState<HomeData | null>(null)
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [pageLinks, setPageLinks] = useState<PageLink[]>([])
  const [viewedPage, setViewedPage] = useState<Page | null>(null)
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [loginDraft, setLoginDraft] = useState({ username: 'admin', password: '' })
  const [listDraft, setListDraft] = useState('')
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '', tags: '' })
  const [pageDraft, setPageDraft] = useState({ title: '', slug: '', body: '', theme: 'shell', occasion: '', emoji: '' })
  const [linkDraft, setLinkDraft] = useState({ title: '', href: 'example/index.html', description: '', kind: 'static' })

  useEffect(() => {
    void boot()
  }, [])

  async function boot() {
    const current = await api<Session>('/api/auth/me', {}, false)
    setSession(current)
    if (current.authenticated) await refreshAll()
  }

  async function refreshAll() {
    setBusy(true)
    setError('')
    try {
      const [homeData, listData, noteData, pageData, linkData, settingsData] = await Promise.all([
        api<HomeData>('/api/home'),
        api<ShoppingList[]>('/api/lists'),
        api<Note[]>('/api/notes'),
        api<Page[]>('/api/pages'),
        api<PageLink[]>('/api/page-links'),
        api<Settings>('/api/settings'),
      ])
      setHome(homeData)
      setLists(listData)
      setNotes(noteData)
      setPages(pageData)
      setPageLinks(linkData)
      setSettings(settingsData)
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

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const next = await api<Session>('/api/auth/login', { method: 'POST', body: loginDraft }, false)
      setSession(next)
      await refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed')
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }, false)
    setSession({ authenticated: false, userName: null })
    setHome(null)
  }

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!listDraft.trim()) return
    await api('/api/lists', { method: 'POST', body: { name: listDraft } })
    setListDraft('')
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

  async function toggleItem(item: ShoppingItem) {
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

  const enabledModules = useMemo(() => home?.modules.filter((module) => module.enabled).map((module) => module.id) ?? [], [home])

  if (session === null) {
    return <main className="loading-screen">Opening Frog & Peach...</main>
  }

  if (!session.authenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="kicker">Private home hub</p>
          <h1>Frog & Peach</h1>
          <p>Sign in with the single admin account configured for this deployment.</p>
          <form onSubmit={login}>
            <label>
              Username
              <input value={loginDraft.username} onChange={(event) => setLoginDraft((draft) => ({ ...draft, username: event.target.value }))} autoComplete="username" />
            </label>
            <label>
              Password
              <input value={loginDraft.password} onChange={(event) => setLoginDraft((draft) => ({ ...draft, password: event.target.value }))} type="password" autoComplete="current-password" />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button type="submit">Sign in</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="top-strip">
        <div>
          <p className="kicker">Modular home page tool</p>
          <h1>Frog & Peach</h1>
        </div>
        <div className="top-actions">
          {home?.deployment.origin && <span>{home.deployment.origin}</span>}
          <button type="button" onClick={refreshAll} disabled={busy}>Refresh</button>
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

      {viewedPage && (
        <section className={`standalone-page ${viewedPage.theme}`}>
          <a className="button-link" href="/">Back</a>
          <p className="kicker">{viewedPage.emoji} {viewedPage.occasion || 'Editable page'}</p>
          <h1>{viewedPage.title}</h1>
          <Markdown body={viewedPage.body} />
        </section>
      )}

      {!viewedPage && activeTab === 'home' && home && (
        <section className="dashboard-grid">
          {enabledModules.includes('weather') && (
            <article className="panel weather-panel span-2">
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
                    <small>{formatTemperature(day.min)} / {formatTemperature(day.max)} · {formatNumber(day.precipitationChance)}% rain</small>
                  </div>
                ))}
              </div>
            </article>
          )}

          {enabledModules.includes('tides') && (
            <article className="panel tide-panel span-2">
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
          )}

          {enabledModules.includes('lists') && (
            <article className="panel">
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
          )}

          {enabledModules.includes('notes') && (
            <article className="panel">
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
          )}

          {enabledModules.includes('pages') && (
            <article className="panel span-2">
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
          )}

          {enabledModules.includes('network') && (
            <article className="panel span-2">
              <p className="kicker">Deployment</p>
              <h2>{home.deployment.host}</h2>
              <p>{home.deployment.note}</p>
            </article>
          )}
        </section>
      )}

      {!viewedPage && activeTab === 'lists' && (
        <section className="workspace-grid">
          <form className="panel form-panel" onSubmit={createList}>
            <p className="kicker">Shopping</p>
            <h2>New list</h2>
            <input value={listDraft} onChange={(event) => setListDraft(event.target.value)} placeholder="Big shop, DIY bits..." />
            <button type="submit">Add list</button>
          </form>
          {lists.map((list) => (
            <article className="panel list-panel" key={list.id}>
              <div className="panel-heading">
                <h2>{list.name}</h2>
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
                    <span>{item.text}</span>
                    <button type="button" className="icon-button" aria-label={`Delete ${item.text}`} onClick={() => removeItem(item.id)}>x</button>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {!viewedPage && activeTab === 'notes' && (
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
                  <p className="kicker">{note.pinned ? 'Pinned' : formatDate(note.updatedAt)}</p>
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

      {!viewedPage && activeTab === 'pages' && (
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
            <p className="kicker">Static launcher</p>
            <h2>Link a page folder</h2>
            <input value={linkDraft.title} onChange={(event) => setLinkDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Example page" />
            <input value={linkDraft.href} onChange={(event) => setLinkDraft((draft) => ({ ...draft, href: event.target.value }))} placeholder="example/index.html" />
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
            <article className="panel page-panel" key={link.id}>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{link.kind}</p>
                  <h2>{link.title}</h2>
                </div>
                <a className="button-link" href={link.href}>Open</a>
              </div>
              <p>{link.description}</p>
              {link.kind !== 'editable' && <button type="button" className="ghost danger" onClick={() => removePageLink(link.id)}>Delete launcher</button>}
            </article>
          ))}
        </section>
      )}

      {!viewedPage && activeTab === 'settings' && (
        <section className="workspace-grid">
          <form className="panel form-panel span-2" onSubmit={saveSettings}>
            <p className="kicker">Settings</p>
            <h2>Household and location</h2>
            <div className="two-col">
              <label>Wi-Fi name<input value={settings.wifiName} onChange={(event) => setSettings({ ...settings, wifiName: event.target.value })} /></label>
              <label>Wi-Fi password<input value={settings.wifiPassword} onChange={(event) => setSettings({ ...settings, wifiPassword: event.target.value })} /></label>
              <label>Router URL<input value={settings.routerUrl} onChange={(event) => setSettings({ ...settings, routerUrl: event.target.value })} /></label>
              <label>Admin URL<input value={settings.adminUrl} onChange={(event) => setSettings({ ...settings, adminUrl: event.target.value })} /></label>
              <label>Bin day<input value={settings.binDay} onChange={(event) => setSettings({ ...settings, binDay: event.target.value })} /></label>
              <label>Timezone<input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></label>
              <label>Location<input value={settings.locationName} onChange={(event) => setSettings({ ...settings, locationName: event.target.value })} /></label>
              <label>Region<input value={settings.locationRegion} onChange={(event) => setSettings({ ...settings, locationRegion: event.target.value })} /></label>
              <label>Latitude<input value={settings.latitude} onChange={(event) => setSettings({ ...settings, latitude: event.target.value })} /></label>
              <label>Longitude<input value={settings.longitude} onChange={(event) => setSettings({ ...settings, longitude: event.target.value })} /></label>
            </div>
            <label>Flat notes<textarea value={settings.flatNotes} onChange={(event) => setSettings({ ...settings, flatNotes: event.target.value })} /></label>
            <button type="submit">Save settings</button>
          </form>

          <article className="panel span-2">
            <p className="kicker">Modules</p>
            <h2>Built-in module registry</h2>
            <div className="module-list">
              {home?.modules.map((module) => (
                <div key={module.id} className={module.enabled ? 'module-row enabled' : 'module-row'}>
                  <strong>{module.title}</strong>
                  <span>{module.description}</span>
                  <small>{module.enabled ? 'Enabled' : 'Disabled'}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
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
    if (!requireOk && response.status === 401) return { authenticated: false, userName: null } as T
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
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

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function weatherMark(label: string | undefined) {
  if (!label) return '◇'
  const value = label.toLowerCase()
  if (value.includes('rain') || value.includes('drizzle')) return '◆'
  if (value.includes('clear')) return '○'
  if (value.includes('cloud')) return '◒'
  return '◇'
}

function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

export default App
