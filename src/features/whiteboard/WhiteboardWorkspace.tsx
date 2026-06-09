import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import { WhiteboardCanvas } from './WhiteboardCanvas'
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
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawingOptions = useMemo(() => ({ tool, color, width, opacity }), [tool, color, width, opacity])

  const {
    canvasRef,
    viewportOffset,
    isPanning,
    canvasSize,
    isTouchDevice,
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

  const resetHideTimer = useCallback(() => {
    if (isTouchDevice) return
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setToolbarVisible(true)
    hideTimerRef.current = setTimeout(() => {
      setToolbarVisible(false)
    }, 3500)
  }, [isTouchDevice])

  useEffect(() => {
    if (isTouchDevice) {
      setToolbarVisible(true)
      return
    }
    resetHideTimer()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isTouchDevice, resetHideTimer])

  const handleCanvasInteraction = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setToolbarVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      if (document.hidden) return
      try {
        await onRefresh()
      } catch {
        // silent
      }
    }
    const timer = window.setInterval(() => {
      if (!cancelled) void refresh()
    }, 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [onRefresh])

  function clampZoom(next: number) {
    return Math.min(3, Math.max(0.1, Number(next.toFixed(2))))
  }

  async function handleClearAll() {
    if (!window.confirm('Clear the entire whiteboard?')) return
    const restore = clearCanvasHistory()
    try {
      await onClearAll()
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

  return (
    <section
      className="whiteboard-workspace"
      onMouseMove={handleCanvasInteraction}
      onTouchStart={handleCanvasInteraction}
    >
      <WhiteboardCanvas
        canvasRef={canvasRef}
        tool={tool}
        isPanning={isPanning}
        surface={surface}
        handleResize={handleResize}
        empty={strokes.length === 0}
      />

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
        onZoomOut={() => setZoom((c) => clampZoom(c - 0.15))}
        onZoomIn={() => setZoom((c) => clampZoom(c + 0.15))}
        onResetZoom={() => setZoom(1)}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onExport={handleExport}
        onClearAll={() => void handleClearAll()}
        canUndo={canUndo}
        canRedo={canRedo}
        visible={toolbarVisible}
      />
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
