import { useId, useState } from "react"
import { IconEye, IconEyeOff } from "./icons"

export function PasswordField({
  label,
  name,
  required = false,
  minLength,
  autoComplete,
}: {
  label: string
  name: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  const toggleLabel = visible ? "Hide password" : "Show password"

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <div className="password-field">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
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
    </label>
  )
}
