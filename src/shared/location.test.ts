import { describe, expect, it } from 'vitest'
import { formatLocationLabel, isLocationConfigured, resolveBrowserTimeZone } from './location'

describe('location helpers', () => {
  it('treats blank settings as unconfigured', () => {
    expect(isLocationConfigured({ latitude: '', longitude: '', timezone: '' })).toBe(false)
    expect(isLocationConfigured({ latitude: '50.4155', longitude: '-5.0737', timezone: '' })).toBe(false)
    expect(isLocationConfigured({ latitude: '95', longitude: '-5.0737', timezone: 'Europe/London' })).toBe(false)
  })

  it('accepts valid latitude, longitude, and timezone values', () => {
    expect(isLocationConfigured({ latitude: '50.4155', longitude: '-5.0737', timezone: 'Europe/London' })).toBe(true)
  })

  it('falls back to a neutral weather label when no location name is set', () => {
    expect(formatLocationLabel({ locationName: '', locationRegion: '' })).toBe('Local weather')
    expect(formatLocationLabel({ locationName: 'Home', locationRegion: 'Cornwall' })).toBe('Home, Cornwall')
  })

  it('returns a browser time zone when available', () => {
    expect(() => resolveBrowserTimeZone()).not.toThrow()
  })
})
