# Project Goals, Aims, and Purpose

## Original Note

I want a document to record the goals aims and purpose of this tool so it can stay consistent and we have an anchor for what is desired.

I want the tool to be a ubiquitous home hub that can be as complex or simple as the user installing it wants, with in depth customisation options and a great UI.

Should be a tool a household can use to check/store whatever information is important to them e.g. Tide times for coastal homes, weather, wind, waves for people who go to sea, UV options, Pollen, Notes, lists, goals, savings, reminders, calendar type implementations, maybe some kind of picture gallery (with images hosted externally e.g. Gdrive) like a cute polaroid display or memory slideshow, a way to leave hand written notes, saving important links, movie to watch list, listen to this music.

Easy for devs to create new modules.

All hosted free either via Cloudflare free, hosted locally, minimal version hostable on router somehow (if possible), possibly in the future could have certain features available if hosted on a more powerful service with storage and gives the home hub more capability/power/storage attached.

## Goal

Create a canonical product-purpose document for Frog & Peach Home Hub so future implementation work has a stable reference for what the app is, what it should optimize for, and what should stay out of scope.

The implementation should add a practical repo document, link it from existing documentation surfaces, and optionally expose it from the current Admin review/deployment area. It should not implement new modules such as pollen, gallery, calendar, or reminders. Those examples should be captured as future module categories and product direction, not built in this task.

The document should make the project direction clear enough that another coding agent can use it when deciding:

- whether a proposed feature fits Frog & Peach,
- whether a feature belongs in an existing module or a new built-in module,
- how much complexity is acceptable for a household hub,
- how to think about free Cloudflare hosting, local hosting, and static/router-limited deployments,
- which privacy and security constraints must remain intact.

## Current State

Frog & Peach is currently a Cloudflare Pages + D1 home hub with a React 19 + TypeScript + Vite frontend and Cloudflare Functions backend.

Relevant current architecture:

- `README.md` describes the app as a private-by-default modular home hub and lists current included modules.
- `docs/modular-hub-upgrade-plan.md` records recent module/admin architecture progress, but it is a checkpoint/progress document rather than a durable product north-star.
- `docs/cloudflare-hosting.md`, `docs/router-hosting.md`, and `docs/site-review.md` cover hosting and review concerns, but not the broader product purpose.
- `Notes/` contains rough planning drafts. `Notes/README.md` explicitly says these drafts are not the source of truth for shipped behavior.
- `src/api/modules.ts` is the hard-coded built-in module registry. Adding a new module is currently a code change here.
- `src/App.tsx` owns all app state, tab navigation, dashboard rendering, editable page UI, notes UI, lists UI, and the Admin panel.
- `src/shared/api-types.ts` defines the frontend API contracts for modules, settings, pages, lists, notes, weather, tides, network, users, and activity.
- `migrations/0001_initial.sql` and later migrations define D1 tables for settings, module settings, notes, lists/list items, pages/page links, cache, users, sessions, activity log, and auth rate limiting.
- The app already supports household-facing content through Notes, Lists, editable markdown Pages, and discovered custom static pages.
- The app already supports deployment guidance and admin review links inside `AdminPanel` in `src/App.tsx`.

Current built-in modules in `src/api/modules.ts`:

- Weather: current conditions and forecast from Open-Meteo.
- Tides: approximate tide events from Open-Meteo marine data or a configured external tide API.
- Lists: shared household lists, shopping lists, goals, daily checklists, and weekly chore checklists.
- Notes: pinned and tagged shared markdown notes.
- Pages: editable markdown pages and discovered custom static pages.
- Network: Wi-Fi sharing, deployment/router/admin links, usage, and device overview.
- Admin tools: users, modules, appearance, household settings, cache, site review, deployment, and activity.

Current limitations relevant to this plan:

- There is no single durable document that states the product principles, audience, module strategy, hosting strategy, and scope boundaries.
- Some product intent is implied across `README.md`, `docs/modular-hub-upgrade-plan.md`, `docs/router-hosting.md`, and rough notes, but future agents must infer it.
- The current module system is built-in and code-defined, not a third-party plugin/package runtime.
- The existing Pages and Notes features are for household content, not necessarily project/product governance docs.
- Router-only hosting is documented as limited/static; the full app requires Cloudflare Pages Functions or another Worker-like runtime plus D1.

## Proposed Behavior

Add a new canonical product-purpose document under `docs/`, likely `docs/project-purpose.md`.

The document should be written as a stable project reference, not as a speculative feature wishlist. It should preserve the original intent:

- Frog & Peach should be a ubiquitous household hub.
- It should be useful for simple and complex households.
- It should be deeply customizable without becoming confusing.
- It should have a strong, polished UI.
- It should support household-specific information, not only generic productivity.
- It should make new built-in modules straightforward for developers to add.
- It should remain viable on free or low-cost hosting where possible.

The document should also reflect the repo's current reality:

- The first-class runtime target is Cloudflare Pages + Functions + D1.
- Local full-stack development uses `npm run build && npm run dev:worker` on port `8788`.
- Vite-only development on port `5173` does not provide API/D1 behavior.
- The current architecture uses built-in modules registered in `src/api/modules.ts`.
- Fully external third-party module packages are future/deferred, not current behavior.
- Security constraints from `AGENTS.md` remain non-negotiable.

The implementation should link the new document from:

- `README.md`, in a short "Product Direction" or "Project Purpose" section.
- `docs/modular-hub-upgrade-plan.md`, as the durable purpose reference that complements the checkpoint/progress note.
- Optionally `src/App.tsx`, inside the existing Admin "Site review" or "Deployment" links area, so an admin/developer running the app can open the purpose doc from the UI.

Do not add any new D1 tables, API routes, auth behavior, module registry entries, or household content seed data for this task unless the implementing agent explicitly chooses the optional Admin link and needs only static-link UI changes.

## UX Details

This is primarily a documentation feature.

If the optional Admin link is added in `src/App.tsx`, keep it consistent with the existing Admin review/deployment link rows:

- Place it near the current "Site review" links in `AdminPanel`.
- Use the same `.plain-row` link style already used for:
  - `/docs/site-review.md`
  - `/docs/cloudflare-hosting.md`
  - `/docs/router-hosting.md`
- Link target should be `/docs/project-purpose.md`.
- Link label should be concise, for example `Project purpose`.
- Supporting text should explain the value without becoming marketing copy, for example `Goals, scope, module direction, and hosting principles`.
- Do not introduce new navigation, a client-side router, modal, or editable page for this document.

The document itself should be easy to scan. Suggested top-level sections:

- Purpose
- Audience
- Product Principles
- What the Hub Should Support
- Module Strategy
- Customisation Strategy
- Hosting Strategy
- Privacy and Security Principles
- Current Scope
- Future Direction
- Non-Goals
- How Future Agents Should Use This Document

Tone should be practical and directive. Avoid vague phrases like "maybe support everything"; capture examples as candidate module families with scope notes.

## Backend and Data Changes

No backend or D1 changes are expected.

Do not change:

- `src/api/router.ts`
- `src/api/data.ts`
- `src/api/auth.ts`
- `src/shared/api-types.ts`
- `functions/api/[[path]].ts`
- `functions/_middleware.ts`
- `migrations/*`

The new document should be a static Markdown file under `docs/`. Vite/Cloudflare Pages will serve files in `docs/` from the built app only if the project already includes/copies that path into the deployment output. The existing Admin UI already links to `/docs/site-review.md` and `/docs/cloudflare-hosting.md`, so the implementation should follow that current convention rather than inventing a new docs-serving path.

If a future implementation discovers that `docs/` files are not available in the deployed `dist`, handle that separately as a docs-serving bug. It should not block creating and linking this purpose document because existing app links already assume docs URLs.

## Exact Files Likely To Change

Expected files:

- `docs/project-purpose.md`
  - New canonical product-purpose document.
  - This is the main deliverable.

- `README.md`
  - Add a short link to `docs/project-purpose.md`.
  - Keep the README concise; do not duplicate the whole purpose document.

- `docs/modular-hub-upgrade-plan.md`
  - Add a short reference near the top or in the checkpoint summary that future module work should use `docs/project-purpose.md` for product direction.
  - Avoid rewriting the progress history.

Optional file:

- `src/App.tsx`
  - Add a single Admin link to `/docs/project-purpose.md` in the existing review/deployment documentation link area.
  - Do not otherwise change app behavior.

Probably unnecessary files:

- `src/styles.css`
  - Only needed if the existing `.plain-row` link styles cannot accommodate the optional Admin link. Expected not to change.

- `src/api/*`, `src/shared/*`, `functions/*`, `migrations/*`, `e2e/*`
  - No changes expected because this is not a runtime feature.

## Implementation Plan

1. Create the canonical document.
   - Add `docs/project-purpose.md`.
   - Write it as the durable source for product intent.
   - Keep it specific to Frog & Peach and the current repository.
   - Include the current runtime target: Cloudflare Pages + Functions + D1.
   - Include local/static/router hosting limitations.
   - Include current built-in module families and future candidate module families.

2. Capture product principles.
   - State that the hub is private by default and household-first.
   - State that a simple install should stay useful with minimal setup.
   - State that complex households should be able to enable deeper customisation over time.
   - State that UI quality matters: dense enough for repeated use, clear enough for non-technical household members.
   - State that modules should be optional, understandable, and removable without damaging unrelated data.

3. Capture module strategy.
   - Explain that current modules are built-in registry entries in `src/api/modules.ts`.
   - Explain that adding a new module is currently a code change touching frontend, API/data code if needed, shared types, tests, and possibly migrations.
   - Explain that external third-party module packages are a future direction, not a current requirement.
   - Group future examples from the rough note into module families:
     - Environment: weather, tides, wind, waves, UV, pollen.
     - Household memory: gallery, slideshow, externally hosted images, handwritten notes.
     - Planning: reminders, calendars, goals, savings.
     - Shared media and links: watch list, music links, important links.
   - Note that any module using external services should handle missing credentials and upstream failures gracefully.

4. Capture customisation strategy.
   - Explain the target balance: simple default dashboard plus admin-configurable modules, layout, themes, and display modes.
   - Reference the existing theme system: `src/theme/`, `themes/<name>/theme.json`, optional `theme.css`, and generated `public/themes/`.
   - Reference existing module settings persistence through `module_settings.options_json`.
   - State that theme and module customisation should not require JavaScript in user-provided themes.

5. Capture hosting strategy.
   - Define full app target: Cloudflare Pages + Functions + D1.
   - Define local target: `npm run build && npm run dev:worker` on `http://localhost:8788`.
   - Define limited static/router target: only static assets/custom pages can work; login, notes, lists, settings, cache, and D1-backed modules require an API/runtime.
   - Mention that more powerful hosting could unlock future storage-heavy features such as media handling, but the base product should remain useful on free or low-cost hosting.

6. Capture security and privacy boundaries.
   - Re-state the existing constraints from `AGENTS.md` at a product level:
     - Raw session tokens must not be stored in D1.
     - Admin actions require timed re-auth/admin unlock.
     - Mutating API routes must keep trusted origin checks.
     - Login/admin-unlock rate limiting must remain D1-backed.
     - Private household details should not be exposed on public pages.
   - Keep this section high-level but concrete enough to guide future feature choices.

7. Add lightweight references.
   - Add a short link in `README.md`, preferably after the opening description or "What It Includes".
   - Add a short cross-reference in `docs/modular-hub-upgrade-plan.md`.
   - If adding the optional Admin link, update the existing `AdminPanel` docs link area in `src/App.tsx` only.

8. Verify the documentation.
   - Proofread for consistency with the current repo.
   - Ensure all referenced files/commands exist.
   - Ensure the document does not claim that unimplemented modules already exist.
   - Ensure it does not promise external plugin loading as current behavior.

9. Run checks appropriate to the change.
   - For docs-only changes, no unit tests are required.
   - If `src/App.tsx` is changed for the optional Admin link, run `npm run build`.
   - If only Markdown files and `README.md` changed, a build is optional but useful.

## Acceptance Criteria

- `docs/project-purpose.md` exists and is the clear canonical source for Frog & Peach product intent.
- The document preserves the original note's intent around a ubiquitous, customizable, household-first home hub.
- The document accurately describes the current app architecture and does not imply that unbuilt modules already exist.
- The document distinguishes current built-in modules from future candidate module families.
- The document explains that new modules are currently code-defined in `src/api/modules.ts`.
- The document includes practical guidance on Cloudflare, local, and limited static/router hosting.
- The document includes privacy/security principles consistent with the existing app constraints.
- `README.md` links to the new purpose document.
- `docs/modular-hub-upgrade-plan.md` references the purpose document as the durable direction source.
- If the optional Admin link is implemented, it appears in the existing Admin documentation links without changing auth, routing, or data behavior.
- No D1 migrations, API routes, auth changes, or module registry changes are added for this task.
- `npm run build` passes if any TypeScript/React file is edited.

## Test and Verification Notes

Documentation verification:

- Read `docs/project-purpose.md` end to end and confirm it is implementation-neutral but specific enough to guide future work.
- Check that every referenced repo path exists:
  - `src/App.tsx`
  - `src/api/modules.ts`
  - `src/api/router.ts`
  - `src/api/data.ts`
  - `src/shared/api-types.ts`
  - `src/theme/`
  - `themes/`
  - `docs/cloudflare-hosting.md`
  - `docs/router-hosting.md`
  - `docs/modular-hub-upgrade-plan.md`
- Check that the document does not call future examples such as UV, pollen, gallery, handwritten notes, reminders, calendar, savings, movies, or music "current" features.
- Check that current features listed in the document match `README.md` and `src/api/modules.ts`.

Command verification:

For docs-only implementation:

```bash
npm run build
```

This is optional for Markdown-only changes but useful because README/Admin docs links may rely on build output behavior.

If `src/App.tsx` is changed:

```bash
npm run build
```

Then optionally run the full local app:

```bash
npm run dev:worker
```

Open `http://localhost:8788`, sign in, unlock Admin, and verify the new `Project purpose` link appears beside the existing documentation links and opens `/docs/project-purpose.md`.

No Playwright E2E test is required for a docs-only implementation. If an Admin UI link is added and the project wants automated coverage, add a small assertion to an existing admin-oriented E2E flow, but avoid mutating D1 just to test a static link.

## Open Questions

- Should `docs/project-purpose.md` be exposed in the running app via an Admin link, or is a README/docs-only reference enough for the first pass? This should not block implementation; default to adding the README and docs references, and add the Admin link if the change remains a one-line static link.
- Should the future module strategy eventually become a formal developer guide, separate from the product-purpose document? This should not block implementation; the purpose document can point to `src/api/modules.ts` for now.
