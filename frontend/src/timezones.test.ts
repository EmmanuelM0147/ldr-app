import { detectTimezone, filterTimezones, isValidIanaTimezone, listIanaTimezones } from "./timezones"

describe("timezones", () => {
  it("detects a valid IANA zone from Intl", () => {
    const zone = detectTimezone()
    expect(isValidIanaTimezone(zone)).toBe(true)
  })

  it("lists IANA zones and can filter them", () => {
    const zones = listIanaTimezones()
    expect(zones.length).toBeGreaterThan(10)
    expect(filterTimezones(zones, "lagos")).toEqual(expect.arrayContaining(["Africa/Lagos"]))
    expect(filterTimezones(["UTC", "Europe/London"], "xyz", "UTC")).toEqual(["UTC"])
  })
})
