import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { api, loggedOutSession } from '../../api-client/client'
import { buildNavigationEntries, type NavigationEntry } from './navigation'
import type {
  ActivityEntry,
  Appearance,
  CacheEntry,
  HomeData,
  ListItem,
  ListType,
  Module,
  NetworkOverview,
  Note,
  Page,
  PageLink,
  Session,
  Settings,
  SharedList,
  Toast,
  UserPatch,
  UserRecord,
} from '../../shared/api-types'
import { formatDuration } from '../../shared/format'
import { isLocationConfigured, resolveBrowserTimeZone } from '../../shared/location'
import { useTheme } from '../../theme/ThemeProvider'
import { USER_THEME_KEY, applyDensity, readDensity } from './SettingsPanel'

export type AppScreen = 'loading' | 'password-setup' | 'login' | 'app'

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
  locationName: '',
  locationRegion: '',
  latitude: '',
  longitude: '',
  timezone: '',
  themeId: 'base',
}

function clearAdminState(
  setAdminSettingsDraft: Dispatch<SetStateAction<Settings>>,
  setAdminModules: Dispatch<SetStateAction<Module[]>>,
  setUsers: Dispatch<SetStateAction<UserRecord[]>>,
  setCacheEntries: Dispatch<SetStateAction<CacheEntry[]>>,
  setActivityEntries: Dispatch<SetStateAction<ActivityEntry[]>>,
  setCustomPages: Dispatch<SetStateAction<PageLink[]>>,
  setPageManifestWarnings: Dispatch<SetStateAction<Array<{ path: string; message: string }>>>,
  setNetwork: Dispatch<SetStateAction<NetworkOverview | null>>,
) {
  setAdminSettingsDraft(emptySettings)
  setAdminModules([])
  setUsers([])
  setCacheEntries([])
  setActivityEntries([])
  setCustomPages([])
  setPageManifestWarnings([])
  setNetwork(null)
}

export function useAppController() {
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'lists' | 'notes' | 'pages' | 'network'>('home')
  const [adminOpen, setAdminOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [home, setHome] = useState<HomeData | null>(null)
  const [network, setNetwork] = useState<NetworkOverview | null>(null)
  const [lists, setLists] = useState<SharedList[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [pageLinks, setPageLinks] = useState<PageLink[]>([])
  const [viewedPage, setViewedPage] = useState<Page | null>(null)
  const [publicSettings, setPublicSettings] = useState<Settings>(emptySettings)
  const [adminSettingsDraft, setAdminSettingsDraft] = useState<Settings>(emptySettings)
  const [displayModules, setDisplayModules] = useState<Module[]>([])
  const [adminModules, setAdminModules] = useState<Module[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
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
  const pendingNavigationTargetRef = useRef<string | null>(null)

  const [loginDraft, setLoginDraft] = useState({ username: 'admin', password: '', displayName: '', setupToken: '' })
  const [unlockDraft, setUnlockDraft] = useState({ username: 'admin', password: '' })
  const [userDraft, setUserDraft] = useState({ username: '', displayName: '', role: 'member', password: '' })
  const [passwordSetupDraft, setPasswordSetupDraft] = useState({ password: '', confirmPassword: '' })
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
    setEditMode(false)
    clearAdminState(setAdminSettingsDraft, setAdminModules, setUsers, setCacheEntries, setActivityEntries, setCustomPages, setPageManifestWarnings, setNetwork)
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

  const navigationEntries = useMemo(() => buildNavigationEntries(displayModules), [displayModules])

  useEffect(() => {
    if (navigationEntries.some((entry) => entry.target.kind === 'tab' && entry.target.tab === activeTab)) return
    setActiveTab('home')
  }, [activeTab, navigationEntries])

  useEffect(() => {
    if (activeTab !== 'home' || adminOpen || !home || !pendingNavigationTargetRef.current) return
    const targetId = pendingNavigationTargetRef.current
    pendingNavigationTargetRef.current = null
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, adminOpen, home, navigationEntries])

  async function boot() {
    setError('')
    try {
      const setup = await api<{ needsSetup: boolean }>('/api/setup/status', {}, false)
      setSetupNeeded(setup.needsSetup)
      const current = await api<Session>('/api/auth/me', {}, false)
      setSession(current)
      if (current.authenticated && !current.passwordSetupRequired) await refreshAll()
    } catch (caught) {
      setSession(loggedOutSession)
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
      setDisplayModules(homeData.modules)
      setPublicSettings((current) => ({ ...current, ...homeData.settings, ...appearanceData }))
      setNetwork(null)
      let themeToApply = appearanceData.themeId
      try {
        const userOverride = window.localStorage.getItem(USER_THEME_KEY)
        if (userOverride) themeToApply = userOverride
      } catch { /* noop */ }
      void setTheme(themeToApply)
      applyDensity(readDensity())
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
      api<{ pages: PageLink[]; warnings: Array<{ path: string; message: string }> }>('/api/page-manifest-report'),
      api<ActivityEntry[]>('/api/activity'),
    ])
    setAdminSettingsDraft(settingsData)
    setUsers(usersData)
    setAdminModules(modulesData)
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
      setLoginDraft((draft) => ({ ...draft, password: '' }))
      setPasswordSetupDraft({ password: '', confirmPassword: '' })
      if (!next.passwordSetupRequired) {
        await refreshAll()
      }
      if (next.adminUnlocked && !next.passwordSetupRequired) {
        setAdminOpen(true)
        await refreshAdmin()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed')
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }, false)
    setSession(loggedOutSession)
    setHome(null)
    setAdminOpen(false)
    setEditMode(false)
    clearAdminState(setAdminSettingsDraft, setAdminModules, setUsers, setCacheEntries, setActivityEntries, setCustomPages, setPageManifestWarnings, setNetwork)
    setLoginDraft((draft) => ({ ...draft, password: '' }))
    setPasswordSetupDraft({ password: '', confirmPassword: '' })
  }

  async function loadFullNetwork() {
    const data = await api<NetworkOverview>('/api/network')
    setNetwork(data)
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

  async function toggleListStar(list: SharedList) {
    const starred = Boolean(list.metadata?.starred)
    await run(async () => {
      await api(`/api/lists/${list.id}`, {
        method: 'PATCH',
        body: { metadata: { ...list.metadata, starred: !starred } },
      })
      await refreshAll()
    })
  }

  async function createNote(data: { title: string; body: string; tags: string }) {
    if (!data.title.trim() && !data.body.trim()) return
    await run(async () => {
      await api('/api/notes', { method: 'POST', body: data })
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

  async function updateNote(id: string, patch: { title?: string; body?: string; tags?: string; pinned?: boolean }) {
    await run(async () => {
      await api(`/api/notes/${id}`, { method: 'PATCH', body: patch })
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
      const updated = await api<Settings>('/api/settings', { method: 'PUT', body: adminSettingsDraft })
      setAdminSettingsDraft(updated)
      await refreshAll()
    })
  }

  async function useDeviceLocation() {
    if (!navigator.geolocation) {
      addToast('Browser geolocation is unavailable', 'warn')
      return
    }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const timeZone = resolveBrowserTimeZone()
          setAdminSettingsDraft((current) => ({
            ...current,
            latitude: String(position.coords.latitude),
            longitude: String(position.coords.longitude),
            timezone: timeZone || current.timezone,
          }))
          addToast('Filled coordinates from this device')
          resolve()
        },
        () => {
          addToast('Unable to read this device location', 'warn')
          resolve()
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      )
    })
  }

  async function saveAppearance(next: Appearance) {
    await run(async () => {
      void setTheme(next.themeId)
      const updated = await api<Appearance>('/api/appearance', { method: 'PUT', body: next })
      setPublicSettings((current) => ({ ...current, ...updated }))
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

  async function patchUser(user: UserRecord, patch: UserPatch) {
    await run(async () => {
      await api(`/api/users/${user.id}`, { method: 'PATCH', body: patch })
      await refreshAdmin()
    })
  }

  async function setOwnPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (passwordSetupDraft.password !== passwordSetupDraft.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    try {
      const next = await api<Session>('/api/auth/password', {
        method: 'POST',
        body: { password: passwordSetupDraft.password },
      })
      setSession(next)
      setPasswordSetupDraft({ password: '', confirmPassword: '' })
      await refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password update failed')
    }
  }

  async function patchModule(module: Module, patch: Partial<Module> & { deleteData?: boolean }) {
    await run(async () => {
      await api('/api/modules', { method: 'PATCH', body: [{ id: module.id, ...patch }] })
      await refreshAdmin()
      await refreshAll()
    })
  }

  async function batchPatchModules(patches: Array<{ id: string; position: number }>) {
    await run(async () => {
      await api('/api/modules', { method: 'PATCH', body: patches })
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

  function navigate(entry: NavigationEntry) {
    if (entry.target.kind === 'tab') {
      pendingNavigationTargetRef.current = null
      setActiveTab(entry.target.tab)
      return
    }
    if (entry.target.kind === 'admin') {
      pendingNavigationTargetRef.current = null
      void openAdmin()
      return
    }
    const moduleId = entry.target.moduleId
    pendingNavigationTargetRef.current = moduleId
    setAdminOpen(false)
    if (activeTab === 'home' && home && !adminOpen) {
      window.requestAnimationFrame(() => {
        document.getElementById(moduleId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        pendingNavigationTargetRef.current = null
      })
      return
    }
    setActiveTab('home')
  }

  const screen: AppScreen =
    session === null
      ? 'loading'
      : session.passwordSetupRequired
        ? 'password-setup'
        : !session.authenticated
          ? 'login'
          : 'app'

  const adminUnlockExpiresAt = session?.adminUnlockedUntil ? Date.parse(session.adminUnlockedUntil) : NaN
  const adminUnlockRemainingMs = Number.isFinite(adminUnlockExpiresAt) ? Math.max(0, adminUnlockExpiresAt - now) : 0
  const adminUnlockLabel = session?.adminUnlockedUntil ? `Admin ${formatDuration(adminUnlockRemainingMs)} left` : null
  const displayName = session?.displayName || session?.userName || 'there'
  const locationConfigured = isLocationConfigured(publicSettings)
  const listTypes: ListType[] = home?.listTypes ?? []
  const dashboardModules = useMemo(
    () => displayModules.filter((module) => module.installed && module.enabled),
    [displayModules],
  )

  return {
    auth: {
      session,
      setupNeeded,
      loginDraft,
      setLoginDraft,
      passwordSetupDraft,
      setPasswordSetupDraft,
      login,
      logout,
      setOwnPassword,
    },
    shell: {
      screen,
      activeTab,
      setActiveTab,
      adminOpen,
      setAdminOpen,
      settingsOpen,
      setSettingsOpen,
      editMode,
      setEditMode,
      viewedPage,
      publicSettings,
      displayModules,
      dashboardModules,
      error,
      busy,
      adminUnlockLabel,
      adminUnlockRemainingMs,
      displayName,
      now,
      refreshAll,
    },
    navigation: {
      navigationEntries,
      navigate,
      openAdmin,
    },
    adminUnlock: {
      unlockOpen,
      unlockDraft,
      setUnlockDraft,
      unlockAdmin,
      setUnlockOpen,
    },
    home: {
      home,
      locationConfigured,
      listTypes,
    },
    lists: {
      lists,
      listDraft,
      setListDraft,
      itemDrafts,
      setItemDrafts,
      createList,
      createItem,
      toggleItem,
      removeItem,
      removeList,
      toggleListStar,
    },
    notes: {
      notes,
      noteDraft,
      setNoteDraft,
      createNote,
      toggleNote,
      updateNote,
      removeNote,
    },
    pages: {
      pages,
      pageLinks,
      pageDraft,
      setPageDraft,
      linkDraft,
      setLinkDraft,
      createPage,
      removePage,
      createPageLink,
      removePageLink,
    },
    network: {
      network,
      loadFullNetwork,
    },
    admin: {
      adminSettingsDraft,
      setAdminSettingsDraft,
      adminModules,
      users,
      cacheEntries,
      activityEntries,
      customPages,
      pageManifestWarnings,
      userDraft,
      setUserDraft,
      deployment: home?.deployment ?? null,
      saveSettings,
      useDeviceLocation,
      saveAppearance,
      createUser,
      patchUser,
      patchModule,
      batchPatchModules,
      clearCache,
    },
    toasts: {
      toasts,
      addToast,
      dismissToast,
    },
  }
}
