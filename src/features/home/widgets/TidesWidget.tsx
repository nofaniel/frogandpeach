import type { Module, TideSummary } from '../../../shared/api-types'
import { formatTideCountdown, formatTideEventLabel, formatTideHeight, formatTideTime } from '../../../shared/format'
import { getCurrentTideState, getTideWindow } from '../../../shared/tide'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'

export function TidesWidget({
  module,
  tides,
  locationConfigured,
  onOpenAdmin,
}: {
  module: Module
  tides: TideSummary | null
  locationConfigured: boolean
  onOpenAdmin: () => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const className = 'panel module-' + module.size
  const opts = module.options

  if (!locationConfigured) {
    return (
      <article id={module.id} className={className + ' tide-panel'}>
        <div className="panel-heading">
          <div>
            <p className="kicker">Tides - Predicted</p>
            <h2>Location not set</h2>
            <p className="tide-panel-summary">Set latitude, longitude, and timezone in Admin settings before tides can load.</p>
          </div>
          <span className="tide-mark" aria-hidden="true">🌊</span>
        </div>
        <button type="button" className="button-link" onClick={onOpenAdmin}>Open Admin settings</button>
      </article>
    )
  }

  const tideEvents = tides?.events ?? []
  const now = Date.now()
  const tideCount = typeof opts.nextTideCount === 'number' ? opts.nextTideCount : 5
  const { nextEvents } = getTideWindow(tideEvents, now, tideCount)
  const currentState = getCurrentTideState(tideEvents, now, tides?.current?.seaLevel ?? null)

  const showCurrentTide = opts.showCurrentTide !== false
  const showTimeUntilNext = opts.showTimeUntilNext !== false
  const showNextTides = opts.showNextTides !== false
  const showSourceNote = opts.showTideSourceNote !== false

  const nextTide = nextEvents[0] ?? currentState.nextTide
  const timeUntilNext = nextTide ? new Date(nextTide.time).getTime() - now : null

  const summaryParts: string[] = []
  if (showCurrentTide && currentState.previousTide && currentState.nextTide) summaryParts.push('current tide')
  if (showTimeUntilNext && timeUntilNext !== null && timeUntilNext > 0) summaryParts.push('next tide')
  if (showNextTides) summaryParts.push(`next ${tideCount} events`)

  return (
    <article id={module.id} className={className + ' tide-panel'}>
      <div className="panel-heading">
        <div>
          <p className="kicker">Tides - Predicted</p>
          <h2>Local tides</h2>
          <p className="tide-panel-summary">{summaryParts.length > 0 ? summaryParts.join(', ') + '.' : 'No tide data available.'}</p>
        </div>
        <span className="tide-mark" aria-hidden="true">🌊</span>
      </div>

      {showCurrentTide && currentState.previousTide && currentState.nextTide && (
        <section className="tide-section tide-current-section" aria-labelledby="tide-current-heading">
          <div className="tide-section-head">
            <p id="tide-current-heading" className="tide-section-title">Current tide</p>
            <span className="tide-section-subtitle">{currentState.direction === 'rising' ? 'Rising' : 'Falling'}</span>
          </div>
          <div className="tide-current-scale">
            <div className="tide-current-track">
              <div className="tide-current-fill" style={{ width: `${Math.round(currentState.progress * 100)}%` }} />
              <div className="tide-current-needle" style={{ left: `${Math.round(currentState.progress * 100)}%` }} />
            </div>
            <div className="tide-current-labels">
              <span className="tide-current-endpoint">
                <strong>{formatTideEventLabel(currentState.previousTide.type)}</strong>
                <small>{formatTideTime(currentState.previousTide.time)}</small>
              </span>
              <span className="tide-current-endpoint">
                <strong>{formatTideEventLabel(currentState.nextTide.type)}</strong>
                <small>{formatTideTime(currentState.nextTide.time)}</small>
              </span>
            </div>
          </div>
          {currentState.estimatedHeight !== null && (
            <p className="tide-current-height">Estimated height {currentState.estimatedHeight.toFixed(1)} m</p>
          )}
        </section>
      )}

      {showCurrentTide && (!currentState.previousTide || !currentState.nextTide) && nextTide && (
        <section className="tide-section tide-current-section" aria-labelledby="tide-current-heading">
          <div className="tide-section-head">
            <p id="tide-current-heading" className="tide-section-title">Current tide</p>
            <span className="tide-section-subtitle">Unavailable</span>
          </div>
          <p className="tide-empty-state">Current tide scale unavailable — not enough surrounding events.</p>
        </section>
      )}

      {showTimeUntilNext && timeUntilNext !== null && timeUntilNext > 0 && (
        <section className="tide-section tide-countdown-section" aria-labelledby="tide-countdown-heading">
          <div className="tide-countdown-row">
            <span className="tide-countdown-label" id="tide-countdown-heading">Next tide in</span>
            <strong className="tide-countdown-value">{formatTideCountdown(timeUntilNext)}</strong>
          </div>
        </section>
      )}

      {showNextTides && (
        <section className="tide-section tide-feature-section" aria-labelledby="tide-feature-heading">
          <div className="tide-section-head">
            <p id="tide-feature-heading" className="tide-section-title">Next {tideCount} tides</p>
            <span className="tide-section-subtitle">The next tide events in sequence</span>
          </div>
          <div className="tide-feature-grid">
            {nextEvents.length > 0 ? nextEvents.map((event, index) => (
              <article key={event.id} className={'tide-feature-card ' + event.type}>
                <span className="tide-feature-badge">{index === 0 ? 'Next up' : 'Then'}</span>
                <strong>{formatTideEventLabel(event.type)}</strong>
                <div className="tide-feature-time">{formatTideTime(event.time)}</div>
                <small>{formatTideHeight(event.height)}</small>
              </article>
            )) : (
              <div className="tide-empty-state">No upcoming tide events available.</div>
            )}
          </div>
        </section>
      )}

      {showSourceNote && (
        <p className="tide-source-note">
          {tides?.note ?? 'Approximate tide trend from Open-Meteo marine model. Not for navigation.'}{' '}
          <span className="tide-source-label">Source: configured tide data</span>
        </p>
      )}
    </article>
  )
}
