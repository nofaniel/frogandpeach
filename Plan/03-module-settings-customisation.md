# Module Settings and Customisation

## Goal

Make built-in modules much more configurable from Admin settings, with clear explanations and lightweight previews so an admin can understand what each option changes before saving it.

The first implementation should improve the existing module settings surface rather than replace the module system. It should add a typed, reusable settings schema for modules, render those settings in the current Admin panel, persist values through the existing `module_settings.options_json` field, and make the home dashboard reflect those settings.

This is a configuration UX/data-model enhancement only. It should not add third-party plugin loading, custom JavaScript themes, or a new client-side router.

## Current State

The app is a Cloudflare Pages + D1 app with a React 19 + TypeScript + Vite frontend and a Cloudflare Workers backend.

Relevant current architecture:

- `src/App.tsx` owns all app state, tab navigation, dashboard rendering, and the Admin settings UI. There is no client-side router.
- `src/api/router.ts` exposes `GET /api/modules` and `PATCH /api/modules`. Both require a session, and module reads/writes require admin unlock via `requireAdminUnlock`.
- `src/api/modules.ts` contains the hard-coded module registry. Adding or changing module behavior is currently a code change here.
- `src/api/data.ts` consumes some module options directly, currently for tides API settings through `getTidesModuleOptions`.
- `src/shared/api-types.ts` defines the client-facing `Module` type.
- `module_settings` is the D1 table for module instance state. `migrations/0002_modular_hub.sql` added `installed`, `size`, `options_json`, and `updated_at`.
- `src/api/modules.ts` already normalises `options_json` through `normaliseModuleOptions`.
- `src/App.tsx` already has `patchModule` and `batchPatchModules`, which call `PATCH /api/modules`, then refresh admin and dashboard state.
- `renderModule` in `src/App.tsx` renders each home widget and already reads `module.size`, `module.options.homeWidget`, `module.options.iconStyle`, and `module.options.showExtendedForecast`.

Current Admin module controls:

- Install/uninstall, including optional data deletion.
- Enable/disable module visibility.
- Reorder modules with drag handle and up/down buttons.
- Set dashboard card size: `small`, `medium`, `wide`, `full`.
- Toggle homepage widget separately from the module tab.
- Select homepage widget mode for modules that define `homeWidget`.
- Weather-only controls: icon style and 5-day forecast.
- Tides-only controls: source and API key.

Current limitations:

- Module-specific settings are hard-coded inline in `AdminPanel` in `src/App.tsx`.
- There is no reusable schema describing setting controls, labels, help text, defaults, validation, or preview behavior.
- Existing size labels such as `wide` and `full` do not explain their layout effect.
- The UI gives little feedback about which setting affects the dashboard card, full module tab, API behavior, or stored private data.
- `src/shared/api-types.ts` exposes `options` as a loose `Record<string, unknown>` with only a few optional known fields.
- Tests cover normalization and some E2E widget behavior, but not a generalized settings schema or preview/help behavior.

## Proposed Behavior

Admins should be able to open Admin settings, find a module row, expand or view its settings, and see:

- Core module controls: installed, enabled, homepage widget enabled, dashboard size, order.
- Module-specific controls generated from a typed settings schema.
- Short descriptions for each control.
- Option-level preview/help text explaining visible impact, especially for layout and mode choices.
- A compact preview of the dashboard card where practical, or a textual preview summary where a full live preview would be too expensive.
- Safe persistence through the existing `PATCH /api/modules` endpoint and `options_json` column.

The first pass should use a data-driven schema for controls but may keep the actual dashboard rendering inside `renderModule`. The schema should prevent adding more one-off JSX branches inside the module row for every new setting.

Do not require a migration unless a new setting cannot reasonably fit inside `options_json`. The expected approach is to keep all module customization values in `module_settings.options_json`.

## UX Details

### Admin Module Row

Keep the existing module list in `AdminPanel`, but make each row easier to understand:

- Keep install, enable, widget toggle, size, mode, and order controls visible or readily accessible.
- Add a "Settings" or expandable details area per installed module for granular controls.
- Disabled/uninstalled modules should still show their summary and status, but module-specific settings should be hidden or disabled until installed.
- Preserve the existing `.module-config-row`, `.module-controls`, `.module-actions`, and `.module-options` styling conventions where possible.
- Avoid page-level navigation changes. This remains inside the current Admin settings view.

### Layout Size Help

Dashboard size should explain the grid effect:

- `small`: compact card, intended for quick status.
- `medium`: default card footprint.
- `wide`: spans more horizontal space on desktop.
- `full`: spans the full dashboard width.

The Admin UI should show this as helper text and/or a mini grid preview. The original note specifically called out that "wide" versus "full" is unclear; this should be directly addressed.

### Module Mode Help

Homepage mode dropdowns should show the selected mode description from the module registry. The data already exists in `homeWidget.modes[].description`; the UI should display the selected mode's description, not just the generic `homeWidget.description`.

Examples:

- Notes `small`: three pinned or recent notes.
- Notes `large`: six notes with snippets and tags.
- Network `status`: deployment, router, and admin links.
- Network `details`: status plus usage and device summary.

### Preview Strategy

Implement a lightweight preview, scoped to Admin settings:

- For dashboard size, show a small static grid diagram or labelled footprint preview for `small`, `medium`, `wide`, and `full`.
- For homepage widget enabled/disabled, show text such as "Appears on Home" or "Hidden from Home; tab remains available when module is enabled."
- For homepage mode, show selected mode description from `homeWidget.modes`.
- For module-specific controls, show control-specific helper text from the schema.

A full live duplicate of `renderModule` is not required for the first implementation. If a coding agent chooses to add a richer preview, it should reuse existing rendering helpers where possible and must avoid duplicating API fetches or mutating dashboard state before the admin saves.

## Backend and Data Changes

### Keep Existing Persistence

Use the existing `module_settings.options_json` field for granular module options.

No new table is expected for the initial implementation.

### Add a Typed Settings Schema

Extend `src/api/modules.ts` so each `ModuleDefinition` can declare reusable settings metadata, for example:

```ts
type ModuleSettingDefinition =
  | {
      key: string
      type: 'select'
      label: string
      description: string
      defaultValue: string
      options: Array<{ value: string; label: string; description?: string }>
    }
  | {
      key: string
      type: 'boolean'
      label: string
      description: string
      defaultValue: boolean
    }
  | {
      key: string
      type: 'text'
      label: string
      description: string
      defaultValue: string
      secret?: boolean
      placeholder?: string
    }
```

Exact naming can differ, but the schema should support:

- Select controls.
- Boolean/toggle controls.
- Text controls.
- Secret text controls for values like API keys.
- Labels and descriptions.
- Per-option descriptions where helpful.
- Default values.
- Optional grouping if needed, such as `display`, `data`, `advanced`.

Expose this schema in the API response as part of each module object, or expose a normalized subset that the frontend can render safely. Update `src/shared/api-types.ts` to match.

### Normalization and Validation

Update `normaliseModuleOptions` in `src/api/modules.ts` to normalize schema-defined options.

Rules:

- Unknown module IDs remain ignored by `updateModules`.
- Unknown option keys may be preserved if this is needed for forward compatibility, but schema-owned keys must be normalized.
- Invalid select values fall back to the setting default.
- Boolean settings fall back to defaults unless the stored value is actually boolean.
- Text settings normalize to strings.
- Secret settings must not be logged in plain text in activity metadata if included in the PATCH body.
- Existing special cases should continue to work:
  - Weather `iconStyle`: default `emoji`, valid `emoji` or `icons`.
  - Weather `showExtendedForecast`: default `false`.
  - Tides `source`: default `model`, valid `model` or `api`.
  - Tides `apiKey`: string.
  - `homeWidget`: default from each module's `homeWidget` definition.

### Activity Logging

`src/api/router.ts` currently records the raw module patch in activity metadata. If the settings schema includes secret fields such as `apiKey`, update module activity logging to redact secret values before calling `recordActivity`.

Acceptance behavior:

- Activity summary can still say `Updated module tides`.
- Metadata should include non-secret settings.
- Metadata should omit or replace secret values with a marker such as `[redacted]`.

## Exact Files Likely To Change

Expected implementation files:

- `src/api/modules.ts`
  - Add module setting schema types.
  - Add `settings` or `settingDefinitions` to `ModuleDefinition`.
  - Move current hard-coded weather/tides option rules into schema-backed normalization.
  - Add helpers to normalize schema-defined options and redact secret option values.

- `src/shared/api-types.ts`
  - Add shared types for module setting definitions.
  - Extend `Module` to include the setting schema returned by the API.
  - Tighten known `options` fields where practical without overfitting.

- `src/api/router.ts`
  - Redact secret module option values before activity logging.
  - Keep `PATCH /api/modules` route shape unchanged.

- `src/App.tsx`
  - Replace hard-coded module-specific controls in `AdminPanel` with a reusable settings renderer.
  - Keep `patchModule` and `batchPatchModules`.
  - Add selected-mode descriptions and layout size preview/help.
  - Ensure text/secret controls save predictably, either on blur or explicit save. Prefer not to PATCH on every keypress for secret/API-key fields.

- `src/styles.css`
  - Add styles for expanded module settings, helper text, setting groups, and mini layout previews.
  - Keep responsive behavior aligned with existing admin grid and module row styles.

- `src/api/modules.test.ts`
  - Add normalization tests for schema-defined select, boolean, text, and secret settings.
  - Preserve existing tests for home widget defaults, invalid modes, weather icon style, and invalid sizes.

- `src/api/router.test.ts` or a new focused API test file
  - Add coverage for redacting secret option fields in activity metadata if practical with the existing test harness.

- `e2e/home.spec.ts`
  - Add or update Playwright coverage for the Admin module settings UI and dashboard impact.

Optional documentation files:

- `docs/modular-hub-upgrade-plan.md` only if the implementation changes the documented module architecture.
- `README.md` only if user-facing setup or dev commands change. This is not expected.

Files that should not need changes for this feature:

- `migrations/*`, unless a decision is made to store schemas or option values outside `options_json`.
- `functions/api/[[path]].ts`, because API routing already delegates to `src/api/router.ts`.
- `functions/_middleware.ts`, because this feature does not change `/pages/*` auth behavior.
- `src/theme/*` and `themes/*`, unless styling tokens are needed for the preview UI.

## Implementation Plan

1. Model the module setting schema.
   - Add schema types in `src/api/modules.ts`.
   - Add a `settings` field to `ModuleDefinition`.
   - Define settings for existing hard-coded controls:
     - Weather: `iconStyle`, `showExtendedForecast`.
     - Tides: `source`, `apiKey`.
   - Keep `homeWidget` as its own existing concept rather than forcing it into the first schema pass.

2. Normalize options through the schema.
   - Update `normaliseModuleOptions` to apply defaults and validation from setting definitions.
   - Preserve existing `homeWidget` normalization.
   - Preserve unrelated options only if they are not schema-owned and this matches current behavior.
   - Add redaction metadata support for secret settings.

3. Update shared API types.
   - Add `ModuleSettingDefinition` and related option types to `src/shared/api-types.ts`.
   - Extend `Module` so the frontend can render settings without knowing module IDs.

4. Redact secret settings in activity logs.
   - Add a helper in `src/api/modules.ts`, for example `redactModulePatchForActivity`.
   - Use it in `src/api/router.ts` before `recordActivity` for module updates.
   - Ensure `apiKey` or future secret fields are not written in plaintext activity metadata.

5. Build the frontend settings renderer.
   - In `src/App.tsx`, add a small reusable renderer inside or near `AdminPanel`.
   - Render select, boolean, text, and secret controls from `module.settings`.
   - Generate `onPatchModule(module, { options: { ...module.options, [key]: nextValue } })`.
   - For text/secret fields, use local draft state or blur/submit behavior to avoid PATCHing on every keystroke.
   - Remove or reduce weather/tides one-off JSX once the schema covers those controls.

6. Improve explanations and previews.
   - Add a size preview/helper component for `small`, `medium`, `wide`, `full`.
   - Show selected homepage mode description from `module.homeWidget.modes`.
   - Show schema setting descriptions under or beside each control.
   - Show secret fields in a way that does not leak stored values more than the current Admin unlock context allows. At minimum, keep them inside Admin settings and avoid activity log leakage.

7. Style the module settings UI.
   - Add CSS for setting rows, groups, descriptions, and the layout preview in `src/styles.css`.
   - Verify mobile behavior because Playwright has a Pixel 7 project.
   - Avoid nesting full card components inside module rows; use compact fields and inline preview blocks consistent with existing Admin UI.

8. Update tests.
   - Extend `src/api/modules.test.ts` for schema defaults, invalid values, boolean normalization, text normalization, and preservation/removal of unknown settings.
   - Add test coverage for redaction if the helper is exported or route logging is testable.
   - Update `e2e/home.spec.ts` to interact with the new generalized controls while preserving existing dashboard behavior assertions.

9. Run verification.
   - Run `npm test`.
   - Run `npm run build`.
   - For full-stack visual/behavior checks, run `npm run build && npm run dev:worker`, then Playwright E2E with:
     - `E2E_BASE_URL=http://localhost:8788`
     - `TEST_USERNAME=admin`
     - `TEST_PASSWORD=<local test password>`
   - Do not target production for E2E because tests mutate D1 data.

## Acceptance Criteria

- Admin users can configure module-specific settings from the module row without adding new hard-coded branches for every setting.
- Weather icon style and extended forecast still work after being moved to schema-rendered controls.
- Tides source and API key still work after being moved to schema-rendered controls.
- Existing module install, uninstall, enable, disable, widget toggle, size, reorder, and homepage mode behavior is preserved.
- Dashboard size choices include clear help or preview explaining `small`, `medium`, `wide`, and `full`.
- Homepage mode selection displays the selected mode's specific description.
- Invalid module option values from `options_json` normalize to safe defaults.
- Secret settings such as tide API keys are not written to activity metadata in plaintext.
- `GET /api/modules` returns enough setting metadata for the frontend to render controls.
- `PATCH /api/modules` request shape remains backward compatible.
- No database migration is added unless the implementation explicitly justifies it.
- `npm test` passes.
- `npm run build` passes.
- E2E coverage for homepage module settings is updated and passes against local `:8788` when credentials are supplied.

## Test and Verification Notes

Unit tests:

- Use `src/api/modules.test.ts` for schema and normalization behavior.
- Keep existing tests for:
  - Default module registry state.
  - Home widget defaults.
  - Uninstalled modules forcing `enabled: false`.
  - Invalid home widget mode fallback.
  - Weather `iconStyle` fallback.
  - Invalid module size fallback.
- Add tests for:
  - Select setting defaults and invalid value fallback.
  - Boolean setting defaults and invalid value fallback.
  - Text setting normalization.
  - Secret setting redaction helper.
  - Schema metadata presence on returned modules.

Frontend/E2E tests:

- `e2e/home.spec.ts` already opens Admin settings, unlocks admin, changes widget enabled state, changes widget modes, and verifies dashboard impact.
- Update helper selectors if the generalized renderer changes labels or DOM structure.
- Add coverage that the layout size helper/preview appears when changing size.
- Add coverage that a selected homepage mode description is visible.
- Keep assertions that changing Notes mode to `large` shows more notes and Network mode to `details` shows `.network-summary-grid`.

Manual verification:

- Start full-stack mode, not Vite-only mode, because this feature uses `/api/modules` and D1:

```bash
npm run build
npm run dev:worker
```

- Open `http://localhost:8788`.
- Sign in and unlock Admin.
- Change Weather icon style and confirm dashboard metrics switch between emoji and line icons.
- Enable Weather 5-day forecast and confirm the forecast appears below the weather card.
- Change Notes homepage mode and confirm the home widget density changes.
- Change Network homepage mode and confirm the details summary appears/disappears.
- Change size between `wide` and `full` and confirm the helper explains the difference and dashboard layout changes.
- Change Tide source to API and verify the API key control appears.
- Inspect activity log for module update entries and confirm secret values are redacted.

## Open Questions

- Should secret text controls display the current stored value, a masked placeholder, or only "configured/not configured"? This should not block implementation. Prefer "configured/not configured" plus a replace field for better safety.
- Should module settings be expanded inline by default, or hidden behind a per-row "Settings" toggle? This should not block implementation. Prefer collapsed on small screens and visible/compact on desktop if the row remains readable.
- Should unknown option keys be preserved for forward compatibility or stripped for strictness? This should not block implementation. Preserve unknown keys unless they cause UI or security issues, because current behavior already preserves unrelated options for modules with `homeWidget`.
