import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { AppNotification, NotificationKind } from "../types"
import { formatWhen } from "../format"
import { EmptyState, ErrorState } from "./ScreenState"

const KIND_META: Record<
  NotificationKind,
  { label: string; href: string }
> = {
  partner_joined: { label: "Partner", href: "/" },
  check_in: { label: "Check-in", href: "/check-ins" },
  event_created: { label: "Event", href: "/calendar" },
  visit_created: { label: "Visit", href: "/visits" },
  memory_created: { label: "Memory", href: "/memories" },
}

type Filter = "all" | "unread"

export function NotificationsPanel({
  notifications,
  unreadCount,
  timeZone,
  busy,
  error,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: AppNotification[]
  unreadCount: number
  timeZone: string
  busy: boolean
  error: string | null
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>("all")
  const [rowBusy, setRowBusy] = useState<string | null>(null)

  const visible = useMemo(() => {
    if (filter === "unread") return notifications.filter((item) => item.read_at === null)
    return notifications
  }, [filter, notifications])

  async function openItem(item: AppNotification) {
    const target = KIND_META[item.kind]?.href ?? "/"
    setRowBusy(item.id)
    try {
      if (!item.read_at) await onMarkRead(item.id)
      navigate(target)
    } finally {
      setRowBusy(null)
    }
  }

  return (
    <main className="sheet notifications-page">
      <div className="notifications-head">
        <div>
          <h1>Notifications</h1>
          <p className="muted">
            {unreadCount > 0
              ? `${unreadCount} unread · in-app only`
              : "You are up to date · in-app only"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button className="secondary" type="button" disabled={busy} onClick={() => void onMarkAllRead()}>
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="notification-filters" role="tablist" aria-label="Filter notifications">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={filter === "all" ? "is-active" : undefined}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "unread"}
          className={filter === "unread" ? "is-active" : undefined}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          body="When your partner joins, checks in, or adds a visit or event, it shows up here."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No unread notifications" body="Switch to All to see earlier updates." />
      ) : (
        <ul className="notification-list">
          {visible.map((item) => {
            const meta = KIND_META[item.kind]
            const unread = item.read_at === null
            return (
              <li key={item.id} className={unread ? "notification-item" : "notification-item is-read"}>
                <button
                  type="button"
                  className="notification-main"
                  disabled={rowBusy === item.id}
                  onClick={() => void openItem(item)}
                >
                  <span className="notification-kind">{meta?.label ?? "Update"}</span>
                  <span className="notification-title">{item.title}</span>
                  <span className="notification-body">{item.body}</span>
                  <span className="muted notification-time">{formatWhen(item.created_at, timeZone)}</span>
                </button>
                <div className="notification-actions">
                  {unread ? (
                    <button
                      className="text-button"
                      type="button"
                      disabled={rowBusy === item.id || busy}
                      onClick={() => void onMarkRead(item.id)}
                    >
                      Mark as read
                    </button>
                  ) : (
                    <Link className="text-button" to={meta?.href ?? "/"}>
                      Open
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
