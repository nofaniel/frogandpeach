# Frog & Peach Project Purpose

This document is the durable product reference for Frog & Peach Home Hub. Use it when deciding whether a feature fits the project, how much complexity is acceptable, and which constraints must remain intact.

## Purpose

Frog & Peach is a private-by-default household hub. It should give a home one calm place to check, store, and organise the information that matters to that household.

The hub should work for a simple home that only wants weather, lists, notes, and useful links. It should also scale to a more complex home that wants richer modules, deeper settings, custom themes, and household-specific displays. Customisation is a core product goal, but it must not make the default install confusing.

## Audience

The primary audience is a household, not a company or public community. The app should be comfortable for non-technical household members to use every day, while still being straightforward for a developer or admin to extend.

Secondary audiences are:

- Home admins who configure modules, accounts, hosting, location, and appearance.
- Developers adding built-in modules or improving the app.
- Self-hosters who want a free or low-cost private home hub.

## Product Principles

- Household-first: features should help people in the home understand, remember, plan, or share something useful.
- Private by default: household data should not leak into public pages, logs, or unauthenticated routes.
- Simple start, deeper later: the first useful install should require minimal setup, while advanced settings can appear where they are needed.
- Optional modules: modules should be understandable, enableable, disableable, and removable without damaging unrelated data.
- Polished daily UI: the interface should be dense enough for repeated use and clear enough for quick household scanning.
- Local relevance: the app should support information that matters because of where or how a household lives, such as coastal, weather, health, planning, and memory use cases.
- Low-cost viability: the base product should remain useful on free or low-cost hosting where possible.

## What the Hub Should Support

Current built-in module families include:

- Environment data: weather and tides.
- Household content: shared lists, notes, editable markdown pages, and discovered custom static pages.
- Home operations: network, Wi-Fi, deployment, router, and admin links.
- Administration: users, modules, appearance, household settings, cache, activity, site review, and deployment checks.

Future candidate module families include:

- Environment: wind, waves, UV, pollen, air quality, and other location-specific conditions.
- Household memory: externally hosted image galleries, memory slideshows, polaroid-style displays, and handwritten note capture.
- Planning: reminders, calendars, household goals, savings, chores, routines, and events.
- Shared media and links: important links, movie watch lists, music links, and household recommendations.

These future examples are product direction, not current features. A proposed module should still be judged against household usefulness, privacy, hosting cost, and implementation complexity.

## Module Strategy

Modules are currently built-in code-defined registry entries in `src/api/modules.ts`. Adding a new module is a repository change, not a third-party package install.

A new built-in module usually needs changes in one or more of:

- `src/api/modules.ts` for registry metadata, defaults, module settings, and dashboard/navigation behaviour.
- Frontend feature or widget code under `src/`.
- API and data code under `src/api/` if the module needs server-side data.
- Shared contracts in `src/shared/api-types.ts` when frontend/backend data shapes change.
- Migrations under `migrations/` when new D1 persistence is required.
- Unit tests and, where useful, Playwright E2E coverage.

External third-party module packages are a future direction, not current behaviour. Until that exists, keep module additions explicit, typed, and easy to review.

Modules that call external services must handle missing credentials, unavailable upstream services, rate limits, stale cached data, and location-neutral setups gracefully. A module should fail quietly and informatively without breaking the rest of the hub.

## Customisation Strategy

Customisation should balance a useful default dashboard with admin-controlled depth. The target is not a blank framework that every household must build from scratch.

Current customisation surfaces include:

- Module install, enable, position, size, widget mode, and module-specific settings.
- D1-backed module settings persisted through `module_settings.options_json`.
- Appearance settings stored in D1.
- Theme files under `themes/<name>/theme.json` with optional `theme.css`.
- Runtime theme support in `src/theme/`.
- Generated public theme assets under `public/themes/`.
- Editable markdown pages and discovered custom static pages.

User-provided themes should remain JSON and CSS only. Do not require JavaScript in themes. The no-FOUC theme snapshot in `localStorage` should remain compatible with the theme system.

## Hosting Strategy

The first-class runtime target is Cloudflare Pages + Pages Functions + D1. This gives the app static hosting, a Worker-like API runtime, and SQLite persistence on Cloudflare's free or low-cost platform.

Local full-stack development uses:

```powershell
npm run build
npm run dev:worker
```

The full local app runs at `http://localhost:8788`. Build first so sync scripts populate generated assets before the Worker runtime starts.

Frontend-only development uses:

```powershell
npm run dev
```

That Vite server runs at `http://localhost:5173` and does not provide API or D1 behaviour.

Router-only or static hosting is limited. Static assets and custom pages may work, but login, notes, lists, settings, cache, sessions, and D1-backed modules require an API runtime and database. A future storage-heavy deployment target could unlock features such as first-party media handling, but the base product should not depend on expensive infrastructure.

## Privacy and Security Principles

Security constraints are product requirements, not implementation details to trade away.

- Raw session tokens must not be stored in D1; only hashed tokens belong in persistence.
- Passwords must continue using PBKDF2-SHA256 with the configured iteration policy.
- Admin actions must require a separate timed admin unlock, not only a regular session.
- Mutating API routes must keep trusted `Origin` checks.
- Login and admin-unlock rate limiting must remain D1-backed.
- Private household content must stay behind authenticated routes.
- External-service integrations must avoid exposing secrets to the client unless the provider explicitly requires public client credentials.
- Activity and error reporting should help admins understand changes without leaking sensitive values.

## Current Scope

Current scope is a Cloudflare-hosted private home hub with:

- Household accounts and role-based sessions.
- Timed admin re-auth.
- Configurable built-in modules.
- Weather and tide data.
- Shared notes, lists, editable pages, and custom static page discovery.
- Network and deployment information.
- Themes and appearance settings.
- Admin review, deployment, cache, activity, and user controls.

The current architecture is intentionally direct: React frontend, Cloudflare Functions backend, D1 persistence, and built-in module definitions.

## Future Direction

Future work should improve the hub's ability to become a useful household surface without turning it into an unbounded productivity platform.

Good future work includes:

- More household-specific modules.
- Better display modes for wall tablets, shared screens, and mobile use.
- More flexible dashboard layout and module settings.
- Stronger developer guidance for adding built-in modules.
- Optional integrations for calendars, reminders, media, and external data services.
- Clearer static/local hosting modes where full D1-backed behaviour is not available.

## Non-Goals

- Do not build a public social platform.
- Do not expose private household data publicly by default.
- Do not make every future idea a core module.
- Do not require paid hosting for the base product.
- Do not treat third-party module packages as current behaviour.
- Do not add JavaScript-powered user themes.
- Do not weaken auth, admin unlock, origin checks, token storage, or rate limiting for convenience.

## How Future Agents Should Use This Document

Before implementing a feature, check whether it serves a household-first purpose, fits an existing module, or deserves a new built-in module. Prefer small, understandable additions that preserve privacy, low-cost hosting, and daily usability.

When a feature is only a future candidate, describe it as such. Do not imply that UV, pollen, gallery, handwritten notes, reminders, calendar, savings, movies, music, or similar examples already exist unless they have been implemented.

When changing module, hosting, privacy, or security behaviour, update this document if the product direction has genuinely changed.
