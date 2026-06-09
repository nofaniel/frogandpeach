import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'
import { drawWhiteboardStroke, paintWhiteboardSurface } from './rendering'

const POINT_SAMPLING_DISTANCE = 5
const ZOOM_MIN = 0.15
const ZOOM_MAX = 5
const ZOOM_STEP = 0.08

type DrawingTool = 'pen' | 'eraser'

type DrawingOptions = {
  tool: DrawingTool
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

function createTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function smoothPoints(points: Point[], iterations = 2): Point[] {
  if (points.length < 3) return points
  let smoothed = points
  for (let i = 0; i < iterations; i++) {
    const next: Point[] = [smoothed[0]]
    for (let j = 1; j < smoothed.length - 1; j++) {
      next.push({
        x: (smoothed[j - 1].x + smoothed[j].x * 2 + smoothed[j + 1].x) / 4,
        y: (smoothed[j - 1].y + smoothed[j].y * 2 + smoothed[j + 1].y) / 4,
      })
    }
    next.push(smoothed[smoothed.length - 1])
    smoothed = next
  }
  return smoothed
}

export function useCanvasDrawing(
  serverStrokes: WhiteboardStroke[],
  options: DrawingOptions,
  onAddStroke: (stroke: WhiteboardStrokeInput) => Promise<WhiteboardStroke>,
  onRemoveStroke: (id: string) => Promise<void>,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const activePointerIdsRef = useRef<Set<number>>(new Set())
  const pointerPositionsRef = useRef<Map<number, Point>>(new Map())
  const initialPinchDistRef = useRef<number | null>(null)
  const initialPinchZoomRef = useRef<number>(1)
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const currentPoints = useRef<Point[]>([])
  const lastPoint = useRef<Point | null>(null)
  const hiddenServerStrokeIdsRef = useRef<Set<string>>(new Set())
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<WhiteboardStrokeInput[]>([])
  const clearEpochRef = useRef(0)
  const centeredRef = useRef(false)
  const [optimisticStrokes, setOptimisticStrokes] = useState<LocalStroke[]>([])
  const [version, setVersion] = useState(0)
  const [viewportOffset, setViewportOffset] = useState<Point>({ x: 0, y: 0 })
  const viewportOffsetRef = useRef<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const updateViewportOffset = useCallback((next: Point | ((current: Point) => Point)) => {
    const resolved = typeof next === 'function'
      ? next(viewportOffsetRef.current)
      : next
    viewportOffsetRef.current = resolved
    setViewportOffset(resolved)
  }, [])

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
    const vx = viewportOffsetRef.current.x
    const vy = viewportOffsetRef.current.y
    const z = zoomRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    paintWhiteboardSurface(ctx, vw, vh, 'plain')

    ctx.save()
    ctx.scale(z, z)
    ctx.translate(-vx, -vy)

    for (const stroke of renderStrokes) {
      drawWhiteboardStroke(ctx, stroke)
    }

    if (currentPoints.current.length > 0) {
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
  }, [options.color, options.opacity, options.tool, options.width, renderStrokes])

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

      if (!centeredRef.current) {
        centeredRef.current = true
        updateViewportOffset({ x: -rect.width / 2, y: -rect.height / 2 })
      }
    }
    redrawCanvas()
  }, [redrawCanvas, updateViewportOffset])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas, version, viewportOffset, zoom])

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

  const getWorldPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    const z = zoomRef.current
    const offset = viewportOffsetRef.current
    return {
      x: screenX / z + offset.x,
      y: screenY / z + offset.y,
    }
  }, [])

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

  const applyZoom = useCallback((newZoom: number, pivotClientX: number, pivotClientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = pivotClientX - rect.left
    const screenY = pivotClientY - rect.top
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom))

    updateViewportOffset((prev) => {
      const currentZoom = zoomRef.current
      return {
        x: prev.x + screenX / currentZoom - screenX / clamped,
        y: prev.y + screenY / currentZoom - screenY / clamped,
      }
    })
    zoomRef.current = clamped
    setZoom(clamped)
  }, [updateViewportOffset])

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY * 0.001
    const newZoom = zoomRef.current * (1 + delta)
    applyZoom(newZoom, event.clientX, event.clientY)
  }, [applyZoom])

  const handlePointerDown = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    activePointerIdsRef.current.add(event.pointerId)
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const pointerCount = activePointerIdsRef.current.size

    if (event.button === 1) {
      event.preventDefault()
      isPanning.current = true
      isDrawing.current = false
      currentPoints.current = []
      lastPoint.current = null
      const offset = viewportOffsetRef.current
      panStartRef.current = { x: event.clientX, y: event.clientY, vx: offset.x, vy: offset.y }
      return
    }

    if (pointerCount >= 2) {
      isDrawing.current = false
      currentPoints.current = []
      lastPoint.current = null

      const positions = Array.from(pointerPositionsRef.current.values())
      const midX = (positions[0].x + positions[1].x) / 2
      const midY = (positions[0].y + positions[1].y) / 2
      const dist = distance(positions[0], positions[1])
      initialPinchDistRef.current = dist
      initialPinchZoomRef.current = zoomRef.current
      const offset = viewportOffsetRef.current
      panStartRef.current = { x: midX, y: midY, vx: offset.x, vy: offset.y }
      return
    }

    isDrawing.current = true
    const point = getWorldPoint(event.clientX, event.clientY)
    currentPoints.current = [point]
    lastPoint.current = point
    redrawCanvas()
  }, [getWorldPoint, redrawCanvas])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const pointerCount = activePointerIdsRef.current.size

    if (isPanning.current && panStartRef.current) {
      event.preventDefault()
      const start = panStartRef.current
      updateViewportOffset({
        x: start.vx - (event.clientX - start.x) / zoomRef.current,
        y: start.vy - (event.clientY - start.y) / zoomRef.current,
      })
      return
    }

    if (pointerCount >= 2 && panStartRef.current && initialPinchDistRef.current) {
      event.preventDefault()
      const positions = Array.from(pointerPositionsRef.current.values())
      const midX = (positions[0].x + positions[1].x) / 2
      const midY = (positions[0].y + positions[1].y) / 2
      const dist = distance(positions[0], positions[1])

      const newZoom = initialPinchZoomRef.current * (dist / initialPinchDistRef.current)
      const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom))
      zoomRef.current = clamped
      setZoom(clamped)

      const start = panStartRef.current
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const startScreenX = start.x - rect.left
      const startScreenY = start.y - rect.top
      const midScreenX = midX - rect.left
      const midScreenY = midY - rect.top
      const worldAtStartMid = {
        x: start.vx + startScreenX / initialPinchZoomRef.current,
        y: start.vy + startScreenY / initialPinchZoomRef.current,
      }

      updateViewportOffset({
        x: worldAtStartMid.x - midScreenX / clamped,
        y: worldAtStartMid.y - midScreenY / clamped,
      })
      return
    }

    if (!isDrawing.current) return

    event.preventDefault()
    const point = getWorldPoint(event.clientX, event.clientY)
    const previous = lastPoint.current
    if (previous && distance(previous, point) < POINT_SAMPLING_DISTANCE / zoomRef.current) return

    currentPoints.current.push(point)
    lastPoint.current = point
    redrawCanvas()
  }, [getWorldPoint, redrawCanvas, updateViewportOffset])

  const finishPointerInteraction = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current
    activePointerIdsRef.current.delete(event.pointerId)
    pointerPositionsRef.current.delete(event.pointerId)

    if (activePointerIdsRef.current.size < 2) {
      initialPinchDistRef.current = null
    }

    if (activePointerIdsRef.current.size === 0) {
      panStartRef.current = null
    }

    if (isPanning.current) {
      isPanning.current = false
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (!isDrawing.current) {
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      return
    }

    isDrawing.current = false

    if (currentPoints.current.length > 0) {
      commitStroke({
        points: smoothPoints([...currentPoints.current]),
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
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', finishPointerInteraction)
      canvas.removeEventListener('pointercancel', finishPointerInteraction)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [finishPointerInteraction, handlePointerDown, handlePointerMove, handleWheel])

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
    updateViewportOffset({ x: 0, y: 0 })
    setVersion((current) => current + 1)

    return () => {
      hiddenServerStrokeIdsRef.current = previousHiddenIds
      setVersion((current) => current + 1)
    }
  }, [serverStrokes, updateViewportOffset])

  const exportPng = useCallback(() => {
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

    paintWhiteboardSurface(ctx, exportWidth, exportHeight, 'plain')
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
    canvasSize,
    isTouchDevice,
    zoom,
    undo,
    redo,
    clearAll,
    exportPng,
    handleResize,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  }
}
