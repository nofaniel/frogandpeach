# 13 — Whiteboard: Infinite Canvas + Full-Screen Floating Toolbar

## Goal

Strip the whiteboard down to an **infinite, full-screen drawing experience** with a minimal floating toolbar. Remove the sidebar, hero header, stats, activity feed, preview panel, and excessive tool options. The canvas should feel like a native drawing app — toolbar hovers over a limitless canvas.

---

## Current State

| File | Role |
|---|---|
| `src/features/whiteboard/WhiteboardWorkspace.tsx` | Top-level component: hero header, sidebar (toolbar + preview + activity + shortcuts), board column, status bars |
| `src/features/whiteboard/WhiteboardToolbar.tsx` | Sidebar toolbar: tools, brush presets, 8 color swatches + custom, stroke slider, opacity slider, surface picker, zoom controls, undo/redo/refresh/export/clear |
| `src/features/whiteboard/WhiteboardCanvas.tsx` | Canvas wrapper: ResizeObserver, empty state, surface background via CSS class |
| `src/features/whiteboard/useCanvasDrawing.ts` | All drawing logic: pointer events, panning, undo/redo, auto-expanding board (DEFAULT_BOARD_SIZE 2400×1700, BOARD_EXPAND_BY 700), PNG export |
| `src/features/whiteboard/rendering.ts` | Stroke drawing (quadratic bezier), surface painting, preview rendering |
| `src/features/whiteboard/WhiteboardPreview.tsx` | Mini preview canvas (used in sidebar + home widget) |
| `src/features/home/widgets/WhiteboardWidget.tsx` | Home dashboard widget — **no changes** |
| `src/shared/api-types.ts` | `WhiteboardStroke`, `WhiteboardStrokeInput`, `WhiteboardPoint`, `WhiteboardTool` types |
| `src/shared/whiteboard.ts` | Validation, normalization, constants |
| `src/styles.css` lines 3038–3538 | Whiteboard v2 CSS: hero, stat strip, sidebar grid, toolbar, canvas stage, responsive breakpoints |
| `src/App.tsx` lines 159–167 | Renders `<WhiteboardWorkspace>` when `activeTab === 'whiteboard'` |

**Current behavior:**
- Canvas starts at 2400×1700, auto-expands near edges by 700px
- Board is panned via `containerRef.scrollLeft/scrollTop`
- Toolbar is a full sidebar with 4 sections (Tools, Ink, Surface, Actions)
- Hero header shows stroke count, contributors, board size, last draw time
- Sidebar has preview snapshot and activity feed
- Surface backgrounds rendered via CSS on `.wb-canvas-stage.surface-*`
- Zoom range: 0.45–1.8× (clamped in `clampZoom`)

---

## Proposed Behavior

1. **Full-screen canvas** — the whiteboard fills the entire viewport. No header, no sidebar, no status bars. The only UI is a floating toolbar.

2. **Infinite canvas** — the canvas coordinate system has no hard bounds. The viewport is a window into an infinite plane. Panning moves the viewport origin; drawing adds strokes at world coordinates. The canvas element resizes to fill the viewport; a world-space offset + zoom transforms pointer events to world coordinates.

3. **Floating toolbar** — a compact, centered pill at the bottom of the screen. Contains:
   - **Pen tool** (icon button)
   - **Eraser tool** (icon button)
   - **Pan tool** (icon button)
   - Divider
   - **6 color dots** (black, red, orange, green, blue, purple) + custom color picker
   - Divider
   - **Undo** (icon button)
   - **Redo** (icon button)
   - Divider
   - **Zoom out / Zoom in** (icon buttons with percentage label)
   - Divider
   - **Menu button** (⋯) — opens a popover with: stroke width slider, opacity slider, surface picker, export PNG, clear board

4. **Toolbar auto-hides** — the toolbar fades out after 3s of inactivity on the canvas. Moving the mouse or touching the screen brings it back. Always visible during active drawing.

5. **Keyboard shortcuts preserved** — Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y redo.

6. **No changes to API, backend, data model, or preview/widget.**

---

## UX Details

### Floating toolbar layout (bottom center)
```
[ pen ] [ eraser ] [ pan ] | [ ● ● ● ● ● ● 🎨 ] | [ ↶ ] [ ↷ ] | [ − ] 100% [ + ] | [ ⋯ ]
```
- Pill shape: `border-radius: 999px`, frosted glass (`backdrop-filter: blur(12px)`)
- 6 color dots are 20px circles, active one gets a white ring
- The ⋯ button opens a small popover above the toolbar for secondary controls
- On mobile: toolbar shrinks, icons only, popover full-width

### Toolbar popover (from ⋯)
- Stroke weight: horizontal slider (1–22px)
- Opacity: horizontal slider (8–100%)
- Surface: 4 chips (Grid / Dots / Ledger / Plain)
- Export PNG button
- Clear board button (red)

### Full-screen canvas
- Canvas fills `100svh`, no margins, no borders, no card styling
- Background is the selected surface (CSS on a container div behind the canvas)
- Cursor: crosshair (pen), cell (eraser), grab/grabbing (pan)
- Empty state: centered subtle text "Start drawing" that fades out on first stroke

### Auto-hide behavior
- **Desktop only**: after 3s no pointer movement on the canvas (and no active drawing), toolbar opacity → 0.3
- On `pointermove` on the canvas, opacity → 1
- During active drawing (pointer captured), toolbar stays at opacity 1
- **Mobile/touch**: toolbar stays at opacity 1 always — no auto-hide
- Transition: `opacity 0.3s ease`

### Touch interaction model
- Single finger = draw with current tool (pen or eraser)
- Two-finger drag = pan (regardless of selected tool) — **only on touch devices**
- Pan tool + single finger = pan (works on both desktop and mobile)
- Pinch-to-zoom is **not supported** — use toolbar zoom buttons

---

## Files Likely to Change

| File | Change |
|---|---|
| `src/features/whiteboard/WhiteboardWorkspace.tsx` | **Rewrite** — remove hero, sidebar, stats, activity, preview. Keep only the canvas + floating toolbar + popover state. |
| `src/features/whiteboard/WhiteboardToolbar.tsx` | **Rewrite** — floating pill bar with icon-only buttons + popover. |
| `src/features/whiteboard/WhiteboardCanvas.tsx` | **Rewrite** — full-screen viewport, no ResizeObserver of board-sized div. |
| `src/features/whiteboard/useCanvasDrawing.ts` | **Major refactor** — replace auto-expanding fixed board with infinite viewport (offset-based panning, viewport-sized canvas element, world-coordinate transforms). |
| `src/styles.css` (lines 3038–3538) | **Replace** v2 overrides with new floating toolbar + full-screen canvas styles. Keep v1 base styles for `.wb-canvas` etc. |

**No changes to:** `rendering.ts`, `WhiteboardPreview.tsx`, `WhiteboardWidget.tsx`, `api-types.ts`, `shared/whiteboard.ts`, `router.ts`, `data.ts`, `App.tsx`, `modules.ts`.

---

## Implementation Plan

### Step 1: Rewrite `useCanvasDrawing.ts` — infinite viewport

Replace the fixed-board auto-expansion with an infinite viewport model:

- Remove `DEFAULT_BOARD_SIZE`, `BOARD_PADDING`, `BOARD_EXPAND_MARGIN`, `BOARD_EXPAND_BY` constants
- Remove `boardSize` state — canvas element fills viewport (`window.innerWidth × window.innerHeight`)
- Add `viewportOffset` state: `{ x: number, y: number }` — the world-space origin visible at the top-left of the canvas
- Modify `getCanvasPoint` to account for viewport offset: `worldX = viewportOffset.x + (clientX - rect.left) / zoom`, `worldY = viewportOffset.y + (clientY - rect.top) / zoom`
- Modify `pan` logic to update `viewportOffset` instead of scrolling `containerRef`
- Keep `boardSize` only for stroke-bounds calculation (for export): compute from stroke extents, not for canvas sizing
- Canvas element gets `width={window.innerWidth * dpr}` and `height={window.innerHeight * dpr}` (DPR-aware)
- `handleResize` updates canvas dimensions to viewport size (not board size)
- `redrawCanvas` must translate context by `-viewportOffset.x * zoom, -viewportOffset.y * zoom` before drawing strokes
- `exportPng` still needs bounds — compute from all stroke points (min/max x,y), add padding
- Keep undo/redo, commitStroke, keyboard shortcuts, optimistic strokes — all unchanged in logic
- Add two-finger pan detection: track `pointerdown` count; if ≥2 pointers active, enter pan mode automatically (even if tool is pen). On `pointerup`, if only 1 pointer remains, resume drawing tool
- Add `contextmenu` event listener to prevent long-press context menu on canvas

### Step 2: Rewrite `WhiteboardCanvas.tsx` — full-screen

- Remove `containerRef` prop (no longer needed — canvas is the container)
- Canvas fills viewport: `width: 100vw; height: 100svh`
- Background surface div behind the canvas (not on canvas stage)
- Remove `boardSize` prop (canvas is viewport-sized)
- Empty state: centered, minimal, fades after first stroke
- Pass `isPanning` to control cursor only

### Step 3: Rewrite `WhiteboardToolbar.tsx` — floating pill

- Remove all current props except: `tool`, `setTool`, `color`, `setColor`, `zoom`, `setZoom`, `onUndo`, `onRedo`, `canUndo`, `canRedo`, `surface`, `setSurface`, `width`, `setWidth`, `opacity`, `setOpacity`, `onExport`, `onClearAll`
- Main bar: flex row, centered, `border-radius: 999px`, frosted glass background
- Icon buttons: use simple text/symbols (✏ for pen, ⬜ for eraser, ✋ for pan, ↶/↷ for undo/redo, −/+ for zoom)
- Color dots: 6 presets in a row, plus a custom color trigger
- ⋯ button opens a popover (absolutely positioned above toolbar)
- Popover contains: width slider, opacity slider, surface chips, export button, clear button
- Auto-hide: controlled by parent via `visible` prop or internal idle timer

### Step 4: Rewrite `WhiteboardWorkspace.tsx` — minimal shell

- Remove: `<header className="wb-hero">`, stat strip, sidebar, side panels, activity list, shortcuts note
- Structure: full-screen container with canvas + floating toolbar
- State: tool, color, width, opacity, surface, zoom, toolbarVisible
- Toolbar visibility timer: reset on pointer activity, hide after 3s
- Keep: prefs persistence (localStorage), auto-refresh (15s), export, clear all, sync status (hidden, only used for error)
- The component renders:
  ```
  <section className="whiteboard-workspace">
    <WhiteboardCanvas ... />
    <WhiteboardToolbar visible={toolbarVisible} ... />
  </section>
  ```

### Step 5: Replace CSS (lines 3038–3538)

Remove all v2 override styles. Add new styles:

- `.whiteboard-workspace`: `position: fixed; inset: 0; overflow: hidden;` (full viewport)
- `.wb-canvas-container`: `position: absolute; inset: 0;` (fills workspace)
- `.wb-canvas`: `display: block; width: 100%; height: 100%;` (fills container)
- `.wb-surface-bg`: `position: absolute; inset: 0; pointer-events: none;` with surface-specific backgrounds (grid/dots/ledger/plain)
- `.wb-toolbar-float`: `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);` pill shape, frosted glass, z-index 50
- `.wb-toolbar-float.hidden`: `opacity: 0.3; pointer-events: none;`
- `.wb-toolbar-popover`: `position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);` same frosted glass
- `.wb-empty-center`: `position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none;` subtle text
- Responsive: on mobile (<768px), toolbar bottom: 12px, popover full-width, toolbar width: calc(100vw - 32px)
- Touch targets: minimum 44px tap area for all interactive elements
- `.whiteboard-workspace`: add `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` for notch devices
- Use `100dvh` instead of `100svh` for better mobile browser support

Keep all existing `.wb-canvas`, `.wb-preview`, `.whiteboard-widget` styles untouched (used by preview and home widget).

---

## Acceptance Criteria

1. Whiteboard fills the entire viewport — no header, no sidebar, no status bars visible
2. Canvas is infinite — drawing near the edge does not hit a boundary; panning moves the viewport freely in any direction
3. Floating toolbar is visible at bottom center with frosted glass appearance
4. Toolbar contains: pen, eraser, pan, 6 color dots + custom, undo, redo, zoom −/+, menu (⋯)
5. ⋯ popover shows width slider, opacity slider, surface picker, export, clear
6. **Desktop**: toolbar auto-hides after 3s of canvas inactivity; reappears on pointer movement
7. **Mobile**: toolbar stays visible at all times, respects safe area insets
8. Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) work
9. Drawing, erasing, and panning all function correctly on infinite canvas
10. **Touch**: single finger draws, two-finger drag pans
11. Export PNG produces correct output of all visible strokes
12. Preferences still persist to localStorage and restore on reload
13. Home dashboard whiteboard widget unchanged
14. `npm run build` succeeds
15. `npm test` passes

---

## Test and Verification Notes

- **Build**: `npm run build` — must pass (TypeScript + Vite)
- **Unit tests**: `npm test` — existing whiteboard tests in `src/shared/whiteboard.test.ts` should still pass (no type changes)
- **Visual**: `npm run dev` → navigate to whiteboard tab → verify full-screen canvas, floating toolbar, drawing, panning, zooming, tool switching, popover, auto-hide
- **Mobile visual**: open dev tools responsive mode → test toolbar layout, touch drawing, two-finger pan, safe area insets, popover sizing
- **Manual checks**:
  - Draw strokes near edges — canvas should not truncate
  - Pan across large distances — infinite scroll in all directions
  - Export PNG — should capture all strokes correctly
  - Mobile viewport — toolbar adapts, touch targets ≥44px, popover expands
  - Two-finger pan on touch — should pan without drawing
  - Preferences persistence — reload page, verify tool/color/width/opacity restored
  - Safe area inset — toolbar doesn't overlap iOS notch area
- **No E2E changes needed** — existing whiteboard E2E tests would need update but E2E is not run in CI

---

## Mobile / Touch Considerations

### Toolbar on mobile
- Toolbar stays **always visible** on touch devices — no auto-hide (no hover intent on touch)
- Detect touch device via `'ontouchstart' in window` or `matchMedia('(hover: none)')` at mount
- Toolbar floats at `bottom: env(safe-area-inset-bottom, 12px)` to respect iOS notch
- Toolbar width: `calc(100vw - 32px)` on mobile, max-width 520px on desktop
- Toolbar padding reduces on mobile (8px → 6px between groups)
- Icon buttons: 36px touch targets (minimum 44px with padding), no labels
- Color dots: 24px on mobile (larger touch target with padding)

### Popover on mobile
- Popover expands to near-full-width: `width: calc(100vw - 24px)`
- Popover anchored to bottom of toolbar, slides up with animation
- Sliders get larger thumb controls for finger input
- Surface chips stack in 2×2 grid on mobile
- Export/Clear buttons full-width, stacked

### Touch drawing
- `touch-action: none` on canvas (already present) prevents browser gestures
- Multi-touch: ignore secondary touches (only track first pointer for drawing)
- Pinch-to-zoom: **not implemented** in v1 — use toolbar zoom buttons only (avoids conflict with drawing)
- Long-press on canvas: do nothing (no context menu — `event.preventDefault()` on `contextmenu` event)

### Viewport / safe areas
- Canvas fills `100dvh` (dynamic viewport height — handles mobile browser chrome)
- Canvas container accounts for `env(safe-area-inset-*)` via `padding` on the workspace wrapper
- Status bar area: leave transparent, toolbar sits above it

### Gesture conflict prevention
- On touch, panning requires **two-finger drag** (or select pan tool + single finger)
- Single-finger on touch always draws (with current tool)
- This avoids accidental pans when drawing on mobile

## Open Questions

None — all assumptions resolved above.
