-- Track failed authentication attempts for server-side rate limiting.
-- Each row represents one failed attempt and expires after the rate-limit window.
-- Successful authentication deletes all rows for the relevant bucket.
-- Expired rows are cleaned up opportunistically when a new failure is recorded.

CREATE TABLE IF NOT EXISTS auth_attempts (
  id         TEXT NOT NULL PRIMARY KEY,
  bucket     TEXT NOT NULL,
  action     TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_lookup ON auth_attempts (bucket, expires_at);
