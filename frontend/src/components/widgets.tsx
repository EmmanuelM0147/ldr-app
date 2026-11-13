import { useEffect, useState, type FormEvent } from "react"
import { ApiError } from "../api/errors"
import { countdownParts, formatWhen, zonedLocalDateTimeToUtc } from "../format"
import { MOOD_CHIPS } from "../mood"
import { detectTimezone, isValidIanaTimezone } from "../timezones"
import type { Budget, CheckIn, CheckInWrite, Countdown, EventWrite, Mood } from "../types"
import { CURRENCY_OPTIONS } from "../visitHints"
import { PasswordField } from "./PasswordField"
import { TimezoneSelect } from "./TimezoneSelect"

type RegisterFieldErrors = {
  email?: string
  password?: string
  display_name?: string
  timezone?: string
}

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
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [timezone, setTimezone] = useState(() => detectTimezone())
  const [passwordValue, setPasswordValue] = useState("")
  const passwordLongEnough = passwordValue.length >= 8

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get("password") ?? "")
    const zone = String(data.get("timezone") ?? timezone).trim() || "UTC"
    const nextFields: RegisterFieldErrors = {}
    if (password.length < 8) {
      nextFields.password = "Password must be at least 8 characters."
    }
    if (!isValidIanaTimezone(zone)) {
      nextFields.timezone = "Enter a valid IANA timezone, such as Africa/Lagos."
    }
    if (Object.keys(nextFields).length > 0) {
      setFieldErrors(nextFields)
      setError(null)
      return
    }
    setFieldErrors({})
    setError(null)
    try {
      await onSubmit({
        email: String(data.get("email") ?? ""),
        password,
        display_name: String(data.get("display_name") ?? ""),
        timezone: zone,
      })
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 409) {
          setFieldErrors({ email: "That email is already registered." })
          return
        }
        if (caught.status === 422 && /password/i.test(caught.detail)) {
          setFieldErrors({ password: caught.detail })
          return
        }
        setError(caught.detail)
        return
      }
      setError(caught instanceof Error ? caught.message : "Could not create the account.")
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="stack" noValidate>
      <Field
        label="Display name"
        name="display_name"
        required
        autoComplete="nickname"
        autoFocus
        error={fieldErrors.display_name}
      />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={fieldErrors.email} />
      <PasswordField
        label="Password"
        name="password"
        required
        autoComplete="new-password"
        minLength={8}
        error={fieldErrors.password}
        onChange={setPasswordValue}
      />
      <ul className="password-rules" aria-live="polite">
        <li className={passwordLongEnough ? "ok" : undefined}>At least 8 characters</li>
      </ul>
      <TimezoneSelect value={timezone} onChange={setTimezone} />
      {fieldErrors.timezone ? (
        <p className="error" role="alert">
          {fieldErrors.timezone}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="primary" type="submit">
        Create account
      </button>
      <p className="muted hint privacy-note">
        We only use your email to sign you in. Your couple space stays private to the two of you.
      </p>
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
      <Field label="Email" name="email" type="email" required autoComplete="email" autoFocus />
      <PasswordField label="Password" name="password" required autoComplete="current-password" />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Sign in
      </button>
    </form>
  )
}

export function EventForm({
  onCreate,
  timeZone,
}: {
  onCreate: (input: EventWrite) => void
  timeZone: string
}) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const starts = zonedLocalDateTimeToUtc(
      String(data.get("starts_date") ?? ""),
      String(data.get("starts_time") ?? ""),
      timeZone,
    )
    const endDate = String(data.get("ends_date") ?? "").trim()
    const endTime = String(data.get("ends_time") ?? "").trim()
    const ends = endDate ? zonedLocalDateTimeToUtc(endDate, endTime || "00:00", timeZone) : null
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
      <fieldset className="date-pair">
        <legend>Starts (en-GB)</legend>
        <Field label="Date" name="starts_date" type="date" required />
        <Field label="Time" name="starts_time" type="time" required defaultValue="09:00" />
      </fieldset>
      <fieldset className="date-pair">
        <legend>Ends (optional)</legend>
        <Field label="Date" name="ends_date" type="date" />
        <Field label="Time" name="ends_time" type="time" />
      </fieldset>
      <p className="muted hint">Times are in {timeZone}. Dates show day/month/year in en-GB.</p>
      <Field label="Place" name="location" />
      <Field label="Notes" name="notes" />
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit">
        Add event
      </button>
    </form>
  )
}

export function budgetFromForm(
  data: FormData,
  memberIds: [string, string],
  { required = false }: { required?: boolean } = {},
): { budget: Budget | null; error: string | null } {
  const currency = String(data.get("currency") ?? "").trim().toUpperCase()
  const totalRaw = String(data.get("total") ?? "").trim()
  const firstRaw = String(data.get("first") ?? "").trim()
  const secondRaw = String(data.get("second") ?? "").trim()
  const amountsBlank = !totalRaw && !firstRaw && !secondRaw
  if (amountsBlank) {
    return required
      ? { budget: null, error: "Enter the total and both shares." }
      : { budget: null, error: null }
  }
  if (!totalRaw || !firstRaw || !secondRaw) {
    return { budget: null, error: "Enter the total and both shares." }
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { budget: null, error: "Currency must be a 3-letter code." }
  }
  const total = Math.round(Number(totalRaw) * 100)
  const first = Math.round(Number(firstRaw) * 100)
  const second = Math.round(Number(secondRaw) * 100)
  if ([total, first, second].some((value) => Number.isNaN(value) || value < 0)) {
    return { budget: null, error: "Amounts cannot be negative." }
  }
  if (first + second !== total) {
    return { budget: null, error: "Your share plus their share must equal the total." }
  }
  return {
    budget: {
      currency,
      total_minor: total,
      shares: [
        { user_id: memberIds[0], amount_minor: first },
        { user_id: memberIds[1], amount_minor: second },
      ],
    },
    error: null,
  }
}

export function BudgetFields({ defaultCurrency = "NGN" }: { defaultCurrency?: string } = {}) {
  return (
    <>
      <label className="field">
        <span>Currency</span>
        <select name="currency" defaultValue={defaultCurrency}>
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Field label="Total" name="total" type="number" step="0.01" min="0" />
      <Field label="Your share" name="first" type="number" step="0.01" min="0" />
      <Field label="Their share" name="second" type="number" step="0.01" min="0" />
    </>
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
    const parsed = budgetFromForm(new FormData(event.currentTarget), memberIds, { required: true })
    if (parsed.error || !parsed.budget) {
      setError(parsed.error ?? "Enter the total and both shares.")
      return
    }
    setError(null)
    onSave(parsed.budget)
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      <BudgetFields />
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
  const [mood, setMood] = useState<Mood | null>(existing?.mood ?? null)

  useEffect(() => {
    setMood(existing?.mood ?? null)
    setError(null)
  }, [existing?.id, existing?.mood])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mood) {
      setError("Pick a mood first.")
      return
    }
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
        {MOOD_CHIPS.map((item) => (
          <button
            key={item.mood}
            type="button"
            role="radio"
            aria-checked={mood === item.mood}
            className={mood === item.mood ? "mood on" : "mood"}
            onClick={() => setMood(item.mood)}
          >
            <span aria-hidden>{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <label className="field">
        <span>Note</span>
        <textarea name="note" maxLength={320} defaultValue={existing?.note ?? ""} rows={3} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="primary" type="submit" disabled={!mood}>
        {existing ? "Update today's check-in" : "Save today's check-in"}
      </button>
    </form>
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
  autoComplete,
  error,
  autoFocus,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  step?: string
  min?: string
  autoComplete?: string
  error?: string
  autoFocus?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        min={min}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  )
}
