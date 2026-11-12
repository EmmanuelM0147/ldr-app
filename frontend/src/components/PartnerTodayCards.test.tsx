import { render, screen } from "@testing-library/react"
import type { CheckIn, Member } from "../types"
import { PartnerTodayCards } from "./PartnerTodayCards"

const members: Member[] = [
  { user_id: "ada", display_name: "Ada", timezone: "Africa/Lagos", joined_at: "2026-11-01T00:00:00.000Z" },
  { user_id: "bello", display_name: "Bello", timezone: "Europe/London", joined_at: "2026-11-01T00:00:00.000Z" },
]

describe("PartnerTodayCards", () => {
  it("shows both partners for today", () => {
    const items: CheckIn[] = [
      {
        id: "1",
        couple_id: "c",
        user_id: "ada",
        local_date: "2026-11-12",
        mood: "great",
        note: "Counted the days",
        created_at: "2026-11-12T08:00:00.000Z",
        updated_at: "2026-11-12T08:00:00.000Z",
      },
    ]
    render(<PartnerTodayCards members={members} items={items} today="2026-11-12" />)
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("🌟 Great")).toBeInTheDocument()
    expect(screen.getByText("Bello")).toBeInTheDocument()
    expect(screen.getByText("No check-in yet today.")).toBeInTheDocument()
  })
})
