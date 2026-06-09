# Plan Workspace

This folder stores implementation plans for Frog & Peach Home Hub. Each markdown file is both a planning document and the source of truth for implementing that plan.

## Agent Instructions

- Use the specific plan file named by the user. Do not substitute a different plan file or work from memory.
- Read the plan file fully before editing code. Cross-check it against `AGENTS.md` and the current repo state.
- Before implementation, ask clarifying questions and challenge assumptions enough to confirm the intended outcome, scope, UX, data model, verification path, and any tradeoffs. Be direct and specific; do not rubber-stamp ambiguous plans.
- If the plan is incomplete, update the same plan file before coding so it includes:
  - Goal
  - Current state
  - Proposed behavior
  - UX details
  - Backend or data changes, if any
  - Acceptance criteria
  - Test and verification notes
  - Open questions or decisions
- Implement the plan end to end. Frontend, backend, D1 migrations, shared types, theme changes, tests, and docs should all be handled when the selected plan requires them.
- Keep implementation scoped to the selected plan. Avoid unrelated refactors unless they are needed to complete the work safely.
- Follow the repo architecture in `AGENTS.md`, especially `src/App.tsx`, `src/api/`, `src/shared/api-types.ts`, `src/theme/`, `src/styles.css`, `migrations/`, and `e2e/`.
- Run the appropriate verification for the work. At minimum, run `npm test` and `npm run build`; use the full-stack `:8788` worker and Playwright E2E when the plan touches API, auth, D1, or user-facing flows that need browser verification.
- When implementation is complete, rename the plan file by adding `DONE` to the filename, for example `02-tide-module.md` becomes `02-tide-module-DONE.md`.
- Also add a concise completion section to the plan file with a new heading. Include what was done, how well the implementation went, what has been set up, and any remaining caveats.
- Do not mark a plan `DONE` until implementation and verification are complete.

## Completion Section Template

```md
## Implementation Completed

- Work done: ...
- Implementation result: ...
- Setup and verification: ...
- Remaining notes: ...
```

## Active Entries

1. `02-tide-module.md`
2. `05-ui-display-modes.md`
3. `09-list-module.md`
4. `11-little-notes.md`
5. `12-brainstorm.md`
6. `13-repo-update.md`

## Archived Completed Entries

Completed plans live in `Archive/`.

1. `Archive/01-hover-tooltips-weather-info-DONE.md`
2. `Archive/03-module-settings-customisation-DONE.md`
3. `Archive/04-project-goals-aims-purpose-DONE.md`
4. `Archive/06-admin-mode-DONE.md`
5. `Archive/07-site-text-content-cleanup-DONE.md`
6. `Archive/08-notes-module-DONE.md`
7. `Archive/10-network-module-DONE.md`
8. `Archive/11-settings-DONE.md`
9. `Archive/14-break-monolith-DONE.md`
