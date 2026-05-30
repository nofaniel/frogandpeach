# Cloudflare Hosting

Frog & Peach is designed for Cloudflare Pages with Pages Functions and D1.

## Setup

1. Install dependencies with `npm install`.
2. Create the D1 database: `npx wrangler d1 create frog-peach-db`.
3. Put the returned database id into `wrangler.toml`.
4. Apply migrations locally with `npm run cf:migrate:local`, or remotely with `npm run cf:migrate:remote`.
5. Build with `npm run build`.
6. Deploy with `npm run cf:deploy`.
7. Open the deployed site and complete first-run admin setup.

## Required Binding

`wrangler.toml` binds D1 as:

```toml
[[d1_databases]]
binding = "DB"
database_name = "frog-peach-db"
database_id = "replace-with-cloudflare-d1-id"
```

## References

- [Cloudflare Pages overview](https://developers.cloudflare.com/pages)
- [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Pages configuration and D1 bindings](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Workers and D1 free-plan pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
