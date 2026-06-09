import type { Module, Tab, WhiteboardStroke } from '../../../shared/api-types'
import { formatDuration } from '../../../shared/format'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'
import { WhiteboardPreview } from '../../whiteboard/WhiteboardPreview'

export function WhiteboardWidget({
  module,
  strokes,
  strokeCount,
  onSetActiveTab,
}: {
  module: Module
  strokes: WhiteboardStroke[]
  strokeCount: number
  onSetActiveTab: (tab: Tab) => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const safeStrokes = strokes ?? []
  const lastStroke = safeStrokes.length > 0 ? safeStrokes[safeStrokes.length - 1] : null
  const lastDrawnAgo = lastStroke ? formatDuration(Date.now() - new Date(lastStroke.createdAt).getTime()) : null
  const contributors = Array.from(new Set(safeStrokes.map((stroke) => stroke.createdByName || 'Someone')))
  const expanded = widget.mode === 'expanded'

  return (
    <article id={module.id} className={`panel module-${module.size} whiteboard-widget`}>
      <div className="whiteboard-widget-head">
        <div>
          <p className="kicker">Whiteboard</p>
          <h2>Drawing board</h2>
        </div>
        <button type="button" className="ghost" onClick={() => onSetActiveTab('whiteboard')}>Open board</button>
      </div>

      <WhiteboardPreview
        strokes={safeStrokes}
        surface="grid"
        className={expanded ? 'wb-preview-widget expanded' : 'wb-preview-widget'}
        emptyLabel="Board is blank"
      />

      <div className="whiteboard-widget-stats">
        <div>
          <span>Total strokes</span>
          <strong>{strokeCount}</strong>
        </div>
        <div>
          <span>Recent artists</span>
          <strong>{contributors.length > 0 ? contributors.join(', ') : 'No one yet'}</strong>
        </div>
      </div>

      <div className="stack-list">
        <button type="button" className="plain-row" onClick={() => onSetActiveTab('whiteboard')}>
          <strong>{lastDrawnAgo ? `Last marked ${lastDrawnAgo} ago` : 'Open the whiteboard to draw'}</strong>
          <span>
            {expanded
              ? `Previewing the latest ${safeStrokes.length} stroke${safeStrokes.length === 1 ? '' : 's'} from the board.`
              : 'Jump into the shared canvas.'}
          </span>
        </button>
      </div>
    </article>
  )
}
