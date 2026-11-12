export function RouteCityField({ suggestions }: { suggestions: string[] }) {
  const listId = "route-city-suggestions"
  return (
    <label className="field">
      <span>Route / city</span>
      <input name="location" list={listId} placeholder="e.g. Lagos" autoComplete="off" />
      <datalist id={listId}>
        {suggestions.map((place) => (
          <option key={place} value={place} />
        ))}
      </datalist>
    </label>
  )
}
