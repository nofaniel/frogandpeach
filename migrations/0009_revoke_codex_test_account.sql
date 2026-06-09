-- Revoke the historical shared Codex E2E account if migration 0007 was applied.
-- Keep the row inactive rather than deleting it so any loose references remain
-- resolvable, while clearing all sessions that could already be authenticated.

DELETE FROM sessions
WHERE user_name = 'codex_test'
   OR user_id IN (SELECT id FROM users WHERE username = 'codex_test');

UPDATE users
SET
  display_name = 'Revoked Codex Test',
  role = 'member',
  password_hash = 'pbkdf2_sha256$210000$cmV2b2tlZC1jb2RleC10ZXN0$C1qGxVK2N7GJ1OExmvSqbSPBQMFfbGkri4SCwkl/rxo=',
  active = 0,
  password_reset_required = 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE username = 'codex_test';
