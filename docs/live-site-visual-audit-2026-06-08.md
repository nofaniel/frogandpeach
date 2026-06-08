# Live Site Visual Audit - 2026-06-08

Target: `https://frog-peach-home-hub.pages.dev`

Method: Playwright browser pass against the live Cloudflare Pages deployment, using the configured Codex test account from `.dev.vars`. Desktop viewport was `1440x1000`; mobile viewport was `393x851`. The pass was read-only apart from login/admin-unlock attempts.

Artifacts:

- `output/playwright/live-auth-2/authenticated-audit.json`
- `output/playwright/live-auth-2/desktop-home.png`
- `output/playwright/live-auth-2/mobile-home.png`
- `output/playwright/live-auth-2/desktop-network.png`
- `output/playwright/live-auth-2/mobile-network.png`
- `output/playwright/live-auth-2/desktop-admin-locked.png`
- `output/playwright/live-auth-2/mobile-admin-locked.png`

## Coverage

- Public logged-out landing/login screen.
- Authenticated Home, Lists, Notes, Pages, and Network tabs.
- Mobile and desktop responsive states.
- Admin unlock modal from the live account.
- Protected docs/page/API routes while logged out.

Admin settings were only partially covered. The Codex test account can sign in to the live site, but admin unlock returns `401 Invalid admin credentials`, so settings controls behind admin unlock were not verified on production.

## Confirmed Findings

### Literal question-mark symbols on the home dashboard

The weather and tide cards show literal placeholder symbols:

- Weather metrics render as `? 14° ? 11°`, `?? 20 km/h`, `?? 100%`, and `?? 0 mm`.
- Tide card renders a small `??` mark in the top-right badge.

The symbols are not a browser/font rendering failure. They come from hardcoded React output in `src/App.tsx`:

- Weather metrics: `src/App.tsx:925-928`
- Tide mark: `src/App.tsx:956` and `src/App.tsx:974`
- Starred home-list prefix also uses `? ` at `src/App.tsx:1045`, while the full list page uses `★`.

Plan note: replace these with text labels, stable Unicode symbols already used elsewhere, or CSS/lucide-style icon components. The weather row should read as real metrics, for example `High 14°`, `Low 11°`, `Wind 20 km/h`, `Rain 100%`, `Precip 0 mm`.

### Live visual direction is inconsistent

The login screen uses a stark neutral/tech style, while the authenticated app uses a cream-and-serif Frog & Peach style. The transition feels like two different products.

Code context:

- Base/theme tokens define the Frog & Peach theme as Georgia serif in `themes/frog-peach/theme.json:20-23`.
- A later CSS block overrides the authenticated shell with `Aptos`/`Trebuchet MS` and app-specific colors in `src/styles.css:1287-1308`.
- Individual weather/tide styles then mix green gradient cards, heavy uppercase labels, serif headings, and mono labels.

Plan note: decide one product direction for the authenticated app. Either bring login into the Frog & Peach theme, or make the authenticated app less editorial/serif. Avoid mixing hardcoded app fonts with theme tokens unless the theme system is intentionally bypassed.

### Desktop layout is constrained like a mobile app

On desktop, the authenticated app is capped to about `568px` wide, leaving a large amount of unused horizontal space. The bottom nav is fixed and spans the viewport, which makes desktop feel like an enlarged phone UI.

Code context:

- `.app-shell` is capped at `width: min(568px, calc(100% - 32px))` in `src/styles.css:1303`.
- `.app-shell` gets `112px` bottom padding in `src/styles.css:1305`.
- `.tab-bar` is fixed to the bottom of the viewport in `src/styles.css:1364-1376`.

Plan note: keep bottom nav on mobile only. On desktop, use the configured top-nav layout or a wider dashboard grid with a normal sticky/header nav. The home dashboard cards can still use compact cards without forcing the whole shell into a phone width.

### Fixed bottom nav occludes content

In both desktop and mobile screenshots, the fixed nav overlays the middle of full-page screenshots and visually cuts through cards when the page is captured/scrolled. This is especially visible on the home dashboard where the nav crosses the Lists/Notes area.

Plan note: use bottom nav only below a mobile breakpoint, reserve enough bottom padding for every scrollable view, and consider a non-overlapping sticky footer container. Desktop should not use the fixed bottom bar.

### Typography is visually harsh in several places

Heavy weights and uppercase treatments make small utility text feel loud:

- Tab labels: `font-weight: 800`, uppercase, letter spacing in `src/styles.css:1379-1391`.
- Weather place label: `font-weight: 900`, `letter-spacing: 0.12em` in `src/styles.css:1428-1435`.
- Tide section labels: `font-weight: 900`, uppercase in `src/styles.css:1610-1618`.
- Large serif headings such as `Starred first`, `Pinned & recent`, and deployment host dominate small cards.

Plan note: reduce utility labels to semibold, reduce uppercase usage, and scale card headings down. Keep hero-scale typography out of compact dashboard cards.

### Missing or placeholder info appears in Network

Network shows:

- Usage as `--`
- Connected devices as `0 configured`
- Router/device details hidden behind admin unlock

Some of this is expected, but the visual result reads incomplete. The page also exposes an Admin button to the test account, but admin unlock fails with `Invalid admin credentials`.

Plan note: distinguish expected empty state from missing data. For non-admin users, hide admin-only affordances or label them clearly as requiring an admin account. For empty network data, show a purposeful empty state instead of a bare `--`.

### Notes content quality affects perceived polish

The live Notes widget contains visible text `Kiss alipse`, which looks like a typo. This is data content rather than a rendering bug, but it contributes to the "missing info / not polished" impression.

Plan note: seed/demo content should be reviewed separately from UI work. Consider a small admin-only content cleanup pass on production.

### Docs links are questionable on the live site

The app links to repo docs such as `/docs/cloudflare-hosting.md` and `/docs/theming.md`. Logged-out requests are served through the login shell; authenticated access from the deployment widget should be rechecked after the next pass.

Code context:

- Deployment docs link: `src/App.tsx:1144`
- Theming docs link: `src/App.tsx:1634`

Plan note: if these docs are intended to be available from the deployed app, copy them into `public/docs/` during build or replace them with in-app help pages.

## Improvement Plan Notes

1. Fix literal `?`/`??` UI text first. This is the most visible bug and has a small code surface.
2. Split responsive layout behavior: mobile bottom-nav app shell below the breakpoint; wider desktop layout above it.
3. Reconcile the visual system with theme tokens. Remove or scope the hardcoded app-style CSS block so it does not fight the selected theme.
4. Soften card typography: smaller headings, fewer uppercase labels, less 800/900-weight text.
5. Rework Network empty/admin-locked states so `--` and `0 configured` read as intentional, not broken.
6. Re-run Playwright screenshots after changes for desktop and Pixel-sized mobile.
7. If admin settings must be reviewed on production, use a true admin account or verify against local `:8788` with an admin-seeded D1 instead of the live member-like test account.
