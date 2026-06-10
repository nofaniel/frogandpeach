import { memo, useMemo, type CSSProperties } from 'react'

export type SkyCondition = 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'storm' | 'snow' | 'fog' | 'default'

// Deterministic pseudo-random in [0,1) from an integer seed. Keeps particle
// layouts stable across renders (no re-randomising flicker) without useState.
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

type Particle = { style: CSSProperties }

function buildDrops(count: number, fast: boolean): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const left = rand(i + 1) * 100
    const delay = rand(i + 7) * -1.4
    const duration = (fast ? 0.5 : 0.85) + rand(i + 13) * (fast ? 0.35 : 0.5)
    const length = (fast ? 14 : 10) + rand(i + 19) * 12
    const opacity = 0.28 + rand(i + 23) * 0.4
    return {
      style: {
        left: `${left}%`,
        height: `${length}px`,
        opacity,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      } as CSSProperties,
    }
  })
}

function buildFlakes(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const left = rand(i + 2) * 100
    const delay = rand(i + 5) * -9
    const duration = 6 + rand(i + 11) * 7
    const size = 3 + rand(i + 17) * 4
    const drift = (rand(i + 29) - 0.5) * 60
    const opacity = 0.45 + rand(i + 31) * 0.5
    return {
      style: {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        '--wx-drift': `${drift}px`,
      } as CSSProperties,
    }
  })
}

function buildStars(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const left = rand(i + 3) * 100
    const top = rand(i + 41) * 62
    const size = 1 + rand(i + 53) * 2
    const delay = rand(i + 61) * -4
    const duration = 2.6 + rand(i + 67) * 3
    return {
      style: {
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      } as CSSProperties,
    }
  })
}

// A soft, layered cloud built from overlapping blobs.
function Cloud({ className, style }: { className: string; style: CSSProperties }) {
  return (
    <div className={className} style={style} aria-hidden="true">
      <span className="wx-cloud-puff wx-cloud-puff--a" />
      <span className="wx-cloud-puff wx-cloud-puff--b" />
      <span className="wx-cloud-puff wx-cloud-puff--c" />
      <span className="wx-cloud-base" />
    </div>
  )
}

function buildClouds(count: number): Array<{ style: CSSProperties }> {
  return Array.from({ length: count }, (_, i) => {
    const top = 6 + rand(i + 71) * 46
    const scale = 0.7 + rand(i + 79) * 0.9
    const delay = rand(i + 83) * -40
    const duration = 38 + rand(i + 89) * 40
    const opacity = 0.55 + rand(i + 97) * 0.4
    return {
      style: {
        top: `${top}%`,
        opacity,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        '--wx-cloud-scale': scale,
      } as CSSProperties,
    }
  })
}

function WeatherSceneImpl({ condition, isNight }: { condition: SkyCondition; isNight: boolean }) {
  const isClearLike = condition === 'clear' || condition === 'partly-cloudy' || condition === 'default'
  const showSun = isClearLike && !isNight
  const showMoon = isClearLike && isNight
  const showStars = isNight && (condition === 'clear' || condition === 'partly-cloudy' || condition === 'default')

  const cloudCount = useMemo(() => {
    switch (condition) {
      case 'overcast': return 4
      case 'rain': return 3
      case 'storm': return 3
      case 'snow': return 2
      case 'partly-cloudy': return 2
      case 'default': return 1
      default: return 0
    }
  }, [condition])

  const clouds = useMemo(() => buildClouds(cloudCount), [cloudCount])
  const drops = useMemo(
    () => (condition === 'rain' ? buildDrops(38, false) : condition === 'storm' ? buildDrops(54, true) : []),
    [condition],
  )
  const flakes = useMemo(() => (condition === 'snow' ? buildFlakes(34) : []), [condition])
  const stars = useMemo(() => (showStars ? buildStars(34) : []), [showStars])

  const sceneClass = `wx-scene wx-scene--${condition}${isNight ? ' wx-scene--night' : ''}`

  return (
    <div className={sceneClass} aria-hidden="true">
      <div className="wx-sky" />
      <div className="wx-sky-glow" />

      {stars.length > 0 && (
        <div className="wx-stars">
          {stars.map((s, i) => (
            <span key={i} className="wx-star" style={s.style} />
          ))}
        </div>
      )}

      {showMoon && (
        <div className="wx-moon">
          <span className="wx-moon-shadow" />
        </div>
      )}

      {showSun && (
        <div className="wx-sun">
          <span className="wx-sun-core" />
          <span className="wx-sun-halo" />
        </div>
      )}

      {clouds.length > 0 && (
        <div className="wx-clouds">
          {clouds.map((c, i) => (
            <Cloud key={i} className="wx-cloud" style={c.style} />
          ))}
        </div>
      )}

      {drops.length > 0 && (
        <div className="wx-rain">
          {drops.map((d, i) => (
            <span key={i} className="wx-drop" style={d.style} />
          ))}
        </div>
      )}

      {flakes.length > 0 && (
        <div className="wx-snow">
          {flakes.map((f, i) => (
            <span key={i} className="wx-flake" style={f.style} />
          ))}
        </div>
      )}

      {condition === 'storm' && (
        <div className="wx-lightning">
          <span className="wx-bolt" />
        </div>
      )}

      {condition === 'fog' && (
        <div className="wx-fog">
          <span className="wx-fog-band wx-fog-band--1" />
          <span className="wx-fog-band wx-fog-band--2" />
          <span className="wx-fog-band wx-fog-band--3" />
        </div>
      )}

      <div className="wx-scrim" />
    </div>
  )
}

export const WeatherScene = memo(WeatherSceneImpl)
