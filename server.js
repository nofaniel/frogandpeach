import 'dotenv/config';
import Fastify from 'fastify';
import view from '@fastify/view';
import staticPlugin from '@fastify/static';
import formbody from '@fastify/formbody';
import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import home from './routes/home.js';
import lists from './routes/lists.js';
import notes from './routes/notes.js';
import pages from './routes/pages.js';
import network from './routes/network.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8080', 10);

const app = Fastify({ logger: true });

await app.register(formbody);
await app.register(staticPlugin, {
  root: path.join(__dirname, 'public'),
  prefix: '/static/',
});
await app.register(view, {
  engine: { ejs },
  root: path.join(__dirname, 'views'),
  includeViewExtension: true,
  propertyName: 'view',
  defaultContext: { nav: navItems() },
});

function navItems() {
  return [
    { href: '/', label: 'Home' },
    { href: '/lists', label: 'Lists' },
    { href: '/notes', label: 'Notes' },
    { href: '/pages', label: 'Pages' },
    { href: '/network', label: 'Network' },
  ];
}

await app.register(home);
await app.register(lists, { prefix: '/lists' });
await app.register(notes, { prefix: '/notes' });
await app.register(pages);
await app.register(network, { prefix: '/network' });

app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  reply.code(500).send({ error: err.message });
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Flat Hub on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
