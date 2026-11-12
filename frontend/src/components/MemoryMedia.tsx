import { useEffect, useState } from "react"
import type { MemoryMedia as Media } from "../types"

export function MemoryMediaView({
  media,
  memoryId,
  loadBlob,
}: {
  media: Media
  memoryId: string
  loadBlob?: (memoryId: string) => Promise<Blob>
}) {
  const [src, setSrc] = useState<string | null>(() => (media.url.startsWith("data:") ? media.url : null))

  useEffect(() => {
    if (media.url.startsWith("data:")) {
      setSrc(media.url)
      return
    }
    if (!loadBlob) return
    let active = true
    let objectUrl: string | null = null
    void loadBlob(memoryId)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (active) setSrc(null)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [loadBlob, media.url, memoryId])

  if (!src) return <p className="muted">Loading media…</p>
  if (media.kind === "video") {
    return <video className="memory-media" controls src={src} aria-label={media.filename} />
  }
  return <img className="memory-media" src={src} alt={media.filename} />
}
