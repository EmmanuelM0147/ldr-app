import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Member } from "../types"
import { PartnerHomeCards } from "./PartnerHomeCards"

const members: Member[] = [
  {
    user_id: "ada",
    display_name: "Ada",
    timezone: "Africa/Lagos",
    joined_at: "2026-11-01T00:00:00.000Z",
    avatar_url: null,
  },
  {
    user_id: "bello",
    display_name: "Bello",
    timezone: "Europe/London",
    joined_at: "2026-11-01T00:00:00.000Z",
    avatar_url: null,
  },
]

describe("PartnerHomeCards", () => {
  it("shows city, status, mood, and toggles presence for the viewer", async () => {
    const user = userEvent.setup()
    const onTogglePresence = vi.fn()
    render(
      <PartnerHomeCards
        members={members}
        presence={[
          { user_id: "ada", free_to_talk: false, updated_at: "2026-11-12T10:00:00.000Z" },
          { user_id: "bello", free_to_talk: true, updated_at: "2026-11-12T10:00:00.000Z" },
        ]}
        checkIns={[
          {
            id: "c1",
            couple_id: "couple",
            user_id: "bello",
            local_date: "2026-11-12",
            mood: "good",
            note: null,
            created_at: "2026-11-12T08:00:00.000Z",
            updated_at: "2026-11-12T08:00:00.000Z",
          },
        ]}
        viewerId="ada"
        onTogglePresence={onTogglePresence}
      />,
    )
    expect(screen.getByText("Lagos")).toBeInTheDocument()
    expect(screen.getByText("London")).toBeInTheDocument()
    expect(screen.getByText("Latest mood: good")).toBeInTheDocument()
    expect(screen.getByText("Free to talk")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "I'm free" }))
    expect(onTogglePresence).toHaveBeenCalledWith(true)
  })
})
