import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createApiClient } from "./api/apiClient"
import { ApiError } from "./api/errors"
import { createDemoClient, type MockClient } from "./api/mockClient"
import type { AppNotification, Couple, Presence, User } from "./types"

const TOKEN_KEY = "closer-token"
type Client = Omit<MockClient, "database">

type SessionValue = {
  client: Client | null
  user: User | null
  couple: Couple | null
  presence: Presence[]
  notifications: AppNotification[]
  unreadCount: number
  liveTick: number
  partnerJoinedNotice: string | null
  ready: boolean
  signIn: (token: string, user: User) => Promise<void>
  signOut: () => void
  refreshCouple: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshNotifications: () => Promise<void>
  updatePresence: (freeToTalk: boolean) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  clearPartnerJoinedNotice: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [presence, setPresence] = useState<Presence[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [liveTick, setLiveTick] = useState(0)
  const [partnerJoinedNotice, setPartnerJoinedNotice] = useState<string | null>(null)
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
    if (!client || !couple) {
      setNotifications([])
      return
    }
    let ignore = false
    void client.listNotifications().then((rows) => {
      if (!ignore) setNotifications(rows)
    }).catch(() => {
      if (!ignore) setNotifications([])
    })
    void client.getPresence().then((list) => {
      if (!ignore) setPresence(list.members)
    }).catch(() => {
      if (!ignore) setPresence([])
    })
    const known = new Set(couple.members.map((member) => member.user_id))
    const viewerId = user?.id
    const stop = client.subscribe((event) => {
      if (event.type === "couple_gone") {
        setCouple(null)
        setPresence([])
        setNotifications([])
        setPartnerJoinedNotice(null)
        return
      }
      if (event.type === "partner_joined") {
        setCouple(event.couple)
        const joiner = event.couple.members.find((member) => member.user_id !== viewerId)
        setPartnerJoinedNotice(
          joiner ? `${joiner.display_name} joined your space.` : "Your partner joined your space.",
        )
        void client.getPresence().then((list) => {
          if (!ignore) setPresence(list.members)
        }).catch(() => undefined)
        setLiveTick((value) => value + 1)
        return
      }
      if (event.type === "notification") {
        if (event.notification.recipient_user_id === viewerId) {
          setNotifications((current) => {
            if (current.some((item) => item.id === event.notification.id)) return current
            return [event.notification, ...current]
          })
        }
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
  }, [client, couple, user?.id])

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
    setNotifications([])
    setPartnerJoinedNotice(null)
  }

  function clearPartnerJoinedNotice() {
    setPartnerJoinedNotice(null)
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

  async function refreshNotifications() {
    if (!client || !couple) return
    setNotifications(await client.listNotifications())
  }

  async function markNotificationRead(id: string) {
    if (!client) return
    const updated = await client.markNotificationRead(id)
    setNotifications((current) => current.map((item) => (item.id === id ? updated : item)))
  }

  async function markAllNotificationsRead() {
    if (!client) return
    await client.markAllNotificationsRead()
    const stamp = new Date().toISOString()
    setNotifications((current) =>
      current.map((item) => (item.read_at ? item : { ...item, read_at: stamp })),
    )
  }

  const unreadCount = notifications.filter((item) => item.read_at === null).length

  return (
    <SessionContext.Provider
      value={{
        client,
        user,
        couple,
        presence,
        notifications,
        unreadCount,
        liveTick,
        partnerJoinedNotice,
        ready,
        signIn,
        signOut,
        refreshCouple,
        refreshUser,
        refreshNotifications,
        updatePresence,
        markNotificationRead,
        markAllNotificationsRead,
        clearPartnerJoinedNotice,
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
