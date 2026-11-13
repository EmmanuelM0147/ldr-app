import { render, screen } from "@testing-library/react"
import { RouteCityField } from "./RouteCityField"

describe("RouteCityField", () => {
  it("defaults From/To to Lagos and Abuja with shared suggestions", () => {
    render(<RouteCityField suggestions={["Lagos", "Abuja", "London"]} />)
    expect(screen.getByLabelText("From")).toHaveValue("Lagos")
    expect(screen.getByLabelText("To")).toHaveValue("Abuja")
    expect(screen.getByLabelText("From")).toHaveAttribute("list", "route-from-suggestions")
    expect(screen.getByLabelText("To")).toHaveAttribute("list", "route-to-suggestions")
    expect(document.getElementById("route-from-suggestions")?.querySelectorAll("option")).toHaveLength(3)
  })
})
