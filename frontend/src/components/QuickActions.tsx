import { Link } from "react-router-dom"

const ACTIONS = [
  { to: "/calendar", label: "Add event" },
  { to: "/visits", label: "Plan visit" },
  { to: "/check-ins", label: "Check in" },
  { to: "/memories", label: "Add memory" },
] as const

export function QuickActions() {
  return (
    <section className="quick-actions" aria-label="Quick actions">
      <h2>Quick actions</h2>
      <div className="quick-grid">
        {ACTIONS.map((action) => (
          <Link key={action.to} className="quick-link" to={action.to}>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
