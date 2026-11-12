import { routeSuggestions } from "./visitHints"

describe("routeSuggestions", () => {
  it("puts past routes first and skips duplicates", () => {
    expect(routeSuggestions(["Lagos", " london ", "Lagos", null], ["London", "Abuja"])).toEqual([
      "Lagos",
      "london",
      "Abuja",
    ])
  })
})
