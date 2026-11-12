import { render, screen } from "@testing-library/react"
import type { Member, Visit } from "../types"
import { VisitCard } from "./VisitCard"

const members: Member[] = [
  { user_id: "ada", display_name: "Ada", timezone: "Africa/Lagos", joined_at: "2026-11-01T00:00:00.000Z" },
  { user_id: "bello", display_name: "Bello", timezone: "Europe/London", joined_at: "2026-11-01T00:00:00.000Z" },
]

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
  budget: {
    currency: "NGN",
    total_minor: 100_000,
    shares: [
      { user_id: "ada", amount_minor: 60_000 },
      { user_id: "bello", amount_minor: 40_000 },
    ],
  },
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
}

describe("VisitCard", () => {
  it("shows route, traveler, countdown chip, and cost split", () => {
    render(<VisitCard visit={visit} members={members} timeZone="UTC" now={new Date("2026-11-12T00:00:00.000Z")} />)
    expect(screen.getByText(/Route · Lagos/)).toBeInTheDocument()
    expect(screen.getByText("Traveler: Ada")).toBeInTheDocument()
    expect(screen.getByText(/days|day/).closest(".chip")).toBeTruthy()
    expect(screen.getByText(/Split/)).toBeInTheDocument()
  })
})
