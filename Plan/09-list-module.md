# List Module

## Goal

Make Lists feel like a useful household reminder-board workspace rather than one generic checkbox list with different labels. Each list type should have a clear purpose, type-specific item fields, useful status signals, and a simple creation flow that helps users choose the right kind of list for the job.

The first implementation should support practical kitchen-board list types:

- Shopping list: items with quantity and optional category.
- Daily checklist: recurring tasks that reset each day and warn when yesterday was missed.
- Weekly chore checklist: recurring household tasks that reset weekly and warn when last week was missed.
- Deadline list: tasks with due dates and overdue/soon status.
- Life goal list: longer-running goals with optional target date and progress/status.
- Basic list: plain shared list for everything else.

## Current State

- The app is a Cloudflare Pages + D1 app with a React 19 + TypeScript + Vite frontend and Cloudflare Workers runtime backend.
- Navigation is local React state in `src/App.tsx`; there is no client-side router for the Lists tab.
- Lists state currently lives in `src/App.tsx` as `lists`, `listDraft`, and `itemDrafts`.
- Boot and refresh load list data through both:
  - `api<HomeData>('/api/home')`, which includes `home.lists` and `home.listTypes`.
  - `api<SharedList[]>('/api/lists')`, which loads the full Lists tab data.
- The Lists tab UI in `src/App.tsx` currently renders:
  - A `form.panel.form-panel` headed by `New list`.
  - A list name input with placeholder `Big shop, chores, goals...`.
  - A list type `<select>` populated from `home?.listTypes`.
  - `Add list`, `Star` / `Unstar`, `Delete`, one plain `Add item` text input per list, checkboxes, and item delete `x` buttons.
- The home dashboard Lists widget is rendered in `src/App.tsx` by `renderHomeModule(...)` for `module.id === 'lists'`.
  - `getHomeListEntries(...)` ranks starred and active lists using incomplete item count and `updatedAt`.
  - The widget currently shows open counts but does not surface overdue, missed, shopping quantity, or reset warnings.
- Existing list type definitions are in `src/shared/lists.ts`:
  - `basic`
  - `shopping`
  - `life_goal`
  - `daily_checklist`
  - `weekly_chore`
- `src/shared/lists.ts` already implements reset helpers:
  - `normaliseListType(...)`
  - `resetKeyForListType(...)`
  - `shouldRefreshList(...)`
  - Daily lists use `YYYY-MM-DD` reset keys.
  - Weekly chore lists use ISO week reset keys.
- Shared API contracts are in `src/shared/api-types.ts`.
  - `ListItem` currently exposes `id`, `text`, `done`, `completedAt`, user display names, and no `listId`, `quantity`, `dueDate`, `category`, `status`, or item metadata.
  - `SharedList` exposes `id`, `name`, `listType`, `resetKey`, `metadata`, user display names, `updatedAt`, and `items`.
  - `ListType` exposes `id`, `title`, `description`, and `reset`.
- Backend list routing is hand-rolled in `src/api/router.ts`.
  - `GET /api/lists`
  - `POST /api/lists`
  - `POST /api/lists/:id/items`
  - `PATCH /api/lists/:id`
  - `DELETE /api/lists/:id`
  - `PATCH /api/items/:id`
  - `DELETE /api/items/:id`
- D1 list persistence is implemented in `src/api/data.ts`.
  - `listLists(env)` calls `refreshPeriodicLists(env)` before returning lists.
  - `createList(...)` normalises list type and stores list metadata JSON.
  - `updateList(...)` supports name, list type, and list metadata updates.
  - `createListItem(...)` currently accepts only plain text.
  - `updateListItem(...)` currently supports only text and done.
  - `refreshPeriodicLists(...)` resets completed state for daily and weekly lists when their reset key changes, and writes `metadata.lastResetAt` and `metadata.lastResetKey`.
- D1 schema for generalized lists was introduced in `migrations/0002_modular_hub.sql`.
  - `lists` has `id`, `name`, `list_type`, `reset_key`, `metadata_json`, created/updated user ids, and timestamps.
  - `list_items` has `id`, `list_id`, `text`, `done`, `completed_at`, created/updated user ids, and timestamps.
  - There is no item-level metadata column yet.
- Activity logging already records list and item create/update/delete operations in `src/api/router.ts`.
- Existing tests:
  - `src/shared/lists.test.ts` covers list type normalisation and reset key behavior.
  - `src/api/data.test.ts` has fake DB coverage for preserving list metadata when starring a list.
  - `e2e/content-crud.spec.ts` creates a list, adds a plain item, checks it, deletes the item, and deletes the list.
  - `e2e/home.spec.ts` verifies starred list ordering in the home Lists widget.
- CI runs `npm test` and `npm run build`.
- E2E tests are not in CI. They require a live full-stack instance with `E2E_BASE_URL=http://localhost:8788`, `TEST_USERNAME`, and `TEST_PASSWORD`.

## Proposed Behavior

- Keep Lists as one module and one Lists tab, but make the selected list type drive item fields, copy, status, and empty states.
- Add one new list type, `deadline`, for household tasks with due dates. This avoids overloading `basic` or `life_goal` for time-sensitive tasks.
- Keep existing list type ids stable. Do not rename `daily_checklist` or `weekly_chore`, because existing persisted rows use those ids.
- Update list type definitions so every type has a user-facing purpose:
  - `basic`: quick shared list with plain items.
  - `shopping`: groceries and supplies with quantity and optional category.
  - `deadline`: tasks with due dates, overdue warnings, and soon status.
  - `daily_checklist`: recurring daily must-do tasks that reset each day and show missed-yesterday warning after reset.
  - `weekly_chore`: recurring weekly household chores that reset each ISO week and show missed-last-week warning after reset.
  - `life_goal`: longer-running goals or projects with optional target date and progress/status.
- Add type-specific item metadata while preserving the existing `text` and `done` fields:
  - `quantity?: string`
  - `category?: string`
  - `dueDate?: string`
  - `targetDate?: string`
  - `progress?: string`
  - `notes?: string`
  - `missedOnLastReset?: boolean`
  - `lastCompletedAt?: string`
- Store flexible item-specific fields in a new D1 `list_items.metadata_json` column instead of adding many nullable columns.
- Expose item metadata and computed status in the shared API contract:
  - `metadata: Record<string, unknown>`
  - `status?: 'open' | 'done' | 'overdue' | 'due_soon' | 'missed'`
  - `statusLabel?: string`
- For periodic lists, reset behavior should mark whether each item was missed before clearing it:
  - If an item was not done at reset time, set `metadata.missedOnLastReset = true`.
  - If an item was done at reset time, set `metadata.missedOnLastReset = false` and preserve `metadata.lastCompletedAt`.
  - Then clear `done` and `completed_at` as the app already does.
- Keep regular authenticated session requirements unchanged. Lists are ordinary authenticated content; they do not require admin unlock.
- Keep mutating routes protected by the existing Origin checks and session requirements.

## UX Details

- Lists tab structure:
  - Add a compact toolbar above the list cards with:
    - Search/filter input for list names and item text.
    - Type filter select with `All types` plus each list type.
    - Optional sort select with `Needs attention`, `Recently updated`, and `A-Z`.
  - Keep the existing `workspace-grid`, `panel`, `form-panel`, `list-panel`, `inline-form`, `.items`, `.ghost`, `.danger`, and `.icon-button` conventions from `src/styles.css`.
  - Avoid adding a new icon dependency just for this work. Use existing button styles and accessible text/glyphs.
- New list form:
  - Keep heading `New list`.
  - Replace the raw type select-only choice with a clearer type picker area:
    - Show type title and description for the selected type.
    - Include short examples, such as `Milk x2`, `Bins out`, `Council tax by Friday`, or `Paint hallway`.
  - Keep the name input, but update placeholder copy if needed to suit the new list type descriptions.
- List cards:
  - The metadata row should show the type title, reset period if applicable, last reset/missed state if applicable, and updated-by display name when present.
  - Starred lists should keep the existing star behavior via `list.metadata.starred`.
  - Add a type-specific empty state inside each list, for example:
    - Shopping: `Add groceries, household supplies, or things to pick up.`
    - Daily checklist: `Add tasks that should be done every day.`
    - Weekly chore checklist: `Add chores that should be done each week.`
    - Deadline list: `Add tasks with due dates.`
    - Life goal list: `Add milestones or next steps.`
    - Basic list: `Add anything the household needs to remember.`
- Item creation:
  - Keep a fast single-line add flow for all types.
  - Show extra inline fields based on list type:
    - Shopping: item text, quantity, category.
    - Deadline: item text, due date.
    - Daily checklist: item text only, plus clear reset explanation.
    - Weekly chore: item text only, plus clear weekly reset explanation.
    - Life goal: item text, optional target date, progress/status.
    - Basic: item text only.
  - Use native `input type="date"` for due/target dates.
  - Use placeholders, visible labels, or `aria-label`s that preserve Playwright-friendly accessible names.
- Item display:
  - Keep checkbox completion.
  - Show shopping quantity before or after item text, for example `2 x Milk`.
  - Show category as a small tag-like label for shopping items.
  - Show due/target date badges for deadline and life goal items.
  - Highlight overdue items with a danger/warning treatment.
  - Highlight due-soon items with a softer warning treatment.
  - Highlight missed recurring items after reset until the item is completed again.
  - Keep delete item as a compact `x` button with an accessible label like `Delete Milk`.
- Editing:
  - Add item edit support if it can be done without overexpanding `App.tsx`; otherwise scope the first pass to create/check/delete plus status display and leave edit as follow-up.
  - If implemented, edit mode should call `PATCH /api/items/:id` with `text`, `done`, and `metadata`.
- Home Lists widget:
  - Keep clicking a list row switching to the Lists tab.
  - Extend row summaries to surface attention states:
    - `2 overdue`
    - `1 missed yesterday`
    - `3 open`
    - `Shopping: 5 items`
  - In `starred` mode, still rank starred lists first, but within groups rank lists needing attention before ordinary recent lists.
  - In `active` mode, rank overdue/missed lists first, then incomplete lists, then recently updated lists.
- Responsive/accessibility:
  - Extra item fields must collapse cleanly on mobile.
  - Buttons must be real `<button>` elements with clear accessible labels.
  - Date/status color must not be the only signal; include text labels such as `Overdue`, `Due soon`, or `Missed yesterday`.

## Backend and Data Changes

- Add a migration after the current latest migration `migrations/0009_revoke_codex_test_account.sql`, likely `migrations/0010_list_item_metadata.sql`.
- Migration should add item metadata with a safe default:
  - `ALTER TABLE list_items ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';`
- Update `src/shared/lists.ts`:
  - Add `deadline` to `ListTypeId`.
  - Improve `listTypes` descriptions so each type has clear purpose and examples.
  - Keep reset values as `never`, `daily`, or `weekly`.
  - Consider adding helper metadata to each definition only if it stays frontend/backend shared and simple, for example `itemFields` or `attentionLabel`. Avoid large UI schemas unless the implementation needs them.
- Update `src/shared/lists.test.ts`:
  - Assert `deadline` normalises as a known type.
  - Keep unknown values falling back to `basic`.
  - Keep daily and weekly reset coverage.
- Update `src/shared/api-types.ts`:
  - Add metadata/status fields to `ListItem`.
  - If frontend code needs `listId`, expose it consistently because `toListItem(...)` already returns `listId` internally.
  - Keep `SharedList.metadata` as `Record<string, unknown>`.
- Update `src/api/data.ts`:
  - Change `createListItem(...)` to accept an object patch such as `{ text?: string; metadata?: unknown }` instead of only `text`.
  - Validate and normalise item metadata in a new helper, for example `normaliseListItemMetadata(listType, value)`.
  - Keep arbitrary metadata from becoming executable or unsafe. Accept plain JSON objects only, trim string fields, and reject arrays by normalising to `{}`.
  - For `quantity`, store a trimmed string so values like `2`, `2 kg`, `1 pack`, and `x3` can be represented without numeric parsing edge cases.
  - For dates, accept only `YYYY-MM-DD`; ignore invalid dates.
  - Update `toListItem(...)` to parse `metadata_json` and include computed `status` and `statusLabel`.
  - Compute item attention server-side enough for API callers and home data to agree:
    - `done` wins over overdue/missed.
    - For `deadline`, `dueDate < today` means `overdue`; `dueDate` today or tomorrow means `due_soon`.
    - For `life_goal`, use `targetDate` similarly but softer labels are fine.
    - For daily/weekly, `metadata.missedOnLastReset === true` means `missed` until completion.
  - Update `updateListItem(...)` to accept `metadata` as well as `text` and `done`.
  - When a daily/weekly item is completed after being marked missed, clear `missedOnLastReset`.
  - Update `refreshPeriodicLists(...)` to write missed metadata per item before clearing done state.
  - Keep `metadata.lastResetAt` and `metadata.lastResetKey` on the list as currently implemented.
- Update `src/api/router.ts`:
  - For `POST /api/lists/:id/items`, read the full JSON body, not only `text`.
  - Look up the parent list type before normalising item metadata, either in `createListItem(...)` or in the route.
  - For `PATCH /api/items/:id`, allow `metadata` in the patch.
  - Include useful metadata in activity logs, such as `listId`, `done`, and optionally item type/status. Do not log sensitive information.
- Update fake DB handling in `src/api/data.test.ts`:
  - Add `metadata_json` to fake list item rows.
  - Handle SQL for inserting/updating item metadata and for per-item reset updates.
  - Add focused tests for metadata preservation, due-date status, and missed recurring reset behavior.
- No auth schema changes are needed.
- No admin module settings changes are required unless the home Lists widget mode labels are adjusted in `src/api/modules.ts`.

## Files Likely to Change

- `src/shared/lists.ts`: add `deadline`, improve type descriptions, possibly add small shared helper functions for type behavior.
- `src/shared/lists.test.ts`: cover new type and preserve reset behavior tests.
- `src/shared/api-types.ts`: expose list item metadata/status fields and optionally `listId`.
- `migrations/0010_list_item_metadata.sql`: add `list_items.metadata_json`.
- `src/api/data.ts`: persist item metadata, compute item statuses, update periodic reset logic, normalise metadata.
- `src/api/router.ts`: pass full item create/update bodies to data functions.
- `src/api/data.test.ts`: extend fake DB and add data-level tests for metadata, status, and recurring misses.
- `src/App.tsx`: add type-aware list form, item add fields, item metadata display, filtering/sorting, and home widget summary/ranking changes.
- `src/styles.css`: add scoped styles for list type descriptions, item field rows, status badges, warning/danger states, and mobile layout.
- `e2e/content-crud.spec.ts`: extend list CRUD coverage for shopping quantity and/or deadline due date.
- `e2e/home.spec.ts`: adjust or add home Lists widget assertions for attention ranking.
- `src/api/modules.ts` and `src/api/modules.test.ts`: only if the Lists widget mode label/copy changes.

## Implementation Plan

1. Add the D1 migration:
   - Create `migrations/0010_list_item_metadata.sql`.
   - Add `metadata_json TEXT NOT NULL DEFAULT '{}'` to `list_items`.
   - Do not modify existing migrations.
2. Update shared list definitions:
   - Add `deadline` to `ListTypeId`.
   - Update `listTypes` titles/descriptions to explain when to use each type.
   - Keep reset semantics unchanged for existing types.
   - Update `src/shared/lists.test.ts`.
3. Extend shared API types:
   - Add `metadata`, `status`, and `statusLabel` to `ListItem`.
   - Add `listId` to `ListItem` if the frontend will use it or if TypeScript needs to match backend returns.
4. Extend backend metadata handling in `src/api/data.ts`:
   - Add `normaliseListItemMetadata(...)`, `normaliseDate(...)`, and a small status helper.
   - Update `createListItem(...)` to accept full item input and write `metadata_json`.
   - Update `updateListItem(...)` to merge/replace metadata deliberately. Prefer replacing with normalised metadata when `metadata` is provided, while preserving existing metadata when omitted.
   - Update `toListItem(...)` to parse metadata and return computed status fields.
5. Update recurring reset logic:
   - In `refreshPeriodicLists(...)`, fetch affected list items with metadata.
   - For each affected item, set `missedOnLastReset` based on whether it was incomplete before reset.
   - Preserve `lastCompletedAt` when an item was completed.
   - Clear `done` and `completed_at` after metadata has been updated.
   - Keep the list-level `lastResetAt` and `lastResetKey` metadata updates.
6. Update API routes:
   - Change `POST /api/lists/:id/items` to pass the whole body to `createListItem(...)`.
   - Ensure `PATCH /api/items/:id` accepts `metadata`.
   - Keep 404 behavior for missing lists/items.
   - Keep existing activity logging and add non-sensitive item metadata only where useful.
7. Add backend tests:
   - Metadata is stored and returned for a shopping item.
   - Deadline item status becomes `overdue` when due date is before today.
   - Deadline item status becomes `due_soon` for today/tomorrow.
   - Daily/weekly reset marks incomplete items as missed and completed items as not missed.
   - Completing a missed recurring item clears the missed flag.
8. Update frontend state in `src/App.tsx`:
   - Replace `itemDrafts: Record<string, string>` with a per-list draft object that can hold `text`, `quantity`, `category`, `dueDate`, `targetDate`, and `progress`.
   - Keep existing simple behavior for basic/daily/weekly lists.
   - Update `createItem(...)` to send `{ text, metadata }`.
   - Keep checkbox toggling through `PATCH /api/items/:id`.
9. Update Lists tab UI:
   - Add list search/type/sort controls.
   - Show selected list type descriptions in the new-list form.
   - Render type-specific add-item fields.
   - Render quantity/category/date/progress/status badges on items.
   - Add type-specific empty states.
   - Ensure mobile layout remains one-column and readable.
10. Update home Lists widget:
   - Add helper functions near `getHomeListEntries(...)` to count attention states.
   - Rank missed/overdue lists ahead of ordinary active lists within the existing starred/active modes.
   - Update summary text to mention overdue, missed, or shopping counts where applicable.
11. Update E2E tests:
   - Keep the existing plain create/complete/delete workflow passing.
   - Add a shopping list flow that enters quantity and confirms it appears on the item row.
   - Add a deadline list flow that enters a past due date and confirms `Overdue` appears.
   - Add or adjust home widget coverage only if ranking/copy changes are visible there.
12. Run verification:
   - `npm test`
   - `npm run build`
   - For API/UI behavior, use the full-stack runtime:
     - `npm run build`
     - `npm run dev:worker`
     - `E2E_BASE_URL=http://localhost:8788 TEST_USERNAME=admin TEST_PASSWORD=yourpassword npm run test:e2e`

## Acceptance Criteria

- Users can create each supported list type from the Lists tab and see a clear description of what that type is for.
- Shopping items can be created with quantity and display that quantity in the list.
- Deadline items can be created with a due date and display `Overdue` when the due date is before today.
- Daily checklist and weekly chore list items still reset automatically when their reset key changes.
- Incomplete daily/weekly recurring items are marked as missed after reset and show a visible warning until completed.
- Completing a missed recurring item clears the missed warning.
- Basic list items still work as they do today: add, check/uncheck, delete.
- Star/unstar and delete list behavior still works.
- Home Lists widget still links to the Lists tab and now prioritizes/summarizes lists needing attention.
- Existing API routes continue to return 404 for missing lists/items and 204 for successful deletes.
- Existing `e2e/content-crud.spec.ts` list CRUD test still passes after selector/copy updates.
- `npm test` and `npm run build` pass.

## Test and Verification Notes

- Run `npm test` for Vitest coverage. CI depends on this command.
- Run `npm run build` before any full-stack local worker testing. The `prebuild` scripts sync custom pages and themes.
- Apply the new local migration before full-stack manual/E2E testing:
  - `npm run cf:migrate:local`
- Use the full-stack worker for this feature because it touches API and D1:
  - `npm run build && npm run dev:worker`
  - Open `http://localhost:8788`.
- Do not use Vite-only `npm run dev` for final verification; API calls will 404.
- E2E requires explicit local env vars:
  - `E2E_BASE_URL=http://localhost:8788`
  - `TEST_USERNAME=admin`
  - `TEST_PASSWORD=yourpassword`
- E2E mutates D1 data. Never point it at production.
- Manual checks should include desktop and Pixel 7 mobile widths because Playwright config has both projects.
- Visual checks should verify:
  - Extra item fields do not overflow list cards.
  - Status badges are readable in the active theme.
  - Warning states include text, not color alone.
  - Home widget row text remains compact.

## Open Questions

- Assumption: `deadline` should be added as a new list type because the original note explicitly asks for lists with item deadlines, and no existing type cleanly owns that behavior.
- Assumption: Item metadata should be stored in `list_items.metadata_json` rather than adding several nullable columns. This matches existing `lists.metadata_json` and keeps future list types flexible.
- Assumption: Shopping quantity should be a string, not a number, so users can enter household-friendly values like `2 kg`, `1 pack`, or `x3`.
- Assumption: Daily missed warning should mean "incomplete before the most recent daily reset"; weekly missed warning should mean "incomplete before the most recent weekly reset."
- Follow-up option: Add item edit mode if the first implementation only supports type-specific item metadata at creation time.
- Follow-up option: Add more kitchen-board list types later, such as `meal_plan`, `packing`, `maintenance`, `birthdays`, or `borrowed_lent`, after the metadata/status foundation is in place.
