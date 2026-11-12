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
    expect(screen.getByText("Closer")).toBeInTheDocument()
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
