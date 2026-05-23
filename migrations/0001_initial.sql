CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS module_settings (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'shell',
  occasion TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_links (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'page',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('wifiName', ''),
  ('wifiPassword', ''),
  ('routerUrl', ''),
  ('adminUrl', ''),
  ('binDay', ''),
  ('flatNotes', 'Frog & Peach is private by default. Keep admin credentials out of shared notes.'),
  ('locationName', 'Newquay'),
  ('locationRegion', 'Cornwall'),
  ('latitude', '50.4155'),
  ('longitude', '-5.0737'),
  ('timezone', 'Europe/London');

INSERT OR IGNORE INTO module_settings (id, enabled, position) VALUES
  ('weather', 1, 10),
  ('tides', 1, 20),
  ('lists', 1, 30),
  ('notes', 1, 40),
  ('pages', 1, 50),
  ('network', 1, 60);

INSERT OR IGNORE INTO shopping_lists (id, name, created_at, updated_at)
VALUES ('seed-flat-bits', 'Flat bits', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

INSERT OR IGNORE INTO shopping_items (id, list_id, text, done, created_at, updated_at)
VALUES
  ('seed-milk', 'seed-flat-bits', 'Milk', 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  ('seed-bread', 'seed-flat-bits', 'Bread', 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

INSERT OR IGNORE INTO page_links (id, title, href, description, kind, created_at, updated_at)
VALUES ('example', 'Example page', '/pages/example/index.html', 'Replace this with one of your own custom pages.', 'static', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
