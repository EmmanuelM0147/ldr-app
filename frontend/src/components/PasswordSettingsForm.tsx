import { useState, type FormEvent } from "react"

export function PasswordSettingsForm({
  onSave,
}: {
  onSave: (values: { current_password: string; new_password: string }) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const current_password = String(data.get("current_password") ?? "")
    const new_password = String(data.get("new_password") ?? "")
    const confirm = String(data.get("confirm_password") ?? "")
    if (new_password.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }
    if (new_password !== confirm) {
      setError("New passwords do not match.")
      return
    }
    setError(null)
    setSaved(false)
    try {
      await onSave({ current_password, new_password })
      form.reset()
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change password.")
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="stack">
      <label className="field">
        <span>Current password</span>
        <input name="current_password" type="password" required minLength={8} autoComplete="current-password" />
      </label>
      <label className="field">
        <span>New password</span>
        <input name="new_password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Confirm new password</span>
        <input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="muted">Password updated.</p> : null}
      <button className="secondary" type="submit">
        Change password
      </button>
    </form>
  )
}
