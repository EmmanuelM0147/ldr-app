export const CURRENCY_OPTIONS = [
  { code: "NGN", label: "NGN — Nigerian naira" },
  { code: "USD", label: "USD — US dollar" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "EUR", label: "EUR — Euro" },
] as const

export const STARTER_ROUTES = ["Lagos", "Abuja", "London", "Accra"] as const

/** Prefer past couple locations, then starters. Free text stays allowed via datalist. */
export function routeSuggestions(
  past: Array<string | null | undefined>,
  starters: readonly string[] = STARTER_ROUTES,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of [...past, ...starters]) {
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
