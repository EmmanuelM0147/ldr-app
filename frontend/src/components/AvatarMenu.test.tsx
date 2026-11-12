import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { AvatarMenu } from "./AvatarMenu"

describe("AvatarMenu", () => {
  it("opens Settings and Sign out from the avatar", async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <MemoryRouter>
        <AvatarMenu
          userId="ada"
          name="Ada"
          avatarUrl={null}
          loadAvatar={async () => new Blob()}
          onSignOut={onSignOut}
        />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole("button", { name: "Account menu" }))
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings")
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(onSignOut).toHaveBeenCalled()
  })
})
