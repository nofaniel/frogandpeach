# Handover

Date: 2026-05-30

## Current State

The modular hub upgrade is implemented as a built-in module registry rather than an external plugin runtime. The app now supports D1-backed users, first-run admin setup, role-aware sessions, short-lived admin unlock, admin-only settings, global appearance settings, generic typed lists, note/list authorship, custom static page discovery, cache controls, and deployment/readiness admin panels.

Latest committed baseline before this handover was `edf2e2a` (`Checkpoint modular hub upgrade`). The earlier checkpoint added the follow-up admin UX and validation work on top of that. This pass adds the focused mobile admin polish and live admin unlock status called out in the remaining work.

## What Changed In This Checkpoint

- Added `GET /api/page-manifest-report` for admin-only custom page manifest validation.
- Added manifest warnings from `scripts/sync-custom-pages.mjs`.
- Added admin UI warnings for custom page manifest issues.
- Replaced immediate module uninstall actions with a modal that requires `Preserve data`, `Delete data`, or `Cancel`.
- Added deployment readiness checks in the admin area.
- Added visible admin unlock expiry in the header and returned `adminUnlockedUntil` from auth responses.
- Resolved stored author user IDs into display names for notes, lists, and list items.
- Added cache/page manifest/settings/auth helper tests.
- Ignored Playwright output folders generated during visual QA.

## What Changed In This Follow-Up Pass

- Replaced the static admin unlock timestamp with a live countdown in the header.
- Automatically clears local admin-unlocked UI state and closes the admin panel when the unlock expires.
- Reworked admin module registry rows so metadata, actions, size, and order controls remain readable on mobile.
- Added compact module status chips for category, install state, and visibility.
- Added keyboard focus styling and subtle hover/active states for interactive controls.
- Added autocomplete attributes to admin unlock and user creation forms.
- Added a non-destructive custom page validator/details panel showing manifest readiness, source HTML paths, target `page.json` paths, and suggested metadata JSON.
- Added D1-backed recent activity history for notes, lists, pages, users, modules, settings, appearance, cache actions, and page links.
- Added the admin-only `GET /api/activity` endpoint and a read-only Recent changes panel in Admin.

## Verification

Passing checks:

- `npm test`: 6 test files, 15 tests.
- `npm run build`.
- Worker smoke check for `GET /api/page-manifest-report`.
- Playwright manual browser pass against `http://localhost:8788` at desktop and mobile widths.
- Follow-up Playwright browser pass against `http://localhost:8788` at 1280x900 and 390x844, including admin unlock and module registry visual checks.
- Confirmed local worker responds on LAN URL `http://192.168.0.209:8788/api/setup/status`.
- Applied local migration `0003_activity_log.sql`.
- Activity smoke check created a temporary note through the API, confirmed it appeared in `/api/activity` and the admin Recent changes panel, then removed the temporary note, activity row, session, and smoke-test admin user.

Visual artifacts were written locally to `output/playwright/`, which is now ignored by git.

## Local Runtime Notes

- The local worker emulator was already running at `http://localhost:8788`.
- The current LAN test URL for a phone on the same Wi-Fi is `http://192.168.0.209:8788`.
- Local D1 already has an `admin` account, so `/api/setup/status` returns `{"needsSetup":false}`.
- Temporary smoke-test users were inserted directly into local D1 and removed after checks.
- Apply migrations before testing on a different local database: `npm run cf:migrate:local`.
- Remote deployment needs `npm run cf:migrate:remote` before activity history can persist in production D1.

## Remaining Work

- External third-party module/package runtime remains deferred.
- Drag-and-drop module reordering remains deferred.
- Static custom page metadata is validated and shown with suggested metadata JSON, but edits still happen in `custom-pages/` source files.
- Admin unlock now shows a live countdown and warning colour near expiry, but it still does not show a toast.
- Admin mobile module controls have had a first polish pass; deeper reordering UX remains deferred.
- Activity history is intentionally read-only and recent-only; no filtering, export, or retention policy UI exists yet.
- A richer deployment wizard could build on the readiness checklist.

## Suggested Next Steps

1. Consider committing a separate branch before attempting drag-and-drop or external modules.
2. If module ordering becomes a priority, design a dedicated reorder control rather than overloading the numeric order field.
3. A richer deployment wizard could build on the readiness checklist.
4. Add activity filtering/export only if the household starts using activity history as an audit tool rather than a recent-changes feed.
