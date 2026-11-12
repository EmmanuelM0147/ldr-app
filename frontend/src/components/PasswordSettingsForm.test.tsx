import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasswordSettingsForm } from "./PasswordSettingsForm"

describe("PasswordSettingsForm", () => {
  it("requires matching new passwords", async () => {
    const events = userEvent.setup()
    const onSave = vi.fn()
    render(<PasswordSettingsForm onSave={onSave} />)
    await events.type(screen.getByLabelText("Current password"), "password123")
    await events.type(screen.getByLabelText("New password"), "password456")
    await events.type(screen.getByLabelText("Confirm new password"), "password999")
    await events.click(screen.getByRole("button", { name: "Change password" }))
    expect(screen.getByText("New passwords do not match.")).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
