import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { EventItem, Visit } from "../types"
import { itemsThisWeek, ThisWeekList } from "./ThisWeekList"

const now = new Date("2026-11-12T12:00:00.000Z")

const event: EventItem = {
  id: "e1",
  couple_id: "c1",
  created_by: "ada",
  title: "Call night",
  starts_at: "2026-11-14T19:00:00.000Z",
  ends_at: null,
  location: null,
  notes: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

const visit: Visit = {
  id: "v1",
  couple_id: "c1",
  created_by: "ada",
  title: "Abuja trip",
  starts_at: "2026-11-16T09:00:00.000Z",
  ends_at: "2026-11-18T18:00:00.000Z",
  location: "Abuja",
  notes: null,
  traveler_user_id: null,
  budget: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

describe("ThisWeekList", () => {
  it("collects events and visits in the next seven days", () => {
    const items = itemsThisWeek([event], [visit], "UTC", now)
    expect(items.map((item) => item.title)).toEqual(["Call night", "Abuja trip"])
  })

  it("windows the week in the profile IANA timezone (FUNC-03)", () => {
    // 23:30 UTC on 12 Nov is still 18:30 in America/New_York. Profile week starts at
    // NY midnight (05:00Z), so 03:00Z is the previous calendar day there.
    const evening = new Date("2026-11-12T23:30:00.000Z")
    const tooEarlyNy: EventItem = {
      ...event,
      id: "early",
      title: "Too early in NY",
      starts_at: "2026-11-12T03:00:00.000Z",
    }
    const inNyWeek = itemsThisWeek([tooEarlyNy, event], [], "America/New_York", evening)
    expect(inNyWeek.map((item) => item.title)).toEqual(["Call night"])

    const inUtcWeek = itemsThisWeek([tooEarlyNy, event], [], "UTC", evening)
    expect(inUtcWeek.map((item) => item.title)).toEqual(["Too early in NY", "Call night"])
  })

  it("renders the week list", () => {
    render(
      <MemoryRouter>
        <ThisWeekList items={itemsThisWeek([event], [visit], "UTC", now)} timeZone="UTC" />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { name: "This week" })).toBeInTheDocument()
    expect(screen.getByText("Call night")).toBeInTheDocument()
    expect(screen.getByText("Abuja trip")).toBeInTheDocument()
  })
})
