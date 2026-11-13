import { useId, useState } from "react"
import { IconEye, IconEyeOff } from "./icons"

export function PasswordField({
  label,
  name,
  required = false,
  minLength,
  autoComplete,
  onChange,
  error,
}: {
  label: string
  name: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  onChange?: (value: string) => void
  error?: string
}) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  const errorId = useId()
  const toggleLabel = visible ? "Hide password" : "Show password"

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-field">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={toggleLabel}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
