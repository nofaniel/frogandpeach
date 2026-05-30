# Modular Hub Upgrade Plan Progress

Last updated: 2026-05-30

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
- Added unit tests for module normalization and list period reset logic.
- Preserved existing tide and password verification tests.

## Partially Complete

- Admin settings page exists as a single admin workspace with Users, Modules, Appearance, Household/Location, and Deployment sections. Dedicated Pages, Cache/Data, and Site Review management sections are not yet full control panels.
- Module uninstall supports preserve-data and delete-data paths, but the UI exposes them as separate buttons rather than a richer confirmation flow.
- Custom page discovery supports `page.json` metadata and HTML title fallback in the sync script. There is not yet a UI for validating or editing discovered static page metadata.
- Authorship fields are stored for new notes/lists/items, but the UI does not yet resolve and display household member names beside content.
- Admin unlock is credential-based and short-lived. It is separate from normal login, but no visible countdown or expiry warning is shown.

## Deferred

- Fully external third-party module/package runtime.
- Drag-and-drop module reordering.
- Full cache/data management tools.
- Full Site Review admin section surfaced in-app.
- Dedicated deployment wizard in the app.
- Broader tests for settings validation, admin unlock helpers, and custom page manifest parsing.
- Manual browser visual QA across desktop/mobile viewports.

## Verification

- `npm test` passes.
- `npm run build` passes.
- `npm run cf:migrate:local` applied `0002_modular_hub.sql` successfully.
- Worker smoke checks passed locally against `http://localhost:8788` for login, admin unlock, admin routes, appearance update/restore, module update/restore, list/item creation, and note creation.

## Local State Notes

- The local D1 database already has an `admin` user, so `/api/setup/status` currently returns `{"needsSetup":false}` locally.
- Temporary smoke-test users and content were removed after verification.
- The worker emulator was started during implementation on `http://localhost:8788`.
