import type { Module, Tab, WhiteboardStroke } from '../../../shared/api-types'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'
import { formatDuration } from '../../../shared/format'

export function WhiteboardWidget({
  module,
  strokes,
  onSetActiveTab,
}: {
  module: Module
  strokes: WhiteboardStroke[]
  onSetActiveTab: (tab: Tab) => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const safeStrokes = strokes ?? []
  const lastStroke = safeStrokes.length > 0 ? safeStrokes[safeStrokes.length - 1] : null
  const lastDrawnAgo = lastStroke ? formatDuration(Date.now() - new Date(lastStroke.createdAt).getTime()) : null

  return (
    <article id={module.id} className={'panel module-' + module.size}>
      <p className="kicker">Whiteboard</p>
      <h2>Drawing board</h2>
      <div className="stack-list">
        <button type="button" className="plain-row" onClick={() => onSetActiveTab('whiteboard')}>
          <strong>{safeStrokes.length} stroke{safeStrokes.length === 1 ? '' : 's'}</strong>
          <span>
            {lastDrawnAgo
              ? `Last drawn ${lastDrawnAgo} ago`
              : 'Open the whiteboard to draw.'}
          </span>
        </button>
      </div>
    </article>
  )
}
