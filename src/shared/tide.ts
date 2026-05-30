export type TideEvent = {
  id: string
  type: 'high' | 'low'
  time: string
  height: number | null
  source: 'forecast'
}

export type TidePoint = {
  time: string
  height: number | null
}

const FORECAST_TIDE_GAP_MS = 4 * 60 * 60 * 1000

export function extractTideSeries(raw: Record<string, any>): TidePoint[] {
  const block = raw.minutely_15 ?? raw.hourly ?? {}
  const times: string[] = Array.isArray(block.time) ? block.time : []
  const heights: unknown[] = Array.isArray(block.sea_level_height_msl) ? block.sea_level_height_msl : []

  return times
    .map((time, index) => ({ time, height: numericOrNull(heights[index]) }))
    .filter((point) => Number.isFinite(new Date(point.time).getTime()))
}

export function deriveTideEvents(series: TidePoint[], referenceTime = Date.now()): TideEvent[] {
  const points = series.filter((point): point is { time: string; height: number } => point.height !== null)
  const events: TideEvent[] = []

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    const timestamp = new Date(current.time).getTime()

    if (timestamp < referenceTime - 60 * 60 * 1000) continue

    const isHigh = (current.height >= previous.height && current.height > next.height) || (current.height > previous.height && current.height >= next.height)
    const isLow = (current.height <= previous.height && current.height < next.height) || (current.height < previous.height && current.height <= next.height)
    if (!isHigh && !isLow) continue

    const candidate: TideEvent = {
      id: `forecast-${current.time}`,
      type: isHigh ? 'high' : 'low',
      time: current.time,
      height: Number(current.height.toFixed(2)),
      source: 'forecast',
    }

    const last = events.at(-1)
    if (!last) {
      events.push(candidate)
      continue
    }

    const gap = timestamp - new Date(last.time).getTime()
    if (gap < FORECAST_TIDE_GAP_MS) {
      const shouldReplace = candidate.type !== last.type || isMoreExtreme(candidate, last)
      if (shouldReplace) events[events.length - 1] = candidate
      continue
    }

    if (candidate.type === last.type) {
      if (isMoreExtreme(candidate, last)) events[events.length - 1] = candidate
      continue
    }

    events.push(candidate)
  }

  return events
}

export function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  return null
}

function isMoreExtreme(candidate: TideEvent, current: TideEvent) {
  if (candidate.height === null || current.height === null) return false
  return candidate.type === 'high' ? candidate.height > current.height : candidate.height < current.height
}
