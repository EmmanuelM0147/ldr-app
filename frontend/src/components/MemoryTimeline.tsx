import { formatWhen } from "../format"
import type { Memory } from "../types"
import { MemoryMediaView } from "./MemoryMedia"

export function onThisDay(memories: Memory[], now = new Date()): Memory[] {
  const month = now.getUTCMonth()
  const day = now.getUTCDate()
  return memories
    .filter((memory) => {
      const created = new Date(memory.created_at)
      return created.getUTCMonth() === month && created.getUTCDate() === day
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function MemoryTimeline({
  memories,
  currentUserId,
  timeZone,
  onDelete,
  loadMedia,
}: {
  memories: Memory[]
  currentUserId: string
  timeZone: string
  onDelete: (id: string) => void
  loadMedia?: (memoryId: string) => Promise<Blob>
}) {
  const sorted = [...memories].sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (sorted.length === 0) return <p className="muted">Nothing saved yet.</p>
  return (
    <ol className="timeline" aria-label="Memory timeline">
      {sorted.map((memory) => (
        <li key={memory.id} className="timeline-item">
          <article className="card timeline-card">
            <p className="kicker">{formatWhen(memory.created_at, timeZone)}</p>
            {memory.title ? <h3>{memory.title}</h3> : null}
            {memory.media ? (
              <MemoryMediaView media={memory.media} memoryId={memory.id} loadBlob={loadMedia} />
            ) : null}
            {memory.body ? <p>{memory.body}</p> : null}
            {memory.author_id === currentUserId ? (
              <button type="button" className="textish" onClick={() => onDelete(memory.id)}>
                Delete memory
              </button>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  )
}

export function OnThisDay({
  memories,
  timeZone,
  loadMedia,
}: {
  memories: Memory[]
  timeZone: string
  loadMedia?: (memoryId: string) => Promise<Blob>
}) {
  if (memories.length === 0) {
    return (
      <section className="card" aria-label="On this day">
        <h2>On this day</h2>
        <p className="muted">No memories from this date yet.</p>
      </section>
    )
  }
  return (
    <section className="card" aria-label="On this day">
      <h2>On this day</h2>
      <ul className="list compact">
        {memories.map((memory) => (
          <li key={memory.id}>
            {memory.title ? <strong>{memory.title}</strong> : null}
            {memory.media ? (
              <MemoryMediaView media={memory.media} memoryId={memory.id} loadBlob={loadMedia} />
            ) : null}
            {memory.body ? <p>{memory.body}</p> : null}
            <p className="muted">{formatWhen(memory.created_at, timeZone)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
