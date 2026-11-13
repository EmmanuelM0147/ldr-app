import { countdownParts, formatMoney, formatWhen } from "../format"
import type { Member, Visit } from "../types"

export function VisitCard({
  visit,
  members,
  timeZone,
  now = new Date(),
  onRemove,
}: {
  visit: Visit
  members: Member[]
  timeZone: string
  now?: Date
  onRemove?: () => void
}) {
  const traveler = members.find((member) => member.user_id === visit.traveler_user_id)
  const seconds = Math.floor((new Date(visit.starts_at).getTime() - now.getTime()) / 1000)
  const chip =
    seconds > 0
      ? (() => {
          const parts = countdownParts(seconds)
          return `${parts.value} ${parts.unit}`
        })()
      : seconds > -86_400
        ? "This visit"
        : "Past"

  return (
    <article className="card visit-card">
      <div className="visit-card-top">
        <div>
          <p className="kicker">{visit.location ? `Route · ${visit.location}` : "Route · TBD"}</p>
          <h2>{visit.title}</h2>
        </div>
        <span className={`chip ${seconds > 0 ? "chip-soon" : "chip-muted"}`}>{chip}</span>
      </div>
      <p className="muted">
        {formatWhen(visit.starts_at, timeZone)} - {formatWhen(visit.ends_at, timeZone)}
      </p>
      <p>Traveler: {traveler?.display_name ?? "Not set"}</p>
      {visit.budget ? (
        <p className="muted">
          Split {formatMoney(visit.budget.total_minor, visit.budget.currency)} ·{" "}
          {visit.budget.shares
            .map((share) => {
              const name = members.find((member) => member.user_id === share.user_id)?.display_name ?? "Partner"
              return `${name} ${formatMoney(share.amount_minor, visit.budget!.currency)}`
            })
            .join(" / ")}
        </p>
      ) : (
        <p className="muted">No cost split yet.</p>
      )}
      {onRemove ? (
        <button className="textish" type="button" onClick={onRemove}>
          Remove
        </button>
      ) : null}
    </article>
  )
}
