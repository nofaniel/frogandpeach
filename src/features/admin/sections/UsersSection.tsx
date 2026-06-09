import { useState, type FormEvent } from 'react'
import type { UserPatch, UserRecord } from '../../../shared/api-types'

export function UsersSection({
  users,
  userDraft,
  onUserDraftChange,
  onCreateUser,
  onPatchUser,
}: {
  users: UserRecord[]
  userDraft: { username: string; displayName: string; role: string; password: string }
  onUserDraftChange: (draft: { username: string; displayName: string; role: string; password: string }) => void
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void
  onPatchUser: (user: UserRecord, patch: UserPatch) => void
}) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingDisplayName, setEditingDisplayName] = useState('')
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null)
  const [editingPassword, setEditingPassword] = useState('')

  return (
    <>
      <form className="panel form-panel" onSubmit={onCreateUser}>
        <p className="kicker">Users</p>
        <h2>Add household user</h2>
        <input value={userDraft.username} onChange={(event) => onUserDraftChange({ ...userDraft, username: event.target.value })} placeholder="username" autoComplete="username" />
        <input value={userDraft.displayName} onChange={(event) => onUserDraftChange({ ...userDraft, displayName: event.target.value })} placeholder="Display name" autoComplete="name" />
        <select value={userDraft.role} onChange={(event) => onUserDraftChange({ ...userDraft, role: event.target.value })}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <input type="password" value={userDraft.password} onChange={(event) => onUserDraftChange({ ...userDraft, password: event.target.value })} placeholder="Temporary password" autoComplete="new-password" />
        <button type="submit">Create user</button>
      </form>

      <article className="panel">
        <p className="kicker">Active accounts</p>
        <h2>Users</h2>
        <div className="stack-list">
          {users.map((user) => (
            <div className={`user-row ${user.active ? '' : 'inactive'}`} key={user.id}>
              {editingUserId === user.id ? (
                <>
                  <input
                    className="inline-edit user-edit-input"
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { onPatchUser(user, { displayName: editingDisplayName }); setEditingUserId(null) }
                      if (e.key === 'Escape') setEditingUserId(null)
                    }}
                  />
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => { onPatchUser(user, { displayName: editingDisplayName }); setEditingUserId(null) }}>Save</button>
                    <button type="button" className="ghost" onClick={() => setEditingUserId(null)}>Cancel</button>
                  </div>
                </>
              ) : editingPasswordUserId === user.id ? (
                <>
                  <input
                    className="inline-edit user-edit-input"
                    type="password"
                    value={editingPassword}
                    onChange={(e) => setEditingPassword(e.target.value)}
                    placeholder="New password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { onPatchUser(user, { password: editingPassword }); setEditingPasswordUserId(null); setEditingPassword('') }
                      if (e.key === 'Escape') { setEditingPasswordUserId(null); setEditingPassword('') }
                    }}
                  />
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => { onPatchUser(user, { password: editingPassword }); setEditingPasswordUserId(null); setEditingPassword('') }}>Save</button>
                    <button type="button" className="ghost" onClick={() => { setEditingPasswordUserId(null); setEditingPassword('') }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="user-meta">
                    <strong>{user.displayName}</strong>
                    <span className="user-subline">
                      <span className="user-username">{user.username}</span>
                      <span className="user-role">
                        {user.role}
                        {user.active ? '' : ' / disabled'}
                        {user.passwordResetRequired ? ' / password change required' : ''}
                      </span>
                    </span>
                  </div>
                  <div className="user-actions">
                    <button type="button" className="ghost" onClick={() => { setEditingUserId(user.id); setEditingDisplayName(user.displayName) }}>Rename</button>
                    <button type="button" className="ghost" onClick={() => { setEditingPasswordUserId(user.id); setEditingPassword('') }}>Change password</button>
                    <button type="button" className="ghost" onClick={() => onPatchUser(user, { passwordResetRequired: true })}>Require password change</button>
                    <button type="button" className="ghost" onClick={() => onPatchUser(user, { active: !user.active })}>{user.active ? 'Disable' : 'Enable'}</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </article>
    </>
  )
}
