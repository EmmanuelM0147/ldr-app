import { useState, type FormEvent } from "react"
import { countdownParts, formatWhen } from "../format"
import type { Budget, CheckIn, CheckInWrite, Countdown, EventWrite, Memory, Mood } from "../types"

const MOODS: Mood[] = ["great", "good", "okay", "low", "rough"]

export function RegisterForm({
  onSubmit,
}: {
  onSubmit: (values: {
    email: string
    password: string
    display_name: string
    timezone: string
  }) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get("password") ?? "")
    const timezone = String(data.get("timezone") ?? "UTC").trim() || "UTC"
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    try {
      Intl.DateTimeFormat("en-US", { timeZone: timezone })
    } catch {
      setError("Enter a valid IANA timezone, such as Africa/Lagos.")
      return
    }
    setError(null)
    await onSubmit({
      email: String(data.get("email") ?? ""),
      password,
      display_name: String(data.get("display_name") ?? ""),
      timezone,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <Field label="Display name" name="display_name" required />
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required />
      <Field label="Timezone" name="timezone" defaultValue="UTC" required />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Create account
      </button>
    </form>
  )
}

export function LoginForm({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    try {
      await onSubmit(String(data.get("email") ?? ""), String(data.get("password") ?? ""))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Sign in
      </button>
    </form>
  )
}

export function EventForm({ onCreate }: { onCreate: (input: EventWrite) => void }) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const starts = localToIso(String(data.get("starts_at") ?? ""))
    const endRaw = String(data.get("ends_at") ?? "")
    const ends = endRaw ? localToIso(endRaw) : null
    if (ends && new Date(ends).getTime() <= new Date(starts).getTime()) {
      setError("End must be after the start.")
      return
    }
    setError(null)
    onCreate({
      title: String(data.get("title") ?? ""),
      starts_at: starts,
      ends_at: ends,
      location: String(data.get("location") ?? ""),
      notes: String(data.get("notes") ?? ""),
    })
    event.currentTarget.reset()
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <Field label="Title" name="title" required />
      <Field label="Starts" name="starts_at" type="datetime-local" required />
      <Field label="Ends" name="ends_at" type="datetime-local" />
      <Field label="Place" name="location" />
      <Field label="Notes" name="notes" />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Add event
      </button>
    </form>
  )
}

export function BudgetForm({
  memberIds,
  onSave,
}: {
  memberIds: [string, string]
  onSave: (budget: Budget) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const total = Math.round(Number(data.get("total")) * 100)
    const first = Math.round(Number(data.get("first")) * 100)
    const second = Math.round(Number(data.get("second")) * 100)
    if (first + second !== total) {
      setError("The two shares must add up to the total.")
      return
    }
    setError(null)
    onSave({
      currency: String(data.get("currency") ?? "USD").toUpperCase(),
      total_minor: total,
      shares: [
        { user_id: memberIds[0], amount_minor: first },
        { user_id: memberIds[1], amount_minor: second },
      ],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <Field label="Currency" name="currency" defaultValue="USD" required />
      <Field label="Total" name="total" type="number" step="0.01" min="0" required />
      <Field label="Your share" name="first" type="number" step="0.01" min="0" required />
      <Field label="Their share" name="second" type="number" step="0.01" min="0" required />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Save split
      </button>
    </form>
  )
}

export function CountdownCard({
  countdown,
  timeZone,
}: {
  countdown: Countdown
  timeZone: string
}) {
  if (!countdown.visit || countdown.seconds_until === null) {
    return (
      <section className="hero">
        <p className="kicker">Next visit</p>
        <h2>No visit planned</h2>
      </section>
    )
  }
  const parts = countdownParts(countdown.seconds_until)
  return (
    <section className="hero">
      <p className="kicker">Next visit</p>
      <p className="countdown-num">{parts.value}</p>
      <p className="countdown-unit">{parts.unit} until you're together</p>
      <h2>{countdown.visit.title}</h2>
      <p className="muted">
        {formatWhen(countdown.visit.starts_at, timeZone)}
        {countdown.visit.location ? ` · ${countdown.visit.location}` : ""}
      </p>
    </section>
  )
}

export function CheckInForm({
  existing,
  onSave,
}: {
  existing: CheckIn | null
  onSave: (input: CheckInWrite) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [mood, setMood] = useState<Mood>(existing?.mood ?? "good")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = String(new FormData(event.currentTarget).get("note") ?? "")
    if (note.trim().length > 280) {
      setError("Notes can be at most 280 characters.")
      return
    }
    setError(null)
    onSave({ mood, note })
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <div className="moods" role="radiogroup" aria-label="Mood">
        {MOODS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={mood === item}
            className={mood === item ? "mood on" : "mood"}
            onClick={() => setMood(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Note</span>
        <textarea name="note" maxLength={320} defaultValue={existing?.note ?? ""} rows={3} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        {existing ? "Update today's check-in" : "Save today's check-in"}
      </button>
    </form>
  )
}

export function MemoryList({
  memories,
  currentUserId,
  onDelete,
}: {
  memories: Memory[]
  currentUserId: string
  onDelete: (id: string) => void
}) {
  if (memories.length === 0) return <p className="muted">Nothing saved yet.</p>
  return (
    <ul className="list">
      {memories.map((memory) => (
        <li key={memory.id} className="card">
          {memory.title ? <h3>{memory.title}</h3> : null}
          <p>{memory.body}</p>
          {memory.author_id === currentUserId ? (
            <button type="button" className="textish" onClick={() => onDelete(memory.id)}>
              Delete memory
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  step,
  min,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  step?: string
  min?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} step={step} min={min} />
    </label>
  )
}

function localToIso(value: string): string {
  return new Date(value).toISOString()
}
