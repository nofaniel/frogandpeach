import { describe, expect, it } from 'vitest'
import { normaliseThemeId, parseCustomPageManifest, parseCustomPageManifestReport } from './data'

describe('settings validation', () => {
  it('accepts slug-shaped theme ids and falls back to base otherwise', () => {
    expect(normaliseThemeId('coastal')).toBe('coastal')
    expect(normaliseThemeId('Mono-Dark')).toBe('mono-dark')
    expect(normaliseThemeId('')).toBe('base')
    expect(normaliseThemeId('../etc/passwd')).toBe('base')
    expect(normaliseThemeId('has spaces')).toBe('base')
  })
})

describe('custom page manifest parsing', () => {
  it('keeps valid pages and normalises relative hrefs', () => {
    expect(
      parseCustomPageManifest({
        pages: [
          { id: 'rules', title: 'House rules', href: 'rules/index.html', description: 'Shared house page' },
          { title: '', href: 'missing-title.html' },
          { title: 'External', href: 'https://example.com' },
        ],
      }),
    ).toEqual([
      { id: 'rules', title: 'House rules', href: '/custom-pages/rules/index.html', description: 'Shared house page', kind: 'custom' },
      { id: 'https://example.com', title: 'External', href: 'https://example.com', description: '', kind: 'custom' },
    ])
  })

  it('returns an empty list for malformed manifests', () => {
    expect(parseCustomPageManifest(null)).toEqual([])
    expect(parseCustomPageManifest({ pages: 'nope' })).toEqual([])
  })

  it('returns validation warnings for generated manifest issues', () => {
    expect(
      parseCustomPageManifestReport({
        pages: [{ title: 'Missing href' }],
        warnings: [{ path: 'bad/page.json', message: 'page.json is not valid JSON.' }],
      }),
    ).toEqual({
      pages: [],
      warnings: [
        { path: 'bad/page.json', message: 'page.json is not valid JSON.' },
        { path: 'unknown', message: 'Manifest page is missing title or href.' },
      ],
    })
  })
})
