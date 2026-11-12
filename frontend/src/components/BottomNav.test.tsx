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
})
