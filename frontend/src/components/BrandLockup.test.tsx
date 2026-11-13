import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { BrandLockup } from "./BrandLockup"

describe("BrandLockup", () => {
  it("renders a clear Closer wordmark", () => {
    render(
      <MemoryRouter>
        <BrandLockup size="auth" />
      </MemoryRouter>,
    )
    expect(screen.getByRole("img", { name: "Closer" })).toBeInTheDocument()
    expect(screen.getByText("Closer")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Closer" })).toHaveClass("brand-lockup--auth")
  })

  it("links home from the header lockup", () => {
    render(
      <MemoryRouter>
        <BrandLockup size="header" to="/" />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link", { name: "Closer home" })).toHaveAttribute("href", "/")
  })
})
