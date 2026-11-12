import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "../types"
import { ProfileSettingsForm } from "./ProfileSettingsForm"

const user: User = {
  id: "ada",
  email: "ada@example.com",
  display_name: "Ada",
  timezone: "UTC",
  created_at: "2026-11-01T00:00:00.000Z",
  avatar_url: null,
}

describe("ProfileSettingsForm", () => {
  it("saves display name and timezone", async () => {
    const events = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ProfileSettingsForm user={user} onSave={onSave} />)
    await events.clear(screen.getByLabelText("Display name"))
    await events.type(screen.getByLabelText("Display name"), "Ada Love")
    await events.selectOptions(screen.getByLabelText("Timezone"), "Africa/Lagos")
    await events.click(screen.getByRole("button", { name: "Save profile" }))
    expect(onSave).toHaveBeenCalledWith({ display_name: "Ada Love", timezone: "Africa/Lagos" })
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument()
  })
})
