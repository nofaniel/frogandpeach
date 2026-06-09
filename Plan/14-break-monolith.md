# Refactor `App.tsx` Into a Thin Shell

## Summary
Reduce [`/N:/code/FP/src/App.tsx`](/N:/code/FP/src/App.tsx) from the current all-in-one controller/view file into a small composition root that only:
- calls a single app controller hook
- selects which top-level screen to render
- wires the existing theme provider and toast tray

Keep product behavior, API routes, auth flows, URL handling, CSS class names, and current Playwright selectors unchanged. Do not introduce a router, global state library, or new frontend dependencies.

## Implementation Changes
### 1. Extract app orchestration into `src/features/app-shell/*`
Create a feature-level controller hook and move all non-visual app orchestration out of `App.tsx`:
- `useAppController.ts` owns current top-level state, effects, boot/refresh logic, CRUD handlers, admin unlock timing, toast handling, and derived state.
- `navigation.ts` owns `NavigationTarget`, `NavigationEntry`, core nav definitions, module-to-nav mapping, nav entry construction, and active-state helpers.
- `homeWidgets.ts` owns pure helper logic now embedded in `App.tsx`, including `resolveHomeWidgetState`, `getHomeListEntries`, and `isListStarred`.
- Keep `useState<Tab>` navigation and the `/page/:slug` boot-time pathname check exactly as they work today.

Return grouped state/actions from the controller so screen components receive focused props rather than dozens of unrelated values.

### 2. Split major screens into feature components
Move each large render branch out of `App.tsx` into `src/features/*`, following the existing `NetworkWorkspace` precedent:
- Auth/UI shell:
  - `LoginScreen`
  - `PasswordSetupScreen`
  - `AdminUnlockModal`
- Main tab workspaces:
  - `HomeDashboard`
  - `ListsWorkspace`
  - `NotesWorkspace`
  - `PagesWorkspace`
  - reuse existing `NetworkWorkspace`
  - `StandalonePageView`
- `App.tsx` should only switch between:
  - loading
  - password setup
  - unauthenticated login
  - standalone page view
  - admin view
  - active tab workspace

Preserve current headings, button labels, form labels, and structural class names such as `.home-dashboard`, `.workspace-grid`, `.note-panel`, `.list-panel`, and `.page-panel`.

### 3. Break home widgets into per-widget components
Inside `src/features/home/*`, split the `renderModule(...)` branch logic into dedicated widget components:
- `WeatherWidget`
- `TidesWidget`
- `ListsWidget`
- `NotesWidget`
- `PagesWidget`
- `NetworkWidget`

Keep `HomeDashboard` responsible only for filtering enabled widgets and mapping modules to widget components. Move weather metric icon helpers with the weather widget. Preserve widget-specific behavior and output.

### 4. Break the admin panel into section components
Move `AdminPanel` out of `App.tsx` and split it by responsibility under `src/features/admin/*`:
- `AdminPanel` shell/layout
- `UsersSection`
- `ModulesSection`
- `AppearanceSection`
- `SettingsSection`
- `PageInventorySection`
- `CacheSection`
- `ActivitySection`

Keep section-local UI state where it belongs:
- pending uninstall modal
- tide API key draft
- activity filters
- inline user editing state
- drag/drop reorder state

Keep module patching, user patching, cache clearing, appearance save, and settings save in the controller hook so mutation behavior stays centralized and unchanged.

## Public Interfaces / Types
- No backend, D1, API route, or shared contract changes.
- No changes to [`/N:/code/FP/src/shared/api-types.ts`](/N:/code/FP/src/shared/api-types.ts) unless a strictly frontend-internal type is worth moving there, which is not expected.
- Add only frontend-internal types for controller return shape and screen props.
- Do not change existing E2E-facing text or selector semantics.

## Test Plan
Add or update only the tests needed to make the refactor safe:
- Add unit tests for extracted pure helpers in `src/features/app-shell` or `src/features/home`:
  - nav entry construction/active-state behavior
  - home widget mode resolution
  - starred/active list ordering
- Keep existing API/shared tests green with `npm test`.
- Keep the production build green with `npm run build`.
- Run Playwright against a local `:8788` worker instance:
  - `e2e/home.spec.ts`
  - `e2e/content-crud.spec.ts`
- Acceptance criteria:
  - `App.tsx` is reduced to a thin shell and no longer contains tab-specific JSX, admin panel JSX, or widget-specific rendering branches.
  - Existing user flows remain unchanged: login, admin unlock, home widgets, list CRUD, note CRUD, page CRUD, network view.
  - Existing CSS classes and accessible labels used by Playwright still work.

## Assumptions
- Chosen scope: thin-shell refactor, not a broader architecture rewrite.
- No intentional UI or behavior changes are part of this task.
- No new libraries should be added for routing, state management, or component testing.
- Feature-based file layout should follow the repo’s existing `src/features/network/` pattern.
