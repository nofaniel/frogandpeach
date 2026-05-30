CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE sessions ADD COLUMN user_id TEXT;
ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE sessions ADD COLUMN admin_unlocked_until TEXT;

ALTER TABLE module_settings ADD COLUMN installed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE module_settings ADD COLUMN size TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE module_settings ADD COLUMN options_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE module_settings ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

UPDATE module_settings SET size = 'wide' WHERE id IN ('weather', 'tides', 'pages', 'network');
INSERT OR IGNORE INTO module_settings (id, installed, enabled, position, size, options_json, updated_at) VALUES
  ('settings', 1, 0, 70, 'wide', '{}', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

ALTER TABLE notes ADD COLUMN note_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE notes ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE notes ADD COLUMN created_by TEXT;
ALTER TABLE notes ADD COLUMN updated_by TEXT;

CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  list_type TEXT NOT NULL DEFAULT 'shopping',
  reset_key TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO lists (id, name, list_type, reset_key, metadata_json, created_at, updated_at)
SELECT id, name, 'shopping', '', '{}', created_at, updated_at FROM shopping_lists WHERE id <> 'seed-flat-bits';

INSERT OR IGNORE INTO list_items (id, list_id, text, done, created_at, updated_at)
SELECT id, list_id, text, done, created_at, updated_at FROM shopping_items WHERE list_id <> 'seed-flat-bits';

CREATE TABLE IF NOT EXISTS page_manifests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_path TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('colourTheme', 'frog-peach'),
  ('styleTheme', 'classic');

DELETE FROM shopping_items WHERE id IN ('seed-milk', 'seed-bread') OR list_id = 'seed-flat-bits';
DELETE FROM shopping_lists WHERE id = 'seed-flat-bits';
DELETE FROM page_links WHERE id = 'example' AND href = '/pages/example/index.html';
