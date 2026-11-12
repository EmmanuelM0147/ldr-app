import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createDemoClient, type MockClient } from "./api/mockClient"
import { ApiError } from "./api/errors"
import type { Couple, User } from "./types"

const TOKEN_KEY = "closer-token"

type SessionValue = {
  client: MockClient | null
  user: User | null
  couple: Couple | null
  ready: boolean
  signIn: (token: string, user: User) => Promise<void>
  signOut: () => void
  refreshCouple: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<MockClient | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void createDemoClient(window.sessionStorage).then(async (next) => {
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
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <SessionContext.Provider value={{ client, user, couple, ready, signIn, signOut, refreshCouple }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("Session is missing.")
  return value
}
