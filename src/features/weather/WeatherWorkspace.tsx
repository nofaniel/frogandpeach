import { type CSSProperties, type ReactNode } from 'react'
import type { Module, Settings, WeatherSummary } from '../../shared/api-types'
import { formatDate, formatNumber, formatTemperature, formatTime, weatherIcon } from '../../shared/format'
import { formatLocationLabel } from '../../shared/location'
import { airQualityLevel, formatCurrentPrecipitationMm, overallPollenLevel, pollenAvailable, pollenLevel, uvLevel } from '../../shared/weather'
import { WeatherScene, type SkyCondition } from './WeatherScene'

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

function formatDaylight(sunrise: string | null, sunset: string | null): string {
  if (!sunrise || !sunset) return '--'
  const diff = new Date(sunset).getTime() - new Date(sunrise).getTime()
  if (!Number.isFinite(diff) || diff <= 0) return '--'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.round((diff % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

type HourWithIndex = WeatherSummary['hourly'][number] & { index: number }

function findPeakRainHour(hourly: HourWithIndex[]) {
  return hourly.reduce<HourWithIndex | null>((best, hour) => {
    if (hour.precipitationChance === null) return best
    if (!best || best.precipitationChance === null || hour.precipitationChance > best.precipitationChance) return hour
    return best
  }, null)
}

function findDriestHour(hourly: HourWithIndex[]) {
  return hourly.reduce<HourWithIndex | null>((best, hour) => {
    if (hour.precipitationChance === null) return best
    if (!best || best.precipitationChance === null || hour.precipitationChance < best.precipitationChance) return hour
    return best
  }, null)
}

function findNextConditionShift(currentLabel: string | undefined, hourly: HourWithIndex[]) {
  const current = deriveCondition(currentLabel ?? '')
  return hourly.find((hour) => hour.index > 0 && deriveCondition(hour.label) !== current) ?? null
}

function formatInsightHour(hour: HourWithIndex) {
  return hour.index === 0 ? 'right now' : formatWeatherHour(hour.time, hour.index)
}

function formatDaylightRemaining(observed: string | null, sunset: string | null) {
  if (!observed || !sunset) return null
  const diff = new Date(sunset).getTime() - new Date(observed).getTime()
  if (!Number.isFinite(diff) || diff <= 0) return null
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

function formatRainPeakText(hour: HourWithIndex) {
  const chance = `${formatNumber(hour.precipitationChance)}%`
  return hour.index === 0 ? `Rain risk is ${chance} now` : `Rain peaks ${chance} at ${formatInsightHour(hour)}`
}

function formatRainBriefText(hour: HourWithIndex | null) {
  if (!hour) return 'No strong precipitation signal is showing in the next few hours.'
  const chance = `${formatNumber(hour.precipitationChance)}%`
  return hour.index === 0
    ? `Rain risk is currently ${chance}; watch for changes through the next few hours.`
    : `The strongest rain signal is ${chance} around ${formatInsightHour(hour)}.`
}

const POLLEN_LABELS: Record<string, string> = {
  grass: 'Grass',
  birch: 'Birch',
  alder: 'Alder',
  mugwort: 'Mugwort',
  olive: 'Olive',
  ragweed: 'Ragweed',
}

function deriveCondition(label: string): SkyCondition {
  const l = label.toLowerCase()
  if (l.includes('thunder') || l.includes('storm')) return 'storm'
  if (l.includes('snow') || l.includes('blizzard') || l.includes('sleet')) return 'snow'
  if (l.includes('rain') || l.includes('drizzle') || l.includes('shower')) return 'rain'
  if (l.includes('fog') || l.includes('mist') || l.includes('haze')) return 'fog'
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

// ── Inline icon primitives (strokeWidth 1.6, currentColor) ──
type IconProps = { className?: string }
function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const WindIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12h14a2.5 2.5 0 1 1-2.5 2.5" /><path d="M3 16h8" /></Svg>
)
const GustIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 17a8 8 0 0 1 16 0" /><path d="M12 17l4.2-4.2" /><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" /></Svg>
)
const DropletIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M12 3.2s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8Z" /></Svg>
)
const SunIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" /></Svg>
)
const SunriseIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M3 19h18" /><path d="M7 19a5 5 0 0 1 10 0" /><path d="M12 3.5v4" /><path d="M9 6l3-3 3 3" /></Svg>
)
const SunsetIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M3 19h18" /><path d="M7 19a5 5 0 0 1 10 0" /><path d="M12 7.5v-4" /><path d="M9 5l3 3 3-3" /></Svg>
)
const LeafIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M5 19c0-8 6.2-13.5 14-14-.5 7.8-6 14-14 14Z" /><path d="M5 19c4-4.2 7.2-7.4 10.5-8.6" /></Svg>
)
const FlowerIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="12" cy="12" r="2.4" />{[0, 60, 120, 180, 240, 300].map((deg) => (
    <ellipse key={deg} cx="12" cy="6.6" rx="1.9" ry="3.1" transform={`rotate(${deg} 12 12)`} />
  ))}</Svg>
)

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="weather-ws-stat">
      <span className="weather-ws-stat-icon">{icon}</span>
      <span className="weather-ws-stat-text">
        <span className="weather-ws-stat-label">{label}</span>
        <strong className="weather-ws-stat-value">{value}</strong>
      </span>
    </div>
  )
}

function StaticWeatherScene({ condition, isNight }: { condition: SkyCondition; isNight: boolean }) {
  return (
    <div className={`wx-scene wx-scene--${condition}${isNight ? ' wx-scene--night' : ''} wx-scene--static`} aria-hidden="true">
      <div className="wx-sky" />
      <div className="wx-sky-glow" />
      <div className="wx-scrim" />
    </div>
  )
}

function WeatherBackdrop({ condition, isNight, enhancedAnimations }: { condition: SkyCondition; isNight: boolean; enhancedAnimations: boolean }) {
  return enhancedAnimations ? <WeatherScene condition={condition} isNight={isNight} /> : <StaticWeatherScene condition={condition} isNight={isNight} />
}

function EmptyShell({ condition, isNight, enhancedAnimations, children }: { condition: SkyCondition; isNight: boolean; enhancedAnimations: boolean; children: ReactNode }) {
  return (
    <section className={`workspace-grid weather-workspace weather-cond--${condition}${isNight ? ' weather-cond--night' : ''}`}>
      <article className="weather-ws-empty">
        <WeatherBackdrop condition={condition} isNight={isNight} enhancedAnimations={enhancedAnimations} />
        <div className="weather-ws-empty-content">{children}</div>
      </article>
    </section>
  )
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
  const enhancedAnimations = module?.options.enhancedAnimations === true

  if (!locationConfigured) {
    return (
      <EmptyShell condition="default" isNight={false} enhancedAnimations={enhancedAnimations}>
        <p className="weather-ws-empty-kicker">Weather station offline</p>
        <h2>Choose a home location</h2>
        <p className="weather-ws-empty-desc">Set latitude, longitude, and timezone in Admin settings before the observatory can pull local weather.</p>
        <button type="button" className="button-link weather-ws-empty-action" onClick={onOpenAdmin}>Open Admin settings</button>
      </EmptyShell>
    )
  }

  if (!weather) {
    return (
      <EmptyShell condition="fog" isNight={false} enhancedAnimations={enhancedAnimations}>
        <p className="weather-ws-empty-kicker">Weather station quiet</p>
        <h2>Weather unavailable</h2>
        <p className="weather-ws-empty-desc">The latest forecast could not be loaded right now. Try again shortly or clear the weather cache from Admin.</p>
      </EmptyShell>
    )
  }

  const weatherLocation = weather.location?.trim() || formatLocationLabel(publicSettings)
  const showUv = module?.options.showUvIndex === true
  const showAir = module?.options.showAirQuality === true
  const showPollen = module?.options.showPollen === true
  const env = weather.environment
  const today = weather.daily[0]
  const nextDays = weather.daily.slice(1)
  const hourlyWithIndex = weather.hourly.map((hour, index) => ({ ...hour, index }))
  const peakRainHour = findPeakRainHour(hourlyWithIndex)
  const driestHour = findDriestHour(hourlyWithIndex)
  const nextConditionShift = findNextConditionShift(weather.current.label, hourlyWithIndex)
  const daylightRemaining = formatDaylightRemaining(weather.current.time, today?.sunset ?? null)
  const warmestDay = weather.daily.length > 0
    ? weather.daily.reduce((best, day) => ((day.max ?? Number.NEGATIVE_INFINITY) > (best.max ?? Number.NEGATIVE_INFINITY) ? day : best), weather.daily[0])
    : null

  const condition = deriveCondition(weather.current.label)
  const isNight = isNightTime(today?.sunrise ?? null, today?.sunset ?? null)
  const conditionClass = `weather-cond--${condition}${isNight ? ' weather-cond--night' : ''}`

  return (
    <section className={`workspace-grid weather-workspace ${conditionClass}`}>
      {/* Hero — animated weather scene */}
      <article className="weather-ws-hero">
        <WeatherBackdrop condition={condition} isNight={isNight} enhancedAnimations={enhancedAnimations} />
        <div className="weather-ws-hero-content">
          <header className="weather-ws-hero-header">
            <div>
              <p className="weather-ws-hero-location">{weatherLocation}</p>
              <p className="weather-ws-hero-time">{formatObservationTime(weather.current.time)}</p>
            </div>
            <span className="weather-ws-hero-live">Live</span>
          </header>

          <div className="weather-ws-hero-shell">
            <div className="weather-ws-hero-primary">
              <div className="weather-ws-hero-main">
                <span className="weather-ws-hero-temp">{formatTemperature(weather.current.temperature)}</span>
                <div className="weather-ws-hero-meta">
                  <p className="weather-ws-hero-label">{weather.current.label}</p>
                  <p className="weather-ws-hero-feels">Feels like {formatTemperature(weather.current.feelsLike)}</p>
                  <p className="weather-ws-hero-range">
                    <span className="weather-ws-hero-range-hi">H {formatTemperature(today?.max)}</span>
                    <span className="weather-ws-hero-range-lo">L {formatTemperature(today?.min)}</span>
                  </p>
                </div>
              </div>

              <div className="weather-ws-hero-pulse" aria-label="Current weather highlights">
                {peakRainHour && (
                  <span className="weather-ws-hero-pulse-item">
                    {formatRainPeakText(peakRainHour)}
                  </span>
                )}
                {driestHour && (
                  <span className="weather-ws-hero-pulse-item">
                    Best gap {formatInsightHour(driestHour)} at {formatNumber(driestHour.precipitationChance)}%
                  </span>
                )}
                <span className="weather-ws-hero-pulse-item">
                  {daylightRemaining ? `${daylightRemaining} of daylight left` : `Sunset ${formatSunriseSunset(today?.sunset ?? null)}`}
                </span>
              </div>
            </div>

            <aside className="weather-ws-hero-brief" aria-label="Quick weather brief">
              <div className="weather-ws-hero-brief-icon" aria-hidden="true">{weatherIcon(weather.current.label)}</div>
              <div className="weather-ws-hero-brief-copy">
                <p className="weather-ws-hero-brief-kicker">Quick read</p>
                <p className="weather-ws-hero-brief-title">
                  {nextConditionShift ? `${nextConditionShift.label} by ${formatInsightHour(nextConditionShift)}` : 'Steady conditions through the next few hours'}
                </p>
                <p className="weather-ws-hero-brief-text">
                  {formatRainBriefText(peakRainHour)}
                </p>
                <div className="weather-ws-hero-brief-meta">
                  <span>{today ? `Daylight ${formatDaylight(today.sunrise, today.sunset)}` : 'Daylight unavailable'}</span>
                  <span>{warmestDay ? `Warmest ${formatDate(warmestDay.date)} at ${formatTemperature(warmestDay.max)}` : 'No weekly high yet'}</span>
                </div>
              </div>
            </aside>
          </div>

          <div className="weather-ws-stats">
            <HeroStat icon={<WindIcon />} label="Wind" value={`${formatNumber(weather.current.windSpeed)} km/h`} />
            <HeroStat icon={<GustIcon />} label="Gusts" value={`${formatNumber(weather.current.windGusts)} km/h`} />
            <HeroStat icon={<DropletIcon />} label="Precip" value={formatCurrentPrecipitationMm(weather.current.precipitationMm)} />
            <HeroStat icon={<SunIcon />} label="UV max" value={today?.uvIndexMax != null ? formatNumber(today.uvIndexMax) : '--'} />
            <HeroStat icon={<SunriseIcon />} label="Sunrise" value={formatSunriseSunset(today?.sunrise ?? null)} />
            <HeroStat icon={<SunsetIcon />} label="Sunset" value={formatSunriseSunset(today?.sunset ?? null)} />
          </div>
        </div>
      </article>

      {(weather.hourly.length > 0 || nextDays.length > 0) && (
        <div className="weather-ws-detail-grid">
          {weather.hourly.length > 0 && (
            <article className="weather-ws-section weather-ws-section--hourly">
              <header className="weather-ws-section-header">
                <p className="weather-ws-section-kicker">Today</p>
                <h2>Hourly</h2>
              </header>
              <div className="weather-ws-hourly-track" tabIndex={0} aria-label="Hourly forecast">
                {weather.hourly.map((hour, index) => {
                  const chance = hour.precipitationChance
                  return (
                    <div className={`weather-ws-hour-item${index === 0 ? ' weather-ws-hour-item--now' : ''}`} key={hour.time}>
                      <span className="weather-ws-hour-label">{formatWeatherHour(hour.time, index)}</span>
                      <span className="weather-ws-hour-emoji">{weatherIcon(hour.label)}</span>
                      <span className="weather-ws-hour-degrees">{formatTemperature(hour.temperature)}</span>
                      <div className="weather-ws-hour-rain-bar" title={chance !== null ? `${formatNumber(chance)}% rain chance` : 'No rain data'}>
                        <div
                          className="weather-ws-hour-rain-fill"
                          style={{ '--rain': `${chance ?? 0}%` } as CSSProperties}
                        />
                      </div>
                      <span className="weather-ws-hour-rain-label">
                        {chance !== null ? `${formatNumber(chance)}%` : '--'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>
          )}

          {nextDays.length > 0 && (
            <article className="weather-ws-section weather-ws-section--daily">
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
                      <span className="weather-ws-daily-temps">
                        <span className="weather-ws-daily-max">{formatTemperature(day.max)}</span>
                        <span className="weather-ws-daily-min">{formatTemperature(day.min)}</span>
                      </span>
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
        </div>
      )}

      {/* Today summary strip */}
      {today && (
        <div className="weather-ws-summary" aria-label="Weather field notes">
          <div className="weather-ws-summary-item">
            <span className="weather-ws-summary-label">Rain watch</span>
            <strong>{peakRainHour ? `${formatNumber(peakRainHour.precipitationChance)}%` : '--'}</strong>
            <p>{peakRainHour ? (peakRainHour.index === 0 ? 'Highest risk is right now.' : `Peaks around ${formatInsightHour(peakRainHour)}.`) : 'No clear precipitation peak is showing yet.'}</p>
          </div>
          <div className="weather-ws-summary-item">
            <span className="weather-ws-summary-label">Best gap</span>
            <strong>{driestHour ? formatInsightHour(driestHour) : '--'}</strong>
            <p>{driestHour ? `${formatNumber(driestHour.precipitationChance)}% rain chance.` : 'No drier window available.'}</p>
          </div>
          <div className="weather-ws-summary-item">
            <span className="weather-ws-summary-label">Daylight</span>
            <strong>{daylightRemaining ?? formatDaylight(today.sunrise, today.sunset)}</strong>
            <p>{daylightRemaining ? `Sunset at ${formatSunriseSunset(today.sunset)}.` : `Full daylight span today.`}</p>
          </div>
          <div className="weather-ws-summary-item">
            <span className="weather-ws-summary-label">Week high</span>
            <strong>{warmestDay ? formatTemperature(warmestDay.max) : '--'}</strong>
            <p>{warmestDay ? `${formatDate(warmestDay.date)} looks warmest.` : 'Weekly high unavailable.'}</p>
          </div>
        </div>
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
                  <span className="weather-ws-env-card-icon"><SunIcon /></span>
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
                  <span className="weather-ws-env-card-icon"><LeafIcon /></span>
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
                  <span className="weather-ws-env-card-icon"><FlowerIcon /></span>
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
