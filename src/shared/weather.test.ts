import { describe, expect, it } from 'vitest'
import { formatCurrentPrecipitationMm } from './weather'

describe('weather precipitation formatting', () => {
  it('formats current precipitation as millimetres', () => {
    expect(formatCurrentPrecipitationMm(1.4)).toBe('1 mm')
    expect(formatCurrentPrecipitationMm(0)).toBe('0 mm')
    expect(formatCurrentPrecipitationMm(null)).toBe('-- mm')
  })
})
