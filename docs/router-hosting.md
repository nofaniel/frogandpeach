# Router Hosting

Most consumer routers can only serve static files, if they can host anything at all. That is enough for a copied mini site, but not for the full Frog & Peach app.

The full app needs:

- Cloudflare Pages Functions or another worker/server runtime for `/api/*`.
- A D1 database binding named `DB`.
- Session cookies and password hashing support in the worker runtime.
- Scheduled npm build steps if you want `custom-pages/` discovery.

Practical options:

- Use Cloudflare Pages plus D1 for the full app.
- Run the app on a local machine, NAS, or OpenWrt-class device that can run Node/Wrangler and expose `npm run dev:worker`.
- For a router-only static setup, copy only the generated `dist` assets and any `public/custom-pages` output. Login, notes, lists, settings, weather cache, and D1-backed pages will not work in that mode.
