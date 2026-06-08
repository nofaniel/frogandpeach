import { describe, expect, it } from 'vitest'
import { formatTideTime, weatherIcon } from './format'

describe('weatherIcon', () => {
  it('returns rain emoji for Rain label', () => {
    expect(weatherIcon('Rain')).toBe('\u{1F327}\uFE0F')
  })

  it('returns rain emoji for Drizzle label', () => {
    expect(weatherIcon('Drizzle')).toBe('\u{1F327}\uFE0F')
  })

  it('returns thunder emoji for Thunder label', () => {
    expect(weatherIcon('Thunder')).toBe('\u26C8\uFE0F')
  })

  it('returns snow emoji for Snow label', () => {
    expect(weatherIcon('Snow')).toBe('\u2744\uFE0F')
  })

  it('returns fog emoji for Foggy label', () => {
    expect(weatherIcon('Foggy')).toBe('\u{1F32B}\uFE0F')
  })

  it('returns sun emoji for Clear label', () => {
    expect(weatherIcon('Clear')).toBe('\u2600\uFE0F')
  })

  it('returns cloud emoji for Cloudy spells label', () => {
    expect(weatherIcon('Cloudy spells')).toBe('\u{1F325}\uFE0F')
  })

  it('returns default partly-cloudy emoji for Changeable label', () => {
    expect(weatherIcon('Changeable')).toBe('\u{1F324}\uFE0F')
  })

  it('returns default partly-cloudy emoji when label is undefined', () => {
    expect(weatherIcon(undefined)).toBe('\u{1F324}\uFE0F')
  })

  it('is case-insensitive', () => {
    expect(weatherIcon('RAIN')).toBe('\u{1F327}\uFE0F')
    expect(weatherIcon('clear skies')).toBe('\u2600\uFE0F')
  })
})

describe('formatTideTime', () => {
  it('formats tide times with AM/PM', () => {
    // Use a fixed noon timestamp — result should contain AM or PM regardless of local timezone
    const result = formatTideTime('2024-06-15T12:00:00Z')
    expect(result).toMatch(/AM|PM/i)
  })

  it('formats midnight-adjacent times with AM/PM', () => {
    const result = formatTideTime('2024-06-15T00:30:00Z')
    expect(result).toMatch(/AM|PM/i)
  })

  it('includes minutes in the output', () => {
    const result = formatTideTime('2024-06-15T14:45:00Z')
    expect(result).toMatch(/:\d{2}/)
  })
})
