import { useMemo, useState } from "react"
import { detectTimezone, filterTimezones, listIanaTimezones } from "../timezones"

export function TimezoneSelect({
  name = "timezone",
  value,
  onChange,
}: {
  name?: string
  value: string
  onChange: (zone: string) => void
}) {
  const [query, setQuery] = useState("")
  const detected = useMemo(() => detectTimezone(), [])
  const options = useMemo(
    () => filterTimezones(listIanaTimezones(), query, value),
    [query, value],
  )

  return (
    <div className="field">
      <span id={`${name}-label`}>Timezone</span>
      <p className="muted hint" id={`${name}-detected`}>
        Detected: {detected}
      </p>
      <label className="sr-only" htmlFor={`${name}-search`}>
        Search timezones
      </label>
      <input
        id={`${name}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search cities or regions"
        autoComplete="off"
        aria-describedby={`${name}-detected`}
      />
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-labelledby={`${name}-label`}
      >
        {options.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    </div>
  )
}
