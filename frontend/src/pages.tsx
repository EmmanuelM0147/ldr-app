import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom"
import { ApiError } from "./api/errors"
import { AvatarMenu } from "./components/AvatarMenu"
import { BottomNav } from "./components/BottomNav"
import { DeleteSpaceForm } from "./components/DeleteSpaceForm"
import { HomeHero } from "./components/HomeHero"
import { PartnerHomeCards } from "./components/PartnerHomeCards"
import { PartnerTodayCards } from "./components/PartnerTodayCards"
import { QuickActions } from "./components/QuickActions"
import { itemsThisWeek, ThisWeekList } from "./components/ThisWeekList"
import {
  BudgetFields,
  BudgetForm,
  budgetFromForm,
  CheckInForm,
  CountdownCard,
  EventForm,
  LoginForm,
  MemoryList,
  RegisterForm,
} from "./components/widgets"
import { formatMoney, formatWhen, localDate } from "./format"
import { useSession } from "./session"
import type { CheckIn, EventItem, Memory, Visit } from "./types"

export function LoginPage() {
  const { client, user, ready, signIn } = useSession()
  const navigate = useNavigate()
  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />
  return (
    <main className="sheet">
      <p className="brand">Closer</p>
      <h1>The plan for the next time you are in the same place.</h1>
      <LoginForm
        onSubmit={async (email, password) => {
          if (!client) return
          const auth = await client.login(email, password)
          await signIn(auth.access_token, auth.user)
          navigate("/")
        }}
      />
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </main>
  )
}

export function RegisterPage() {
  const { client, user, ready, signIn } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />
  return (
    <main className="sheet">
      <p className="brand">Closer</p>
      <h1>Open a space for the two of you.</h1>
      <RegisterForm
        onSubmit={async (values) => {
          if (!client) return
          setError(null)
          try {
            const auth = await client.register(values)
            await signIn(auth.access_token, auth.user)
            navigate("/")
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.detail : "Could not create the account.")
          }
        }}
      />
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </main>
  )
}

export function RequireAuth() {
  const { user, ready } = useSession()
  if (!ready) return <p className="sheet muted">Opening your space…</p>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function Shell() {
  const { user, couple, signOut } = useSession()
  const partner = couple?.members.find((member) => member.user_id !== user?.id)
  return (
    <div className="shell">
      <header className="top">
        <div className="top-copy">
          <p className="brand">Closer</p>
          <p className="muted names">
            {user?.display_name}
            {partner ? ` and ${partner.display_name}` : ""}
          </p>
        </div>
        {user ? (
          <AvatarMenu name={user.display_name} showSettings={Boolean(couple)} onSignOut={signOut} />
        ) : null}
      </header>
      <Outlet />
      <footer className="zone">Times shown in {user?.timezone ?? "UTC"}</footer>
      {couple ? <BottomNav /> : null}
    </div>
  )
}

export function HomePage() {
  const { client, user, couple, presence, liveTick, refreshCouple, updatePresence } = useSession()
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<Awaited<ReturnType<NonNullable<typeof client>["getNextVisit"]>> | null>(
    null,
  )
  const [events, setEvents] = useState<EventItem[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])

  useEffect(() => {
    if (!client || !couple) return
    void client.getNextVisit().then(setCountdown)
    void client.listEvents().then(setEvents)
    void client.listVisits().then(setVisits)
    void client.listCheckIns().then(setCheckIns)
  }, [client, couple, liveTick])

  if (!client || !user) return null

  async function createSpace() {
    if (!client) return
    setError(null)
    try {
      await client.createCouple()
      const invite = await client.createInvite()
      setCode(invite.code)
      await refreshCouple()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not create the space.")
    }
  }

  async function issueInvite() {
    if (!client) return
    setError(null)
    try {
      const invite = await client.createInvite()
      setCode(invite.code)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not create a code.")
    }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const inviteCode = String(new FormData(event.currentTarget).get("code") ?? "")
    setError(null)
    try {
      await client?.joinCouple(inviteCode)
      await refreshCouple()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not join.")
    }
  }

  if (!couple) {
    return (
      <main className="sheet">
        <h1>Start with just the two of you.</h1>
        <button className="primary" type="button" onClick={() => void createSpace()}>
          Create our space
        </button>
        <form onSubmit={(event) => void join(event)} className="stack">
          <label className="field">
            <span>Invite code</span>
            <input name="code" required minLength={8} />
          </label>
          <button className="secondary" type="submit">
            Join with a code
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </main>
    )
  }

  const week = itemsThisWeek(events, visits)

  return (
    <main className="sheet">
      <HomeHero countdown={countdown} timeZone={user.timezone} />
      <PartnerHomeCards
        members={couple.members}
        presence={presence}
        checkIns={checkIns}
        viewerId={user.id}
        onTogglePresence={(free) => void updatePresence(free)}
      />
      <QuickActions />
      <ThisWeekList items={week} timeZone={user.timezone} />
      {couple.members.length < 2 ? (
        <section className="card">
          <h2>Invite your partner</h2>
          <p className="muted">The code is shown once. It expires in 7 days.</p>
          {code ? <p className="code">{code}</p> : (
            <button className="secondary" type="button" onClick={() => void issueInvite()}>
              Create a new invite
            </button>
          )}
        </section>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  )
}

export function SettingsPage() {
  const { client, couple, refreshCouple } = useSession()
  const navigate = useNavigate()
  if (!client || !couple) return null
  return (
    <main className="sheet">
      <h1>Settings</h1>
      <section className="card">
        <h2>Delete this space</h2>
        <DeleteSpaceForm
          onConfirm={async () => {
            await client.deleteCurrentCouple()
            await refreshCouple()
            navigate("/", { replace: true })
          }}
        />
      </section>
    </main>
  )
}

export function CalendarPage() {
  const { client, user } = useSession()
  const [events, setEvents] = useState<EventItem[]>([])
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    setEvents(await client.listEvents())
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!user) return null
  return (
    <main className="sheet">
      <h1>Calendar</h1>
      <EventForm
        onCreate={(input) => {
          void client?.createEvent(input).then(reload).catch((caught: unknown) => {
            setError(caught instanceof ApiError ? caught.detail : "Could not add that event.")
          })
        }}
      />
      {error ? <p className="error">{error}</p> : null}
      <ul className="list">
        {events.map((event) => (
          <li key={event.id} className="card">
            <h2>{event.title}</h2>
            <p className="muted">{formatWhen(event.starts_at, user.timezone)}</p>
            {event.location ? <p>{event.location}</p> : null}
            <button className="textish" type="button" onClick={() => void client?.deleteEvent(event.id).then(reload)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function VisitsPage() {
  const { client, user, couple } = useSession()
  const [visits, setVisits] = useState<Visit[]>([])
  const [countdown, setCountdown] = useState<Awaited<ReturnType<NonNullable<typeof client>["getNextVisit"]>> | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    setVisits(await client.listVisits())
    setCountdown(await client.getNextVisit())
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!client || !user || !couple) return null
  const members = couple.members
  const me = members.find((member) => member.user_id === user.id)
  const them = members.find((member) => member.user_id !== user.id)

  function addVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const starts = new Date(String(data.get("starts_at"))).toISOString()
    const ends = new Date(String(data.get("ends_at"))).toISOString()
    if (new Date(ends).getTime() <= new Date(starts).getTime()) {
      setError("End must be after the start.")
      return
    }
    const memberPair: [string, string] | null = me && them ? [me.user_id, them.user_id] : null
    const parsed = memberPair
      ? budgetFromForm(data, memberPair)
      : { budget: null, error: null as string | null }
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    setError(null)
    void client
      ?.createVisit({
        title: String(data.get("title") ?? ""),
        starts_at: starts,
        ends_at: ends,
        location: String(data.get("location") ?? ""),
        budget: parsed.budget,
      })
      .then(() => {
        form.reset()
        return reload()
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.detail : "Could not save the visit.")
      })
  }

  return (
    <main className="sheet">
      <h1>Visits</h1>
      {countdown ? <CountdownCard countdown={countdown} timeZone={user.timezone} /> : null}
      <form onSubmit={addVisit} className="stack">
        <label className="field">
          <span>Title</span>
          <input name="title" required />
        </label>
        <label className="field">
          <span>Arrives</span>
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label className="field">
          <span>Leaves</span>
          <input name="ends_at" type="datetime-local" required />
        </label>
        <label className="field">
          <span>City</span>
          <input name="location" />
        </label>
        {me && them ? (
          <>
            <p className="muted">Optional cost split for this visit.</p>
            <BudgetFields />
          </>
        ) : (
          <p className="muted">The split opens when you are both here.</p>
        )}
        <button className="primary" type="submit">
          Add visit
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <ul className="list">
        {visits.map((visit) => (
          <li key={visit.id} className="card">
            <h2>{visit.title}</h2>
            <p className="muted">
              {formatWhen(visit.starts_at, user.timezone)} – {formatWhen(visit.ends_at, user.timezone)}
            </p>
            {visit.location ? <p>{visit.location}</p> : null}
            {visit.budget ? (
              <p>
                {formatMoney(visit.budget.total_minor, visit.budget.currency)} split{" "}
                {visit.budget.shares
                  .map((share) => {
                    const name = members.find((member) => member.user_id === share.user_id)?.display_name
                    return `${name ?? "Partner"} ${formatMoney(share.amount_minor, visit.budget?.currency ?? "USD")}`
                  })
                  .join(" / ")}
              </p>
            ) : null}
            {me && them ? (
              <BudgetForm
                memberIds={[me.user_id, them.user_id]}
                onSave={(budget) => {
                  void client.putBudget(visit.id, budget).then(reload).catch((caught: unknown) => {
                    setError(caught instanceof ApiError ? caught.detail : "Could not save the split.")
                  })
                }}
              />
            ) : (
              <p className="muted">The split opens when you are both here.</p>
            )}
            <button className="textish" type="button" onClick={() => void client.deleteVisit(visit.id).then(reload)}>
              Remove visit
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function CheckInsPage() {
  const { client, user, couple, liveTick } = useSession()
  const [items, setItems] = useState<CheckIn[]>([])

  async function reload() {
    if (!client) return
    setItems(await client.listCheckIns())
  }

  useEffect(() => {
    void reload()
  }, [client, liveTick])

  if (!user || !couple) return null
  const today = localDate(user.timezone)
  const mine = items.find((item) => item.user_id === user.id && item.local_date === today) ?? null
  return (
    <main className="sheet">
      <h1>Check-in</h1>
      <PartnerTodayCards members={couple.members} items={items} today={today} />
      <CheckInForm
        key={mine?.id ?? "new"}
        existing={mine}
        onSave={(input) => {
          void client?.upsertTodayCheckIn(input).then(reload)
        }}
      />
      <h2>Earlier</h2>
      <ul className="list">
        {items
          .filter((item) => item.local_date !== today)
          .map((item) => {
            const name = couple.members.find((member) => member.user_id === item.user_id)?.display_name
            return (
              <li key={item.id} className="card">
                <p className="kicker">
                  {name} · {item.local_date}
                </p>
                <h2>{item.mood}</h2>
                {item.note ? <p>{item.note}</p> : null}
              </li>
            )
          })}
      </ul>
    </main>
  )
}

export function MemoriesPage() {
  const { client, user } = useSession()
  const [memories, setMemories] = useState<Memory[]>([])
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    setMemories(await client.listMemories())
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!client || !user) return null

  function addMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    void client
      ?.createMemory({
        title: String(data.get("title") ?? ""),
        body: String(data.get("body") ?? ""),
      })
      .then(() => {
        event.currentTarget.reset()
        return reload()
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.detail : "Could not save that memory.")
      })
  }

  return (
    <main className="sheet">
      <h1>Memories</h1>
      <form onSubmit={addMemory} className="stack">
        <label className="field">
          <span>Title</span>
          <input name="title" maxLength={80} />
        </label>
        <label className="field">
          <span>What you want to keep</span>
          <textarea name="body" required rows={4} />
        </label>
        <button className="primary" type="submit">
          Save memory
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <MemoryList
        memories={memories}
        currentUserId={user.id}
        onDelete={(id) => void client.deleteMemory(id).then(reload)}
      />
    </main>
  )
}
