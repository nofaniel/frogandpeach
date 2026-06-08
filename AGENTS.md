# AGENTS.md - Frog & Peach Home Hub

This file is the fast orientation for agents working in this repo. For the current hardening/refactor sequence, read `FROG_AND_PEACH_IMPLEMENTATION_PLAN.md` and work only on the phase the user names.

## Current Priority

Follow `FROG_AND_PEACH_IMPLEMENTATION_PLAN.md` in order:

1. E2E safety
2. Password reset hardening
3. Auth rate limiting
4. Network privacy boundary
5. Weather/tide correctness
6. Safe frontend refactor
7. Tooling and CI

Do not jump to refactors before the security and test-safety phases are complete. If the user points at a single phase, keep the change set limited to that phase.

## Stack

- Frontend: React 19 + Vite 8, single-page app in `src/App.tsx`.
- Backend: Cloudflare Pages Functions in `functions/`, backed by D1 SQLite.
- Shared API logic: `src/api/` is imported by Cloudflare Functions and by Vitest unit tests.
- Shared pure logic: `src/shared/`.
- Theme runtime: `src/theme/`.
- Single package only: one `package.json`, one `tsconfig.json`, no monorepo.
- No router library and no component library.

## Commands

```powershell
# Install
npm install

# Full local dev. Build first because wrangler serves dist/.
npm run build
npm run dev:worker

# Frontend-only dev. API/D1 calls will not work here.
npm run dev

# Unit tests
npm test
npm run test:watch

# Focused build checks without prebuild sync hooks
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build

# Production build, including prebuild sync scripts
npm run build

# E2E, only with explicit non-production target and credentials
$env:E2E_BASE_URL = "http://localhost:8788"
$env:TEST_USERNAME = "<local-test-username>"
$env:TEST_PASSWORD = "<local-test-password>"
npm run test:e2e

# D1 migrations. Manual only.
npm run cf:migrate:local
npm run cf:migrate:remote

# Password hash generation
npm run hash-password -- "yourpassword"
```

## Critical Guardrails

- `dev:worker` requires a prior build. Wrangler serves `dist/`, not source.
- Do not run E2E against production. `E2E_BASE_URL` must be explicit.
- Do not use or add real-looking default test credentials. Use placeholders in docs.
- Do not commit `.dev.vars`, cookies, local Wrangler state, Playwright output, generated secrets, or built `dist`.
- Do not edit `public/themes/` or `public/custom-pages/` directly. They are generated from `themes/` and `custom-pages/`.
- Prebuild hooks run `scripts/sync-custom-pages.mjs` and `scripts/sync-themes.mjs`; they can rewrite tracked generated manifests.
- Migrations are manual. Adding a file under `migrations/` is fine; applying it requires an explicit migration command.
- Do not run `npm run cf:migrate:remote` without explicit user confirmation. It applies all pending remote migrations, including `migrations/0007_codex_test_admin.sql`, which seeds or updates `codex_test` as an admin.
- Preserve Cloudflare Pages + D1. Do not add Express, Next.js API routes, a separate Node backend, or SaaS auth unless explicitly requested.
- Keep production deployment assumptions unchanged unless the phase explicitly says otherwise.

## Verification Expectations

For most code phases, run:

```powershell
npm test
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
```

Use `npm run build` when validating the exact production build path or when a phase touches synced assets, theme manifests, custom pages, scripts, or package scripts.

E2E should be local or staging only:

First shell:

```powershell
npm run cf:migrate:local
npm run build
npm run dev:worker
```

Second shell:

```powershell
$env:E2E_BASE_URL = "http://localhost:8788"
$env:TEST_USERNAME = "<local-test-username>"
$env:TEST_PASSWORD = "<local-test-password>"
npm run test:e2e
```

If tests fail before your edits, record the baseline failure separately from introduced failures.

## Auth Model

- Cookie session name: `fp_session`, HttpOnly, SameSite=Lax.
- Session token is stored as a SHA-256 hash in D1.
- Auth has two tiers:
  - normal session, default 14-day TTL;
  - 15-minute admin re-unlock for destructive/admin operations.
- Admin unlock is `POST /api/admin/unlock`.
- Admin unlock is required for `/api/modules`, `/api/users`, `/api/settings`, `/api/activity`, and `/api/cache`.
- Password hash format: `pbkdf2_sha256$ITERATIONS$BASE64_SALT$BASE64_HASH`.
- Runtime verification reads the iteration count from the stored hash.

## E2E And Test Safety

- Current hardening work starts by making `E2E_BASE_URL` mandatory.
- Tests create and modify app data, so never let them default to the deployed Pages site.
- Preferred env vars are `TEST_USERNAME` and `TEST_PASSWORD`.
- Legacy fallbacks `FP_TEST_USERNAME` and `FP_TEST_PASSWORD` may remain supported, but should not have default values.

## Project Structure

```text
src/api/          API logic shared by worker and tests
functions/        Cloudflare Pages Functions wrappers
functions/_middleware.ts
functions/api/[[path]].ts
src/shared/       Pure business logic
src/theme/        Theme loading, inheritance, CSS application
themes/           Source theme definitions
public/themes/    Generated theme output; do not edit directly
migrations/       Manual D1 migrations
scripts/          Sync and utility scripts
e2e/              Playwright tests
docs/             Project docs
```

## Data And Generated Files

- D1 binding name: `DB`.
- Local preview DB name: `frog-peach-db`.
- Main data access lives in `src/api/data.ts`.
- Module registry and module option normalization live in `src/api/modules.ts`.
- Router and route-level auth boundaries live in `src/api/router.ts`.
- Auth/session/user logic lives in `src/api/auth.ts`.
- Origin/CSRF trust checks live in `requireTrustedOrigin()` in `src/api/router.ts`.
- Protected static paths are only `/pages/` and `/custom-pages/` in `functions/_middleware.ts`.
- Destructive module data deletion is `deleteModuleData()` in `src/api/data.ts`.
- `public/themes/manifest.json` and `public/custom-pages/manifest.json` are generated.
- `scripts/sync-themes.mjs` deletes and recopies public theme folders.
- `scripts/sync-custom-pages.mjs` syncs custom pages into `public/custom-pages/`.
- Do not change generated `manifest.json` behavior casually; it intentionally uses stable generated metadata.

## Sub-Agent Use

Use sub-agents only when the user asks for parallel/delegated work or when executing the implementation plan explicitly benefits from a sidecar review.

Good patterns:

- Ask a read-only explorer to map a narrow area while the main agent edits a disjoint area.
- Use a worker only with clear ownership of files and no overlap with other workers.
- Instruct workers that other edits may exist and they must not revert them.
- Give each sub-agent a fixed phase goal and file list. Do not ask it to rediscover the whole repo.

Phase-specific guidance:

- Phase 1: keep local; the file set is small.
- Phase 2: keep implementation local; optionally use a read-only explorer to review auth tests.
- Phase 3: an explorer can review rate-limit edge cases while the main agent implements helpers.
- Phase 4: an explorer can map frontend network-field usage while the main agent changes API shape.
- Phase 6: split extractions only when write sets are disjoint.
- Never use sub-agents for overlapping edits in `src/App.tsx` or parallel migration edits.

## Coding Style

- Follow existing TypeScript style. There is currently no ESLint, Prettier, or Biome.
- Do not run broad formatters unless a phase explicitly adds formatting.
- Prefer small testable helpers for auth and data behavior.
- Keep public DTOs separate from server-only DB row types when adding shared contracts.
- Avoid unrelated cleanup in security phases.

## Live-Site Workflow

The project often uses live-site iteration after validation, but do not deploy unless the user explicitly asks. If asked to deploy, build first, then use `npm run cf:deploy`.
