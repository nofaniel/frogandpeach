# Frog & Peach Home Hub

A household home hub built with React, TypeScript, Cloudflare Pages Functions, and Cloudflare D1.

The app is intended to run as a private home dashboard with modules for shared household information, local conditions, notes, lists, custom pages, and administration.

## Preview

<img src="docs/readme-screenshots/frog-peach-preview.gif" alt="Animated preview of Frog & Peach Home Hub" width="960" />

| Home dashboard | Admin settings |
| --- | --- |
| <img src="docs/readme-screenshots/home-desktop.png" alt="Home dashboard" width="640" /> | <img src="docs/readme-screenshots/admin-desktop.png" alt="Admin settings" width="640" /> |

## Links

- Live app: `https://frog-peach-home-hub.pages.dev`
- GitHub Pages project site: `https://nofaniel.github.io/frogandpeach/`
- Cloudflare setup notes: [`docs/cloudflare-hosting.md`](docs/cloudflare-hosting.md)
- Project purpose notes: [`docs/project-purpose.md`](docs/project-purpose.md)

## What It Does

- Shows a configurable dashboard of household modules.
- Supports admin and member accounts.
- Stores app data in Cloudflare D1.
- Includes weather and marine/tide data from Open-Meteo.
- Provides notes, lists, custom pages, network status, and admin tools.
- Supports JSON-based themes with optional theme CSS.
- Keeps session cookies HttpOnly and stores only hashed session tokens in D1.

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Backend: Cloudflare Pages Functions running on the Workers runtime
- Database: Cloudflare D1 / SQLite
- Tests: Vitest and Playwright

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Main app shell, state, and navigation |
| `src/api/` | API routing, auth, D1 access, module definitions |
| `src/shared/` | Shared API types |
| `src/theme/` | Runtime theme loading and token handling |
| `themes/` | Source theme folders |
| `public/themes/` | Synced theme output used by the app |
| `functions/` | Cloudflare Pages Function entry points and middleware |
| `migrations/` | D1 SQL migrations |
| `e2e/` | Playwright E2E tests |
| `docs/` | Project notes and README screenshots |

## Local Setup

Install dependencies:

```powershell
npm install
```

Create local secrets:

```powershell
Copy-Item .env.example .dev.vars
npm run hash-password -- "your-admin-password"
```

Set the generated password hash in `.dev.vars`:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
APP_ORIGIN=http://localhost:8788
SETUP_TOKEN=
SESSION_TTL_DAYS=14
```

Apply local D1 migrations:

```powershell
npm run cf:migrate:local
```

Build and run the full local app:

```powershell
npm run build
npm run dev:worker
```

Open `http://localhost:8788`.

## Development

Frontend-only Vite server:

```powershell
npm run dev
```

This runs on `http://localhost:5173`. API calls will not work in this mode.

Full Cloudflare Pages runtime:

```powershell
npm run build
npm run dev:worker
```

This runs on `http://localhost:8788` and should be used for auth, API, and D1 work.

The build step runs the sync scripts for custom pages and themes before compiling:

```powershell
npm run build
```

## Tests

Run unit tests:

```powershell
npm test
```

Run E2E tests against a live local instance:

```powershell
$env:E2E_BASE_URL = "http://localhost:8788"
$env:TEST_USERNAME = "admin"
$env:TEST_PASSWORD = "your-admin-password"
npm run test:e2e
```

E2E tests mutate D1 data. Do not point them at production.

## Database

Apply migrations locally:

```powershell
npm run cf:migrate:local
```

Apply migrations remotely:

```powershell
npm run cf:migrate:remote
```

Local D1 state is managed by Wrangler and is not committed.

## Deployment

Deploy the Cloudflare Pages app:

```powershell
npm run cf:deploy
```

Run remote migrations separately when new migration files have been added:

```powershell
npm run cf:migrate:remote
```

The GitHub Pages project site deploys from `.github/workflows/gh-pages.yml` when files under `gh-pages-site/` change on `main`.

## CI

GitHub Actions runs:

1. `npm test`
2. `npm run build`

Playwright E2E tests are not run in CI.
