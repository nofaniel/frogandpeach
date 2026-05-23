# Frog & Peach Home Hub

Frog & Peach is a private-by-default modular home hub built for Cloudflare Pages and D1. It consolidates the earlier Express, Fastify/EJS, and React/Fastify prototypes into one app with a React/Vite frontend and Cloudflare Functions API.

## What It Includes

- Single-admin login for external hosting.
- Built-in modules for weather, tide trends, shopping lists, notes, editable markdown pages, static page launchers, settings, and deployment help.
- D1-backed persistence with migrations.
- Import tooling for the three legacy local app shapes.
- Open-Meteo weather and marine data with local cache records.

## Local Setup

```powershell
npm install
npm run hash-password -- "your-admin-password"
```

Create `.dev.vars`:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
APP_ORIGIN=http://localhost:8788
```

Create and migrate the local D1 database:

```powershell
npx wrangler d1 create frog-peach-db
npm run cf:migrate:local
```

Build the frontend and run the Cloudflare Pages emulator:

```powershell
npm run build
npm run dev:worker
```

Open `http://localhost:8788`.

## Development

The Vite-only dev server can render the frontend quickly:

```powershell
npm run dev
```

API calls need `wrangler pages dev` because they depend on Cloudflare bindings.

## Legacy Import

Generate an import SQL file from the old local apps:

```powershell
npm run import:legacy
```

The script reads:

- `N:\code\Frog&Peach\data\*.json`
- `N:\code\Frog&Peach-Claudisus\hub.db`
- `N:\code\Frog&Peach-Doceks\server\data\frog-peach.sqlite`

It writes `imports/legacy-import.sql`. Apply it with Wrangler after reviewing it:

```powershell
npx wrangler d1 execute frog-peach-db --local --file imports/legacy-import.sql
```

## Deployment Notes

Cloudflare Workers/Pages do not run the old Node `node:sqlite` server directly, so this project uses D1. Set `ADMIN_USERNAME` as an environment variable and `ADMIN_PASSWORD_HASH` as a Cloudflare secret before publishing. Keep everything private unless you intentionally add public page behavior later.
