import { useState, type FormEvent } from "react"
import { timezoneChoices } from "../timezones"
import type { User } from "../types"

export type ProfileValues = {
  display_name: string
  timezone: string
}

export function ProfileSettingsForm({
  user,
  onSave,
}: {
  user: User
  onSave: (values: ProfileValues) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const zones = timezoneChoices(user.timezone)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const display_name = String(data.get("display_name") ?? "").trim()
    const timezone = String(data.get("timezone") ?? "").trim()
    if (!display_name || display_name.length > 40) {
      setError("Display name must be 1 to 40 characters.")
      return
    }
    setError(null)
    setSaved(false)
    try {
      await onSave({ display_name, timezone })
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.")
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="stack">
      <label className="field">
        <span>Email</span>
        <input value={user.email} readOnly disabled />
      </label>
      <label className="field">
        <span>Display name</span>
        <input name="display_name" defaultValue={user.display_name} required maxLength={40} />
      </label>
      <label className="field">
        <span>Timezone</span>
        <select name="timezone" defaultValue={user.timezone}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="muted">Profile saved.</p> : null}
      <button className="primary" type="submit">
        Save profile
      </button>
    </form>
  )
}
