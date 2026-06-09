# Refactor `App.tsx` Into a Thin Shell

## Summary
Refactor `src/App.tsx` into a thin composition root without changing APIs, database schema, routing model, dependencies, visible UI, CSS hooks, or Playwright-facing selectors.

The implementation must preserve the current state machine: loading -> password setup -> unauthenticated login -> authenticated app shell. Inside the authenticated shell, `viewedPage` takes priority over admin and tab workspaces, and `/page/:slug` continues to be resolved during every `refreshAll()` from `window.location.pathname`.

Planning baseline: `npm test` passed with 12 files / 74 tests during plan review. `npm run build` was intentionally not run during planning because `prebuild` sync scripts can mutate generated tracked assets.

## Current State And Key Risks
- `src/App.tsx` is 2,059 lines and currently owns boot/auth, refreshes, admin unlock timers, toast state, all CRUD handlers, navigation, screen JSX, home widgets, and admin panel UI.
- `src/features/network/NetworkWorkspace.tsx` is the only existing feature extraction and should remain the pattern for workspace components.
- `ThemeProvider` stays above `App` in `src/main.tsx`; extracted controller/screens using `useTheme()` must remain under that provider.
- CSS expects `.app-shell`, `.top-strip`, `.tab-bar`, and direct shell children for themed side/top navigation layouts.
- Preserve implicit label associations. Many E2E locators depend on wrapped `<label>` text rather than explicit `aria-label`.
- Keep separate public and admin state in the new controller:
  - Public state comes from `/api/home` and `/api/appearance`.
  - Admin state comes from admin-unlocked endpoints only.
  - Do not pass admin-only settings, users, cache/activity, page manifest warnings, or full network data into non-admin screens.
  - On admin unlock expiry and logout, clear admin-only client state and `fullNetwork`, while preserving public dashboard state needed for normal home rendering.
- `tabs` and `tabModuleMap` in `App.tsx` appear unused; delete them during cleanup rather than moving dead constants.

## Target Architecture
- Add `src/features/app-shell/useAppController.ts` for all app orchestration:
  - boot flow: `GET /api/setup/status`, `GET /api/auth/me`, then `refreshAll()` only when authenticated and not password-setup-blocked
  - `refreshAll()`: parallel `GET /api/home`, `/api/lists`, `/api/notes`, `/api/pages`, `/api/page-links`, `/api/appearance`; reset `fullNetwork`; apply authoritative theme; resolve `/page/:slug`
  - `refreshAdmin()`: admin-only `GET /api/settings`, `/api/users`, `/api/modules`, `/api/cache`, `/api/page-manifest-report`, `/api/activity`
  - admin unlock timer, two-minute warning toast, expiry closeout, CRUD handlers, drafts, and toast handlers
- Controller return shape must be grouped, not flat:
  - `auth`, `shell`, `navigation`, `adminUnlock`, `home`, `lists`, `notes`, `pages`, `network`, `admin`, `toasts`
  - `shell` includes `screen`, `activeTab`, `adminOpen`, `viewedPage`, `publicSettings`, `displayModules`, `error`, `busy`, admin unlock label/remaining time, and display name
  - `admin` includes `adminSettingsDraft`, `adminModules`, users, cache/activity/page-manifest state, and admin mutation actions
- Add `src/features/app-shell/navigation.ts`:
  - `NavigationTarget`, `NavigationEntry`, core nav entries, module target mapping, `buildNavigationEntries`, `navigationIconForModule`, `isNavigationEntryActive`
- Add `src/features/app-shell/homeWidgets.ts`:
  - `resolveHomeWidgetState`, `getHomeListEntries`, `isListStarred`, and internal helper types
- Add shell/screen components:
  - `AppShellLayout`, `TopNavigation`, `LoginScreen`, `PasswordSetupScreen`, `AdminUnlockModal`
  - `HomeDashboard`, `ListsWorkspace`, `NotesWorkspace`, `PagesWorkspace`, `StandalonePageView`
  - keep existing `NetworkWorkspace`
- Split home widgets under `src/features/home/widgets/`:
  - `WeatherWidget`, `TidesWidget`, `ListsWidget`, `NotesWidget`, `PagesWidget`, `NetworkWidget`
  - preserve each widget `article id={module.id}` and `panel module-${module.size}` class behavior for nav scroll and styling
- Move `AdminPanel` under `src/features/admin/`, then split by existing visual sections:
  - `UsersSection`, `ModulesSection`, `AppearanceSection`, `SettingsSection`, `PageInventorySection`, `CacheSection`, `ActivitySection`
  - keep section-local state local: uninstall modal, tide API key draft, activity filters, inline user editing, drag/drop reorder

## Implementation Plan
1. Baseline first: inspect `git status`; do not touch unrelated dirty files such as `gh-pages-site/index.html`.
2. Extract pure helpers and tests before moving JSX:
   - `navigation.ts` + `navigation.test.ts`
   - `homeWidgets.ts` + `homeWidgets.test.ts`
3. Extract `useAppController` while keeping most JSX temporarily in `App.tsx`; this stabilizes state and action contracts before component movement.
4. Introduce `AppShellLayout` and `TopNavigation`; keep `.app-shell`, `.top-strip`, `.tab-bar`, button labels, active-state behavior, and widget scroll handling unchanged.
5. Extract auth screens, unlock modal, standalone page, and tab workspaces with current markup copied faithfully.
6. Extract `HomeDashboard`, then split widgets one at a time. Unknown module ids should render nothing, matching current `renderModule()` behavior.
7. Move `AdminPanel` whole first, then split sections. Extract and test module reorder patch generation if it becomes a standalone helper.
8. Final cleanup: remove unused `tabs`/`tabModuleMap`, dead imports, and all moved helper/component definitions from `App.tsx`.

For agentic implementation, do not have multiple agents edit `src/App.tsx` at the same time. Use one integrator for the controller/App seam, then parallelize disjoint folders: home widgets, admin sections, workspace screens, and E2E verification.

## Public Interfaces
- No backend route, D1 migration, shared API contract, auth/session contract, theme manifest contract, or dependency changes.
- Add only frontend-internal types for controller groups and component props.
- Keep `api<T>()` behavior unchanged: relative same-origin fetches, JSON body handling, Vite-only API 404 message, and `requireOk=false` 401 fallback.
- Do not merge editable page `Page.theme` values with app-level `themeId`; they are separate systems.

## Selector And Behavior Contracts
Preserve these exactly:
- Auth: `Username`, `Password`, `Sign in`, greeting heading, `Home`
- Admin unlock: `aria-label="Admin settings"`, dialog semantics, `Admin username`, `Password`, `Unlock`, `Close`
- Navigation: `Home`, `Lists`, `Notes`, `Pages`, `Network`, `.tab-bar`, active class behavior
- Home: `.home-dashboard .panel`, six default widgets, widget `article` structure, `button.plain-row`, `.network-summary-grid`
- Admin modules: `.module-config-row`, module title text, `Widget on`, `Widget off`, `Homepage mode`
- Lists: `.list-panel`, `Big shop, chores, goals...`, `Add item`, `Add list`, exact `Add`, `Star`, `Unstar`, `Delete ${item.text}`
- Notes: `.note-panel`, `Title`, `Markdown note`, `Tags, comma separated`, `Save note`, `Pin`, `Unpin`, `Delete`
- Pages: `.page-panel`, `custom-slug`, `Icon`, `Occasion or short description`, `Markdown body`, `Create page`, `Open`, standalone `Back`

## Test Plan
- Add Vitest tests for:
  - navigation filtering, active-state behavior, extra module fallback targets
  - widget default/invalid mode resolution and explicit disabled state
  - starred/active list ordering, incomplete counts, recency fallback, non-boolean metadata
  - module reorder patch generation if extracted
- Run:
  - `npm test`
  - `npm run build`
- Run E2E against local worker only:
  - `npm run build`
  - `npm run dev:worker`
  - PowerShell env: `E2E_BASE_URL=http://localhost:8788`, `TEST_USERNAME=admin`, `TEST_PASSWORD=<local-admin-password>`
  - `npm run test:e2e -- e2e/home.spec.ts e2e/content-crud.spec.ts`
- Extend the page CRUD E2E flow to directly visit `/page/<slug>` after creating a page, confirming the `refreshAll()` pathname behavior still works on direct boot.
- Use headed E2E for a final visual smoke check of home/admin after extraction.

## Acceptance Criteria
- `App.tsx` has no direct `api()` calls, no tab workspace JSX, no home widget branches, no admin section JSX, and no local app orchestration effects beyond calling the controller and selecting screens.
- Existing login, setup, password reset, logout, refresh, admin unlock, admin expiry toast, admin closeout, theme save, home widget, CRUD, standalone page, and network flows remain unchanged.
- Admin-only client state is not passed to non-admin screens and is cleared on admin expiry/logout.
- Existing E2E selectors and accessible names still work.
- `npm test`, `npm run build`, and the targeted Playwright specs pass locally.

## Assumptions
- This is still primarily a frontend refactor.
- The only intentional behavior tightening is client-side admin/private state separation and cleanup.
- No new router, state library, formatter, linter, test framework, backend endpoint, or migration is introduced.
