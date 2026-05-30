import { describe, expect, it } from 'vitest'
import { parseTheme, parseThemeManifest } from './types'

describe('parseTheme', () => {
  it('parses a well-formed theme and fills defaults', () => {
    const theme = parseTheme({
      id: 'frog-peach',
      name: 'Frog & Peach',
      author: 'F&P',
      version: '1.0.0',
      extends: 'base',
      stylesheet: 'theme.css',
      tokens: { color: { bg: '#f3eee4' }, space: { scale: 1 } },
      layout: { navigation: 'top', dashboardColumns: 3 },
    })
    expect(theme).not.toBeNull()
    expect(theme?.id).toBe('frog-peach')
    expect(theme?.extends).toBe('base')
    expect(theme?.tokens.color?.bg).toBe('#f3eee4')
    expect(theme?.layout.dashboardColumns).toBe(3)
  })

  it('drops unknown enum values and clamps dashboard columns', () => {
    const theme = parseTheme({ id: 'x', layout: { navigation: 'diagonal', dashboardColumns: 99 } })
    expect(theme?.layout.navigation).toBeUndefined()
    expect(theme?.layout.dashboardColumns).toBe(6)
  })

  it('returns null without a usable id', () => {
    expect(parseTheme({ name: 'No id' })).toBeNull()
    expect(parseTheme(null)).toBeNull()
  })
})

describe('parseThemeManifest', () => {
  it('keeps valid entries and warns on malformed ones', () => {
    const manifest = parseThemeManifest({
      themes: [
        { id: 'base', name: 'Base', author: 'F&P', version: '1.0.0' },
        { name: 'No id' },
      ],
    })
    expect(manifest.themes).toEqual([{ id: 'base', name: 'Base', author: 'F&P', version: '1.0.0' }])
    expect(manifest.warnings).toHaveLength(1)
  })

  it('warns when the manifest shape is wrong', () => {
    expect(parseThemeManifest(null).themes).toEqual([])
    expect(parseThemeManifest({ themes: 'nope' }).warnings).toHaveLength(1)
  })
})
