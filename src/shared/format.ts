import type { ListType, PageLink, TideSummary } from './api-types'

export function labelForListType(value: string, listTypes: ListType[]) {
  return listTypes.find((type) => type.id === value)?.title ?? value
}

export function formatTemperature(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${Math.round(value)}\u00b0`
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : Math.round(value).toString()
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatTideTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
}

export function formatDayDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value))
}

export function formatTideEventLabel(type: 'high' | 'low') {
  return type === 'high' ? 'High tide' : 'Low tide'
}

export function formatTideHeight(height: number | null) {
  return height === null ? 'Height unavailable' : `${height.toFixed(1)} m`
}

export function formatTideDayBadge(index: number) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return `Day ${index + 1}`
}

export function groupTideDays(events: TideSummary['events'], maxDays: number) {
  const dayMap = new Map<string, { key: string; label: string; events: TideSummary['events'] }>()

  for (const event of events) {
    const key = new Date(event.time).toDateString()
    const current = dayMap.get(key)
    if (current) {
      current.events.push(event)
      continue
    }

    dayMap.set(key, {
      key,
      label: formatDayDate(event.time),
      events: [event],
    })
  }

  return Array.from(dayMap.values()).slice(0, maxDays)
}

export function formatFullDateTime(value: number) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function weatherIcon(label: string | undefined) {
  const value = label?.toLowerCase() ?? ''
  if (value.includes('rain') || value.includes('drizzle')) return '\u{1F327}\uFE0F'   // 🌧️
  if (value.includes('thunder') || value.includes('storm')) return '\u26C8\uFE0F'     // ⛈️
  if (value.includes('snow') || value.includes('blizzard')) return '\u2744\uFE0F'     // ❄️
  if (value.includes('fog') || value.includes('mist')) return '\u{1F32B}\uFE0F'       // 🌫️
  if (value.includes('clear') || value.includes('sun')) return '\u2600\uFE0F'         // ☀️
  if (value.includes('cloud')) return '\u{1F325}\uFE0F'                               // 🌥️
  return '\u{1F324}\uFE0F'                                                            // 🌤️ (default)
}

export function firstLine(value: string) {
  return value.split('\n').find((line) => line.trim())?.trim() ?? ''
}

export function customPageSourcePath(href: string) {
  const relativePath = href.replace(/^\/custom-pages\//, '')
  return relativePath && relativePath !== href ? `custom-pages/${relativePath}` : href
}

export function customPageMetadataPath(href: string) {
  const sourcePath = customPageSourcePath(href)
  if (!sourcePath.startsWith('custom-pages/')) return 'custom-pages/<page-folder>/page.json'
  const parts = sourcePath.split('/')
  parts.pop()
  return `${parts.join('/') || 'custom-pages'}/page.json`
}

export function suggestedPageMetadata(page: PageLink) {
  return JSON.stringify(
    {
      title: page.title,
      description: page.description,
    },
    null,
    2,
  )
}

export function toWifiPayload(ssid: string, password: string, security: string) {
  const type = security.trim().toUpperCase() === 'WEP' ? 'WEP' : (security.trim().toLowerCase() === 'nopass' ? 'nopass' : 'WPA')
  const escapedSsid = escapeWifiQrValue(ssid)
  const escapedPassword = escapeWifiQrValue(password)
  return `WIFI:T:${type};S:${escapedSsid};P:${escapedPassword};H:false;;`
}

function escapeWifiQrValue(value: string) {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export function normaliseExternalUrl(value: string | undefined) {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const withProtocol = raw.includes('://') ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}
