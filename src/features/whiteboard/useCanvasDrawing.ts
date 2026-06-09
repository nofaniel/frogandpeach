import { useCallback, useEffect, useRef, useState } from 'react'
import type { WhiteboardStroke } from '../../shared/api-types'

const POINT_SAMPLING_DISTANCE = 5

type Tool = 'pen' | 'eraser'

type DrawingOptions = {
  tool: Tool
  color: string
  width: number
}

type Point = { x: number; y: number }

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: { points: Point[]; color: string; width: number; tool: string; opacity: number }) {
  const { points, color, width, tool, opacity } = stroke
  if (points.length === 0) return

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1)
  } else if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y)
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2
      const my = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
  }

  ctx.stroke()
  ctx.restore()
}

export function useCanvasDrawing(
  serverStrokes: WhiteboardStroke[],
  options: DrawingOptions,
  onAddStroke: (stroke: Omit<WhiteboardStroke, 'id' | 'createdByName' | 'createdAt'>) => void,
  onRemoveStroke: (id: string) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const currentPoints = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)

  // Local strokes: server strokes + optimistically added strokes
  const localStrokesRef = useRef<Array<{ points: Point[]; color: string; width: number; tool: string; opacity: number; tempId: string }>>([])
  // Undo/redo stacks: for local strokes we keep the full data; for server strokes just the ID
  type UndoEntry = { id: string; isServer: false; stroke: typeof localStrokesRef.current[number] }
    | { id: string; isServer: true }
  const undoStackRef = useRef<UndoEntry[]>([])
  const redoStackRef = useRef<UndoEntry[]>([])
  const [undoRedoVersion, setUndoRedoVersion] = useState(0)

  // Build the full stroke list for rendering: server strokes + local strokes
  const allStrokesForRender = useCallback(() => {
    const result: Array<{ points: Point[]; color: string; width: number; tool: string; opacity: number }> = []
    // Add server strokes that haven't been undone
    const undoneServerIds = new Set(
      undoStackRef.current.filter((e) => e.isServer).map((e) => e.id),
    )
    for (const s of serverStrokes) {
      if (!undoneServerIds.has(s.id)) {
        result.push(s)
      }
    }
    // Add local strokes (these are always "current")
    for (const ls of localStrokesRef.current) {
      result.push(ls)
    }
    return result
  }, [serverStrokes])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)
    for (const stroke of allStrokesForRender()) {
      drawStroke(ctx, stroke)
    }
    ctx.restore()
  }, [allStrokesForRender])

  // Redraw when server strokes or undo/redo state changes
  useEffect(() => {
    redrawCanvas()
  }, [serverStrokes, undoRedoVersion, redrawCanvas])

  const getCanvasPoint = useCallback((e: PointerEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    isDrawing.current = true
    const point = getCanvasPoint(e)
    currentPoints.current = [point]
    lastPoint.current = point
    canvas.setPointerCapture(e.pointerId)
  }, [getCanvasPoint])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const point = getCanvasPoint(e)
    const prev = lastPoint.current
    if (prev && distance(prev, point) < POINT_SAMPLING_DISTANCE) return

    currentPoints.current.push(point)
    lastPoint.current = point

    // Draw incrementally on canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = options.tool === 'eraser' ? '#ffffff' : options.color
    ctx.lineWidth = options.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const pts = currentPoints.current
    const len = pts.length
    if (len >= 2) {
      ctx.beginPath()
      if (len === 2) {
        ctx.moveTo(pts[0].x, pts[0].y)
        ctx.lineTo(pts[1].x, pts[1].y)
      } else {
        ctx.moveTo(pts[len - 3].x, pts[len - 3].y)
        const mx = (pts[len - 2].x + pts[len - 1].x) / 2
        const my = (pts[len - 2].y + pts[len - 1].y) / 2
        ctx.quadraticCurveTo(pts[len - 2].x, pts[len - 2].y, mx, my)
      }
      ctx.stroke()
    }
    ctx.restore()
  }, [getCanvasPoint, options])

  const handlePointerUp = useCallback((_e: PointerEvent) => {
    if (!isDrawing.current) return
    isDrawing.current = false

    if (currentPoints.current.length > 0) {
      const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      const strokeData = {
        points: [...currentPoints.current],
        color: options.color,
        width: options.width,
        tool: options.tool,
        opacity: 1,
      }

      const localStroke = { ...strokeData, tempId }
      // Add to local strokes
      localStrokesRef.current.push(localStroke)
      // Track in undo stack with full data for redo
      undoStackRef.current.push({ id: tempId, isServer: false, stroke: localStroke })
      // Clear redo stack
      redoStackRef.current = []

      // Post to server (fire and forget — refresh will pick it up)
      onAddStroke(strokeData)
    }

    currentPoints.current = []
    lastPoint.current = null
  }, [options, onAddStroke])

  // Attach pointer events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function undo() {
    const entry = undoStackRef.current.pop()
    if (!entry) return

    if (entry.isServer) {
      // Remove server stroke by ID
      onRemoveStroke(entry.id)
    } else {
      // Remove local stroke by tempId
      const idx = localStrokesRef.current.findIndex((s) => s.tempId === entry.id)
      if (idx !== -1) localStrokesRef.current.splice(idx, 1)
    }
    redoStackRef.current.push(entry)
    setUndoRedoVersion((v) => v + 1)
  }

  function redo() {
    const entry = redoStackRef.current.pop()
    if (!entry) return

    if (!entry.isServer) {
      // Re-add local stroke from stored data
      localStrokesRef.current.push(entry.stroke)
      undoStackRef.current.push(entry)
    } else {
      // Server strokes: can't re-add without the stroke data. Push back.
      redoStackRef.current.push(entry)
      return
    }
    setUndoRedoVersion((v) => v + 1)
  }

  function clearAll() {
    localStrokesRef.current = []
    undoStackRef.current = []
    redoStackRef.current = []
    setUndoRedoVersion((v) => v + 1)
  }

  function handleResize() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    redrawCanvas()
  }

  return {
    canvasRef,
    undo,
    redo,
    clearAll,
    handleResize,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }
}
