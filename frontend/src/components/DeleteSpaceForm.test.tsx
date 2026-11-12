import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DeleteSpaceForm } from "./DeleteSpaceForm"

describe("DeleteSpaceForm", () => {
  it("keeps delete disabled until DELETE is typed", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<DeleteSpaceForm onConfirm={onConfirm} />)
    const button = screen.getByRole("button", { name: "Delete this space" })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "delete")
    expect(button).toBeDisabled()
    await user.clear(screen.getByLabelText("Type DELETE to confirm"))
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE")
    expect(button).toBeEnabled()
    await user.click(button)
    expect(onConfirm).toHaveBeenCalled()
  })
})
