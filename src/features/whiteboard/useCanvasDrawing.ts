import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import type { WhiteboardSurface } from './rendering'
import { drawWhiteboardStroke, paintWhiteboardSurface } from './rendering'

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
  opacity: number
}

type Point = { x: number; y: number }
type LocalStroke = WhiteboardStrokeInput & { tempId: string }
type HistoryEntry = {
  historyId: string
  tempId: string
  stroke: WhiteboardStrokeInput
  persistedId: string | null
  status: 'pending' | 'saved' | 'cancelled'
  epoch: number
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function isDrawingTool(tool: Tool): tool is DrawingTool {
  return tool === 'pen' || tool === 'eraser'
}

function createTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function useCanvasDrawing(
  serverStrokes: WhiteboardStroke[],
  options: DrawingOptions,
  onAddStroke: (stroke: WhiteboardStrokeInput) => Promise<WhiteboardStroke>,
  onRemoveStroke: (id: string) => Promise<void>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const isPanningRef = useRef(false)
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const currentPoints = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)
  const hiddenServerStrokeIdsRef = useRef<Set<string>>(new Set())
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<WhiteboardStrokeInput[]>([])
  const clearEpochRef = useRef(0)
  const [optimisticStrokes, setOptimisticStrokes] = useState<LocalStroke[]>([])
  const [version, setVersion] = useState(0)
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE)
  const [isPanning, setIsPanning] = useState(false)

  const renderStrokes = useMemo(
    () => [
      ...serverStrokes.filter((stroke) => !hiddenServerStrokeIdsRef.current.has(stroke.id)),
      ...optimisticStrokes,
    ],
    [optimisticStrokes, serverStrokes, version],
  )

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    for (const stroke of renderStrokes) {
      drawWhiteboardStroke(ctx, stroke)
    }

    if (isDrawingTool(options.tool) && currentPoints.current.length > 0) {
      drawWhiteboardStroke(ctx, {
        points: currentPoints.current,
        color: options.color,
        width: options.width,
        tool: options.tool,
        opacity: options.opacity,
      })
    }

    ctx.restore()
  }, [options.color, options.opacity, options.tool, options.width, renderStrokes])

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
  }, [redrawCanvas, version])

  useEffect(() => {
    handleResize()
  }, [boardSize, handleResize])

  useEffect(() => {
    let maxX = DEFAULT_BOARD_SIZE.width
    let maxY = DEFAULT_BOARD_SIZE.height

    for (const stroke of renderStrokes) {
      for (const point of stroke.points) {
        maxX = Math.max(maxX, point.x + BOARD_PADDING)
        maxY = Math.max(maxY, point.y + BOARD_PADDING)
      }
    }

    setBoardSize((current) => {
      const nextWidth = Math.ceil(Math.max(DEFAULT_BOARD_SIZE.width, maxX))
      const nextHeight = Math.ceil(Math.max(DEFAULT_BOARD_SIZE.height, maxY))
      return nextWidth === current.width && nextHeight === current.height
        ? current
        : { width: nextWidth, height: nextHeight }
    })
  }, [renderStrokes])

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
    const scaleX = boardSize.width / Math.max(rect.width, 1)
    const scaleY = boardSize.height / Math.max(rect.height, 1)
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }, [boardSize.height, boardSize.width])

  const queueStrokePersistence = useCallback(async (entry: HistoryEntry, localStroke: LocalStroke) => {
    try {
      const created = await onAddStroke(entry.stroke)
      if (entry.status === 'cancelled' || entry.epoch !== clearEpochRef.current) {
        await onRemoveStroke(created.id)
        return
      }

      entry.persistedId = created.id
      entry.status = 'saved'
      setOptimisticStrokes((current) => current.filter((stroke) => stroke.tempId !== localStroke.tempId))
      setVersion((current) => current + 1)
    } catch {
      setOptimisticStrokes((current) => current.filter((stroke) => stroke.tempId !== localStroke.tempId))
      undoStackRef.current = undoStackRef.current.filter((candidate) => candidate.historyId !== entry.historyId)
      setVersion((current) => current + 1)
    }
  }, [onAddStroke, onRemoveStroke])

  const commitStroke = useCallback((stroke: WhiteboardStrokeInput) => {
    const tempId = createTempId('local')
    const localStroke: LocalStroke = { tempId, ...stroke }
    const entry: HistoryEntry = {
      historyId: createTempId('history'),
      tempId,
      stroke,
      persistedId: null,
      status: 'pending',
      epoch: clearEpochRef.current,
    }

    setOptimisticStrokes((current) => [...current, localStroke])
    undoStackRef.current.push(entry)
    redoStackRef.current = []
    setVersion((current) => current + 1)
    void queueStrokePersistence(entry, localStroke)
  }, [queueStrokePersistence])

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
    redrawCanvas()
  }, [expandBoardIfNeeded, getCanvasPoint, options.tool, redrawCanvas])

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

    event.preventDefault()
    const point = getCanvasPoint(event)
    const previous = lastPoint.current
    if (previous && distance(previous, point) < POINT_SAMPLING_DISTANCE) return

    currentPoints.current.push(point)
    lastPoint.current = point
    expandBoardIfNeeded(point)
    redrawCanvas()
  }, [expandBoardIfNeeded, getCanvasPoint, options.tool, redrawCanvas])

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
      commitStroke({
        points: [...currentPoints.current],
        color: options.color,
        width: options.width,
        tool: options.tool,
        opacity: options.opacity,
      })
    }

    currentPoints.current = []
    lastPoint.current = null
    redrawCanvas()
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }, [commitStroke, options.color, options.opacity, options.tool, options.width, redrawCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

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

  const undo = useCallback(async () => {
    const entry = undoStackRef.current.pop()
    if (!entry) return

    redoStackRef.current.push(entry.stroke)

    if (entry.status === 'pending') {
      entry.status = 'cancelled'
      setOptimisticStrokes((current) => current.filter((stroke) => stroke.tempId !== entry.tempId))
      setVersion((current) => current + 1)
      return
    }

    if (!entry.persistedId) {
      setVersion((current) => current + 1)
      return
    }

    hiddenServerStrokeIdsRef.current.add(entry.persistedId)
    setVersion((current) => current + 1)
    try {
      await onRemoveStroke(entry.persistedId)
    } catch {
      hiddenServerStrokeIdsRef.current.delete(entry.persistedId)
      redoStackRef.current.pop()
      undoStackRef.current.push(entry)
      setVersion((current) => current + 1)
    }
  }, [onRemoveStroke])

  const redo = useCallback(async () => {
    const stroke = redoStackRef.current.pop()
    if (!stroke) return
    commitStroke(stroke)
  }, [commitStroke])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          void redo()
        } else {
          void undo()
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        void redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redo, undo])

  const clearAll = useCallback(() => {
    const previousHiddenIds = new Set(hiddenServerStrokeIdsRef.current)
    const nextHiddenIds = new Set(previousHiddenIds)
    for (const stroke of serverStrokes) {
      nextHiddenIds.add(stroke.id)
    }
    hiddenServerStrokeIdsRef.current = nextHiddenIds

    clearEpochRef.current += 1
    currentPoints.current = []
    lastPoint.current = null
    setOptimisticStrokes([])
    undoStackRef.current = []
    redoStackRef.current = []
    setBoardSize(DEFAULT_BOARD_SIZE)
    setVersion((current) => current + 1)

    return () => {
      hiddenServerStrokeIdsRef.current = previousHiddenIds
      setVersion((current) => current + 1)
    }
  }, [serverStrokes])

  const exportPng = useCallback((surface: WhiteboardSurface) => {
    const offscreen = document.createElement('canvas')
    offscreen.width = boardSize.width
    offscreen.height = boardSize.height
    const ctx = offscreen.getContext('2d')
    if (!ctx) return ''

    paintWhiteboardSurface(ctx, boardSize.width, boardSize.height, surface)
    for (const stroke of renderStrokes) {
      drawWhiteboardStroke(ctx, stroke)
    }
    return offscreen.toDataURL('image/png')
  }, [boardSize.height, boardSize.width, renderStrokes])

  return {
    containerRef,
    canvasRef,
    boardSize,
    isPanning,
    undo,
    redo,
    clearAll,
    exportPng,
    handleResize,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }
}
