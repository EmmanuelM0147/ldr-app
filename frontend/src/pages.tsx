import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom"
import { ApiError } from "./api/errors"
import { AvatarMenu } from "./components/AvatarMenu"
import { BottomNav } from "./components/BottomNav"
import { BottomSheet } from "./components/BottomSheet"
import { DeleteSpaceForm } from "./components/DeleteSpaceForm"
import { HomeHero } from "./components/HomeHero"
import { eventsByDay, MonthCalendar } from "./components/MonthCalendar"
import { PartnerHomeCards } from "./components/PartnerHomeCards"
import { PartnerTodayCards } from "./components/PartnerTodayCards"
import { QuickActions } from "./components/QuickActions"
import { itemsThisWeek, ThisWeekList } from "./components/ThisWeekList"
import { MemoryTimeline, OnThisDay, onThisDay } from "./components/MemoryTimeline"
import { RouteCityField } from "./components/RouteCityField"
import { EmptyState, ErrorState, LoadingState } from "./components/ScreenState"
import { VisitCard } from "./components/VisitCard"
import { routeSuggestions } from "./visitHints"
import {
  BudgetFields,
  BudgetForm,
  budgetFromForm,
  CheckInForm,
  CountdownCard,
  EventForm,
  LoginForm,
  RegisterForm,
} from "./components/widgets"
import { formatWhen, localDate } from "./format"
import { checkInStreak, DAILY_PROMPT, moodLabel } from "./mood"
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
  const [loadingHome, setLoadingHome] = useState(false)

  useEffect(() => {
    if (!client || !couple) return
    let ignore = false
    setLoadingHome(true)
    void Promise.all([client.getNextVisit(), client.listEvents(), client.listVisits(), client.listCheckIns()])
      .then(([next, eventList, visitList, checkInList]) => {
        if (ignore) return
        setCountdown(next)
        setEvents(eventList)
        setVisits(visitList)
        setCheckIns(checkInList)
        setLoadingHome(false)
      })
      .catch((caught: unknown) => {
        if (ignore) return
        setError(caught instanceof ApiError ? caught.detail : "Could not load home.")
        setLoadingHome(false)
      })
    return () => {
      ignore = true
    }
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
      {loadingHome ? <LoadingState label="Opening your home…" /> : null}
      {!loadingHome ? <HomeHero countdown={countdown} timeZone={user.timezone} /> : null}
      {!loadingHome ? (
        <PartnerHomeCards
          members={couple.members}
          presence={presence}
          checkIns={checkIns}
          viewerId={user.id}
          onTogglePresence={(free) => void updatePresence(free)}
        />
      ) : null}
      <QuickActions />
      {!loadingHome ? <ThisWeekList items={week} timeZone={user.timezone} /> : null}
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
      {error ? <ErrorState message={error} /> : null}
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
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), monthIndex: today.getMonth() })
  const [selectedKey, setSelectedKey] = useState(() => localDate(user?.timezone ?? "UTC"))

  async function reload() {
    if (!client) return
    try {
      setEvents(await client.listEvents())
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.detail : "Could not load events.")
    }
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!user) return null
  if (events === null) {
    return (
      <main className="sheet">
        <h1>Calendar</h1>
        <LoadingState label="Loading calendar…" />
      </main>
    )
  }

  const byDay = eventsByDay(events, user.timezone)
  const markedKeys = new Set(byDay.keys())
  const dayEvents = byDay.get(selectedKey) ?? []
  const selectedLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${selectedKey}T12:00:00`))

  return (
    <main className="sheet calendar-page">
      <h1>Calendar</h1>
      <MonthCalendar
        year={cursor.year}
        monthIndex={cursor.monthIndex}
        selectedKey={selectedKey}
        markedKeys={markedKeys}
        onSelect={setSelectedKey}
        onPrev={() =>
          setCursor((value) => {
            const monthIndex = value.monthIndex - 1
            if (monthIndex < 0) return { year: value.year - 1, monthIndex: 11 }
            return { ...value, monthIndex }
          })
        }
        onNext={() =>
          setCursor((value) => {
            const monthIndex = value.monthIndex + 1
            if (monthIndex > 11) return { year: value.year + 1, monthIndex: 0 }
            return { ...value, monthIndex }
          })
        }
      />
      <section className="card day-detail" aria-label={`Events on ${selectedLabel}`}>
        <h2>{selectedLabel}</h2>
        {dayEvents.length === 0 ? (
          <EmptyState title="No events on this day" body="Tap + to add something you both need on the calendar." />
        ) : (
          <ul className="list compact">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                <p className="muted">{formatWhen(event.starts_at, user.timezone)}</p>
                {event.location ? <p>{event.location}</p> : null}
                <button
                  className="textish"
                  type="button"
                  onClick={() => void client?.deleteEvent(event.id).then(reload)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error ? <ErrorState message={error} /> : null}
      <button className="fab" type="button" aria-label="Add event" onClick={() => setSheetOpen(true)}>
        +
      </button>
      <BottomSheet open={sheetOpen} title="Add event" onClose={() => setSheetOpen(false)}>
        <EventForm
          onCreate={(input) => {
            void client
              ?.createEvent(input)
              .then(async () => {
                await reload()
                setSheetOpen(false)
              })
              .catch((caught: unknown) => {
                setError(caught instanceof ApiError ? caught.detail : "Could not add that event.")
              })
          }}
        />
      </BottomSheet>
    </main>
  )
}

export function VisitsPage() {
  const { client, user, couple } = useSession()
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [countdown, setCountdown] = useState<Awaited<ReturnType<NonNullable<typeof client>["getNextVisit"]>> | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    try {
      setVisits(await client.listVisits())
      setCountdown(await client.getNextVisit())
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.detail : "Could not load visits.")
    }
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!client || !user || !couple) return null
  if (visits === null) {
    return (
      <main className="sheet">
        <h1>Visits</h1>
        <LoadingState label="Loading visits…" />
      </main>
    )
  }
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
    const travelerRaw = String(data.get("traveler_user_id") ?? "").trim()
    setError(null)
    void client
      ?.createVisit({
        title: String(data.get("title") ?? ""),
        starts_at: starts,
        ends_at: ends,
        location: String(data.get("location") ?? ""),
        traveler_user_id: travelerRaw || null,
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
      <form onSubmit={addVisit} className="stack card">
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
        <RouteCityField suggestions={routeSuggestions(visits.map((visit) => visit.location))} />
        <label className="field">
          <span>Traveler</span>
          <select name="traveler_user_id" defaultValue="">
            <option value="">Not set</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.display_name}
              </option>
            ))}
          </select>
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
      {error ? <ErrorState message={error} /> : null}
      {visits.length === 0 ? (
        <EmptyState title="No visits yet" body="Add the next trip so the countdown has somewhere to land." />
      ) : (
        <ul className="list">
          {visits.map((visit) => (
            <li key={visit.id}>
              <VisitCard
                visit={visit}
                members={members}
                timeZone={user.timezone}
                onRemove={() => void client.deleteVisit(visit.id).then(reload)}
              />
              {me && them ? (
                <BudgetForm
                  memberIds={[me.user_id, them.user_id]}
                  onSave={(budget) => {
                    void client.putBudget(visit.id, budget).then(reload).catch((caught: unknown) => {
                      setError(caught instanceof ApiError ? caught.detail : "Could not save the split.")
                    })
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export function CheckInsPage() {
  const { client, user, couple, liveTick } = useSession()
  const [items, setItems] = useState<CheckIn[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    try {
      setItems(await client.listCheckIns())
      setError(null)
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.detail : "Could not load check-ins.")
    }
  }

  useEffect(() => {
    void reload()
  }, [client, liveTick])

  if (!user || !couple) return null
  if (items === null) {
    return (
      <main className="sheet">
        <h1>Check-in</h1>
        <LoadingState label="Loading check-ins…" />
      </main>
    )
  }
  const today = localDate(user.timezone)
  const mine = items.find((item) => item.user_id === user.id && item.local_date === today) ?? null
  const myDates = items.filter((item) => item.user_id === user.id).map((item) => item.local_date)
  const streak = checkInStreak(myDates, today)
  const earlier = items.filter((item) => item.local_date !== today)
  return (
    <main className="sheet">
      <h1>Check-in</h1>
      <section className="card prompt-card" aria-label="Daily prompt">
        <p className="kicker">Today&apos;s prompt</p>
        <h2>{DAILY_PROMPT}</h2>
        <p className="muted">A shared question for both of you. Answers stay in your notes for now.</p>
      </section>
      <p className="streak" aria-label="Check-in streak">
        Your streak: <strong>{streak}</strong> {streak === 1 ? "day" : "days"}
      </p>
      <PartnerTodayCards members={couple.members} items={items} today={today} />
      <CheckInForm
        key={mine?.id ?? "new"}
        existing={mine}
        onSave={(input) => {
          void client?.upsertTodayCheckIn(input).then(reload)
        }}
      />
      {error ? <ErrorState message={error} /> : null}
      <h2>Earlier</h2>
      {earlier.length === 0 ? (
        <EmptyState title="No earlier check-ins" body="Past moods will collect here as you check in." />
      ) : (
        <ul className="list">
          {earlier.map((item) => {
            const name = couple.members.find((member) => member.user_id === item.user_id)?.display_name
            return (
              <li key={item.id} className="card">
                <p className="kicker">
                  {name} · {item.local_date}
                </p>
                <h2>{moodLabel(item.mood)}</h2>
                {item.note ? <p>{item.note}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export function MemoriesPage() {
  const { client, user } = useSession()
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!client) return
    try {
      setMemories(await client.listMemories())
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.detail : "Could not load memories.")
    }
  }

  useEffect(() => {
    void reload()
  }, [client])

  if (!client || !user) return null
  if (memories === null) {
    return (
      <main className="sheet">
        <h1>Memories</h1>
        <LoadingState label="Loading memories…" />
      </main>
    )
  }

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

  const todayMemories = onThisDay(memories)

  return (
    <main className="sheet">
      <h1>Memories</h1>
      <OnThisDay memories={todayMemories} timeZone={user.timezone} />
      <form onSubmit={addMemory} className="stack card">
        <label className="field">
          <span>Title</span>
          <input name="title" maxLength={80} />
        </label>
        <label className="field">
          <span>What you want to keep</span>
          <textarea name="body" required rows={4} />
        </label>
        <p className="muted">Photo upload comes later.</p>
        <button className="primary" type="submit">
          Save memory
        </button>
      </form>
      {error ? <ErrorState message={error} /> : null}
      <h2>Timeline</h2>
      {memories.length === 0 ? (
        <EmptyState title="No memories yet" body="Save a small moment you do not want to lose." />
      ) : (
        <MemoryTimeline
          memories={memories}
          currentUserId={user.id}
          timeZone={user.timezone}
          onDelete={(id) => void client.deleteMemory(id).then(reload)}
        />
      )}
    </main>
  )
}
