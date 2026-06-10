export function formatCurrentPrecipitationMm(value: number | null | undefined) {
  return value === null || value === undefined ? '-- mm' : `${Math.round(value)} mm`
}

export type UvLevel = 'Low' | 'Moderate' | 'High' | 'Very high' | 'Extreme'

export function uvLevel(value: number | null | undefined): UvLevel | null {
  if (value === null || value === undefined || value < 0) return null
  if (value < 3) return 'Low'
  if (value <= 5) return 'Moderate'
  if (value <= 7) return 'High'
  if (value <= 10) return 'Very high'
  return 'Extreme'
}

export type AirQualityLevel = 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very poor' | 'Extremely poor'

export function airQualityLevel(europeanAqi: number | null | undefined): AirQualityLevel | null {
  if (europeanAqi === null || europeanAqi === undefined) return null
  if (europeanAqi <= 20) return 'Good'
  if (europeanAqi <= 40) return 'Fair'
  if (europeanAqi <= 60) return 'Moderate'
  if (europeanAqi <= 80) return 'Poor'
  if (europeanAqi <= 100) return 'Very poor'
  return 'Extremely poor'
}

export type PollenLevel = 'Low' | 'Moderate' | 'High'

export function pollenLevel(grainsPerM3: number | null | undefined): PollenLevel | null {
  if (grainsPerM3 === null || grainsPerM3 === undefined) return null
  if (grainsPerM3 < 30) return 'Low'
  if (grainsPerM3 < 60) return 'Moderate'
  return 'High'
}

const POLLEN_KEYS = ['grass', 'birch', 'alder', 'mugwort', 'olive', 'ragweed'] as const

export function overallPollenLevel(allergens: { [key: string]: unknown }): PollenLevel | null {
  let highest: PollenLevel | null = null
  const order: PollenLevel[] = ['Low', 'Moderate', 'High']
  for (const key of POLLEN_KEYS) {
    const value = typeof allergens[key] === 'number' ? allergens[key] as number : null
    const level = pollenLevel(value)
    if (level && (!highest || order.indexOf(level) > order.indexOf(highest))) {
      highest = level
    }
  }
  return highest
}

export function pollenAvailable(allergens: { [key: string]: unknown }): boolean {
  return POLLEN_KEYS.some((key) => typeof allergens[key] === 'number' && allergens[key] !== null)
}
