import type { FormEvent } from "react"

export function PairingStart({
  displayName,
  error,
  onCreateSpace,
  onJoin,
}: {
  displayName: string
  error: string | null
  onCreateSpace: () => void
  onJoin: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <main className="sheet pairing-start">
      <p className="kicker">Welcome, {displayName}</p>
      <h1>Start your couple space</h1>
      <p className="muted lede">
        One private space for the two of you. Create it, or join with the code your partner shared.
      </p>

      <section className="card pairing-choice" aria-labelledby="create-space-title">
        <h2 id="create-space-title">Create a space</h2>
        <p className="muted">You start the space and get an invite code to send them.</p>
        <button className="primary" type="button" onClick={onCreateSpace}>
          Create a space
        </button>
      </section>

      <section className="card pairing-choice" aria-labelledby="join-space-title">
        <h2 id="join-space-title">Join with invite code</h2>
        <p className="muted">Paste the code from your partner to become member two.</p>
        <form onSubmit={onJoin} className="stack">
          <label className="field">
            <span>Invite code</span>
            <input name="code" required minLength={8} autoComplete="off" spellCheck={false} />
          </label>
          <button className="secondary" type="submit">
            Join with invite code
          </button>
        </form>
      </section>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  )
}
