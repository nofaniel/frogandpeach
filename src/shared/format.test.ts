import { describe, expect, it } from 'vitest'
import { formatTideCountdown, formatTideTime, weatherIcon } from './format'

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

describe('formatTideCountdown', () => {
  it('returns Due now for less than 1 minute', () => {
    expect(formatTideCountdown(0)).toBe('Due now')
    expect(formatTideCountdown(30000)).toBe('Due now')
  })

  it('returns minutes only for sub-hour durations', () => {
    expect(formatTideCountdown(60000)).toBe('1m')
    expect(formatTideCountdown(35 * 60000)).toBe('35m')
    expect(formatTideCountdown(59 * 60000)).toBe('59m')
  })

  it('returns hours and minutes for multi-hour durations', () => {
    expect(formatTideCountdown(60 * 60000)).toBe('1h 0m')
    expect(formatTideCountdown(2 * 60 * 60000 + 10 * 60000)).toBe('2h 10m')
  })

  it('returns days and hours for day-scale durations', () => {
    expect(formatTideCountdown(24 * 60 * 60000)).toBe('1d 0h')
    expect(formatTideCountdown(27 * 60 * 60000)).toBe('1d 3h')
  })
})
