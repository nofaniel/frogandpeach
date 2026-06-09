type Tool = 'pen' | 'eraser' | 'pan'

const COLOR_PRESETS = [
  '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
]

const WIDTH_PRESETS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

export function WhiteboardToolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  onUndo,
  onRedo,
  onClearAll,
  canUndo,
  canRedo,
}: {
  tool: Tool
  setTool: (t: Tool) => void
  color: string
  setColor: (c: string) => void
  width: number
  setWidth: (w: number) => void
  onUndo: () => void
  onRedo: () => void
  onClearAll: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  return (
    <div className="wb-toolbar">
      <div className="wb-tool-group">
        <button
          type="button"
          className={'wb-tool-btn' + (tool === 'pen' ? ' active' : '')}
          onClick={() => setTool('pen')}
          title="Pen"
        >
          &#9998;
        </button>
        <button
          type="button"
          className={'wb-tool-btn' + (tool === 'eraser' ? ' active' : '')}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          &#129529;
        </button>
        <button
          type="button"
          className={'wb-tool-btn' + (tool === 'pan' ? ' active' : '')}
          onClick={() => setTool('pan')}
          title="Pan"
        >
          &#9995;
        </button>
      </div>

      <div className="wb-divider" />

      <div className="wb-color-group">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={'wb-color-swatch' + (color === c ? ' active' : '')}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
        <label className="wb-custom-color" title="Custom colour">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
      </div>

      <div className="wb-divider" />

      <div className="wb-width-group">
        {WIDTH_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={'wb-width-btn' + (width === preset.value ? ' active' : '')}
            onClick={() => setWidth(preset.value)}
            title={preset.label}
          >
            <span
              className="wb-width-dot"
              style={{
                width: preset.value * 2 + 4,
                height: preset.value * 2 + 4,
              }}
            />
          </button>
        ))}
      </div>

      <div className="wb-divider" />

      <div className="wb-action-group">
        <button
          type="button"
          className="wb-action-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          &#8617;
        </button>
        <button
          type="button"
          className="wb-action-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          &#8618;
        </button>
        <button
          type="button"
          className="wb-action-btn wb-clear-btn"
          onClick={onClearAll}
          title="Clear all"
        >
          &#128465;
        </button>
      </div>
    </div>
  )
}
