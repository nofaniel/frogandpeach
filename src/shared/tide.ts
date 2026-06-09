export type TideEvent = {
  id: string
  type: 'high' | 'low'
  time: string
  height: number | null
  source?: 'forecast'
}

export type TidePoint = {
  time: string
  height: number | null
}

const FORECAST_TIDE_GAP_MS = 4 * 60 * 60 * 1000
const MIN_EVENT_PROMINENCE_METERS = 0.05

export function extractTideSeries(raw: Record<string, any>): TidePoint[] {
  const block = raw.minutely_15 ?? raw.hourly ?? {}
  const times: string[] = Array.isArray(block.time) ? block.time : []
  const heights: unknown[] = Array.isArray(block.sea_level_height_msl) ? block.sea_level_height_msl : []

  return times
    .map((time, index) => ({ time, height: numericOrNull(heights[index]) }))
    .filter((point) => Number.isFinite(new Date(point.time).getTime()))
}

export function deriveTideEvents(series: TidePoint[], referenceTime = Date.now()): TideEvent[] {
  const points = series
    .filter((point): point is { time: string; height: number } => point.height !== null)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  if (points.length < 3) return []

  const smoothed = smoothHeights(points)
  const events: TideEvent[] = []

  for (let index = 1; index < smoothed.length - 1; index += 1) {
    const previous = smoothed[index - 1]
    const current = smoothed[index]
    const next = smoothed[index + 1]
    const timestamp = new Date(current.time).getTime()

    if (timestamp < referenceTime - 60 * 60 * 1000) continue

    const isHigh = (current.height >= previous.height && current.height > next.height) || (current.height > previous.height && current.height >= next.height)
    const isLow = (current.height <= previous.height && current.height < next.height) || (current.height < previous.height && current.height <= next.height)
    if (!isHigh && !isLow) continue
    if (Math.abs(previous.height - next.height) < MIN_EVENT_PROMINENCE_METERS) continue

    const refined = refineEvent(previous, current, next, isHigh ? 'high' : 'low')

    const candidate: TideEvent = {
      id: `forecast-${refined.time}`,
      type: isHigh ? 'high' : 'low',
      time: refined.time,
      height: refined.height,
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

function smoothHeights(points: Array<{ time: string; height: number }>) {
  if (points.length < 3) return [...points]
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point
    const previous = points[index - 1]
    const next = points[index + 1]
    const height = (previous.height + point.height * 2 + next.height) / 4
    return { time: point.time, height }
  })
}

function refineEvent(
  previous: { time: string; height: number },
  current: { time: string; height: number },
  next: { time: string; height: number },
  type: 'high' | 'low',
) {
  const prevTime = new Date(previous.time).getTime()
  const currentTime = new Date(current.time).getTime()
  const nextTime = new Date(next.time).getTime()
  const avgStepMs = Math.max(1, Math.round((nextTime - prevTime) / 2))

  const curvature = previous.height - 2 * current.height + next.height
  if (Math.abs(curvature) < 1e-9) {
    return {
      time: new Date(currentTime).toISOString(),
      height: Number(current.height.toFixed(2)),
    }
  }

  const offset = clamp(0.5 * (previous.height - next.height) / curvature, -1, 1)
  const refinedTimeMs = currentTime + offset * avgStepMs
  const refinedHeight = current.height - 0.25 * (previous.height - next.height) * offset

  return {
    time: new Date(refinedTimeMs).toISOString(),
    height: Number((type === 'high' ? Math.max(refinedHeight, current.height) : Math.min(refinedHeight, current.height)).toFixed(2)),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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

export type TideWindowState = {
  nextEvents: TideEvent[]
}

export function getTideWindow(events: TideEvent[], now: number, count: number): TideWindowState {
  const validEvents = events.filter((event) => {
    const time = new Date(event.time).getTime()
    return Number.isFinite(time)
  })

  const upcoming = validEvents
    .filter((event) => new Date(event.time).getTime() > now - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  return {
    nextEvents: upcoming.slice(0, Math.max(1, Math.min(5, count))),
  }
}

export type TideCurrentState = {
  previousTide: TideEvent | null
  nextTide: TideEvent | null
  progress: number
  direction: 'rising' | 'falling' | null
  estimatedHeight: number | null
}

export function getCurrentTideState(
  events: TideEvent[],
  now: number,
  currentSeaLevel: number | null = null,
): TideCurrentState {
  const sorted = events
    .filter((event) => Number.isFinite(new Date(event.time).getTime()))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  const previousTide = [...sorted].reverse().find((event) => new Date(event.time).getTime() <= now) ?? null
  const nextTide = sorted.find((event) => new Date(event.time).getTime() > now) ?? null

  if (!previousTide || !nextTide) {
    return {
      previousTide,
      nextTide,
      progress: 0,
      direction: null,
      estimatedHeight: currentSeaLevel,
    }
  }

  const prevTime = new Date(previousTide.time).getTime()
  const nextTime = new Date(nextTide.time).getTime()
  const span = nextTime - prevTime
  const elapsed = now - prevTime
  const progress = span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 0

  const direction = previousTide.type === 'low' ? 'rising' : 'falling'

  let estimatedHeight: number | null = currentSeaLevel
  if (estimatedHeight === null && previousTide.height !== null && nextTide.height !== null) {
    estimatedHeight = previousTide.height + (nextTide.height - previousTide.height) * progress
  }

  return { previousTide, nextTide, progress, direction, estimatedHeight }
}
