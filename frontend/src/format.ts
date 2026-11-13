export function localDate(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function wallPartsInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)
  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  )
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

/**
 * Convert a civil date+time in an IANA zone to a UTC ISO string.
 * Does not use the browser's local timezone.
 */
export function zonedLocalDateTimeToUtc(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number)
  const [hour = 0, minute = 0, second = 0] = time.split(":").map(Number)
  const wantAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  let utcMs = wantAsUtc
  for (let i = 0; i < 3; i += 1) {
    const got = wallPartsInZone(new Date(utcMs), timeZone)
    const gotAsUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second)
    utcMs += wantAsUtc - gotAsUtc
  }
  return new Date(utcMs).toISOString()
}

/** Parse `<input type="datetime-local">` values in the profile IANA zone. */
export function zonedDateTimeLocalToUtc(value: string, timeZone: string): string {
  const [date, time = "00:00"] = value.split("T")
  return zonedLocalDateTimeToUtc(date, time, timeZone)
}

function enGbParts(
  value: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).formatToParts(value)
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]))
}

/** Visible calendar date: Thu 12 Nov */
export function formatDateEnGb(isoOrLocalDate: string, timeZone: string): string {
  const value = new Date(isoOrLocalDate.includes("T") ? isoOrLocalDate : `${isoOrLocalDate}T12:00:00`)
  const parts = enGbParts(value, timeZone, { weekday: "short", day: "numeric", month: "short" })
  return `${parts.weekday} ${parts.day} ${parts.month}`
}

export function formatWhen(iso: string, timeZone: string): string {
  const parts = enGbParts(new Date(iso), timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}`
}

export function formatDay(iso: string, timeZone: string): string {
  const parts = enGbParts(new Date(iso), timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(minor / 100)
}

export function countdownParts(seconds: number): { value: string; unit: string } {
  if (seconds >= 86_400) {
    const days = Math.floor(seconds / 86_400)
    return { value: String(days), unit: days === 1 ? "day" : "days" }
  }
  if (seconds >= 3_600) {
    const hours = Math.floor(seconds / 3_600)
    return { value: String(hours), unit: hours === 1 ? "hour" : "hours" }
  }
  const minutes = Math.max(1, Math.floor(seconds / 60))
  return { value: String(minutes), unit: minutes === 1 ? "minute" : "minutes" }
}

/** Replace en/em dashes with ASCII hyphens for model-generated display text. */
export function sanitizeDisplayText(value: string): string {
  return value.replace(/[\u2013\u2014]/g, "-")
}
