# Admin Mode

## Original Note

I admin to change, when in the admin should make changes directly onto the items they want to change.

They will see options on the screen that were not visible to standard users e.g. Settings icon on nav bar, and in settings options to change things.

Ability to remove or add modules to front page, movable by clicking a up or down arrow on the module display.

Maybe an edit mode switch - when in edit mode the admin sees these options, then can press save to apply the changes. With ability to change the display options as well etc.

Admin mode should be accessed via Settings item in navbar, in settings the user can then select Admin Settings - they enter the admin password and can access. Not done via Admin separate account, but just a password.

## Goal

Add a focused admin edit mode that lets an unlocked admin make common homepage module changes directly where the modules appear, without leaving the dashboard for the full Admin settings panel.

The first implementation should cover homepage module visibility, widget visibility, ordering, size, and existing per-module display options. It should reuse the current password-gated admin unlock and module persistence instead of adding a new account model, router, or database table.

## Current State

- The app is a React 19 + TypeScript + Vite frontend with Cloudflare Pages Functions and D1. There is no client-side router; navigation is managed in `src/features/app-shell/useAppController.ts` via `activeTab` state.
- **Frontend follows a "smart hook + dumb components" pattern.** All state and logic live in `useAppController.ts` (679 lines). `src/App.tsx` (171 lines) is a thin render dispatcher.
- `useAppController.ts` owns all relevant state:
  - `session` (line 71), `activeTab` (72), `adminOpen` (73), `unlockOpen` (74).
  - `displayModules` (line 84) — installed/enabled modules for homepage.
  - `adminModules` (line 85) — full module list for Admin panel.
  - admin unlock expiry effect (lines 121-129) — resets `session.adminUnlocked`, closes admin, clears state, toasts on expiry.
  - near-expiry warning effect (lines 131-145) — toasts when within 120s of expiry.
- Key functions in `useAppController.ts`:
  - `openAdmin()` (line 267) — opens unlock modal or admin panel.
  - `unlockAdmin()` (line 277) — POSTs `/api/admin/unlock`, updates session.
  - `patchModule()` (line 481) — sends `PATCH /api/modules`, refreshes data.
  - `batchPatchModules()` (line 489) — sends reorder patches.
  - `logout()` (line 252) — clears session and all state.
  - `navigate()` (line 524) — handles tab/admin/module navigation.
- The top bar is `src/features/app-shell/TopNavigation.tsx` (47 lines). It renders an `Admin settings` button (line 42). The outer shell is `src/features/app-shell/AppShellLayout.tsx` (94 lines).
- The Admin unlock modal is `src/features/app-shell/AdminUnlockModal.tsx` (28 lines).
- `src/App.tsx` (line 76-98) renders `<AdminPanel>` when `adminOpen && !viewedPage`.
- `src/features/admin/AdminPanel.tsx` (138 lines) composes 7 section components. `src/features/admin/sections/ModulesSection.tsx` handles module install, enable, homepage-widget, size, display option, drag, keyboard reorder, and up/down controls.
- `src/features/home/HomeDashboard.tsx` (71 lines) renders the homepage grid. It receives `dashboardModules` and dispatches to widget components via `renderWidget()` (lines 47-70). Widgets live in `src/features/home/widgets/`.
- Homepage modules are derived in `useAppController.ts` from `displayModules` (installed/enabled modules with `homeWidget` enabled).
- The backend module registry is hardcoded in `src/api/modules.ts`. Adding a brand-new module still requires a code change there, but this admin-mode feature does not need new module definitions.
- `module_settings` already stores `installed`, `enabled`, `position`, `size`, and `options_json`. The base table is in `migrations/0001_initial.sql`; the extended module fields are added in `migrations/0002_modular_hub.sql`.
- `PATCH /api/modules` is implemented in `src/api/router.ts:123`. It requires `requireAdminUnlock()`, persists through `updateModules()`, optionally deletes data on uninstall, and writes activity entries.
- Admin unlock is session-scoped, not a separate admin account screen. `src/api/auth.ts` stores `sessions.admin_unlocked_until`, uses a 15-minute unlock window, verifies active admin credentials for `/api/admin/unlock`, and rate-limits unlock failures.
- Mutating API routes go through the trusted Origin guard in `src/api/router.ts`, and the project instructions explicitly require preserving separate timed admin re-auth for admin actions.
- Existing tests include `src/api/modules.test.ts`, `src/api/auth.test.ts`, `src/api/router.test.ts`, and E2E coverage in `e2e/home.spec.ts` for home widgets and the Admin module settings flow.

## Proposed Behavior

- Signed-in non-unlocked users see the existing top-bar `Admin settings` entry. Pressing it opens the existing admin unlock modal.
- After successful admin unlock, the user can choose between:
  - Opening the full Admin settings panel as today.
  - Turning on a lightweight homepage edit mode from the top bar or Admin settings header.
- When homepage edit mode is active:
  - The normal homepage remains visible.
  - Each visible homepage module displays admin-only inline controls.
  - Admins can move a module up/down, change size, hide the module from the homepage, disable the full module, and adjust existing display options that already exist for that module.
  - Changes persist through the existing `PATCH /api/modules` route.
  - The dashboard updates after each saved change, using the normalized `Module[]` returned by the API or the existing refresh flow.
- When admin unlock expires:
  - Edit mode turns off automatically.
  - Inline controls disappear.
  - The current "Admin session expired" toast behavior remains.
- Standard users and signed-in users without active admin unlock never see inline edit controls and cannot write module changes.

## UX Details

- Add an `editMode` state in `useAppController.ts`, scoped to the current browser session. Do not persist edit mode in D1 or localStorage.
- Add a compact top-bar control in `TopNavigation.tsx` that only appears when `session.adminUnlocked` is true. Suggested copy:
  - Off state: `Edit home`
  - On state: `Done`
- Keep the existing `Admin settings` button. It should still open the full Admin settings panel for users, private settings, cache, activity, deployment, pages, and advanced module management.
- When an unlocked admin clicks `Admin settings` while not unlocked, the existing unlock modal remains the only password prompt. Do not add a second password dialog for edit mode.
- Inline controls should appear inside or attached to each module card without changing the user-facing content layout more than necessary. Recommended control set:
  - Up arrow button: move module earlier in homepage order.
  - Down arrow button: move module later in homepage order.
  - Size select: `Small`, `Medium`, `Wide`, `Full`.
  - Widget visibility button: `Hide from home`.
  - Module visibility button: `Disable module`.
  - Existing option controls where already supported:
    - Weather: icon style and 5-day forecast.
    - Tides: source and API-key-related controls should stay in full Admin settings for the first version unless the UI can keep the API key field safe and compact.
    - Lists, Notes, Pages, Network: homepage mode.
- Provide a small edit-mode toolbar above the dashboard with:
  - A clear status label such as `Home edit mode`.
  - A button to open full Admin settings.
  - A `Done` button.
- Hidden homepage widgets need a way back. In edit mode, show a compact "Hidden home widgets" strip below the visible dashboard, listing installed/enabled modules whose `homeWidget` exists but `options.homeWidget.enabled === false`. Each item should have `Show on home`.
- Disabled or uninstalled modules do not need inline placeholders on the homepage. They remain manageable from the full Admin settings module registry.
- Use existing visual patterns in `src/styles.css`:
  - `.home-dashboard` and `.panel` for module layout.
  - `.module-controls`, `.module-actions`, `.module-options`, `.compact-field`, `.reorder-bar`, and `.icon-button` for controls.
  - Responsive behavior near `src/styles.css:1211` and `src/styles.css:1220` so controls stack on mobile.
- Accessibility requirements:
  - All icon-only buttons need explicit `aria-label`.
  - Up/down buttons must be disabled at the first/last visible editable position.
  - Selects need visible labels or accessible labels.
  - Edit mode status should be apparent without relying only on color.

## Backend and Data Changes

- Reuse existing `PATCH /api/modules`; do not add a new endpoint for the first version.
- Reuse existing `requireAdminUnlock()` protection in `src/api/router.ts`. Do not relax admin unlock requirements.
- Reuse `module_settings` fields:
  - `enabled` for full module visibility and tab visibility.
  - `position` for dashboard/module ordering.
  - `size` for `module-small`, `module-medium`, `module-wide`, and `module-full`.
  - `options_json.homeWidget.enabled` for homepage widget visibility.
  - `options_json.homeWidget.mode` and existing module-specific options for display choices.
- No migration is expected for the first implementation.
- Keep the existing activity logging for module patches. If inline mode sends a batch reorder, each patch will continue to log as an updated module through `routeModules()`.
- Consider adding a shared frontend type for module patches in `src/shared/api-types.ts` only if it reduces duplicate ad hoc patch shapes. It is not required for backend behavior.
- Do not implement "admin mode by just a password" as a separate global password. The existing architecture requires a signed-in session plus admin unlock password re-auth. The user intent is satisfied by the current `/api/admin/unlock` timed password gate.

## Files Likely to Change

- `src/features/app-shell/useAppController.ts`
  - Add `editMode` state and `setEditMode` toggle.
  - Turn edit mode off when admin unlock expires (in expiry effect at line 121) or the user logs out (`logout()` at line 252).
  - Return `editMode` and `setEditMode` from the hook's return shape.
- `src/features/app-shell/TopNavigation.tsx`
  - Add an `Edit home` / `Done` toggle button that only appears when `session.adminUnlocked` is true and `activeTab === 'home'`.
- `src/App.tsx`
  - Pass `editMode` and edit-related props through to `<HomeDashboard>`.
- `src/features/home/HomeDashboard.tsx`
  - Accept edit-mode props and render inline controls on each module widget when edit mode is active.
  - Add the hidden-home-widgets recovery strip below the dashboard grid.
- `src/features/home/` (new component)
  - Extract a reusable `ModuleEditControls` component for the inline controls (up/down, size, widget toggle, display options). Place it alongside the widget components in `src/features/home/`.
- `src/features/admin/sections/ModulesSection.tsx`
  - Extract shared reorder/option logic into a helper that both `ModulesSection` and the new `ModuleEditControls` can import, avoiding duplication.
- `src/styles.css`
  - Style the edit-mode toolbar, inline module controls, module edit state, hidden widget strip, and responsive stacking.
  - Reuse existing module/admin control classes where possible.
- `src/shared/api-types.ts`
  - Optional: add a `ModulePatch` type matching the existing backend shape if the frontend benefits from stricter typing.
- `src/api/modules.test.ts`
  - Add coverage for patch behavior if implementation touches module normalization or update behavior.
- `src/api/router.test.ts`
  - Optional: add focused route coverage that `/api/modules` still returns 403 without admin unlock if existing helpers make this practical.
- `e2e/home.spec.ts`
  - Add E2E coverage for unlocking admin edit mode, changing order/size/home visibility inline, and restoring state.

## Implementation Plan

1. Add frontend edit-mode state in `useAppController.ts`.
   - Add `const [editMode, setEditMode] = useState(false)` alongside the existing state (around line 73).
   - In the existing admin expiry effect at line 121-129, also set `editMode` to false when unlock expires.
   - In `logout()` at line 252-260, also set `editMode` to false.
   - If `session.adminUnlocked` becomes false for any reason, ensure edit mode is off.
   - Return `editMode` and a `setEditMode` toggle from the hook's return shape.

2. Add edit-mode entry point in `TopNavigation.tsx`.
   - Show an `Edit home` button only when `session.adminUnlocked` is true and `activeTab === 'home'` and `!adminOpen` and `!viewedPage`.
   - When active, the same control should read `Done`.
   - Keep the existing `Admin settings` button and `openAdmin()` behavior unchanged.
   - Pass `editMode` and `setEditMode` through `App.tsx` → `<AppShellLayout>` → `<TopNavigation>`.

3. Create a reusable `ModuleEditControls` component in `src/features/home/`.
   - This component renders the inline edit toolbar for a single module widget.
   - Inputs: `module`, visible editable modules list, index, `onPatchModule`, `onBatchPatchModules`, and option-specific callbacks.
   - Extract shared reorder/option logic from `src/features/admin/sections/ModulesSection.tsx` into a shared helper to avoid duplicating the up/down, size select, widget toggle, and mode select logic.
   - Controls: up arrow, down arrow, size select (Small/Medium/Wide/Full), widget visibility toggle, and existing display options (weather icon style, extended forecast, homepage modes for lists/notes/pages/network).
   - Keep uninstall and delete-data out of inline homepage edit mode for the first version; those stay in full Admin settings.

4. Wire edit controls into `HomeDashboard.tsx`.
   - Accept `editMode` and edit-related callbacks as props.
   - When `editMode` is true, wrap each module widget in an edit shell that renders `<ModuleEditControls>` alongside the widget.
   - Preserve the module card's `module-${size}` grid class so size changes still work.
   - Ensure keys stay stable by `module.id`.

5. Implement reorder for homepage-visible modules.
   - Reorder only among installed/enabled modules with `homeWidget` currently visible on home.
   - Generate position patches against the full `modules` list so hidden widgets and non-home modules retain their relative positions.
   - Disable up/down buttons at the first and last visible positions.
   - After a reorder, rely on `PATCH /api/modules`, `refreshAdmin()`, and `refreshAll()` or replace local `modules` with returned API data if refactoring the handler.

6. Add "Hidden home widgets" recovery UI in `HomeDashboard.tsx`.
   - Derive hidden widgets from `modules.filter((module) => module.installed && module.enabled && module.homeWidget && module.options.homeWidget?.enabled === false)`.
   - Render only while `editMode` is active.
   - Each row should call `onPatchModule(module, { options: { ...module.options, homeWidget: { enabled: true, mode: validOrDefaultMode } } })`.

7. Keep backend unchanged unless tests expose a gap.
   - Do not add a migration.
   - Do not add a new route.
   - Do not change admin unlock semantics.
   - If adding a shared `ModulePatch` type, keep it aligned with `src/api/modules.ts`.

8. Add or update tests.
   - Unit tests in `src/api/modules.test.ts` should remain green. Add backend tests only if module update behavior changes.
   - Add E2E in `e2e/home.spec.ts` for inline edit mode:
     - Sign in.
     - Unlock admin.
     - Enter `Edit home`.
     - Hide the Notes widget from home and confirm it disappears while the Notes tab remains available.
     - Restore the Notes widget from the hidden widgets strip.
     - Change one module size and confirm the corresponding class changes.
     - Move a module down/up and confirm visual order changes.
     - Restore all changed state in `finally`.

9. Verify locally.
   - Run `npm test`.
   - Run `npm run build`.
   - For E2E/manual verification, use the full worker runtime:
     - `npm run build`
     - `npm run dev:worker`
     - In another shell with local credentials:
       - `$env:E2E_BASE_URL='http://localhost:8788'`
       - `$env:TEST_USERNAME='admin'`
       - `$env:TEST_PASSWORD='<local password>'`
       - `npm run test:e2e`

## Acceptance Criteria

- A signed-in user who has not completed admin unlock does not see homepage inline edit controls.
- Clicking the existing `Admin settings` control still opens the admin unlock modal when needed.
- After successful admin unlock, the admin can turn on homepage edit mode from the home screen.
- Edit mode shows inline controls on visible homepage modules only.
- Admins can move visible homepage modules up and down using buttons.
- Admins can change a visible module's size, and the dashboard reflects the new size after save/refresh.
- Admins can hide a widget from the homepage without disabling the module tab.
- Hidden homepage widgets can be restored from edit mode.
- Existing full Admin settings module controls still work.
- When the 15-minute admin unlock expires, edit mode turns off and inline controls disappear.
- Standard users or expired sessions cannot persist module changes; backend still returns an admin-unlock error.
- No new D1 migration is required for the first implementation.
- `npm test` and `npm run build` pass.

## Test and Verification Notes

- Run `npm test` for Vitest coverage. CI runs this command.
- Run `npm run build`; this also runs the sync scripts through `prebuild` and catches TypeScript/Vite issues.
- E2E tests are not in CI and require a live full-stack instance at `:8788`. Do not run them against production because they mutate D1 data.
- For manual visual checks, use `npm run build && npm run dev:worker`, then test desktop and mobile widths. Focus on:
  - Top bar button wrapping.
  - Inline controls inside small and wide modules.
  - Up/down controls at the first and last module.
  - Hidden widgets strip on mobile.
  - Admin unlock expiry behavior.
- If the E2E test changes module state, restore it in `finally` blocks like existing `e2e/home.spec.ts` tests do.

## Open Questions

- Assumption: inline edit mode should save each change immediately through `PATCH /api/modules`, matching the current Admin settings behavior. A separate "Save all changes" draft workflow is possible later but would add more state and failure handling.
- Assumption: inline edit mode should not expose install/uninstall or delete-data controls. Those are higher-risk and should remain in full Admin settings.
- Assumption: weather and simple homepage mode options can be inline; sensitive or bulky options such as tide API key can stay in full Admin settings for the first version.
- Should the top-bar entry be labelled `Edit home`, `Admin mode`, or another term? The plan uses `Edit home` because it describes the scoped first implementation.
