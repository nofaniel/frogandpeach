export type LocationCoordinates = {
  latitude: string
  longitude: string
  timezone: string
}

export type LocationLabel = {
  locationName: string
  locationRegion: string
}

export function isLocationConfigured(location: LocationCoordinates | null | undefined): boolean {
  if (!location) return false

  const latitude = Number(String(location.latitude ?? '').trim())
  const longitude = Number(String(location.longitude ?? '').trim())
  const timezone = String(location.timezone ?? '').trim()

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false
  if (!timezone) return false

  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export function formatLocationLabel(location: Partial<LocationLabel> | null | undefined): string {
  if (!location) return 'Local weather'

  const parts = [String(location.locationName ?? '').trim(), String(location.locationRegion ?? '').trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Local weather'
}

export function resolveBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    return ''
  }
}
