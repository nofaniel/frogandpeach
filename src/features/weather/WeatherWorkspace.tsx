import { type CSSProperties } from 'react'
import type { Module, Settings, WeatherSummary } from '../../shared/api-types'
import { formatDate, formatNumber, formatTemperature, formatTime, weatherIcon } from '../../shared/format'
import { formatLocationLabel } from '../../shared/location'
import { airQualityLevel, formatCurrentPrecipitationMm, overallPollenLevel, pollenAvailable, pollenLevel, uvLevel } from '../../shared/weather'
import { InfoTooltip } from '../home/widgets/InfoTooltip'

function formatWeatherHour(time: string, index: number): string {
  if (index === 0) return 'Now'
  const hour = time.split('T')[1]?.split(':')[0]
  return hour ? `${hour}:00` : time
}

function formatSunriseSunset(iso: string | null): string {
  if (!iso) return '--'
  return formatTime(iso)
}

const POLLEN_LABELS: Record<string, string> = {
  grass: 'Grass',
  birch: 'Birch',
  alder: 'Alder',
  mugwort: 'Mugwort',
  olive: 'Olive',
  ragweed: 'Ragweed',
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
        <article className="panel span-2">
          <p className="kicker">Weather</p>
          <h2>Location not set</h2>
          <p>Set latitude, longitude, and timezone in Admin settings before weather data can load.</p>
          <button type="button" className="button-link" onClick={onOpenAdmin}>Open Admin settings</button>
        </article>
      </section>
    )
  }

  if (!weather) {
    return (
      <section className="workspace-grid weather-workspace">
        <article className="panel span-2">
          <p className="kicker">Weather</p>
          <h2>Weather unavailable</h2>
          <p>Weather data could not be loaded right now.</p>
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

  return (
    <section className="workspace-grid weather-workspace">
      <article className="panel span-2 weather-ws-current">
        <div className="weather-ws-orb" aria-hidden="true" />
        <div className="weather-ws-header">
          <div className="weather-ws-location">{weatherLocation.toUpperCase()}</div>
          <div className="weather-ws-conditions">
            <div className="weather-ws-icon">{weatherIcon(weather.current.label)}</div>
            <div className="weather-ws-temp-group">
              <strong className="weather-ws-temp">{formatTemperature(weather.current.temperature)}</strong>
              <span className="weather-ws-label">{weather.current.label}</span>
            </div>
          </div>
        </div>
        <div className="weather-ws-metrics">
          <div className="weather-ws-metric">
            <span className="weather-ws-metric-label">Feels like</span>
            <strong>{formatTemperature(weather.current.feelsLike)}</strong>
          </div>
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
            <span className="weather-ws-metric-label">High / Low</span>
            <strong>{formatTemperature(today?.max)} / {formatTemperature(today?.min)}</strong>
          </div>
          <div className="weather-ws-metric">
            <span className="weather-ws-metric-label">Rain chance</span>
            <strong>{formatNumber(today?.precipitationChance)}%</strong>
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
      </article>

      {weather.hourly.length > 0 && (
        <article className="panel span-2 weather-ws-hourly">
          <div className="panel-heading">
            <div>
              <p className="kicker">Today</p>
              <h2>Hourly forecast</h2>
            </div>
          </div>
          <div className="weather-ws-hourly-track">
            {weather.hourly.map((hour, index) => (
              <article className="weather-ws-hour-card" key={hour.time}>
                <div className="weather-ws-hour-time">{formatWeatherHour(hour.time, index)}</div>
                <div className="weather-ws-hour-icon">{weatherIcon(hour.label)}</div>
                <div className="weather-ws-hour-temp">{formatTemperature(hour.temperature)}</div>
                {hour.precipitationChance !== null && (
                  <div className="weather-ws-hour-rain">{formatNumber(hour.precipitationChance)}%</div>
                )}
              </article>
            ))}
          </div>
        </article>
      )}

      {nextDays.length > 0 && (
        <article className="panel span-2 weather-ws-week">
          <div className="panel-heading">
            <div>
              <p className="kicker">Next days</p>
              <h2>Forecast</h2>
            </div>
          </div>
          <div className="weather-ws-week-grid">
            {nextDays.map((day) => {
              const precip = day.precipitationChance === null ? null : Math.max(0, Math.min(100, day.precipitationChance))
              return (
                <div
                  key={day.date}
                  className="weather-ws-week-card"
                  style={{ '--precip': `${precip ?? 0}%` } as CSSProperties}
                >
                  <div className="weather-ws-week-date">{formatDate(day.date)}</div>
                  <div className="weather-ws-week-icon">{weatherIcon(day.label)}</div>
                  <div className="weather-ws-week-label">{day.label}</div>
                  <div className="weather-ws-week-temps">
                    {formatTemperature(day.max)} / {formatTemperature(day.min)}
                  </div>
                  <div className="weather-ws-week-uv">
                    UV {day.uvIndexMax != null ? formatNumber(day.uvIndexMax) : '--'}
                  </div>
                  <div className="weather-ws-precip-track">
                    <span />
                  </div>
                  {precip !== null && (
                    <div className="weather-ws-week-precip">{formatNumber(precip)}%</div>
                  )}
                </div>
              )
            })}
          </div>
        </article>
      )}

      {(showUv || showAir || showPollen) && (
        <article className="panel span-2 weather-ws-environment">
          <div className="panel-heading">
            <div>
              <p className="kicker">Environment</p>
              <h2>At-a-glance</h2>
            </div>
          </div>
          <div className="weather-ws-env-grid">
            {showUv && (
              <div className="weather-ws-env-card">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-icon">☀️</span>
                  <strong>UV Index</strong>
                </div>
                {env ? (
                  <>
                    <div className="weather-ws-env-value">
                      {env.uvIndex !== null ? formatNumber(env.uvIndex) : '--'}
                    </div>
                    <div className="weather-ws-env-detail">
                      Level: {uvLevel(env.uvIndex) ?? '--'}
                    </div>
                    <div className="weather-ws-env-detail">
                      Today's max: {env.uvIndexMax != null ? formatNumber(env.uvIndexMax) : '--'}
                    </div>
                  </>
                ) : (
                  <p className="small-note">UV data unavailable</p>
                )}
              </div>
            )}
            {showAir && (
              <div className="weather-ws-env-card">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-icon">🍃</span>
                  <strong>Air Quality</strong>
                </div>
                {env?.airQuality ? (
                  <>
                    <div className="weather-ws-env-value">
                      {env.airQuality.europeanAqi !== null ? formatNumber(env.airQuality.europeanAqi) : '--'}
                    </div>
                    <div className="weather-ws-env-detail">
                      AQI: {airQualityLevel(env.airQuality.europeanAqi) ?? '--'}
                    </div>
                    <div className="weather-ws-env-detail">
                      PM2.5: {env.airQuality.pm2_5 !== null ? `${formatNumber(env.airQuality.pm2_5)} µg/m³` : '--'}
                    </div>
                    <div className="weather-ws-env-detail">
                      PM10: {env.airQuality.pm10 !== null ? `${formatNumber(env.airQuality.pm10)} µg/m³` : '--'}
                    </div>
                  </>
                ) : (
                  <p className="small-note">Air quality data unavailable</p>
                )}
              </div>
            )}
            {showPollen && (
              <div className="weather-ws-env-card weather-ws-env-card--wide">
                <div className="weather-ws-env-card-header">
                  <span className="weather-ws-env-icon">🌾</span>
                  <strong>Pollen</strong>
                </div>
                {env?.pollen && pollenAvailable(env.pollen) ? (
                  <>
                    <div className="weather-ws-env-value">{overallPollenLevel(env.pollen) ?? '--'}</div>
                    <div className="weather-ws-pollen-grid">
                      {Object.entries(POLLEN_LABELS).map(([key, label]) => {
                        const allergens = env.pollen as unknown as Record<string, number | null>
                        const value = allergens[key] ?? null
                        const level = pollenLevel(value)
                        return (
                          <div className="weather-ws-pollen-item" key={key}>
                            <span className="weather-ws-pollen-name">{label}</span>
                            <span className="weather-ws-pollen-value">
                              {value !== null ? `${formatNumber(value)} grains/m³` : '--'}
                            </span>
                            {level && (
                              <span className={`weather-ws-pollen-level weather-ws-pollen-level--${level.toLowerCase()}`}>
                                {level}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="weather-ws-env-unavailable">
                    <p>Pollen data is available for European locations only via Open-Meteo.</p>
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
