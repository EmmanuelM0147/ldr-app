import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PairingStart } from "./PairingStart"

describe("PairingStart", () => {
  it("shows clear create and join paths after signup", async () => {
    const user = userEvent.setup()
    const onCreateSpace = vi.fn()
    const onJoin = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <PairingStart displayName="Ada" error={null} onCreateSpace={onCreateSpace} onJoin={onJoin} />,
    )
    expect(screen.getByText(/Welcome, Ada/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Create a space" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Join with invite code" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Create a space" }))
    expect(onCreateSpace).toHaveBeenCalledOnce()
    await user.type(screen.getByLabelText("Invite code"), "abcd1234")
    await user.click(screen.getByRole("button", { name: "Join with invite code" }))
    expect(onJoin).toHaveBeenCalled()
  })
})
