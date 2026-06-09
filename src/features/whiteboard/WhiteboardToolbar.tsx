import type { WhiteboardSurface } from './rendering'
import { WHITEBOARD_SURFACES } from './rendering'

type Tool = 'pen' | 'eraser' | 'pan'

const COLOR_PRESETS = [
  '#111111',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#0ea5e9',
  '#4f46e5',
  '#ec4899',
]

const BRUSH_PRESETS = [
  { label: 'Fine', color: '#111111', width: 3, opacity: 1, tool: 'pen' as const },
  { label: 'Marker', color: '#0f766e', width: 6, opacity: 0.94, tool: 'pen' as const },
  { label: 'Highlight', color: '#facc15', width: 14, opacity: 0.22, tool: 'pen' as const },
]

const TOOL_OPTIONS: Array<{ id: Tool; label: string; icon: string }> = [
  { id: 'pen', label: 'Draw', icon: 'Pen' },
  { id: 'eraser', label: 'Erase', icon: 'Erase' },
  { id: 'pan', label: 'Pan', icon: 'Move' },
]

export function WhiteboardToolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  opacity,
  setOpacity,
  surface,
  setSurface,
  zoom,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onFitBoard,
  onUndo,
  onRedo,
  onRefresh,
  onExport,
  onClearAll,
  onApplyPreset,
  canUndo,
  canRedo,
  isRefreshing,
}: {
  tool: Tool
  setTool: (tool: Tool) => void
  color: string
  setColor: (color: string) => void
  width: number
  setWidth: (width: number) => void
  opacity: number
  setOpacity: (opacity: number) => void
  surface: WhiteboardSurface
  setSurface: (surface: WhiteboardSurface) => void
  zoom: number
  onZoomOut: () => void
  onZoomIn: () => void
  onResetZoom: () => void
  onFitBoard: () => void
  onUndo: () => void
  onRedo: () => void
  onRefresh: () => void
  onExport: () => void
  onClearAll: () => void
  onApplyPreset: (preset: { color: string; width: number; opacity: number; tool: 'pen' }) => void
  canUndo: boolean
  canRedo: boolean
  isRefreshing: boolean
}) {
  return (
    <div className="wb-toolbar">
      <section className="wb-toolbar-section">
        <div className="wb-toolbar-label-row">
          <p className="wb-toolbar-label">Tools</p>
          <span className="wb-toolbar-hint">Ctrl/Cmd+Z to undo</span>
        </div>
        <div className="wb-tool-grid">
          {TOOL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`wb-segment-btn${tool === option.id ? ' active' : ''}`}
              onClick={() => setTool(option.id)}
              title={option.label}
            >
              <span>{option.icon}</span>
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
        <div className="wb-preset-row">
          {BRUSH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="wb-preset-chip"
              onClick={() => onApplyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="wb-toolbar-section">
        <div className="wb-toolbar-label-row">
          <p className="wb-toolbar-label">Ink</p>
          <span className="wb-toolbar-hint">{Math.round(opacity * 100)}% opacity</span>
        </div>
        <div className="wb-color-group">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`wb-color-swatch${color === preset ? ' active' : ''}`}
              style={{ backgroundColor: preset }}
              onClick={() => setColor(preset)}
              title={preset}
            />
          ))}
          <label className="wb-custom-color" title="Custom ink colour">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
        </div>
        <label className="wb-range-field">
          <span>Stroke weight</span>
          <input
            type="range"
            min="1"
            max="22"
            step="1"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
          <strong>{width}px</strong>
        </label>
        <label className="wb-range-field">
          <span>Transparency</span>
          <input
            type="range"
            min="0.08"
            max="1"
            step="0.02"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
          />
          <strong>{Math.round(opacity * 100)}%</strong>
        </label>
      </section>

      <section className="wb-toolbar-section">
        <div className="wb-toolbar-label-row">
          <p className="wb-toolbar-label">Surface</p>
          <span className="wb-toolbar-hint">Visual only</span>
        </div>
        <div className="wb-chip-grid">
          {WHITEBOARD_SURFACES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`wb-chip${surface === entry.id ? ' active' : ''}`}
              onClick={() => setSurface(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="wb-toolbar-label-row">
          <p className="wb-toolbar-label">View</p>
          <span className="wb-toolbar-hint">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="wb-chip-grid">
          <button type="button" className="wb-chip" onClick={onZoomOut}>Zoom out</button>
          <button type="button" className="wb-chip" onClick={onZoomIn}>Zoom in</button>
          <button type="button" className="wb-chip" onClick={onResetZoom}>100%</button>
          <button type="button" className="wb-chip" onClick={onFitBoard}>Fit board</button>
        </div>
      </section>

      <section className="wb-toolbar-section wb-toolbar-actions">
        <div className="wb-toolbar-label-row">
          <p className="wb-toolbar-label">Actions</p>
          <span className="wb-toolbar-hint">{isRefreshing ? 'Syncing…' : 'Ready'}</span>
        </div>
        <div className="wb-action-grid">
          <button type="button" className="wb-action-btn" onClick={onUndo} disabled={!canUndo}>Undo</button>
          <button type="button" className="wb-action-btn" onClick={onRedo} disabled={!canRedo}>Redo</button>
          <button type="button" className="wb-action-btn" onClick={onRefresh}>Refresh</button>
          <button type="button" className="wb-action-btn" onClick={onExport}>Export PNG</button>
          <button type="button" className="wb-action-btn danger" onClick={onClearAll}>Clear board</button>
        </div>
      </section>
    </div>
  )
}
