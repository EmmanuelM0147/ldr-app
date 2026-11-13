import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BottomSheet } from "./BottomSheet"

describe("BottomSheet (A11Y-P0-2)", () => {
  it("moves focus into the dialog when opened", () => {
    render(
      <BottomSheet open title="Add event" onClose={() => undefined}>
        <button type="button">Save</button>
      </BottomSheet>,
    )
    const dialog = screen.getByRole("dialog", { name: "Add event" })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it("traps Tab focus inside the dialog", async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Outside</button>
        <BottomSheet open title="Add event" onClose={() => undefined}>
          <button type="button">First</button>
          <button type="button">Last</button>
        </BottomSheet>
      </>,
    )
    const close = screen.getByRole("button", { name: "Close" })
    const first = screen.getByRole("button", { name: "First" })
    const last = screen.getByRole("button", { name: "Last" })

    close.focus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab()
    expect(first).toHaveFocus()
  })
})
