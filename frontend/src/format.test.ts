import { formatDateEnGb, formatDay, formatWhen, zonedLocalDateTimeToUtc } from "./format"

describe("en-GB date formatting", () => {
  it("formats a local date as Thu 12 Nov", () => {
    expect(formatDateEnGb("2026-11-12", "UTC")).toBe("Thu 12 Nov")
  })

  it("includes weekday in when and day formatters", () => {
    expect(formatWhen("2026-11-12T10:30:00.000Z", "UTC")).toMatch(/^Thu 12 Nov/)
    expect(formatDay("2026-11-12T10:30:00.000Z", "UTC")).toMatch(/^Thu 12 Nov 2026$/)
  })
})

describe("zonedLocalDateTimeToUtc (FUNC-02)", () => {
  it("treats wall time as the profile IANA zone, not the browser zone", () => {
    // Africa/Lagos is UTC+1 year-round: 10:00 local → 09:00Z
    expect(zonedLocalDateTimeToUtc("2026-12-01", "10:00", "Africa/Lagos")).toBe(
      "2026-12-01T09:00:00.000Z",
    )
    expect(zonedLocalDateTimeToUtc("2026-12-01", "10:00", "UTC")).toBe("2026-12-01T10:00:00.000Z")
  })

  it("handles datetime-local style values in the profile zone", () => {
    expect(zonedLocalDateTimeToUtc("2026-07-15", "18:30", "America/New_York")).toBe(
      "2026-07-15T22:30:00.000Z",
    )
  })
})
