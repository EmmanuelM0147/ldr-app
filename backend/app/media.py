from __future__ import annotations

import shutil
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


def sniff_content_type(payload: bytes) -> str | None:
    """Return a supported media type from magic bytes, or None if unrecognized."""
    if len(payload) >= 3 and payload[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(payload) >= 8 and payload[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if (
        len(payload) >= 12
        and payload[:4] == b"RIFF"
        and payload[8:12] == b"WEBP"
    ):
        return "image/webp"
    if len(payload) >= 8 and payload[4:8] == b"ftyp":
        return "video/mp4"
    if len(payload) >= 4 and payload[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    return None


def _require_matching_magic(claimed: str | None, payload: bytes, *, images_only: bool) -> str:
    """SEC-06: reject uploads whose bytes do not match the declared Content-Type."""
    if images_only:
        if not claimed or claimed not in IMAGE_TYPES:
            raise HTTPException(status_code=422, detail="Use a JPEG, PNG, or WebP photo.")
    else:
        if not claimed or claimed not in ALLOWED:
            raise HTTPException(
                status_code=422,
                detail="Use a JPEG, PNG, WebP photo or an MP4/WebM video.",
            )
    sniffed = sniff_content_type(payload)
    if sniffed is None or sniffed != claimed:
        raise HTTPException(
            status_code=422,
            detail="That file does not match its type. Use a real JPEG, PNG, WebP, MP4, or WebM.",
        )
    return sniffed


async def save_memory_file(couple_id: uuid.UUID, upload: UploadFile) -> tuple[str, str, str, str]:
    payload = await upload.read()
    if len(payload) == 0:
        raise HTTPException(status_code=422, detail="The file is empty.")
    content_type = _require_matching_magic(upload.content_type, payload, images_only=False)
    kind, extension = ALLOWED[content_type]
    limit = IMAGE_MAX if kind == "image" else VIDEO_MAX
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
    return kind, content_type, filename[:255], relative


async def save_avatar_file(user_id: uuid.UUID, upload: UploadFile) -> tuple[str, str, str]:
    payload = await upload.read()
    if len(payload) == 0:
        raise HTTPException(status_code=422, detail="The file is empty.")
    content_type = _require_matching_magic(upload.content_type, payload, images_only=True)
    extension = IMAGE_TYPES[content_type][1]
    if len(payload) > AVATAR_MAX:
        raise HTTPException(status_code=422, detail="That photo is too large (max 5 MiB).")

    folder = media_root() / "avatars" / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    path = folder / stored_name
    path.write_bytes(payload)
    relative = f"avatars/{user_id}/{stored_name}"
    filename = upload.filename or stored_name
    return content_type, filename[:255], relative


def absolute_media_path(relative: str) -> Path:
    path = (media_root() / relative).resolve()
    if not str(path).startswith(str(media_root())):
        raise HTTPException(status_code=404, detail="Media not found.")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media not found.")
    return path


def delete_media_file(relative: str | None) -> None:
    """Delete a stored media file if it resolves under MEDIA_ROOT (no path escape)."""
    if not relative:
        return
    root = media_root()
    path = (root / relative).resolve()
    if not str(path).startswith(str(root)):
        return
    if path.is_file():
        path.unlink()


def purge_couple_media(couple_id: uuid.UUID) -> None:
    """Remove the on-disk folder for a couple's memory media (SEC-07)."""
    folder = media_root() / str(couple_id)
    if folder.is_dir():
        shutil.rmtree(folder)
