import type { Dispatch, FormEvent, SetStateAction } from 'react'

type LoginDraft = { username: string; password: string; displayName: string; setupToken: string }

export function LoginScreen({
  setupNeeded,
  loginDraft,
  setLoginDraft,
  onLogin,
  error,
}: {
  setupNeeded: boolean
  loginDraft: LoginDraft
  setLoginDraft: Dispatch<SetStateAction<LoginDraft>>
  onLogin: (event: FormEvent<HTMLFormElement>) => void
  error: string
}) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <p className="kicker">{setupNeeded ? 'First run setup' : 'Private home hub'}</p>
        <h1>Frog & Peach</h1>
        <p>{setupNeeded ? 'Create the first administrator account. After this, household members can sign in with their own accounts.' : 'Sign in with your household account. If your admin has reset your password, use the temporary password they set for you.'}</p>
        <form onSubmit={onLogin}>
          <label>
            Username
            <input value={loginDraft.username} onChange={(event) => setLoginDraft((draft) => ({ ...draft, username: event.target.value }))} autoComplete="username" />
          </label>
          {setupNeeded && (
            <label>
              Display name
              <input value={loginDraft.displayName} onChange={(event) => setLoginDraft((draft) => ({ ...draft, displayName: event.target.value }))} autoComplete="name" />
            </label>
          )}
          {setupNeeded && (
            <label>
              Setup token
              <input value={loginDraft.setupToken} onChange={(event) => setLoginDraft((draft) => ({ ...draft, setupToken: event.target.value }))} type="password" autoComplete="one-time-code" />
            </label>
          )}
          <label>
            Password
            <input value={loginDraft.password} onChange={(event) => setLoginDraft((draft) => ({ ...draft, password: event.target.value }))} type="password" autoComplete={setupNeeded ? 'new-password' : 'current-password'} />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit">{setupNeeded ? 'Create admin' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
