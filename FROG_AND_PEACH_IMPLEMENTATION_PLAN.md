# Frog & Peach Implementation Plan

Start a new chat by naming one phase from this file. Keep changes scoped to the named phase only.

## Completed Phases

- **Phase 1 — E2E Safety** (2026-06-08): `E2E_BASE_URL` is mandatory; `TEST_USERNAME`/`TEST_PASSWORD` required with no default values; production URL removed from Playwright config.
- **Phase 2 — Password Reset Hardening** (2026-06-08): Username-only login removed; password always verified; `passwordSetupRequired` flag returned on valid temporary-password login; admin UI relabelled to "Require password change".
- **Phase 3 — Auth Rate Limiting** (2026-06-08): `src/api/rate-limit.ts` added; 5-failure / 15-minute sliding window per (action, username, IP-hash) bucket backed by `auth_attempts` D1 table; migration in `migrations/0008_auth_rate_limit.sql` (apply manually).
- **Phase 4 — Network Privacy Boundary** (2026-06-08): `/api/network` now requires admin unlock (`requireAdminUnlock`); dashboard loads only a safe `NetworkSummary` (no password, no device IPs/MACs); frontend Network workspace shows a locked state until admin-unlocked, then fetches full `NetworkOverview` on demand.
- **Phase 5 — Weather/Tide Correctness** (2026-06-08): `precipitation` field renamed to `precipitationMm`; label corrected to millimetres; marine cache key now includes an API-key SHA-256 fingerprint to prevent stale cache when the tide API key changes; `src/shared/weather.ts` helper added.

## Current Security Posture (after Phases 1–5)

- E2E tests cannot run against production by accident.
- No account can be accessed without a password.
- Login and admin unlock are rate-limited at the server (D1-backed, 5 failures / 15 min window).
- Sensitive network data (Wi-Fi password, router/admin URLs, device IPs/MACs) requires an admin-unlocked session.
- Normal session `/api/home` response contains only safe network summary fields.

## Global Rules

- Finish phases in order. Do not start Phase 6+ before completing earlier phases.
- Keep each commit scoped to one phase.
- Do not replace Cloudflare Pages, D1, React/Vite, or the single-package structure.
- Do not run E2E against production.
- Do not apply D1 migrations automatically.
- Do not edit `public/themes/` or `public/custom-pages/` by hand.
- Security review anchors: origin/CSRF checks → `src/api/router.ts`; sessions/admin unlock → `src/api/auth.ts`; protected static paths → `functions/_middleware.ts`; destructive deletion → `deleteModuleData()` in `src/api/data.ts`.

## Verification Commands (all phases)

```powershell
npm test
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
```

Use `npm run build` when touching sync scripts, theme manifests, or custom pages.

---

## Phase 6: App.tsx Decomposition

**Goal:** Reduce `src/App.tsx` size safely. No behavior changes.

**Scope:** Extract in this order to keep diffs reviewable:
1. Frontend API helper + error handling → `src/api-client/client.ts`
2. Frontend DTO/request types → `src/shared/api-types.ts` (server-only DB row types stay in `src/api/`)
3. Pure formatting helpers → `src/shared/format.ts`
4. Markdown rendering → `src/components/Markdown.tsx`
5. Toast rendering → `src/components/ToastTray.tsx`
6. `NetworkWorkspace` → `src/features/network/NetworkWorkspace.tsx` (only after Phase 4 data shape is settled — it is)
7. `AdminPanel` → `src/features/admin/AdminPanel.tsx` (optional, only if 1–6 are stable)

**Files likely to change:**
- `src/App.tsx` (shrinks with each extraction)
- New files listed above

**Do not touch:**
- Auth logic, rate-limit logic, or network privacy boundaries
- Routing model or component library choices
- User-visible behavior or styling
- `src/api/`, `functions/`, `migrations/`

**Tests/commands after each extraction:**
```powershell
npm test
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
```

**Acceptance:** `src/App.tsx` shrinks incrementally, imports stay acyclic, UI behavior unchanged, each extraction reviewable independently.

---

## Phase 7: CI, Linting, and Repo Hygiene

**Goal:** Add GitHub Actions CI and fix dependency classification.

**Scope:**
- Move build/type tooling to `devDependencies`: `@types/qrcode`, `@vitejs/plugin-react`, `typescript`, `vite`
- Remove `@rolldown/binding-linux-x64-gnu` unless justified
- Add `.github/workflows/ci.yml`: checkout → Node 22 with npm cache → `npm ci` → `npm run build` → `npm test`
- Lint/format only in a separate later PR if explicitly requested

**Files likely to change:**
- `package.json`, `package-lock.json`
- New `.github/workflows/ci.yml`

**Do not touch:**
- Application code
- Deployment script behavior
- Formatting style (do not run repo-wide formatters in this phase)

**Tests/commands:**
```powershell
npm ci
npm run build
npm test
```

**Acceptance:** Runtime deps contain only runtime packages; CI runs on PRs and `main`; no secrets required.

---

## Phase 8: Dependency Cleanup

**Goal:** Remove or justify stray build-time native bindings and audit all dependencies.

**Scope:**
- Audit `package.json` for misclassified or unused packages
- Specifically review `@rolldown/binding-linux-x64-gnu` (likely a Vite/Rolldown transitive dep — remove from explicit deps if not needed directly)
- Do not upgrade major versions in this phase

**Files likely to change:**
- `package.json`, `package-lock.json`

**Do not touch:**
- Application code
- Lock file structure beyond what `npm install` produces

**Tests/commands:**
```powershell
npm ci
npm run build
npm test
```

---

## Phase 9: Final Security and Deployment Review

**Goal:** Verify the full security posture before considering the hardening sequence complete.

**Scope:**
- Review all API routes for missing auth guards
- Confirm all destructive operations require admin unlock
- Review `functions/_middleware.ts` protected path list
- Confirm no plaintext secrets in committed files or env examples
- Smoke-test local E2E against a clean local D1
- Document any remaining known risks

**Files likely to change:**
- Possibly `src/api/router.ts`, `functions/_middleware.ts` for any gaps found
- `AGENTS.md` or docs for final posture summary

**Do not touch:**
- Rate-limit thresholds (Phase 3 values are intentional)
- Auth hash format
- Phase 6+ refactors (keep separate)

**Tests/commands:**
```powershell
npm test
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vite/bin/vite.js build
# Then local E2E:
$env:E2E_BASE_URL = "http://localhost:8788"
$env:TEST_USERNAME = "<local-test-username>"
$env:TEST_PASSWORD = "<local-test-password>"
npm run test:e2e
```

---

## Recommended Phase Prompts

```text
Read AGENTS.md and FROG_AND_PEACH_IMPLEMENTATION_PLAN.md. Work only on Phase 6: App.tsx Decomposition. Do not change auth, network, or data logic. Implement the first two extractions (API client + DTO types), run the listed checks, and report changed files and results.
```

```text
Read AGENTS.md and FROG_AND_PEACH_IMPLEMENTATION_PLAN.md. Work only on Phase 7: CI and Repo Hygiene. Add the CI workflow and fix devDependencies. Do not change application code. Run the listed checks and report.
```
