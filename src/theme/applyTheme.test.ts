import { describe, expect, it } from 'vitest'
import { resolveTheme, themeToVars } from './applyTheme'
import type { Theme } from './types'

function makeTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    id: 'demo',
    name: 'Demo',
    author: 'Tester',
    version: '1.0.0',
    tokens: {},
    layout: {},
    ...overrides,
  }
}

describe('themeToVars', () => {
  it('maps tokens to CSS custom properties', () => {
    const { cssVars } = themeToVars(
      makeTheme({
        tokens: {
          color: { bg: '#fff', accent: '#f00', accent2: '#0f0' },
          font: { body: 'Georgia' },
          radius: { md: '8px' },
          shadow: { panel: 'none' },
          space: { scale: 1.25 },
        },
      }),
    )
    expect(cssVars['--color-bg']).toBe('#fff')
    expect(cssVars['--color-accent']).toBe('#f00')
    expect(cssVars['--color-accent-2']).toBe('#0f0')
    expect(cssVars['--font-body']).toBe('Georgia')
    // heading falls back to body when unset
    expect(cssVars['--font-heading']).toBe('Georgia')
    expect(cssVars['--radius-md']).toBe('8px')
    expect(cssVars['--shadow-panel']).toBe('none')
    expect(cssVars['--space-scale']).toBe('1.25')
  })

  it('maps layout to data-attributes with sensible defaults', () => {
    const { dataAttrs } = themeToVars(makeTheme({ id: 'x', layout: { navigation: 'side', density: 'compact' } }))
    expect(dataAttrs['data-nav']).toBe('side')
    expect(dataAttrs['data-density']).toBe('compact')
    expect(dataAttrs['data-surface']).toBe('card')
    expect(dataAttrs['data-theme-id']).toBe('x')
  })
})

describe('resolveTheme', () => {
  it('deep-merges a child theme over its base, with child winning', () => {
    const base = makeTheme({ id: 'base', tokens: { color: { bg: '#000', ink: '#fff' } }, layout: { navigation: 'top', density: 'comfortable' } })
    const child = makeTheme({ id: 'child', extends: 'base', tokens: { color: { bg: '#111' } }, layout: { density: 'compact' } })
    const resolved = resolveTheme(child, base)
    expect(resolved.id).toBe('child')
    expect(resolved.tokens.color?.bg).toBe('#111') // overridden
    expect(resolved.tokens.color?.ink).toBe('#fff') // inherited
    expect(resolved.layout.navigation).toBe('top') // inherited
    expect(resolved.layout.density).toBe('compact') // overridden
  })

  it('returns the theme unchanged when there is no base', () => {
    const theme = makeTheme()
    expect(resolveTheme(theme, null)).toBe(theme)
  })
})
