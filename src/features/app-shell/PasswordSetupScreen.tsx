import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Session } from '../../shared/api-types'

type PasswordSetupDraft = { password: string; confirmPassword: string }

export function PasswordSetupScreen({
  session,
  passwordSetupDraft,
  setPasswordSetupDraft,
  onSetOwnPassword,
  onLogout,
  error,
}: {
  session: Session | null
  passwordSetupDraft: PasswordSetupDraft
  setPasswordSetupDraft: Dispatch<SetStateAction<PasswordSetupDraft>>
  onSetOwnPassword: (event: FormEvent<HTMLFormElement>) => void
  onLogout: () => void
  error: string
}) {
  const name = session?.displayName || session?.userName
  return (
    <main className="login-screen">
      <section className="login-panel">
        <p className="kicker">Password setup</p>
        <h1>Set a new password</h1>
        <p>{name ? `Welcome back, ${name}. Your admin has reset this account, so choose a new password to continue.` : 'Choose a new password to continue.'}</p>
        <form onSubmit={onSetOwnPassword}>
          <label>
            New password
            <input
              value={passwordSetupDraft.password}
              onChange={(event) => setPasswordSetupDraft((draft) => ({ ...draft, password: event.target.value }))}
              type="password"
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label>
            Confirm password
            <input
              value={passwordSetupDraft.confirmPassword}
              onChange={(event) => setPasswordSetupDraft((draft) => ({ ...draft, confirmPassword: event.target.value }))}
              type="password"
              autoComplete="new-password"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="button-row">
            <button type="submit">Save password</button>
            <button type="button" className="ghost" onClick={onLogout}>Log out</button>
          </div>
        </form>
      </section>
    </main>
  )
}
