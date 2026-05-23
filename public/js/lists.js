/* lists.js */

const container = document.getElementById('lists-container');
const emptyState = document.getElementById('empty-state');
const modal = document.getElementById('new-list-modal');
const nameInput = document.getElementById('list-name-input');

let lists = [];

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

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchLists() {
  const res = await fetch('/api/lists');
  lists = await res.json();
  render();
}

async function createList(name) {
  const res = await fetch('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const newList = await res.json();
  lists.unshift(newList);
  render();
  showToast('List created');
}

async function updateList(id, data) {
  await fetch(`/api/lists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function deleteList(id) {
  await fetch(`/api/lists/${id}`, { method: 'DELETE' });
  lists = lists.filter(l => l.id !== id);
  render();
  showToast('List deleted');
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  // Remove old list cards
  document.querySelectorAll('.list-card').forEach(el => el.remove());

  if (lists.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  lists.forEach(list => {
    const total = list.items.length;
    const done  = list.items.filter(i => i.done).length;
    const pct   = total ? Math.round((done / total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'list-card fade-in';
    card.dataset.id = list.id;

    card.innerHTML = `
      <div class="list-card-header" data-toggle>
        <div class="list-card-icon">🛒</div>
        <div class="list-card-info">
          <div class="list-card-name">${esc(list.name)}</div>
          <div class="list-card-count">${done}/${total} items · ${pct}% done</div>
          ${total ? `<div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
        </div>
        <div class="list-card-chevron">›</div>
      </div>
      <div class="list-items">
        <div class="list-add-input">
          <input type="text" placeholder="Add item..." data-add-input>
          <button class="btn btn-primary btn-sm" data-add-btn>Add</button>
        </div>
        <div data-items-list>
          ${renderItems(list.items, list.id)}
        </div>
        <div class="list-footer">
          <button class="btn btn-ghost btn-sm" data-clear-done>Clear done</button>
          <button class="btn btn-danger btn-sm" data-delete-list>Delete list</button>
        </div>
      </div>`;

    // Toggle expand/collapse
    card.querySelector('[data-toggle]').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });

    // Add item
    const addInput = card.querySelector('[data-add-input]');
    const addBtn   = card.querySelector('[data-add-btn]');

    const doAdd = async () => {
      const text = addInput.value.trim();
      if (!text) return;
      addInput.value = '';
      const listObj = lists.find(l => l.id === list.id);
      listObj.items.push({ id: uid(), text, done: false });
      await updateList(list.id, { items: listObj.items });
      refreshCard(list.id);
    };

    addBtn.addEventListener('click', doAdd);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    // Clear done
    card.querySelector('[data-clear-done]').addEventListener('click', async () => {
      const listObj = lists.find(l => l.id === list.id);
      listObj.items = listObj.items.filter(i => !i.done);
      await updateList(list.id, { items: listObj.items });
      refreshCard(list.id);
      showToast('Done items cleared');
    });

    // Delete list
    card.querySelector('[data-delete-list]').addEventListener('click', async () => {
      if (confirm(`Delete "${list.name}"?`)) await deleteList(list.id);
    });

    container.appendChild(card);
    bindItemEvents(card, list.id);
  });
}

function renderItems(items, listId) {
  if (!items.length) return '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">No items yet — add one above</div>';
  return items.map(item => `
    <div class="list-item" data-item-id="${item.id}">
      <div class="checkbox ${item.done ? 'checked' : ''}" data-check="${item.id}"></div>
      <div class="item-text ${item.done ? 'done' : ''}">${esc(item.text)}</div>
      <button class="delete-btn" data-del-item="${item.id}" title="Remove">✕</button>
    </div>`).join('');
}

function bindItemEvents(card, listId) {
  // Checkboxes
  card.querySelectorAll('[data-check]').forEach(el => {
    el.addEventListener('click', async () => {
      const itemId = el.dataset.check;
      const listObj = lists.find(l => l.id === listId);
      const item    = listObj.items.find(i => i.id === itemId);
      item.done = !item.done;
      await updateList(listId, { items: listObj.items });
      refreshCard(listId);
    });
  });

  // Delete item buttons
  card.querySelectorAll('[data-del-item]').forEach(el => {
    el.addEventListener('click', async () => {
      const itemId  = el.dataset.delItem;
      const listObj = lists.find(l => l.id === listId);
      listObj.items = listObj.items.filter(i => i.id !== itemId);
      await updateList(listId, { items: listObj.items });
      refreshCard(listId);
    });
  });
}

function refreshCard(listId) {
  const listObj = lists.find(l => l.id === listId);
  const card    = document.querySelector(`.list-card[data-id="${listId}"]`);
  if (!card || !listObj) return;

  const total = listObj.items.length;
  const done  = listObj.items.filter(i => i.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  card.querySelector('.list-card-count').textContent = `${done}/${total} items · ${pct}% done`;
  const pb = card.querySelector('.progress-fill');
  if (pb) pb.style.width = pct + '%';
  card.querySelector('[data-items-list]').innerHTML = renderItems(listObj.items, listId);
  bindItemEvents(card, listId);
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
document.getElementById('fab').addEventListener('click', () => {
  modal.classList.add('open');
  setTimeout(() => nameInput.focus(), 300);
});

document.getElementById('cancel-new').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.getElementById('confirm-new').addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  closeModal();
  await createList(name);
});

nameInput.addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    const name = nameInput.value.trim();
    if (!name) return;
    closeModal();
    await createList(name);
  }
});

function closeModal() {
  modal.classList.remove('open');
  nameInput.value = '';
}

// ── Init ─────────────────────────────────────────────────────────────────────
fetchLists();
