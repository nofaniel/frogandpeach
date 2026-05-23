const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

const APP_LOCATION = {
  name: process.env.LOCATION_NAME || 'Newquay',
  region: process.env.LOCATION_REGION || 'Cornwall',
  latitude: Number(process.env.LOCATION_LATITUDE ?? 50.4155),
  longitude: Number(process.env.LOCATION_LONGITUDE ?? -5.0815),
  timezone: process.env.LOCATION_TIMEZONE || 'Europe/London',
  tideLocationName: process.env.TIDE_LOCATION_NAME || 'Newquay Harbour',
};

// ── Data file paths ───────────────────────────────────────────────────────────
const FILES = {
  lists: path.join(DATA_DIR, 'lists.json'),
  notes: path.join(DATA_DIR, 'notes.json'),
  pages: path.join(DATA_DIR, 'pages.json'),
};

// Ensure data dir and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
Object.values(FILES).forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, '[]'); });

// ── Helpers ───────────────────────────────────────────────────────────────────
const readData  = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const now = () => new Date().toISOString();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (_req, res) => {
  res.json({ location: APP_LOCATION });
});

// ── LISTS ─────────────────────────────────────────────────────────────────────
app.get('/api/lists', (req, res) => res.json(readData(FILES.lists)));

app.post('/api/lists', (req, res) => {
  const lists = readData(FILES.lists);
  const list = { id: uid(), name: req.body.name || 'New List', items: [], createdAt: now(), updatedAt: now() };
  lists.unshift(list);
  writeData(FILES.lists, lists);
  res.json(list);
});

app.get('/api/lists/:id', (req, res) => {
  const list = readData(FILES.lists).find(l => l.id === req.params.id);
  if (!list) return res.status(404).json({ error: 'Not found' });
  res.json(list);
});

app.put('/api/lists/:id', (req, res) => {
  const lists = readData(FILES.lists);
  const idx = lists.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  lists[idx] = { ...lists[idx], ...req.body, updatedAt: now() };
  writeData(FILES.lists, lists);
  res.json(lists[idx]);
});

app.delete('/api/lists/:id', (req, res) => {
  writeData(FILES.lists, readData(FILES.lists).filter(l => l.id !== req.params.id));
  res.json({ ok: true });
});

// ── NOTES ─────────────────────────────────────────────────────────────────────
app.get('/api/notes', (req, res) => res.json(readData(FILES.notes)));

app.post('/api/notes', (req, res) => {
  const notes = readData(FILES.notes);
  const note = { id: uid(), title: req.body.title || 'Untitled', content: req.body.content || '', createdAt: now(), updatedAt: now() };
  notes.unshift(note);
  writeData(FILES.notes, notes);
  res.json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const notes = readData(FILES.notes);
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  notes[idx] = { ...notes[idx], ...req.body, updatedAt: now() };
  writeData(FILES.notes, notes);
  res.json(notes[idx]);
});

app.delete('/api/notes/:id', (req, res) => {
  writeData(FILES.notes, readData(FILES.notes).filter(n => n.id !== req.params.id));
  res.json({ ok: true });
});

// ── PARTNER PAGES ─────────────────────────────────────────────────────────────
app.get('/api/pages', (req, res) => res.json(readData(FILES.pages)));

app.post('/api/pages', (req, res) => {
  const pages = readData(FILES.pages);
  const page = {
    id: uid(),
    title:   req.body.title   || 'Untitled',
    occasion: req.body.occasion || 'Just Because',
    message:  req.body.message  || '',
    emoji:    req.body.emoji    || '🌸',
    theme:    req.body.theme    || 'botanical',
    createdAt: now(),
  };
  pages.unshift(page);
  writeData(FILES.pages, pages);
  res.json(page);
});

app.get('/api/pages/:id', (req, res) => {
  const page = readData(FILES.pages).find(p => p.id === req.params.id);
  if (!page) return res.status(404).json({ error: 'Not found' });
  res.json(page);
});

app.put('/api/pages/:id', (req, res) => {
  const pages = readData(FILES.pages);
  const idx = pages.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  pages[idx] = { ...pages[idx], ...req.body };
  writeData(FILES.pages, pages);
  res.json(pages[idx]);
});

app.delete('/api/pages/:id', (req, res) => {
  writeData(FILES.pages, readData(FILES.pages).filter(p => p.id !== req.params.id));
  res.json({ ok: true });
});

// ── TIDES — harmonic prediction for configured location ───────────────────────
// No external API, no key, no sign-up. Computes from tidal harmonic constituents.
// Accuracy depends on the supplied constituent calibration.
//
// Method: h(t) = Z0 + Σ Aₙ · cos(ωₙ·t + φₙ)
//   t   = hours since J2000 epoch (2000-01-01 12:00 UTC)
//   φₙ  = V₀ₙ(J2000) − gₙ   (equilibrium argument minus local phase lag)

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Harmonic constituents: [amplitude(m), speed(°/h), phase@J2000(°)]
const DEFAULT_TIDE_CONSTITUENTS = [
  [1.60, 28.9841042, 309.3],  // M2  — principal lunar semidiurnal
  [0.65, 30.0000000, 160.0],  // S2  — principal solar semidiurnal
  [0.32, 28.4397295, 199.3],  // N2  — larger lunar elliptic semidiurnal
  [0.17, 30.0821373,   0.9],  // K2  — lunisolar semidiurnal
  [0.05, 15.0410686,  70.5],  // K1  — lunar diurnal
  [0.03, 13.9430356, 193.8],  // O1  — lunar diurnal
];

function parseConstituents(raw) {
  if (!raw) return DEFAULT_TIDE_CONSTITUENTS;
  try {
    const parsed = JSON.parse(raw);
    const valid = Array.isArray(parsed) && parsed.every(
      c => Array.isArray(c) && c.length === 3 && c.every(n => typeof n === 'number' && Number.isFinite(n))
    );
    return valid ? parsed : DEFAULT_TIDE_CONSTITUENTS;
  } catch {
    return DEFAULT_TIDE_CONSTITUENTS;
  }
}

const TIDE_CONSTITUENTS = parseConstituents(process.env.TIDE_CONSTITUENTS_JSON);
const TIDE_Z0 = Number(process.env.TIDE_Z0 ?? 2.90); // Mean Sea Level above Chart Datum (m)

function tidalHeight(msTime) {
  const t = (msTime - J2000_MS) / 3_600_000; // hours from J2000
  let h = Number.isFinite(TIDE_Z0) ? TIDE_Z0 : 2.90;
  for (const [amp, speed, phase] of TIDE_CONSTITUENTS) {
    h += amp * Math.cos((speed * t + phase) * (Math.PI / 180));
  }
  return h;
}

function predictTides(fromMs, hours = 36) {
  const STEP_MS = 5 * 60 * 1000; // 5-minute resolution for accurate peak detection
  const steps   = Math.ceil(hours * 60 / 5) + 2;
  const events  = [];

  // Pre-compute height array
  const h = Array.from({ length: steps }, (_, i) => tidalHeight(fromMs + i * STEP_MS));

  // 3-point local extrema detection — robust at flat peaks/troughs
  for (let i = 1; i < steps - 1; i++) {
    if (h[i] >= h[i - 1] && h[i] > h[i + 1]) {
      events.push({ EventType: 'HighWater', DateTime: new Date(fromMs + i * STEP_MS).toISOString(), Height: +h[i].toFixed(2) });
    } else if (h[i] <= h[i - 1] && h[i] < h[i + 1]) {
      events.push({ EventType: 'LowWater',  DateTime: new Date(fromMs + i * STEP_MS).toISOString(), Height: +h[i].toFixed(2) });
    }
  }
  return events;
}

app.get('/api/tides', async (req, res) => {
  // Tier 1: Admiralty UKHO — accurate real tide tables (needs API key + station ID in .env)
  try {
    const admiraltyEvents = await fetchAdmiraltyTides();
    if (admiraltyEvents && admiraltyEvents.length > 0) {
      return res.json(admiraltyEvents);
    }
  } catch (err) {
    console.warn('[tides] Admiralty fetch failed, falling back to harmonic:', String(err.message || err));
  }
  // Tier 2: Local harmonic prediction — 7 days, no external dependency
  res.json(predictTides(Date.now(), 7 * 24));
});

// ── TIDES — Admiralty UKHO (optional upgrade, needs ADMIRALTY_KEY + TIDE_STATION_ID) ──────
// Sign up free at https://admiraltyapi.portal.azure-api.net/
// Returns real high/low water times for the configured station for the next 7 days.
// Without these env vars the server falls back to local harmonic prediction.
async function fetchAdmiraltyTides() {
  const key     = process.env.ADMIRALTY_KEY;
  const station = process.env.TIDE_STATION_ID;
  if (!key || !station) return null;

  const url = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${encodeURIComponent(station)}/TidalEvents?duration=7`;
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Admiralty API ${res.status}`);
  const data = await res.json();
  // Normalise to { EventType, DateTime, Height } — same shape as harmonic output
  return data.map(e => ({
    EventType: e.EventType,                                           // 'HighWater' | 'LowWater'
    DateTime:  e.DateTime,
    Height:    typeof e.Height === 'number' ? +e.Height.toFixed(2) : null,
  }));
}

// ── NETWORK INFO ──────────────────────────────────────────────────────────────
app.get('/api/network', (req, res) => {
  const ifaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ iface: name, address: iface.address });
      }
    }
  }
  res.json({
    addresses,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptimeSeconds: process.uptime(),
    port: PORT,
  });
});

// ── Serve partner page viewer for /page/:id routes ────────────────────────────
app.get('/page/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page-view.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const ifaces = os.networkInterfaces();
  console.log('\n  Flat Hub is running!\n');
  console.log(`  Local:    http://localhost:${PORT}`);
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  Network:  http://${iface.address}:${PORT}  <-- open this on your phone`);
      }
    }
  }
  console.log('\n  Press Ctrl+C to stop.\n');
});
