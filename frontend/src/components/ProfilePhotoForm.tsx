import { useRef, useState, type ChangeEvent } from "react"
import { UserAvatar } from "./UserAvatar"
import type { User } from "../types"

export function ProfilePhotoForm({
  user,
  loadBlob,
  onUpload,
  onRemove,
}: {
  user: User
  loadBlob: (userId: string) => Promise<Blob>
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP photo.")
      return
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("That photo is too large (max 5 MiB).")
      return
    }
    setError(null)
    setBusy(true)
    const local = URL.createObjectURL(file)
    setPreview(local)
    try {
      await onUpload(file)
      setPreview(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload photo.")
      setPreview(null)
    } finally {
      URL.revokeObjectURL(local)
      setBusy(false)
    }
  }

  async function handleRemove() {
    setError(null)
    setBusy(true)
    try {
      await onRemove()
      setPreview(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove photo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack profile-photo">
      <div className="profile-photo-row">
        {preview ? (
          <img className="avatar profile-avatar avatar-photo" src={preview} alt="" />
        ) : (
          <UserAvatar
            userId={user.id}
            name={user.display_name}
            avatarUrl={user.avatar_url}
            loadBlob={loadBlob}
            className="avatar profile-avatar"
          />
        )}
        <div className="stack tight">
          <p className="muted">JPEG, PNG, or WebP up to 5 MiB. Your partner can see this in your space.</p>
          <div className="row-actions">
            <button className="secondary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
              {user.avatar_url || preview ? "Change photo" : "Upload photo"}
            </button>
            {user.avatar_url || preview ? (
              <button className="secondary" type="button" disabled={busy} onClick={() => void handleRemove()}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => void handleFile(event)}
      />
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
