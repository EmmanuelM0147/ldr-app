import { Link } from "react-router-dom"
import { formatWhen, localDate, zonedLocalDateTimeToUtc } from "../format"
import type { EventItem, Visit } from "../types"

export type WeekItem = {
  id: string
  kind: "event" | "visit"
  title: string
  starts_at: string
  location: string | null
}

function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return utc.toISOString().slice(0, 10)
}

/** Next 7 local calendar days in the profile IANA zone (not the device zone). */
export function itemsThisWeek(
  events: EventItem[],
  visits: Visit[],
  timeZone: string,
  now = new Date(),
): WeekItem[] {
  const today = localDate(timeZone, now)
  const startMs = new Date(zonedLocalDateTimeToUtc(today, "00:00", timeZone)).getTime()
  const endMs = new Date(
    zonedLocalDateTimeToUtc(addCalendarDays(today, 7), "00:00", timeZone),
  ).getTime()

  const fromEvents: WeekItem[] = events
    .filter((event) => {
      const t = new Date(event.starts_at).getTime()
      return t >= startMs && t < endMs
    })
    .map((event) => ({
      id: event.id,
      kind: "event" as const,
      title: event.title,
      starts_at: event.starts_at,
      location: event.location,
    }))

  const fromVisits: WeekItem[] = visits
    .filter((visit) => {
      const t = new Date(visit.starts_at).getTime()
      return t >= startMs && t < endMs
    })
    .map((visit) => ({
      id: visit.id,
      kind: "visit" as const,
      title: visit.title,
      starts_at: visit.starts_at,
      location: visit.location,
    }))

  return [...fromEvents, ...fromVisits].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  )
}

export function ThisWeekList({ items, timeZone }: { items: WeekItem[]; timeZone: string }) {
  return (
    <section className="card" aria-label="This week">
      <h2>This week</h2>
      {items.length === 0 ? (
        <p className="muted">Nothing shared this week yet.</p>
      ) : (
        <ul className="list compact">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <p className="kicker">{item.kind === "visit" ? "Visit" : "Event"}</p>
              <strong>{item.title}</strong>
              <p className="muted">
                {formatWhen(item.starts_at, timeZone)}
                {item.location ? ` · ${item.location}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to="/calendar">Open the calendar</Link>
      </p>
    </section>
  )
}
