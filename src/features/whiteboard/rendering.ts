import type { WhiteboardStroke, WhiteboardStrokeInput } from '../../shared/api-types'

export type WhiteboardSurface = 'grid' | 'dots' | 'ledger' | 'plain'

export type RenderableStroke = Pick<WhiteboardStrokeInput, 'points' | 'color' | 'width' | 'tool' | 'opacity'>

export const WHITEBOARD_SURFACES: Array<{ id: WhiteboardSurface; label: string }> = [
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'plain', label: 'Plain' },
]

const PREVIEW_PADDING = 18

export function drawWhiteboardStroke(ctx: CanvasRenderingContext2D, stroke: RenderableStroke) {
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
    for (let index = 1; index < points.length - 1; index += 1) {
      const midX = (points[index].x + points[index + 1].x) / 2
      const midY = (points[index].y + points[index + 1].y) / 2
      ctx.quadraticCurveTo(points[index].x, points[index].y, midX, midY)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
  }

  ctx.stroke()
  ctx.restore()
}

export function paintWhiteboardSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surface: WhiteboardSurface,
) {
  ctx.save()
  ctx.fillStyle = '#fffdfa'
  ctx.fillRect(0, 0, width, height)

  if (surface === 'plain') {
    ctx.restore()
    return
  }

  if (surface === 'ledger') {
    ctx.strokeStyle = 'rgba(191, 74, 74, 0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(72, 0)
    ctx.lineTo(72, height)
    ctx.stroke()
  }

  const spacing = surface === 'dots' ? 28 : (surface === 'ledger' ? 34 : 32)
  ctx.strokeStyle = surface === 'ledger' ? 'rgba(45, 102, 194, 0.11)' : 'rgba(41, 88, 60, 0.11)'
  ctx.fillStyle = 'rgba(41, 88, 60, 0.18)'
  ctx.lineWidth = 1

  if (surface === 'dots') {
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    return
  }

  for (let x = spacing; x < width; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = spacing; y < height; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.restore()
}

export function renderWhiteboardPreview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Array<RenderableStroke | WhiteboardStroke>,
  surface: WhiteboardSurface,
) {
  paintWhiteboardSurface(ctx, width, height, surface)
  if (strokes.length === 0) return

  const bounds = getStrokeBounds(strokes)
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1)
  const scale = Math.max(0.16, Math.min((width - PREVIEW_PADDING * 2) / contentWidth, (height - PREVIEW_PADDING * 2) / contentHeight))
  const offsetX = (width - contentWidth * scale) / 2 - bounds.minX * scale
  const offsetY = (height - contentHeight * scale) / 2 - bounds.minY * scale

  for (const stroke of strokes) {
    drawWhiteboardStroke(ctx, {
      ...stroke,
      points: stroke.points.map((point) => ({
        x: point.x * scale + offsetX,
        y: point.y * scale + offsetY,
      })),
      width: Math.max(1.4, stroke.width * Math.max(0.4, Math.min(scale, 1.2))),
    })
  }
}

function getStrokeBounds(strokes: Array<RenderableStroke | WhiteboardStroke>) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  }

  return {
    minX: minX - PREVIEW_PADDING,
    minY: minY - PREVIEW_PADDING,
    maxX: maxX + PREVIEW_PADDING,
    maxY: maxY + PREVIEW_PADDING,
  }
}
