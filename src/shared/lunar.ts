/**
 * Lunar phase computation — pure client-side, no API.
 * Based on Jean Meeus's "Astronomical Algorithms" simplified synodic model.
 */

export type LunarPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export type LunarInfo = {
  /** Phase fraction 0..1 (0 = new moon, 0.5 = full moon) */
  phase: number
  /** Illuminated fraction 0..1 */
  illumination: number
  /** Human-readable phase name */
  name: LunarPhaseName
  /** ISO timestamp of next phase transition */
  nextPhaseDate: string
  /** Name of next phase */
  nextPhaseName: LunarPhaseName
  /** Days until next phase change */
  daysUntilNextPhase: number
  /** Moon age in days since last new moon */
  age: number
  /** Waxing or waning */
  orientation: 'waxing' | 'waning'
}

// Known new moon epoch (Jan 6 2000 18:14 UTC) and synodic month length
const NEW_MOON_EPOCH_JD = 2451550.26
const SYNODIC_MONTH = 29.53058867

const PHASE_NAMES: LunarPhaseName[] = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400

  let yr = y
  let mo = m
  if (mo <= 2) {
    yr -= 1
    mo += 12
  }

  const A = Math.floor(yr / 100)
  const B = 2 - A + Math.floor(A / 4)

  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5
}

function getPhaseIndex(phase: number): number {
  // phase is 0..1, map to 8 phase buckets
  // Each phase occupies 1/8 of the cycle
  const shifted = phase + 1 / 16 // offset by half a bucket so boundaries center on the name
  return Math.floor((shifted % 1) * 8) % 8
}

function getPhaseName(phase: number): LunarPhaseName {
  return PHASE_NAMES[getPhaseIndex(phase)]
}

function getIllumination(phase: number): number {
  // Illumination follows (1 - cos(2π * phase)) / 2
  return (1 - Math.cos(2 * Math.PI * phase)) / 2
}

function findNextPhaseChange(age: number): { daysUntil: number; name: LunarPhaseName } {
  const currentIdx = getPhaseIndex(age / SYNODIC_MONTH)
  const nextIdx = (currentIdx + 1) % 8
  const nextPhaseName = PHASE_NAMES[nextIdx]

  // Distance to next phase boundary
  const currentPhase = age / SYNODIC_MONTH
  const nextBoundary = (Math.floor(currentPhase * 8) + 1) / 8
  const daysUntil = (nextBoundary - currentPhase) * SYNODIC_MONTH

  // Handle wrap-around (next phase is in the next cycle)
  const days = daysUntil > 0 ? daysUntil : daysUntil + SYNODIC_MONTH

  return { daysUntil: days, name: nextPhaseName }
}

export function computeLunarInfo(date: Date): LunarInfo {
  const jd = toJulianDay(date)
  const age = ((jd - NEW_MOON_EPOCH_JD) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH
  const phase = age / SYNODIC_MONTH
  const illumination = getIllumination(phase)
  const name = getPhaseName(phase)
  const next = findNextPhaseChange(age)

  const nextPhaseDate = new Date(date.getTime() + next.daysUntil * 86400000)

  return {
    phase,
    illumination,
    name,
    nextPhaseDate: nextPhaseDate.toISOString(),
    nextPhaseName: next.name,
    daysUntilNextPhase: next.daysUntil,
    age,
    orientation: phase < 0.5 ? 'waxing' : 'waning',
  }
}

/**
 * Format moon illumination as a percentage string.
 */
export function formatIllumination(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/**
 * Format days until next phase as a human-readable string.
 */
export function formatDaysUntilNext(days: number): string {
  if (days < 1) return 'later today'
  if (days < 1.5) return 'tomorrow'
  return `in ${Math.round(days)} days`
}
