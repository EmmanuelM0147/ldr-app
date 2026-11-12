import { useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router-dom"

export function AvatarMenu({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const root = useRef<HTMLDivElement>(null)
  const initial = name.trim().charAt(0).toUpperCase() || "?"

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="avatar-menu" ref={root}>
      <button
        type="button"
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden>
          {initial}
        </span>
        <span className="sr-only">Account menu</span>
      </button>
      {open ? (
        <div className="avatar-panel" role="menu" id={menuId}>
          <p className="avatar-name">{name}</p>
          <Link role="menuitem" to="/settings" className="avatar-item" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button role="menuitem" type="button" className="avatar-item" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
