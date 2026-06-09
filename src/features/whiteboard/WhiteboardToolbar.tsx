type DrawingTool = 'pen' | 'eraser'

export function WhiteboardToolbar({
  tool,
  setTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  visible,
}: {
  tool: DrawingTool
  setTool: (tool: DrawingTool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  visible: boolean
}) {
  return (
    <div className={`wb-floating-toolbar ${visible ? 'visible' : 'auto-hidden'}`}>
      <button
        type="button"
        className={`wb-ftool-btn${tool === 'pen' ? ' active' : ''}`}
        onClick={() => setTool('pen')}
        title="Draw"
      >
        ✎
      </button>
      <button
        type="button"
        className={`wb-ftool-btn${tool === 'eraser' ? ' active' : ''}`}
        onClick={() => setTool('eraser')}
        title="Erase"
      >
        ✖
      </button>

      <div className="wb-ftool-divider" />

      <button
        type="button"
        className="wb-ftool-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        ↶
      </button>
      <button
        type="button"
        className="wb-ftool-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        ↷
      </button>
    </div>
  )
}
