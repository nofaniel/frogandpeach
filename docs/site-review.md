# Frog & Peach Site Review

## Current Risks

- First-run setup now creates a D1-backed admin account, but existing local databases must run `npm run cf:migrate:local` before the new login flow works.
- Admin unlock is intentionally short-lived. If a settings save starts failing with `Admin unlock required`, use the top-right Admin button and re-enter admin credentials.
- Weather and tide data are cached in D1. Weather can lag by up to 45 minutes; marine/tide data can lag by up to 6 hours.
- Tide output remains approximate Open-Meteo marine model data and should not be treated as official navigation data.

## Visual Improvements

- The dashboard now respects module size, but cards still use a simple two-column grid. A future pass could add drag handles and denser compact layouts.
- Admin settings are functional and sectioned, but not yet a fully tabbed control surface.
- The current typography intentionally stays close to the existing Frog & Peach style. A later redesign can make each appearance style more distinct.

## Bugs To Watch

- Custom static pages depend on `scripts/sync-custom-pages.mjs`; run build/dev through npm scripts so the manifest is regenerated.
- Existing databases with old demo data need migration `0002_modular_hub.sql` to remove the known seed list and example page launcher.
- Module uninstall with data deletion is destructive for module-owned rows. Preserve-data uninstall is available through the normal Uninstall button.
