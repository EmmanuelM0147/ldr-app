import type { PartnerAccent } from "../partnerAccent"
import type { EventItem } from "../types"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function monthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  )
}

export function dayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function eventsByDay(events: EventItem[], timeZone: string): Map<string, EventItem[]> {
  const map = new Map<string, EventItem[]>()
  for (const event of events) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(event.starts_at))
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }
  return map
}

export function MonthCalendar({
  year,
  monthIndex,
  selectedKey,
  markedKeys,
  dayAccents,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number
  monthIndex: number
  selectedKey: string
  markedKeys: Set<string>
  dayAccents?: Map<string, PartnerAccent[]>
  onSelect: (key: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  const first = new Date(year, monthIndex, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: Array<{ key: string; day: number | null }> = []
  for (let i = 0; i < startPad; i += 1) cells.push({ key: `pad-${i}`, day: null })
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: dayKey(year, monthIndex, day), day })
  }

  return (
    <section className="month-cal" aria-label="Month calendar">
      <div className="month-cal-head">
        <button className="secondary" type="button" onClick={onPrev} aria-label="Previous month">
          ‹
        </button>
        <h2>{monthLabel(year, monthIndex)}</h2>
        <button className="secondary" type="button" onClick={onNext} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="month-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="month-grid" role="grid" aria-label={monthLabel(year, monthIndex)}>
        {cells.map((cell) =>
          cell.day === null ? (
            <span key={cell.key} className="month-cell empty" />
          ) : (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              className={[
                "month-cell",
                markedKeys.has(cell.key) ? "marked" : "",
                selectedKey === cell.key ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={selectedKey === cell.key}
              onClick={() => onSelect(cell.key)}
            >
              <span>{cell.day}</span>
              {markedKeys.has(cell.key) ? (
                <span className="month-dots" aria-hidden>
                  {(dayAccents?.get(cell.key) ?? ["partner-a"]).map((accent) => (
                    <i key={accent} className={`month-dot ${accent}`} />
                  ))}
                </span>
              ) : null}
            </button>
          ),
        )}
      </div>
    </section>
  )
}
