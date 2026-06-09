# Site Text and Content Cleanup

## Goal

Reduce explanatory and implementation-oriented text in the authenticated home hub so the Home screen reads like a household dashboard, not a diagnostics page.

The cleanup should:

- Remove or de-emphasise the raw deployment URL shown in the global header.
- Make the Lists home widget label concise (`Starred`, not `Starred first`).
- Remove placeholder-looking symbols such as `? ` from starred list rows.
- Stop showing deployment/runtime details on the Home screen by default while keeping the Network module available from navigation and admin settings.

## Current State

- The app is a React 19 + TypeScript + Vite frontend with Cloudflare Pages Functions and D1. There is no client-side router; `src/App.tsx` owns app state, tab navigation, and most rendering.
- `npm run build` runs `prebuild`, TypeScript, and Vite. CI checks are `npm test` and `npm run build`. E2E tests are Playwright-only and require a live local/staging instance with `E2E_BASE_URL`.
- `src/App.tsx` renders the authenticated shell header around lines 680-705. If `home?.deployment.origin` exists, it shows the full origin as an `.origin-link` in the top action area.
- `src/App.tsx` renders Home widgets by filtering `home.modules` for installed/enabled modules with `homeWidget` enabled, then calling `renderModule(...)`.
- `src/App.tsx` renders the Lists widget around lines 1150-1170:
  - Widget heading is `Starred first` for `widget.mode === 'starred'`.
  - Starred rows use `{starred ? '? ' : ''}{list.name}` even though the full Lists tab uses a star glyph for starred lists.
  - Empty copy is `No active lists` / `Create or update a list to surface it here.`
- `src/App.tsx` renders the Network home widget around lines 1240-1270. It is labelled `Deployment`, displays `home.deployment.host`, status, runtime note, current origin, and a Cloudflare hosting guide link.
- `src/api/modules.ts` defines built-in module metadata. The `network` module is enabled, installed, visible in the nav by default, and has `homeWidget.defaultEnabled: true`.
- `migrations/0001_initial.sql` seeds `module_settings` with `network` enabled. `migrations/0002_modular_hub.sql` adds `options_json`, so existing rows may have `{}` and therefore receive module default home-widget options through `normaliseHomeWidgetState(...)`.
- `src/api/modules.test.ts` currently expects homepage widgets to be enabled by default for `weather`, `tides`, `lists`, `notes`, `pages`, and `network`.
- `e2e/home.spec.ts` currently expects six Home dashboard panels by default and has a mode test that changes Network to `details` and expects `.network-summary-grid`.
- `docs/live-site-visual-audit-2026-06-08.md` independently confirms several related issues:
  - Home dashboard contains literal placeholder-looking `?`/`??` symbols.
  - Large dashboard headings such as `Starred first`, `Pinned & recent`, and deployment host dominate small cards.
  - Deployment/docs links need rechecking if they remain exposed in the deployed app.

## Proposed Behavior

- The global authenticated header should not show the raw current origin by default.
  - Keep `Refresh`, `Admin settings`, and `Logout`.
  - If a host indicator is still useful, use a compact non-primary label such as `Local` or `Cloudflare` only when it helps distinguish environments. Do not show the full URL in the header.
- The Lists home widget should use concise, user-facing copy:
  - Starred mode heading: `Starred`.
  - Active mode heading can remain `Active lists`.
  - Starred rows should use a real star marker or an accessible visual treatment, not `? `.
- The Network module should remain installed/enabled and available through the navigation bar, but its Home widget should not be enabled by default for fresh installs.
- Existing installs should not be surprised by a visible deployment widget after this cleanup if their module settings are still effectively default. Handle existing D1 rows deliberately rather than relying only on a changed registry default.
- The Network page/workspace can continue to show deployment, router, Wi-Fi, QR code, usage, and device details. This cleanup is scoped to Home/header presentation unless a small copy change is needed for consistency.

## UX Details

- Keep Home focused on household content and glanceable information: weather, tides, lists, notes, and pages.
- Avoid labels that describe ranking mechanics unless the user is in admin settings configuring the module.
  - Dashboard copy should say `Starred`.
  - Admin mode label may also become `Starred`, with description text explaining the ranking: `Starred lists first, then recent active lists.`
- Replace the starred list prefix with one of these implementation options:
  - Preferred: visually hidden text plus a visible star marker, for example an inline `<span aria-hidden="true">*</span>` before the list name and a screen-reader-only `Starred:`.
  - Acceptable: a CSS class on the row that adds a small star badge, as long as it is accessible and does not cause layout shift.
- Do not expose raw URLs as decorative or descriptive text in compact cards. URLs are acceptable where the user is explicitly managing pages, links, deployment, or network details.
- If the Network widget remains user-toggleable from Admin settings, its status-mode heading should be less deployment-centric, for example:
  - Kicker: `Network`
  - Heading: `Connection`
  - Row label: `Current app host`
- Preserve responsive behavior and existing visual conventions; this is a text/content cleanup, not a full layout redesign.

## Backend and Data Changes

- No new API routes are needed.
- No schema migration is required unless the implementation chooses to update existing local/production D1 module settings automatically.
- `src/api/modules.ts` should change the `network.homeWidget.defaultEnabled` value from `true` to `false` if the intended default is "Network tab visible, Network home widget hidden."
- Existing D1 rows require a deliberate strategy because `module_settings.options_json` may be `{}` and `normaliseHomeWidgetState(...)` will apply the new default only when `homeWidget.enabled` is absent:
  - If existing rows have no explicit `options.homeWidget.enabled`, changing the registry default to `false` is enough.
  - If production/local rows already store `{"homeWidget":{"enabled":true,...}}`, the widget will remain visible until an admin toggles it off or a migration/data patch updates that option.
- Recommended minimal approach:
  - Change the registry default to `false`.
  - Do not add a migration solely for copy cleanup.
  - Add a note in release/deploy instructions that admins can re-enable or disable the Network home widget in Admin settings.
- If the product owner wants the current production Home screen changed automatically, add a narrowly scoped migration that sets `network` `options_json.homeWidget.enabled` to `false` only when the existing options are empty or do not contain an explicit `homeWidget.enabled`. SQLite JSON function support in Cloudflare D1 should be verified before relying on JSON mutation in SQL; otherwise use an API/admin data patch manually.

## Files Likely to Change

- `src/App.tsx`
  - Remove or replace the header `.origin-link`.
  - Update Lists widget heading and starred row marker.
  - Optionally adjust Network widget copy if the widget remains user-enabled.
- `src/api/modules.ts`
  - Rename the Lists starred mode label/description if admin settings should match the dashboard copy.
  - Set `network.homeWidget.defaultEnabled` to `false` if Network should not appear on Home by default.
- `src/api/modules.test.ts`
  - Update default widget expectations so `network` is either excluded from default-enabled widgets or explicitly expected to have `homeWidget.enabled: false`.
  - Add/adjust assertions for the Lists `starred` mode label if changed.
- `e2e/home.spec.ts`
  - Update the default Home dashboard panel count from 6 to 5 if the Network widget default is disabled.
  - Add an assertion that the default Home screen does not show the deployment host/current origin.
  - Keep or adjust the Network mode test by enabling the Network widget before selecting `details`.
- `src/styles.css`
  - Only needed if the star marker requires a new class or visually-hidden helper class is not already available.
- `docs/live-site-visual-audit-2026-06-08.md` or `docs/site-review.md`
  - Optional follow-up after implementation to mark the related visual audit findings as addressed. Do not rewrite these during the code change unless requested.

## Implementation Plan

1. Inspect the current rendered copy in `src/App.tsx` around the authenticated header, Lists widget, Pages widget, and Network widget. Confirm there are no other raw deployment URL displays on Home besides the header and Network widget.
2. Remove the header origin link from `src/App.tsx`, or replace it with a compact environment label if the implementer decides that environment context is still necessary.
3. Update the Lists home widget in `src/App.tsx`:
   - Change starred-mode heading from `Starred first` to `Starred`.
   - Replace the `? ` starred prefix with an accessible star marker.
   - Keep click behavior that switches to the Lists tab.
4. Update `src/api/modules.ts` Lists mode metadata:
   - Change mode label `Starred first` to `Starred`.
   - Keep the description explicit enough for Admin settings, for example `Starred lists first, then recent active lists.`
5. Decide and implement Network Home default behavior:
   - Set `network.homeWidget.defaultEnabled` to `false` in `src/api/modules.ts`.
   - Keep `network.defaultEnabled: true` and `navigationBar.defaultEnabled: true` so the Network tab remains available.
   - Leave the Network widget render path in `src/App.tsx` available for users who turn it back on.
6. If the Network widget can still be enabled, adjust its dashboard copy in `src/App.tsx` so it reads as a Network card rather than a Deployment card:
   - Use `Network` as the kicker.
   - Use a concise heading such as `Connection` or `Current host`.
   - Keep the origin URL only inside an explicit row such as `Current app host`.
7. Update unit tests in `src/api/modules.test.ts`:
   - Verify `weather`, `tides`, `lists`, `notes`, and `pages` default to home-widget enabled.
   - Verify `network` has a home-widget definition but defaults to `enabled: false`.
   - Verify the `lists` starred mode label if the test surface is useful.
8. Update E2E tests in `e2e/home.spec.ts`:
   - Change the default panel count expectation to 5.
   - Assert the Home dashboard does not contain the current deployment host/origin by default.
   - In the test that changes Network mode to `details`, first turn the Network widget on through Admin settings, then select `details`, then assert `.network-summary-grid` appears.
   - Restore Network widget state in `finally` if the test mutates shared D1 state.
9. Run `npm test`.
10. Run `npm run build`.
11. For visual verification, run the full local app with `npm run build && npm run dev:worker`, then run Playwright E2E against `http://localhost:8788` with `E2E_BASE_URL`, `TEST_USERNAME`, and `TEST_PASSWORD` set. Use local/staging only because E2E mutates D1 data.
12. Capture/inspect Home at desktop and Pixel 7 mobile sizes to verify:
    - No raw origin URL in the header.
    - No Network/Deployment card by default.
    - Lists heading is concise.
    - Starred list marker renders as a star or other intentional accessible marker, not `?`.

## Acceptance Criteria

- The authenticated header no longer displays `home.deployment.origin` as a raw URL.
- A fresh/default Home dashboard shows household widgets only and does not show the deployment/runtime widget by default.
- The Network tab remains visible and functional in normal navigation.
- Admin settings still allow the Network homepage widget to be toggled on/off if the module is installed.
- The Lists home widget says `Starred` in starred mode.
- Starred list rows on Home do not contain `? ` or other placeholder-looking text.
- No API contract or database schema change is required for normal operation.
- `npm test` passes.
- `npm run build` passes.
- Updated E2E tests pass against a local `:8788` instance when credentials are provided.

## Test and Verification Notes

- Unit tests:
  - Run `npm test`.
  - Focus on `src/api/modules.test.ts` for default module and home-widget behavior.
- Build:
  - Run `npm run build`; do not skip this before `dev:worker`.
- E2E:
  - Start full-stack local runtime with:

    ```powershell
    npm run build
    npm run dev:worker
    ```

  - In a separate shell with local test credentials:

    ```powershell
    $env:E2E_BASE_URL='http://localhost:8788'
    $env:TEST_USERNAME='admin'
    $env:TEST_PASSWORD='yourpassword'
    npm run test:e2e
    ```

  - Do not point E2E at production because tests mutate D1 data.
- Manual visual checks:
  - Check Home on desktop `1440x1000` and Pixel 7 mobile dimensions.
  - Check a fresh/default module state and a state where Network home widget has been manually enabled.
  - Confirm header actions still fit on mobile after removing/replacing the origin link.

## Open Questions

- Assumption: The Network module should stay enabled and visible in navigation; only the Home widget should be hidden by default.
- Assumption: Existing installations can tolerate the Network widget remaining visible if an admin explicitly enabled it before this change.
- Question: Should the production D1 state be manually patched to hide the existing Network widget immediately after deployment, or is changing the default plus letting admins toggle it sufficient?
- Question: Should Pages launchpad cards continue showing `page.href` in launchpad mode, or should raw URLs be hidden there too? This note treats Pages management/launchpad URLs as lower priority than the global header and deployment widget.
