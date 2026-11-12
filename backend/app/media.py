from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import get_settings

IMAGE_TYPES = {
    "image/jpeg": ("image", ".jpg"),
    "image/png": ("image", ".png"),
    "image/webp": ("image", ".webp"),
}
VIDEO_TYPES = {
    "video/mp4": ("video", ".mp4"),
    "video/webm": ("video", ".webm"),
}
ALLOWED = {**IMAGE_TYPES, **VIDEO_TYPES}
IMAGE_MAX = 10 * 1024 * 1024
VIDEO_MAX = 40 * 1024 * 1024
AVATAR_MAX = 5 * 1024 * 1024


def media_root() -> Path:
    root = Path(get_settings().media_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def classify_upload(content_type: str | None) -> tuple[str, str]:
    if not content_type or content_type not in ALLOWED:
        raise HTTPException(
            status_code=422,
            detail="Use a JPEG, PNG, WebP photo or an MP4/WebM video.",
        )
    return ALLOWED[content_type]


def classify_image(content_type: str | None) -> str:
    if not content_type or content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Use a JPEG, PNG, or WebP photo.")
    return IMAGE_TYPES[content_type][1]


async def save_memory_file(couple_id: uuid.UUID, upload: UploadFile) -> tuple[str, str, str, str]:
    kind, extension = classify_upload(upload.content_type)
    payload = await upload.read()
    limit = IMAGE_MAX if kind == "image" else VIDEO_MAX
    if len(payload) == 0:
        raise HTTPException(status_code=422, detail="The file is empty.")
    if len(payload) > limit:
        label = "10 MiB" if kind == "image" else "40 MiB"
        raise HTTPException(status_code=422, detail=f"That file is too large (max {label}).")

    folder = media_root() / str(couple_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    path = folder / stored_name
    path.write_bytes(payload)
    relative = f"{couple_id}/{stored_name}"
    filename = upload.filename or stored_name
    content_type = upload.content_type or "application/octet-stream"
    return kind, content_type, filename[:255], relative


async def save_avatar_file(user_id: uuid.UUID, upload: UploadFile) -> tuple[str, str, str]:
    extension = classify_image(upload.content_type)
    payload = await upload.read()
    if len(payload) == 0:
        raise HTTPException(status_code=422, detail="The file is empty.")
    if len(payload) > AVATAR_MAX:
        raise HTTPException(status_code=422, detail="That photo is too large (max 5 MiB).")

    folder = media_root() / "avatars" / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    path = folder / stored_name
    path.write_bytes(payload)
    relative = f"avatars/{user_id}/{stored_name}"
    filename = upload.filename or stored_name
    content_type = upload.content_type or "application/octet-stream"
    return content_type, filename[:255], relative


def absolute_media_path(relative: str) -> Path:
    path = (media_root() / relative).resolve()
    if not str(path).startswith(str(media_root())):
        raise HTTPException(status_code=404, detail="Media not found.")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media not found.")
    return path


def delete_media_file(relative: str | None) -> None:
    if not relative:
        return
    path = media_root() / relative
    if path.is_file():
        path.unlink()
