import { useEffect, type RefObject } from 'react'

export function WhiteboardCanvas({
  canvasRef,
  tool,
  handleResize,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  tool: 'pen' | 'eraser'
  handleResize: () => void
}) {
  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  return (
    <div className="wb-canvas-container">
      <canvas
        ref={canvasRef}
        className="wb-canvas"
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
      />
    </div>
  )
}
