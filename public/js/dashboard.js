/* dashboard.js — weather, tides, recent notes/lists */

const WMO = {
  0:  { label: 'Clear Sky',       icon: '☀️' },
  1:  { label: 'Mainly Clear',    icon: '🌤️' },
  2:  { label: 'Partly Cloudy',   icon: '⛅' },
  3:  { label: 'Overcast',        icon: '☁️' },
  45: { label: 'Foggy',           icon: '🌫️' },
  48: { label: 'Freezing Fog',    icon: '🌫️' },
  51: { label: 'Light Drizzle',   icon: '🌦️' },
  53: { label: 'Drizzle',         icon: '🌦️' },
  55: { label: 'Heavy Drizzle',   icon: '🌧️' },
  61: { label: 'Light Rain',      icon: '🌧️' },
  63: { label: 'Rain',            icon: '🌧️' },
  65: { label: 'Heavy Rain',      icon: '🌧️' },
  71: { label: 'Light Snow',      icon: '🌨️' },
  73: { label: 'Snow',            icon: '❄️' },
  75: { label: 'Heavy Snow',      icon: '❄️' },
  77: { label: 'Snow Grains',     icon: '🌨️' },
  80: { label: 'Light Showers',   icon: '🌦️' },
  81: { label: 'Showers',         icon: '🌧️' },
  82: { label: 'Heavy Showers',   icon: '⛈️' },
  85: { label: 'Snow Showers',    icon: '🌨️' },
  86: { label: 'Heavy Snow Showers', icon: '❄️' },
  95: { label: 'Thunderstorm',    icon: '⛈️' },
  96: { label: 'Thunderstorm',    icon: '⛈️' },
  99: { label: 'Thunderstorm',    icon: '⛈️' },
};

function wmo(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡️' };
}

// ── Weather (Open-Meteo — no API key needed) ─────────────────────────────────
async function loadWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=50.4155&longitude=-5.0815' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' +
    '&wind_speed_unit=mph' +
    '&timezone=Europe/London' +
    '&forecast_days=1';

  try {
    const res  = await fetch(url);
    const data = await res.json();
    const cur  = data.current;
    const day  = data.daily;
    const w    = wmo(cur.weather_code);

    document.getElementById('w-icon').textContent  = w.icon;
    document.getElementById('w-temp').innerHTML    = `${Math.round(cur.temperature_2m)}<sup>°C</sup>`;
    document.getElementById('w-desc').textContent  = w.label;

    document.getElementById('w-meta').innerHTML = `
      <span>↑ ${Math.round(day.temperature_2m_max[0])}° ↓ ${Math.round(day.temperature_2m_min[0])}°</span>
      <span>💨 ${Math.round(cur.wind_speed_10m)} mph</span>
      <span>💧 ${cur.relative_humidity_2m}%</span>
      <span>🌂 ${day.precipitation_probability_max[0]}% rain</span>
      <span>Feels ${Math.round(cur.apparent_temperature)}°</span>
    `;
  } catch {
    document.getElementById('w-desc').textContent = 'Could not load weather';
    document.getElementById('w-icon').textContent = '🌡️';
  }
}

// ── Tides (harmonic prediction — computed locally, no API needed) ────────────
function formatTideTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function loadTides() {
  const grid = document.getElementById('tides-grid');
  try {
    const res  = await fetch('/api/tides');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;color:var(--text-muted);font-size:0.85rem">No tide data available.</div>`;
      return;
    }

    const events = data.slice(0, 4);

    grid.innerHTML = events.map(e => {
      const isHigh = e.EventType === 'HighWater';
      return `
        <div class="tide-item">
          <div class="tide-type ${isHigh ? 'high' : 'low'}">${isHigh ? '▲ High' : '▼ Low'}</div>
          <div class="tide-time">${formatTideTime(e.DateTime)}</div>
          <div class="tide-height">${e.Height != null ? e.Height.toFixed(1) + ' m' : ''}</div>
        </div>`;
    }).join('');

  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1;color:var(--text-muted);font-size:0.85rem">Could not load tides.</div>`;
  }
}

// ── Recent Notes ─────────────────────────────────────────────────────────────
async function loadRecentNotes() {
  try {
    const res   = await fetch('/api/notes');
    const notes = await res.json();
    const card  = document.getElementById('notes-card');
    const el    = document.getElementById('recent-notes');

    if (!notes.length) return;
    card.style.display = '';

    el.innerHTML = notes.slice(0, 3).map(n => `
      <div class="recent-note" onclick="location.href='/notes.html'">
        <div class="recent-note-title">${escHtml(n.title)}</div>
        <div class="recent-note-preview">${escHtml(n.content || 'No content')}</div>
      </div>`).join('');
  } catch { /* silently skip */ }
}

// ── Recent Lists ─────────────────────────────────────────────────────────────
async function loadRecentLists() {
  try {
    const res   = await fetch('/api/lists');
    const lists = await res.json();
    const card  = document.getElementById('lists-card');
    const el    = document.getElementById('recent-lists');

    if (!lists.length) return;
    card.style.display = '';

    el.innerHTML = lists.slice(0, 3).map(l => {
      const total = l.items.length;
      const done  = l.items.filter(i => i.done).length;
      const pct   = total ? Math.round((done / total) * 100) : 0;
      return `
        <div class="recent-list" onclick="location.href='/lists.html'">
          <div class="recent-list-name">${escHtml(l.name)}</div>
          <div class="recent-list-count">${done}/${total} items done</div>
          ${total ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
        </div>`;
    }).join('');
  } catch { /* silently skip */ }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadWeather();
loadTides();
loadRecentNotes();
loadRecentLists();
