# Frog & Peach Home Hub

Private-by-default home hub for households, built with React + TypeScript on Cloudflare Pages Functions and D1.

## Live Links

- Live app: `https://frog-peach-home-hub.pages.dev`
- GitHub Pages project site: `https://nofaniel.github.io/frogandpeach/`
- Cloudflare setup guide: `docs/cloudflare-hosting.md`

## What It Includes

- Modular dashboard with weather, tides, lists, notes, pages, network, and admin tools.
- Role-based auth (`admin` and `member`) plus timed admin re-auth unlock.
- D1-backed persistence for module settings, content, sessions, activity, cache, and users.
- Open-Meteo weather + marine integration with local cache records.
- Theme system with JSON themes (`themes/*`) and no-FOUC snapshot restore.

## Stack

- Frontend: React 19, TypeScript, Vite
- Backend/runtime: Cloudflare Pages Functions (Workers runtime)
- Database: Cloudflare D1 (SQLite)
- Tests: Vitest (unit) and Playwright (E2E)

## Screenshots

Captured locally with Playwright against the worker runtime.

<img src="docs/readme-screenshots/frog-peach-preview.gif" alt="Animated preview of the main pages and modules" width="960" />

| Home dashboard | Admin settings |
| --- | --- |
| <img src="docs/readme-screenshots/home-desktop.png" alt="Home dashboard" width="640" /> | <img src="docs/readme-screenshots/admin-desktop.png" alt="Admin settings" width="640" /> |

## Local Setup

1) Install dependencies and generate an admin password hash.

```powershell
npm install
npm run hash-password -- "your-admin-password"
```

2) Copy `.env.example` to `.dev.vars` and set at least:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
APP_ORIGIN=http://localhost:8788
SETUP_TOKEN=
SESSION_TTL_DAYS=14
```

3) Apply local D1 migrations.

```powershell
npm run cf:migrate:local
```

4) Build and run the full local stack.

```powershell
npm run build
npm run dev:worker
```

Open `http://localhost:8788`.

## Development Commands

- `npm run dev` - frontend-only Vite dev server (`:5173`, no API)
- `npm run dev:worker` - full app runtime on Pages emulator (`:8788`)
- `npm test` - unit tests
- `npm run test:e2e` - E2E tests (requires `E2E_BASE_URL`, `TEST_USERNAME`, `TEST_PASSWORD`)
- `npm run build` - sync scripts + TypeScript build + Vite build

## Deploy

- Cloudflare live app: `npm run cf:deploy`
- Remote migrations (when needed): `npm run cf:migrate:remote`
- GitHub Pages site deploys from `.github/workflows/gh-pages.yml` when files in `gh-pages-site/` change on `main`.

## Architecture Snapshot

- App composition root: `src/App.tsx`
- App state/controller: `src/features/app-shell/useAppController.ts`
- Feature UI: `src/features/*`
- API routes: `src/api/router.ts`
- Module definitions: `src/api/modules.ts`
- Shared types: `src/shared/api-types.ts`

## CI

GitHub Actions runs:

1. `npm test`
2. `npm run build`

E2E is intentionally excluded from CI because tests mutate app data.
