# Flat Hub

Flat Hub is a small Express-based home dashboard for a fixed location. It brings together weather, tide predictions, shopping lists, notes, partner pages, and local network info in one lightweight app.

## Features

- Weather card using Open-Meteo, no API key required
- Local tide predictions with configurable location labels
- JSON-backed notes and lists
- Simple partner page builder and viewer
- Network info endpoint for finding the app on your LAN

## Requirements

- Node.js 18 or newer

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file if you want to change the port or location:

```bash
copy .env.example .env
```

3. Start the app:

```bash
npm start
```

Open `http://localhost:3000` in your browser.

## Environment

- `PORT` - server port, defaults to `3000`
- `LOCATION_NAME` / `LOCATION_REGION` - labels shown on the dashboard
- `LOCATION_LATITUDE` / `LOCATION_LONGITUDE` - weather coordinates
- `LOCATION_TIMEZONE` - timezone sent to Open-Meteo (e.g. `Europe/London`)
- `TIDE_LOCATION_NAME` - tide card location label
- `TIDE_Z0` - mean sea level above chart datum (metres)
- `TIDE_CONSTITUENTS_JSON` - optional harmonic constituent array

## Data

The app stores data in JSON files under `data/`:

- `data/lists.json`
- `data/notes.json`
- `data/pages.json`

These files are created automatically if they do not exist.

## Routes

### Pages

- `/` - dashboard
- `/lists.html` - lists UI
- `/notes.html` - notes UI
- `/pages.html` - partner pages UI
- `/network.html` - network info UI
- `/page/:id` - partner page viewer

### API

- `GET /api/lists`
- `POST /api/lists`
- `GET /api/lists/:id`
- `PUT /api/lists/:id`
- `DELETE /api/lists/:id`
- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/pages`
- `POST /api/pages`
- `GET /api/pages/:id`
- `PUT /api/pages/:id`
- `DELETE /api/pages/:id`
- `GET /api/tides`
- `GET /api/network`

## Project Structure

```text
server.js        Express server and API routes
public/          Frontend HTML, CSS, and browser JS
data/            JSON persistence files
.env.example     Sample environment config
```

## Notes

- Weather data comes from Open-Meteo.
- Tide predictions are computed locally, so no external API key is needed.
