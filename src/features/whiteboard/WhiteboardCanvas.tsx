import { useEffect, type RefObject } from 'react'
import type { WhiteboardSurface } from './rendering'

type Tool = 'pen' | 'eraser' | 'pan'

export function WhiteboardCanvas({
  containerRef,
  canvasRef,
  tool,
  boardSize,
  isPanning,
  zoom,
  surface,
  handleResize,
  empty,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  tool: Tool
  boardSize: { width: number; height: number }
  isPanning: boolean
  zoom: number
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
      resizeObserver.observe(canvas)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [boardSize.height, boardSize.width, canvasRef, handleResize, zoom])

  const cursor = tool === 'pan'
    ? (isPanning ? 'grabbing' : 'grab')
    : (tool === 'eraser' ? 'cell' : 'crosshair')

  return (
    <div ref={containerRef} className="wb-canvas-container">
      <div className={`wb-canvas-stage surface-${surface}`} style={{ width: boardSize.width * zoom, height: boardSize.height * zoom }}>
        <canvas
          ref={canvasRef}
          className="wb-canvas"
          style={{ width: boardSize.width * zoom, height: boardSize.height * zoom, cursor }}
        />
        {empty && (
          <div className="wb-empty-state">
            <strong>Blank board</strong>
            <span>Pick a tool and start sketching. The board expands as you move across it.</span>
          </div>
        )}
      </div>
    </div>
  )
}
