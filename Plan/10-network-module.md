# Network Module

## Original Note

If logged in - users should be able to go to network tab and share the network details, and the QR code. Also see usage and all the information.

Users who are logged in are well trusted as they are family/household members.

## Goal

Let any logged-in user view and share the full Network tab — Wi-Fi credentials, QR code, usage, router links, and connected devices — without requiring a separate admin unlock step. Logged-in users are trusted household members.

## Current State

- The Network tab already has a full implementation in `src/features/network/NetworkWorkspace.tsx` (188 lines) with Wi-Fi sharing (SSID, password, QR code via `qrcode` library), usage panel, quick links, and connected devices.
- The `GET /api/network` route (`src/api/router.ts:73-76`) requires `requireAdminUnlock()` — a separate timed re-authentication (15-minute window) that gates access to sensitive network data (passwords, device IPs/MACs).
- The frontend NetworkWorkspace receives `fullNetwork: NetworkOverview | null`. When `null`, it shows an "Admin unlock required" prompt with buttons to unlock or load.
- `loadFullNetwork()` in `useAppController.ts:275-278` calls `GET /api/network` and stores the result in `fullNetwork` state. It is only triggered by user click, not on boot.
- On every `refreshAll()`, `setNetwork(null)` is called (line 203), clearing the full network data.
- Network summary (non-sensitive: wifiName, wifiSecurity, deviceCount, usage) is included in `GET /api/home` response as `home.network` and shown on the NetworkWidget without admin unlock.
- Network data is stored in the `settings` key-value table (keys: `wifiName`, `wifiPassword`, `wifiSecurity`, `routerUrl`, `adminUrl`, `wifiUsagePeriod`, `wifiUsageMonthlyGb`, `wifiUsageUpdatedAt`, `wifiDevicesJson`). No dedicated network table.
- Module definition in `src/api/modules.ts:297-320` defines `network` with `category: 'system'`, `defaultEnabled: true`, `homeWidget.defaultEnabled: false`.

## Proposed Behavior

- Remove the admin unlock gate from the Network tab. Any logged-in user can see all network details immediately.
- When the user navigates to the Network tab, the full `NetworkOverview` loads automatically without requiring a button click or admin unlock.
- The Wi-Fi credentials panel, QR code, usage, router links, and connected devices are all visible by default for any authenticated session.
- The Network home widget continues to show summary data (deployment status, usage, device count) as it does today.
- No changes to auth, session management, or other modules.

## UX Details

- **Network tab (full view)**:
  - On navigation to the Network tab, auto-fetch `GET /api/network` if not already loaded.
  - Show the Wi-Fi sharing panel with SSID, password (plain text), security type, copy buttons, and QR code — no unlock prompt.
  - Show usage panel with monthly GB and period.
  - Show quick links panel with router URL, admin URL, and current app host.
  - Show connected devices panel with full device list (name, type, connection, status, IP, MAC, usage).
  - Remove the "Admin unlock required to view" lockout section and the "Unlock admin to view" / "Load network details" buttons.
  - If network data fails to load (e.g., API error), show a brief error message inline rather than a gate prompt.
- **Network home widget**: No changes. Continues showing deployment status, app host link, and optionally usage/device count in details mode.
- **Responsive**: Existing responsive layout at 820px and 520px breakpoints continues to apply.

## Backend and Data Changes

- **`src/api/router.ts`**: Remove `await requireAdminUnlock(context.request, context.env)` from the `GET /api/network` route (line 74). The route still requires a valid session via `requireSession()` which runs earlier in the router. No other route changes.
- **No schema migration needed.** Network data stays in the `settings` table.
- **No new API endpoints.** The existing `GET /api/network` endpoint remains the same, just without the admin unlock check.
- **No changes to auth, rate limiting, or other security middleware.**

## Files Likely to Change

- `src/api/router.ts`
  - Remove the `requireAdminUnlock` call from the `GET /api/network` route.
- `src/features/network/NetworkWorkspace.tsx`
  - Remove the admin unlock gate UI (the "Admin unlock required" section with unlock/load buttons).
  - Auto-load network data on mount or when the tab becomes active, instead of waiting for a user click.
  - Simplify props: remove `adminUnlocked`, `onUnlockAdmin`, `onLoadFullNetwork` — replace with auto-load pattern.
- `src/features/app-shell/useAppController.ts`
  - Add auto-load of network data when the network tab is first accessed (call `loadFullNetwork()` in response to `activeTab === 'network'` change, or eagerly on boot).
  - Remove `setNetwork(null)` from `refreshAll()` so the loaded data persists across refreshes.
  - Simplify the `network` return key to remove `loadFullNetwork` if no longer needed externally.
- `src/App.tsx`
  - Pass auto-loaded network state to `NetworkWorkspace`. Remove admin-unlock-related props if `NetworkWorkspace` no longer needs them.
- `src/styles.css`
  - Remove `.network-locked` styles if the lockout section is removed.

## Implementation Plan

1. **Remove admin unlock from the API route** (`src/api/router.ts`):
   - Delete the `await requireAdminUnlock(context.request, context.env)` line from the `GET /api/network` handler (line 74).
   - The route remains session-protected via `requireSession()` which runs earlier in the dispatch chain.

2. **Auto-load network data in `useAppController.ts`**:
   - Add a `useEffect` that watches `activeTab` — when it becomes `'network'` and `fullNetwork` is `null`, call `loadFullNetwork()`.
   - Alternatively, load eagerly in `refreshAll()` by replacing `setNetwork(null)` with an actual `GET /api/network` call. The simpler approach: just remove `setNetwork(null)` from `refreshAll()` and let the network tab auto-load on first visit.
   - Remove `loadFullNetwork` from the `network` return key if it's no longer called from the component.

3. **Simplify `NetworkWorkspace.tsx` props**:
   - Remove `adminUnlocked`, `onUnlockAdmin`, `onLoadFullNetwork` props.
   - Add a `useEffect` on mount to call a load function if `fullNetwork` is null (or rely on the parent auto-load).
   - Remove the entire "Admin unlock required" section (lines 125-136 in the current file).
   - Remove the `loadingNetwork` and `loadError` local state and the `handleLoadNetwork` function.
   - Simplify the "locked" branch — when `fullNetwork` is null, show a loading spinner or "Loading..." text instead of an unlock prompt.

4. **Update `App.tsx`**:
   - Remove `adminUnlocked` and `onUnlockAdmin` props passed to `NetworkWorkspace`.
   - Pass a simplified props object matching the updated component signature.

5. **Clean up styles** (`src/styles.css`):
   - Remove `.network-locked` styles if the section is fully removed.
   - Add a minimal loading state style if needed.

6. **Verify**:
   - Run `npm test` to ensure no test regressions.
   - Run `npm run build` to confirm clean compilation.
   - Manually verify: login → navigate to Network tab → credentials, QR, usage, devices all visible without admin unlock.

## Acceptance Criteria

- A logged-in user can navigate to the Network tab and see Wi-Fi credentials, QR code, usage, router links, and connected devices without clicking any unlock or load button.
- The "Admin unlock required to view" section and "Unlock admin to view" / "Load network details" buttons no longer appear.
- The QR code generates and displays for the configured Wi-Fi network.
- Copy SSID and copy password buttons work.
- Usage panel shows monthly GB and period.
- Quick links panel shows router/admin URLs when configured.
- Connected devices panel shows the device list when configured.
- The Network home widget continues to function unchanged.
- `npm test` and `npm run build` pass.
- Auth, session, and rate limiting remain unchanged for all other routes.

## Test and Verification Notes

- **Unit tests**: `npm test` — check `src/api/data.test.ts` for the network summary test (line 396) which verifies non-sensitive fields. This test should still pass. Check `src/api/modules.test.ts` for the network module test (line 27) — should still pass.
- **Build**: `npm run build` — TypeScript type-check + Vite production build.
- **Manual verification**: `npm run build && npm run dev:worker` at `:8788`. Login → Network tab → confirm all panels render without admin unlock.
- **E2E**: Existing E2E tests do not cover the Network tab specifically. No E2E changes required for this iteration.
- **Security note**: The `GET /api/network` route still requires a valid session. Only the admin unlock check is removed. The `/api/home` summary endpoint remains unchanged.

## Open Questions

- **Security trade-off**: Removing admin unlock means any logged-in user (not just the admin) can see Wi-Fi passwords and device IPs/MACs. The original note explicitly states logged-in users are trusted household members, so this is the intended behavior. If finer-grained access control is needed later, it can be added as a separate feature.
- **Network data refresh**: The current plan removes `setNetwork(null)` from `refreshAll()` so loaded data persists. If the user edits network settings in the admin panel, `refreshAll()` should also refresh network data. This is a minor detail — the admin settings save already calls `refreshAdmin()` which could also re-fetch network. Marked as assumption: admin edits to network settings will trigger a re-fetch through the existing `refreshAdmin()` flow.
