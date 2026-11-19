from app.media import absolute_media_path, safe_display_filename, sniff_content_type


PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
WEBP = b"RIFF" + (24).to_bytes(4, "little") + b"WEBPVP8 " + b"\x00" * 8
MP4 = b"\x00\x00\x00\x18ftypisom" + b"\x00" * 8
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 8


def test_sniff_content_type_known_magic() -> None:
    assert sniff_content_type(JPEG) == "image/jpeg"
    assert sniff_content_type(PNG) == "image/png"
    assert sniff_content_type(WEBP) == "image/webp"
    assert sniff_content_type(MP4) == "video/mp4"
    assert sniff_content_type(WEBM) == "video/webm"
    assert sniff_content_type(b"not-a-media-file") is None


def test_avatar_rejects_spoofed_jpeg_content_type(client) -> None:
    from tests.conftest import auth, register

    token = register(client, "ada@example.com")
    spoofed = client.post(
        "/me/avatar",
        files={"file": ("evil.jpg", b"not-really-jpeg", "image/jpeg")},
        headers=auth(token),
    )
    assert spoofed.status_code == 422
    assert "match" in spoofed.json()["detail"].lower()


def test_memory_rejects_spoofed_jpeg_content_type(client) -> None:
    from tests.conftest import auth, register

    token = register(client, "ada@example.com")
    assert client.post("/couples", headers=auth(token)).status_code == 201
    spoofed = client.post(
        "/memories/upload",
        data={"title": "Trip"},
        files={"file": ("evil.jpg", b"not-really-jpeg", "image/jpeg")},
        headers=auth(token),
    )
    assert spoofed.status_code == 422
    assert "match" in spoofed.json()["detail"].lower()


def test_avatar_accepts_real_png(client) -> None:
    from tests.conftest import auth, register

    token = register(client, "ada@example.com")
    ok = client.post(
        "/me/avatar",
        files={"file": ("ada.png", PNG, "image/png")},
        headers=auth(token),
    )
    assert ok.status_code == 200, ok.text


def test_delete_media_file_refuses_path_escape(tmp_path, monkeypatch) -> None:
    """Poisoned relative paths must not delete outside MEDIA_ROOT."""
    from fastapi import HTTPException

    from app.media import delete_media_file, media_root

    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path / "media"))
    root = media_root()
    outside = tmp_path / "secret.txt"
    outside.write_text("keep me", encoding="utf-8")
    delete_media_file("../secret.txt")
    assert outside.is_file()
    # Also refuse absolute-style escapes that resolve outside the root.
    delete_media_file("../../secret.txt")
    assert outside.is_file()
    assert root.is_dir()
    try:
        absolute_media_path("../secret.txt")
        assert False, "expected 404 for path escape"
    except HTTPException as exc:
        assert exc.status_code == 404


def test_safe_display_filename_strips_path_segments() -> None:
    assert safe_display_filename("../../evil.jpg", "fallback.jpg") == "evil.jpg"
    assert safe_display_filename("..", "fallback.jpg") == "fallback.jpg"
    assert safe_display_filename(None, "fallback.jpg") == "fallback.jpg"


def test_avatar_rejects_oversize_payload(client) -> None:
    """SEC-12: oversize avatar → 422."""
    from app.media import AVATAR_MAX
    from tests.conftest import auth, register

    token = register(client, "ada@example.com")
    huge = b"\xff\xd8\xff" + b"\x00" * (AVATAR_MAX + 1)
    response = client.post(
        "/me/avatar",
        files={"file": ("big.jpg", huge, "image/jpeg")},
        headers=auth(token),
    )
    assert response.status_code == 422
    assert "large" in response.json()["detail"].lower()
