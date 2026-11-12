import { useState, type FormEvent } from "react"

const CONFIRM_WORD = "DELETE"

export function DeleteSpaceForm({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = typed.trim() === CONFIRM_WORD

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready) {
      setError(`Type ${CONFIRM_WORD} to confirm.`)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onConfirm()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the space.")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="stack">
      <p className="muted">
        This removes the couple space and every shared row. Both accounts stay. Type{" "}
        <strong>{CONFIRM_WORD}</strong> to continue.
      </p>
      <label className="field">
        <span>Confirmation</span>
        <input
          name="confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          aria-label="Type DELETE to confirm"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="primary danger-fill" type="submit" disabled={!ready || busy}>
        Delete this space
      </button>
    </form>
  )
}
