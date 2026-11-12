import { checkInStreak } from "./mood"

describe("checkInStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(checkInStreak(["2026-11-10", "2026-11-11", "2026-11-12"], "2026-11-12")).toBe(3)
  })

  it("is zero when today is missing", () => {
    expect(checkInStreak(["2026-11-10", "2026-11-11"], "2026-11-12")).toBe(0)
  })
})
