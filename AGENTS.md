# AGENTS.md — Frog & Peach Home Hub

Compact orientation for AI agents. Every item here is something easy to get wrong.

## Stack

- **Frontend:** React 19 + Vite 8, single-page (`src/App.tsx` — one large file, no router library, no component library)
- **Backend:** Cloudflare Pages Functions (`functions/`) + D1 SQLite
- **API logic** (`src/api/`) is shared: imported by `functions/` (Cloudflare Worker) and directly by Vitest unit tests
- **Single package** — not a monorepo. One `package.json`, one `tsconfig.json`.

## Commands

```bash
# Full local dev (frontend + API + D1)
npm run build          # must run first — wrangler serves dist/
npm run dev:worker     # starts on :8788

# Frontend-only dev (no API/D1)
npm run dev            # Vite only, :5173

# Unit tests (vitest)
npm test               # or: npm run test:watch

# E2E tests (Playwright)
npm run test:e2e       # headless
npm run test:e2e:headed

# Build for production
npm run build          # tsc -b && vite build

# Deploy
npm run cf:deploy      # builds then wrangler pages deploy dist

# D1 migrations (manual — never auto-applied)
npm run cf:migrate:local
npm run cf:migrate:remote

# First-time password hash
npm run hash-password -- "yourpassword"
```

## Critical Gotchas

**`dev:worker` requires a prior build.** Wrangler serves `dist/`, not source. Running `npm run dev:worker` without building first serves stale or missing files.

**Pre-build sync scripts run automatically** via `predev`/`prebuild` hooks:
- `scripts/sync-custom-pages.mjs` — syncs `custom-pages/` → `public/custom-pages/` and writes `manifest.json`
- `scripts/sync-themes.mjs` — syncs `themes/` → `public/themes/` and writes `manifest.json`

Do not edit files directly under `public/themes/` or `public/custom-pages/` — they are overwritten on every build.

**Migrations are manual.** There is no auto-migration on startup. New `.sql` files in `migrations/` must be explicitly applied with `cf:migrate:local` or `cf:migrate:remote`.

**E2E tests default to production** (`https://frog-peach-home-hub.pages.dev`). To test locally:
```bash
E2E_BASE_URL=http://localhost:8788 FP_TEST_USERNAME=admin FP_TEST_PASSWORD=yourpassword npm run test:e2e
```
`FP_TEST_USERNAME` and `FP_TEST_PASSWORD` are always required.

## No Linter, No CI, No Formatter

- No ESLint, Prettier, or Biome configured.
- No `.github/workflows/`, no pre-commit hooks.
- **TypeScript strict mode is the only static check.** Run `npm run build` to verify.
- `vitest/globals` is declared in `tsconfig.json` — test files use `describe`/`test`/`expect` without imports.

## Environment / Secrets

Local dev requires `.dev.vars` (gitignored):
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...   # from: npm run hash-password
APP_ORIGIN=http://localhost:8788
SESSION_TTL_DAYS=14
```

`APP_ORIGIN` must match the actual request origin — it is used for session cookie validation and CORS. Wrong value → all API requests fail auth.

Production: `ADMIN_USERNAME` as a Pages env var, `ADMIN_PASSWORD_HASH` as a Cloudflare secret.

## Password Hash Format

Format: `pbkdf2_sha256$ITERATIONS$BASE64_SALT$BASE64_HASH`

- CLI script (`scripts/generate-password-hash.mjs`): 210,000 iterations
- Runtime verification (`src/api/crypto.ts`): 150,000 iterations

These differ by design — the app verifies against whatever iteration count is stored in the hash string. The CLI generates hashes with the higher count; the runtime reads the count from the stored hash.

## Auth Model

- Cookie-based sessions (`fp_session`, HttpOnly, SameSite=Lax)
- Session token stored as SHA-256 hash in D1
- **Two-tier auth:** regular session (1–90 day TTL, default 14 days) + 15-minute admin re-unlock for destructive operations
- Admin unlock is a separate `POST /api/admin/unlock` step — required before `/api/modules`, `/api/users`, `/api/settings`, `/api/activity`, `/api/cache`

## Theme System

- Source themes: `themes/<id>/theme.json` (+ optional `theme.css`)
- **Never edit** `public/themes/` directly — overwritten on every build
- `theme.json` supports `"extends": "<other-id>"` — resolved at runtime by `ThemeProvider.tsx`
- Active theme stored in D1 settings as `themeId`; also cached in `localStorage` for flash-free paint
- Applied as CSS custom properties and `data-nav`, `data-density`, `data-surface` attributes on `<html>`
- Full token/layout reference: `docs/theming.md`

## Project Structure

```
src/api/          # All API logic (router, auth, data, crypto, modules) — shared frontend + backend
functions/        # Cloudflare Pages Functions (thin wrappers — delegate to src/api/)
  _middleware.ts  # Auth guard for /pages/ and /custom-pages/ paths
  api/[[path]].ts # Catch-all: delegates /api/* to src/api/router.ts
src/shared/       # Pure business logic (lists, tide derivation) — no platform deps
src/theme/        # Theme loading, inheritance, CSS application
themes/           # Source theme definitions (synced to public/themes/ on build)
migrations/       # D1 SQL migrations (applied manually)
scripts/          # Pre-build sync scripts (run automatically via predev/prebuild)
e2e/              # Playwright tests
```

## D1 Database

Binding name: `DB`. Local preview DB name: `frog-peach-db`.

Tables: `sessions`, `settings`, `module_settings`, `users`, `notes`, `lists`, `list_items`, `shopping_lists`, `shopping_items`, `pages`, `page_links`, `page_manifests`, `cache`, `activity_log`.

All data access is in `src/api/data.ts`.
