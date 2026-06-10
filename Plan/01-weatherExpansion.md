# Expand the Weather Module: Environment Extras + Dedicated Weather Page

## Context

Today the Weather module is a single home-dashboard widget with two minor options
(`iconStyle`, `showExtendedForecast`). The user wants it to grow into a richer,
multi-surface weather experience:

1. **Environment extras** — UV index, air quality, and pollen, all available for free
   from Open-Meteo (the same provider already powering weather and tides). These are
   *additive* fetch parameters, not a new subsystem.
2. **Flexible display** — the extras should be toggleable on the existing home weather
   widget (an "Environment" section).
3. **A dedicated full Weather page** reachable from the navbar (like Lists / Notes /
   Whiteboard), showing everything in full detail.

Decisions confirmed with the user:
- Build **all three** extras (UV, air quality, pollen). *Pollen is Europe-only* in
  Open-Meteo — outside Europe it returns nulls and we show an "unavailable in this
  region" note.
- Extras surface **on the main weather widget** (toggleable section) **and** on the new
  dedicated page. Standalone per-extra home cards are explicitly **deferred** (would
  require new piggyback module definitions; out of scope here).
- The dedicated Weather page is **enabled in the navbar by default**.

## Architecture notes (verified)

- Module settings are declarative (`moduleDefinitions` in `src/api/modules.ts`) and
  rendered automatically by `SettingControl` (`src/features/admin/sections/ModulesSection.tsx`).
  New `boolean` toggles need no new UI code.
- Weather data is produced by `getWeather()` (`src/api/data.ts:516`), cached 45 min via
  `cached()`. Air quality / pollen / current UV come from a **separate** Open-Meteo
  endpoint (`air-quality-api.open-meteo.com`); UV daily max can be added to the existing
  forecast `daily` params. We mirror the `getMarine()` pattern: read module options
  (`getTidesModuleOptions` → new `getWeatherModuleOptions`) and do a sibling fetch.
- Pages are a custom tab system (no react-router): `Tab` union in
  `src/shared/api-types.ts`, `activeTab` in `useAppController`, branches in `App.tsx`,
  nav built by `buildNavigationEntries()` (`src/features/app-shell/navigation.ts`).
- `normaliseNavigationBarState()` (`src/api/modules.ts:467`) falls back to the definition
  default when no stored value exists, so flipping `navigationBar.defaultEnabled` to
  `true` lights up the nav entry for existing installs (unless previously toggled off).

## Implementation

### 1. Data layer — fetch the extras

**`src/api/data.ts`:**
- Add `getWeatherModuleOptions(env)` mirroring `getTidesModuleOptions()` (`data.ts:670`),
  returning `{ showUvIndex, showAirQuality, showPollen }` booleans (default false).
- In `getWeather()`:
  - Add `uv_index_max` to the forecast `daily` param (cheap, always-on; used by daily
    rows + the page's 7-day view).
  - Read the weather module options. If **any** extra is enabled, do a second
    `fetchJson` to `https://air-quality-api.open-meteo.com/v1/air-quality` with
    `current=uv_index,european_aqi,pm2_5,pm10,grass_pollen,birch_pollen,alder_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`
    plus `latitude/longitude/timezone`. Wrap this fetch in try/catch so a failure leaves
    `environment` partially/fully null without breaking core weather.
  - Build an `environment` object on the returned summary (see type below). Compute
    derived levels with the new helpers in §4.
  - Bump cache key from `weather-v6` to a per-flags key, e.g.
    `weather-v7-${showUv?1:0}${showAir?1:0}${showPollen?1:0}`, so toggling extras
    invalidates the cache. Existing `clearWeatherAndMarineCache` / `deleteModuleData`
    already wipe `weather-%`, so no new invalidation wiring needed.

**`src/shared/api-types.ts`** — extend `WeatherSummary`:
- Add optional `uvIndexMax: number | null` to each `daily` entry.
- Add optional top-level:
  ```ts
  environment?: {
    time: string | null
    uvIndex: number | null
    uvIndexMax: number | null
    airQuality: { europeanAqi: number | null; pm2_5: number | null; pm10: number | null; level: string | null } | null
    pollen: { available: boolean; overallLevel: string | null; grass: number | null; birch: number | null; alder: number | null; mugwort: number | null; olive: number | null; ragweed: number | null } | null
  } | null
  ```

### 2. Settings — new toggles on the weather module

**`src/api/modules.ts`** (weather definition, ~line 133): append three `boolean`
settings — `showUvIndex`, `showAirQuality`, `showPollen` (all `defaultValue: false`)
with clear labels/descriptions (note pollen's Europe limitation in its description).
Also change weather `navigationBar.defaultEnabled` from `false` → `true` (§3).
These render automatically in Admin → Modules; no `SettingControl` changes needed.

### 3. Dedicated Weather page (navbar tab)

- **`src/shared/api-types.ts`**: add `'weather'` to the `Tab` union.
- **`src/features/app-shell/navigation.ts`**:
  - Change `moduleNavigationTargets.weather` from `{ kind: 'home', moduleId: 'weather' }`
    to `{ kind: 'tab', tab: 'weather' }`.
  - Add a `coreNavigation` entry for weather (icon `🌦️`, label `Weather`), placed right
    after Home. (It's filtered by `installed && enabled && navigationBar.enabled`, same
    as the other core entries; `extraEntries` already skips ids present in core, so no
    double render.)
- **`src/api/modules.ts`**: `navigationBar.defaultEnabled: true` (done in §2).
- **New `src/features/weather/WeatherWorkspace.tsx`** — full-page view. Reuses
  `formatTemperature/formatNumber/formatDate` (`shared/format.ts`), `weatherIcon()`,
  `formatCurrentPrecipitationMm` (`shared/weather.ts`), and the level helpers from §4.
  Sections: large current conditions; full metric grid incl. feels-like, wind/gusts,
  sunrise/sunset (already in `daily[0]`); the full hourly track; the **complete 7-day**
  forecast (not sliced to 5); and a detailed **Environment** panel (UV with band, AQI
  with PM2.5/PM10, pollen per-allergen with Europe-unavailable fallback). Gate each
  environment block on the module's `showUvIndex/showAirQuality/showPollen` option.
  Lift the shared `InfoTooltip` helper out of `WeatherWidget.tsx` into a small shared
  module (e.g. `src/features/home/widgets/InfoTooltip.tsx`) and import it in both places
  rather than duplicating.
- **`src/App.tsx`**: add a branch
  `{!viewedPage && !adminOpen && activeTab === 'weather' && (<WeatherWorkspace .../>)}`.
  Pass `home`, `locationConfigured` (`homeGroup.locationConfigured`), `publicSettings`,
  the weather module (`dashboardModules.find(m => m.id === 'weather')`), and
  `onOpenAdmin`. Modeled on the existing `NetworkWorkspace` branch which already reads
  `home?.network` directly.

### 4. Formatting / level helpers + tests

**`src/shared/weather.ts`** (alongside `formatCurrentPrecipitationMm`): add pure helpers
- `uvLevel(value)` → `'Low' | 'Moderate' | 'High' | 'Very high' | 'Extreme'` (WHO bands:
  <3, 3–5, 6–7, 8–10, 11+).
- `airQualityLevel(europeanAqi)` → European AQI bands (Good/Fair/Moderate/Poor/Very
  poor/Extremely poor).
- `pollenLevel(grainsPerM3)` → `'Low' | 'Moderate' | 'High' | null` with a sensible
  threshold; plus a small reducer for `overallLevel` (highest across allergens) and
  `available` (any non-null).

**`src/shared/weather.test.ts`**: add cases for each helper (boundaries + null inputs).

### 5. Main widget — Environment section

**`src/features/home/widgets/WeatherWidget.tsx`**: after the existing `metric-row`, add
a conditional `<section className="weather-environment">` rendering a pill per enabled +
available extra, gated on `module.options.showUvIndex/showAirQuality/showPollen`. Reuse
the (now-shared) `InfoTooltip` and the emoji/line-icon style already selected via
`weatherIconStyle`. Pollen pill shows the unavailable note when `pollen.available` is
false. Add matching CSS to the existing weather styles (search the stylesheet for
`weather-metric` / `weather-hourly` to colocate).

## Files touched (summary)

- `src/api/data.ts` — fetch + options helper + cache key
- `src/api/modules.ts` — three toggles + nav default
- `src/shared/api-types.ts` — `WeatherSummary.environment`, `daily.uvIndexMax`, `Tab`
- `src/shared/weather.ts` + `weather.test.ts` — level helpers + tests
- `src/features/app-shell/navigation.ts` — weather → tab target + core entry
- `src/features/home/widgets/WeatherWidget.tsx` — Environment section
- `src/features/home/widgets/InfoTooltip.tsx` (new, extracted) — shared tooltip
- `src/features/weather/WeatherWorkspace.tsx` (new) — full page
- `src/App.tsx` — weather tab branch
- CSS (existing weather stylesheet) — Environment pills + page layout

## Verification

1. `npm test` — confirm new `weather.test.ts` helper cases pass and existing
   `data.test.ts` weather assertions still pass. Extend a `data.test.ts` case to mock the
   air-quality endpoint and assert `environment` fields populate (and that with all
   toggles off the air-quality endpoint is **not** called).
2. `npm run build` — typecheck the new `Tab` member, workspace, and type changes.
3. `npm run dev` — manual pass:
   - Set a European location in Admin so pollen returns data.
   - Admin → Modules → Weather: enable the three toggles → confirm the Environment
     section appears on the home widget with sensible values/levels.
   - Confirm a **Weather** entry now shows in the navbar and opens the dedicated page
     with full 7-day forecast, hourly track, sunrise/sunset, and the detailed
     Environment panel.
   - Set a non-European location → confirm pollen shows the "unavailable in this region"
     note while UV + air quality still populate.
   - Toggle an extra off → confirm the widget/page section hides and (via Admin → Cache)
     the new `weather-v7-*` cache key reflects the changed flags.