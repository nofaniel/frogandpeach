# Handover

Date: 2026-05-30

## Current State

The modular hub upgrade is implemented as a built-in module registry rather than an external plugin runtime. The app now supports D1-backed users, first-run admin setup, role-aware sessions, short-lived admin unlock, admin-only settings, global appearance settings, generic typed lists, note/list authorship, custom static page discovery, cache controls, and deployment/readiness admin panels.

Latest committed baseline before this handover was `edf2e2a` (`Checkpoint modular hub upgrade`). This handover checkpoint adds the follow-up admin UX and validation work on top of that.

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

## Verification

Passing checks:

- `npm test`: 6 test files, 15 tests.
- `npm run build`.
- Worker smoke check for `GET /api/page-manifest-report`.
- Playwright manual browser pass against `http://localhost:8788` at desktop and mobile widths.

Visual artifacts were written locally to `output/playwright/`, which is now ignored by git.

## Local Runtime Notes

- The local worker emulator was already running at `http://localhost:8788`.
- Local D1 already has an `admin` account, so `/api/setup/status` returns `{"needsSetup":false}`.
- Temporary smoke-test users were inserted directly into local D1 and removed after checks.
- Apply migrations before testing on a different local database: `npm run cf:migrate:local`.

## Remaining Work

- External third-party module/package runtime remains deferred.
- Drag-and-drop module reordering remains deferred.
- Static custom page metadata is validated, but edits still happen in `custom-pages/` source files.
- Admin unlock shows an expiry timestamp, but not a live countdown or warning toast.
- Admin mobile layout works, but dense module controls could use a polish pass.
- A richer deployment wizard could build on the readiness checklist.

## Suggested Next Steps

1. Do a focused mobile admin polish pass, especially module controls.
2. Add a non-destructive custom page metadata editor or validator details panel.
3. Add audit/activity history if household authorship needs to be more than inline attribution.
4. Consider committing a separate branch before attempting drag-and-drop or external modules.
