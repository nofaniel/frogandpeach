import { useCallback, useEffect, useRef, useState } from 'react'
import type { WhiteboardStroke } from '../../shared/api-types'

const POINT_SAMPLING_DISTANCE = 5
const DEFAULT_BOARD_SIZE = { width: 2400, height: 1700 }
const BOARD_PADDING = 360
const BOARD_EXPAND_MARGIN = 180
const BOARD_EXPAND_BY = 700

type DrawingTool = 'pen' | 'eraser'
type Tool = DrawingTool | 'pan'

type DrawingOptions = {
  tool: Tool
  color: string
  width: number
}

type Point = { x: number; y: number }
type RenderStroke = { points: Point[]; color: string; width: number; tool: string; opacity: number }
type LocalStroke = RenderStroke & { tempId: string }
type UndoEntry =
  | { id: string; isServer: false; stroke: LocalStroke }
  | { id: string; isServer: true }

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: RenderStroke) {
  const { points, color, width, tool, opacity } = stroke
  if (points.length === 0) return

  ctx.save()
  ctx.globalAlpha = opacity
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000'
  } else {
    ctx.strokeStyle = color
  }
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

function isDrawingTool(tool: Tool): tool is DrawingTool {
  return tool === 'pen' || tool === 'eraser'
}

export function useCanvasDrawing(
  serverStrokes: WhiteboardStroke[],
  options: DrawingOptions,
  onAddStroke: (stroke: Omit<WhiteboardStroke, 'id' | 'createdByName' | 'createdAt'>) => void,
  onRemoveStroke: (id: string) => void,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const isPanningRef = useRef(false)
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const currentPoints = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)
  const localStrokesRef = useRef<LocalStroke[]>([])
  const undoStackRef = useRef<UndoEntry[]>([])
  const redoStackRef = useRef<UndoEntry[]>([])
  const [undoRedoVersion, setUndoRedoVersion] = useState(0)
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE)
  const [isPanning, setIsPanning] = useState(false)

  const allStrokesForRender = useCallback(() => {
    const result: RenderStroke[] = []
    const undoneServerIds = new Set(
      undoStackRef.current.filter((entry) => entry.isServer).map((entry) => entry.id),
    )

    for (const stroke of serverStrokes) {
      if (!undoneServerIds.has(stroke.id)) {
        result.push(stroke)
      }
    }

    for (const stroke of localStrokesRef.current) {
      result.push(stroke)
    }

    return result
  }, [serverStrokes])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    for (const stroke of allStrokesForRender()) {
      drawStroke(ctx, stroke)
    }

    if (isDrawingTool(options.tool) && currentPoints.current.length > 0) {
      drawStroke(ctx, {
        points: currentPoints.current,
        color: options.color,
        width: options.width,
        tool: options.tool,
        opacity: 1,
      })
    }

    ctx.restore()
  }, [allStrokesForRender, options.color, options.tool, options.width])

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const nextWidth = Math.max(1, Math.round(rect.width * dpr))
    const nextHeight = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== nextWidth) canvas.width = nextWidth
    if (canvas.height !== nextHeight) canvas.height = nextHeight
    redrawCanvas()
  }, [redrawCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [serverStrokes, undoRedoVersion, redrawCanvas])

  useEffect(() => {
    handleResize()
  }, [boardSize, handleResize])

  useEffect(() => {
    let maxX = DEFAULT_BOARD_SIZE.width
    let maxY = DEFAULT_BOARD_SIZE.height

    for (const stroke of serverStrokes) {
      for (const point of stroke.points) {
        maxX = Math.max(maxX, point.x + BOARD_PADDING)
        maxY = Math.max(maxY, point.y + BOARD_PADDING)
      }
    }

    setBoardSize((current) => {
      const nextWidth = Math.ceil(Math.max(current.width, maxX))
      const nextHeight = Math.ceil(Math.max(current.height, maxY))
      return nextWidth === current.width && nextHeight === current.height
        ? current
        : { width: nextWidth, height: nextHeight }
    })
  }, [serverStrokes])

  const expandBoardIfNeeded = useCallback((point: Point) => {
    setBoardSize((current) => {
      const nextWidth = point.x > current.width - BOARD_EXPAND_MARGIN
        ? current.width + BOARD_EXPAND_BY
        : current.width
      const nextHeight = point.y > current.height - BOARD_EXPAND_MARGIN
        ? current.height + BOARD_EXPAND_BY
        : current.height

      return nextWidth === current.width && nextHeight === current.height
        ? current
        : { width: nextWidth, height: nextHeight }
    })
  }, [])

  const getCanvasPoint = useCallback((event: PointerEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)

    if (options.tool === 'pan') {
      const container = containerRef.current
      if (!container) return

      isPanningRef.current = true
      setIsPanning(true)
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
      return
    }

    isDrawing.current = true
    const point = getCanvasPoint(event)
    currentPoints.current = [point]
    lastPoint.current = point
    expandBoardIfNeeded(point)
  }, [expandBoardIfNeeded, getCanvasPoint, options.tool])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (isPanningRef.current) {
      const container = containerRef.current
      const start = panStart.current
      if (!container || !start) return

      event.preventDefault()
      container.scrollLeft = start.scrollLeft - (event.clientX - start.x)
      container.scrollTop = start.scrollTop - (event.clientY - start.y)
      return
    }

    if (!isDrawing.current || !isDrawingTool(options.tool)) return
    const canvas = canvasRef.current
    if (!canvas) return

    event.preventDefault()
    const point = getCanvasPoint(event)
    const prev = lastPoint.current
    if (prev && distance(prev, point) < POINT_SAMPLING_DISTANCE) return

    currentPoints.current.push(point)
    lastPoint.current = point
    expandBoardIfNeeded(point)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)
    if (options.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000000'
    } else {
      ctx.strokeStyle = options.color
    }
    ctx.lineWidth = options.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const points = currentPoints.current
    const length = points.length
    if (length >= 2) {
      ctx.beginPath()
      if (length === 2) {
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
      } else {
        ctx.moveTo(points[length - 3].x, points[length - 3].y)
        const mx = (points[length - 2].x + points[length - 1].x) / 2
        const my = (points[length - 2].y + points[length - 1].y) / 2
        ctx.quadraticCurveTo(points[length - 2].x, points[length - 2].y, mx, my)
      }
      ctx.stroke()
    }

    ctx.restore()
  }, [expandBoardIfNeeded, getCanvasPoint, options.color, options.tool, options.width])

  const finishPointerInteraction = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current

    if (isPanningRef.current) {
      isPanningRef.current = false
      setIsPanning(false)
      panStart.current = null
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (!isDrawing.current || !isDrawingTool(options.tool)) return
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
      localStrokesRef.current.push(localStroke)
      undoStackRef.current.push({ id: tempId, isServer: false, stroke: localStroke })
      redoStackRef.current = []
      onAddStroke(strokeData)
      setUndoRedoVersion((version) => version + 1)
    }

    currentPoints.current = []
    lastPoint.current = null
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }, [options.color, options.tool, options.width, onAddStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', finishPointerInteraction)
    canvas.addEventListener('pointercancel', finishPointerInteraction)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', finishPointerInteraction)
      canvas.removeEventListener('pointercancel', finishPointerInteraction)
    }
  }, [finishPointerInteraction, handlePointerDown, handlePointerMove])

  const undo = useCallback(() => {
    const entry = undoStackRef.current.pop()
    if (!entry) return

    if (entry.isServer) {
      onRemoveStroke(entry.id)
    } else {
      const index = localStrokesRef.current.findIndex((stroke) => stroke.tempId === entry.id)
      if (index !== -1) localStrokesRef.current.splice(index, 1)
    }

    redoStackRef.current.push(entry)
    setUndoRedoVersion((version) => version + 1)
  }, [onRemoveStroke])

  const redo = useCallback(() => {
    const entry = redoStackRef.current.pop()
    if (!entry) return

    if (entry.isServer) {
      redoStackRef.current.push(entry)
      return
    }

    localStrokesRef.current.push(entry.stroke)
    undoStackRef.current.push(entry)
    setUndoRedoVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redo, undo])

  function clearAll() {
    localStrokesRef.current = []
    undoStackRef.current = []
    redoStackRef.current = []
    setBoardSize(DEFAULT_BOARD_SIZE)
    setUndoRedoVersion((version) => version + 1)
  }

  return {
    containerRef,
    canvasRef,
    boardSize,
    isPanning,
    undo,
    redo,
    clearAll,
    handleResize,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }
}
