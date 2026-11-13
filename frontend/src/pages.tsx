import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, Outlet, useNavigate, useSearchParams } from "react-router-dom"
import { ApiError } from "./api/errors"
import { AvatarMenu } from "./components/AvatarMenu"
import { BottomNav } from "./components/BottomNav"
import { BrandLockup } from "./components/BrandLockup"
import { NotificationsBell } from "./components/NotificationsBell"
import { NotificationsPanel } from "./components/NotificationsPanel"
import { PairingStart } from "./components/PairingStart"
import { BottomSheet } from "./components/BottomSheet"
import { DeleteSpaceForm } from "./components/DeleteSpaceForm"
import { HomeHero } from "./components/HomeHero"
import { eventsByDay, MonthCalendar } from "./components/MonthCalendar"
import { PartnerHomeCards } from "./components/PartnerHomeCards"
import { PartnerTodayCards } from "./components/PartnerTodayCards"
import { DateIdeasCard } from "./components/DateIdeasCard"
import { QuickActions } from "./components/QuickActions"
import { itemsThisWeek, ThisWeekList } from "./components/ThisWeekList"
import { MemoryDropZone, validateMemoryFile } from "./components/MemoryDropZone"
import { MemoryTimeline, OnThisDay, onThisDay } from "./components/MemoryTimeline"
import { PasswordField } from "./components/PasswordField"
import { PasswordSettingsForm } from "./components/PasswordSettingsForm"
import { ProfilePhotoForm } from "./components/ProfilePhotoForm"
import { ProfileSettingsForm } from "./components/ProfileSettingsForm"
import { RouteCityField } from "./components/RouteCityField"
import { EmptyState, ErrorState, LoadingState } from "./components/ScreenState"
import { VisitCard } from "./components/VisitCard"
import { composeRouteLocation, routeSuggestions } from "./visitHints"
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
import { formatDateEnGb, formatDay, formatWhen, localDate, zonedDateTimeLocalToUtc } from "./format"
import { partnerAccent } from "./partnerAccent"
import { checkInStreak, DAILY_PROMPT, moodLabel } from "./mood"
import { useSession } from "./session"
import type { CheckIn, EventItem, Memory, Visit } from "./types"

export function LoginPage() {
  const { client, user, ready, signIn } = useSession()
  const navigate = useNavigate()
  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />
  return (
    <main className="sheet auth-sheet">
      <BrandLockup size="auth" />
      <p className="auth-lede">The plan for the next time you are in the same place.</p>
      <LoginForm
        onSubmit={async (email, password) => {
          if (!client) return
          const auth = await client.login(email, password)
          await signIn(auth.access_token, auth.user)
          navigate("/")
        }}
      />
      <p className="muted">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </main>
  )
}

export function ForgotPasswordPage() {
  const { client, user, ready } = useSession()
  const [done, setDone] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
    setError(null)
    setDebugUrl(null)
    try {
      const result = await client.forgotPassword(email)
      setDetail(result.detail)
      setDebugUrl(result.reset_url ?? null)
      setDone(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not start a reset.")
    }
  }

  return (
    <main className="sheet auth-sheet">
      <BrandLockup size="auth" />
      <p className="auth-lede">Reset your password.</p>
      {done ? (
        <div className="stack">
          <p>{detail}</p>
          <p className="muted">
            Email delivery is not wired yet. For local demo, enable AUTH_RESET_DEBUG on the API
            or ask whoever runs the server for a reset link.
          </p>
          {debugUrl ? (
            <p>
              Local debug link:{" "}
              <Link to={debugUrl.replace(/^https?:\/\/[^/]+/, "") || "/reset-password"}>Open reset form</Link>
            </p>
          ) : null}
          <p className="muted">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit">
            Send reset link
          </button>
          <p className="muted">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </main>
  )
}

export function ResetPasswordPage() {
  const { client, user, ready } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = (params.get("token") ?? "").trim()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    const password = String(new FormData(event.currentTarget).get("password") ?? "")
    setError(null)
    try {
      await client.resetPassword(token, password)
      setDone(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not reset the password.")
    }
  }

  return (
    <main className="sheet auth-sheet">
      <BrandLockup size="auth" />
      <p className="auth-lede">Choose a new password.</p>
      {!token ? (
        <div className="stack">
          <p className="error">This reset link is missing a token.</p>
          <p className="muted">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      ) : done ? (
        <div className="stack">
          <p>Password updated. You can sign in.</p>
          <button className="primary" type="button" onClick={() => navigate("/login")}>
            Sign in
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <PasswordField
            label="New password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit">
            Update password
          </button>
          <p className="muted">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </main>
  )
}

export function RegisterPage() {
  const { client, user, ready, signIn } = useSession()
  const navigate = useNavigate()
  if (!ready || !client) return <p className="sheet muted">Opening your space…</p>
  if (user) return <Navigate to="/" replace />
  return (
    <main className="sheet auth-sheet">
      <BrandLockup size="auth" />
      <p className="auth-lede">Open a space for the two of you.</p>
      <RegisterForm
        onSubmit={async (values) => {
          if (!client) return
          const auth = await client.register(values)
          await signIn(auth.access_token, auth.user)
          navigate("/")
        }}
      />
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
  const { client, user, couple, signOut, partnerJoinedNotice, clearPartnerJoinedNotice, unreadCount } =
    useSession()
  const partner = couple?.members.find((member) => member.user_id !== user?.id)
  return (
    <div className="shell">
      <header className="top">
        <div className="top-bar">
          <BrandLockup size="header" to="/" />
          <div className="top-actions">
            {couple ? <NotificationsBell unreadCount={unreadCount} /> : null}
            {user && client ? (
              <AvatarMenu
                userId={user.id}
                name={user.display_name}
                avatarUrl={user.avatar_url}
                loadAvatar={(userId) => client.getUserAvatar(userId)}
                onSignOut={signOut}
              />
            ) : null}
          </div>
        </div>
        {user ? (
          <p className="muted names">
            {user.display_name}
            {partner ? ` and ${partner.display_name}` : ""}
          </p>
        ) : null}
      </header>
      {partnerJoinedNotice ? (
        <div className="join-notice" role="status">
          <p>{partnerJoinedNotice}</p>
          <div className="join-notice-actions">
            <Link className="text-button" to="/notifications" onClick={clearPartnerJoinedNotice}>
              View notifications
            </Link>
            <button type="button" className="text-button" onClick={clearPartnerJoinedNotice}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <Outlet />
      <footer className="zone">Times shown in {user?.timezone ?? "UTC"}</footer>
      {couple ? <BottomNav /> : null}
    </div>
  )
}

export function HomePage() {
  const { client, user, couple, presence, liveTick, refreshCouple, updatePresence } = useSession()
  const [code, setCode] = useState<string | null>(null)
  const [homeCopied, setHomeCopied] = useState(false)
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
    setHomeCopied(false)
    try {
      const invite = await client.createInvite()
      setCode(invite.code)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not create a code.")
    }
  }

  async function copyHomeInvite() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setHomeCopied(true)
    } catch {
      setError("Could not copy the code. Select it manually.")
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
      <PairingStart
        displayName={user.display_name}
        error={error}
        onCreateSpace={() => void createSpace()}
        onJoin={(event) => void join(event)}
      />
    )
  }

  const week = itemsThisWeek(events, visits, user.timezone)

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
          loadAvatar={(userId) => client.getUserAvatar(userId)}
          onTogglePresence={(free) => void updatePresence(free)}
        />
      ) : null}
      <QuickActions />
      {!loadingHome ? <DateIdeasCard aiEnabled={couple.ai_enabled} client={client} /> : null}
      {!loadingHome ? <ThisWeekList items={week} timeZone={user.timezone} /> : null}
      {couple.members.length < 2 ? (
        <section className="card">
          <h2>Invite your partner</h2>
          <p className="muted">The code is shown once. It expires in 7 days. Copy it and send it privately.</p>
          {code ? (
            <>
              <p className="code">{code}</p>
              <div className="row-actions">
                <button className="primary" type="button" onClick={() => void copyHomeInvite()}>
                  {homeCopied ? "Copied" : "Copy code"}
                </button>
                <button className="secondary" type="button" onClick={() => void issueInvite()}>
                  New code
                </button>
              </div>
            </>
          ) : (
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

export function NotificationsPage() {
  const {
    client,
    user,
    couple,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications,
  } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client || !couple) return
    void refreshNotifications().catch((caught: unknown) => {
      setError(caught instanceof ApiError ? caught.detail : "Could not load notifications.")
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once per couple session; live socket updates the list
  }, [client, couple])

  if (!client || !user) return null
  if (!couple) return <Navigate to="/" replace />

  async function markOne(id: string) {
    setError(null)
    try {
      await markNotificationRead(id)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not update that notification.")
      throw caught
    }
  }

  async function markAll() {
    setBusy(true)
    setError(null)
    try {
      await markAllNotificationsRead()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : "Could not mark notifications as read.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <NotificationsPanel
      notifications={notifications}
      unreadCount={unreadCount}
      timeZone={user.timezone}
      busy={busy}
      error={error}
      onMarkRead={markOne}
      onMarkAllRead={markAll}
    />
  )
}

export function SettingsPage() {
  const { client, user, couple, signOut, refreshCouple, refreshUser } = useSession()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<{ code: string; expires_at: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [spaceError, setSpaceError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  if (!client || !user) return null

  async function issueInvite() {
    if (!client) return
    setSpaceError(null)
    setCopied(false)
    try {
      const created = await client.createInvite()
      setInvite({ code: created.code, expires_at: created.expires_at })
    } catch (caught) {
      setSpaceError(caught instanceof ApiError ? caught.detail : "Could not create a code.")
    }
  }

  async function copyInvite() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopied(true)
    } catch {
      setSpaceError("Could not copy the code. Select it manually.")
    }
  }

  return (
    <main className="sheet">
      <h1>Settings</h1>
      <p className="lede">Your account, how you appear to your partner, and this couple space.</p>

      <section className="card">
        <h2>Account</h2>
        <ul className="list compact">
          <li>
            <strong>{user.email}</strong>
            <p className="muted">Sign-in email, not shared as a public profile.</p>
          </li>
          <li>
            <strong>Member since</strong>
            <p className="muted">{formatDay(user.created_at, user.timezone)}</p>
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Profile photo</h2>
        <ProfilePhotoForm
          user={user}
          loadBlob={(userId) => client.getUserAvatar(userId)}
          onUpload={async (file) => {
            try {
              await client.uploadMyAvatar(file)
              await refreshUser()
              await refreshCouple()
            } catch (caught) {
              throw new Error(caught instanceof ApiError ? caught.detail : "Could not upload photo.")
            }
          }}
          onRemove={async () => {
            try {
              await client.deleteMyAvatar()
              await refreshUser()
              await refreshCouple()
            } catch (caught) {
              throw new Error(caught instanceof ApiError ? caught.detail : "Could not remove photo.")
            }
          }}
        />
      </section>

      <section className="card">
        <h2>Profile</h2>
        <p className="muted">Display name and timezone. Partners see these in the shared space.</p>
        <ProfileSettingsForm
          user={user}
          onSave={async (values) => {
            try {
              await client.updateMe(values)
              await refreshUser()
              await refreshCouple()
            } catch (caught) {
              throw new Error(caught instanceof ApiError ? caught.detail : "Could not save profile.")
            }
          }}
        />
      </section>

      <section className="card">
        <h2>Password</h2>
        <p className="muted">Change with your current password. New password must be at least 8 characters.</p>
        <PasswordSettingsForm
          onSave={async (values) => {
            try {
              await client.updateMe(values)
            } catch (caught) {
              throw new Error(caught instanceof ApiError ? caught.detail : "Could not change password.")
            }
          }}
        />
      </section>

      {couple ? (
        <section className="card">
          <h2>Your space</h2>
          <p className="muted">
            Shared since {formatDay(couple.created_at, user.timezone)}. Only the two of you can see this data.
          </p>
          <ul className="list compact">
            {couple.members.map((member) => {
              const isYou = member.user_id === user.id
              return (
                <li key={member.user_id}>
                  <strong>
                    {member.display_name}
                    {isYou ? " (you)" : ""}
                  </strong>
                  <p className="muted">
                    {member.timezone} · joined {formatDay(member.joined_at, user.timezone)}
                  </p>
                </li>
              )
            })}
          </ul>

          <h3 className="settings-subhead">Privacy and AI</h3>
          <label className="field switch-field">
            <span>AI date-night ideas</span>
            <input
              type="checkbox"
              checked={couple.ai_enabled}
              disabled={aiBusy}
              onChange={(event) => {
                const next = event.target.checked
                setAiBusy(true)
                setSpaceError(null)
                void client
                  .updateCurrentCouple({ ai_enabled: next })
                  .then(() => refreshCouple())
                  .catch((caught: unknown) => {
                    setSpaceError(caught instanceof ApiError ? caught.detail : "Could not update AI preference.")
                  })
                  .finally(() => setAiBusy(false))
              }}
            />
          </label>
          <p className="muted">
            Off by default. Either of you can turn this off anytime. When on, Home can ask Google Gemini for date
            ideas. We send only the form fields you enter (duration, budget, together/apart, optional mood), never
            names, emails, check-ins, memories, visit notes, or other couple content. Prompts and replies are not
            logged.
          </p>

          {couple.members.length < 2 ? (
            <>
              <h3 className="settings-subhead">Invite partner</h3>
              <p className="muted">One-time code, expires in seven days. Share it only with your partner.</p>
              {invite ? (
                <>
                  <p className="code">{invite.code}</p>
                  <p className="muted">Expires {formatWhen(invite.expires_at, user.timezone)}</p>
                  <div className="row-actions">
                    <button className="secondary" type="button" onClick={() => void copyInvite()}>
                      {copied ? "Copied" : "Copy code"}
                    </button>
                    <button className="secondary" type="button" onClick={() => void issueInvite()}>
                      New code
                    </button>
                  </div>
                </>
              ) : (
                <button className="secondary" type="button" onClick={() => void issueInvite()}>
                  Create invite code
                </button>
              )}
            </>
          ) : null}
          {spaceError ? <ErrorState message={spaceError} /> : null}
        </section>
      ) : (
        <section className="card">
          <h2>Your space</h2>
          <p className="muted">
            You are not in a couple space yet. Create or join one from Home to invite a partner and manage AI
            preferences.
          </p>
          <Link className="secondary button-link" to="/">
            Go to Home
          </Link>
        </section>
      )}

      <section className="card">
        <h2>About Closer</h2>
        <p className="muted">
          A private space for two. No chat, no video calls, no public profiles. Shared visits, check-ins, and
          memories stay inside your couple space until you delete it.
        </p>
      </section>

      <section className="card">
        <h2>Session</h2>
        <p className="muted">Sign out on this device. Your account and space stay intact.</p>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            signOut()
            navigate("/login", { replace: true })
          }}
        >
          Sign out
        </button>
      </section>

      {couple ? (
        <section className="card danger-zone">
          <h2>Delete this space</h2>
          <p className="muted">
            Removes shared visits, events, check-ins, memories, and presence. Both accounts remain and can sign in.
          </p>
          <DeleteSpaceForm
            onConfirm={async () => {
              await client.deleteCurrentCouple()
              await refreshCouple()
              navigate("/", { replace: true })
            }}
          />
        </section>
      ) : null}
    </main>
  )
}

export function CalendarPage() {
  const { client, user, couple } = useSession()
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

  const memberIds = couple?.members.map((member) => member.user_id) ?? (user ? [user.id] : [])
  const byDay = eventsByDay(events, user.timezone)
  const markedKeys = new Set(byDay.keys())
  const dayAccents = new Map(
    [...byDay.entries()].map(([key, dayItems]) => {
      const accents = [...new Set(dayItems.map((event) => partnerAccent(event.created_by, memberIds)))]
      return [key, accents] as const
    }),
  )
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
        todayKey={localDate(user.timezone)}
        markedKeys={markedKeys}
        dayAccents={dayAccents}
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
              <li key={event.id} className={partnerAccent(event.created_by, memberIds)}>
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
          timeZone={user.timezone}
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
  const [sheetOpen, setSheetOpen] = useState(false)

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
  const timeZone = user.timezone

  function addVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const starts = zonedDateTimeLocalToUtc(String(data.get("starts_at") ?? ""), timeZone)
    const ends = zonedDateTimeLocalToUtc(String(data.get("ends_at") ?? ""), timeZone)
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
    const location = composeRouteLocation(
      String(data.get("location_from") ?? ""),
      String(data.get("location_to") ?? ""),
    )
    if (!location) {
      setError("Choose a From and To city.")
      return
    }
    setError(null)
    void client
      ?.createVisit({
        title: String(data.get("title") ?? ""),
        starts_at: starts,
        ends_at: ends,
        location,
        traveler_user_id: travelerRaw || null,
        budget: parsed.budget,
      })
      .then(async () => {
        form.reset()
        await reload()
        setSheetOpen(false)
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.detail : "Could not save the visit.")
      })
  }

  return (
    <main className="sheet">
      <h1>Visits</h1>
      {countdown ? <CountdownCard countdown={countdown} timeZone={user.timezone} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {visits.length === 0 ? (
        <EmptyState title="No visits yet" body="Tap + to add the next trip so the countdown has somewhere to land." />
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
      <button className="fab" type="button" aria-label="Add visit" onClick={() => setSheetOpen(true)}>
        +
      </button>
      <BottomSheet open={sheetOpen} title="Add visit" onClose={() => setSheetOpen(false)}>
        <form onSubmit={addVisit} className="stack">
          {error ? <p className="error" role="alert">{error}</p> : null}
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
      </BottomSheet>
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
  const earlier = items.filter((item) => {
    const memberZone =
      couple.members.find((member) => member.user_id === item.user_id)?.timezone ?? user.timezone
    return item.local_date !== localDate(memberZone)
  })
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
      <PartnerTodayCards members={couple.members} items={items} />
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
                  {name} · {formatDateEnGb(item.local_date, user.timezone)}
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
  const { client, user, couple } = useSession()
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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
    const form = event.currentTarget
    const data = new FormData(form)
    const fileInput = form.elements.namedItem("media")
    const file =
      fileInput instanceof HTMLInputElement && fileInput.files && fileInput.files[0]
        ? fileInput.files[0]
        : undefined
    const body = String(data.get("body") ?? "")
    if (!file && !body.trim()) {
      setError("Add a note or choose a photo or video.")
      return
    }
    if (file) {
      const checked = validateMemoryFile(file)
      if (!checked.ok) {
        setError(checked.error)
        return
      }
    }
    setError(null)
    void client
      ?.createMemory({
        title: String(data.get("title") ?? ""),
        body,
        file,
      })
      .then(async () => {
        form.reset()
        await reload()
        setSheetOpen(false)
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.detail : "Could not save that memory.")
      })
  }

  const todayMemories = onThisDay(memories)
  const loadMedia = (memoryId: string) => client.getMemoryMedia(memoryId)

  return (
    <main className="sheet">
      <h1>Memories</h1>
      <OnThisDay memories={todayMemories} timeZone={user.timezone} loadMedia={loadMedia} />
      {error ? <ErrorState message={error} /> : null}
      <h2>Timeline</h2>
      {memories.length === 0 ? (
        <EmptyState title="No memories yet" body="Tap + to save a small moment you do not want to lose." />
      ) : (
        <MemoryTimeline
          memories={memories}
          currentUserId={user.id}
          memberIds={couple?.members.map((member) => member.user_id) ?? [user.id]}
          timeZone={user.timezone}
          loadMedia={loadMedia}
          onDelete={(id) => void client.deleteMemory(id).then(reload)}
        />
      )}
      <button className="fab" type="button" aria-label="Add memory" onClick={() => setSheetOpen(true)}>
        +
      </button>
      <BottomSheet open={sheetOpen} title="Add memory" onClose={() => setSheetOpen(false)}>
        <form onSubmit={addMemory} className="stack">
          <label className="field">
            <span>Title</span>
            <input name="title" maxLength={80} />
          </label>
          <label className="field">
            <span>What you want to keep</span>
            <textarea name="body" rows={4} />
          </label>
          <MemoryDropZone />
          <button className="primary" type="submit">
            Save memory
          </button>
        </form>
      </BottomSheet>
    </main>
  )
}
