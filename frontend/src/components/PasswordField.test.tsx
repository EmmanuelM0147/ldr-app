import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasswordField } from "./PasswordField"

describe("PasswordField", () => {
  it("reveals and hides the typed password", async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Password" name="password" required />)
    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
    await user.type(input, "secret123")
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveValue("secret123")
    await user.click(screen.getByRole("button", { name: "Hide password" }))
    expect(input).toHaveAttribute("type", "password")
  })
})
