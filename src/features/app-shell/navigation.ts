import type { Module, Tab } from '../../shared/api-types'

export type NavigationTarget =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'admin' }
  | { kind: 'home'; moduleId: string }

export type NavigationEntry = {
  id: string
  label: string
  icon: string
  target: NavigationTarget
}

export const coreNavigation: NavigationEntry[] = [
  { id: 'home', label: 'Home', icon: '🏠', target: { kind: 'tab', tab: 'home' } },
  { id: 'weather', label: 'Weather', icon: '🌦️', target: { kind: 'tab', tab: 'weather' } },
  { id: 'lists', label: 'Lists', icon: '🛒', target: { kind: 'tab', tab: 'lists' } },
  { id: 'notes', label: 'Notes', icon: '📝', target: { kind: 'tab', tab: 'notes' } },
  { id: 'whiteboard', label: 'Whiteboard', icon: '🎨', target: { kind: 'tab', tab: 'whiteboard' } },
  { id: 'pages', label: 'Pages', icon: '🌺', target: { kind: 'tab', tab: 'pages' } },
  { id: 'gallery', label: 'Gallery', icon: '📷', target: { kind: 'tab', tab: 'gallery' } },
  { id: 'network', label: 'Network', icon: '📡', target: { kind: 'tab', tab: 'network' } },
]

export const moduleNavigationTargets: Record<string, NavigationTarget> = {
  lists: { kind: 'tab', tab: 'lists' },
  notes: { kind: 'tab', tab: 'notes' },
  pages: { kind: 'tab', tab: 'pages' },
  network: { kind: 'tab', tab: 'network' },
  whiteboard: { kind: 'tab', tab: 'whiteboard' },
  weather: { kind: 'tab', tab: 'weather' },
  gallery: { kind: 'tab', tab: 'gallery' },
  tides: { kind: 'home', moduleId: 'tides' },
  settings: { kind: 'admin' },
}

export function navigationIconForModule(moduleId: string): string {
  if (moduleId === 'weather') return '🌦️'
  if (moduleId === 'tides') return '🌊'
  if (moduleId === 'settings') return '⚙️'
  if (moduleId === 'whiteboard') return '🎨'
  if (moduleId === 'gallery') return '📷'
  return '▣'
}

export function buildNavigationEntries(modules: Module[]): NavigationEntry[] {
  const byId = new Map(modules.map((m) => [m.id, m]))
  const coreEntries = coreNavigation.filter((entry) => {
    if (entry.id === 'home') return true
    const module = byId.get(entry.id)
    if (entry.id === 'weather') return Boolean(module?.installed && module.enabled)
    return Boolean(module?.installed && module.enabled && module.options.navigationBar?.enabled)
  })
  const extraEntries = modules
    .filter(
      (module) =>
        module.installed &&
        module.enabled &&
        module.options.navigationBar?.enabled &&
        !coreNavigation.some((entry) => entry.id === module.id),
    )
    .map((module) => ({
      id: `module-${module.id}`,
      label: module.title,
      icon: navigationIconForModule(module.id),
      target: moduleNavigationTargets[module.id] ?? ({ kind: 'home', moduleId: module.id } as NavigationTarget),
    }))
  return [...coreEntries, ...extraEntries]
}

export function isNavigationEntryActive(entry: NavigationEntry, activeTab: Tab, adminOpen: boolean): boolean {
  if (entry.target.kind === 'tab') return entry.target.tab === activeTab
  if (entry.target.kind === 'admin') return adminOpen
  return false
}
