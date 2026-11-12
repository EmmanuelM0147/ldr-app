import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { EventItem } from "../types"
import { eventsByDay, MonthCalendar, monthLabel } from "./MonthCalendar"

const event: EventItem = {
  id: "e1",
  couple_id: "c1",
  created_by: "ada",
  title: "Dinner",
  starts_at: "2026-11-15T18:00:00.000Z",
  ends_at: null,
  location: null,
  notes: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

describe("MonthCalendar", () => {
  it("labels the month in en-GB and marks days with events", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const byDay = eventsByDay([event], "UTC")
    render(
      <MonthCalendar
        year={2026}
        monthIndex={10}
        selectedKey="2026-11-12"
        markedKeys={new Set(byDay.keys())}
        onSelect={onSelect}
        onPrev={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(screen.getByRole("heading", { name: monthLabel(2026, 10) })).toBeInTheDocument()
    expect(screen.getByText("November 2026")).toBeInTheDocument()
    const marked = screen.getByRole("gridcell", { name: "15" })
    expect(marked.className).toContain("marked")
    await user.click(marked)
    expect(onSelect).toHaveBeenCalledWith("2026-11-15")
  })
})
