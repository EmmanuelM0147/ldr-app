import { formatDateEnGb, formatDay, formatWhen } from "./format"

describe("en-GB date formatting", () => {
  it("formats a local date as Thu 12 Nov", () => {
    expect(formatDateEnGb("2026-11-12", "UTC")).toBe("Thu 12 Nov")
  })

  it("includes weekday in when and day formatters", () => {
    expect(formatWhen("2026-11-12T10:30:00.000Z", "UTC")).toMatch(/^Thu 12 Nov/)
    expect(formatDay("2026-11-12T10:30:00.000Z", "UTC")).toMatch(/^Thu 12 Nov 2026$/)
  })
})
