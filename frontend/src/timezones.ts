/** Fallback IANA zones when `Intl.supportedValuesOf` is unavailable. */
export const TIMEZONE_OPTIONS = [
  "UTC",
  "Africa/Lagos",
  "Africa/Abidjan",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
] as const

export function isValidIanaTimezone(zone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** Browser-reported IANA zone, or UTC if missing/invalid. */
export function detectTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim()
    if (zone && isValidIanaTimezone(zone)) return zone
  } catch {
    /* ignore */
  }
  return "UTC"
}

export function listIanaTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  if (typeof intl.supportedValuesOf === "function") {
    return intl.supportedValuesOf("timeZone")
  }
  return [...TIMEZONE_OPTIONS]
}

export function timezoneChoices(current: string): string[] {
  const set = new Set<string>(listIanaTimezones())
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function filterTimezones(zones: string[], query: string, alwaysInclude?: string): string[] {
  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? zones.filter((zone) => zone.toLowerCase().includes(needle))
    : zones
  if (alwaysInclude && !filtered.includes(alwaysInclude)) {
    return [alwaysInclude, ...filtered]
  }
  return filtered
}
