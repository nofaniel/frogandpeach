# AGENTS.md — Frog & Peach Home Hub

Cloudflare Pages + D1 (SQLite) app. React 19 + TypeScript + Vite frontend; Cloudflare Workers runtime backend. No linter, no formatter configured.

---

## Sub-agents: use them

Launch parallel sub-agents aggressively — the frontend (Vite), backend (`src/api/`), E2E tests, and theme work are independent enough to parallelise. Typical split:

- **Agent A** — frontend changes (`src/`, `index.html`, `public/themes/`, `styles.css`)
- **Agent B** — API/backend changes (`src/api/`, `functions/`, `migrations/`)
- **Agent C** — E2E / visual verification (`e2e/`, Playwright)

Never run E2E tests on the same agent doing the code edits — it serialises needlessly.

---

## Dev servers

| Mode | Command | Port | Notes |
|---|---|---|---|
| Frontend only (no API) | `npm run dev` | 5173 | Vite only; API calls will 404 |
| Full-stack (API + DB) | `npm run build && npm run dev:worker` | 8788 | Must build first; needs `.dev.vars` |

Use `:8788` for any feature that touches the API, auth, or D1. Use `:5173` only for pure UI work.

---

## Build

```bash
npm run build       # runs prebuild (sync scripts) → tsc -b → vite build
```

`prebuild` auto-runs `scripts/sync-custom-pages.mjs` and `scripts/sync-themes.mjs` — these populate `public/custom-pages/` and `public/themes/`. **Never skip `npm run build`** before `dev:worker` or deploy.

---

## Tests

### Unit tests (Vitest) — run in CI

```bash
npm test            # single-pass run
npm run test:watch  # watch mode
```

Files matched: `src/**/*.{test,spec}.{ts,tsx}`. E2E files in `e2e/` are excluded.

### E2E tests (Playwright) — NOT in CI, require a live instance

```bash
# Set env vars first:
# E2E_BASE_URL=http://localhost:8788
# TEST_USERNAME=admin
# TEST_PASSWORD=yourpassword

npm run test:e2e            # headless
npm run test:e2e:headed     # visible browser
npm run test:e2e:ui         # Playwright UI mode
```

- Requires `E2E_BASE_URL` — throws without it.
- Two browser projects: Desktop Chrome (1440×1000) and Pixel 7 mobile.
- Serial execution (single worker). Retries: 2 in CI, 0 locally.
- Tests mutate D1 data — **never target production**.
- HTML report lands in `output/playwright-report/`.

For visual testing of site features, use `test:e2e:headed` or `test:e2e:ui` against a local `:8788` instance.

---

## Architecture: what to edit where

| Concern | Location |
|---|---|
| All app state & navigation | `src/App.tsx` (~1200 lines, monolithic) |
| API routing (hand-rolled) | `src/api/router.ts` |
| D1 CRUD operations | `src/api/data.ts` |
| Auth / sessions | `src/api/auth.ts` |
| Module definitions | `src/api/modules.ts` (hardcoded; D1 stores only instance settings) |
| Cloudflare entry shim | `functions/api/[[path]].ts` |
| Auth guard for `/pages/*` | `functions/_middleware.ts` |
| Shared types | `src/shared/api-types.ts` |
| Theme system | `src/theme/` + `themes/<name>/theme.json` |
| Global styles | `src/styles.css` |

**No client-side router.** Navigation is `useState<Tab>` inside `App.tsx`. Only one URL pathname check exists (for `/page/:slug`) at boot.

Adding a new module requires a code change in `src/api/modules.ts` — it is not data-driven.

---

## Database

Migrations are in `migrations/` (8 numbered SQL files).

```bash
npm run cf:migrate:local   # apply to local Wrangler SQLite
npm run cf:migrate:remote  # apply to production Cloudflare D1
```

Local D1 lives inside the Wrangler state directory (not committed). Always run local migration after pulling new migration files.

---

## Secrets / env setup (local)

Copy `.env.example` → `.dev.vars`. Required for `dev:worker`:

```
ADMIN_PASSWORD_HASH=<output of npm run hash-password>
```

Generate hash:

```bash
npm run hash-password
```

`.dev.vars` is gitignored. Never commit it.

---

## Deploy

```bash
npm run cf:deploy   # build + wrangler pages deploy dist
```

Run `npm run cf:migrate:remote` separately if there are new migrations.

---

## Theme system

Themes are pure JSON (`theme.json`) + optional `theme.css` — no JavaScript. The system resolves `extends` chains at runtime and maps tokens to CSS custom properties. A no-FOUC snapshot is stored in `localStorage` (`fp-theme-snapshot`) and applied by an inline `<script>` in `index.html` before React mounts. Broken themes fall back to `base`.

Custom themes: add a folder under `themes/`, then run `npm run build` (sync scripts will pick it up).

---

## Security constraints — do not break

- Session tokens stored as SHA-256 in D1 only (raw token is HttpOnly cookie).
- Passwords use PBKDF2-SHA256 (100k–210k iterations).
- Admin actions require a **separate timed re-auth** (15-min window), not just a regular session.
- Mutating API routes check `Origin` header.
- Rate limiting on login and admin-unlock: 5 failures / 15-min window, D1-backed.

---

## What CI checks

1. `npm test` — Vitest unit tests
2. `npm run build` — TypeScript type-check + Vite production build

E2E is never run in CI.
