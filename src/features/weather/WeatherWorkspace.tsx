import { type CSSProperties } from 'react'
import type { Module, Settings, WeatherSummary } from '../../shared/api-types'
import { formatDate, formatNumber, formatTemperature, formatTime, weatherIcon } from '../../shared/format'
import { formatLocationLabel } from '../../shared/location'
import { airQualityLevel, formatCurrentPrecipitationMm, overallPollenLevel, pollenAvailable, pollenLevel, uvLevel } from '../../shared/weather'

function formatWeatherHour(time: string, index: number): string {
  if (index === 0) return 'Now'
  const hour = time.split('T')[1]?.split(':')[0]
  return hour ? `${hour}:00` : time
}

function formatSunriseSunset(iso: string | null): string {
  if (!iso) return '--'
  return formatTime(iso)
}

function formatObservationTime(iso: string | null): string {
  if (!iso) return 'Live conditions'
  return `Observed ${formatTime(iso)}`
}

function formatRainLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? 'Rain data unavailable' : `${formatNumber(value)}% rain chance`
}

const POLLEN_LABELS: Record<string, string> = {
  grass: 'Grass',
  birch: 'Birch',
  alder: 'Alder',
  mugwort: 'Mugwort',
  olive: 'Olive',
  ragweed: 'Ragweed',
}

function deriveCondition(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('thunder') || l.includes('storm')) return 'storm'
  if (l.includes('snow') || l.includes('blizzard')) return 'snow'
  if (l.includes('rain') || l.includes('drizzle') || l.includes('shower')) return 'rain'
  if (l.includes('fog') || l.includes('mist')) return 'fog'
  if (l.includes('clear') || l.includes('sun')) return 'clear'
  if (l.includes('overcast')) return 'overcast'
  if (l.includes('cloud')) return 'partly-cloudy'
  return 'default'
}

function isNightTime(sunrise: string | null, sunset: string | null): boolean {
  const now = Date.now()
  if (sunrise && now < new Date(sunrise).getTime()) return true
  if (sunset && now > new Date(sunset).getTime()) return true
  return false
}

export function WeatherWorkspace({
  weather,
  locationConfigured,
  publicSettings,
  module,
  onOpenAdmin,
}: {
  weather: WeatherSummary | null
  locationConfigured: boolean
  publicSettings: Settings
  module: Module | undefined
  onOpenAdmin: () => void
}) {
  if (!locationConfigured) {
    return (
      <section className="workspace-grid weather-workspace">
        <article className="weather-ws-empty">
          <div className="weather-ws-empty-icon" aria-hidden="true">◎</div>
          <p className="weather-ws-empty-kicker">Weather station offline</p>
          <h2>Choose a home location</h2>
          <p className="weather-ws-empty-desc">Set latitude, longitude, and timezone in Admin settings before the observatory can pull local weather.</p>
          <button type="button" className="button-link" onClick={onOpenAdmin}>Open Admin settings</button>
        </article>
      </section>
    )
  }

  if (!weather) {
    return (
      <section className="workspace-grid weather-workspace">
        <article className="weather-ws-empty">
          <div className="weather-ws-empty-icon" aria-hidden="true">!</div>
          <p className="weather-ws-empty-kicker">Weather station quiet</p>
          <h2>Weather unavailable</h2>
          <p className="weather-ws-empty-desc">The latest forecast could not be loaded right now. Try again shortly or clear the weather cache from Admin.</p>
        </article>
      </section>
    )
  }

  const weatherLocation = weather.location?.trim() || formatLocationLabel(publicSettings)
  const showUv = module?.options.showUvIndex === true
  const showAir = module?.options.showAirQuality === true
  const showPollen = module?.options.showPollen === true
  const env = weather.environment
  const today = weather.daily[0]
  const nextDays = weather.daily.slice(1)

  const condition = deriveCondition(weather.current.label)
  const isNight = isNightTime(today?.sunrise ?? null, today?.sunset ?? null)

  // Determine gradient theme based on condition
  const conditionClass = `weather-cond--${condition}${isNight ? ' weather-cond--night' : ''}`

  return (
    <section className={`workspace-grid weather-workspace ${conditionClass}`}>
      {/* Hero Section */}
      <article className="weather-ws-hero">
        <div className="weather-ws-hero-bg" aria-hidden="true" />
        <div className="weather-ws-hero-content">
          <header className="weather-ws-hero-header">
            <div>
              <p className="weather-ws-hero-location">{weatherLocation}</p>
              <p className="weather-ws-hero-time">{formatObservationTime(weather.current.time)}</p>
            </div>
            <span className="weather-ws-hero-live">Live</span>
          </header>

          <div className="weather-ws-hero-main">
            <div className="weather-ws-hero-temp-group">
              <span className="weather-ws-hero-icon">{weatherIcon(weather.current.label)}</span>
              <span className="weather-ws-hero-temp">{formatTemperature(weather.current.temperature)}</span>
            </div>
            <div className="weather-ws-hero-meta">
              <p className="weather-ws-hero-label">{weather.current.label}</p>
              <p className="weather-ws-hero-feels">Feels like {formatTemperature(weather.current.feelsLike)}</p>
              <p className="weather-ws-hero-range">{formatTemperature(today?.max)} / {formatTemperature(today?.min)}</p>
            </div>
          </div>
        </div>
      </article>

      {/* Metrics Grid */}
      <div className="weather-ws-metrics">
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">Wind</span>
          <strong>{formatNumber(weather.current.windSpeed)} km/h</strong>
        </div>
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">Gusts</span>
          <strong>{formatNumber(weather.current.windGusts)} km/h</strong>
        </div>
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">Precipitation</span>
          <strong>{formatCurrentPrecipitationMm(weather.current.precipitationMm)}</strong>
        </div>
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">UV max</span>
          <strong>{today?.uvIndexMax != null ? formatNumber(today.uvIndexMax) : '--'}</strong>
        </div>
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">Sunrise</span>
          <strong>{formatSunriseSunset(today?.sunrise ?? null)}</strong>
        </div>
        <div className="weather-ws-metric">
          <span className="weather-ws-metric-label">Sunset</span>
          <strong>{formatSunriseSunset(today?.sunset ?? null)}</strong>
        </div>
      </div>

      {/* Hourly Forecast */}
      {weather.hourly.length > 0 && (
        <article className="weather-ws-section">
          <header className="weather-ws-section-header">
            <p className="weather-ws-section-kicker">Today</p>
            <h2>Hourly</h2>
          </header>
          <div className="weather-ws-hourly-track" tabIndex={0} aria-label="Hourly forecast">
            {weather.hourly.map((hour, index) => (
              <div className="weather-ws-hour-item" key={hour.time}>
                <span className="weather-ws-hour-label">{formatWeatherHour(hour.time, index)}</span>
                <span className="weather-ws-hour-emoji">{weatherIcon(hour.label)}</span>
                <span className="weather-ws-hour-degrees">{formatTemperature(hour.temperature)}</span>
                {hour.precipitationChance !== null && (
                  <div className="weather-ws-hour-rain-bar">
                    <div
                      className="weather-ws-hour-rain-fill"
                      style={{ '--rain': `${hour.precipitationChance}%` } as CSSProperties}
                    />
                  </div>
                )}
                <span className="weather-ws-hour-rain-label">
                  {hour.precipitationChance !== null ? `${formatNumber(hour.precipitationChance)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Daily Forecast */}
      {nextDays.length > 0 && (
        <article className="weather-ws-section">
          <header className="weather-ws-section-header">
            <p className="weather-ws-section-kicker">Next days</p>
            <h2>Forecast</h2>
          </header>
          <div className="weather-ws-daily-list">
            {nextDays.map((day) => {
              const precip = day.precipitationChance === null ? null : Math.max(0, Math.min(100, day.precipitationChance))
              return (
                <div className="weather-ws-daily-row" key={day.date}>
                  <span className="weather-ws-daily-date">{formatDate(day.date)}</span>
                  <span className="weather-ws-daily-icon">{weatherIcon(day.label)}</span>
                  <span className="weather-ws-daily-label">{day.label}</span>
                  <span className="weather-ws-daily-temps">{formatTemperature(day.max)} / {formatTemperature(day.min)}</span>
                  <span className="weather-ws-daily-uv">UV {day.uvIndexMax != null ? formatNumber(day.uvIndexMax) : '--'}</span>
                  <div className="weather-ws-daily-rain">
                    <div className="weather-ws-daily-rain-bar">
                      <div
                        className="weather-ws-daily-rain-fill"
                        style={{ '--rain': `${precip ?? 0}%` } as CSSProperties}
                      />
                    </div>
                    <span>{precip !== null ? `${formatNumber(precip)}%` : '--'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      )}

      {/* Environment Section */}
      {(showUv || showAir || showPollen) && (
        <article className="weather-ws-section">
          <header className="weather-ws-section-header">
            <p className="weather-ws-section-kicker">Environment</p>
            <h2>Atmosphere</h2>
          </header>
          <div className="weather-ws-env-grid">
            {showUv && (
              <div className="weather-ws-env-card">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-card-icon">☀️</span>
                  <span className="weather-ws-env-card-title">UV Index</span>
                </div>
                {env ? (
                  <div className="weather-ws-env-card-body">
                    <span className="weather-ws-env-card-value">
                      {env.uvIndex !== null ? formatNumber(env.uvIndex) : '--'}
                    </span>
                    <span className={`weather-ws-env-card-badge weather-ws-env-card-badge--${(uvLevel(env.uvIndex) ?? 'unavailable').toLowerCase().replace(' ', '-')}`}>
                      {uvLevel(env.uvIndex) ?? '--'}
                    </span>
                    <span className="weather-ws-env-card-detail">Max today: {env.uvIndexMax != null ? formatNumber(env.uvIndexMax) : '--'}</span>
                  </div>
                ) : (
                  <p className="weather-ws-env-card-unavailable">UV data unavailable</p>
                )}
              </div>
            )}
            {showAir && (
              <div className="weather-ws-env-card">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-card-icon">🍃</span>
                  <span className="weather-ws-env-card-title">Air Quality</span>
                </div>
                {env?.airQuality ? (
                  <div className="weather-ws-env-card-body">
                    <span className="weather-ws-env-card-value">
                      {env.airQuality.europeanAqi !== null ? formatNumber(env.airQuality.europeanAqi) : '--'}
                    </span>
                    <span className={`weather-ws-env-card-badge weather-ws-env-card-badge--${(airQualityLevel(env.airQuality.europeanAqi) ?? 'unavailable').toLowerCase().replace(' ', '-')}`}>
                      {airQualityLevel(env.airQuality.europeanAqi) ?? '--'}
                    </span>
                    <span className="weather-ws-env-card-detail">PM2.5 {env.airQuality.pm2_5 !== null ? `${formatNumber(env.airQuality.pm2_5)} µg/m³` : '--'}</span>
                    <span className="weather-ws-env-card-detail">PM10 {env.airQuality.pm10 !== null ? `${formatNumber(env.airQuality.pm10)} µg/m³` : '--'}</span>
                  </div>
                ) : (
                  <p className="weather-ws-env-card-unavailable">Air quality data unavailable</p>
                )}
              </div>
            )}
            {showPollen && (
              <div className="weather-ws-env-card">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-card-icon">🌾</span>
                  <span className="weather-ws-env-card-title">Pollen</span>
                </div>
                {env?.pollen && pollenAvailable(env.pollen) ? (
                  <div className="weather-ws-env-card-body">
                    <span className="weather-ws-env-card-value">{overallPollenLevel(env.pollen) ?? '--'}</span>
                    <div className="weather-ws-pollen-list">
                      {Object.entries(POLLEN_LABELS).map(([key, label]) => {
                        const allergens = env.pollen as unknown as Record<string, number | null>
                        const value = allergens[key] ?? null
                        const level = pollenLevel(value)
                        return (
                          <div className="weather-ws-pollen-row" key={key}>
                            <span className="weather-ws-pollen-name">{label}</span>
                            <span className="weather-ws-pollen-count">{value !== null ? `${formatNumber(value)}` : '--'}</span>
                            {level && (
                              <span className={`weather-ws-pollen-badge weather-ws-pollen-badge--${level.toLowerCase()}`}>
                                {level}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="weather-ws-env-card-unavailable">
                    <p>Pollen data is available for European locations only.</p>
                    <p className="small-note">Set a location in Europe to see grass, birch, alder, mugwort, olive, and ragweed counts.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>
      )}
    </section>
  )
}
