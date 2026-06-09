import type { Dispatch, FormEvent, SetStateAction } from 'react'

export function AdminUnlockModal({
  unlockDraft,
  setUnlockDraft,
  onUnlock,
  onCancel,
}: {
  unlockDraft: { username: string; password: string }
  setUnlockDraft: Dispatch<SetStateAction<{ username: string; password: string }>>
  onUnlock: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="panel modal-panel" onSubmit={onUnlock}>
        <p className="kicker">Admin unlock</p>
        <h2>Confirm admin credentials</h2>
        <label>Admin username<input value={unlockDraft.username} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, username: event.target.value }))} autoComplete="username" /></label>
        <label>Password<input type="password" value={unlockDraft.password} onChange={(event) => setUnlockDraft((draft) => ({ ...draft, password: event.target.value }))} autoComplete="current-password" autoFocus /></label>
        <div className="button-row">
          <button type="submit">Unlock</button>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
