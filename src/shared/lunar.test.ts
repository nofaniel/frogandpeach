import { describe, expect, it } from 'vitest'
import { computeLunarInfo, formatDaysUntilNext, formatIllumination } from './lunar'

describe('computeLunarInfo', () => {
  it('returns valid phase for known new moon (Jan 6 2000)', () => {
    const info = computeLunarInfo(new Date('2000-01-06T18:14:00Z'))
    expect(info.name).toBe('New Moon')
    // Phase wraps at 1.0 — near 0 or near 1 both mean new moon
    const nearZero = info.phase < 0.05 || info.phase > 0.95
    expect(nearZero).toBe(true)
    expect(info.illumination).toBeLessThan(0.05)
  })

  it('returns valid phase for known full moon (Jan 21 2000)', () => {
    const info = computeLunarInfo(new Date('2000-01-21T04:00:00Z'))
    expect(info.name).toBe('Full Moon')
    expect(info.phase).toBeGreaterThan(0.45)
    expect(info.phase).toBeLessThan(0.55)
    expect(info.illumination).toBeGreaterThan(0.9)
  })

  it('returns valid phase for known first quarter', () => {
    const info = computeLunarInfo(new Date('2000-01-14T00:00:00Z'))
    expect(info.name).toBe('First Quarter')
    expect(info.phase).toBeGreaterThan(0.2)
    expect(info.phase).toBeLessThan(0.3)
  })

  it('returns valid phase for known last quarter', () => {
    const info = computeLunarInfo(new Date('2000-01-28T18:00:00Z'))
    expect(info.name).toBe('Last Quarter')
    expect(info.phase).toBeGreaterThan(0.7)
    expect(info.phase).toBeLessThan(0.8)
  })

  it('returns waxing orientation for first half of cycle', () => {
    const info = computeLunarInfo(new Date('2000-01-14T00:00:00Z'))
    expect(info.orientation).toBe('waxing')
  })

  it('returns waning orientation for second half of cycle', () => {
    const info = computeLunarInfo(new Date('2000-01-28T18:00:00Z'))
    expect(info.orientation).toBe('waning')
  })

  it('returns illumination between 0 and 1', () => {
    const info = computeLunarInfo(new Date())
    expect(info.illumination).toBeGreaterThanOrEqual(0)
    expect(info.illumination).toBeLessThanOrEqual(1)
  })

  it('returns valid age in range 0..29.53', () => {
    const info = computeLunarInfo(new Date())
    expect(info.age).toBeGreaterThanOrEqual(0)
    expect(info.age).toBeLessThan(29.53058867)
  })

  it('returns daysUntilNextPhase between 0 and ~3.7', () => {
    const info = computeLunarInfo(new Date())
    expect(info.daysUntilNextPhase).toBeGreaterThan(0)
    expect(info.daysUntilNextPhase).toBeLessThan(4)
  })

  it('returns nextPhaseName as a valid phase name', () => {
    const validNames = [
      'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
      'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
    ]
    const info = computeLunarInfo(new Date())
    expect(validNames).toContain(info.nextPhaseName)
  })

  it('nextPhaseDate is a valid ISO date', () => {
    const info = computeLunarInfo(new Date())
    expect(() => new Date(info.nextPhaseDate)).not.toThrow()
    expect(new Date(info.nextPhaseDate).getTime()).toBeGreaterThan(0)
  })
})

describe('formatIllumination', () => {
  it('formats 0 as 0%', () => {
    expect(formatIllumination(0)).toBe('0%')
  })

  it('formats 0.5 as 50%', () => {
    expect(formatIllumination(0.5)).toBe('50%')
  })

  it('formats 1 as 100%', () => {
    expect(formatIllumination(1)).toBe('100%')
  })

  it('rounds to nearest integer', () => {
    expect(formatIllumination(0.732)).toBe('73%')
  })
})

describe('formatDaysUntilNext', () => {
  it('returns "later today" for < 1 day', () => {
    expect(formatDaysUntilNext(0.5)).toBe('later today')
  })

  it('returns "tomorrow" for 1–1.5 days', () => {
    expect(formatDaysUntilNext(1)).toBe('tomorrow')
    expect(formatDaysUntilNext(1.4)).toBe('tomorrow')
  })

  it('returns "in N days" for 1.5+ days', () => {
    expect(formatDaysUntilNext(2.3)).toBe('in 2 days')
    expect(formatDaysUntilNext(3.7)).toBe('in 4 days')
  })
})
