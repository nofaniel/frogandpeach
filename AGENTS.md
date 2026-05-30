# Repository Instructions

## Commands
- Use npm; this repo has `package-lock.json` and no pnpm/yarn workspace config.
- Install: `npm install`.
- Fast frontend-only dev server: `npm run dev` on Vite port 5173. API calls will not work here because Cloudflare bindings are absent.
- Full local app/API: `npm run build` first, then `npm run dev:worker` to serve `dist` through `wrangler pages dev dist --d1 DB=frog-peach-db` at `http://localhost:8788`.
- Build verification: `npm run build` runs `tsc -b` and then Vite build. There is no separate lint script.
- Tests: `npm test`. Focus one file with `npx vitest run src/shared/tide.test.ts` or `npx vitest run src/api/crypto.test.ts`.
- Generate admin password hash: `npm run hash-password -- "your-admin-password"`.
- D1 migrations: `npm run cf:migrate:local` for local, `npm run cf:migrate:remote` for remote.
- Deploy: `npm run cf:deploy`, which builds then runs `wrangler pages deploy dist`.

## Local Cloudflare Setup
- `.dev.vars` is required for login in the worker emulator: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and usually `APP_ORIGIN=http://localhost:8788`.
- Create the local D1 database before first worker run: `npx wrangler d1 create frog-peach-db`, then `npm run cf:migrate:local`.
- `wrangler.toml` binds D1 as `DB` with database name `frog-peach-db`; production still has placeholder `database_id = "replace-with-cloudflare-d1-id"` until configured.

## Architecture
- Frontend entrypoint is `src/main.tsx`; the app is mostly in `src/App.tsx` with styles in `src/styles.css`.
- Cloudflare Pages API entrypoint is `functions/api/[[path]].ts`, which delegates all API routing to `src/api/router.ts`.
- `functions/_middleware.ts` protects static files under `/pages/` with the same session check used by the API.
- API data access and external Open-Meteo/weather caching live in `src/api/data.ts`; schema and seed data live in `migrations/0001_initial.sql`.
- Module definitions are hard-coded in `src/api/modules.ts`; D1 only stores enabled/position overrides.
- Editable pages are served through `/page/:slug`; static launchers live under `public/pages/` and are linked from D1 `page_links`.

## Gotchas
- Login depends on `ADMIN_PASSWORD_HASH`; without it `/api/auth/login` returns 503.
- Session cookies are named `fp_session`; session records are stored hashed in the `sessions` D1 table.
- Weather cache TTL is 45 minutes and marine/tide cache TTL is 6 hours in the D1 `cache` table, so data changes may not show immediately.
- Tide data is approximate Open-Meteo marine model output, not official tide-table data.
