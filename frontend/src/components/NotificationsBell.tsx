import { Link } from "react-router-dom"
import { IconBell } from "./icons"

export function NotificationsBell({ unreadCount }: { unreadCount: number }) {
  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications"
  return (
    <Link to="/notifications" className="notifications-bell" aria-label={label}>
      <IconBell title="" />
      {unreadCount > 0 ? (
        <span className="notifications-badge" aria-hidden="true">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  )
}
