import { createApiClient } from "./apiClient"

it("sends the bearer token on a data call", async () => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
    async () => new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } }),
  )
  vi.stubGlobal("fetch", fetchMock)
  const client = createApiClient("http://localhost:8000")
  client.useToken("abc")
  await client.listEvents()
  expect(fetchMock.mock.calls[0][0].headers.get("Authorization")).toBe("Bearer abc")
  vi.unstubAllGlobals()
})
