import { describe, expect, it } from 'vitest'
import { airQualityLevel, overallPollenLevel, pollenAvailable, pollenLevel, uvLevel } from './weather'

describe('uvLevel', () => {
  it('returns Low for values under 3', () => {
    expect(uvLevel(0)).toBe('Low')
    expect(uvLevel(2.9)).toBe('Low')
  })
  it('returns Moderate for 3–5', () => {
    expect(uvLevel(3)).toBe('Moderate')
    expect(uvLevel(5)).toBe('Moderate')
  })
  it('returns High for 6–7', () => {
    expect(uvLevel(6)).toBe('High')
    expect(uvLevel(7)).toBe('High')
  })
  it('returns Very high for 8–10', () => {
    expect(uvLevel(8)).toBe('Very high')
    expect(uvLevel(10)).toBe('Very high')
  })
  it('returns Extreme for 11+', () => {
    expect(uvLevel(11)).toBe('Extreme')
    expect(uvLevel(15)).toBe('Extreme')
  })
  it('returns null for null, undefined, or negative', () => {
    expect(uvLevel(null)).toBeNull()
    expect(uvLevel(undefined)).toBeNull()
    expect(uvLevel(-1)).toBeNull()
  })
})

describe('airQualityLevel', () => {
  it('returns Good for ≤20', () => {
    expect(airQualityLevel(0)).toBe('Good')
    expect(airQualityLevel(20)).toBe('Good')
  })
  it('returns Fair for 21–40', () => {
    expect(airQualityLevel(21)).toBe('Fair')
    expect(airQualityLevel(40)).toBe('Fair')
  })
  it('returns Moderate for 41–60', () => {
    expect(airQualityLevel(41)).toBe('Moderate')
    expect(airQualityLevel(60)).toBe('Moderate')
  })
  it('returns Poor for 61–80', () => {
    expect(airQualityLevel(61)).toBe('Poor')
    expect(airQualityLevel(80)).toBe('Poor')
  })
  it('returns Very poor for 81–100', () => {
    expect(airQualityLevel(81)).toBe('Very poor')
    expect(airQualityLevel(100)).toBe('Very poor')
  })
  it('returns Extremely poor for >100', () => {
    expect(airQualityLevel(101)).toBe('Extremely poor')
  })
  it('returns null for null/undefined', () => {
    expect(airQualityLevel(null)).toBeNull()
    expect(airQualityLevel(undefined)).toBeNull()
  })
})

describe('pollenLevel', () => {
  it('returns Low for <30 grains/m³', () => {
    expect(pollenLevel(0)).toBe('Low')
    expect(pollenLevel(29)).toBe('Low')
  })
  it('returns Moderate for 30–59', () => {
    expect(pollenLevel(30)).toBe('Moderate')
    expect(pollenLevel(59)).toBe('Moderate')
  })
  it('returns High for ≥60', () => {
    expect(pollenLevel(60)).toBe('High')
    expect(pollenLevel(100)).toBe('High')
  })
  it('returns null for null/undefined', () => {
    expect(pollenLevel(null)).toBeNull()
    expect(pollenLevel(undefined)).toBeNull()
  })
})

describe('overallPollenLevel', () => {
  it('returns the highest level across all allergens', () => {
    expect(overallPollenLevel({ grass: 10, birch: 35, alder: 5 })).toBe('Moderate')
  })
  it('returns null when all allergens are null', () => {
    expect(overallPollenLevel({ grass: null, birch: null, alder: null, mugwort: null, olive: null, ragweed: null })).toBeNull()
  })
  it('returns a level when at least one allergen has a value', () => {
    expect(overallPollenLevel({ grass: null, birch: null, alder: null, mugwort: null, olive: null, ragweed: 70 })).toBe('High')
  })
})

describe('pollenAvailable', () => {
  it('returns true when any allergen has a non-null value', () => {
    expect(pollenAvailable({ grass: null, birch: 5 })).toBe(true)
  })
  it('returns false when all allergens are null', () => {
    expect(pollenAvailable({ grass: null, birch: null, alder: null, mugwort: null, olive: null, ragweed: null })).toBe(false)
  })
})
