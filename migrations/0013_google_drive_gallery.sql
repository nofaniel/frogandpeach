CREATE TABLE IF NOT EXISTS google_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  folder_id TEXT NOT NULL DEFAULT '',
  folder_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
