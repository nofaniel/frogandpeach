import { useState, useRef, useEffect } from 'react'
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

const TOOL_OPTIONS: Array<{ id: Tool; label: string; icon: string }> = [
  { id: 'pen', label: 'Draw', icon: '✎' },
  { id: 'eraser', label: 'Erase', icon: '◻' },
  { id: 'pan', label: 'Pan', icon: '✋' },
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
  onUndo,
  onRedo,
  onExport,
  onClearAll,
  canUndo,
  canRedo,
  visible,
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
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onClearAll: () => void
  canUndo: boolean
  canRedo: boolean
  visible: boolean
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popoverOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popoverOpen])

  return (
    <div className={`wb-floating-toolbar ${visible ? 'visible' : 'auto-hidden'}`}>
      {TOOL_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`wb-ftool-btn${tool === option.id ? ' active' : ''}`}
          onClick={() => setTool(option.id)}
          title={option.label}
        >
          {option.icon}
        </button>
      ))}

      <div className="wb-ftool-divider" />

      {COLOR_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          className={`wb-ftool-color${color === preset ? ' active' : ''}`}
          style={{ backgroundColor: preset }}
          onClick={() => setColor(preset)}
          title={preset}
        />
      ))}

      <div className="wb-ftool-divider" />

      <button
        type="button"
        className="wb-ftool-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        ↶
      </button>
      <button
        type="button"
        className="wb-ftool-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        ↷
      </button>

      <div className="wb-ftool-divider" />

      <button type="button" className="wb-ftool-btn" onClick={onZoomOut} title="Zoom out">
        −
      </button>
      <button type="button" className="wb-ftool-zoom-label" onClick={onResetZoom} title="Reset zoom">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className="wb-ftool-btn" onClick={onZoomIn} title="Zoom in">
        +
      </button>

      <div className="wb-ftool-divider" />

      <div className="wb-ftool-more-anchor" ref={popoverRef}>
        <button
          type="button"
          className={`wb-ftool-btn wb-ftool-more${popoverOpen ? ' active' : ''}`}
          onClick={() => setPopoverOpen((o) => !o)}
          title="More options"
        >
          ⋯
        </button>
        {popoverOpen && (
          <div className="wb-ftool-popover">
            <div className="wb-ftool-popover-section">
              <label className="wb-ftool-popover-label">
                Stroke weight
                <input
                  type="range"
                  min="1"
                  max="22"
                  step="1"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
                <strong>{width}px</strong>
              </label>
            </div>
            <div className="wb-ftool-popover-section">
              <label className="wb-ftool-popover-label">
                Opacity
                <input
                  type="range"
                  min="0.08"
                  max="1"
                  step="0.02"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
                <strong>{Math.round(opacity * 100)}%</strong>
              </label>
            </div>
            <div className="wb-ftool-popover-section">
              <span className="wb-ftool-popover-heading">Surface</span>
              <div className="wb-ftool-popover-chips">
                {WHITEBOARD_SURFACES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`wb-ftool-popover-chip${surface === entry.id ? ' active' : ''}`}
                    onClick={() => setSurface(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="wb-ftool-popover-divider" />
            <button type="button" className="wb-ftool-popover-action" onClick={onExport}>
              Export PNG
            </button>
            <button type="button" className="wb-ftool-popover-action danger" onClick={onClearAll}>
              Clear board
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
