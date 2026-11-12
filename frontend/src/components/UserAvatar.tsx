import { useEffect, useState } from "react"

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  loadBlob,
  className = "avatar",
}: {
  userId: string
  name: string
  avatarUrl: string | null
  loadBlob?: (userId: string) => Promise<Blob>
  className?: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const initial = name.trim().charAt(0).toUpperCase() || "?"

  useEffect(() => {
    if (!avatarUrl || !loadBlob) {
      setSrc(null)
      return
    }
    let revoked: string | null = null
    let cancelled = false
    void loadBlob(userId)
      .then((blob) => {
        if (cancelled) return
        revoked = URL.createObjectURL(blob)
        setSrc(revoked)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [avatarUrl, loadBlob, userId])

  if (src) {
    return <img className={`${className} avatar-photo`} src={src} alt="" />
  }
  return (
    <span className={className} aria-hidden>
      {initial}
    </span>
  )
}
