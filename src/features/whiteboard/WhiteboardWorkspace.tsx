import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import { WhiteboardCanvas } from './WhiteboardCanvas'
import { WhiteboardToolbar } from './WhiteboardToolbar'
import { BrushSizeSlider } from './BrushSizeSlider'
import { useCanvasDrawing } from './useCanvasDrawing'

type DrawingTool = 'pen' | 'eraser'

type SavedWhiteboardPrefs = {
  tool?: DrawingTool
  color?: string
  width?: number
  opacity?: number
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
  const [tool, setTool] = useState<DrawingTool>(savedPrefs.tool ?? 'pen')
  const [color] = useState(savedPrefs.color ?? '#111111')
  const [width, setWidth] = useState(savedPrefs.width ?? 4)
  const [opacity] = useState(savedPrefs.opacity ?? 1)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawingOptions = useMemo(() => ({ tool, color, width, opacity }), [tool, color, width, opacity])

  const {
    canvasRef,
    canvasSize,
    isTouchDevice,
    undo,
    redo,
    clearAll: clearCanvasHistory,
    handleResize,
    canUndo,
    canRedo,
  } = useCanvasDrawing(strokes, drawingOptions, onAddStroke, onRemoveStroke)

  useEffect(() => {
    writeWhiteboardPrefs({ tool, color, width, opacity })
  }, [color, opacity, tool, width])

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

  return (
    <section
      className="whiteboard-workspace"
      onMouseMove={handleCanvasInteraction}
      onTouchStart={handleCanvasInteraction}
    >
      <WhiteboardCanvas
        canvasRef={canvasRef}
        tool={tool}
        surface="plain"
        handleResize={handleResize}
        empty={strokes.length === 0}
      />

      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        canUndo={canUndo}
        canRedo={canRedo}
        visible={toolbarVisible}
      />

      <BrushSizeSlider
        width={width}
        onChange={setWidth}
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
