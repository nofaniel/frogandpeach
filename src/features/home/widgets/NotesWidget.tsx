import type { Module, Note, Tab } from '../../../shared/api-types'
import { firstLine, formatDate } from '../../../shared/format'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'

export function NotesWidget({
  module,
  notes,
  onSetActiveTab,
}: {
  module: Module
  notes: Note[]
  onSetActiveTab: (tab: Tab) => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const visibleNotes = notes.slice(0, widget.mode === 'large' ? 6 : 3)

  return (
    <article id={module.id} className={'panel module-' + module.size}>
      <p className="kicker">Notes</p>
      <h2>{widget.mode === 'large' ? 'Pinned, recent, and detailed' : 'Pinned & recent'}</h2>
      <div className={widget.mode === 'large' ? 'note-launchpad-grid' : 'stack-list'}>
        {visibleNotes.map((note) => (
          widget.mode === 'large' ? (
            <button key={note.id} type="button" className="plain-row note-launchpad-card" onClick={() => onSetActiveTab('notes')}>
              <div className="note-launchpad-head">
                <strong>{note.pinned ? 'Pinned: ' : ''}{note.title}</strong>
                <span>{note.updatedByName ? note.updatedByName + ' / ' : ''}{formatDate(note.updatedAt)}</span>
              </div>
              <p>{firstLine(note.body) || 'No detail yet'}</p>
              {note.tags && <span className="tag-line">{note.tags}</span>}
            </button>
          ) : (
            <button key={note.id} type="button" className="plain-row" onClick={() => onSetActiveTab('notes')}>
              <strong>{note.pinned ? 'Pinned: ' : ''}{note.title}</strong>
              <span>{note.tags || firstLine(note.body) || 'No detail yet'}</span>
            </button>
          )
        ))}
        {visibleNotes.length === 0 && <div className="plain-row"><strong>No notes yet</strong><span>Create one in the Notes tab.</span></div>}
      </div>
    </article>
  )
}
