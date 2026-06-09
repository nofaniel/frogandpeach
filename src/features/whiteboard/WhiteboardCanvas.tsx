import { useEffect, type RefObject } from 'react'
import type { WhiteboardSurface } from './rendering'

type DrawingTool = 'pen' | 'eraser'

export function WhiteboardCanvas({
  canvasRef,
  tool,
  surface,
  handleResize,
  empty,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  tool: DrawingTool
  surface: WhiteboardSurface
  handleResize: () => void
  empty: boolean
}) {
  useEffect(() => {
    handleResize()

    const canvas = canvasRef.current
    const resizeObserver = canvas && 'ResizeObserver' in window
      ? new ResizeObserver(handleResize)
      : null

    if (canvas && resizeObserver) {
      resizeObserver.observe(canvas.parentElement || canvas)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [canvasRef, handleResize])

  const cursor = tool === 'eraser' ? 'cell' : 'crosshair'

  return (
    <div className="wb-canvas-viewport">
      <div className={`wb-canvas-surface surface-${surface}`} />
      <canvas
        ref={canvasRef}
        className="wb-canvas"
        style={{ cursor }}
      />
      {empty && (
        <div className="wb-empty-state">
          <strong>Blank board</strong>
          <span>Pick a tool and start sketching.</span>
        </div>
      )}
    </div>
  )
}
