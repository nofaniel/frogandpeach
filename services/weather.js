import { cache } from '../db.js';

const LAT = 50.4150;
const LON = -5.0760;
const TTL_MS = 30 * 60 * 1000; // 30 min
const KEY = 'weather:newquay';

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,is_day` +
  `&hourly=temperature_2m,precipitation_probability,weather_code` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
  `&forecast_days=2&timezone=Europe%2FLondon`;

const WMO = {
  0: ['Clear', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Thunderstorm + hail', '⛈️'],
};

export function describeWeather(code) {
  return WMO[code] || ['Unknown', '❔'];
}

export async function getWeather() {
  const cached = cache.get(KEY);
  if (cached && !cached.expired) return { ...cached.value, stale: false, fetched_at: cached.fetched_at };
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json();
    cache.set(KEY, json, TTL_MS);
    return { ...json, stale: false, fetched_at: Date.now() };
  } catch (err) {
    if (cached) return { ...cached.value, stale: true, fetched_at: cached.fetched_at, error: String(err) };
    return { error: String(err), stale: true };
  }
}
