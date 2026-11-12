export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="state muted" role="status">
      {label}
    </p>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="state empty" aria-label={title}>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
    </section>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="error state" role="alert">
      {message}
    </p>
  )
}
