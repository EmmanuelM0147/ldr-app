import { Link } from "react-router-dom"
import { countdownParts, formatWhen } from "../format"
import type { Countdown } from "../types"

export function HomeHero({ countdown, timeZone }: { countdown: Countdown | null; timeZone: string }) {
  if (!countdown || !countdown.visit || countdown.seconds_until === null) {
    return (
      <section className="hero home-hero home-hero--empty" aria-label="Next visit">
        <p className="kicker">Next visit</p>
        <h1>No visit planned yet</h1>
        <p className="muted">Add one to start the countdown.</p>
        <Link className="primary home-cta" to="/visits">
          Plan a visit
        </Link>
      </section>
    )
  }

  const parts = countdownParts(countdown.seconds_until)
  return (
    <section className="hero home-hero" aria-label="Next visit">
      <p className="kicker">Next visit</p>
      <p className="countdown-num">{parts.value}</p>
      <p className="countdown-unit">{parts.unit} until you are together</p>
      <h2>{countdown.visit.title}</h2>
      <p className="muted">
        {formatWhen(countdown.visit.starts_at, timeZone)}
        {countdown.visit.location ? ` · ${countdown.visit.location}` : ""}
      </p>
      <Link className="textish" to="/visits">
        View visits
      </Link>
    </section>
  )
}
