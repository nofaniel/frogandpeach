import { describe, expect, it } from 'vitest'
import { getWhiteboardPreviewStrokes, normaliseWhiteboardStrokeInput } from './whiteboard'

describe('normaliseWhiteboardStrokeInput', () => {
  it('normalises a valid stroke payload and expands shorthand hex colours', () => {
    expect(
      normaliseWhiteboardStrokeInput({
        points: [
          { x: 10, y: 12.3456 },
          { x: 48.9, y: 72.1 },
        ],
        color: '#abc',
        width: 6.444,
        tool: 'eraser',
        opacity: 0.456,
      }),
    ).toEqual({
      points: [
        { x: 10, y: 12.35 },
        { x: 48.9, y: 72.1 },
      ],
      color: '#aabbcc',
      width: 6.44,
      tool: 'eraser',
      opacity: 0.46,
    })
  })

  it('fills in default drawing values when optional fields are missing', () => {
    expect(
      normaliseWhiteboardStrokeInput({
        points: [{ x: 1, y: 2 }],
      }),
    ).toMatchObject({
      color: '#111111',
      width: 4,
      tool: 'pen',
      opacity: 1,
    })
  })

  it('rejects malformed or out-of-range stroke payloads', () => {
    expect(() => normaliseWhiteboardStrokeInput(null)).toThrow('Whiteboard payload must be an object.')
    expect(() => normaliseWhiteboardStrokeInput({ points: [] })).toThrow('Whiteboard strokes need at least one point.')
    expect(() => normaliseWhiteboardStrokeInput({ points: [{ x: -50001, y: 2 }] })).toThrow('Whiteboard coordinates must stay between -50000 and 50000.')
    expect(() => normaliseWhiteboardStrokeInput({ points: [{ x: 1, y: 2 }], color: 'red' })).toThrow('Whiteboard colour must be a hex value like #1f2937.')
    expect(() => normaliseWhiteboardStrokeInput({ points: [{ x: 1, y: 2 }], width: 99 })).toThrow('Whiteboard width must stay between 1 and 36.')
    expect(() => normaliseWhiteboardStrokeInput({ points: [{ x: 1, y: 2 }], opacity: 0 })).toThrow('Whiteboard opacity must stay between 0.08 and 1.')
  })
})

describe('getWhiteboardPreviewStrokes', () => {
  it('keeps the most recent strokes for dashboard previews', () => {
    const strokes = Array.from({ length: 15 }, (_, index) => ({ id: `stroke-${index + 1}` }))

    expect(getWhiteboardPreviewStrokes(strokes, 4)).toEqual([
      { id: 'stroke-12' },
      { id: 'stroke-13' },
      { id: 'stroke-14' },
      { id: 'stroke-15' },
    ])
  })
})
