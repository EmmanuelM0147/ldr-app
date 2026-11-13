import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PairingStart } from "./PairingStart"

describe("PairingStart", () => {
  it("offers paste and join CTAs on the invite form", async () => {
    const user = userEvent.setup()
    const readText = vi.fn().mockResolvedValue("invite-code-abc")
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText },
    })
    render(
      <PairingStart displayName="Ada" error={null} onCreateSpace={() => undefined} onJoin={() => undefined} />,
    )
    await user.click(screen.getByRole("button", { name: "Paste code" }))
    expect(readText).toHaveBeenCalled()
    expect(screen.getByLabelText("Invite code")).toHaveValue("invite-code-abc")
    expect(screen.getByRole("button", { name: "Join with invite code" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create a space" })).toBeInTheDocument()
  })
})
