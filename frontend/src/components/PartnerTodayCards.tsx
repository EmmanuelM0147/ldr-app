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
        return (
          <article key={member.user_id} className="card">
            <p className="kicker">{member.display_name}</p>
            {entry ? (
              <>
                <h2>{entry.mood}</h2>
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
