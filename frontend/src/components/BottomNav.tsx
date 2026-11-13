import { NavLink } from "react-router-dom"
import { IconBook, IconCalendar, IconHeart, IconHome, IconPlane } from "./icons"

const ITEMS = [
  { to: "/", label: "Home", end: true, Icon: IconHome },
  { to: "/calendar", label: "Calendar", Icon: IconCalendar },
  { to: "/visits", label: "Visits", Icon: IconPlane },
  { to: "/check-ins", label: "Check-in", Icon: IconHeart },
  { to: "/memories", label: "Memories", Icon: IconBook },
] as const

export function BottomNav() {
  return (
    <nav className="tabs" aria-label="Main">
      {ITEMS.map(({ to, label, Icon, ...rest }) => (
        <NavLink key={to} to={to} end={"end" in rest ? rest.end : undefined} className="tab-link">
          {/* Decorative beside the visible label — avoid "Home Home" for screen readers. */}
          <Icon title="" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
