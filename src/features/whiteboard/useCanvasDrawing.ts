import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import type { WhiteboardSurface } from './rendering'
import { drawWhiteboardStroke, paintWhiteboardSurface } from './rendering'

const POINT_SAMPLING_DISTANCE = 5

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const activePointerIdsRef = useRef<Set<number>>(new Set())
  const currentPoints = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)
  const hiddenServerStrokeIdsRef = useRef<Set<string>>(new Set())
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<WhiteboardStrokeInput[]>([])
  const clearEpochRef = useRef(0)
  const [optimisticStrokes, setOptimisticStrokes] = useState<LocalStroke[]>([])
  const [version, setVersion] = useState(0)
  const [viewportOffset, setViewportOffset] = useState<Point>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const renderStrokes = useMemo(
    () => [
      ...serverStrokes.filter((stroke) => !hiddenServerStrokeIdsRef.current.has(stroke.id)),
      ...optimisticStrokes,
    ],
    [optimisticStrokes, serverStrokes, version],
  )

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0 || canvas.height === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const vw = canvas.width / dpr
    const vh = canvas.height / dpr
    const vx = viewportOffset.x
    const vy = viewportOffset.y

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    paintWhiteboardSurface(ctx, vw, vh, 'plain')

    ctx.save()
    ctx.translate(-vx, -vy)

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
    ctx.restore()
  }, [options.color, options.opacity, options.tool, options.width, renderStrokes, viewportOffset])

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const nextWidth = Math.max(1, Math.round(rect.width * dpr))
    const nextHeight = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth
      canvas.height = nextHeight
      setCanvasSize({ width: rect.width, height: rect.height })
    }
    redrawCanvas()
  }, [redrawCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas, version])

  useEffect(() => {
    handleResize()
  }, [handleResize])

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkTouch()
    window.addEventListener('touchstart', checkTouch, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', checkTouch)
  }, [])

  const getWorldPoint = useCallback((event: PointerEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    return {
      x: screenX + viewportOffset.x,
      y: screenY + viewportOffset.y,
    }
  }, [viewportOffset])

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
    activePointerIdsRef.current.add(event.pointerId)

    if (isTouchDevice && activePointerIdsRef.current.size >= 2) {
      isDrawing.current = false
      currentPoints.current = []
      lastPoint.current = null
      isPanningRef.current = true
      setIsPanning(true)
      const midX = (event.clientX + event.clientX) / 2
      const midY = (event.clientY + event.clientY) / 2
      panStartRef.current = { x: midX, y: midY, vx: viewportOffset.x, vy: viewportOffset.y }
      return
    }

    if (options.tool === 'pan' || (isTouchDevice && activePointerIdsRef.current.size >= 2)) {
      isPanningRef.current = true
      setIsPanning(true)
      panStartRef.current = { x: event.clientX, y: event.clientY, vx: viewportOffset.x, vy: viewportOffset.y }
      return
    }

    isDrawing.current = true
    const point = getWorldPoint(event)
    currentPoints.current = [point]
    lastPoint.current = point
    redrawCanvas()
  }, [getWorldPoint, isTouchDevice, options.tool, viewportOffset, redrawCanvas])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (isPanningRef.current) {
      const start = panStartRef.current
      if (!start) return

      event.preventDefault()

      if (isTouchDevice && activePointerIdsRef.current.size >= 2) {
        const pointers = Array.from(activePointerIdsRef.current)
        if (pointers.length >= 2) {
          const canvas = canvasRef.current
          if (!canvas) return
          const rect = canvas.getBoundingClientRect()
          const midClientX = event.clientX
          const midClientY = event.clientY
          const newMidX = midClientX
          const newMidY = midClientY
          setViewportOffset({
            x: start.vx - (newMidX - start.x),
            y: start.vy - (newMidY - start.y),
          })
          return
        }
      }

      setViewportOffset({
        x: start.vx - (event.clientX - start.x),
        y: start.vy - (event.clientY - start.y),
      })
      return
    }

    if (!isDrawing.current || !isDrawingTool(options.tool)) return

    event.preventDefault()
    const point = getWorldPoint(event)
    const previous = lastPoint.current
    if (previous && distance(previous, point) < POINT_SAMPLING_DISTANCE) return

    currentPoints.current.push(point)
    lastPoint.current = point
    redrawCanvas()
  }, [getWorldPoint, isTouchDevice, options.tool, redrawCanvas])

  const finishPointerInteraction = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current
    activePointerIdsRef.current.delete(event.pointerId)

    if (isPanningRef.current) {
      if (activePointerIdsRef.current.size === 0) {
        isPanningRef.current = false
        setIsPanning(false)
        panStartRef.current = null
      }
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
    setViewportOffset({ x: 0, y: 0 })
    setVersion((current) => current + 1)

    return () => {
      hiddenServerStrokeIdsRef.current = previousHiddenIds
      setVersion((current) => current + 1)
    }
  }, [serverStrokes])

  const setZoomAtPoint = useCallback((newZoom: number, clientX: number, clientY: number) => {
    setViewportOffset((prev) => {
      const canvas = canvasRef.current
      if (!canvas) return prev
      const rect = canvas.getBoundingClientRect()
      const screenX = clientX - rect.left
      const screenY = clientY - rect.top
      return {
        x: prev.x + screenX * (1 - 1),
        y: prev.y + screenY * (1 - 1),
      }
    })
  }, [])

  const exportPng = useCallback((surface: WhiteboardSurface) => {
    let minX = 0
    let minY = 0
    let maxX = canvasSize.width || 800
    let maxY = canvasSize.height || 600

    for (const stroke of renderStrokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    }

    const padding = 48
    const exportWidth = Math.ceil(maxX - minX + padding * 2)
    const exportHeight = Math.ceil(maxY - minY + padding * 2)
    const offsetX = -minX + padding
    const offsetY = -minY + padding

    const offscreen = document.createElement('canvas')
    offscreen.width = exportWidth
    offscreen.height = exportHeight
    const ctx = offscreen.getContext('2d')
    if (!ctx) return ''

    paintWhiteboardSurface(ctx, exportWidth, exportHeight, surface)
    ctx.save()
    ctx.translate(offsetX, offsetY)
    for (const stroke of renderStrokes) {
      drawWhiteboardStroke(ctx, stroke)
    }
    ctx.restore()
    return offscreen.toDataURL('image/png')
  }, [canvasSize.height, canvasSize.width, renderStrokes])

  return {
    canvasRef,
    viewportOffset,
    isPanning,
    canvasSize,
    isTouchDevice,
    undo,
    redo,
    clearAll: clearAll,
    exportPng,
    handleResize,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }
}
