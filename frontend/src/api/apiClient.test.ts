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

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  readonly url: string
  readyState = 0
  private listeners = new Map<string, Set<(event: { data?: string }) => void>>()

  constructor(url: string | URL) {
    this.url = String(url)
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, handler: (event: { data?: string }) => void) {
    const set = this.listeners.get(type) ?? new Set()
    set.add(handler)
    this.listeners.set(type, set)
  }

  send(_data: string) {
    /* no-op */
  }

  close() {
    this.readyState = 3
    this.emit("close")
  }

  open() {
    this.readyState = 1
    this.emit("open")
  }

  emit(type: string, event: { data?: string } = {}) {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }
}

it("reconnects the live socket after a network close (FUNC-16)", () => {
  vi.useFakeTimers()
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket)

  const client = createApiClient("http://localhost:8000")
  client.useToken("abc")
  const stop = client.subscribe(() => undefined)
  expect(FakeWebSocket.instances).toHaveLength(1)
  FakeWebSocket.instances[0].open()
  FakeWebSocket.instances[0].close()

  vi.advanceTimersByTime(1000)
  expect(FakeWebSocket.instances).toHaveLength(2)
  FakeWebSocket.instances[1].open()

  stop()
  FakeWebSocket.instances[1].close()
  vi.advanceTimersByTime(60_000)
  expect(FakeWebSocket.instances).toHaveLength(2)

  vi.useRealTimers()
  vi.unstubAllGlobals()
})
