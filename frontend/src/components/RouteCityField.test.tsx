import { render, screen } from "@testing-library/react"
import { RouteCityField } from "./RouteCityField"

describe("RouteCityField", () => {
  it("wires a datalist of route suggestions", () => {
    render(<RouteCityField suggestions={["Lagos", "Abuja"]} />)
    expect(screen.getByLabelText("Route / city")).toHaveAttribute("list", "route-city-suggestions")
    const list = document.getElementById("route-city-suggestions")
    expect(list?.querySelectorAll("option")).toHaveLength(2)
  })
})
