# UI and Display Modes

## Original Note

Dark/Light mode button toggle - ensuring it works perfectly with all modules that are displaying.

Viewing on desktop - should be possible to display in a wider view. Maybe 2 column view?

## Goal

Add clear, reliable appearance controls for:

- Switching the app between light and dark presentation.
- Switching desktop layouts between the current compact app-style layout and a wider desktop layout with useful two-column module display.

The implementation should reuse the existing theme system, preserve mobile behavior, and keep all currently installed home modules readable and usable in both color modes and display modes.

## Current State

The app is a Cloudflare Pages + D1 app with a React 19 + TypeScript + Vite frontend and Cloudflare Workers backend.

Relevant architecture:

- `src/App.tsx` owns all app state, navigation, dashboard rendering, and the Admin UI. Navigation is `useState<Tab>`; there is no client-side router.
- `src/main.tsx` wraps `<App />` in `ThemeProvider`.
- `src/theme/ThemeProvider.tsx` loads `/themes/manifest.json`, resolves selected theme inheritance, applies the resolved theme, and stores no-FOUC localStorage values:
  - `fp-theme-id`
  - `fp-theme-snapshot`
- `index.html` has a no-FOUC boot script that reads `fp-theme-snapshot` before React mounts and applies CSS variables/data attributes to `<html>`.
- `src/theme/applyTheme.ts` maps theme tokens to CSS custom properties and layout to root data attributes:
  - `data-nav`
  - `data-density`
  - `data-surface`
  - `data-theme-id`
- `src/theme/types.ts` supports theme layout fields:
  - `navigation: 'top' | 'side'`
  - `density: 'comfortable' | 'compact'`
  - `surface: 'card' | 'flat' | 'outline'`
  - `dashboardColumns`
  - `shellWidth`
  - `bodyBackground`
- `themes/base/theme.json` sets `dashboardColumns: 2` and `shellWidth: 1120px`.
- `themes/mono-dark/theme.json` is the only bundled dark theme. It extends `frog-peach` and overrides color tokens.
- `scripts/sync-themes.mjs` copies `themes/` into `public/themes/` and generates `public/themes/manifest.json` during `predev` and `prebuild`.

Appearance persistence today:

- `src/api/data.ts` defines `Settings` with only `themeId` for appearance.
- `src/shared/api-types.ts` defines `Appearance = Pick<Settings, 'themeId'>`.
- `GET /api/appearance` returns `{ themeId }`.
- `PUT /api/appearance` validates the theme ID and stores it in the key-value `settings` table.
- `PUT /api/appearance` requires `requireAdminUnlock` in `src/api/router.ts`.
- `App.refreshAll()` fetches `/api/appearance`, merges it into `settings`, and calls `setTheme(appearanceData.themeId)`.
- `App.saveAppearance()` optimistically calls `setTheme(next.themeId)`, saves `/api/appearance`, then reapplies the returned theme.
- `AdminPanel` currently shows only an "Active theme" `<select>` in Admin -> Appearance.

Current layout behavior:

- Early `src/styles.css` defines `.app-shell` as `width: min(var(--shell-width), calc(100% - 28px))`.
- Early `.dashboard-grid` and `.workspace-grid` use `repeat(var(--dashboard-columns), minmax(0, 1fr))`.
- Module sizes already exist in `src/api/modules.ts` and `src/shared/api-types.ts`: `small`, `medium`, `wide`, and `full`.
- `.module-wide` and `.module-full` currently span all columns on desktop.
- Mobile at `max-width: 820px` forces one-column grids and resets `.module-wide`/`.module-full` to normal grid placement.
- Later CSS beginning around the "Compact app-style front page" block overrides the home experience:
  - `.app-shell` is forced to `width: min(568px, calc(100% - 32px))`.
  - `.app-shell:has(.admin-grid)` is widened back to `var(--shell-width)` only for Admin.
  - `.home-dashboard` is forced to `grid-template-columns: 1fr`.
  - `.workspace-grid` is forced to `grid-template-columns: 1fr`, except `.workspace-grid.admin-grid` uses two columns.
  - `:root[data-nav="side"]` is disabled for the non-admin compact shell later in the stylesheet.

Important constraint:

- The existing token-driven theme system is partly bypassed by hard-coded app-style colors in the later CSS block, such as `--app-green`, `--app-card`, `--app-ink`, hard-coded gradients, and fixed white backgrounds. Dark mode will not be reliable until those app-style overrides are made theme-token friendly.

## Proposed Behavior

Appearance remains admin-controlled and global for the household, matching the existing `/api/appearance` security model.

Add two appearance axes:

- `colorMode`: `light` or `dark`.
- `displayMode`: `standard` or `wide`.

Recommended persistence model:

- Keep `themeId` as the effective active theme for backward compatibility.
- Add `lightThemeId` to remember the preferred light theme when the user switches to dark.
- Add `colorMode` and `displayMode` as settings keys in the existing key-value `settings` table.
- Do not add a D1 migration unless a future implementation needs a non-key-value schema. The existing `settings` table can store new keys after `settingDefaults` and type definitions are updated.

Color behavior:

- Light mode applies `lightThemeId` if present, otherwise the current non-dark `themeId`, otherwise `base`.
- Dark mode applies `mono-dark` for the first implementation.
- Switching from light to dark stores the current light theme in `lightThemeId` before applying `mono-dark`.
- Switching from dark to light restores `lightThemeId || 'base'`.
- The existing full theme picker remains available. When an admin selects a light theme while in light mode, update both `themeId` and `lightThemeId`. When an admin selects a light theme while in dark mode, update only `lightThemeId` and keep `themeId: 'mono-dark'` until they switch back to light.
- If `themeId` is already `mono-dark` on an existing database, infer `colorMode: 'dark'` and `lightThemeId: 'base'` unless explicit settings say otherwise.

Display behavior:

- Standard display keeps the current compact app-style home layout.
- Wide display only affects desktop/tablet widths above the existing `821px` breakpoint.
- Wide display increases `.app-shell` width for non-admin views and allows `.home-dashboard` and non-admin `.workspace-grid` to use a two-column desktop grid.
- Mobile remains one column for all display modes.
- Existing module `size` values continue to matter:
  - `small` and `medium` can occupy one column.
  - `wide` and `full` continue to span all columns unless a future module-settings feature changes their sizes.
- Since current defaults make Weather, Tides, Pages, and Network `wide`, the first wide layout will most visibly place Lists and Notes side by side unless the admin changes module sizes.

## UX Details

Add controls in `AdminPanel` under Admin -> Appearance, near the existing Active theme select.

Color mode control:

- Use a two-option segmented control or button group:
  - `Light`
  - `Dark`
- The control should show the active state and be keyboard accessible.
- The control should call `onAppearanceChange()` with the next `Appearance` object.
- Because `/api/appearance` requires admin unlock, do not add a non-admin global mutating toggle to the header in the first pass.

Theme picker behavior:

- Keep the current "Active theme" select, but clarify that it selects the light theme when dark mode is active.
- Avoid listing `mono-dark` as a normal light theme option if that would make the Light/Dark control ambiguous. If it remains listed, selecting it should set `colorMode: 'dark'`.
- Continue showing selected theme metadata from `themes`.

Display mode control:

- Add a second segmented control or select:
  - `Standard`
  - `Wide desktop`
- Include concise helper text:
  - Standard: "Compact app-style layout."
  - Wide desktop: "Uses more desktop width and allows two-column module grids."
- Do not show in-app explanatory copy outside Admin settings.

Visual expectations:

- Dark mode must affect the login screen, top strip, tab bar, home dashboard, Admin, Lists, Notes, Pages, Network, modals, toasts, empty/error states, and standalone `/page/:slug` views.
- Dark mode must not leave hard-coded white panels or unreadable muted text in module cards.
- Wide desktop mode must not change the Pixel 7/mobile layout.
- Wide desktop mode must not introduce horizontal scrolling at common widths:
  - 1440 x 1000
  - 1920 x 1080
  - Pixel 7 mobile project

Accessibility:

- Use real `<button>` controls or a labelled `<select>`; preserve visible focus styles.
- Ensure active color/display mode is conveyed by text and state, not color alone.
- Keep button labels short and stable for Playwright selectors.

## Backend and Data Changes

Update shared and backend appearance types.

Files/functions:

- `src/api/data.ts`
  - Extend `Settings` with:
    - `lightThemeId: string`
    - `colorMode: 'light' | 'dark'` or string normalized to that union
    - `displayMode: 'standard' | 'wide'` or string normalized to that union
  - Extend `settingDefaults`.
  - Add these keys to `publicSettingKeys` only if non-admin home boot needs them through `/api/home`. The app already fetches `/api/appearance`, so they do not need to be public settings unless `/api/home` consumers need them.
  - Extend `Appearance` beyond `Pick<Settings, 'themeId'>`.
  - Add normalizers:
    - `normaliseColorMode(value)`
    - `normaliseDisplayMode(value)`
    - reuse `normaliseThemeId(value)` for `themeId` and `lightThemeId`
  - Update `getSettings()` to normalize the new settings.
  - Update `getAppearance()` to return the full appearance payload.
  - Update `updateAppearance()` to validate the effective `themeId` and `lightThemeId` against the generated theme manifest when a `Request` is available.
  - In `updateAppearance()`, compute effective theme rules:
    - dark mode -> `themeId: 'mono-dark'`
    - light mode -> `themeId: validated lightThemeId || validated themeId || 'base'`
  - Preserve existing unknown/broken theme fallback to `base`.

- `src/shared/api-types.ts`
  - Extend `Settings` and `Appearance` with `lightThemeId`, `colorMode`, and `displayMode`.

- `src/api/router.ts`
  - Keep `GET /api/appearance`.
  - Keep `PUT /api/appearance` behind `requireAdminUnlock`.
  - Continue activity logging for appearance changes, including `colorMode` and `displayMode`.
  - Do not loosen origin checks or admin unlock requirements.

No migration is expected because `settings` is already a key-value table:

- `migrations/0001_initial.sql` created `settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`.
- New appearance keys can be inserted by `updateSettings()` once they exist in `settingDefaults`.

Frontend changes:

- `src/App.tsx`
  - Update `emptySettings`.
  - Update `refreshAll()` and `saveAppearance()` to pass the full `Appearance`.
  - Add a helper to apply display mode to `<html>`, for example `data-display-mode="standard|wide"`.
  - Store display mode in localStorage for no-FOUC layout boot, or extend the existing theme snapshot flow to include the display-mode attribute.
  - Update `AdminPanel` props and controls.
  - Continue using `useTheme()` for theme manifest and `setTheme()`.

- `index.html`
  - Extend the no-FOUC script to apply the last display mode before React mounts, likely from a new localStorage key such as `fp-display-mode`.
  - Keep this defensive; localStorage errors should remain non-fatal.

- `src/theme/ThemeProvider.tsx`
  - No major theme-engine rewrite is required if `themeId` remains the effective active theme.
  - Consider exporting storage key constants if `index.html` and `App.tsx` need a shared name documented in code.

- `src/styles.css`
  - Convert the later compact app-style CSS block to use existing theme tokens where possible instead of fixed light colors.
  - Add `:root[data-display-mode="wide"]` rules for desktop width and grid behavior.
  - Keep existing mobile media queries as the final authority for one-column mobile.

## Files Likely to Change

- `src/api/data.ts`
  - Add appearance settings, normalization, effective theme calculation, and update/get behavior.

- `src/shared/api-types.ts`
  - Update `Settings` and `Appearance` client contracts.

- `src/api/router.ts`
  - Keep route shape, ensure activity metadata includes new non-secret appearance fields.

- `src/App.tsx`
  - Add Admin Appearance controls, update appearance save flow, apply display mode root attribute, and handle dark/light theme switching.

- `src/styles.css`
  - Make compact app-style CSS token-driven enough for dark mode.
  - Add wide display desktop rules for `.app-shell`, `.home-dashboard`, and non-admin `.workspace-grid`.

- `index.html`
  - Apply stored display mode before React mounts.

- `src/theme/applyTheme.test.ts`
  - Add or adjust tests if display-mode application is added to theme helpers. If display mode stays in `App.tsx`, this may not change.

- `src/api/data.test.ts`
  - Add tests for `normaliseColorMode`, `normaliseDisplayMode`, `lightThemeId`, and effective `updateAppearance()` behavior.

- `src/theme/manifest.test.ts`
  - No required change unless theme parsing behavior changes.

- `e2e/home.spec.ts`
  - Add E2E coverage for dark/light switching and wide desktop behavior.

Potentially optional:

- `docs/theming.md`
  - Update only if the implementation changes how themes relate to light/dark mode or documents `mono-dark` as the first dark companion.

Files that should not need changes:

- `migrations/*`
  - Not expected for this feature because `settings` is key-value.
- `functions/api/[[path]].ts`
  - API routing already delegates to `src/api/router.ts`.
- `functions/_middleware.ts`
  - This feature does not change `/pages/*` auth behavior.

## Implementation Plan

1. Add appearance fields and normalizers.
   - Extend backend `Settings` and `Appearance` in `src/api/data.ts`.
   - Extend frontend shared types in `src/shared/api-types.ts`.
   - Add defaults:
     - `themeId: 'base'`
     - `lightThemeId: 'base'`
     - `colorMode: 'light'`
     - `displayMode: 'standard'`
   - Add unit-tested normalizers for color and display modes.

2. Update appearance read/write behavior.
   - Update `getSettings()` and `getAppearance()` to return normalized values.
   - Update `updateAppearance()` to validate theme IDs against `/themes/manifest.json`.
   - Implement effective theme behavior:
     - switching to dark stores/restores `lightThemeId` and applies `mono-dark`;
     - switching to light restores a valid light theme or `base`.
   - Preserve backward compatibility for callers that only send `{ themeId }`.

3. Update frontend state and save flow.
   - Update `emptySettings` in `src/App.tsx`.
   - Update `refreshAll()` to apply both `appearanceData.themeId` and `appearanceData.displayMode`.
   - Update `saveAppearance()` to optimistically apply the effective theme and display mode, save `/api/appearance`, then apply the returned values.
   - Add a tiny helper such as `applyDisplayMode(displayMode)` that sets `document.documentElement.dataset.displayMode`.

4. Extend no-FOUC boot for display mode.
   - Add a localStorage key for display mode, for example `fp-display-mode`.
   - In `index.html`, read that value and set `data-display-mode` before React mounts.
   - In the app save/apply helper, keep the key in sync.

5. Build Admin Appearance controls.
   - In `AdminPanel`, keep the existing theme manifest select.
   - Add a Light/Dark segmented control.
   - Add a Standard/Wide desktop segmented control.
   - Ensure controls call `onAppearanceChange()` with the full current appearance object, not only the changed field.
   - Keep all controls inside Admin because the API requires admin unlock.

6. Make app-style CSS theme-token compatible.
   - Review the later CSS block starting at "Compact app-style front page".
   - Replace hard-coded light-only colors with `var(--color-*)`, `color-mix()`, or derived app variables that are assigned from theme tokens.
   - Ensure `.tab-bar`, `.top-actions`, `.weather-panel`, `.tide-panel`, launchpad cards, network summary, modals, and toasts remain readable in `mono-dark`.
   - Keep intentional weather/tide accents where contrast remains acceptable.

7. Add wide desktop CSS.
   - Add desktop-only rules, for example under `@media (min-width: 821px)`:
     - `:root[data-display-mode="wide"] .app-shell:not(:has(.admin-grid)) { width: min(var(--shell-width), calc(100% - 40px)); }`
     - `:root[data-display-mode="wide"] .home-dashboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }`
     - `:root[data-display-mode="wide"] .workspace-grid:not(.admin-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }`
   - Keep `.module-wide` and `.module-full` spanning full width unless deliberately changed.
   - Keep existing `max-width: 820px` mobile rules overriding wide mode.

8. Update tests.
   - Add `src/api/data.test.ts` coverage for new appearance defaults, normalization, and effective theme behavior.
   - Add or adjust theme tests only if helpers move into `src/theme/*`.
   - Add E2E in `e2e/home.spec.ts` for:
     - switching Light -> Dark -> Light;
     - all default home widgets still visible after each switch;
     - `html[data-theme-id]` and `html[data-display-mode]` update;
     - wide display produces two desktop columns;
     - Pixel 7 remains one column.

9. Run verification.
   - Run `npm test`.
   - Run `npm run build`.
   - For E2E, use full-stack mode:
     - `npm run build`
     - `npm run dev:worker`
     - `E2E_BASE_URL=http://localhost:8788`
     - `TEST_USERNAME=admin`
     - `TEST_PASSWORD=<local test password>`
     - `npm run test:e2e`
   - Do not target production with E2E because tests mutate D1 data.

## Acceptance Criteria

- Admin -> Appearance includes a Light/Dark control and a Standard/Wide desktop control.
- Switching to dark applies the bundled dark theme and keeps all default home widgets readable.
- Switching back to light restores the previously selected light theme, falling back to `base`.
- Existing theme selection continues to work and persists through `/api/appearance`.
- Appearance settings survive reload.
- The no-FOUC boot path applies the last theme snapshot and display mode before React mounts.
- Wide desktop mode uses more horizontal space on desktop and allows a two-column home/workspace grid.
- Standard display keeps the current compact app-style layout.
- Mobile remains single-column in both standard and wide display modes.
- No non-admin route or control can mutate global appearance without the existing admin unlock.
- No D1 migration is added unless implementation discovers a concrete need.
- `npm test` passes.
- `npm run build` passes.
- E2E passes against local `http://localhost:8788` when credentials are supplied.

## Test and Verification Notes

Unit tests:

- Extend `src/api/data.test.ts`:
  - defaults include `lightThemeId`, `colorMode`, and `displayMode`;
  - invalid color mode falls back to `light`;
  - invalid display mode falls back to `standard`;
  - invalid `lightThemeId` falls back to `base`;
  - dark mode resolves to `mono-dark`;
  - light mode restores `lightThemeId`;
  - legacy `{ themeId }` updates still work.
- Keep existing `normaliseThemeId` tests.
- If display-mode application is implemented as a pure helper, add focused tests for root data attribute output.

E2E tests:

- Reuse `e2e/helpers/auth.ts` and existing helpers in `e2e/home.spec.ts`.
- Add an Admin Appearance helper similar to existing `openAdmin(page)`.
- Suggested assertions:
  - after selecting Dark, `page.locator('html')` has `data-theme-id="mono-dark"`;
  - `.home-dashboard .panel` count remains 6 on a fresh local DB;
  - after selecting Light, `data-theme-id` returns to the selected light theme;
  - after selecting Wide desktop in the desktop project, `.home-dashboard` computed `grid-template-columns` contains two tracks;
  - in the Pixel 7 project, `.home-dashboard` computed `grid-template-columns` remains one track;
  - no console errors using `expectNoConsoleErrors`.

Manual visual checks:

- Check desktop at 1440 x 1000.
- Check wider desktop at 1920 x 1080 or 2560 x 1440, because current Playwright projects do not include an extra-wide desktop.
- Check Pixel 7 mobile.
- In each viewport, verify:
  - Home
  - Lists
  - Notes
  - Pages
  - Network
  - Admin settings
  - Admin unlock modal
  - Toasts
  - `/page/:slug` standalone page view

Commands:

```bash
npm test
npm run build
```

Full-stack local verification:

```bash
npm run build
npm run dev:worker
```

E2E environment:

```bash
E2E_BASE_URL=http://localhost:8788
TEST_USERNAME=admin
TEST_PASSWORD=<local test password>
npm run test:e2e
```

## Open Questions

- Should light/dark be a global admin-controlled setting or a per-device preference? This plan assumes global admin-controlled appearance because `/api/appearance` already requires admin unlock.
- Should dark mode eventually support dark variants for every bundled light theme? This plan uses `mono-dark` as the first dark companion to keep scope tight.
- Should `mono-dark` remain visible in the normal theme picker? This should not block implementation. Prefer treating it as the dark-mode target to avoid confusing the Light/Dark toggle.
- Should wide display also change default module sizes? This should not block implementation. Prefer preserving module sizes and letting the existing Admin module size controls handle card footprint.
