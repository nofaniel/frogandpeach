import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Markdown } from '../../components/Markdown'
import type { Note } from '../../shared/api-types'
import { formatDate } from '../../shared/format'

export function NotesWorkspace({
  notes,
  noteDraft,
  setNoteDraft,
  onCreateNote,
  onToggleNote,
  onRemoveNote,
}: {
  notes: Note[]
  noteDraft: { title: string; body: string; tags: string }
  setNoteDraft: Dispatch<SetStateAction<{ title: string; body: string; tags: string }>>
  onCreateNote: (event: FormEvent<HTMLFormElement>) => void
  onToggleNote: (note: Note) => void
  onRemoveNote: (id: string) => void
}) {
  return (
    <section className="workspace-grid">
      <form className="panel form-panel" onSubmit={onCreateNote}>
        <p className="kicker">Notes</p>
        <h2>Capture</h2>
        <input value={noteDraft.title} onChange={(event) => setNoteDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
        <textarea value={noteDraft.body} onChange={(event) => setNoteDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Markdown note" />
        <input value={noteDraft.tags} onChange={(event) => setNoteDraft((draft) => ({ ...draft, tags: event.target.value }))} placeholder="Tags, comma separated" />
        <button type="submit">Save note</button>
      </form>
      {notes.map((note) => (
        <article className="panel note-panel" key={note.id}>
          <div className="panel-heading">
            <div>
              <p className="kicker">{note.pinned ? 'Pinned' : formatDate(note.updatedAt)} / {note.noteType}{note.updatedByName ? ` / ${note.updatedByName}` : ''}</p>
              <h2>{note.title}</h2>
            </div>
            <button type="button" className="ghost" onClick={() => void onToggleNote(note)}>{note.pinned ? 'Unpin' : 'Pin'}</button>
          </div>
          <Markdown body={note.body} />
          {note.tags && <p className="tag-line">{note.tags}</p>}
          <button type="button" className="ghost danger" onClick={() => void onRemoveNote(note.id)}>Delete</button>
        </article>
      ))}
    </section>
  )
}
