import { Link } from "react-router-dom"

export function BrandLockup({
  size = "header",
  to,
}: {
  size?: "header" | "auth"
  to?: string
}) {
  const className = `brand-lockup brand-lockup--${size}`
  const inner = (
    <>
      <img className="brand-mark" src="/icon.svg" alt="" width={48} height={48} />
      <span className="brand-word">Closer</span>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={className} aria-label="Closer home">
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
