import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createApiClient } from "./api/apiClient"
import { ApiError } from "./api/errors"
import { createDemoClient, type MockClient } from "./api/mockClient"
import type { Couple, Presence, User } from "./types"

const TOKEN_KEY = "closer-token"
type Client = Omit<MockClient, "database">

type SessionValue = {
  client: Client | null
  user: User | null
  couple: Couple | null
  presence: Presence[]
  liveTick: number
  ready: boolean
  signIn: (token: string, user: User) => Promise<void>
  signOut: () => void
  refreshCouple: () => Promise<void>
  refreshUser: () => Promise<void>
  updatePresence: (freeToTalk: boolean) => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [presence, setPresence] = useState<Presence[]>([])
  const [liveTick, setLiveTick] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (import.meta.env.PROD && import.meta.env.VITE_USE_MOCK !== "1" && !import.meta.env.VITE_API_URL) {
        console.warn(
          "VITE_API_URL was not set at build time; API calls use this page origin and will fail against a static host.",
        )
      }
      const next =
        import.meta.env.VITE_USE_MOCK === "1"
          ? await createDemoClient(window.sessionStorage)
          : createApiClient(import.meta.env.VITE_API_URL || window.location.origin)
      if (cancelled) return
      setClient(next)
      const token = window.sessionStorage.getItem(TOKEN_KEY)
      if (!token) {
        setReady(true)
        return
      }
      next.useToken(token)
      try {
        const me = await next.getMe()
        if (cancelled) return
        setUser(me)
        try {
          setCouple(await next.getCurrentCouple())
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error
        }
      } catch {
        window.sessionStorage.removeItem(TOKEN_KEY)
        next.useToken(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!client || !couple) return
    let ignore = false
    void client.getPresence().then((list) => {
      if (!ignore) setPresence(list.members)
    }).catch(() => {
      if (!ignore) setPresence([])
    })
    const known = new Set(couple.members.map((member) => member.user_id))
    const stop = client.subscribe((event) => {
      if (event.type === "couple_gone") {
        setCouple(null)
        setPresence([])
        return
      }
      if (event.type === "presence") {
        setPresence(event.members)
        if (event.members.some((member) => !known.has(member.user_id))) {
          void client.getCurrentCouple().then(setCouple).catch(() => undefined)
        }
      }
      if (event.type === "check_in") setLiveTick((value) => value + 1)
    })
    return () => {
      ignore = true
      stop()
    }
  }, [client, couple])

  async function signIn(token: string, nextUser: User) {
    if (!client) return
    window.sessionStorage.setItem(TOKEN_KEY, token)
    client.useToken(token)
    setUser(nextUser)
    try {
      setCouple(await client.getCurrentCouple())
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setCouple(null)
      else throw error
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(TOKEN_KEY)
    client?.useToken(null)
    setUser(null)
    setCouple(null)
    setPresence([])
  }

  async function updatePresence(freeToTalk: boolean) {
    if (!client) return
    const list = await client.setPresence(freeToTalk)
    setPresence(list.members)
  }

  async function refreshCouple() {
    if (!client) return
    try {
      setCouple(await client.getCurrentCouple())
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setCouple(null)
      else throw error
    }
  }

  async function refreshUser() {
    if (!client) return
    setUser(await client.getMe())
    await refreshCouple()
  }

  return (
    <SessionContext.Provider
      value={{
        client,
        user,
        couple,
        presence,
        liveTick,
        ready,
        signIn,
        signOut,
        refreshCouple,
        refreshUser,
        updatePresence,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("Session is missing.")
  return value
}
