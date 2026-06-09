CREATE TABLE whiteboard_strokes (
  id TEXT PRIMARY KEY,
  points TEXT NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#000000',
  width REAL NOT NULL DEFAULT 2,
  tool TEXT NOT NULL DEFAULT 'pen',
  opacity REAL NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_whiteboard_strokes_created_at ON whiteboard_strokes (created_at);
