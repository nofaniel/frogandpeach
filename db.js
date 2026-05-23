import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, 'hub.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS shopping_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kv_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL
);
`);

// Seed a default shopping list if none exist
const listCount = db.prepare('SELECT COUNT(*) AS n FROM shopping_lists').get().n;
if (listCount === 0) {
  db.prepare('INSERT INTO shopping_lists (name, created_at) VALUES (?, ?)')
    .run('Shopping', Date.now());
}

export const cache = {
  get(key) {
    const row = db.prepare('SELECT value, expires_at, fetched_at FROM kv_cache WHERE key = ?').get(key);
    if (!row) return null;
    return {
      value: JSON.parse(row.value),
      expired: row.expires_at < Date.now(),
      fetched_at: row.fetched_at,
    };
  },
  set(key, value, ttlMs) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO kv_cache (key, value, expires_at, fetched_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at, fetched_at=excluded.fetched_at
    `).run(key, JSON.stringify(value), now + ttlMs, now);
  },
};

export default db;
