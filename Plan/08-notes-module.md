# Notes Module

## Goal

Make the Notes tab feel like an editable household notes workspace rather than a raw Markdown capture form. Users should be able to create, edit, search, sort, pin/unpin, delete, and tag notes with small, clear controls and without needing to manually type Markdown syntax for common formatting.

## Current State

- The app is a Cloudflare Pages + D1 app with a React 19 + TypeScript + Vite frontend and Cloudflare Workers runtime backend.
- Navigation is local React state in `src/App.tsx`; there is no client-side router for the Notes tab.
- Notes state currently lives in `src/App.tsx` as `notes` and `noteDraft`.
- Boot and refresh load notes through `api<Note[]>('/api/notes')`.
- The Notes tab UI in `src/App.tsx` renders:
  - A `form.panel.form-panel` headed by `Capture`.
  - A title input, raw Markdown textarea, comma-separated tags input, and `Save note` button.
  - A list of `.note-panel` articles rendered from `notes.map(...)`.
  - A text `Pin` / `Unpin` button and a large text `Delete` button on each note.
  - Note body rendered through `src/components/Markdown.tsx`.
- `Markdown.tsx` uses `marked` and `DOMPurify`, then renders sanitized HTML into `.markdown`.
- The notes backend already supports the main persistence operations:
  - `GET /api/notes` with optional `q` and `tag` query params in `src/api/router.ts`.
  - `POST /api/notes`.
  - `PATCH /api/notes/:id`.
  - `DELETE /api/notes/:id`.
- D1 note persistence is implemented in `src/api/data.ts`:
  - `listNotes(env, { q, tag })` orders by `pinned DESC, updated_at DESC`.
  - `createNote(...)` normalises comma-separated tags through `normaliseTags`.
  - `updateNote(...)` already supports updating title, body, tags, pinned, note type, and metadata.
  - `deleteNote(...)` removes a note by id.
- The note schema already has `title`, `body`, `tags`, `pinned`, `note_type`, `metadata_json`, `created_by`, `updated_by`, `created_at`, and `updated_at` through `migrations/0001_initial.sql` and `migrations/0002_modular_hub.sql`.
- Shared note shape is defined in `src/shared/api-types.ts`; it exposes `id`, `title`, `body`, `tags`, `noteType`, `pinned`, `createdByName`, `updatedByName`, and `updatedAt`.
- Styles relevant to this work are in `src/styles.css`, especially `.markdown`, `.tag-line`, `.ghost`, `.danger`, `.icon-button`, `.workspace-grid`, `.form-panel`, `.panel-heading`, `.plain-row`, and note launchpad styles.
- Existing E2E coverage in `e2e/content-crud.spec.ts` creates, pins, and deletes a Markdown note. `e2e/home.spec.ts` creates pinned notes and verifies the homepage notes widget density.
- CI runs `npm test` and `npm run build`; E2E is not in CI and requires a live full-stack instance at `:8788`.

## Proposed Behavior

- Rename the new-note form from `Capture` to a clearer heading such as `New note`.
- Keep Markdown storage and rendering, but add formatting buttons so users do not have to type basic Markdown by hand.
- Support editing existing notes in place.
- Replace the large delete button with a compact corner `x` icon button.
- Replace the text pin control with a pin icon button whose accessible label and visual state changes between `Pin note` and `Unpin note`.
- Make note bodies easier to read with more internal padding and larger body text.
- Replace the always-visible comma-separated tag input with an on-demand tag editor opened by a hash-tag icon button.
- When entering tags, suggest existing tags from already loaded notes.
- Add a tag when the user presses space in the tag text box, then display it as a small removable tag item with its own `x`.
- Add useful search and sorting controls in the Notes tab.
- Keep the backend data model as comma-separated tags unless implementation discovers that the current matching behavior cannot support the required UX. A migration should not be needed for this iteration.

## UX Details

- Notes tab layout:
  - Add a Notes toolbar above the note form/list with search and sort controls.
  - Use a search input with an accessible label such as `Search notes`.
  - Use a select or segmented control for sort options:
    - `Pinned first`
    - `Recently updated`
    - `Title A-Z`
  - Keep pinned notes visually identifiable in the note metadata row.
- New note form:
  - Heading should be `New note`, not `Capture`.
  - Keep `Title` and note body fields.
  - Rename the body placeholder/label away from `Markdown note` only if tests are updated. A user-friendly label such as `Note body` is preferred.
  - Add a compact formatting toolbar above the textarea:
    - Bold button inserts or wraps `**text**`.
    - Italic button inserts or wraps `*text*`.
    - Underline button inserts or wraps `<u>text</u>` because Markdown does not have native underline.
    - Bullet list button prefixes selected lines with `- ` or inserts `- ` at the cursor.
  - Toolbar buttons should be real `button type="button"` controls with accessible labels.
  - If lucide icons are not already installed, do not add a new icon library just for this feature. Use compact text glyphs or simple inline SVG/icons consistent with existing project style.
- Tag editor:
  - Show a hash-tag icon button in the form. Do not show the tag text box until the button is pressed.
  - When open, show a text input for adding tags and a list of selected tags as small tag chips.
  - Pressing `Space`, `Enter`, or comma should commit the current tag text.
  - Tags should be trimmed, deduplicated case-insensitively for display, and submitted to the existing API as a comma-separated `tags` string.
  - Existing tags should be derived client-side from `notes.flatMap(note.tags.split(','))`.
  - Suggestions should filter as the user types and should not include already selected tags.
  - Each tag chip should have a compact `x` button with an accessible label like `Remove tag e2e`.
- Existing note cards:
  - Cards should include a compact action cluster in the top-right corner.
  - Delete should be an `x` icon button using `.icon-button` plus a danger treatment, with an accessible label like `Delete note: {title}`.
  - Pin should be an icon button with an accessible label that changes from `Pin note: {title}` to `Unpin note: {title}`.
  - Add an `Edit note: {title}` button.
  - When edit mode is active for a note, show title, body, and tag editor controls pre-filled from the existing note, plus `Save changes` and `Cancel`.
  - Saving should call `PATCH /api/notes/:id` with only the edited note fields, then refresh notes.
  - Cancelling should restore read-only display without an API call.
- Search:
  - Search should match title, body, and tags.
  - Use the existing `GET /api/notes?q=...` backend query for persisted filtering after debounce, or filter locally if the implementation keeps all notes loaded.
  - Preferred pragmatic approach: local filtering for instant UI, because the app already loads all notes and there is no pagination. Keep the backend query behavior tested for direct API callers.
- Sorting:
  - Default sort should preserve current backend behavior: pinned first, then most recently updated.
  - `Recently updated` should sort all notes by `updatedAt DESC` while still displaying pin state.
  - `Title A-Z` should sort by title using `localeCompare`.
  - Search filtering should run before sorting or sorting before filtering as long as visible results are correct and deterministic.
- Empty states:
  - If no notes exist, show a small empty state such as `No notes yet`.
  - If search/filter returns no matches, show `No notes match your search`.
- Responsiveness and accessibility:
  - Controls must fit at the Pixel 7 E2E viewport and the desktop 1440x1000 viewport.
  - Icon-only buttons need accessible names through `aria-label` and visible focus states.
  - Do not rely on color alone for pinned state.

## Backend and Data Changes

- No schema migration is expected.
- Keep `notes.tags` as a comma-separated string in D1 for this iteration.
- Consider tightening backend tag normalisation in `src/api/http.ts` or `src/api/data.ts` only if needed to match the frontend tag UX:
  - Trim tags.
  - Drop empty tags.
  - Deduplicate tags case-insensitively.
  - Preserve a predictable casing rule. Preferred default: preserve the first entered casing.
- `listNotes(env, { q, tag })` already supports search and tag filtering. Add or update Vitest coverage if tag deduplication or query behavior changes.
- `PATCH /api/notes/:id` already supports editing note title, body, and tags. The frontend should use this existing route.
- Keep mutating API calls inside the existing `run(...)` helper path in `src/App.tsx` so error handling and refresh behavior stay consistent.
- Do not change auth/session behavior, admin unlock rules, origin guard behavior, or rate limiting.

## Files Likely to Change

- `src/App.tsx`
  - Add Notes tab UI state for search text, sort mode, editing note id/draft, tag editor state, and formatting helpers.
  - Replace the current Notes form/card markup with the richer controls described above.
  - Add `PATCH` handling for note edits using the existing API route.
- `src/styles.css`
  - Add styles for the Notes toolbar, formatting toolbar, compact note action buttons, note edit mode, tag editor, tag chips, suggestions, and improved note body padding/text size.
  - Reuse existing tokens such as `var(--color-line)`, `var(--color-surface-2)`, `var(--radius-md)`, and `.icon-button`.
- `src/shared/api-types.ts`
  - Likely unchanged. Only update if implementation needs a typed sort/tag helper exported from shared code, which is not expected.
- `src/api/http.ts`
  - Optional: update `normaliseTags` only if backend deduplication is part of the implementation.
- `src/api/data.ts`
  - Optional: update or cover `listNotes` if search/tag behavior is adjusted.
- `src/api/data.test.ts`
  - Add focused tests for any changed tag normalisation or notes query behavior.
- `e2e/content-crud.spec.ts`
  - Update the existing notes workflow selectors if labels change.
  - Extend coverage for edit, formatting toolbar, tag chips, pin icon label, and compact delete.
- `e2e/home.spec.ts`
  - Update helper selectors for pinning notes if the accessible label changes from `Pin` / `Unpin` to `Pin note: ...` / `Unpin note: ...`.

## Implementation Plan

1. Add small note utility helpers in `src/App.tsx` near existing helpers or inside the component if they need state:
   - `parseTags(tags: string): string[]`
   - `serialiseTags(tags: string[]): string`
   - `dedupeTags(tags: string[]): string[]`
   - `allKnownTags(notes: Note[]): string[]`
   - `filterAndSortNotes(notes, search, sortMode)`
2. Add Notes tab state in `App`:
   - `noteSearch`
   - `noteSort`, defaulting to current behavior such as `pinned`
   - `noteTagEditorOpen`
   - selected draft tags for the new-note form
   - current tag input text
   - editing note id and edit draft fields
3. Refactor note draft tags:
   - Keep the submit payload shape as `{ title, body, tags }`.
   - Internally manage new-note tags as an array and serialize before calling `POST /api/notes`.
   - Reset title, body, tags, tag input, and tag editor state after successful create.
4. Add Markdown formatting helpers:
   - Use the textarea selection range to wrap or insert text.
   - Support both the create textarea and the edit textarea.
   - Preserve focus after applying formatting.
   - Keep behavior simple and deterministic; do not introduce a rich text editor dependency.
5. Replace the Notes tab heading and form controls:
   - Change `Capture` to `New note`.
   - Add formatting toolbar buttons.
   - Add the hash-tag toggle and tag editor.
   - Keep submit behavior through `createNote`.
6. Add search and sort controls above the form/list:
   - Search input updates `noteSearch`.
   - Sort control updates `noteSort`.
   - Render `visibleNotes` from `filterAndSortNotes(notes, noteSearch, noteSort)`.
7. Update note cards:
   - Use compact icon buttons for pin/unpin, edit, and delete.
   - Keep `toggleNote(note)` for pinning, but update button labels and visible icon.
   - Replace `Delete` text button with compact danger `x`.
8. Implement edit mode:
   - Add `startEditingNote(note)`, `cancelEditingNote()`, and `saveEditingNote(...)`.
   - Pre-fill edit draft from the selected note.
   - Reuse formatting and tag editor behavior where practical.
   - On save, call `api(`/api/notes/${note.id}`, { method: 'PATCH', body: editDraftPayload })`, then `refreshAll()`.
9. Improve note styling in `src/styles.css`:
   - Add padding around the Markdown body inside `.note-panel`.
   - Increase readable body font size for note content without affecting all Markdown pages if broad `.markdown` changes would be too wide. Prefer a scoped selector such as `.note-panel .markdown`.
   - Add responsive layout rules for toolbar/action clusters.
   - Add chip/suggestion styles that fit mobile.
10. Update E2E tests:
   - Adjust selectors for renamed labels and icon button accessible names.
   - Cover creating a note using toolbar buttons and tag chips.
   - Cover editing an existing note title/body/tags.
   - Cover search and sort changing the visible notes order.
11. Add or update unit tests only for backend/helper behavior that changes:
   - If `normaliseTags` changes, add Vitest coverage.
   - If notes search/tag filtering changes in `listNotes`, add fake DB coverage or a targeted test around the updated helper.
12. Run verification:
   - `npm test`
   - `npm run build`
   - For E2E/manual UI checks: `npm run build && npm run dev:worker`, then run Playwright against `E2E_BASE_URL=http://localhost:8788` with test credentials.

## Acceptance Criteria

- The Notes tab no longer shows the word `Capture`.
- A user can create a note with title, body, and tags without manually entering comma-separated tags.
- Bold, italic, underline, and bullet list buttons modify the note body text in the create form.
- A user can edit an existing note title, body, and tags, save changes, and see updated rendered content.
- Cancelling an edit leaves the note unchanged.
- Delete appears as a compact corner `x` control, not a full-width or large text button.
- Pin appears as a pin-style icon control, and the accessible label/state changes correctly after clicking.
- Note body content has visibly more padding and larger readable text inside note cards.
- Pressing the hash-tag button reveals the tag input.
- Pressing space in the tag input commits a tag and renders it as a removable chip.
- Existing tags are suggested while entering a tag.
- Search filters notes by title, body, and tag content.
- Sort options can show pinned-first, recently updated, and title A-Z order.
- The homepage notes widget still shows pinned/recent notes and remains functional after note UI changes.
- Existing auth, origin guard, session, and D1 behavior remain unchanged.
- `npm test` and `npm run build` pass.

## Test and Verification Notes

- Unit tests:
  - Run `npm test`.
  - Add Vitest coverage if backend tag normalisation or notes query behavior changes.
- Build:
  - Run `npm run build`. This is required by repo instructions and also runs theme/custom-page sync scripts.
- Full-stack local verification:
  - Run `npm run build && npm run dev:worker`.
  - Use `http://localhost:8788` for Notes verification because the feature touches API and D1.
  - `.dev.vars` must exist with `ADMIN_PASSWORD_HASH`.
- E2E:
  - Set `E2E_BASE_URL=http://localhost:8788`, `TEST_USERNAME=admin`, and `TEST_PASSWORD=...`.
  - Run `npm run test:e2e` for headless verification.
  - Use `npm run test:e2e:headed` or `npm run test:e2e:ui` for visual checks.
  - Do not point E2E tests at production because they mutate D1 data.
- Manual visual checks:
  - Desktop Chrome-sized viewport around 1440x1000.
  - Pixel 7-sized mobile viewport.
  - Verify icon-only controls have accessible labels and do not overlap.
  - Verify note body text, tag chips, suggestions, and edit controls fit without horizontal scrolling.

## Open Questions

- Assumption: tag storage should remain comma-separated in the existing `notes.tags` field for this iteration.
- Assumption: local search/sort is acceptable because all notes are currently loaded into `App.tsx`; server-side search can remain available for API callers.
- Assumption: underline can be stored as sanitized HTML (`<u>...</u>`) inside the Markdown body because Markdown has no native underline syntax and `Markdown.tsx` already sanitizes rendered output.
- Assumption: a simple Markdown helper toolbar is preferred over adding a full rich text editor dependency.
- Question: should delete require a confirmation prompt? The original note only asks for a smaller delete button, so the default implementation should not add confirmation unless desired later.
