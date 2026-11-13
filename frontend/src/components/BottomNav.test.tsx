import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { BottomNav } from "./BottomNav"

describe("BottomNav", () => {
  it("labels Check-in and keeps the route", () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    )
    const link = screen.getByRole("link", { name: /Check-in/i })
    expect(link).toHaveAttribute("href", "/check-ins")
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument()
  })

  it("does not double-announce icon titles (A11Y-P0-3)", () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link", { name: "Home" })).toHaveAccessibleName("Home")
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAccessibleName("Calendar")
    expect(screen.getByRole("link", { name: "Visits" })).toHaveAccessibleName("Visits")
    expect(screen.getByRole("link", { name: "Check-in" })).toHaveAccessibleName("Check-in")
    expect(screen.getByRole("link", { name: "Memories" })).toHaveAccessibleName("Memories")
  })
})
