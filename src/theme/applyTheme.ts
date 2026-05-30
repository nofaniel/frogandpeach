// Runtime that turns a parsed Theme into CSS custom properties, layout
// data-attributes, and an optional injected stylesheet. Everything is applied to
// the document root (`<html>`) so that the login screen, app shell, modals, and
// toasts all inherit the same tokens, and so a theme can be applied before React
// has rendered (no flash of the base theme).

import type { Theme, ThemeLayout, ThemeTokens } from './types'

const STYLESHEET_ELEMENT_ID = 'theme-stylesheet'

/** Deep-merge a theme over its resolved base (for `extends`). Child values win. */
export function resolveTheme(theme: Theme, base?: Theme | null): Theme {
  if (!base) return theme
  return {
    ...theme,
    tokens: mergeTokens(base.tokens, theme.tokens),
    layout: { ...base.layout, ...theme.layout },
  }
}

function mergeTokens(base: ThemeTokens, child: ThemeTokens): ThemeTokens {
  return {
    color: { ...base.color, ...child.color },
    font: { ...base.font, ...child.font },
    radius: { ...base.radius, ...child.radius },
    shadow: { ...base.shadow, ...child.shadow },
    space: { ...base.space, ...child.space },
  }
}

/**
 * Build the `{ cssVars, dataAttrs }` a theme maps to. Pure and side-effect free so
 * it can be unit tested without a DOM.
 */
export function themeToVars(theme: Theme): { cssVars: Record<string, string>; dataAttrs: Record<string, string> } {
  const cssVars: Record<string, string> = {}
  const { color, font, radius, shadow, space } = theme.tokens

  setVar(cssVars, '--color-bg', color?.bg)
  setVar(cssVars, '--color-surface', color?.surface)
  setVar(cssVars, '--color-surface-2', color?.surface2)
  setVar(cssVars, '--color-ink', color?.ink)
  setVar(cssVars, '--color-muted', color?.muted)
  setVar(cssVars, '--color-line', color?.line)
  setVar(cssVars, '--color-accent', color?.accent)
  setVar(cssVars, '--color-accent-2', color?.accent2)
  setVar(cssVars, '--color-danger', color?.danger)

  setVar(cssVars, '--font-body', font?.body)
  setVar(cssVars, '--font-heading', font?.heading ?? font?.body)
  setVar(cssVars, '--font-mono', font?.mono)

  setVar(cssVars, '--radius-sm', radius?.sm)
  setVar(cssVars, '--radius-md', radius?.md)
  setVar(cssVars, '--radius-lg', radius?.lg)

  setVar(cssVars, '--shadow-panel', shadow?.panel)

  if (typeof space?.scale === 'number') cssVars['--space-scale'] = String(space.scale)

  const layout: ThemeLayout = theme.layout
  if (typeof layout.dashboardColumns === 'number') cssVars['--dashboard-columns'] = String(layout.dashboardColumns)
  setVar(cssVars, '--shell-width', layout.shellWidth)
  setVar(cssVars, '--app-body-background', layout.bodyBackground)

  const dataAttrs: Record<string, string> = {
    'data-nav': layout.navigation ?? 'top',
    'data-density': layout.density ?? 'comfortable',
    'data-surface': layout.surface ?? 'card',
    'data-theme-id': theme.id,
  }

  return { cssVars, dataAttrs }
}

function setVar(target: Record<string, string>, name: string, value: string | undefined) {
  if (typeof value === 'string' && value) target[name] = value
}

/** Apply a resolved theme to the document (or a provided root, for tests). */
export function applyTheme(theme: Theme, options: { root?: HTMLElement; doc?: Document } = {}) {
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : undefined)
  const root = options.root ?? doc?.documentElement
  if (!root) return

  const { cssVars, dataAttrs } = themeToVars(theme)

  // Clear previously-set theme vars so switching themes does not leak stale values.
  for (const name of Array.from(root.style)) {
    if (name.startsWith('--color-') || name.startsWith('--font-') || name.startsWith('--radius-') || name.startsWith('--shadow-') || name === '--space-scale' || name === '--dashboard-columns' || name === '--shell-width' || name === '--app-body-background') {
      root.style.removeProperty(name)
    }
  }
  for (const [name, value] of Object.entries(cssVars)) root.style.setProperty(name, value)
  for (const [name, value] of Object.entries(dataAttrs)) root.setAttribute(name, value)

  if (doc) injectStylesheet(doc, theme)
}

function injectStylesheet(doc: Document, theme: Theme) {
  const existing = doc.getElementById(STYLESHEET_ELEMENT_ID) as HTMLLinkElement | null
  if (!theme.stylesheet) {
    existing?.remove()
    return
  }
  const href = `/themes/${theme.id}/${theme.stylesheet.replace(/^\/+/, '')}`
  const link = existing ?? doc.createElement('link')
  link.id = STYLESHEET_ELEMENT_ID
  link.rel = 'stylesheet'
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
  if (!existing) doc.head.appendChild(link)
}
