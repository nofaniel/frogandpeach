import type { WhiteboardPoint, WhiteboardStrokeInput, WhiteboardTool } from './api-types'

export const WHITEBOARD_DEFAULT_COLOR = '#111111'
export const WHITEBOARD_DEFAULT_WIDTH = 4
export const WHITEBOARD_DEFAULT_OPACITY = 1
export const WHITEBOARD_MAX_POINTS = 4000
export const WHITEBOARD_MAX_COORDINATE = 50000
export const WHITEBOARD_MIN_WIDTH = 1
export const WHITEBOARD_MAX_WIDTH = 36
export const WHITEBOARD_MIN_OPACITY = 0.08
export const WHITEBOARD_MAX_OPACITY = 1

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isWhiteboardTool(value: unknown): value is WhiteboardTool {
  return value === 'pen' || value === 'eraser'
}

export function normaliseWhiteboardStrokeInput(value: unknown): WhiteboardStrokeInput {
  const record = asRecord(value)
  return {
    points: normaliseWhiteboardPoints(record.points),
    color: normaliseWhiteboardColor(record.color),
    width: normaliseWhiteboardWidth(record.width),
    tool: normaliseWhiteboardTool(record.tool),
    opacity: normaliseWhiteboardOpacity(record.opacity),
  }
}

export function getWhiteboardPreviewStrokes<T>(strokes: T[], limit = 12): T[] {
  if (limit <= 0) return []
  return strokes.slice(-limit)
}

function normaliseWhiteboardPoints(value: unknown): WhiteboardPoint[] {
  if (!Array.isArray(value)) throw new Error('Whiteboard strokes need a points array.')
  if (value.length === 0) throw new Error('Whiteboard strokes need at least one point.')
  if (value.length > WHITEBOARD_MAX_POINTS) throw new Error(`Whiteboard strokes can contain up to ${WHITEBOARD_MAX_POINTS} points.`)

  return value.map((entry, index) => normaliseWhiteboardPoint(entry, index))
}

function normaliseWhiteboardPoint(value: unknown, index: number): WhiteboardPoint {
  const record = asRecord(value, `Whiteboard point ${index + 1} is invalid.`)
  return {
    x: normaliseCoordinate(record.x, `Whiteboard point ${index + 1} has an invalid x coordinate.`),
    y: normaliseCoordinate(record.y, `Whiteboard point ${index + 1} has an invalid y coordinate.`),
  }
}

function normaliseCoordinate(value: unknown, message: string): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) throw new Error(message)
  if (numeric < 0 || numeric > WHITEBOARD_MAX_COORDINATE) {
    throw new Error(`Whiteboard coordinates must stay between 0 and ${WHITEBOARD_MAX_COORDINATE}.`)
  }
  return roundCoordinate(numeric)
}

function normaliseWhiteboardColor(value: unknown): string {
  if (value === undefined) return WHITEBOARD_DEFAULT_COLOR
  const color = String(value).trim().toLowerCase()
  if (!HEX_COLOR_PATTERN.test(color)) throw new Error('Whiteboard colour must be a hex value like #1f2937.')
  return color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color
}

function normaliseWhiteboardWidth(value: unknown): number {
  if (value === undefined) return WHITEBOARD_DEFAULT_WIDTH
  const width = Number(value)
  if (!Number.isFinite(width)) throw new Error('Whiteboard width must be a number.')
  if (width < WHITEBOARD_MIN_WIDTH || width > WHITEBOARD_MAX_WIDTH) {
    throw new Error(`Whiteboard width must stay between ${WHITEBOARD_MIN_WIDTH} and ${WHITEBOARD_MAX_WIDTH}.`)
  }
  return roundCoordinate(width)
}

function normaliseWhiteboardTool(value: unknown): WhiteboardTool {
  if (value === undefined) return 'pen'
  if (!isWhiteboardTool(value)) throw new Error('Whiteboard tool must be pen or eraser.')
  return value
}

function normaliseWhiteboardOpacity(value: unknown): number {
  if (value === undefined) return WHITEBOARD_DEFAULT_OPACITY
  const opacity = Number(value)
  if (!Number.isFinite(opacity)) throw new Error('Whiteboard opacity must be a number.')
  if (opacity < WHITEBOARD_MIN_OPACITY || opacity > WHITEBOARD_MAX_OPACITY) {
    throw new Error(`Whiteboard opacity must stay between ${WHITEBOARD_MIN_OPACITY} and ${WHITEBOARD_MAX_OPACITY}.`)
  }
  return roundCoordinate(opacity)
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

function asRecord(value: unknown, message = 'Whiteboard payload must be an object.'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}
