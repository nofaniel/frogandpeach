import { useCallback, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { WHITEBOARD_MIN_WIDTH, WHITEBOARD_MAX_WIDTH } from '../../shared/whiteboard'

const BRUSH_WIDTH_RANGE = WHITEBOARD_MAX_WIDTH - WHITEBOARD_MIN_WIDTH

export function BrushSizeSlider({
  width,
  onChange,
  visible,
}: {
  width: number
  onChange: (width: number) => void
  visible: boolean
}) {
  // Scale preview visually: 1px -> 8px, 36px -> 32px.
  const previewSize = 8 + (width / WHITEBOARD_MAX_WIDTH) * 24
  const pct =
    ((width - WHITEBOARD_MIN_WIDTH) /
      BRUSH_WIDTH_RANGE) *
    100
  const sliderStyle = {
    '--wb-brush-pct': `${pct}%`,
    '--wb-brush-preview-size': `${previewSize}px`,
  } as CSSProperties

  const setWidthFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const isVertical = rect.height >= rect.width
    const rawPct = isVertical
      ? (rect.bottom - event.clientY) / rect.height
      : (event.clientX - rect.left) / rect.width
    const nextPct = Math.min(1, Math.max(0, rawPct))
    onChange(Math.round(WHITEBOARD_MIN_WIDTH + nextPct * BRUSH_WIDTH_RANGE))
  }, [onChange])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setWidthFromPointer(event)
  }, [setWidthFromPointer])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.preventDefault()
    setWidthFromPointer(event)
  }, [setWidthFromPointer])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 4 : 1
    let nextWidth = width

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      nextWidth = width + step
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      nextWidth = width - step
    } else if (event.key === 'Home') {
      nextWidth = WHITEBOARD_MIN_WIDTH
    } else if (event.key === 'End') {
      nextWidth = WHITEBOARD_MAX_WIDTH
    } else {
      return
    }

    event.preventDefault()
    onChange(Math.min(WHITEBOARD_MAX_WIDTH, Math.max(WHITEBOARD_MIN_WIDTH, nextWidth)))
  }, [onChange, width])

  return (
    <div className={`wb-brush-slider ${visible ? 'visible' : 'auto-hidden'}`} style={sliderStyle}>
      <span className="wb-brush-value">{width}</span>
      <div
        className="wb-brush-track"
        role="slider"
        tabIndex={0}
        aria-label="Brush size"
        aria-valuemin={WHITEBOARD_MIN_WIDTH}
        aria-valuemax={WHITEBOARD_MAX_WIDTH}
        aria-valuenow={width}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
      >
        <div className="wb-brush-thumb" />
      </div>
      <div className="wb-brush-preview" />
    </div>
  )
}
