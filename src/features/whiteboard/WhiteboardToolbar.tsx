import { PRESET_COLORS, ColorPickerPopover } from './ColorPicker'

type DrawingTool = 'pen' | 'eraser'

import { type RefObject } from 'react'

export function WhiteboardToolbar({
  toolbarRef,
  tool,
  setTool,
  color,
  onColorChange,
  colorPickerOpen,
  onToggleColorPicker,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  visible,
}: {
  toolbarRef: RefObject<HTMLDivElement | null>
  tool: DrawingTool
  setTool: (tool: DrawingTool) => void
  color: string
  onColorChange: (hex: string) => void
  colorPickerOpen: boolean
  onToggleColorPicker: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  visible: boolean
}) {
  return (
    <div ref={toolbarRef} className={`wb-floating-toolbar ${visible ? 'visible' : 'auto-hidden'}`}>
      <button
        type="button"
        className={`wb-ftool-btn${tool === 'pen' ? ' active' : ''}`}
        onClick={() => {
          if (tool === 'pen') {
            onToggleColorPicker()
          } else {
            setTool('pen')
            // close picker when switching from eraser to pen
            if (colorPickerOpen) onToggleColorPicker()
          }
        }}
        title="Draw"
      >
        <span className="wb-pen-icon">✎</span>
        <span
          className="wb-pen-color-dot"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      </button>

      <ColorPickerPopover
        color={color}
        onChange={onColorChange}
        visible={colorPickerOpen}
        onClose={onToggleColorPicker}
      />

      <button
        type="button"
        className={`wb-ftool-btn${tool === 'eraser' ? ' active' : ''}`}
        onClick={() => {
          setTool('eraser')
          if (colorPickerOpen) onToggleColorPicker()
        }}
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
