# Module Settings and Customisation

## Status: Implemented

## Goal

Make built-in modules much more configurable from Admin settings, with clear explanations and lightweight previews so an admin can understand what each option changes before saving it.

## What Changed (Revision Notes)

The original plan was written against an earlier monolithic `App.tsx`. Since then:

- `App.tsx` was refactored into a thin orchestrator using `useAppController`
- Admin UI was extracted into `src/features/admin/sections/ModulesSection.tsx`
- Home edit mode controls were extracted into `src/features/home/ModuleEditControls.tsx`
- `normaliseModuleOptions` was expanded to handle more tides display options (showCurrentTide, showTimeUntilNext, showNextTides, showTideSourceNote, nextTideCount)

The revised plan leverages these structural improvements and replaces the original hard-coded if-statements with a generic, data-driven schema system.

## Architecture

### Schema System (`src/api/modules.ts`)

Five setting types defined as a discriminated union:

- `ModuleSettingSelect` - dropdown with labelled options and per-option descriptions
- `ModuleSettingBoolean` - show/hidden toggle
- `ModuleSettingText` - free text input
- `ModuleSettingSecret` - API key / sensitive text with redaction support
- `ModuleSettingNumber` - integer with min/max clamping

Each `ModuleDefinition` can declare an optional `settings: ModuleSettingDefinition[]` array. The schema drives both normalisation and frontend rendering.

### Normalisation

`normaliseModuleOptions` applies schema-defined defaults and validation via `normaliseSettingValue`. This replaces the previous hard-coded if-statements for weather and tides options. The function iterates `definition.settings` and normalises each key generically.

### Secret Redaction

`redactModuleOptions(definition, options)` replaces secret values with `[redacted]` before activity logging. Used in `src/api/router.ts` so API keys never appear in plaintext activity metadata.

### Frontend Rendering

`ModulesSection.tsx` uses a `SettingControl` component that reads `module.settings` and renders the appropriate control for each type. This eliminates the need for hard-coded per-module JSX branches.

`ModuleEditControls.tsx` (home edit mode) also uses the schema, filtering to lightweight controls (select, boolean only) and excluding admin-only settings like API keys.

### Shared Types (`src/shared/api-types.ts`)

`ModuleSettingDefinition` type added for frontend consumption. `Module` type extended with optional `settings` field. Previously hard-coded option types (iconStyle, apiKey, etc.) removed from the options intersection since the schema now drives type knowledge.

## Implementation Summary

### Files Changed

| File | Changes |
|---|---|
| `src/api/modules.ts` | Added 5 setting type definitions, `settings` field on `ModuleDefinition`, schema-driven `normaliseModuleOptions`, `normaliseSettingValue` helper, `redactModuleOptions` helper. Weather and tides modules now declare full settings schemas. |
| `src/shared/api-types.ts` | Added `ModuleSettingDefinition` type, added `settings` to `Module` type, removed hard-coded weather/tides option types from `options` intersection. |
| `src/api/router.ts` | Activity logging for module patches now calls `redactModuleOptions` to strip secret values before recording metadata. |
| `src/features/admin/sections/ModulesSection.tsx` | Replaced hard-coded weather/tides controls with generic `SettingControl` renderer. Added size help text, mode description display, secret field status. |
| `src/features/home/ModuleEditControls.tsx` | Replaced hard-coded weather controls with schema-driven `EditSettingControl`. Filters to lightweight settings for compact edit toolbar. |
| `src/styles.css` | Added `.setting-option-help` and `.setting-secret-status` styles. |
| `src/api/modules.test.ts` | Added 7 new tests: settings metadata presence, boolean defaults, number clamping, non-string text/secret normalization, secret redaction (3 tests). Total: 21 tests. |

### Tests

- `npm test` — 139 tests pass (21 in modules.test.ts)
- `npm run build` — TypeScript check and Vite production build pass

### What Was NOT Changed

- No database migration needed (all settings stored in existing `options_json` blob)
- `functions/api/[[path]].ts` — unchanged, delegates to router
- `functions/_middleware.ts` — unchanged
- `src/theme/*` — unchanged
- `GET /api/modules` and `PATCH /api/modules` request shapes — backward compatible

## Reusable Pattern for New Modules

To add settings to any module (e.g. lists, notes, pages, network):

1. Add `settings` array to the module definition in `src/api/modules.ts`
2. The normaliser and frontend renderer will automatically pick up the new controls
3. No changes needed to `router.ts`, `api-types.ts`, or `ModulesSection.tsx`

Example:

```ts
{
  id: 'lists',
  // ...existing fields...
  settings: [
    {
      key: 'defaultSort',
      type: 'select',
      label: 'Default sort',
      description: 'How lists are ordered by default.',
      defaultValue: 'recent',
      options: [
        { value: 'recent', label: 'Most recent', description: 'Recently updated lists first.' },
        { value: 'alpha', label: 'Alphabetical', description: 'Sort by name A-Z.' },
      ],
    },
  ],
}
```
