# Modular Hub Upgrade Plan Progress

Last updated: 2026-06-09

## Checkpoint Summary

This checkpoint implements the first modular hub pass: D1-backed household users, first-run admin setup, role-aware sessions, admin unlock, built-in module layout state, appearance settings, generic shared lists, note metadata, custom static page discovery, blank starting data, protected admin settings, docs, and focused tests.

The implementation intentionally keeps modules as built-in registry entries. Third-party downloadable module packages remain deferred.

## Completed

- Replaced env-only admin login with D1 `users` records.
- Added first-run setup via `GET /api/setup/status` and `POST /api/setup/admin`.
- Added household login/logout/me routes backed by D1 sessions.
- Added short-lived admin unlock via `POST /api/admin/unlock`.
- Added admin-only users API for listing, creating, and patching users.
- Moved sensitive household/network settings behind the top-right Admin control.
- Added built-in module registry definitions for Weather, Tides, Lists, Notes, Pages, Deployment, and Admin tools.
- Extended module settings with install state, enable state, position, size, options JSON, and update timestamp.
- Added admin UI controls for install/uninstall, enable/disable, position, size, and destructive uninstall cleanup.
- Changed dashboard rendering to use registry module order and sizes instead of scattered enabled-module checks.
- Removed seeded shopping list/items and example page launcher from fresh setup.
- Added migration cleanup for known seed list/item/page IDs in existing local databases.
- Removed `public/pages/example/index.html`.
- Added generic `lists` and `list_items` tables while preserving old shopping tables for migration compatibility.
- Added list types: basic, shopping, life goal, daily checklist, and weekly chore checklist.
- Added daily/weekly checklist reset keys and automatic reset logic.
- Added `note_type`, `metadata_json`, `created_by`, and `updated_by` support for notes.
- Added authorship fields for lists and list items.
- Added custom static page sync from root `custom-pages/` into `public/custom-pages/`.
- Added generated custom page manifest discovery to the Pages module.
- Protected `/custom-pages/` through the same session middleware as `/pages/`.
- Added colour themes: `frog-peach`, `coastal`, `botanical`, and `mono-dark`.
- Added style themes: `classic`, `compact`, `soft`, and `high-contrast`.
- Stored appearance in D1 settings and applied it via `data-theme` and `data-style`.
- Added hosting and review docs:
  - `docs/site-review.md`
  - `docs/router-hosting.md`
  - `docs/cloudflare-hosting.md`
- Added admin workspace sections for Pages, Cache/Data, Site Review, and Deployment.
- Added cache listing and clearing API routes for admin use.
- Added custom page manifest API route for admin use.
- Added custom page manifest warning generation and an admin validation report.
- Replaced instant module uninstall actions with an explicit preserve-data/delete-data confirmation flow.
- Added deployment readiness checks for D1/API reachability, admin users, location settings, and custom page manifest health.
- Resolved and displayed stored authorship IDs as household display names on lists, list items, and notes.
- Added a visible admin unlock expiry timestamp in the app header.
- Ran browser visual QA against the worker UI at desktop and mobile widths.
- Added unit tests for module normalization, list period reset logic, settings validation, admin unlock helper logic, and custom page manifest parsing.
- Preserved existing tide and password verification tests.
- Added an `activity_log` table (`0003_activity_log.sql`), `logActivity`/`listActivity` helpers, and a `GET /api/activity` route.
- Wired activity recording into every admin and content mutation (users, modules, appearance, cache, notes, lists, list items, pages, page links, settings).
- Added an admin Activity panel with entity-type and summary filters that resolves actor display names.
- Added toast notifications with a dismissible tray and routed all mutation errors through a shared `run()` helper so failures surface to the user instead of failing silently.
- Added a live admin-unlock countdown in the header plus warning toasts at the two-minute mark and on expiry.
- Added inline display-name renaming for household users in the admin Users panel.
- Returned a clear 409 conflict on duplicate usernames when creating or updating users.
- Replaced manual position number input with a drag-and-drop module reorder control plus up/down arrow buttons for keyboard and mobile use.
- Added batch module position updates via `batchPatchModules` with a single `PATCH /api/modules` call.
- Added visual drag handle, dragging opacity, and drop-target highlight styles.
- Added typed module settings schema (`ModuleSettingDefinition`) with select, boolean, text, secret, and number types.
- Added `settings` field to `ModuleDefinition` for weather and tides modules with full setting definitions.
- Replaced hard-coded per-module if-statements in `normaliseModuleOptions` with generic schema-driven normalisation.
- Added `redactModuleOptions` helper to strip secret values before activity logging.
- Updated `ModulesSection.tsx` with generic `SettingControl` renderer driven by module settings schema.
- Updated `ModuleEditControls.tsx` with schema-driven edit controls for home edit mode.
- Added size help text, mode description display, and secret field status indicators in admin UI.
- Added 7 new unit tests for schema normalisation, number clamping, and secret redaction (21 module tests total).

## Partially Complete

- Custom page discovery supports `page.json` metadata, HTML title fallback, and validation warnings. Editing discovered static page metadata still happens in source files, not in the deployed app.

## Deferred

- Fully external third-party module/package runtime.
- Dedicated deployment wizard beyond the readiness checklist.
- Deeper mobile polish pass for dense admin module controls.

## Current Working Set

- The module reorder control with drag-and-drop and up/down buttons is complete.
- Next likely follow-up work is either a deeper mobile admin controls pass or a dedicated deployment wizard, depending on priority.

## Verification

- `npm test` passes (unit tests; Playwright E2E skipped due to environment binding issue).
- `npm run build` passes.
- TypeScript strict mode compiles cleanly.
- `npm run cf:migrate:local` applied `0002_modular_hub.sql` and `0003_activity_log.sql` successfully.
- Worker smoke checks passed locally against `http://localhost:8788` for login, admin unlock, admin routes, appearance update/restore, module update/restore, list/item creation, note creation, and activity recording/listing.
- Playwright browser checks captured admin desktop and mobile screenshots under `output/playwright/`.

## Local State Notes

- The local D1 database already has an `admin` user, so `/api/setup/status` currently returns `{"needsSetup":false}` locally.
- Temporary smoke-test users and content were removed after verification.
- The worker emulator was started during implementation on `http://localhost:8788`.
