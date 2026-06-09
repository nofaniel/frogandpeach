import { useMemo, useState } from 'react'
import type { WhiteboardStroke } from '../../shared/api-types'
import { useCanvasDrawing } from './useCanvasDrawing'
import { WhiteboardCanvas } from './WhiteboardCanvas'
import { WhiteboardToolbar } from './WhiteboardToolbar'

type Tool = 'pen' | 'eraser' | 'pan'

export function WhiteboardWorkspace({
  strokes,
  onAddStroke,
  onRemoveStroke,
  onClearAll,
}: {
  strokes: WhiteboardStroke[]
  onAddStroke: (stroke: Omit<WhiteboardStroke, 'id' | 'createdByName' | 'createdAt'>) => void
  onRemoveStroke: (id: string) => void
  onClearAll: () => void
}) {
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(4)
  const drawingOptions = useMemo(() => ({ tool, color, width }), [tool, color, width])

  const {
    containerRef,
    canvasRef,
    boardSize,
    isPanning,
    undo,
    redo,
    clearAll: clearCanvasHistory,
    handleResize,
    canUndo,
    canRedo,
  } = useCanvasDrawing(strokes, drawingOptions, onAddStroke, onRemoveStroke)

  function handleClearAll() {
    if (window.confirm('Clear the entire whiteboard?')) {
      clearCanvasHistory()
      onClearAll()
    }
  }

  return (
    <section className="whiteboard-workspace">
      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        onUndo={undo}
        onRedo={redo}
        onClearAll={handleClearAll}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <WhiteboardCanvas
        containerRef={containerRef}
        canvasRef={canvasRef}
        tool={tool}
        boardSize={boardSize}
        isPanning={isPanning}
        handleResize={handleResize}
      />
    </section>
  )
}
