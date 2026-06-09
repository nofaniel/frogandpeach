import { useEffect, useRef } from 'react'
import type { WhiteboardStroke } from '../../shared/api-types'
import type { WhiteboardSurface } from './rendering'
import { renderWhiteboardPreview } from './rendering'

export function WhiteboardPreview({
  strokes,
  surface,
  className = '',
  emptyLabel = 'Blank board',
}: {
  strokes: WhiteboardStroke[]
  surface: WhiteboardSurface
  className?: string
  emptyLabel?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const paint = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)
      renderWhiteboardPreview(ctx, width, height, strokes, surface)
      ctx.restore()
    }

    paint()
    const observer = 'ResizeObserver' in window ? new ResizeObserver(paint) : null
    observer?.observe(canvas)
    window.addEventListener('resize', paint)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', paint)
    }
  }, [strokes, surface])

  return (
    <div className={`wb-preview ${className}`.trim()}>
      <canvas ref={canvasRef} className="wb-preview-canvas" />
      {strokes.length === 0 && <span className="wb-preview-empty">{emptyLabel}</span>}
    </div>
  )
}
