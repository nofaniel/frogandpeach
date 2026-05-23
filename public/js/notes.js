/* notes.js */

const grid      = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const modal     = document.getElementById('note-modal');
const titleInput   = document.getElementById('note-title-input');
const contentInput = document.getElementById('note-content-input');
const saveBtn   = document.getElementById('save-note');
const deleteBtn = document.getElementById('delete-note');
const modalTitle = document.getElementById('modal-title');

let notes = [];
let editingId = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function relativeDate(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchNotes() {
  const res = await fetch('/api/notes');
  notes = await res.json();
  render();
}

async function saveNote() {
  const title   = titleInput.value.trim() || 'Untitled';
  const content = contentInput.value.trim();

  if (editingId) {
    const res = await fetch(`/api/notes/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const updated = await res.json();
    const idx = notes.findIndex(n => n.id === editingId);
    if (idx !== -1) notes[idx] = updated;
    showToast('Note saved');
  } else {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const newNote = await res.json();
    notes.unshift(newNote);
    showToast('Note created');
  }
  closeModal();
  render();
}

async function deleteNote(id) {
  await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  notes = notes.filter(n => n.id !== id);
  closeModal();
  render();
  showToast('Note deleted');
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  grid.innerHTML = '';
  if (notes.length === 0) { emptyState.style.display = ''; return; }
  emptyState.style.display = 'none';

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card fade-in';
    card.innerHTML = `
      <button class="note-card-del" data-del="${note.id}" title="Delete">✕</button>
      <div class="note-card-title">${esc(note.title)}</div>
      <div class="note-card-preview">${esc(note.content || '')}</div>
      <div class="note-card-date">${relativeDate(note.updatedAt)}</div>`;

    // Open editor on tap (not on delete button)
    card.addEventListener('click', e => {
      if (e.target.closest('[data-del]')) return;
      openEditor(note);
    });

    // Delete
    card.querySelector('[data-del]').addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`Delete "${note.title}"?`)) await deleteNote(note.id);
    });

    grid.appendChild(card);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openEditor(note = null) {
  editingId = note ? note.id : null;
  modalTitle.textContent = note ? 'Edit Note' : 'New Note';
  titleInput.value   = note ? note.title   : '';
  contentInput.value = note ? note.content : '';
  deleteBtn.style.display = note ? '' : 'none';
  modal.classList.add('open');
  setTimeout(() => (note ? contentInput : titleInput).focus(), 300);
}

function closeModal() {
  modal.classList.remove('open');
  editingId = null;
}

document.getElementById('fab').addEventListener('click', () => openEditor());
document.getElementById('cancel-note').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', () => {
  if (editingId && confirm('Delete this note?')) deleteNote(editingId);
});

// Save on Ctrl/Cmd+Enter
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && modal.classList.contains('open')) {
    saveNote();
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
fetchNotes();
