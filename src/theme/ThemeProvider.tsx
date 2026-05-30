// React context that loads the theme manifest, resolves the active theme (handling
// `extends`), applies it to the document, and exposes a `setTheme` action. The
// active theme id is driven by the server's appearance setting, but is also cached
// in localStorage so the inline boot script in index.html can paint the right
// theme before React mounts (no flash of the base theme).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { applyTheme, resolveTheme, themeToVars } from './applyTheme'
import { DEFAULT_THEME_ID, parseTheme, parseThemeManifest, type Theme, type ThemeManifestEntry } from './types'

export const THEME_STORAGE_KEY = 'fp-theme-id'
export const THEME_SNAPSHOT_KEY = 'fp-theme-snapshot'

type ThemeContextValue = {
  themes: ThemeManifestEntry[]
  themeId: string
  theme: Theme | null
  loading: boolean
  setTheme: (id: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

async function fetchTheme(id: string): Promise<Theme | null> {
  try {
    const response = await fetch(`/themes/${id}/theme.json`)
    if (!response.ok) return null
    return parseTheme(await response.json())
  } catch {
    return null
  }
}

async function fetchManifest(): Promise<ThemeManifestEntry[]> {
  try {
    const response = await fetch('/themes/manifest.json')
    if (!response.ok) return []
    return parseThemeManifest(await response.json()).themes
  } catch {
    return []
  }
}

/** Persist a snapshot so the index.html boot script can repaint instantly next load. */
function cacheSnapshot(id: string, theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id)
    window.localStorage.setItem(THEME_SNAPSHOT_KEY, JSON.stringify(themeToVars(theme)))
  } catch {
    // localStorage may be unavailable; non-fatal.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initialId = (() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID
    } catch {
      return DEFAULT_THEME_ID
    }
  })()

  const [themes, setThemes] = useState<ThemeManifestEntry[]>([])
  const [themeId, setThemeId] = useState(initialId)
  const [theme, setActiveTheme] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(true)
  const cacheRef = useRef(new Map<string, Theme>())

  // Resolve a theme and its `extends` chain (e.g. coastal -> frog-peach -> base),
  // deep-merging parents under children. Guards against cycles and caches results.
  const resolveChain = useCallback(async (id: string, seen: Set<string>): Promise<Theme | null> => {
    const cache = cacheRef.current
    const cached = cache.get(id)
    if (cached) return cached
    if (seen.has(id)) return null
    seen.add(id)
    const loaded = await fetchTheme(id)
    if (!loaded) return null
    const parent = loaded.extends && loaded.extends !== id ? await resolveChain(loaded.extends, seen) : null
    const resolved = resolveTheme(loaded, parent)
    cache.set(id, resolved)
    return resolved
  }, [])

  const loadTheme = useCallback(
    async (id: string) => {
      const resolved = (await resolveChain(id, new Set())) ?? (await resolveChain(DEFAULT_THEME_ID, new Set()))
      if (!resolved) return
      applyTheme(resolved)
      cacheSnapshot(resolved.id, resolved)
      setActiveTheme(resolved)
      setThemeId(resolved.id)
    },
    [resolveChain],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [manifest] = await Promise.all([fetchManifest(), loadTheme(initialId)])
      if (cancelled) return
      setThemes(manifest)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // initialId/loadTheme are stable for the provider lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTheme = useCallback(
    async (id: string) => {
      if (id === themeId && theme) return
      await loadTheme(id)
    },
    [loadTheme, themeId, theme],
  )

  const value = useMemo<ThemeContextValue>(() => ({ themes, themeId, theme, loading, setTheme }), [themes, themeId, theme, loading, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
