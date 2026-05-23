import db from '../db.js';
import { renderMarkdown } from '../services/markdown.js';

export default async function pages(app) {
  app.get('/pages', async (req, reply) => {
    const rows = db.prepare('SELECT id, slug, title, updated_at FROM pages ORDER BY updated_at DESC').all();
    return reply.view('pages/index', { title: 'Pages', pages: rows });
  });

  app.get('/pages/new', async (req, reply) => {
    return reply.view('pages/edit', { title: 'New page', page: { slug: '', title: '', body_md: '' }, isNew: true });
  });

  app.post('/pages', async (req, reply) => {
    const { slug = '', title = '', body_md = '' } = req.body || {};
    const s = slugify(slug || title);
    if (!s) return reply.redirect('/pages');
    try {
      db.prepare('INSERT INTO pages (slug, title, body_md, updated_at) VALUES (?, ?, ?, ?)')
        .run(s, title || s, body_md, Date.now());
    } catch (e) {
      return reply.code(400).send(`Slug "${s}" already exists.`);
    }
    return reply.redirect(`/p/${s}`);
  });

  app.get('/p/:slug', async (req, reply) => {
    const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
    if (!page) return reply.code(404).view('pages/notfound', { title: 'Not found', slug: req.params.slug });
    return reply.view('pages/show', {
      title: page.title,
      page,
      html: renderMarkdown(page.body_md),
    });
  });

  app.get('/pages/:slug/edit', async (req, reply) => {
    const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
    if (!page) return reply.code(404).send('Not found');
    return reply.view('pages/edit', { title: `Edit: ${page.title}`, page, isNew: false });
  });

  app.post('/pages/:slug', async (req, reply) => {
    const { title = '', body_md = '' } = req.body || {};
    db.prepare('UPDATE pages SET title = ?, body_md = ?, updated_at = ? WHERE slug = ?')
      .run(title || req.params.slug, body_md, Date.now(), req.params.slug);
    return reply.redirect(`/p/${req.params.slug}`);
  });

  app.post('/pages/:slug/delete', async (req, reply) => {
    db.prepare('DELETE FROM pages WHERE slug = ?').run(req.params.slug);
    return reply.redirect('/pages');
  });
}

function slugify(s) {
  return (s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
