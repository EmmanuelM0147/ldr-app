import { render, screen } from "@testing-library/react"
import { EmptyState, ErrorState, LoadingState } from "./ScreenState"

describe("ScreenState", () => {
  it("renders loading, empty, and error states", () => {
    const { rerender } = render(<LoadingState label="Opening calendar…" />)
    expect(screen.getByRole("status")).toHaveTextContent("Opening calendar…")
    rerender(<EmptyState title="No visits" body="Plan the next one." />)
    expect(screen.getByLabelText("No visits")).toBeInTheDocument()
    rerender(<ErrorState message="Something broke." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke.")
  })
})
