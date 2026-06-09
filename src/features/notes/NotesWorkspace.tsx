import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Markdown } from '../../components/Markdown'
import type { Note } from '../../shared/api-types'
import { formatDate } from '../../shared/format'

type NoteDraft = { title: string; body: string; tags: string }
type SortMode = 'pinned' | 'recent' | 'alpha'

function parseTags(tags: string): string[] {
  return tags.split(',').map((t) => t.trim()).filter(Boolean)
}

function serialiseTags(tags: string[]): string {
  return tags.join(',')
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags.filter((t) => {
    const lower = t.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })
}

function allKnownTags(notes: Note[]): string[] {
  const all = notes.flatMap((n) => parseTags(n.tags))
  return [...new Set(all.map((t) => t.toLowerCase()))].map((lower) => all.find((t) => t.toLowerCase() === lower)!)
}

function filterAndSortNotes(notes: Note[], search: string, sort: SortMode): Note[] {
  let result = notes
  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.toLowerCase().includes(q),
    )
  }
  const sorted = [...result]
  if (sort === 'pinned') {
    sorted.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
  } else if (sort === 'recent') {
    sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } else if (sort === 'alpha') {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  }
  return sorted
}

function applyFormatting(
  textarea: HTMLTextAreaElement | null,
  kind: 'bold' | 'italic' | 'underline' | 'list',
  setText: (updater: (prev: string) => string) => void,
) {
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)

  let replacement: string
  let cursorOffset: number

  if (kind === 'list') {
    const lines = (selected || 'Item').split('\n')
    replacement = lines.map((l) => `- ${l}`).join('\n')
    cursorOffset = replacement.length
    setText((prev) => prev.slice(0, start) + replacement + prev.slice(end))
  } else {
    const wrap = kind === 'bold' ? '**' : kind === 'italic' ? '*' : '<u>'
    const closeWrap = kind === 'bold' ? '**' : kind === 'italic' ? '*' : '</u>'
    if (selected) {
      replacement = `${wrap}${selected}${closeWrap}`
      cursorOffset = replacement.length
    } else {
      replacement = `${wrap}text${closeWrap}`
      cursorOffset = wrap.length
    }
    setText((prev) => prev.slice(0, start) + replacement + prev.slice(end))
  }

  requestAnimationFrame(() => {
    textarea.focus()
    if (selected) {
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset)
    } else if (kind !== 'list') {
      textarea.setSelectionRange(start + (kind === 'bold' ? 2 : kind === 'italic' ? 1 : 3), start + (kind === 'bold' ? 6 : kind === 'italic' ? 5 : 7))
    }
  })
}

export function NotesWorkspace({
  notes,
  noteDraft,
  setNoteDraft,
  onCreateNote,
  onToggleNote,
  onUpdateNote,
  onRemoveNote,
}: {
  notes: Note[]
  noteDraft: NoteDraft
  setNoteDraft: Dispatch<SetStateAction<NoteDraft>>
  onCreateNote: (data: { title: string; body: string; tags: string }) => void
  onToggleNote: (note: Note) => void
  onUpdateNote: (id: string, patch: { title?: string; body?: string; tags?: string }) => void
  onRemoveNote: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('pinned')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [draftTagInput, setDraftTagInput] = useState('')
  const [draftTagEditorOpen, setDraftTagEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<NoteDraft>({ title: '', body: '', tags: '' })
  const [editDraftTags, setEditDraftTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')
  const [editTagEditorOpen, setEditTagEditorOpen] = useState(false)

  const createBodyRef = useRef<HTMLTextAreaElement>(null)
  const editBodyRef = useRef<HTMLTextAreaElement>(null)

  const knownTags = useMemo(() => allKnownTags(notes), [notes])
  const visibleNotes = useMemo(() => filterAndSortNotes(notes, search, sort), [notes, search, sort])

  const visibleDraftTags = useMemo(() => {
    if (!draftTagInput.trim()) return []
    const lower = draftTagInput.toLowerCase()
    return knownTags.filter(
      (t) => t.toLowerCase().includes(lower) && !draftTags.some((d) => d.toLowerCase() === t.toLowerCase()),
    )
  }, [knownTags, draftTagInput, draftTags])

  const visibleEditTags = useMemo(() => {
    if (!editTagInput.trim()) return []
    const lower = editTagInput.toLowerCase()
    return knownTags.filter(
      (t) => t.toLowerCase().includes(lower) && !editDraftTags.some((d) => d.toLowerCase() === t.toLowerCase()),
    )
  }, [knownTags, editTagInput, editDraftTags])

  function commitDraftTag(input: string, tags: string[], setTags: (t: string[]) => void, setInput: (v: string) => void) {
    const trimmed = input.trim().replace(/,$/, '').trim()
    if (!trimmed) return
    const next = dedupeTags([...tags, trimmed])
    setTags(next)
    setInput('')
  }

  function commitEditTag(input: string) {
    commitDraftTag(input, editDraftTags, setEditDraftTags, setEditTagInput)
  }

  function commitNewTag(input: string) {
    commitDraftTag(input, draftTags, setDraftTags, setDraftTagInput)
  }

  function removeDraftTag(tag: string) {
    setDraftTags((prev) => prev.filter((t) => t !== tag))
  }

  function removeEditTag(tag: string) {
    setEditDraftTags((prev) => prev.filter((t) => t !== tag))
  }

  function startEditing(note: Note) {
    setEditingId(note.id)
    const tags = parseTags(note.tags)
    setEditDraft({ title: note.title, body: note.body, tags: note.tags })
    setEditDraftTags(tags)
    setEditTagInput('')
    setEditTagEditorOpen(false)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditDraft({ title: '', body: '', tags: '' })
    setEditDraftTags([])
    setEditTagInput('')
    setEditTagEditorOpen(false)
  }

  function saveEditing(id: string) {
    onUpdateNote(id, {
      title: editDraft.title,
      body: editDraft.body,
      tags: serialiseTags(editDraftTags),
    })
    cancelEditing()
  }

  const handleCreateSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (!noteDraft.title.trim() && !noteDraft.body.trim()) return
      onCreateNote({
        title: noteDraft.title,
        body: noteDraft.body,
        tags: serialiseTags(draftTags),
      })
      setDraftTags([])
      setDraftTagInput('')
      setDraftTagEditorOpen(false)
    },
    [noteDraft, draftTags, onCreateNote],
  )

  return (
    <section className="workspace-grid">
      <form className="panel form-panel" onSubmit={(e) => void handleCreateSubmit(e)}>
        <p className="kicker">Notes</p>
        <h2>New note</h2>
        <input value={noteDraft.title} onChange={(event) => setNoteDraft((d) => ({ ...d, title: event.target.value }))} placeholder="Title" aria-label="Title" />
        <div className="note-formatting-bar" role="toolbar" aria-label="Formatting">
          <button type="button" className="icon-button ghost" onClick={() => applyFormatting(createBodyRef.current, 'bold', (up) => setNoteDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Bold"><strong>B</strong></button>
          <button type="button" className="icon-button ghost" onClick={() => applyFormatting(createBodyRef.current, 'italic', (up) => setNoteDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Italic"><em>I</em></button>
          <button type="button" className="icon-button ghost" onClick={() => applyFormatting(createBodyRef.current, 'underline', (up) => setNoteDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Underline"><u>U</u></button>
          <button type="button" className="icon-button ghost" onClick={() => applyFormatting(createBodyRef.current, 'list', (up) => setNoteDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Bullet list">- List</button>
        </div>
        <textarea ref={createBodyRef} value={noteDraft.body} onChange={(event) => setNoteDraft((d) => ({ ...d, body: event.target.value }))} placeholder="Note body" aria-label="Note body" />
        <div className="note-tag-section">
          <button type="button" className="icon-button ghost" onClick={() => setDraftTagEditorOpen((v) => !v)} aria-label="Tags">
            <span aria-hidden="true">#</span>
          </button>
          {draftTagEditorOpen && (
            <div className="note-tag-editor">
              {draftTags.length > 0 && (
                <div className="note-tag-chips">
                  {draftTags.map((tag) => (
                    <span key={tag} className="note-chip">
                      {tag}
                      <button type="button" className="note-chip-x" onClick={() => removeDraftTag(tag)} aria-label={`Remove tag ${tag}`}>x</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={draftTagInput}
                onChange={(event) => setDraftTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter' || event.key === ',') {
                    event.preventDefault()
                    commitNewTag(draftTagInput)
                  }
                }}
                placeholder="Add tag..."
                aria-label="Add tag"
              />
              {visibleDraftTags.length > 0 && (
                <div className="note-tag-suggestions">
                  {visibleDraftTags.slice(0, 6).map((tag) => (
                    <button key={tag} type="button" className="note-tag-suggestion" onClick={() => { commitDraftTag(tag, draftTags, setDraftTags, setDraftTagInput) }}>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button type="submit">Save note</button>
      </form>

      <div className="note-toolbar panel">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes..."
          aria-label="Search notes"
          className="note-search"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort notes" className="note-sort">
          <option value="pinned">Pinned first</option>
          <option value="recent">Recently updated</option>
          <option value="alpha">Title A-Z</option>
        </select>
      </div>

      {visibleNotes.length === 0 && (
        <div className="panel empty-state">
          <h2>{search.trim() ? 'No notes match your search' : 'No notes yet'}</h2>
        </div>
      )}

      {visibleNotes.map((note) => (
        <article className="panel note-panel" key={note.id}>
          {editingId === note.id ? (
            <div className="note-edit-form">
              <div className="panel-heading">
                <div>
                  <p className="kicker">Editing</p>
                  <h2>
                    <input value={editDraft.title} onChange={(event) => setEditDraft((d) => ({ ...d, title: event.target.value }))} placeholder="Title" aria-label="Edit title" className="note-edit-title" />
                  </h2>
                </div>
              </div>
              <div className="note-formatting-bar" role="toolbar" aria-label="Formatting">
                <button type="button" className="icon-button ghost" onClick={() => applyFormatting(editBodyRef.current, 'bold', (up) => setEditDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Bold"><strong>B</strong></button>
                <button type="button" className="icon-button ghost" onClick={() => applyFormatting(editBodyRef.current, 'italic', (up) => setEditDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Italic"><em>I</em></button>
                <button type="button" className="icon-button ghost" onClick={() => applyFormatting(editBodyRef.current, 'underline', (up) => setEditDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Underline"><u>U</u></button>
                <button type="button" className="icon-button ghost" onClick={() => applyFormatting(editBodyRef.current, 'list', (up) => setEditDraft((d) => ({ ...d, body: up(d.body) })))} aria-label="Bullet list">- List</button>
              </div>
              <textarea ref={editBodyRef} value={editDraft.body} onChange={(event) => setEditDraft((d) => ({ ...d, body: event.target.value }))} placeholder="Note body" aria-label="Edit note body" />
              <div className="note-tag-section">
                <button type="button" className="icon-button ghost" onClick={() => setEditTagEditorOpen((v) => !v)} aria-label="Tags">
                  <span aria-hidden="true">#</span>
                </button>
                {editTagEditorOpen && (
                  <div className="note-tag-editor">
                    {editDraftTags.length > 0 && (
                      <div className="note-tag-chips">
                        {editDraftTags.map((tag) => (
                          <span key={tag} className="note-chip">
                            {tag}
                            <button type="button" className="note-chip-x" onClick={() => removeEditTag(tag)} aria-label={`Remove tag ${tag}`}>x</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      value={editTagInput}
                      onChange={(event) => setEditTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === ' ' || event.key === 'Enter' || event.key === ',') {
                          event.preventDefault()
                          commitEditTag(editTagInput)
                        }
                      }}
                      placeholder="Add tag..."
                      aria-label="Add tag"
                    />
                    {visibleEditTags.length > 0 && (
                      <div className="note-tag-suggestions">
                        {visibleEditTags.slice(0, 6).map((tag) => (
                          <button key={tag} type="button" className="note-tag-suggestion" onClick={() => commitDraftTag(tag, editDraftTags, setEditDraftTags, setEditTagInput)}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="note-edit-actions">
                <button type="button" className="ghost" onClick={() => saveEditing(note.id)}>Save changes</button>
                <button type="button" className="ghost" onClick={cancelEditing}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <p className="kicker">{note.pinned ? 'Pinned' : formatDate(note.updatedAt)} / {note.noteType}{note.updatedByName ? ` / ${note.updatedByName}` : ''}</p>
                  <h2>{note.title}</h2>
                </div>
                <div className="note-actions">
                  <button type="button" className="icon-button ghost" onClick={() => void onToggleNote(note)} aria-label={note.pinned ? `Unpin note: ${note.title}` : `Pin note: ${note.title}`}>
                    {note.pinned ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                    )}
                  </button>
                  <button type="button" className="icon-button ghost" onClick={() => startEditing(note)} aria-label={`Edit note: ${note.title}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button type="button" className="icon-button ghost danger" onClick={() => void onRemoveNote(note.id)} aria-label={`Delete note: ${note.title}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
              <Markdown body={note.body} />
              {note.tags && <p className="tag-line">{note.tags}</p>}
            </>
          )}
        </article>
      ))}
    </section>
  )
}
