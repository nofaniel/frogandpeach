import db from '../db.js';

export default async function lists(app) {
  app.get('/', async (req, reply) => {
    const rows = db.prepare(`
      SELECT l.id, l.name,
        (SELECT COUNT(*) FROM shopping_items i WHERE i.list_id = l.id AND i.checked = 0) AS unchecked,
        (SELECT COUNT(*) FROM shopping_items i WHERE i.list_id = l.id) AS total
      FROM shopping_lists l ORDER BY l.created_at DESC
    `).all();
    return reply.view('lists/index', { title: 'Lists', lists: rows });
  });

  app.post('/', async (req, reply) => {
    const name = (req.body?.name || '').trim();
    if (!name) return reply.redirect('/lists');
    db.prepare('INSERT INTO shopping_lists (name, created_at) VALUES (?, ?)').run(name, Date.now());
    return reply.redirect('/lists');
  });

  app.get('/:id', async (req, reply) => {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return reply.code(404).send('Not found');
    const items = db.prepare(
      'SELECT * FROM shopping_items WHERE list_id = ? ORDER BY checked, created_at'
    ).all(list.id);
    return reply.view('lists/show', { title: list.name, list, items });
  });

  app.post('/:id/items', async (req, reply) => {
    const text = (req.body?.text || '').trim();
    if (!text) return reply.redirect(`/lists/${req.params.id}`);
    db.prepare('INSERT INTO shopping_items (list_id, text, created_at) VALUES (?, ?, ?)')
      .run(req.params.id, text, Date.now());
    return reply.redirect(`/lists/${req.params.id}`);
  });

  app.post('/:id/items/:itemId/toggle', async (req, reply) => {
    const item = db.prepare('SELECT * FROM shopping_items WHERE id = ? AND list_id = ?')
      .get(req.params.itemId, req.params.id);
    if (!item) return reply.code(404).send('Not found');
    const next = item.checked ? 0 : 1;
    db.prepare('UPDATE shopping_items SET checked = ? WHERE id = ?').run(next, item.id);
    // Return a tiny HTMX partial: re-render this row.
    const updated = { ...item, checked: next };
    return reply.view('lists/_item', { item: updated, listId: req.params.id });
  });

  app.post('/:id/items/:itemId/delete', async (req, reply) => {
    db.prepare('DELETE FROM shopping_items WHERE id = ? AND list_id = ?')
      .run(req.params.itemId, req.params.id);
    return reply.header('HX-Trigger', 'item-deleted').send('');
  });

  app.post('/:id/clear', async (req, reply) => {
    db.prepare('DELETE FROM shopping_items WHERE list_id = ? AND checked = 1').run(req.params.id);
    return reply.redirect(`/lists/${req.params.id}`);
  });

  app.post('/:id/delete', async (req, reply) => {
    db.prepare('DELETE FROM shopping_lists WHERE id = ?').run(req.params.id);
    return reply.redirect('/lists');
  });
}
