// Theme system types and validators.
//
// A theme is a folder under `themes/<id>/` containing a `theme.json` manifest and
// an optional `theme.css`. Themes control visual tokens (colour, font, radius,
// shadow, spacing) and a declarative layout config (navigation placement, density,
// surface treatment, dashboard columns, shell width, body background). No theme
// ever ships executable JavaScript — everything is data, mapped to CSS custom
// properties and data-attributes at runtime by `applyTheme`.

export const DEFAULT_THEME_ID = 'base'

export type ThemeColorTokens = {
  bg?: string
  surface?: string
  surface2?: string
  ink?: string
  muted?: string
  line?: string
  accent?: string
  accent2?: string
  danger?: string
}

export type ThemeFontTokens = {
  body?: string
  heading?: string
  mono?: string
}

export type ThemeRadiusTokens = {
  sm?: string
  md?: string
  lg?: string
}

export type ThemeShadowTokens = {
  panel?: string
}

export type ThemeSpaceTokens = {
  scale?: number
}

export type ThemeTokens = {
  color?: ThemeColorTokens
  font?: ThemeFontTokens
  radius?: ThemeRadiusTokens
  shadow?: ThemeShadowTokens
  space?: ThemeSpaceTokens
}

export type ThemeNavigation = 'top' | 'side'
export type ThemeDensity = 'comfortable' | 'compact'
export type ThemeSurface = 'card' | 'flat' | 'outline'

export type ThemeLayout = {
  navigation?: ThemeNavigation
  density?: ThemeDensity
  surface?: ThemeSurface
  dashboardColumns?: number
  shellWidth?: string
  bodyBackground?: string
}

export type Theme = {
  id: string
  name: string
  author: string
  version: string
  extends?: string
  tokens: ThemeTokens
  layout: ThemeLayout
  /** Relative path to an optional stylesheet, resolved against `/themes/<id>/`. */
  stylesheet?: string
}

export type ThemeManifestEntry = {
  id: string
  name: string
  author: string
  version: string
}

export type ThemeManifest = {
  themes: ThemeManifestEntry[]
  warnings: Array<{ path: string; message: string }>
}

const NAVIGATIONS: ThemeNavigation[] = ['top', 'side']
const DENSITIES: ThemeDensity[] = ['comfortable', 'compact']
const SURFACES: ThemeSurface[] = ['card', 'flat', 'outline']

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function pickEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === 'string' && (allowed as string[]).includes(value) ? (value as T) : undefined
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseTokens(input: unknown): ThemeTokens {
  if (!isObject(input)) return {}
  const tokens: ThemeTokens = {}
  if (isObject(input.color)) tokens.color = pickStringMap<ThemeColorTokens>(input.color, ['bg', 'surface', 'surface2', 'ink', 'muted', 'line', 'accent', 'accent2', 'danger'])
  if (isObject(input.font)) tokens.font = pickStringMap<ThemeFontTokens>(input.font, ['body', 'heading', 'mono'])
  if (isObject(input.radius)) tokens.radius = pickStringMap<ThemeRadiusTokens>(input.radius, ['sm', 'md', 'lg'])
  if (isObject(input.shadow)) tokens.shadow = pickStringMap<ThemeShadowTokens>(input.shadow, ['panel'])
  if (isObject(input.space) && typeof input.space.scale === 'number' && Number.isFinite(input.space.scale)) {
    tokens.space = { scale: input.space.scale }
  }
  return tokens
}

function pickStringMap<T>(input: Record<string, unknown>, keys: Array<keyof T & string>): T {
  const out = {} as T
  for (const key of keys) {
    const value = input[key]
    if (typeof value === 'string' && value) out[key] = value as T[keyof T & string]
  }
  return out
}

function parseLayout(input: unknown): ThemeLayout {
  if (!isObject(input)) return {}
  const layout: ThemeLayout = {}
  const navigation = pickEnum(input.navigation, NAVIGATIONS)
  if (navigation) layout.navigation = navigation
  const density = pickEnum(input.density, DENSITIES)
  if (density) layout.density = density
  const surface = pickEnum(input.surface, SURFACES)
  if (surface) layout.surface = surface
  if (typeof input.dashboardColumns === 'number' && Number.isFinite(input.dashboardColumns)) {
    layout.dashboardColumns = Math.max(1, Math.min(6, Math.round(input.dashboardColumns)))
  }
  const shellWidth = optionalStr(input.shellWidth)
  if (shellWidth) layout.shellWidth = shellWidth
  const bodyBackground = optionalStr(input.bodyBackground)
  if (bodyBackground) layout.bodyBackground = bodyBackground
  return layout
}

/**
 * Parse a `theme.json` payload into a `Theme`, tolerating malformed input.
 * Returns null only when there is no usable id.
 */
export function parseTheme(payload: unknown): Theme | null {
  if (!isObject(payload)) return null
  const id = str(payload.id).trim()
  if (!id) return null
  return {
    id,
    name: str(payload.name).trim() || id,
    author: str(payload.author).trim() || 'Unknown',
    version: str(payload.version).trim() || '0.0.0',
    extends: optionalStr(payload.extends),
    tokens: parseTokens(payload.tokens),
    layout: parseLayout(payload.layout),
    stylesheet: optionalStr(payload.stylesheet),
  }
}

/** Parse a `/themes/manifest.json` payload, collecting warnings for malformed entries. */
export function parseThemeManifest(payload: unknown): ThemeManifest {
  if (!isObject(payload) || !Array.isArray(payload.themes)) {
    return { themes: [], warnings: [{ path: '/themes/manifest.json', message: 'Manifest is malformed or missing a themes array.' }] }
  }
  const warnings = Array.isArray(payload.warnings)
    ? (payload.warnings as Array<{ path?: unknown; message?: unknown }>).map((warning) => ({ path: str(warning.path), message: str(warning.message) }))
    : []

  const themes: ThemeManifestEntry[] = []
  for (const entry of payload.themes as unknown[]) {
    if (!isObject(entry) || !entry.id) {
      warnings.push({ path: str((entry as Record<string, unknown> | undefined)?.id, 'unknown'), message: 'Theme entry is missing an id.' })
      continue
    }
    const id = str(entry.id).trim()
    themes.push({
      id,
      name: str(entry.name).trim() || id,
      author: str(entry.author).trim() || 'Unknown',
      version: str(entry.version).trim() || '0.0.0',
    })
  }
  return { themes, warnings }
}
