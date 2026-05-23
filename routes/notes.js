import db from '../db.js';
import { renderMarkdown } from '../services/markdown.js';

export default async function notes(app) {
  app.get('/', async (req, reply) => {
    const q = (req.query?.q || '').trim();
    const tag = (req.query?.tag || '').trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = db.prepare(`
        SELECT id, title, tags, updated_at FROM notes
        WHERE title LIKE ? OR body_md LIKE ? OR tags LIKE ?
        ORDER BY updated_at DESC
      `).all(like, like, like);
    } else if (tag) {
      rows = db.prepare(`
        SELECT id, title, tags, updated_at FROM notes
        WHERE ',' || tags || ',' LIKE ?
        ORDER BY updated_at DESC
      `).all(`%,${tag},%`);
    } else {
      rows = db.prepare('SELECT id, title, tags, updated_at FROM notes ORDER BY updated_at DESC').all();
    }
    const allTags = new Set();
    db.prepare('SELECT tags FROM notes').all().forEach(r => {
      r.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => allTags.add(t));
    });
    return reply.view('notes/index', { title: 'Notes', notes: rows, q, tag, allTags: [...allTags].sort() });
  });

  app.get('/new', async (req, reply) => {
    return reply.view('notes/edit', { title: 'New note', note: { id: null, title: '', body_md: '', tags: '' } });
  });

  app.post('/', async (req, reply) => {
    const { title = '', body_md = '', tags = '' } = req.body || {};
    const t = (title || 'Untitled').trim();
    const cleanTags = normalizeTags(tags);
    const info = db.prepare(
      'INSERT INTO notes (title, body_md, tags, updated_at) VALUES (?, ?, ?, ?)'
    ).run(t, body_md, cleanTags, Date.now());
    return reply.redirect(`/notes/${info.lastInsertRowid}`);
  });

  app.get('/:id', async (req, reply) => {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) return reply.code(404).send('Not found');
    return reply.view('notes/show', {
      title: note.title,
      note,
      html: renderMarkdown(note.body_md),
      tags: note.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  });

  app.get('/:id/edit', async (req, reply) => {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!note) return reply.code(404).send('Not found');
    return reply.view('notes/edit', { title: `Edit: ${note.title}`, note });
  });

  app.post('/:id', async (req, reply) => {
    const { title = '', body_md = '', tags = '' } = req.body || {};
    db.prepare('UPDATE notes SET title = ?, body_md = ?, tags = ?, updated_at = ? WHERE id = ?')
      .run((title || 'Untitled').trim(), body_md, normalizeTags(tags), Date.now(), req.params.id);
    return reply.redirect(`/notes/${req.params.id}`);
  });

  app.post('/:id/delete', async (req, reply) => {
    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    return reply.redirect('/notes');
  });
}

function normalizeTags(s) {
  return (s || '').split(',').map(t => t.trim()).filter(Boolean).join(',');
}
