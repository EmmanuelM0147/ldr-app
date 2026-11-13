import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { Countdown, Visit } from "../types"
import { HomeHero } from "./HomeHero"

const visit: Visit = {
  id: "v1",
  couple_id: "c1",
  created_by: "ada",
  title: "Lagos weekend",
  starts_at: "2099-01-15T10:00:00.000Z",
  ends_at: "2099-01-18T18:00:00.000Z",
  location: "Lagos",
  notes: null,
  traveler_user_id: "ada",
  budget: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

describe("HomeHero", () => {
  it("shows a compact empty state with a plan-visit CTA", () => {
    const { container } = render(
      <MemoryRouter>
        <HomeHero countdown={null} timeZone="UTC" />
      </MemoryRouter>,
    )
    expect(container.querySelector(".home-hero--empty")).not.toBeNull()
    expect(screen.getByRole("heading", { name: "No visit planned yet" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Plan a visit" })).toHaveAttribute("href", "/visits")
  })

  it("shows the countdown when a visit is next", () => {
    const countdown: Countdown = { visit, seconds_until: 86_400 * 3 }
    render(
      <MemoryRouter>
        <HomeHero countdown={countdown} timeZone="UTC" />
      </MemoryRouter>,
    )
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText(/days until you are together/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Lagos weekend" })).toBeInTheDocument()
  })
})
