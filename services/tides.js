import { cache } from '../db.js';

const TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const KEY = 'tides:newquay';
const STATION = '0521'; // Newquay (Admiralty UKHO station id)

async function fetchAdmiralty(key) {
  const url = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${STATION}/TidalEvents?duration=2`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Admiralty ${res.status}`);
  const events = await res.json();
  return events.map(e => ({
    type: e.EventType === 'HighWater' ? 'High' : 'Low',
    time: e.DateTime,        // ISO string
    height: e.Height,        // metres
  }));
}

async function fetchTideTimesScrape() {
  // Best-effort fallback: scrape "Next High/Low Tide" from the public page.
  const res = await fetch('https://www.tidetimes.org.uk/newquay-tide-times', {
    headers: { 'user-agent': 'Mozilla/5.0 flat-hub/0.1' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`tidetimes ${res.status}`);
  const html = await res.text();
  const events = [];
  const hi = /Next High Tide:\s*(\d{1,2}:\d{2})/i.exec(html);
  const lo = /Next Low Tide:\s*(\d{1,2}:\d{2})/i.exec(html);
  if (hi) events.push({ type: 'High', time: hi[1] });
  if (lo) events.push({ type: 'Low', time: lo[1] });
  if (events.length === 0) throw new Error('tidetimes: no rows parsed');
  // Sort chronologically (assuming both times are in the next ~24h).
  events.sort((a, b) => {
    const ta = parseHM(a.time);
    const tb = parseHM(b.time);
    return ta - tb;
  });
  return events;
}

function parseHM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return 0;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  // If the time has already passed by more than an hour, assume it's tomorrow.
  if (d.getTime() < now.getTime() - 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export async function getTides() {
  const cached = cache.get(KEY);
  if (cached && !cached.expired) return { events: cached.value, stale: false, fetched_at: cached.fetched_at };
  const key = process.env.ADMIRALTY_KEY;
  try {
    const events = key ? await fetchAdmiralty(key) : await fetchTideTimesScrape();
    cache.set(KEY, events, TTL_MS);
    return { events, stale: false, fetched_at: Date.now(), source: key ? 'admiralty' : 'tidetimes' };
  } catch (err) {
    if (cached) return { events: cached.value, stale: true, fetched_at: cached.fetched_at, error: String(err) };
    return { events: [], stale: true, error: String(err) };
  }
}

export function nextTides(events, n = 2) {
  const now = Date.now();
  return events
    .map(e => ({ ...e, when: parseTideTime(e.time) }))
    .filter(e => e.when && e.when.getTime() >= now - 60 * 60 * 1000)
    .slice(0, n);
}

function parseTideTime(t) {
  if (!t) return null;
  // ISO timestamp from Admiralty
  if (t.includes('T')) {
    const d = new Date(t);
    return isNaN(d) ? null : d;
  }
  // "HH:MM" from the scrape — if past by more than an hour, roll to tomorrow.
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  if (d.getTime() < now.getTime() - 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}
