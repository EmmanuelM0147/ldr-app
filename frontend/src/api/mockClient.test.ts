import { createMockClient, emptyDatabase } from "./mockClient"

const ada = {
  email: "Ada@Example.com",
  password: "password123",
  display_name: "Ada",
  timezone: "Africa/Lagos",
}

describe("mock client", () => {
  it("rejects a short password and signs in after register", async () => {
    const client = createMockClient()
    await expect(
      client.register({ ...ada, password: "short" }),
    ).rejects.toMatchObject({ status: 422 })

    const auth = await client.register(ada)
    expect(auth.user.email).toBe("ada@example.com")
    expect(auth.expires_in).toBe(3600)

    client.useToken(null)
    const signedIn = await client.login("ada@example.com", ada.password)
    expect(signedIn.user.display_name).toBe("Ada")
  })

  it("resets a password with a forgot-password token", async () => {
    const client = createMockClient()
    await client.register(ada)
    client.useToken(null)
    const unknown = await client.forgotPassword("nobody@example.com")
    expect(unknown.reset_url).toBeNull()
    const forgot = await client.forgotPassword("ada@example.com")
    expect(forgot.detail).toMatch(/registered/i)
    expect(forgot.reset_url).toContain("/reset-password?token=")
    const token = forgot.reset_url!.split("token=")[1]
    await client.resetPassword(token, "password456")
    await expect(client.login("ada@example.com", "password123")).rejects.toMatchObject({ status: 401 })
    await client.login("ada@example.com", "password456")
    await expect(client.resetPassword(token, "password789")).rejects.toMatchObject({ status: 400 })
  })

  it("rejects a reused invite code", async () => {
    const db = emptyDatabase()
    const owner = createMockClient({ db })
    await owner.register(ada)
    await owner.createCouple()
    const invite = await owner.createInvite()

    const partner = createMockClient({ db })
    await partner.register({
      email: "bello@example.com",
      password: "password123",
      display_name: "Bello",
      timezone: "Europe/London",
    })
    await partner.joinCouple(invite.code)

    const outsider = createMockClient({ db })
    await outsider.register({
      email: "chi@example.com",
      password: "password123",
      display_name: "Chi",
      timezone: "UTC",
    })
    await expect(outsider.joinCouple(invite.code)).rejects.toMatchObject({ status: 400 })
  })

  it("emits couple_gone when the space is deleted (FUNC-22)", async () => {
    const db = emptyDatabase()
    const owner = createMockClient({ db })
    await owner.register(ada)
    await owner.createCouple()
    const events: string[] = []
    const stop = owner.subscribe((event) => {
      events.push(event.type)
    })
    await owner.deleteCurrentCouple()
    stop()
    expect(events).toContain("couple_gone")
  })
})
