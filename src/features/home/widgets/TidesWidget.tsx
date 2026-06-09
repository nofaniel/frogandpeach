import type { Module, TideSummary } from '../../../shared/api-types'
import { formatDayDate, formatTideDayBadge, formatTideEventLabel, formatTideHeight, formatTideTime, groupTideDays } from '../../../shared/format'
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
  const featuredTides = tideEvents.filter((e) => new Date(e.time).getTime() > now).slice(0, 2)
  const tideDays = groupTideDays(tideEvents, 5)

  return (
    <article id={module.id} className={className + ' tide-panel'}>
      <div className="panel-heading">
        <div>
          <p className="kicker">Tides - Predicted</p>
          <h2>Local tides</h2>
          <p className="tide-panel-summary">Next 2 tides first{widget.mode === 'timeline' ? ', then a 5-day tide timeline.' : '.'}</p>
        </div>
        <span className="tide-mark" aria-hidden="true">🌊</span>
      </div>
      <section className="tide-section tide-feature-section" aria-labelledby="tide-feature-heading">
        <div className="tide-section-head">
          <p id="tide-feature-heading" className="tide-section-title">Next 2 tides</p>
          <span className="tide-section-subtitle">The next tide events in sequence</span>
        </div>
        <div className="tide-feature-grid">
          {featuredTides.length > 0 ? featuredTides.map((event, index) => (
            <article key={event.id} className={'tide-feature-card ' + event.type}>
              <span className="tide-feature-badge">{index === 0 ? 'Next up' : 'Then'}</span>
              <strong>{formatTideEventLabel(event.type)}</strong>
              <div className="tide-feature-time">{formatTideTime(event.time)}</div>
              <em>{formatDayDate(event.time)}</em>
              <small>{formatTideHeight(event.height)}</small>
            </article>
          )) : (
            <div className="tide-empty-state">No tide events available yet.</div>
          )}
        </div>
      </section>
      {widget.mode === 'timeline' && (
        <section className="tide-section tide-timeline-section" aria-labelledby="tide-timeline-heading">
          <div className="tide-section-head">
            <p id="tide-timeline-heading" className="tide-section-title">Next 5 days</p>
            <span className="tide-section-subtitle">Each day with its tide times and dates</span>
          </div>
          <div className="tide-day-list">
            {tideDays.length > 0 ? tideDays.map((day, index) => (
              <article key={day.key} className="tide-day-card">
                <div className="tide-day-head">
                  <div className="tide-day-title">
                    <strong>{day.label}</strong>
                    <span className="tide-day-badge">{formatTideDayBadge(index)}</span>
                  </div>
                </div>
                <div className="tide-day-events">
                  {day.events.map((event) => (
                    <div key={event.id} className={'tide-day-event ' + event.type}>
                      <span>{event.type === 'high' ? 'High tide' : 'Low tide'}</span>
                      <strong>{formatTideTime(event.time)}</strong>
                      <small>{formatTideHeight(event.height)}</small>
                    </div>
                  ))}
                </div>
              </article>
            )) : (
              <div className="tide-empty-state">No tide timeline available.</div>
            )}
          </div>
        </section>
      )}
      <p className="tide-source-note">
        {tides?.note ?? 'Approximate tide trend from Open-Meteo marine model. Not for navigation.'}{' '}
        <span className="tide-source-label">Source: configured tide data</span>
      </p>
    </article>
  )
}
