# Theming

Frog & Peach renders on a small, neutral **base visual system** that is driven
entirely by a **theme**. A theme controls colour, typography, shape, elevation,
spacing, and layout (navigation placement, density, surface treatment, dashboard
columns, page width, and page background). The app ships with a `base` theme plus
`frog-peach`, `coastal`, `botanical`, and `mono-dark`, and **anyone can add their
own theme by dropping a folder in** — no app code, no JavaScript.

## How themes are loaded

1. A theme is a folder under `themes/<id>/` at the repo root.
2. On `npm run dev` / `npm run build`, `scripts/sync-themes.mjs` copies `themes/`
   into `public/themes/` and writes `public/themes/manifest.json` (the list of
   available themes, plus any validation warnings).
3. At runtime the app reads the manifest, fetches the selected theme's
   `theme.json`, maps its tokens to CSS custom properties and its layout to
   data-attributes on the document root, and injects the optional `theme.css`.
4. Admins pick the active theme in **Admin → Appearance**; the choice is stored in
   D1 as `themeId` and applied for everyone.

Nothing in a theme is executed — it is pure data and CSS. An unknown or broken
theme falls back to `base`.

## Folder layout

```
themes/
  my-theme/
    theme.json     # required: manifest (tokens + layout)
    theme.css      # optional: extra CSS, scoped under .app-shell
    fonts/...      # optional: assets, referenced from theme.css by /themes/my-theme/...
```

The folder name **must** match the `id` in `theme.json`.

## `theme.json` reference

```jsonc
{
  "id": "my-theme",            // required, must equal folder name, [a-z0-9-]
  "name": "My Theme",          // required, shown in the picker
  "author": "You",
  "version": "1.0.0",
  "extends": "base",           // optional: inherit tokens/layout from another theme
  "stylesheet": "theme.css",   // optional: extra CSS file in this folder

  "tokens": {
    "color": {
      "bg":       "#f7f7f8",   // page background
      "surface":  "#ffffff",   // panels, inputs, cards
      "surface2": "#f1f2f4",   // secondary surfaces (tags, chips)
      "ink":      "#1c1d1f",   // primary text
      "muted":    "#6b6f76",   // secondary text
      "line":     "#e2e4e8",   // borders
      "accent":   "#2f6feb",   // primary accent (kickers, focus)
      "accent2":  "#0d9488",   // secondary accent (ok states)
      "danger":   "#d64545"    // destructive actions / warnings
    },
    "font": {
      "body":    "system-ui, sans-serif",
      "heading": "system-ui, sans-serif",   // defaults to body if omitted
      "mono":    "ui-monospace, monospace"
    },
    "radius": { "sm": "6px", "md": "10px", "lg": "16px" },
    "shadow": { "panel": "0 4px 12px rgba(0,0,0,0.06)" },
    "space":  { "scale": 1 }                // multiplier on base spacing
  },

  "layout": {
    "navigation": "top",          // "top" | "side"
    "density": "comfortable",     // "comfortable" | "compact"
    "surface": "card",            // "card" | "flat" | "outline"
    "dashboardColumns": 2,        // 1–6
    "shellWidth": "1120px",       // max content width
    "bodyBackground": "#f7f7f8"   // any CSS background value
  }
}
```

Every field is optional except `id` and `name`. Anything omitted inherits from
`extends` (if set) and then from the built-in `base` defaults.

### Tokens → CSS variables

Each token maps to a CSS custom property you can also use inside `theme.css`:

| Token            | CSS variable          |
| ---------------- | --------------------- |
| `color.bg`       | `--color-bg`          |
| `color.surface`  | `--color-surface`     |
| `color.surface2` | `--color-surface-2`   |
| `color.ink`      | `--color-ink`         |
| `color.muted`    | `--color-muted`       |
| `color.line`     | `--color-line`        |
| `color.accent`   | `--color-accent`      |
| `color.accent2`  | `--color-accent-2`    |
| `color.danger`   | `--color-danger`      |
| `font.body`      | `--font-body`         |
| `font.heading`   | `--font-heading`      |
| `font.mono`      | `--font-mono`         |
| `radius.sm/md/lg`| `--radius-sm/md/lg`   |
| `shadow.panel`   | `--shadow-panel`      |
| `space.scale`    | `--space-scale`       |
| `layout.shellWidth`        | `--shell-width`        |
| `layout.dashboardColumns`  | `--dashboard-columns`  |
| `layout.bodyBackground`    | `--app-body-background`|

### Layout → data-attributes

`layout.navigation`, `density`, and `surface` are applied as
`data-nav`, `data-density`, and `data-surface` on `<html>`. The base stylesheet
keys off these (e.g. `:root[data-nav="side"]` produces a left sidebar). You can
target them in your own `theme.css` too.

## Optional `theme.css`

Use it for anything tokens can't express (gradients, custom component accents,
fonts). Scope rules under `.app-shell` so they don't leak into the login screen.
Reference local assets with absolute paths: `url(/themes/my-theme/fonts/x.woff2)`.

```css
.app-shell .weather-panel {
  background: linear-gradient(135deg, var(--color-surface) 0%, #f5e1bd 100%);
}
```

## Inheritance

Set `"extends": "base"` (or any other theme id) to start from that theme's tokens
and layout and only override what you need. The bundled `coastal`, `botanical`,
and `mono-dark` themes do exactly this — they extend `frog-peach` and override
only colours. Inheritance chains are resolved on load; cycles are ignored.

## Add a theme in three steps

1. Create `themes/my-theme/theme.json` (copy the reference above).
2. Run `npm run dev` (or `npm run build`) — the sync script regenerates the
   manifest. `themes/my-theme` appears in **Admin → Appearance**.
3. Select it. Reload to confirm it persists (it is stored server-side as
   `themeId`).
