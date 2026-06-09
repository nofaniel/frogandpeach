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
  return (
    <div className={`wb-brush-slider ${visible ? 'visible' : 'auto-hidden'}`}>
      <div
        className="wb-brush-preview"
        style={{
          width: `${Math.max(4, Math.min(28, width))}px`,
          height: `${Math.max(4, Math.min(28, width))}px`,
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
      <span className="wb-brush-value">{width}</span>
    </div>
  )
}
