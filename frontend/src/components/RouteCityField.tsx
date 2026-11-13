export function RouteCityField({
  suggestions,
  defaultFrom = "Lagos",
  defaultTo = "Abuja",
}: {
  suggestions: string[]
  defaultFrom?: string
  defaultTo?: string
}) {
  const fromListId = "route-from-suggestions"
  const toListId = "route-to-suggestions"
  return (
    <div className="route-pair">
      <label className="field">
        <span>From</span>
        <input
          name="location_from"
          list={fromListId}
          defaultValue={defaultFrom}
          placeholder="e.g. Lagos"
          autoComplete="off"
          required
        />
        <datalist id={fromListId}>
          {suggestions.map((place) => (
            <option key={`from-${place}`} value={place} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span>To</span>
        <input
          name="location_to"
          list={toListId}
          defaultValue={defaultTo}
          placeholder="e.g. Abuja"
          autoComplete="off"
          required
        />
        <datalist id={toListId}>
          {suggestions.map((place) => (
            <option key={`to-${place}`} value={place} />
          ))}
        </datalist>
      </label>
    </div>
  )
}
