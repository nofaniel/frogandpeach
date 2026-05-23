/* pages.js */

const grid      = document.getElementById('pages-grid');
const emptyState = document.getElementById('empty-state');
const modal     = document.getElementById('builder-modal');

let pages = [];
let selectedEmoji = '🌸';

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

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Live preview ──────────────────────────────────────────────────────────────
function updatePreview() {
  document.getElementById('pv-emoji').textContent = selectedEmoji;
  document.getElementById('pv-occ').textContent   = document.getElementById('pg-occasion').value;
  document.getElementById('pv-title').textContent = document.getElementById('pg-title').value || 'Your title here';
  document.getElementById('pv-msg').textContent   = document.getElementById('pg-message').value || 'Your message will appear here...';
}

document.getElementById('pg-occasion').addEventListener('change', updatePreview);
document.getElementById('pg-title').addEventListener('input', updatePreview);
document.getElementById('pg-message').addEventListener('input', updatePreview);

// Emoji picker
document.getElementById('emoji-picker').addEventListener('click', e => {
  const opt = e.target.closest('.emoji-option');
  if (!opt) return;
  document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
  opt.classList.add('selected');
  selectedEmoji = opt.dataset.emoji;
  updatePreview();
});

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchPages() {
  const res = await fetch('/api/pages');
  pages = await res.json();
  render();
}

async function createPage() {
  const title    = document.getElementById('pg-title').value.trim();
  const occasion = document.getElementById('pg-occasion').value;
  const message  = document.getElementById('pg-message').value.trim();

  if (!title) {
    document.getElementById('pg-title').focus();
    showToast('Please add a title');
    return;
  }

  const res = await fetch('/api/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, occasion, message, emoji: selectedEmoji, theme: 'botanical' }),
  });
  const newPage = await res.json();
  pages.unshift(newPage);
  closeBuilder();
  render();
  showToast('Page created!');
}

async function deletePage(id) {
  await fetch(`/api/pages/${id}`, { method: 'DELETE' });
  pages = pages.filter(p => p.id !== id);
  render();
  showToast('Page deleted');
}

// ── Render gallery ────────────────────────────────────────────────────────────
function render() {
  grid.innerHTML = '';
  if (pages.length === 0) { emptyState.style.display = ''; return; }
  emptyState.style.display = 'none';

  pages.forEach(page => {
    const card = document.createElement('div');
    card.className = 'page-card fade-in';
    card.innerHTML = `
      <button class="page-card-delete" data-del="${page.id}" title="Delete">✕</button>
      <div class="page-card-emoji">${esc(page.emoji)}</div>
      <div class="page-card-title">${esc(page.title)}</div>
      <div class="page-card-occasion">${esc(page.occasion)}</div>
      <div class="page-card-date">${fmtDate(page.createdAt)}</div>`;

    // Open page view on tap
    card.addEventListener('click', e => {
      if (e.target.closest('[data-del]')) return;
      location.href = `/page/${page.id}`;
    });

    // Delete
    card.querySelector('[data-del]').addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`Delete "${page.title}"?`)) await deletePage(page.id);
    });

    grid.appendChild(card);
  });
}

// ── Builder modal ─────────────────────────────────────────────────────────────
document.getElementById('fab').addEventListener('click', openBuilder);
document.getElementById('cancel-builder').addEventListener('click', closeBuilder);
modal.addEventListener('click', e => { if (e.target === modal) closeBuilder(); });
document.getElementById('save-builder').addEventListener('click', createPage);

function openBuilder() {
  // Reset form
  document.getElementById('pg-title').value = '';
  document.getElementById('pg-message').value = '';
  document.getElementById('pg-occasion').value = 'Just Because';
  selectedEmoji = '🌸';
  document.querySelectorAll('.emoji-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.emoji === '🌸');
  });
  updatePreview();
  modal.classList.add('open');
  setTimeout(() => document.getElementById('pg-title').focus(), 300);
}

function closeBuilder() {
  modal.classList.remove('open');
}

// ── Init ─────────────────────────────────────────────────────────────────────
fetchPages();
