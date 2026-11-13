import { moodLabel } from "../mood"
import { partnerAccent } from "../partnerAccent"
import type { CheckIn, Member } from "../types"

export function PartnerTodayCards({
  members,
  items,
  today,
}: {
  members: Member[]
  items: CheckIn[]
  today: string
}) {
  return (
    <section className="pair" aria-label="Both check-ins today">
      {members.map((member) => {
        const entry = items.find((item) => item.user_id === member.user_id && item.local_date === today) ?? null
        const accent = partnerAccent(
          member.user_id,
          members.map((item) => item.user_id),
        )
        return (
          <article key={member.user_id} className={`card partner-card ${accent}`}>
            <div className="partner-head">
              <span className={`avatar partner-avatar ${accent}`} aria-hidden>
                {member.display_name.slice(0, 1).toUpperCase()}
              </span>
              <p className="kicker">{member.display_name}</p>
            </div>
            {entry ? (
              <>
                <h2>{moodLabel(entry.mood)}</h2>
                {entry.note ? <p>{entry.note}</p> : <p className="muted">No note.</p>}
              </>
            ) : (
              <p className="muted">No check-in yet today.</p>
            )}
          </article>
        )
      })}
    </section>
  )
}
