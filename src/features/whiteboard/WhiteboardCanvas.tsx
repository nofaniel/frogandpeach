import { useEffect, type RefObject } from 'react'

type Tool = 'pen' | 'eraser' | 'pan'

export function WhiteboardCanvas({
  containerRef,
  canvasRef,
  tool,
  boardSize,
  isPanning,
  handleResize,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  tool: Tool
  boardSize: { width: number; height: number }
  isPanning: boolean
  handleResize: () => void
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
  }, [canvasRef, handleResize, boardSize.width, boardSize.height])

  const cursor = tool === 'pan'
    ? (isPanning ? 'grabbing' : 'grab')
    : (tool === 'eraser' ? 'cell' : 'crosshair')

  return (
    <div ref={containerRef} className="wb-canvas-container">
      <canvas
        ref={canvasRef}
        className="wb-canvas"
        style={{ width: boardSize.width, height: boardSize.height, cursor }}
      />
    </div>
  )
}
