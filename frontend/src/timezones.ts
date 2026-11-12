/** Common IANA zones for Closer settings. Free text still validated on the API. */
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

export function timezoneChoices(current: string): string[] {
  const set = new Set<string>(TIMEZONE_OPTIONS)
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b))
}
