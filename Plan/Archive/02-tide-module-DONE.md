# Tide Module

## Original Note

Next 5 tide times should not be showing tides more than -1 from the next tide time.

Also should have a part saying the current tide - could have a scale/timeline type display with a "needle" that sits left or right of the scale/timeline going from low to high tide so users can quickly see the current tide height.

Time until next tide information should be shown on this module.

Displayable information should all be controllable or enable/disable options in the settings of the module.

## Goal

Improve the homepage Tides module so it is focused on the next relevant tide window, shows the current tide state at a glance, and lets admins choose which tide details are visible.

The finished feature should:

- Keep the current location-gated tide behavior and data sources.
- Show the next 5 upcoming tide events, not a broad multi-day list that may include stale or overly distant context.
- Show the current tide state between the surrounding low/high tide events with a simple visual scale and marker.
- Show the time until the next tide.
- Add module settings to enable or disable the new tide display sections independently.

Do not replace the existing module framework or introduce a client-side router. This should stay within the existing React home widget, module settings, shared tide helpers, and Cloudflare Worker API shape.

## Current State

The app is a Cloudflare Pages + D1 app with a React/Vite frontend and hand-rolled Worker API. The frontend is decomposed into feature components under `src/features/`.

Relevant current implementation:

- `src/features/home/widgets/TidesWidget.tsx` renders the tides homepage widget (108 lines).
  - Receives `module`, `tides: TideSummary | null`, `locationConfigured`, `onOpenAdmin` props.
  - Calls `resolveHomeWidgetState(module)` to get `{ definition, mode, enabled }`.
  - Shows a location-not-set state if `locationConfigured` is false.
  - Reads tide events from `tides?.events ?? []`.
  - Calculates `featuredTides` with future events only, then `.slice(0, 2)`.
  - Calculates `tideDays` with `groupTideDays(tideEvents, 5)`.
  - Always shows "Next 2 tides" feature cards.
  - Shows "Next 5 days" grouped timeline only when `widget.mode === 'timeline'`.
  - Does not show current tide progress or time until next tide.
- `src/features/admin/sections/ModulesSection.tsx` renders admin controls for all modules (207 lines).
  - Tides-specific controls at lines 164-191: `Tide source` select and API key input.
  - Options are patched via `onPatchModule(module, { options: { ...module.options, ... } })`.
  - No tide-specific display toggles exist yet.
- `src/features/app-shell/homeWidgets.ts` has `resolveHomeWidgetState(module)` which validates mode against definition modes and falls back to `definition.defaultMode`.
- `src/shared/tide.ts` contains tide data extraction and event derivation (140 lines):
  - `TideEvent` type: `{ id, type: 'high'|'low', time, height, source: 'forecast' }`.
  - `TidePoint` type: `{ time, height }`.
  - `extractTideSeries(raw)` maps Open-Meteo marine points into `TidePoint[]`.
  - `deriveTideEvents(series, referenceTime)` derives high/low events, skips events older than 1 hour before reference time.
  - `numericOrNull(value)` is exported.
  - No helpers for tide window filtering or current tide state calculation.
- `src/api/data.ts` returns marine data from `getMarine(env)` (1072 lines):
  - Reads tide module options from `module_settings.options_json`.
  - Supports `source: 'model'` using Open-Meteo marine data.
  - Supports `source: 'api'` using TidesAtlas, falls back to model data when needed.
  - Returns `{ current: { seaLevel, waveHeight, time }, forecastUntil, events, note }`.
  - `getTidesModuleOptions(env)` reads from D1 and returns `{ source, apiKey }`.
  - `normaliseTideSource(value)` returns `'api'` only if lowercased value is `'api'`, otherwise `'model'`.
- `src/shared/api-types.ts` currently types `TideSummary` as only:
  - `events: Array<{ id; type; time; height }>`
  - `note: string`
  - This type is narrower than the actual `getMarine(...)` runtime response, which already includes `current` and `forecastUntil`.
- `Module['options']` is typed as `Record<string, unknown>` with optional `iconStyle`, `showExtendedForecast`, `navigationBar`, and `homeWidget` fields. No tide-specific typed fields exist.
- `src/shared/format.ts` contains tide formatting helpers (159 lines):
  - `formatTideTime` -- "12:00 PM" style
  - `formatTideEventLabel` -- "High tide" / "Low tide"
  - `formatTideHeight` -- "X.X m" or "Height unavailable"
  - `formatTideDayBadge` -- "Today" / "Tomorrow" / "Day N"
  - `groupTideDays` -- groups events by calendar day
  - `formatDuration(milliseconds)` -- returns `"Xh Ym"` for >= 60 minutes, `"M:SS"` for < 60 minutes. The `Xh Ym` format is adequate for tide countdown; no new helper needed.
- `src/api/modules.ts` defines the hardcoded `tides` module (292 lines):
  - `defaultSize: 'wide'`
  - `homeWidget.defaultMode: 'next'`
  - modes: `next` ("Compact next-two tide overview") and `timeline` ("Next tide events plus a short multi-day timeline")
  - `normaliseModuleOptions(...)` currently normalizes weather-specific options (`iconStyle`, `showExtendedForecast`) but NOT tide-specific display toggles.
- `src/styles.css` has tide widget styles (lines 1956-2217):
  - `.tide-panel`, `.tide-panel .panel-heading`, `.tide-mark`
  - `.tide-section`, `.tide-section-head`, `.tide-section-title`, `.tide-section-subtitle`
  - `.tide-feature-grid`, `.tide-feature-card`, `.tide-feature-badge`, `.tide-feature-time`
  - `.tide-day-list`, `.tide-day-card`, `.tide-day-events`, `.tide-day-event`
  - `.tide-empty-state`, `.tide-source-note`
  - Responsive: `@media (max-width: 820px)` for `.tide-feature-grid` and `.tide-day-events`
- Tests already exist:
  - `src/shared/tide.test.ts` -- 3 tests for tide event detection
  - `src/shared/format.test.ts` -- 3 tests for `formatTideTime` only
  - `src/api/modules.test.ts` -- 8 tests for general module normalisation (1 checks tides homeWidget default)

## Proposed Behavior

### Tide Event Window

Replace the current timeline concept with a stricter "next 5 tide events" list.

Rules:

- Use the current time from `Date.now()` in the frontend.
- Exclude tide events whose parsed `time` is not finite.
- Exclude events older than the most recent tide before the next upcoming tide.
- Show at most 5 events total, starting with the next upcoming tide.
- The first item in this list is the "next tide".
- The list should not include old events just because they are in the same day group.

Interpretation of the original "-1 from the next tide time" note:

- It is acceptable to keep one previous tide event internally only when calculating current tide state.
- Do not render more than one previous event before the next tide in the visible event list.
- The primary visible list should begin at the next upcoming tide and then show the following 4 tide events.

### Current Tide State

Add a current tide section that uses the nearest surrounding tide events:

- `previousTide`: the latest event with `time <= now`.
- `nextTide`: the earliest event with `time > now`.
- If both exist:
  - Determine progress between `previousTide.time` and `nextTide.time`.
  - Clamp progress to `0..1`.
  - If moving from low to high, label as "Rising".
  - If moving from high to low, label as "Falling".
  - Place a marker/needle along a horizontal scale based on progress.
  - Label the left side with the previous tide type and time.
  - Label the right side with the next tide type and time.
  - Show current/estimated height if a reasonable estimate is available.
- If only `nextTide` exists:
  - Show the next tide and time-until-next.
  - Show a neutral "Current tide unavailable" state for the scale.
- If no future tide exists:
  - Show the existing empty state, but make the message specific: "No upcoming tide events available."

Height estimation:

- Prefer using backend-provided current sea level when available: `home.tides.current.seaLevel`.
- If `current.seaLevel` is unavailable but both surrounding events have numeric heights, linearly interpolate between their heights using the progress value.
- Label interpolated values as estimated, for example "Estimated height 2.1 m".
- If neither is available, hide the height line or show "Height unavailable" consistently with `formatTideHeight`.
- This display is informational only; keep the existing "Not for navigation" note.

### Time Until Next Tide

Show a compact time-until-next-tide value near the next tide card and/or current tide state.

Rules:

- Use the first upcoming event as `nextTide`.
- Display a human-readable duration such as:
  - `35m`
  - `2h 10m`
  - `1d 3h`
- Avoid second-by-second countdowns; minute-level precision is enough.
- If the next tide is already due or less than one minute away, show `Due now`.
- The value should update when home data is re-rendered. A live interval is optional, but if added, keep it lightweight and clear it on unmount.

### Admin Display Options

Add independent display toggles for tide sections. Defaults should preserve a useful richer tide widget without surprising existing users.

Recommended options under `module.options` for the `tides` module:

- `showCurrentTide`: boolean, default `true`
- `showTimeUntilNext`: boolean, default `true`
- `showNextTides`: boolean, default `true`
- `nextTideCount`: number, default `5`, valid range `1..5`
- `showTideSourceNote`: boolean, default `true`

Keep existing options:

- `source`
- `apiKey`
- `homeWidget`

Use normal module PATCH behavior through `/api/modules`; no new settings table or migration is required because `module_settings.options_json` already stores per-module options.

## UX Details

### Home Widget Layout

Keep the Tides widget visually consistent with the current `.tide-panel` style.

Suggested section order:

1. Header
   - Kicker: `Tides - Predicted`
   - Heading: `Local tides`
   - Summary should reflect enabled sections. Example: `Current tide, next tide, and the next 5 events.`
2. Current tide section, if `showCurrentTide !== false`
   - Section title: `Current tide`
   - Status label: `Rising` or `Falling` when known.
   - Horizontal scale with marker/needle.
   - Left endpoint: previous tide label/time.
   - Right endpoint: next tide label/time.
   - Optional height line.
3. Next tide/time-until section, if `showTimeUntilNext !== false`
   - If the full next-tide card is visible, show time-until inside the first card.
   - If next-tide cards are hidden, still show a compact "Next tide in ..." row.
4. Next tide events section, if `showNextTides !== false`
   - Title: `Next 5 tides` or `Next N tides` based on `nextTideCount`.
   - Render events as compact cards/rows using existing high/low color treatment.
   - First event should be visually marked as `Next up`; following events can use `Then`.
5. Source note, if `showTideSourceNote !== false`
   - Preserve `home.tides?.note`.
   - Preserve `Source: configured tide data`.

Responsive behavior:

- Maintain support for `small`, `medium`, `wide`, and `full` module sizes.
- On narrow/mobile layouts, stack the current tide scale labels and event cards so text does not overlap.
- Do not create nested cards. Use one panel with internal sections, matching existing widget structure.
- Keep all text within its container; long source notes should wrap.

### Admin UX

In the existing Tides module row in `ModulesSection.tsx`:

- Keep the current `Tide source` select.
- Keep the API key input behavior for API mode.
- Add compact controls for display options:
  - Current tide: `Show` / `Hidden`
  - Time until next tide: `Show` / `Hidden`
  - Next tides list: `Show` / `Hidden`
  - Number of next tides: select `1` to `5`; disable or hide if next tides list is hidden.
  - Source note: `Show` / `Hidden`

Use the same `.compact-field` and `<select>` pattern already used for weather options and module size. Avoid adding a new admin component unless the row becomes too hard to read.

## Backend/Data Changes

No migration should be needed.

Expected backend/type updates:

- Update `src/shared/api-types.ts` so `TideSummary` matches the runtime `getMarine(...)` response:
  - Add optional `current` with `{ seaLevel: number | null; waveHeight: number | null; time: string | null }`.
  - Add optional `forecastUntil: string | null`.
  - Keep `events` and `note`.
- Update `src/api/modules.ts` `normaliseModuleOptions(...)` for `definition.id === 'tides'`:
  - Normalize `source` to `model` or `api`.
  - Preserve `apiKey` as a string.
  - Normalize display booleans with the defaults listed above.
  - Normalize `nextTideCount` to an integer from `1..5`, defaulting to `5`.
- Add shared helper functions in `src/shared/tide.ts` for pure tide display calculations:
  - `getTideWindow(events, now, count)` -- returns the next `count` upcoming events.
  - `getCurrentTideState(events, now, currentSeaLevel?)` -- returns previous/next events, progress, direction, and height estimate.
  - Keep these pure and unit-tested.

Do not add a new API endpoint. The existing `/api/home` response and `/api/tides` or `/api/marine` GET behavior are enough.

## Exact Files Likely To Change

Core implementation:

- `src/features/home/widgets/TidesWidget.tsx`
  - Rewrite to use new tide window helper, current tide scale, countdown, and display toggles.
- `src/features/admin/sections/ModulesSection.tsx`
  - Add compact select controls for tide display options in the `module.id === 'tides'` branch (lines 164-191).
- `src/shared/api-types.ts`
  - Expand `TideSummary` to include `current` and `forecastUntil`.
- `src/shared/tide.ts`
  - Add pure helpers: `getTideWindow`, `getCurrentTideState`.
- `src/shared/format.ts`
  - Adapt `formatDuration` usage for tide countdown, or add `formatTideCountdown` if `formatDuration`'s `M:SS` sub-hour format is undesirable for tides.
- `src/api/modules.ts`
  - Add tide-specific normalisation in `normaliseModuleOptions(...)`.
- `src/styles.css`
  - Add styles for current tide scale/needle, tide countdown, and next tide event list.
  - Adjust existing tide card/list styles if switching from day groups to event list.

Tests:

- `src/shared/tide.test.ts`
  - Add helper tests for `getTideWindow`, `getCurrentTideState`, progress clamping, and height interpolation.
- `src/shared/format.test.ts`
  - Add tests for tide duration formatting if a new helper is added.
- `src/api/modules.test.ts`
  - Add tests for tide option defaults and invalid option normalization.

Possibly unchanged:

- `src/api/router.ts`
- `src/api/data.ts`
- `functions/api/[[path]].ts`
- `migrations/*`

## Implementation Plan

1. Add shared tide display helpers.
   - In `src/shared/tide.ts`, implement `getTideWindow(events, now, count)` to filter and return the next `count` upcoming events.
   - Implement `getCurrentTideState(events, now, currentSeaLevel?)` to find previous/next events, compute progress (0..1), determine direction (rising/falling), and interpolate height.
   - Keep existing `deriveTideEvents(...)` behavior intact.
   - Unit-test edge cases before wiring into UI.

2. Add duration formatting if needed.
   - Check if existing `formatDuration(milliseconds)` in `src/shared/format.ts` is acceptable (returns `"Xh Ym"` for >= 60 min).
   - If the `M:SS` sub-hour format is undesirable for tides, add a `formatTideCountdown` variant that returns `"35m"` style for sub-hour.
   - Unit-test boundary cases: due now, minutes only, hours/minutes, days/hours.

3. Expand shared API types.
   - Update `TideSummary` in `src/shared/api-types.ts` to include optional `current` and `forecastUntil` fields matching the runtime `getMarine(...)` response.

4. Normalize tide options in the backend module registry.
   - Update `normaliseModuleOptions(...)` in `src/api/modules.ts` for `definition.id === 'tides'`.
   - Normalize `source` to `model` or `api`.
   - Preserve `apiKey` as a string.
   - Add defaults for all new display booleans (`showCurrentTide`, `showTimeUntilNext`, `showNextTides`, `showTideSourceNote`) defaulting to `true`.
   - Normalize `nextTideCount` to an integer clamped to `1..5`, defaulting to `5`.
   - Add module normalization tests.

5. Update the Tides home widget.
   - Replace `featuredTides = ...slice(0, 2)` and `groupTideDays(tideEvents, 5)` usage with `getTideWindow(...)` and `getCurrentTideState(...)`.
   - Render current tide scale when `showCurrentTide !== false` and data is available.
   - Render next tide countdown when `showTimeUntilNext !== false`.
   - Render the next `nextTideCount` upcoming tide events when `showNextTides !== false`.
   - Render source note when `showTideSourceNote !== false`.
   - Keep the location-not-set state.

6. Update Admin module controls.
   - Add compact select controls in the `module.id === 'tides'` branch of `ModulesSection.tsx`.
   - Patch nested options with `{ ...module.options, optionName: value }`, following the existing weather/tide source pattern.
   - Ensure changing one display setting does not drop `source`, `apiKey`, or `homeWidget`.

7. Add styles.
   - Add `.tide-current-*` styles for the current tide scale/needle in `src/styles.css`.
   - Add `.tide-countdown-*` styles for the time-until-next display.
   - Adjust existing `.tide-feature-grid` / `.tide-feature-card` if switching from 2-card to N-card layout.
   - Reuse theme variables such as `--app-card`, `--color-accent`, `--color-accent-2`, `--color-line`, and `--color-muted`.
   - Add responsive behavior in the existing media-query area if needed.

8. Verify with unit tests and build.
   - Run `npm test`.
   - Run `npm run build`.

9. Verify full-stack UI where practical.
   - For UI verification, run `npm run build && npm run dev:worker` and open `http://localhost:8788`.
   - Use E2E only against local `:8788`, with:
     - `E2E_BASE_URL=http://localhost:8788`
     - `TEST_USERNAME=admin`
     - `TEST_PASSWORD=<local test password>`
   - Do not run E2E against production.

## Acceptance Criteria

- The Tides homepage widget no longer renders the grouped "Next 5 days" timeline.
- The visible tide event list starts at the next upcoming tide and shows no more than the configured count, with a maximum of 5.
- The widget does not show stale tide events before the next tide, except as endpoint context inside the current tide scale.
- The current tide section shows a clear low-to-high or high-to-low scale when both surrounding tide events are available.
- The scale marker is clamped within the visible scale and does not overflow.
- The current tide status reads `Rising`, `Falling`, or a clear unavailable state.
- The next tide time-until value is visible when enabled and handles due/near-due times cleanly.
- Admin users can independently show/hide:
  - Current tide
  - Time until next tide
  - Next tide list
  - Source note
- Admin users can choose how many upcoming tide events to show, from 1 to 5.
- Tide display options persist through `/api/modules` and survive reloads.
- Invalid or missing tide options normalize to safe defaults.
- Existing Tide source/API key behavior still works.
- Existing location-not-configured behavior still works.
- Existing weather, lists, notes, pages, network, and settings widgets are not regressed.
- `npm test` passes.
- `npm run build` passes.

## Test and Verification Notes

Unit tests to add or update:

- `src/shared/tide.test.ts`
  - `getTideWindow` excludes invalid times and past events.
  - `getTideWindow` returns exactly the next N when more are available.
  - `getCurrentTideState` finds previous and next events correctly.
  - `getCurrentTideState` returns rising from low to high and falling from high to low.
  - Progress clamps to `0` and `1`.
  - Height uses current sea level when provided and interpolation when current sea level is absent.
- `src/shared/format.test.ts`
  - Tide countdown formatting for due now, minutes, hours, and days (if new helper added).
- `src/api/modules.test.ts`
  - Tides module defaults include all display options.
  - Invalid tide `source` falls back to `model`.
  - Invalid `nextTideCount` falls back to `5` or clamps to `1..5`.
  - Existing `apiKey` is preserved as a string.

Manual verification:

- With no configured location, the Tides widget still asks for latitude, longitude, and timezone.
- With a configured local location, the widget shows current tide state, next tide countdown, and next tide events.
- Toggle each Tides display option in Admin settings and confirm the widget updates after the module patch.
- Switch Tide source from built-in estimate to API and back; confirm source settings are preserved and no API key appears in cache keys.
- Check desktop and Pixel 7/mobile widths for text overlap and marker overflow.

Commands:

```bash
npm test
npm run build
```

Full-stack local verification, if UI or API behavior is touched:

```bash
npm run build
npm run dev:worker
```

Then open `http://localhost:8788`.

E2E, if credentials are available:

```bash
$env:E2E_BASE_URL = "http://localhost:8788"
$env:TEST_USERNAME = "admin"
$env:TEST_PASSWORD = "<local password>"
npm run test:e2e
```

## Open Questions

- Should the `next` and `timeline` homepage modes remain after this change, or should `timeline` be repurposed to mean "show current tide plus next 5 events"? This should not block implementation; keep both modes for compatibility unless product direction says otherwise.
- Should time-until-next update live every minute without a full home data refresh? This should not block implementation; a static value at render time is acceptable for the first pass.
- Should the app expose exact current sea level from API sources that do not provide it? This should not block implementation; show unavailable/interpolated height where possible and keep the "Not for navigation" note.

## Implementation Completed

- Work done: Added `getTideWindow` and `getCurrentTideState` helpers to `src/shared/tide.ts`. Expanded `TideSummary` with `current` and `forecastUntil` fields. Added 5 tide display settings (`showCurrentTide`, `showTimeUntilNext`, `showNextTides`, `showTideSourceNote`, `nextTideCount`) with generic normalization in `src/api/modules.ts`. Rewrote `TidesWidget.tsx` with current tide scale/needle, countdown, N-event list, and display toggles. Added admin controls via generic `SettingControl`. Added `.tide-current-*` and `.tide-countdown-*` CSS. Added `formatTideCountdown` helper.
- Implementation result: All acceptance criteria met. Tide event window starts at next upcoming tide, current tide scale shows rising/falling with progress needle, countdown shows due now/minutes/hours/days, admin can toggle all sections independently, existing behavior preserved.
- Setup and verification: `npm test` and `npm run build` pass. 14 tide helper tests, 4 countdown tests, 11 module normalization tests all pass.
- Remaining notes: None.
