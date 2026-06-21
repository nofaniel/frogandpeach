import { useState, type CSSProperties } from 'react'
import type { HomeData, Module, Settings } from '../../../shared/api-types'
import { formatDate, formatNumber, formatTemperature, weatherIcon } from '../../../shared/format'
import { formatLocationLabel } from '../../../shared/location'
import { airQualityLevel, formatCurrentPrecipitationMm, overallPollenLevel, pollenAvailable, uvLevel } from '../../../shared/weather'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'
import { InfoTooltip } from './InfoTooltip'

type WeatherMetricName = 'temperature' | 'wind' | 'precipitationChance' | 'precipitation'

const weatherMetricEmoji: Record<WeatherMetricName, string> = {
  temperature: '\u{1F321}\uFE0F',
  wind: '\u{1F4A8}',
  precipitationChance: '\u2602\uFE0F',
  precipitation: '\u{1F4A7}',
}

const weatherMetricTooltip: Record<WeatherMetricName, string> = {
  temperature: 'Today high / low temperature',
  wind: 'Current wind speed',
  precipitationChance: 'Chance of rain today',
  precipitation: 'Rainfall measured now',
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

function formatWeatherHour(time: string, index: number): string {
  if (index === 0) return 'Now'
  const hour = time.split('T')[1]?.split(':')[0]
  return hour ? `${hour}:00` : time
}

function formatHourlyTooltip(hour: { time: string; temperature: number | null; precipitationChance: number | null; label: string }): string {
  const hourLabel = formatWeatherHour(hour.time, 0)
  const temp = formatTemperature(hour.temperature)
  const rain = hour.precipitationChance !== null ? `${formatNumber(hour.precipitationChance)}% rain` : 'No rain data'
  return `${hourLabel}: ${hour.label}, ${temp}, ${rain}`
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
  const [isForecastExpanded, setIsForecastExpanded] = useState(false)
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
  const collapsibleExtendedForecast = module.options.collapsibleExtendedForecast !== false
  const weatherIconStyle = module.options.iconStyle === 'icons' ? 'icons' : 'emoji'
  const hourlyForecast = home.weather.hourly ?? []
  const env = home.weather.environment
  const showEnvUv = module.options.showUvIndex === true
  const showEnvAir = module.options.showAirQuality === true
  const showEnvPollen = module.options.showPollen === true
  const envUvLevel = showEnvUv && env ? uvLevel(env.uvIndex) : null
  const envAirLevel = showEnvAir && env?.airQuality ? airQualityLevel(env.airQuality.europeanAqi) : null
  const envPollenAvailable = showEnvPollen && env?.pollen ? pollenAvailable(env.pollen) : false
  const envPollenLevel = showEnvPollen && env?.pollen ? overallPollenLevel(env.pollen) : null

  return (
    <article id={module.id} className={className + ' weather-panel'}>
      <div className="weather-orb" aria-hidden="true" />
      <div className="weather-place">{weatherLocation.toUpperCase()}</div>
      <div className="weather-current">
        <InfoTooltip label={`Current conditions: ${home.weather.current.label}`}>
          <div className="weather-icon">{weatherIcon(home.weather.current.label)}</div>
        </InfoTooltip>
        <div>
          <strong className="big-number">{formatTemperature(home.weather.current.temperature)}</strong>
          <p>{home.weather.current.label ?? 'Weather unavailable'}</p>
        </div>
      </div>
      <div className="metric-row">
        {home.weather.daily[0] && (
          <InfoTooltip label={weatherMetricTooltip.temperature}>
            <span>
              <WeatherMetricSymbol name="temperature" style={weatherIconStyle} />
              {formatTemperature(home.weather.daily[0].max)} / {formatTemperature(home.weather.daily[0].min)}
            </span>
          </InfoTooltip>
        )}
        <InfoTooltip label={weatherMetricTooltip.wind}>
          <span>
            <WeatherMetricSymbol name="wind" style={weatherIconStyle} />
            {formatNumber(home.weather.current.windSpeed)} km/h
          </span>
        </InfoTooltip>
        <InfoTooltip label={weatherMetricTooltip.precipitationChance}>
          <span>
            <WeatherMetricSymbol name="precipitationChance" style={weatherIconStyle} />
            {formatNumber(home.weather.daily[0]?.precipitationChance)}%
          </span>
        </InfoTooltip>
        <InfoTooltip label={weatherMetricTooltip.precipitation}>
          <span>
            <WeatherMetricSymbol name="precipitation" style={weatherIconStyle} />
            {formatCurrentPrecipitationMm(home.weather.current.precipitationMm)}
          </span>
        </InfoTooltip>
        <InfoTooltip label="Feels-like temperature">
          <span>Feels {formatTemperature(home.weather.current.feelsLike)}</span>
        </InfoTooltip>
      </div>
      {(showEnvUv || showEnvAir || showEnvPollen) && env && (
        <section className="weather-environment" aria-label="Environment data">
          {showEnvUv && envUvLevel && (
            <span className={`weather-env-pill weather-env-pill--uv weather-env-pill--${envUvLevel.toLowerCase().replace(' ', '-')}`}>
              ☀️ UV {formatNumber(env.uvIndex)} · {envUvLevel}
            </span>
          )}
          {showEnvUv && !envUvLevel && (
            <span className="weather-env-pill weather-env-pill--uv">☀️ UV {env.uvIndex !== null ? formatNumber(env.uvIndex) : '--'}</span>
          )}
          {showEnvAir && envAirLevel && (
            <span className={`weather-env-pill weather-env-pill--air weather-env-pill--${envAirLevel.toLowerCase().replace(' ', '-')}`}>
              🍃 AQI {formatNumber(env.airQuality?.europeanAqi)} · {envAirLevel}
            </span>
          )}
          {showEnvAir && !envAirLevel && (
            <span className="weather-env-pill weather-env-pill--air">🍃 AQI {env.airQuality?.europeanAqi !== null ? formatNumber(env.airQuality?.europeanAqi) : '--'}</span>
          )}
          {showEnvPollen && envPollenAvailable && envPollenLevel && (
            <InfoTooltip label={`Grass: ${formatNumber(env.pollen?.grass)} · Birch: ${formatNumber(env.pollen?.birch)} · Alder: ${formatNumber(env.pollen?.alder)} · Mugwort: ${formatNumber(env.pollen?.mugwort)} · Olive: ${formatNumber(env.pollen?.olive)} · Ragweed: ${formatNumber(env.pollen?.ragweed)}`}>
              <span className={`weather-env-pill weather-env-pill--pollen weather-env-pill--${envPollenLevel.toLowerCase()}`}>
                🌾 Pollen · {envPollenLevel}
              </span>
            </InfoTooltip>
          )}
          {showEnvPollen && !envPollenAvailable && (
            <InfoTooltip label="Open-Meteo pollen data is available for European locations only.">
              <span className="weather-env-pill weather-env-pill--pollen weather-env-pill--unavailable">🌾 Pollen unavailable in this region</span>
            </InfoTooltip>
          )}
        </section>
      )}
      {hourlyForecast.length > 0 && (
        <section className="weather-hourly" aria-label="Hourly forecast for today">
          <div className="weather-hourly-heading">
            <p className="kicker">Today</p>
            <span>Hourly forecast</span>
          </div>
          <div className="weather-hourly-track" tabIndex={0}>
            {hourlyForecast.map((hour, index) => (
              <InfoTooltip key={hour.time} label={formatHourlyTooltip(hour)} className="weather-hourly-tooltip">
                <article className="weather-hour-card">
                  <div className="weather-hour-time">{formatWeatherHour(hour.time, index)}</div>
                  <div className="weather-hour-icon" aria-hidden="true">{weatherIcon(hour.label)}</div>
                  <div className="weather-hour-temp">{formatTemperature(hour.temperature)}</div>
                  {hour.precipitationChance !== null && (
                    <div className="weather-hour-rain">{formatNumber(hour.precipitationChance)}% rain</div>
                  )}
                </article>
              </InfoTooltip>
            ))}
          </div>
        </section>
      )}
      {showForecast && (
        <section className="weather-extended-forecast" aria-label="5-day forecast">
          {collapsibleExtendedForecast ? (
            <button
              type="button"
              className="weather-forecast-toggle"
              aria-expanded={isForecastExpanded}
              aria-controls={`${module.id}-extended-forecast`}
              onClick={() => setIsForecastExpanded((expanded) => !expanded)}
            >
              <span className="weather-forecast-toggle-title">Next 5 days</span>
              <span className="weather-forecast-toggle-action">
                <span>{isForecastExpanded ? 'Hide forecast' : 'Show forecast'}</span>
                <svg className="weather-forecast-toggle-chevron" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m5 7.5 5 5 5-5" />
                </svg>
              </span>
            </button>
          ) : (
            <div className="weather-forecast-heading">
              <p className="kicker">Next 5 days</p>
              <span>Rain outlook</span>
            </div>
          )}
          <div
            id={`${module.id}-extended-forecast`}
            className={`weather-forecast-disclosure${!collapsibleExtendedForecast || isForecastExpanded ? ' weather-forecast-disclosure--expanded' : ''}`}
            aria-hidden={collapsibleExtendedForecast && !isForecastExpanded}
            inert={collapsibleExtendedForecast && !isForecastExpanded}
          >
            <div className="weather-forecast-disclosure-inner">
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
                      <InfoTooltip label={precip !== null ? `Chance of rain: ${formatNumber(precip)}%` : 'No rain data'} className="weather-precip-tooltip">
                        <div className="weather-precip-track" aria-label={precip !== null ? `Chance of rain: ${formatNumber(precip)}%` : undefined}>
                          <span />
                        </div>
                      </InfoTooltip>
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
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
