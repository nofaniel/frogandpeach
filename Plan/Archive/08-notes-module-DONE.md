# Notes Module

## Goal

Make the Notes tab feel like an editable household notes workspace rather than a raw Markdown capture form. Users should be able to create, edit, search, sort, pin/unpin, delete, and tag notes with small, clear controls and without needing to manually type Markdown syntax for common formatting.

## Current State (revised June 2026)

- The app is a Cloudflare Pages + D1 app with a React 19 + TypeScript + Vite frontend and Cloudflare Workers runtime backend.
- Navigation is local React state in `src/App.tsx`; there is no client-side router for the Notes tab.
- Notes state lives in `src/features/app-shell/useAppController.ts` as `notes` array and `noteDraft` object (`{ title, body, tags }`).
- The controller exposes `notes`, `noteDraft`, `setNoteDraft`, `createNote`, `toggleNote`, `removeNote` through the `notes` key of the return object.
- The Notes tab UI is rendered by `src/features/notes/NotesWorkspace.tsx` (a standalone component receiving 6 props from `App.tsx`).
- `NotesWorkspace.tsx` currently renders:
  - A `form.panel.form-panel` headed by `Capture` with title input, `Markdown note` textarea, comma-separated tags input, and `Save note` button.
  - A list of `.note-panel` articles from `notes.map(...)` with text `Pin`/`Unpin` button, `Markdown` body, `.tag-line` tag display, and text `Delete` button.
- `Markdown.tsx` uses `marked` + `DOMPurify`, renders into `.markdown` div.
- The notes backend fully supports CRUD:
  - `GET /api/notes` with optional `q` and `tag` query params (`src/api/router.ts:189-213`).
  - `POST /api/notes` — creates note, normalises tags via `normaliseTags`.
  - `PATCH /api/notes/:id` — partial update (title, body, tags, pinned, noteType, metadata). Currently only used for pin/unpin toggle.
  - `DELETE /api/notes/:id`.
- `normaliseTags` in `src/api/http.ts:51-57` splits on comma, trims, drops empty — but does NOT deduplicate.
- The shared `Note` type in `src/shared/api-types.ts:55-65` exposes: `id`, `title`, `body`, `tags`, `noteType`, `pinned`, `createdByName`, `updatedByName`, `updatedAt`.
- D1 schema has `title`, `body`, `tags`, `pinned`, `note_type`, `metadata_json`, `created_by`, `updated_by`, `created_at`, `updated_at`.
- Styles in `src/styles.css`: `.markdown` (686), `.tag-line` (699), `.icon-button` (658), `.ghost` (664), `.danger` (670), `.workspace-grid` (260), `.form-panel` (167), `.panel-heading` (304), `.note-launchpad-*` (2404+).
- No icon library is installed (no `lucide-react`). Use inline SVG or text glyphs consistent with existing style.
- Existing E2E: `e2e/content-crud.spec.ts:43-69` creates/pins/deletes a note. `e2e/home.spec.ts:33-42` has `createPinnedNote` helper.
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

- No schema migration needed.
- `notes.tags` stays as a comma-separated string in D1.
- `normaliseTags` in `src/api/http.ts` already trims and drops empty tags; no changes needed.
- `PATCH /api/notes/:id` already supports editing title, body, tags, pinned — the frontend will use this existing route via a new `updateNote` handler in `useAppController.ts`.
- Mutating API calls stay inside the existing `run(...)` helper for consistent error handling and refresh.
- No changes to auth, session, admin unlock, origin guard, or rate limiting.

## Files Likely to Change

- `src/features/notes/NotesWorkspace.tsx`
  - Primary UI file. Replace current form/card markup with toolbar, formatting bar, tag editor, edit mode, and icon buttons.
  - Add local state for search, sort, editing, tag editor, formatting.
- `src/features/app-shell/useAppController.ts`
  - Add `updateNote` handler (PATCH with full fields, not just pinned toggle).
  - Expose it through the `notes` key in the return object.
- `src/styles.css`
  - Add styles for note toolbar, formatting toolbar, compact action buttons, edit mode, tag editor, tag chips, suggestions, improved note body padding/size.
  - Reuse tokens: `var(--color-line)`, `var(--color-surface-2)`, `var(--radius-md)`, `.icon-button`, `.ghost`, `.danger`.
- `src/shared/api-types.ts`
  - Unchanged. Note type already has all needed fields.
- `src/api/http.ts`
  - Unchanged. `normaliseTags` handles trim+filter; deduplication handled client-side before submit.
- `e2e/content-crud.spec.ts`
  - Update selectors for renamed labels (`New note`, icon buttons). Extend coverage for edit, tags, search, sort.
- `e2e/home.spec.ts`
  - Update `createPinnedNote` helper selectors if labels change.

## Implementation Plan

1. Add `updateNote` handler in `useAppController.ts`:
   - Accept `(id: string, patch: { title, body, tags, pinned })` and call PATCH.
   - Expose through `notes` return key.
2. Add note utility helpers in `NotesWorkspace.tsx` (local to the component):
   - `parseTags`, `serialiseTags`, `dedupeTags`, `allKnownTags`, `filterAndSortNotes`.
3. Add Notes tab local state in `NotesWorkspace`:
   - `noteSearch`, `noteSort` (default `'pinned'`), `noteTagEditorOpen`, `noteDraftTags` (array), `noteTagInput`.
   - `editingNoteId`, `editDraft` (`{ title, body, tags }`), `editTagInput`, `editTagEditorOpen`, `editDraftTags`.
4. Refactor note draft tags:
   - Internally manage tags as arrays; serialize to comma-separated string before calling `createNote` or `updateNote`.
   - Reset all tag state after successful create.
5. Add Markdown formatting helpers:
   - `applyFormatting(textarea, kind)` wrapping selection with `**`, `*`, `<u>`, or prefixing lines with `- `.
   - Support both create and edit textareas via ref.
6. Replace Notes heading and form controls:
   - Change `Capture` to `New note`.
   - Add formatting toolbar (`B`, `I`, `U`, list icon) above textarea.
   - Add hash-tag toggle button; tag editor opens on press with text input + chip list + suggestions.
7. Add search and sort controls above the form/list:
   - Search input with `aria-label="Search notes"`.
   - Sort select: `Pinned first`, `Recently updated`, `Title A-Z`.
   - Render `visibleNotes` from `filterAndSortNotes`.
8. Update note cards:
   - Compact action cluster in top-right: pin icon, edit icon, delete `x` icon.
   - All icon buttons use `.icon-button.ghost` with `aria-label`.
   - Delete uses `.danger` class.
9. Implement edit mode:
   - `startEditingNote(note)` pre-fills editDraft.
   - Edit form: title input, body textarea with formatting toolbar, tag editor, `Save changes` + `Cancel` buttons.
   - Save calls `updateNote(id, { title, body, tags })`, then parent refreshes.
   - Cancel restores read-only display.
10. Add empty states: `No notes yet` and `No notes match your search`.
11. Improve note styling in `src/styles.css`:
    - `.note-panel .markdown` padding + font-size.
    - Toolbar, chip, suggestion, edit mode, action cluster styles.
    - Responsive rules for mobile.
12. Update E2E tests:
    - Fix selectors for new labels and icon buttons.
    - Add coverage for edit, tag chips, search, sort.
13. Run verification: `npm test` then `npm run build`.

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

## Open Questions

- Tag storage remains comma-separated in the existing `notes.tags` field for this iteration.
- Local search/sort is used because all notes are loaded into state; server-side search remains available for API callers.
- Underline stored as `<u>...</u>` in Markdown body (DOMPurify sanitizes it).
- Simple formatting toolbar preferred over a rich text editor dependency.
- Delete does not require a confirmation prompt this iteration.

## Implementation Completed

- Work done: Refactored NotesWorkspace from raw Markdown capture form into a full-featured notes workspace. Added search/sort toolbar, Markdown formatting toolbar (bold, italic, underline, bullet list), on-demand tag editor with chips and suggestions, inline note editing, compact icon buttons for pin/edit/delete, improved note body padding/typography, empty states, and responsive layout. Updated `createNote` and added `updateNote` handlers in `useAppController.ts`. Updated E2E selectors for new labels and icon buttons.
- Implementation result: All 140 unit tests pass. TypeScript compiles clean. Production build succeeds. No schema migrations needed. No changes to auth, session, or rate limiting.
- Setup and verification: `npm test` (140/140 pass), `npm run build` (clean). For full-stack verification: `npm run build && npm run dev:worker` at `:8788`. E2E at `E2E_BASE_URL=http://localhost:8788`.
- Remaining notes: E2E tests updated for new selectors but not run live (require full-stack instance). Tag suggestions derived client-side from loaded notes. Delete does not prompt for confirmation.
