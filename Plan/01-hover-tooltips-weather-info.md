# Weather Tooltips and Hourly Timeline

## Original Note

When looking at weather, I want to be able to hover over an icon and have a tooltip saying what it means.

It is not clear what the umbrella rain icon means. The filling-up bar is also ambiguous; it looks like humidity, but it is actually a rain probability indicator.

Today's weather should also have an hourly scrollable timeline starting from the current time, showing the weather throughout the day.

## Goal

Make the Weather home widget self-explanatory at a glance.

1. Add accessible hover/focus tooltips to the weather condition icon and metric icons.
2. Clarify ambiguous metrics, especially rain chance and current rainfall.
3. Add a horizontal hourly forecast timeline for today, starting around the current time.
4. Keep the existing current weather and 5-day forecast behavior intact.

The result should work on desktop hover, keyboard focus, and mobile/touch where hover is not available.

## Current State

The Weather module is already implemented as a home dashboard widget in `src/App.tsx`.

Important existing files:

- `src/App.tsx`: renders the Weather widget inside `renderModule`.
- `src/styles.css`: contains all Weather widget styles under `.weather-panel`.
- `src/shared/api-types.ts`: defines `WeatherSummary`, but currently does not include the `hourly` field.
- `src/api/data.ts`: `getWeather()` already requests Open-Meteo hourly data and returns an `hourly` array from the cache payload.
- `src/api/modules.ts`: defines weather home widget modes and weather module options.
- `src/api/data.test.ts`: has weather API mapping tests.
- `src/shared/format.test.ts`: tests the weather condition icon mapping.
- `e2e/home.spec.ts`: covers home widget behavior.

Current Weather UI:

- Shows location, large current condition icon, temperature, condition label, metric row, and optional 5-day forecast.
- Metric row includes:
  - today's high/low temperature
  - wind speed
  - daily precipitation chance
  - current precipitation amount
  - feels-like temperature
- Icons can be emoji or custom inline SVG based on the module option `iconStyle`.
- The 5-day forecast rain bar uses `--precip` height, but the UI does not explain that the bar represents rain chance.

Current backend/data situation:

- `src/api/data.ts` already fetches hourly:
  - `precipitation_probability`
  - `temperature_2m`
  - `weather_code`
- `getWeather()` returns up to 8 hourly entries after filtering near the current time.
- The TypeScript type in `src/shared/api-types.ts` is stale and needs to include `hourly`.
- No D1 migration should be needed for this work.

## Proposed Behavior

### Tooltips

Add tooltips for:

- The main weather condition icon.
- Each metric in the metric row.
- Each rain chance bar in the 5-day forecast.
- Each hourly timeline item, if the compact card text cannot show all relevant detail.

Tooltip copy should be short, plain, and specific:

- Main condition icon: current condition label, e.g. `Current conditions: Light rain`.
- Temperature range: `Today high / low temperature`.
- Wind: `Current wind speed`.
- Rain chance umbrella: `Chance of rain today`.
- Rain droplet/current precipitation: `Rainfall measured now`.
- Feels-like: `Feels-like temperature`.
- Forecast rain bar: `Chance of rain: 42%`.
- Hourly item: `13:00: Light rain, 12C, 40% rain chance`.

Do not rely only on the browser `title` attribute. It is inconsistent, not reliably accessible, and not good enough for touch. Implement a small app-local tooltip pattern.

### Hourly Timeline

Add a section beneath the current metric row and above the optional 5-day forecast.

Suggested section label:

- Heading: `Today`
- Secondary label: `Hourly forecast`

The timeline should:

- Be horizontally scrollable.
- Start with the current/nearest upcoming hour. The backend already filters to entries from roughly the last hour onward.
- Show up to 8 hourly items initially, using the existing backend output unless the implementer chooses to expand it.
- Display each hour as a compact fixed-width item.
- Include:
  - local hour label, e.g. `Now`, `13:00`, `14:00`
  - condition icon
  - temperature
  - rain chance
  - optional short condition label if space allows
- Not cause layout shift when data changes.
- Not break small, wide, or full module sizes.
- Degrade cleanly if `hourly` is missing or empty.

Recommended card content:

```text
Now
[condition icon]
12C
40% rain
```

Only use `Now` for the first item when it is within about 90 minutes of the current weather time or current browser time. Otherwise use the formatted hour.

## UX Details

### Tooltip Interaction

The tooltip should appear when the trigger is:

- Hovered with a pointer.
- Focused by keyboard.
- Tapped/clicked on touch devices.

The tooltip should disappear when:

- Hover/focus leaves.
- Escape is pressed.
- Another tooltip opens.
- The user taps outside, if practical.

Recommended implementation:

- Create a small reusable component in `src/App.tsx`, near other app-local helper components:
  - `InfoTooltip`
  - Props: `label`, `children`, optional `className`
- Render the trigger as a `span` or `button` depending on whether click/tap toggling is implemented.
- Use `aria-describedby` to connect the trigger to the tooltip content while visible.
- Use `role="tooltip"` on the tooltip content.
- Keep tooltip content in DOM only when visible, or keep it hidden with CSS in a way screen readers do not announce stale content.
- Ensure triggers are keyboard focusable if the information is not already available as nearby text.

Use the tooltip for icon-only or ambiguous visual elements. Do not wrap large chunks of the widget unnecessarily.

### Visual Style

The tooltip style should fit the existing weather card:

- Dark translucent background or solid deep green.
- White text.
- Small radius, around 8px.
- Compact padding.
- No large decorative treatment.
- Avoid covering the value being explained where possible.
- Keep `z-index` above the weather panel and forecast cards.

The hourly timeline should feel like part of the current weather card:

- Use the existing green Weather panel palette.
- Use fixed-width timeline cards/chips so scrolling is stable.
- Use `overflow-x: auto`, `scrollbar-width: thin`, and `overscroll-behavior-inline: contain`.
- Add `scroll-snap-type: x proximity` if it feels good in manual testing.
- Do not nest card-like containers inside another card-heavy layout more than needed; compact timeline items are acceptable because they are repeated data items.

### Mobile

On mobile:

- Timeline remains horizontal and scrollable.
- Tooltip tap target must be at least comfortable enough for touch, roughly 32px minimum when the trigger is icon-only.
- Avoid tooltip text overflowing the viewport. Use max width and wrapping.
- If hover-only CSS is used as a baseline, add click/touch behavior or visible text so mobile users still get the explanations.

### Accessibility

Requirements:

- Keyboard users can tab to ambiguous icons and see the tooltip.
- Tooltip content is associated with the trigger using `aria-describedby`.
- Decorative icons remain `aria-hidden="true"` only when the adjacent text or tooltip provides the meaning.
- The hourly timeline section has an accessible label, e.g. `aria-label="Hourly forecast for today"`.
- Scrollable timeline should be reachable and usable without trapping focus.
- Do not put essential information only in CSS pseudo-elements.

## Data Contract

Update `WeatherSummary` in `src/shared/api-types.ts` to include the hourly data already returned by `getWeather()`:

```ts
export type WeatherSummary = {
  location: string
  current: {
    temperature: number | null
    feelsLike: number | null
    windSpeed: number | null
    windGusts: number | null
    precipitationMm: number | null
    label: string
    time: string | null
  }
  daily: Array<{
    date: string
    label: string
    max: number | null
    min: number | null
    precipitationChance: number | null
  }>
  hourly: Array<{
    time: string
    temperature: number | null
    precipitationChance: number | null
    label: string
  }>
}
```

Optional but recommended:

- Include `code?: number | null` on `current`, `daily`, and `hourly` if the UI or tests benefit from preserving the weather code. The backend already includes `code` for current and daily, but the shared type does not. Do not add it unless useful.
- Increase hourly slice from 8 to 10 or 12 if the layout tests well. If doing this, bump the weather cache key from `weather-v6` to `weather-v7` so stale cached payloads are not reused.

## Implementation Plan

### 1. Update Shared Types

Edit `src/shared/api-types.ts`:

- Add `hourly` to `WeatherSummary`.
- Keep fields nullable in the same style as the existing weather fields.
- Do not require a migration.

### 2. Add Tooltip Helpers

Edit `src/App.tsx`:

- Add a reusable tooltip helper component near `WeatherMetricSymbol` or other local helpers.
- Add a small ID helper using React `useId()` if needed.
- Make sure any new React imports are added at the top.

Suggested component shape:

```tsx
function InfoTooltip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  // Local open state for touch/click, plus CSS hover/focus support.
}
```

Keep it simple. This app is monolithic and does not currently have a component library.

### 3. Add Weather Metric Metadata

Edit `src/App.tsx`:

- Extend `WeatherMetricName` only if new metric types are needed.
- Add a metadata map for metric labels/tooltips:

```ts
const weatherMetricTooltip: Record<WeatherMetricName, string> = {
  temperature: 'Today high / low temperature',
  wind: 'Current wind speed',
  precipitationChance: 'Chance of rain today',
  precipitation: 'Rainfall measured now',
}
```

- Wrap metric icons or whole metric spans with `InfoTooltip`.
- Add a tooltip for feels-like, even though it has text, because the metric may be unclear.

### 4. Render Hourly Timeline

Edit the Weather branch inside `renderModule()` in `src/App.tsx`:

- Derive `const hourlyForecast = home.weather.hourly ?? []`.
- Add a section after `.metric-row` and before `{showForecast && (...)}`.
- Hide the section when there are no hourly entries.
- Use existing format helpers where possible:
  - `formatTemperature`
  - `formatNumber`
  - `weatherIcon`
- Add a local helper if needed:
  - `formatWeatherHour(time: string, index: number): string`
  - `formatHourlyTooltip(hour): string`

Suggested markup:

```tsx
{hourlyForecast.length > 0 && (
  <section className="weather-hourly" aria-label="Hourly forecast for today">
    <div className="weather-hourly-heading">
      <p className="kicker">Today</p>
      <span>Hourly forecast</span>
    </div>
    <div className="weather-hourly-track" tabIndex={0}>
      {hourlyForecast.map((hour, index) => (
        <InfoTooltip key={hour.time} label={formatHourlyTooltip(hour)}>
          <article className="weather-hour-card">
            ...
          </article>
        </InfoTooltip>
      ))}
    </div>
  </section>
)}
```

If wrapping `article` in `InfoTooltip` makes invalid or awkward markup, put the tooltip trigger inside the card instead.

### 5. Clarify 5-Day Rain Bar

Edit the forecast day card rendering in `src/App.tsx`:

- Add a tooltip to `.weather-precip-track` or the visible precip percentage.
- Include an accessible label such as `aria-label={`Chance of rain: ${formatNumber(precip)}%`}`.
- Keep the visual bar decorative if the text percentage remains visible.

### 6. Add Styles

Edit `src/styles.css`:

- Add tooltip styles near the weather styles or global utility area.
- Add hourly timeline styles near the existing `.weather-forecast-grid` rules.
- Add responsive rules in the existing `@media (max-width: 520px)` block.

Style hooks to add:

- `.info-tooltip`
- `.info-tooltip-trigger`
- `.info-tooltip-bubble`
- `.weather-hourly`
- `.weather-hourly-heading`
- `.weather-hourly-track`
- `.weather-hour-card`
- `.weather-hour-time`
- `.weather-hour-icon`
- `.weather-hour-temp`
- `.weather-hour-rain`

Make sure CSS handles both emoji and SVG icon modes.

### 7. Tests

Add or update focused tests.

Unit/type-level coverage:

- `src/api/data.test.ts`
  - Assert `getWeather()` maps hourly forecast entries into `weather.hourly`.
  - Assert entries before the cutoff are filtered out if practical with existing fake time setup.
- `src/api/modules.test.ts`
  - No required change unless new weather module options are added.
- `src/shared/format.test.ts`
  - No required change unless new formatting helpers are exported.

E2E coverage:

- Add a Playwright test in `e2e/home.spec.ts` or a new weather-specific spec.
- It should run against local `:8788` with configured test credentials.
- Assert:
  - Weather widget displays the hourly timeline when weather data is available.
  - Rain chance tooltip appears on hover or focus.
  - Main weather icon tooltip appears on focus/hover.
  - No console errors.

If the E2E environment does not have location configured or reliable weather data, keep E2E focused on the UI shell and rely on unit tests for data mapping. Do not point E2E at production.

## Acceptance Criteria

Functional:

- Weather metric icons explain themselves on hover and keyboard focus.
- Touch users have a way to reveal the same tooltip text.
- The umbrella/rain chance metric is explicitly labelled as rain chance, not humidity.
- The current precipitation droplet is explicitly labelled as current rainfall.
- The 5-day forecast rain bars are explained as rain chance.
- The Weather widget shows an hourly timeline when `home.weather.hourly` contains entries.
- The hourly timeline starts at or near the current time and proceeds forward.
- The timeline displays hour, condition, temperature, and rain chance.
- The widget still renders when `hourly` is missing, empty, or contains null values.
- Existing current weather and 5-day forecast behavior remains intact.

Accessibility:

- Tooltip triggers are keyboard reachable.
- Tooltip content uses `role="tooltip"` and `aria-describedby`.
- The hourly timeline has an accessible section label.
- Decorative icons remain hidden from assistive tech only when their meaning is available through text or tooltip.

Visual:

- Tooltip text does not overflow the weather card or viewport.
- Timeline scrolls horizontally on mobile without breaking the card layout.
- No visible overlap between tooltip, hourly cards, forecast grid, or metric row.
- The Weather card remains polished in `small`, `wide`, and `full` module sizes.

Technical:

- No D1 migration is introduced.
- No new external dependency is introduced unless strongly justified.
- `npm test` passes.
- `npm run build` passes.

## Verification Commands

Run from `N:\code\FP`.

Required:

```bash
npm test
npm run build
```

For full-stack manual/E2E verification:

```bash
npm run build
npm run dev:worker
```

Then in another terminal:

```bash
$env:E2E_BASE_URL='http://localhost:8788'
$env:TEST_USERNAME='admin'
$env:TEST_PASSWORD='<local test password>'
npm run test:e2e
```

Manual browser checks:

- Open `http://localhost:8788`.
- Sign in.
- Confirm location settings are configured so weather loads.
- On desktop, hover each weather icon/metric and confirm tooltip copy is correct.
- Use Tab to focus tooltip triggers and confirm tooltip copy appears.
- On a mobile viewport, tap tooltip triggers and scroll the hourly timeline.
- Switch Weather icons between `Emoji` and `Line icons` in Admin settings and verify both styles still work.
- Switch Weather homepage mode between `Current conditions` and `Forecast` and verify hourly timeline remains present in both modes unless deliberately scoped otherwise.

## Implementation Notes and Edge Cases

- The backend cache key is currently `weather-v6`. If only the TypeScript type and frontend rendering change, the cache key can stay as-is because `hourly` is already in the cached payload. If backend payload shape changes, bump it.
- Open-Meteo times are returned in the configured timezone. Format hours from the provided time string; do not convert to UTC manually.
- `new Date('YYYY-MM-DDTHH:mm')` behavior can vary by environment. If formatting becomes inconsistent, parse the hour directly from the time string instead of relying on timezone conversion.
- The app has no configured formatter or linter. Follow the existing style in `src/App.tsx`.
- Keep all changes local to weather UI/type/tests unless tests reveal a real shared issue.
- Avoid replacing the current weather widget layout wholesale. This is an enhancement, not a redesign.

## Open Questions

These do not need to block implementation:

- Should the hourly timeline show 8 hours, 10 hours, or 12 hours? Default to the existing 8 returned by the backend.
- Should the hourly timeline be configurable in Admin settings? Do not add a setting for the first implementation; keep it always visible when hourly data exists.
- Should sunrise/sunset be shown in the hourly timeline later? Not part of this implementation.
- Should humidity be added as a real metric later? Not part of this implementation; the current goal is to clarify that the existing rain bar is not humidity.
