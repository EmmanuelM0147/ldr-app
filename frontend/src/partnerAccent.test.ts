import { partnerAccent } from "./partnerAccent"

describe("partnerAccent", () => {
  const members = ["bello-id", "ada-id"]

  it("assigns a stable accent from sorted user ids", () => {
    expect(partnerAccent("ada-id", members)).toBe("partner-a")
    expect(partnerAccent("bello-id", members)).toBe("partner-b")
    expect(partnerAccent("ada-id", ["ada-id", "bello-id"])).toBe("partner-a")
  })

  it("gives opposite accents to the two members", () => {
    const a = partnerAccent("ada-id", members)
    const b = partnerAccent("bello-id", members)
    expect(a).not.toBe(b)
  })
})
