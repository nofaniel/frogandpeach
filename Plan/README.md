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

## Entries

1. `01-hover-tooltips-weather-info.md`
2. `02-tide-module.md`
3. `03-module-settings-customisation.md`
4. `04-project-goals-aims-purpose.md`
5. `05-ui-display-modes.md`
6. `06-admin-mode.md`
7. `07-site-text-content-cleanup.md`
8. `08-notes-module.md`
9. `09-list-module.md`
10. `10-network-module.md`
11. `11-little-notes.md`
12. `11-settings.md`
13. `12-brainstorm.md`
14. `13-repo-update.md`
