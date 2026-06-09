import type { CSSProperties } from 'react'
import type { HomeData, Module, Settings } from '../../../shared/api-types'
import { formatDate, formatNumber, formatTemperature, weatherIcon } from '../../../shared/format'
import { formatLocationLabel } from '../../../shared/location'
import { formatCurrentPrecipitationMm } from '../../../shared/weather'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'

type WeatherMetricName = 'temperature' | 'wind' | 'precipitationChance' | 'precipitation'

const weatherMetricEmoji: Record<WeatherMetricName, string> = {
  temperature: '\u{1F321}️',
  wind: '\u{1F4A8}',
  precipitationChance: '☔',
  precipitation: '\u{1F4A7}',
}

function WeatherMetricSymbol({ name, style }: { name: WeatherMetricName; style: 'emoji' | 'icons' }) {
  if (style === 'emoji') {
    return <span className="weather-metric-emoji" aria-hidden="true">{weatherMetricEmoji[name]}</span>
  }
  return <WeatherMetricIcon name={name} />
}

function WeatherMetricIcon({ name }: { name: WeatherMetricName }) {
  if (name === 'temperature') {
    return (
      <svg className="weather-metric-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 14.76V5a4 4 0 0 0-8 0v9.76a6 6 0 1 0 8 0Z" />
        <path d="M10 5v10" />
        <path d="M10 18h.01" />
      </svg>
    )
  }
  if (name === 'wind') {
    return (
      <svg className="weather-metric-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 8h11a3 3 0 1 0-3-3" />
        <path d="M3 12h15a3 3 0 1 1-3 3" />
        <path d="M3 16h7" />
      </svg>
    )
  }
  if (name === 'precipitationChance') {
    return (
      <svg className="weather-metric-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
        <path d="M12 11v6a3 3 0 0 0 6 0" />
      </svg>
    )
  }
  return (
    <svg className="weather-metric-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5S6.5 10 6.5 14a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z" />
    </svg>
  )
}

export function WeatherWidget({
  module,
  home,
  locationConfigured,
  publicSettings,
  onOpenAdmin,
}: {
  module: Module
  home: HomeData
  locationConfigured: boolean
  publicSettings: Settings
  onOpenAdmin: () => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const className = 'panel module-' + module.size

  if (!locationConfigured) {
    return (
      <article id={module.id} className={className + ' weather-panel'}>
        <div className="weather-orb" aria-hidden="true" />
        <p className="kicker">Weather</p>
        <h2>Location not set</h2>
        <p>Set latitude, longitude, and timezone in Admin settings before weather and tides can load.</p>
        <button type="button" className="button-link" onClick={onOpenAdmin}>Open Admin settings</button>
      </article>
    )
  }

  if (!home.weather) {
    return (
      <article id={module.id} className={className + ' weather-panel'}>
        <div className="weather-orb" aria-hidden="true" />
        <div className="weather-place">LOCAL WEATHER</div>
        <h2>Weather unavailable</h2>
        <p>Weather data could not be loaded right now.</p>
      </article>
    )
  }

  const weatherLocation = home.weather.location?.trim() || formatLocationLabel(publicSettings)
  const forecastDays = home.weather.daily.slice(1, 6)
  const showForecast = widget.mode === 'forecast' || module.options.showExtendedForecast === true
  const weatherIconStyle = module.options.iconStyle === 'icons' ? 'icons' : 'emoji'

  return (
    <article id={module.id} className={className + ' weather-panel'}>
      <div className="weather-orb" aria-hidden="true" />
      <div className="weather-place">{weatherLocation.toUpperCase()}</div>
      <div className="weather-current">
        <div className="weather-icon" aria-hidden="true">{weatherIcon(home.weather.current.label)}</div>
        <div>
          <strong className="big-number">{formatTemperature(home.weather.current.temperature)}</strong>
          <p>{home.weather.current.label ?? 'Weather unavailable'}</p>
        </div>
      </div>
      <div className="metric-row">
        {home.weather.daily[0] && (
          <span>
            <WeatherMetricSymbol name="temperature" style={weatherIconStyle} />
            {formatTemperature(home.weather.daily[0].max)} / {formatTemperature(home.weather.daily[0].min)}
          </span>
        )}
        <span>
          <WeatherMetricSymbol name="wind" style={weatherIconStyle} />
          {formatNumber(home.weather.current.windSpeed)} km/h
        </span>
        <span>
          <WeatherMetricSymbol name="precipitationChance" style={weatherIconStyle} />
          {formatNumber(home.weather.daily[0]?.precipitationChance)}%
        </span>
        <span>
          <WeatherMetricSymbol name="precipitation" style={weatherIconStyle} />
          {formatCurrentPrecipitationMm(home.weather.current.precipitationMm)}
        </span>
        <span>Feels {formatTemperature(home.weather.current.feelsLike)}</span>
      </div>
      {showForecast && (
        <section className="weather-extended-forecast" aria-label="5-day forecast">
          <div className="weather-forecast-heading">
            <p className="kicker">Next 5 days</p>
            <span>Rain outlook</span>
          </div>
          <div className="weather-forecast-grid">
            {forecastDays.map((day) => {
              const precip = day.precipitationChance === null ? null : Math.max(0, Math.min(100, day.precipitationChance))
              return (
                <div
                  key={day.date}
                  className="weather-forecast-card"
                  style={{ '--precip': `${precip ?? 0}%` } as CSSProperties}
                >
                  <div className="weather-forecast-date">{formatDate(day.date)}</div>
                  <div className="weather-extended-icon" aria-hidden="true">{weatherIcon(day.label)}</div>
                  <strong>{day.label}</strong>
                  <small>{formatTemperature(day.max)} / {formatTemperature(day.min)}</small>
                  <div className="weather-precip-track" aria-hidden="true">
                    <span />
                  </div>
                  {precip !== null && (
                    <span className="weather-extended-precip">
                      <WeatherMetricSymbol name="precipitationChance" style={weatherIconStyle} />
                      {formatNumber(precip)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </article>
  )
}
