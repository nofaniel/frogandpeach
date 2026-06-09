import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import { formatDuration } from '../../shared/format'
import { getWhiteboardPreviewStrokes } from '../../shared/whiteboard'
import { WhiteboardCanvas } from './WhiteboardCanvas'
import { WhiteboardPreview } from './WhiteboardPreview'
import { WhiteboardToolbar } from './WhiteboardToolbar'
import type { WhiteboardSurface } from './rendering'
import { useCanvasDrawing } from './useCanvasDrawing'

type Tool = 'pen' | 'eraser' | 'pan'

type SavedWhiteboardPrefs = {
  tool?: Tool
  color?: string
  width?: number
  opacity?: number
  surface?: WhiteboardSurface
}

const WHITEBOARD_PREFS_KEY = 'fp-whiteboard-prefs'

export function WhiteboardWorkspace({
  strokes,
  onAddStroke,
  onRemoveStroke,
  onClearAll,
  onRefresh,
}: {
  strokes: WhiteboardStroke[]
  onAddStroke: (stroke: WhiteboardStrokeInput) => Promise<WhiteboardStroke>
  onRemoveStroke: (id: string) => Promise<void>
  onClearAll: () => Promise<void>
  onRefresh: () => Promise<WhiteboardStroke[]>
}) {
  const savedPrefs = useMemo(readWhiteboardPrefs, [])
  const [tool, setTool] = useState<Tool>(savedPrefs.tool ?? 'pen')
  const [color, setColor] = useState(savedPrefs.color ?? '#111111')
  const [width, setWidth] = useState(savedPrefs.width ?? 4)
  const [opacity, setOpacity] = useState(savedPrefs.opacity ?? 1)
  const [surface, setSurface] = useState<WhiteboardSurface>(savedPrefs.surface ?? 'grid')
  const [zoom, setZoom] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now())
  const [syncIssue, setSyncIssue] = useState('')
  const drawingOptions = useMemo(() => ({ tool, color, width, opacity }), [tool, color, width, opacity])

  const {
    containerRef,
    canvasRef,
    boardSize,
    isPanning,
    undo,
    redo,
    clearAll: clearCanvasHistory,
    exportPng,
    handleResize,
    canUndo,
    canRedo,
  } = useCanvasDrawing(strokes, drawingOptions, onAddStroke, onRemoveStroke)

  useEffect(() => {
    writeWhiteboardPrefs({ tool, color, width, opacity, surface })
  }, [color, opacity, surface, tool, width])

  useEffect(() => {
    const newestStroke = strokes.at(-1)
    if (!newestStroke) return
    setLastSyncedAt(Date.now())
  }, [strokes])

  const previewStrokes = useMemo(() => getWhiteboardPreviewStrokes(strokes, 18), [strokes])
  const recentStrokes = useMemo(() => [...strokes].slice(-5).reverse(), [strokes])
  const contributors = useMemo(
    () => Array.from(new Set(strokes.map((stroke) => stroke.createdByName || 'Someone'))).slice(0, 6),
    [strokes],
  )
  const lastStroke = strokes.at(-1) ?? null
  const lastDrawnAgo = lastStroke ? formatDuration(Date.now() - Date.parse(lastStroke.createdAt)) : null

  const refreshWhiteboard = useCallback(async (showError: boolean) => {
    setIsRefreshing(true)
    try {
      await onRefresh()
      setLastSyncedAt(Date.now())
      setSyncIssue('')
    } catch (error) {
      if (showError) {
        setSyncIssue(error instanceof Error ? error.message : 'Unable to refresh the whiteboard.')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return
      void refreshWhiteboard(false)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [refreshWhiteboard])

  function clampZoom(next: number) {
    return Math.min(1.8, Math.max(0.45, Number(next.toFixed(2))))
  }

  function fitBoard() {
    const container = containerRef.current
    if (!container) return
    const availableWidth = Math.max(container.clientWidth - 48, 320)
    const availableHeight = Math.max(container.clientHeight - 48, 320)
    const nextZoom = Math.min(1.15, availableWidth / boardSize.width, availableHeight / boardSize.height)
    setZoom(clampZoom(nextZoom))
  }

  async function handleClearAll() {
    if (!window.confirm('Clear the entire whiteboard?')) return
    const restore = clearCanvasHistory()
    try {
      await onClearAll()
      setLastSyncedAt(Date.now())
      setSyncIssue('')
    } catch {
      restore()
    }
  }

  function handleExport() {
    const image = exportPng(surface)
    if (!image) return
    const link = document.createElement('a')
    link.href = image
    link.download = `frog-peach-whiteboard-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
  }

  function applyPreset(preset: { color: string; width: number; opacity: number; tool: 'pen' }) {
    setTool(preset.tool)
    setColor(preset.color)
    setWidth(preset.width)
    setOpacity(preset.opacity)
  }

  return (
    <section className="whiteboard-workspace">
      <header className="wb-hero">
        <div className="wb-hero-copy">
          <p className="kicker">Whiteboard</p>
          <h2>Shared household canvas</h2>
          <p>Sketch, annotate, erase, zoom, export, and keep the board open while everyone adds to it.</p>
        </div>
        <div className="wb-stat-strip">
          <div className="wb-stat-card">
            <span>Strokes</span>
            <strong>{strokes.length}</strong>
          </div>
          <div className="wb-stat-card">
            <span>Contributors</span>
            <strong>{contributors.length || 0}</strong>
          </div>
          <div className="wb-stat-card">
            <span>Board size</span>
            <strong>{Math.round(boardSize.width)} × {Math.round(boardSize.height)}</strong>
          </div>
          <div className="wb-stat-card">
            <span>Last draw</span>
            <strong>{lastDrawnAgo ? `${lastDrawnAgo} ago` : 'Nothing yet'}</strong>
          </div>
        </div>
      </header>

      <div className="wb-layout">
        <aside className="wb-sidebar">
          <WhiteboardToolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            width={width}
            setWidth={setWidth}
            opacity={opacity}
            setOpacity={setOpacity}
            surface={surface}
            setSurface={setSurface}
            zoom={zoom}
            onZoomOut={() => setZoom((current) => clampZoom(current - 0.12))}
            onZoomIn={() => setZoom((current) => clampZoom(current + 0.12))}
            onResetZoom={() => setZoom(1)}
            onFitBoard={fitBoard}
            onUndo={() => void undo()}
            onRedo={() => void redo()}
            onRefresh={() => void refreshWhiteboard(true)}
            onExport={handleExport}
            onClearAll={() => void handleClearAll()}
            onApplyPreset={applyPreset}
            canUndo={canUndo}
            canRedo={canRedo}
            isRefreshing={isRefreshing}
          />

          <section className="wb-side-panel">
            <div className="wb-side-panel-header">
              <div>
                <p className="wb-panel-kicker">Preview</p>
                <h3>Board snapshot</h3>
              </div>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <WhiteboardPreview strokes={previewStrokes} surface={surface} className="wb-preview-large" emptyLabel="Nothing on the board yet" />
          </section>

          <section className="wb-side-panel">
            <div className="wb-side-panel-header">
              <div>
                <p className="wb-panel-kicker">Activity</p>
                <h3>Recent marks</h3>
              </div>
              <span>{contributors.join(' • ') || 'No contributors yet'}</span>
            </div>
            <ul className="wb-activity-list">
              {recentStrokes.length === 0 && <li className="wb-activity-empty">The board is clear.</li>}
              {recentStrokes.map((stroke) => (
                <li key={stroke.id} className="wb-activity-item">
                  <span className={`wb-activity-swatch${stroke.tool === 'eraser' ? ' eraser' : ''}`} style={{ backgroundColor: stroke.tool === 'eraser' ? '#ffffff' : stroke.color }} />
                  <div>
                    <strong>{stroke.createdByName || 'Someone'} {stroke.tool === 'eraser' ? 'erased' : 'drew'}</strong>
                    <span>{formatDuration(Date.now() - Date.parse(stroke.createdAt))} ago • {stroke.width}px • {Math.round(stroke.opacity * 100)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="wb-side-panel wb-side-note">
            <p className="wb-panel-kicker">Shortcuts</p>
            <p><strong>Undo</strong> with Ctrl/Cmd+Z, <strong>redo</strong> with Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y, and switch to <strong>Pan</strong> to move around larger sketches.</p>
          </section>
        </aside>

        <div className="wb-board-column">
          <div className="wb-board-bar">
            <span>Surface: {surface}</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>{isRefreshing ? 'Syncing with the board…' : `Last synced ${formatDuration(Date.now() - lastSyncedAt)} ago`}</span>
          </div>
          <WhiteboardCanvas
            containerRef={containerRef}
            canvasRef={canvasRef}
            tool={tool}
            boardSize={boardSize}
            isPanning={isPanning}
            zoom={zoom}
            surface={surface}
            handleResize={handleResize}
            empty={strokes.length === 0}
          />
          <div className="wb-board-footer">
            <span>The canvas expands automatically when you draw near the edge.</span>
            <span>{syncIssue || 'Open this tab on another device to see the board refresh every 15 seconds.'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function readWhiteboardPrefs(): SavedWhiteboardPrefs {
  try {
    const raw = window.localStorage.getItem(WHITEBOARD_PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SavedWhiteboardPrefs
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeWhiteboardPrefs(prefs: SavedWhiteboardPrefs) {
  try {
    window.localStorage.setItem(WHITEBOARD_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore storage failures */
  }
}
