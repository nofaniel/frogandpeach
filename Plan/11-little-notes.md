# Whiteboard module — Canvas Drawing Board

## Original Note
Mobile and desktop friendly, multi user whiteboard module.

## Goal
Add a shared free-drawing whiteboard to the Frog & Peach Home Hub — a digital equivalent of a physical whiteboard where household members draw, sketch, and scribble together with pens, pencils, and erasers on a big blank shared page. Stroke-by-stroke persistence, undo/redo, and pen + eraser tools for v1.

## Current State
- A **card-based whiteboard was built and deployed** (migration 0011, CRUD in `data.ts`, routes in `router.ts`, UI in `src/features/whiteboard/`). This is the **wrong feature** and must be fully removed before building the canvas system.
- **Modules are code-defined** in `src/api/modules.ts` — adding a module requires editing this file plus routing, types, and UI components.
- **No client-side router** — navigation is `useState<Tab>` in `App.tsx`. Adding a new tab requires updating the `Tab` type and the tab-switching logic.
- **Database** uses Cloudflare D1 (SQLite). New tables require a migration file in `migrations/`.
- **All state** lives in `useAppController()` (~721 lines, 30+ `useState` calls). New state must be added there.
- **No real-time sync** — the app uses standard HTTP fetch. Multi-user means multiple users can read/write the same board, but changes appear on page refresh or manual reload (no WebSocket/CRDT).
- **No existing canvas patterns** in the codebase — this is a greenfield canvas feature.

## Proposed Behavior

### Core Concept
A single shared whiteboard canvas (one per household). Users draw freehand with a pen tool or erase with an eraser. Each drawing action creates a "stroke" — a continuous line of points with color, width, and tool metadata. Strokes are saved to the database one-by-one.

### Drawing Tools (v1)
| Tool | Behavior |
|------|----------|
| **Pen** | Solid freehand line. Smooth rendering via quadratic bezier interpolation between points. User selects color and stroke width. |
| **Eraser** | Removes strokes by clicking/tapping on them (hit-test against stroke bounding boxes). Alternatively, draws with `destination-out` composite mode to visually erase parts of strokes. **v1 approach**: eraser draws white strokes (matching background) — simplest, works with persistence. |

### User Interactions
- **Draw**: Click/touch + drag on canvas creates a stroke. On release, stroke is saved to server.
- **Erase**: Select eraser tool, draw over existing strokes to remove them (or paint white over them).
- **Undo**: Tap undo button or Ctrl/Cmd+Z — removes the last stroke added by the current user (client-side state + DELETE request).
- **Redo**: Tap redo button or Ctrl/Cmd+Shift+Z — re-adds a previously undone stroke (POST request).
- **Clear board**: Button to delete all strokes (with confirmation).
- **Color picker**: 8-12 preset colours + custom colour input.
- **Stroke width**: 3 preset sizes (thin/medium/thick) + slider.

### Multi-User
- All users see the same board (strokes fetched via GET)
- New strokes saved immediately on mouseup/touchend
- Undo only affects the current user's own strokes
- No conflict resolution — last write wins (acceptable for a household tool)
- Changes appear on page refresh or manual reload

## UX Details

### Layout
- **Full-viewport canvas** within the whiteboard tab — no scrolling, canvas fills available space
- **Toolbar** fixed at top or left edge (compact, icon-based)
- **Canvas background**: white (or light grey subtle grid dots for spatial reference)

### Navigation
- Tab `'whiteboard'` in `Tab` type (already exists from card-based implementation)
- Navigation bar icon: 🎨 (paint palette)
- Module registered in `moduleDefinitions` with `category: 'content'`, `navigationBar: 'on'`

### Toolbar Design
- Horizontal bar at top of workspace (stacks vertically on mobile)
- Tool buttons: Pen icon, Eraser icon (toggle group)
- Color swatches: row of 8-12 colour circles + custom colour picker input
- Width selector: 3 stroke-width preview circles (thin=2px, medium=4px, thick=8px)
- Action buttons: Undo, Redo, Clear All (with trash icon + confirmation)
- Toolbar is compact (~48px height), does not obstruct drawing area

### Canvas
- HTML5 `<canvas>` element, fills parent container
- Smooth line rendering: quadratic bezier interpolation between sampled points
- Cursor changes: crosshair for pen, custom circle cursor showing eraser width
- Touch support: `touchstart`/`touchmove`/`touchend` with `preventDefault()` to avoid scroll
- Canvas is cleared and redrawn from stroke data on load

### Home Widget
- Small preview showing a static thumbnail/snapshot of the canvas (last saved state)
- "Open Whiteboard" link to full view
- Alternatively: show stroke count + "Last drawn: {timeAgo}" if thumbnail is too expensive

### Responsiveness
- Canvas fills available viewport width/height
- Toolbar collapses to icons on mobile (< 768px), full labels on desktop
- Touch drawing works on mobile (no hover-dependent features)

## Backend and Data Changes

### New Migration: `migrations/0012_whiteboard_canvas.sql`
```sql
CREATE TABLE IF NOT EXISTS whiteboard_strokes (
  id TEXT PRIMARY KEY,
  points TEXT NOT NULL,          -- JSON array of [{x, y}, ...]
  color TEXT NOT NULL DEFAULT '#000000',
  width REAL NOT NULL DEFAULT 2,
  tool TEXT NOT NULL DEFAULT 'pen',   -- 'pen' | 'eraser'
  opacity REAL NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_strokes_created
  ON whiteboard_strokes (created_at);
```

### API Routes (in `src/api/router.ts`)
| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `whiteboard` | `getWhiteboardStrokes()` | session | Get all strokes, ordered by created_at |
| POST | `whiteboard` | `createWhiteboardStroke()` | session | Add a new stroke |
| DELETE | `whiteboard/clear` | `clearWhiteboard()` | session | Delete all strokes |
| DELETE | `whiteboard/:id` | `deleteWhiteboardStroke()` | session | Delete a single stroke |

### Data Operations (in `src/api/data.ts`)
- `listWhiteboardStrokes(env)` → `WhiteboardStroke[]` (all strokes ordered by created_at ASC)
- `createWhiteboardStroke(env, data)` → `WhiteboardStroke`
- `deleteWhiteboardStroke(env, id)` → `void`
- `clearWhiteboardStrokes(env)` → `void`
- `toWhiteboardStroke(row)` → `WhiteboardStroke` (DB row mapper)

### Shared Types (in `src/shared/api-types.ts`)
```typescript
type WhiteboardStroke = {
  id: string
  points: Array<{ x: number; y: number }>
  color: string       // hex colour
  width: number       // stroke width in pixels
  tool: 'pen' | 'eraser'
  opacity: number     // 0-1
  createdByName: string
  createdAt: string
}

type WhiteboardStrokePatch = {
  color?: string
  width?: number
  tool?: 'pen' | 'eraser'
  opacity?: number
}
```

### Module Definition (in `src/api/modules.ts`)
```typescript
{
  id: 'whiteboard',
  title: 'Whiteboard',
  description: 'Shared drawing board for the household.',
  category: 'content',
  defaultPosition: 35,
  defaultEnabled: true,
  defaultInstalled: true,
  defaultSize: 'wide',
  navigationBar: { defaultEnabled: true },
  homeWidget: {
    label: 'Homepage whiteboard widget',
    description: 'Controls whether a whiteboard preview appears on the home screen.',
    defaultEnabled: true,
    defaultMode: 'compact',
    modes: [
      { id: 'compact', label: 'Compact' },
      { id: 'expanded', label: 'Expanded' },
    ],
  },
}
```

## Files Likely to Change

### Files to DELETE (card-based whiteboard)
| File | Reason |
|------|--------|
| `src/features/whiteboard/WhiteboardCard.tsx` | Card component — not needed for canvas |
| `src/features/whiteboard/WhiteboardModal.tsx` | Card modal — not needed for canvas |

### Files to REWRITE (major changes)
| File | Change |
|------|--------|
| `migrations/0011_whiteboard.sql` | **Delete** — replace with `0012_whiteboard_canvas.sql` (new schema) |
| `src/features/whiteboard/WhiteboardWorkspace.tsx` | **Rewrite** — replace card grid with canvas + toolbar layout |
| `src/features/home/widgets/WhiteboardWidget.tsx` | **Rewrite** — replace card list with canvas thumbnail or stroke count |
| `src/styles.css` | **Rewrite** whiteboard section — replace `.wb-*` card styles with canvas/toolbar styles |

### Files to EDIT (update references)
| File | Change |
|------|--------|
| `src/shared/api-types.ts` | Replace `WhiteboardCard`/`WhiteboardCardPatch` with `WhiteboardStroke`/`WhiteboardStrokePatch`; keep `'whiteboard'` in `Tab`; replace `whiteboardCards` with `whiteboardStrokes` in `HomeData` |
| `src/api/data.ts` | Remove card CRUD (~85 lines), add stroke CRUD (~60 lines), update `getDashboard()` and `deleteModuleData()` |
| `src/api/router.ts` | Remove `routeWhiteboard()` card handler, add stroke routes (GET/POST/DELETE/clear) |
| `src/api/modules.ts` | Update whiteboard module description |
| `src/features/app-shell/useAppController.ts` | Replace card state/CRUD with stroke state/CRUD (undo/redo stack) |
| `src/features/app-shell/navigation.ts` | Keep existing whiteboard nav entry (change icon to 🎨) |
| `src/App.tsx` | Keep whiteboard tab rendering (already wired), no changes needed |
| `src/features/home/HomeDashboard.tsx` | Keep whiteboard widget case (already wired), no changes needed |
| `src/api/data.test.ts` | Remove card tests, add stroke tests |

### Files to CREATE
| File | Purpose |
|------|---------|
| `migrations/0012_whiteboard_canvas.sql` | New stroke-based schema |
| `src/features/whiteboard/WhiteboardCanvas.tsx` | Core canvas component with drawing logic |
| `src/features/whiteboard/WhiteboardToolbar.tsx` | Tool selector, colour picker, width, undo/redo |
| `src/features/whiteboard/useCanvasDrawing.ts` | Custom hook managing canvas state, drawing events, undo/redo stack |

## Implementation Plan

### Phase 0: Remove Card-Based Whiteboard
1. Delete `src/features/whiteboard/WhiteboardCard.tsx` and `WhiteboardModal.tsx`
2. Remove card CRUD functions from `src/api/data.ts` (~85 lines: types, normalisers, list/create/get/update/delete/toWhiteboardCard, VALID_WHITEBOARD_COLORS, VALID_WHITEBOARD_SIZES)
3. Remove card route handler from `src/api/router.ts` (`routeWhiteboard()` function + imports)
4. Replace `WhiteboardCard`/`WhiteboardCardPatch` types in `src/shared/api-types.ts` with `WhiteboardStroke`/`WhiteboardStrokePatch`
5. Replace card state/CRUD in `useAppController.ts` with stroke state + undo/redo
6. Remove card tests from `src/api/data.test.ts`
7. Delete `migrations/0011_whiteboard.sql` — create `migrations/0012_whiteboard_canvas.sql`
8. Remove `.wb-*` card CSS from `src/styles.css`

### Phase 1: Database & Types
9. Create migration `migrations/0012_whiteboard_canvas.sql` with `whiteboard_strokes` table
10. Add `WhiteboardStroke`, `WhiteboardStrokePatch` types to `src/shared/api-types.ts`
11. Keep `'whiteboard'` in `Tab` type; replace `whiteboardCards` with `whiteboardStrokes` in `HomeData`

### Phase 2: Backend
12. Update `whiteboard` module definition in `src/api/modules.ts` (new description)
13. Implement stroke CRUD functions in `src/api/data.ts`: `listWhiteboardStrokes`, `createWhiteboardStroke`, `deleteWhiteboardStroke`, `clearWhiteboardStrokes`, `toWhiteboardStroke`
14. Update `getDashboard()` to fetch strokes instead of cards
15. Update `deleteModuleData()` to clear `whiteboard_strokes`
16. Add stroke route handling in `src/api/router.ts`: GET/POST `/whiteboard`, DELETE `/whiteboard/clear`, DELETE `/whiteboard/:id`

### Phase 3: Frontend State & Navigation
17. Add stroke state + undo/redo stack to `useAppController.ts`
18. Update navigation icon to 🎨 in `navigation.ts`

### Phase 4: Frontend Canvas Components
19. Create `src/features/whiteboard/useCanvasDrawing.ts` — custom hook:
    - Canvas ref management
    - Mouse/touch event handlers (start/draw/end)
    - Point sampling and smoothing (quadratic bezier)
    - Undo/redo stack (array of stroke IDs)
    - Stroke save to server on completion
    - Canvas redraw from stroke data
20. Create `src/features/whiteboard/WhiteboardToolbar.tsx`:
    - Tool toggle (pen/eraser)
    - Colour picker (8 presets + custom)
    - Stroke width selector (thin/medium/thick)
    - Undo/Redo buttons
    - Clear All button
21. Create `src/features/whiteboard/WhiteboardCanvas.tsx`:
    - HTML5 canvas element
    - Integrates `useCanvasDrawing` hook
    - Handles resize events
    - Cursor management
22. Rewrite `src/features/whiteboard/WhiteboardWorkspace.tsx`:
    - Layout: toolbar + canvas
    - Empty state when no strokes

### Phase 5: Home Widget & Styling
23. Rewrite `src/features/home/widgets/WhiteboardWidget.tsx` — show stroke count + "Open Whiteboard" link
24. Add canvas/toolbar CSS to `src/styles.css`

### Phase 6: Tests & Verification
25. Write unit tests for stroke CRUD in `src/api/data.test.ts`
26. Run `npm test` and `npm run build` to verify
27. Manual test: draw, undo, redo, change colour/width, erase, clear, refresh to verify persistence

## Acceptance Criteria
- [ ] Whiteboard tab appears in navigation bar with 🎨 icon
- [ ] Canvas fills the workspace area
- [ ] User can draw freehand lines with pen tool
- [ ] User can select different colours
- [ ] User can change stroke width (thin/medium/thick)
- [ ] User can erase strokes with eraser tool
- [ ] User can undo their last stroke (Ctrl/Cmd+Z)
- [ ] User can redo an undone stroke (Ctrl/Cmd+Shift+Z)
- [ ] Strokes persist to D1 and survive page refresh
- [ ] Clear All button removes all strokes (with confirmation)
- [ ] Canvas works with touch on mobile
- [ ] Module can be installed/uninstalled via Admin Tools
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

## Test and Verification Notes
- **Unit tests**: Test stroke CRUD functions in `data.test.ts` with fake D1 (create, list, delete, clear)
- **Manual verification**: `npm run build && npm run dev:worker` on `:8788`, test drawing flow in browser
- **Mobile check**: Resize browser to < 768px, verify touch drawing and responsive toolbar
- **Persistence check**: Draw strokes → refresh page → strokes should persist
- **Undo/redo check**: Draw 3 strokes → undo twice → redo once → verify correct strokes remain
- **Clear check**: Draw strokes → Clear All → confirm → board is empty

## Open Questions
1. **Eraser approach**: v1 uses white strokes (paint-over). True eraser (composited removal) is more complex and doesn't persist well. **Assumption**: White-paint eraser is acceptable for v1.
2. **Canvas resolution on HiDPI**: Use `devicePixelRatio` to scale canvas for sharp rendering on retina displays. **Assumption**: Yes, implement HiDPI scaling.
3. **Stroke point density**: Sample points every ~5px of mouse movement to balance smoothness vs. data size. **Assumption**: 5px sampling interval.
4. **Home widget**: Show stroke count + last drawn time rather than canvas thumbnail (thumbnail requires offscreen rendering, more complex). **Assumption**: Text-based widget for v1.
