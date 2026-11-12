import createClient from "openapi-fetch"

import type {
  AuthResponse,
  Budget,
  CheckIn,
  CheckInWrite,
  Countdown,
  Couple,
  CouplePatch,
  DateNightIdea,
  DateNightIdeaRequest,
  EventItem,
  EventWrite,
  InviteCreated,
  LiveEvent,
  Memory,
  MemoryWrite,
  PresenceList,
  User,
  UserPatch,
  Visit,
  VisitWrite,
} from "../types"
import type { RegisterRequest } from "../types"
import { ApiError } from "./errors"
import type { MockClient } from "./mockClient"
import type { paths } from "./schema"

type Api = Omit<MockClient, "database">

type CallResult = {
  data?: unknown
  error?: unknown
  response: Response
}

export function createApiClient(baseUrl = "http://localhost:8000"): Api {
  const api = createClient<paths>({ baseUrl })
  let token: string | null = null

  api.use({
    onRequest({ request }) {
      if (token) request.headers.set("Authorization", `Bearer ${token}`)
      return request
    },
  })

  async function unwrap<T>(pending: Promise<CallResult>): Promise<T> {
    const result = await pending
    if (!result.response.ok) {
      const detail =
        result.error && typeof result.error === "object" && "detail" in result.error
          ? String(result.error.detail)
          : result.response.statusText
      throw new ApiError(result.response.status, detail || "Request failed.")
    }
    return result.data as T
  }

  return {
    useToken(next) {
      token = next
    },

    register(input: RegisterRequest) {
      return unwrap<AuthResponse>(
        api.POST("/auth/register", {
          body: { ...input, timezone: input.timezone?.trim() || "UTC" },
        }),
      )
    },

    login(email, password) {
      return unwrap<AuthResponse>(api.POST("/auth/login", { body: { email, password } }))
    },

    getMe() {
      return unwrap<User>(api.GET("/me"))
    },

    updateMe(input: UserPatch) {
      return unwrap<User>(api.PATCH("/me", { body: input }))
    },

    async uploadMyAvatar(file: File) {
      const form = new FormData()
      form.append("file", file)
      const headers = new Headers()
      if (token) headers.set("Authorization", `Bearer ${token}`)
      const response = await fetch(new URL("/me/avatar", baseUrl), {
        method: "POST",
        headers,
        body: form,
      })
      if (!response.ok) {
        let detail = response.statusText
        try {
          const payload = (await response.json()) as { detail?: string }
          if (payload.detail) detail = payload.detail
        } catch {
          /* keep status text */
        }
        throw new ApiError(response.status, detail || "Request failed.")
      }
      return (await response.json()) as User
    },

    async deleteMyAvatar() {
      return unwrap<User>(api.DELETE("/me/avatar"))
    },

    async getUserAvatar(userId: string) {
      const headers = new Headers()
      if (token) headers.set("Authorization", `Bearer ${token}`)
      const response = await fetch(new URL(`/users/${userId}/avatar`, baseUrl), { headers })
      if (!response.ok) {
        throw new ApiError(response.status, "Not found.")
      }
      return response.blob()
    },

    createCouple() {
      return unwrap<Couple>(api.POST("/couples"))
    },

    getCurrentCouple() {
      return unwrap<Couple>(api.GET("/couples/current"))
    },

    updateCurrentCouple(input: CouplePatch) {
      return unwrap<Couple>(api.PATCH("/couples/current", { body: input }))
    },

    async deleteCurrentCouple() {
      await unwrap(api.DELETE("/couples/current"))
    },

    createInvite() {
      return unwrap<InviteCreated>(api.POST("/couples/current/invites"))
    },

    joinCouple(code) {
      return unwrap<Couple>(api.POST("/couples/join", { body: { code } }))
    },

    listEvents() {
      return unwrap<EventItem[]>(api.GET("/events"))
    },

    createEvent(input: EventWrite) {
      return unwrap<EventItem>(api.POST("/events", { body: input }))
    },

    async deleteEvent(eventId) {
      await unwrap(api.DELETE("/events/{event_id}", { params: { path: { event_id: eventId } } }))
    },

    listVisits() {
      return unwrap<Visit[]>(api.GET("/visits"))
    },

    createVisit(input: VisitWrite) {
      return unwrap<Visit>(api.POST("/visits", { body: input }))
    },

    getNextVisit() {
      return unwrap<Countdown>(api.GET("/visits/next"))
    },

    async deleteVisit(visitId) {
      await unwrap(api.DELETE("/visits/{visit_id}", { params: { path: { visit_id: visitId } } }))
    },

    putBudget(visitId, budget: Budget) {
      return unwrap<Budget>(
        api.PUT("/visits/{visit_id}/budget", {
          params: { path: { visit_id: visitId } },
          body: budget,
        }),
      )
    },

    listCheckIns() {
      return unwrap<CheckIn[]>(api.GET("/check-ins"))
    },

    upsertTodayCheckIn(input: CheckInWrite) {
      return unwrap<CheckIn>(api.PUT("/check-ins/today", { body: input }))
    },

    listMemories() {
      return unwrap<Memory[]>(api.GET("/memories"))
    },

    async createMemory(input: MemoryWrite) {
      if (input.file) {
        const form = new FormData()
        if (input.title) form.append("title", input.title)
        form.append("body", input.body ?? "")
        form.append("file", input.file)
        const headers = new Headers()
        if (token) headers.set("Authorization", `Bearer ${token}`)
        const response = await fetch(new URL("/memories/upload", baseUrl), {
          method: "POST",
          headers,
          body: form,
        })
        if (!response.ok) {
          let detail = response.statusText
          try {
            const payload = (await response.json()) as { detail?: string }
            if (payload.detail) detail = payload.detail
          } catch {
            /* keep status text */
          }
          throw new ApiError(response.status, detail || "Request failed.")
        }
        return (await response.json()) as Memory
      }
      return unwrap<Memory>(api.POST("/memories", { body: { title: input.title, body: input.body } }))
    },

    async getMemoryMedia(memoryId: string) {
      const headers = new Headers()
      if (token) headers.set("Authorization", `Bearer ${token}`)
      const response = await fetch(new URL(`/memories/${memoryId}/media`, baseUrl), { headers })
      if (!response.ok) {
        throw new ApiError(response.status, "Media not found.")
      }
      return response.blob()
    },

    async deleteMemory(memoryId) {
      await unwrap(api.DELETE("/memories/{memory_id}", { params: { path: { memory_id: memoryId } } }))
    },

    getPresence() {
      return unwrap<PresenceList>(api.GET("/presence"))
    },

    setPresence(freeToTalk) {
      return unwrap<PresenceList>(api.PUT("/presence", { body: { free_to_talk: freeToTalk } }))
    },

    createDateNightIdea(input: DateNightIdeaRequest = {}) {
      return unwrap<DateNightIdea>(api.POST("/ideas", { body: input }))
    },

    subscribe(listener) {
      if (!token) return () => undefined
      const url = new URL("/ws", baseUrl)
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
      const socket = new WebSocket(url)
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ token }))
      })
      socket.addEventListener("message", (message) => {
        if (typeof message.data !== "string") return
        listener(JSON.parse(message.data) as LiveEvent)
      })
      return () => socket.close()
    },
  }
}
