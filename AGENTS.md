# AGENTS.md — Frog & Peach Home Hub

Cloudflare Pages + D1 (SQLite) app. React 19 + TypeScript + Vite frontend; Cloudflare Workers runtime backend. No linter, no formatter configured.

---

## Sub-agents: use them

Launch parallel sub-agents aggressively — frontend, backend, E2E, and theme work are independent. Typical split:

- **Agent A** — frontend changes (`src/`, `index.html`, `public/themes/`, `styles.css`)
- **Agent B** — API/backend changes (`src/api/`, `functions/`, `migrations/`)
- **Agent C** — E2E / visual verification (`e2e/`, Playwright)

Never run E2E tests on the same agent doing code edits — it serialises needlessly.

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

## Module / feature code map

**No client-side router.** Navigation is by `Tab` type (`src/shared/api-types.ts:1`) switched via `useState` inside `App.tsx`. The only URL pathname check is for `/page/:slug` at boot (`StandalonePageView`). Adding a new module requires a code change in `src/api/modules.ts` — it is not data-driven.

### How features connect

```
App.tsx
  └─ useAppController()  [src/features/app-shell/useAppController.ts — 769 lines, all state]
       ├─ api-client      [src/api-client/client.ts — fetch wrappers]
       ├─ auth            [login, logout, unlock, setup — inside useAppController]
       ├─ navigation      [src/features/app-shell/navigation.ts — Tab → nav-bar entries]
       ├─ theme           [src/theme/ThemeProvider.tsx]
       └─ data fetching   [home, lists, notes, pages, whiteboard, network, admin]
```

### Feature directories (each tab / page)

| Tab | Feature dir | Key files |
|---|---|---|
| **Home** dashboard | `src/features/home/` | `HomeDashboard.tsx`, `ModuleEditControls.tsx`, `widgets/` (8 widget components) |
| **Weather** scene | `src/features/weather/` | `WeatherScene.tsx` (cards), `WeatherWorkspace.tsx` (full-page) |
| **Lists** | `src/features/lists/` | `ListsWorkspace.tsx` |
| **Notes** | `src/features/notes/` | `NotesWorkspace.tsx` |
| **Pages** (markdown) | `src/features/pages/` | `PagesWorkspace.tsx` |
| **Whiteboard** (canvas) | `src/features/whiteboard/` | `WhiteboardWorkspace.tsx`, `WhiteboardCanvas.tsx`, `WhiteboardToolbar.tsx`, `useCanvasDrawing.ts`, `rendering.ts` |
| **Network** status | `src/features/network/` | `NetworkWorkspace.tsx` |
| **Admin** panel | `src/features/admin/` | `AdminPanel.tsx` + `sections/` (7 section files: Activity, Appearance, Cache, Modules, PageInventory, Settings, Users) |
| **App shell** (layout, nav, auth) | `src/features/app-shell/` | `AppShellLayout.tsx`, `TopNavigation.tsx`, `LoginScreen.tsx`, `AdminUnlockModal.tsx`, `PasswordSetupScreen.tsx`, `StandalonePageView.tsx`, `SettingsPanel.tsx`, `navigation.ts`, `homeWidgets.ts`, `useAppController.ts` |

### Shared utilities

| Concern | File |
|---|---|
| API response types / `Tab` type | `src/shared/api-types.ts` |
| Date/time formatting | `src/shared/format.ts` |
| Browser location + timezone | `src/shared/location.ts` |
| List helpers / sorting | `src/shared/lists.ts` |
| Tide computations | `src/shared/tide.ts` |
| Weather helpers | `src/shared/weather.ts` |
| Whiteboard helpers | `src/shared/whiteboard.ts` |

### Reusable components

| Component | File |
|---|---|
| `<Markdown>` (renders Markdown via `marked` + `dompurify`) | `src/components/Markdown.tsx` |
| `<ToastTray>` (stacked toasts) | `src/components/ToastTray.tsx` |

---

## Backend (API)

| Concern | Location |
|---|---|
| Cloudflare entry shim | `functions/api/[[path]].ts` |
| Auth guard for `/pages/*` | `functions/_middleware.ts` |
| API routing (hand-rolled) | `src/api/router.ts` |
| D1 CRUD operations | `src/api/data.ts` |
| Auth / sessions / PBKDF2 | `src/api/auth.ts` |
| Password hashing (PBKDF2-SHA256) | `src/api/crypto.ts` |
| Rate limiting (D1-backed) | `src/api/rate-limit.ts` |
| Module definitions (hardcoded) | `src/api/modules.ts` |
| HTTP helpers | `src/api/http.ts` |
| Internal types | `src/api/types.ts` |
| API tests | `src/api/*.test.ts` (6 test files) |
| Shared API types (frontend) | `src/shared/api-types.ts` |
| Frontend fetch client | `src/api-client/client.ts` |

---

## Database

11 migration files in `migrations/` (numbered `0001_initial.sql` through `0012_whiteboard_canvas.sql`).

```bash
npm run cf:migrate:local   # apply to local Wrangler SQLite
npm run cf:migrate:remote  # apply to production Cloudflare D1
```

Local D1 lives inside the Wrangler state directory (not committed). Always run local migration after pulling new migration files.

---

## Tests

### Unit tests (Vitest) — run in CI

```bash
npm test            # single-pass run
npm run test:watch  # watch mode
```

Files matched: `src/**/*.{test,spec}.{ts,tsx}`. E2E files in `e2e/` are excluded via `vitest.config.ts`.

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

---

## Secrets / env setup (local)

Copy `.env.example` → `.dev.vars`. Required for `dev:worker`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<output of npm run hash-password>
APP_ORIGIN=http://localhost:8788
SETUP_TOKEN=
SESSION_TTL_DAYS=14
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

- Source themes: `themes/<name>/theme.json` (9 themes: base, botanical, coastal, dusk, forest, frog-peach, mono-dark, nordic, slate)
- Synced output: `public/themes/` (populated by `npm run build`)
- Runtime code: `src/theme/ThemeProvider.tsx`, `src/theme/applyTheme.ts`

Custom themes: add a folder under `themes/`, then run `npm run build`.

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
