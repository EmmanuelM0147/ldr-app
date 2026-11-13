export function localDate(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
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
