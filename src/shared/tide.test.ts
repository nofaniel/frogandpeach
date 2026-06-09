import { describe, expect, it } from 'vitest'
import { deriveTideEvents, extractTideSeries, getCurrentTideState, getTideWindow } from './tide'

const referenceTime = new Date('2026-05-23T00:00:00Z').getTime()

const sampleEvents = [
  { id: 'e1', type: 'high' as const, time: '2026-05-23T06:00:00Z', height: 1.2, source: 'forecast' as const },
  { id: 'e2', type: 'low' as const, time: '2026-05-23T12:00:00Z', height: 0.3, source: 'forecast' as const },
  { id: 'e3', type: 'high' as const, time: '2026-05-23T18:00:00Z', height: 1.1, source: 'forecast' as const },
  { id: 'e4', type: 'low' as const, time: '2026-05-24T00:00:00Z', height: 0.2, source: 'forecast' as const },
  { id: 'e5', type: 'high' as const, time: '2026-05-24T06:00:00Z', height: 1.3, source: 'forecast' as const },
]

describe('tide event detection', () => {
  it('detects approximate highs and lows from Open-Meteo sea level points', () => {
    const events = deriveTideEvents(
      [
        { time: '2026-05-23T00:00:00Z', height: 0.1 },
        { time: '2026-05-23T01:00:00Z', height: 0.6 },
        { time: '2026-05-23T02:00:00Z', height: 1.2 },
        { time: '2026-05-23T04:00:00Z', height: 0.7 },
        { time: '2026-05-23T06:00:00Z', height: 0.2 },
        { time: '2026-05-23T08:00:00Z', height: -0.4 },
        { time: '2026-05-23T10:00:00Z', height: 0.1 },
      ],
      referenceTime,
    )

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('high')
    expect(events[1].type).toBe('low')
    expect(events[0].source).toBe('forecast')
    expect(events[1].source).toBe('forecast')
    expect(new Date(events[0].time).getTime()).toBeGreaterThanOrEqual(new Date('2026-05-23T01:00:00Z').getTime())
    expect(new Date(events[0].time).getTime()).toBeLessThanOrEqual(new Date('2026-05-23T03:00:00Z').getTime())
    expect(new Date(events[1].time).getTime()).toBeGreaterThanOrEqual(new Date('2026-05-23T07:00:00Z').getTime())
    expect(new Date(events[1].time).getTime()).toBeLessThanOrEqual(new Date('2026-05-23T09:00:00Z').getTime())
  })

  it('returns no events for empty, flat, or sparse data', () => {
    expect(deriveTideEvents([], referenceTime)).toEqual([])
    expect(
      deriveTideEvents(
        [
          { time: '2026-05-23T00:00:00Z', height: 0.5 },
          { time: '2026-05-23T01:00:00Z', height: 0.5 },
          { time: '2026-05-23T02:00:00Z', height: 0.5 },
        ],
        referenceTime,
      ),
    ).toEqual([])
    expect(deriveTideEvents([{ time: '2026-05-23T00:00:00Z', height: 0.5 }], referenceTime)).toEqual([])
  })

  it('ignores malformed Open-Meteo points without fabricating tide events', () => {
    const series = extractTideSeries({
      minutely_15: {
        time: ['bad-date', '2026-05-23T00:15:00Z', '2026-05-23T00:30:00Z'],
        sea_level_height_msl: ['not-a-number', '0.1', null],
      },
    })

    expect(series).toEqual([
      { time: '2026-05-23T00:15:00Z', height: 0.1 },
      { time: '2026-05-23T00:30:00Z', height: null },
    ])
    expect(deriveTideEvents(series, referenceTime)).toEqual([])
  })
})

describe('getTideWindow', () => {
  const now = new Date('2026-05-23T09:00:00Z').getTime()

  it('returns the next N upcoming events', () => {
    const result = getTideWindow(sampleEvents, now, 3)
    expect(result.nextEvents).toHaveLength(3)
    expect(result.nextEvents[0].id).toBe('e2')
    expect(result.nextEvents[1].id).toBe('e3')
    expect(result.nextEvents[2].id).toBe('e4')
  })

  it('excludes events older than 1 hour before now', () => {
    const result = getTideWindow(sampleEvents, now, 5)
    for (const event of result.nextEvents) {
      expect(new Date(event.time).getTime()).toBeGreaterThan(now - 60 * 60 * 1000)
    }
  })

  it('clamps count to available events', () => {
    const result = getTideWindow(sampleEvents, now, 10)
    expect(result.nextEvents.length).toBeLessThanOrEqual(5)
  })

  it('returns empty for empty input', () => {
    const result = getTideWindow([], now, 5)
    expect(result.nextEvents).toEqual([])
  })

  it('filters out events with invalid times', () => {
    const mixed = [
      ...sampleEvents,
      { id: 'bad', type: 'high' as const, time: 'not-a-date', height: 1.0, source: 'forecast' as const },
    ]
    const result = getTideWindow(mixed, now, 10)
    expect(result.nextEvents.every((e) => e.id !== 'bad')).toBe(true)
  })
})

describe('getCurrentTideState', () => {
  it('finds previous and next events correctly', () => {
    const now = new Date('2026-05-23T09:00:00Z').getTime()
    const state = getCurrentTideState(sampleEvents, now)
    expect(state.previousTide?.id).toBe('e1')
    expect(state.nextTide?.id).toBe('e2')
  })

  it('reports rising direction from low to high', () => {
    const now = new Date('2026-05-23T03:00:00Z').getTime()
    const events = [
      { id: 'a', type: 'low' as const, time: '2026-05-23T00:00:00Z', height: 0.2, source: 'forecast' as const },
      { id: 'b', type: 'high' as const, time: '2026-05-23T06:00:00Z', height: 1.2, source: 'forecast' as const },
    ]
    const state = getCurrentTideState(events, now)
    expect(state.direction).toBe('rising')
  })

  it('reports falling direction from high to low', () => {
    const now = new Date('2026-05-23T09:00:00Z').getTime()
    const events = [
      { id: 'a', type: 'high' as const, time: '2026-05-23T06:00:00Z', height: 1.2, source: 'forecast' as const },
      { id: 'b', type: 'low' as const, time: '2026-05-23T12:00:00Z', height: 0.2, source: 'forecast' as const },
    ]
    const state = getCurrentTideState(events, now)
    expect(state.direction).toBe('falling')
  })

  it('clamps progress to 0 and 1', () => {
    const beforeAll = new Date('2026-05-22T00:00:00Z').getTime()
    const afterAll = new Date('2026-05-25T00:00:00Z').getTime()
    const stateBefore = getCurrentTideState(sampleEvents, beforeAll)
    const stateAfter = getCurrentTideState(sampleEvents, afterAll)
    expect(stateBefore.progress).toBe(0)
    expect(stateAfter.progress).toBe(0)
  })

  it('interpolates height when current sea level is absent', () => {
    const now = new Date('2026-05-23T09:00:00Z').getTime()
    const state = getCurrentTideState(sampleEvents, now, null)
    expect(state.estimatedHeight).not.toBeNull()
    expect(state.estimatedHeight!).toBeGreaterThan(0.3)
    expect(state.estimatedHeight!).toBeLessThan(1.2)
  })

  it('uses current sea level when provided', () => {
    const now = new Date('2026-05-23T09:00:00Z').getTime()
    const state = getCurrentTideState(sampleEvents, now, 0.75)
    expect(state.estimatedHeight).toBe(0.75)
  })

  it('returns null direction when no surrounding events', () => {
    const now = new Date('2026-05-23T09:00:00Z').getTime()
    const state = getCurrentTideState([], now)
    expect(state.direction).toBeNull()
    expect(state.previousTide).toBeNull()
    expect(state.nextTide).toBeNull()
  })
})
