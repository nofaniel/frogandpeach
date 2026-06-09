import { WHITEBOARD_MIN_WIDTH, WHITEBOARD_MAX_WIDTH } from '../../shared/whiteboard'

export function BrushSizeSlider({
  width,
  onChange,
  visible,
}: {
  width: number
  onChange: (width: number) => void
  visible: boolean
}) {
  // Scale preview visually: 1px → 8px, 36px → 32px
  const previewSize = 8 + (width / WHITEBOARD_MAX_WIDTH) * 24
  const pct =
    ((width - WHITEBOARD_MIN_WIDTH) /
      (WHITEBOARD_MAX_WIDTH - WHITEBOARD_MIN_WIDTH)) *
    100

  return (
    <div className={`wb-brush-slider ${visible ? 'visible' : 'auto-hidden'}`}>
      <span className="wb-brush-value">{width}</span>
      <div className="wb-brush-track">
        <div
          className="wb-brush-thumb"
          style={{
            bottom: `${pct}%`,
            left: `${pct}%`,
          }}
        />
        <input
          type="range"
          min={WHITEBOARD_MIN_WIDTH}
          max={WHITEBOARD_MAX_WIDTH}
          step={1}
          value={width}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Brush size"
        />
      </div>
      <div
        className="wb-brush-preview"
        style={{
          width: `${previewSize}px`,
          height: `${previewSize}px`,
        }}
      />
    </div>
  )
}
