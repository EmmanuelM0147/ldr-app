import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react"

export const MEMORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const MEMORY_VIDEO_TYPES = ["video/mp4", "video/webm"] as const
export const MEMORY_IMAGE_MAX = 10 * 1024 * 1024
export const MEMORY_VIDEO_MAX = 40 * 1024 * 1024

export type MemoryFileCheck =
  | { ok: true; file: File }
  | { ok: false; error: string }

export function validateMemoryFile(file: File): MemoryFileCheck {
  const isImage = (MEMORY_IMAGE_TYPES as readonly string[]).includes(file.type)
  const isVideo = (MEMORY_VIDEO_TYPES as readonly string[]).includes(file.type)
  if (!isImage && !isVideo) {
    return { ok: false, error: "Use JPEG, PNG, WebP, MP4, or WebM." }
  }
  const max = isImage ? MEMORY_IMAGE_MAX : MEMORY_VIDEO_MAX
  if (file.size > max) {
    return {
      ok: false,
      error: isImage ? "That photo is too large (max 10 MiB)." : "That video is too large (max 40 MiB).",
    }
  }
  return { ok: true, file }
}

export function MemoryDropZone({
  name = "media",
  onFileChange,
}: {
  name?: string
  onFileChange?: (file: File | null, error: string | null) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function applyFile(next: File | null) {
    if (!next) {
      setFile(null)
      setError(null)
      onFileChange?.(null, null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    const checked = validateMemoryFile(next)
    if (!checked.ok) {
      setFile(null)
      setError(checked.error)
      onFileChange?.(null, checked.error)
      if (inputRef.current) inputRef.current.value = ""
      return
    }
    setFile(checked.file)
    setError(null)
    onFileChange?.(checked.file, null)
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0] ?? null)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    applyFile(event.dataTransfer.files?.[0] ?? null)
  }

  return (
    <div className="memory-drop">
      <label
        className={["memory-drop-zone", dragging ? "is-dragging" : "", error ? "has-error" : ""]
          .filter(Boolean)
          .join(" ")}
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="memory-drop-input"
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={onInputChange}
        />
        {previewUrl ? (
          <img className="memory-drop-preview" src={previewUrl} alt="Selected photo preview" />
        ) : (
          <span className="memory-drop-copy">
            <strong>{file ? file.name : "Drop a photo or video"}</strong>
            <span>or click to choose · JPEG/PNG/WebP 10 MiB · MP4/WebM 40 MiB</span>
          </span>
        )}
      </label>
      {file && previewUrl ? (
        <p className="muted memory-drop-name">
          {file.name}{" "}
          <button className="textish" type="button" onClick={() => applyFile(null)}>
            Remove
          </button>
        </p>
      ) : null}
      {file && !previewUrl ? (
        <p className="muted memory-drop-name">
          {file.name}{" "}
          <button className="textish" type="button" onClick={() => applyFile(null)}>
            Remove
          </button>
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
