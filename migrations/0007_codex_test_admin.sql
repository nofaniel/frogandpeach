INSERT INTO users (id, username, display_name, role, password_hash, active, password_reset_required, created_at, updated_at)
VALUES (
  'seed-codex-test',
  'codex_test',
  'Codex Test',
  'admin',
  'pbkdf2_sha256$210000$iE2doPqKdGOBVBzMG6sGMw==$13uf5SwqG8t+ms5xK7384N9RgHz0Bd8EocbB8bjwlro=',
  1,
  0,
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
)
ON CONFLICT(username) DO UPDATE SET
  display_name = excluded.display_name,
  role = excluded.role,
  password_hash = excluded.password_hash,
  active = 1,
  password_reset_required = 0,
  updated_at = excluded.updated_at;
