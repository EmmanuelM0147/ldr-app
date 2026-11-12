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
  budget: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

describe("ThisWeekList", () => {
  it("collects events and visits in the next seven days", () => {
    const items = itemsThisWeek([event], [visit], now)
    expect(items.map((item) => item.title)).toEqual(["Call night", "Abuja trip"])
  })

  it("renders the week list", () => {
    render(
      <MemoryRouter>
        <ThisWeekList items={itemsThisWeek([event], [visit], now)} timeZone="UTC" />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { name: "This week" })).toBeInTheDocument()
    expect(screen.getByText("Call night")).toBeInTheDocument()
    expect(screen.getByText("Abuja trip")).toBeInTheDocument()
  })
})
