# Settings

## Original Note

Accessible via setting icon on navbar.

Here users can access there personal settings such as theme changing, display size, other useful settings.

## Goal

Provide a user-facing settings panel accessible from the top navigation bar that lets any authenticated user personalise their experience — primarily theme switching and display density — without requiring admin unlock.

## Current State

- Theme switching exists but is **admin-only** (via `AppearanceSection` inside `AdminPanel`, writes to D1 `settings.themeId`).
- The "Admin" button in `TopNavigation.tsx:61` has class `icon-cog` but renders as plain text — no gear icon, no dedicated settings entry.
- The `settings` module in `navigation.ts:30` targets `{ kind: 'admin' }` and is disabled by default.
- `ThemeProvider` already caches theme to localStorage (`fp-theme-id`, `fp-theme-snapshot`) and reads from it on boot, but `refreshAll()` overwrites it with the server's `themeId`.
- No per-user preferences storage exists (no `user_preferences` table, no client-side prefs beyond theme snapshot).
- No display density or font-size preference mechanism exists.

## Proposed Behavior

### User Settings Modal
- A gear icon button in the top navigation bar (next to Refresh/Admin) opens a **settings modal** — no admin unlock required.
- Modal uses existing `modal-backdrop` / `modal-panel` CSS pattern (same as `AdminUnlockModal`).
- Two sections: **Theme** and **Display**.

### Theme Switching
- Dropdown lists available themes from the manifest (fetched via `ThemeProvider`).
- Selecting a theme applies it immediately via `setTheme()` and persists to localStorage.
- A `userThemeOverride` localStorage key (`fp-user-theme`) lets the user's choice survive `refreshAll()` server-theme fetches.
- On boot, `useAppController` checks `fp-user-theme` and applies it if present, ignoring the server theme.

### Display Density
- Three density options: Comfortable (default), Compact, Spacious.
- Stored in localStorage key `fp-density`.
- Applied as `data-density` attribute on `<html>` (the theme system already supports this).
- CSS rules already exist for `[data-density="compact"]` and `[data-density="spacious"]` via theme tokens.

### UX Details
- Settings button: gear emoji `⚙️` with `aria-label="Settings"` in the top-actions bar.
- Modal header: "Settings" with a Close button.
- Theme section: select dropdown with theme name + version info.
- Density section: segmented control (three buttons).
- Changes apply instantly — no save button needed.
- Modal closes on backdrop click or Close button.

## Backend or Data Changes

None. All preferences are client-side localStorage. The existing theme system already handles server→client sync; the `fp-user-theme` override simply takes precedence.

## Acceptance Criteria

1. Gear icon visible in top navigation for all authenticated users. ✅
2. Clicking gear opens settings modal (no admin unlock needed). ✅
3. Theme dropdown lists all available themes; selecting one applies it immediately. ✅
4. Theme choice persists across page reloads (localStorage). ✅
5. `refreshAll()` does not overwrite user's theme choice. ✅
6. Density selector changes layout spacing in real time. ✅
7. Density choice persists across page reloads. ✅
8. Existing 139 unit tests still pass. ✅
9. No regressions in admin panel appearance section. ✅

## Test and Verification Notes

- `npm test` — all existing tests must pass.
- Manual: open settings modal, switch theme, reload — theme persists.
- Manual: switch density, verify spacing changes across views.
- Manual: admin panel appearance section still works independently.
- Manual: logout/login — theme and density preferences persist (localStorage is per-origin, not per-session).

## Open Questions

None — plan is implementation-ready.

## Implementation Summary

**Files created:**
- `src/features/app-shell/SettingsPanel.tsx` — modal with theme dropdown + density segmented control

**Files modified:**
- `src/features/app-shell/TopNavigation.tsx` — added gear `⚙️` button + `onOpenSettings` prop
- `src/features/app-shell/AppShellLayout.tsx` — imports SettingsPanel, passes `settingsOpen`/`onCloseSettings` props
- `src/features/app-shell/useAppController.ts` — `settingsOpen` state, user theme override in `refreshAll()`, density restore on boot
- `src/App.tsx` — wires `settingsOpen`/`setSettingsOpen` through to AppShellLayout
- `src/styles.css` — `.icon-settings`, `.density-fieldset`, `.density-btn` styles
- `Plan/11-settings.md` — this file
