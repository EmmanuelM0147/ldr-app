import { useEffect, useState } from "react"
import { moodLabel } from "../mood"
import type { CheckIn, Member, Presence } from "../types"
import { UserAvatar } from "./UserAvatar"

function cityFromTimezone(timezone: string): string {
  const leaf = timezone.split("/").pop() ?? timezone
  return leaf.replaceAll("_", " ")
}

function localTime(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now)
}

export function PartnerHomeCards({
  members,
  presence,
  checkIns,
  viewerId,
  loadAvatar,
  onTogglePresence,
}: {
  members: Member[]
  presence: Presence[]
  checkIns: CheckIn[]
  viewerId: string
  loadAvatar?: (userId: string) => Promise<Blob>
  onTogglePresence: (freeToTalk: boolean) => void
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="pair" aria-label="You and your partner">
      {members.map((member, index) => {
        const free = presence.find((item) => item.user_id === member.user_id)?.free_to_talk ?? false
        const mood =
          [...checkIns]
            .filter((item) => item.user_id === member.user_id)
            .sort((a, b) => b.local_date.localeCompare(a.local_date))[0]?.mood ?? null
        const mine = member.user_id === viewerId
        const accent = index % 2 === 0 ? "partner-a" : "partner-b"
        return (
          <article key={member.user_id} className={`card partner-card ${accent}`}>
            <div className="partner-head">
              <UserAvatar
                userId={member.user_id}
                name={member.display_name}
                avatarUrl={member.avatar_url}
                loadBlob={loadAvatar}
                className={`avatar partner-avatar ${accent}`}
              />
              <div className="partner-meta">
                <h2>{member.display_name}</h2>
                <p className="muted partner-place">{cityFromTimezone(member.timezone)}</p>
              </div>
            </div>

            <dl className="partner-facts">
              <div className="partner-fact">
                <dt>Local time</dt>
                <dd className="partner-time" aria-live="polite">
                  {localTime(member.timezone, now)}
                </dd>
              </div>
              <div className="partner-fact">
                <dt>Status</dt>
                <dd className="partner-status">
                  <i className={free ? "dot on" : "dot"} aria-hidden />
                  <span>{free ? "Free to talk" : "Busy"}</span>
                </dd>
              </div>
              <div className="partner-fact">
                <dt>Latest mood</dt>
                <dd>{mood ? moodLabel(mood) : "None yet"}</dd>
              </div>
            </dl>

            {mine ? (
              <button className="secondary partner-presence-btn" type="button" onClick={() => onTogglePresence(!free)}>
                {free ? "Mark busy" : "I'm free"}
              </button>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
