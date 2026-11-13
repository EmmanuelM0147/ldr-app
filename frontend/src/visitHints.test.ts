import { citiesFromLocations, composeRouteLocation, routeSuggestions } from "./visitHints"

describe("composeRouteLocation", () => {
  it("joins From and To with an arrow", () => {
    expect(composeRouteLocation("Lagos", "Abuja")).toBe("Lagos → Abuja")
    expect(composeRouteLocation("  London ", " Accra")).toBe("London → Accra")
  })

  it("returns empty when both sides are blank", () => {
    expect(composeRouteLocation("", "  ")).toBe("")
  })
})

describe("citiesFromLocations", () => {
  it("splits arrow routes into city tokens", () => {
    expect(citiesFromLocations(["Lagos → Abuja", "London"])).toEqual(["Lagos", "Abuja", "London"])
  })
})

describe("routeSuggestions", () => {
  it("puts past cities first and skips duplicates", () => {
    expect(routeSuggestions(["Lagos → Abuja", " london ", "Lagos", null], ["London", "Abuja"])).toEqual([
      "Lagos",
      "Abuja",
      "london",
    ])
  })
})
