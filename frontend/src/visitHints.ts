export const CURRENCY_OPTIONS = [
  { code: "NGN", label: "NGN: Nigerian naira" },
  { code: "USD", label: "USD: US dollar" },
  { code: "GBP", label: "GBP: British pound" },
  { code: "EUR", label: "EUR: Euro" },
] as const

export const STARTER_ROUTES = ["Lagos", "Abuja", "London", "Accra"] as const

/** Compose From/To into the single location string stored on visits. */
export function composeRouteLocation(from: string, to: string): string {
  const start = from.trim()
  const end = to.trim()
  if (!start && !end) return ""
  if (!start) return end
  if (!end) return start
  return `${start} → ${end}`
}

/** Split past "A → B" (or plain city) strings into city suggestion tokens. */
export function citiesFromLocations(past: Array<string | null | undefined>): string[] {
  const cities: string[] = []
  for (const value of past) {
    if (!value) continue
    const parts = value.split(/\s*→\s*|\s+to\s+/i)
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed) cities.push(trimmed)
    }
  }
  return cities
}

/** Prefer past couple locations, then starters. Free text stays allowed via datalist. */
export function routeSuggestions(
  past: Array<string | null | undefined>,
  starters: readonly string[] = STARTER_ROUTES,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of [...citiesFromLocations(past), ...starters]) {
    if (!value) continue
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}
