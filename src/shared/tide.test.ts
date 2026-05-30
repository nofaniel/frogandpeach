import { describe, expect, it } from 'vitest'
import { deriveTideEvents, extractTideSeries } from './tide'

const referenceTime = new Date('2026-05-23T00:00:00Z').getTime()

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

    expect(events).toEqual([
      { id: 'forecast-2026-05-23T02:00:00Z', type: 'high', time: '2026-05-23T02:00:00Z', height: 1.2, source: 'forecast' },
      { id: 'forecast-2026-05-23T08:00:00Z', type: 'low', time: '2026-05-23T08:00:00Z', height: -0.4, source: 'forecast' },
    ])
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
