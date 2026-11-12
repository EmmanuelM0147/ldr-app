import jwt
from sqlalchemy import select

from app.models import User
from tests.conftest import register

SECRET = "test-secret-not-for-production-use"


def test_register_login_and_password_hash(client, db_factory) -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "Ada@Example.com",
            "password": "password123",
            "display_name": "Ada",
            "timezone": "Africa/Lagos",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "ada@example.com"
    assert body["expires_in"] == 3600
    payload = jwt.decode(body["access_token"], SECRET, algorithms=["HS256"])
    assert payload["exp"] - payload["iat"] == 3600

    with db_factory() as db:
        user = db.scalar(select(User).where(User.email == "ada@example.com"))
        assert user is not None
        assert user.password_hash != "password123"
        assert user.password_hash.startswith("$argon2id$")

    me = client.get("/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["display_name"] == "Ada"

    logged_in = client.post("/auth/login", json={"email": "ada@example.com", "password": "password123"})
    assert logged_in.status_code == 200
    wrong = client.post("/auth/login", json={"email": "ada@example.com", "password": "password999"})
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "Email or password is wrong."


def test_register_rejects_bad_input(client) -> None:
    short = client.post(
        "/auth/register",
        json={"email": "a@b.co", "password": "short", "display_name": "Ada", "timezone": "UTC"},
    )
    assert short.status_code == 422
    zone = client.post(
        "/auth/register",
        json={"email": "a@b.co", "password": "password123", "display_name": "Ada", "timezone": "Not/AZone"},
    )
    assert zone.status_code == 422
    token = register(client, "a@b.co")
    again = client.post(
        "/auth/register",
        json={"email": "a@b.co", "password": "password123", "display_name": "Ada", "timezone": "UTC"},
    )
    assert again.status_code == 409
    assert token


def test_me_requires_token(client) -> None:
    assert client.get("/me").status_code == 401
    assert isinstance(client.get("/me").json()["detail"], str)


def test_update_me_profile_and_password(client) -> None:
    token = register(client, "ada@example.com", timezone="UTC")
    headers = {"Authorization": f"Bearer {token}"}
    updated = client.patch(
        "/me",
        json={"display_name": "Ada Love", "timezone": "Africa/Lagos"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["display_name"] == "Ada Love"
    assert updated.json()["timezone"] == "Africa/Lagos"
    bad_pw = client.patch(
        "/me",
        json={"current_password": "password999", "new_password": "password456"},
        headers=headers,
    )
    assert bad_pw.status_code == 422
    changed = client.patch(
        "/me",
        json={"current_password": "password123", "new_password": "password456"},
        headers=headers,
    )
    assert changed.status_code == 200
    assert client.post("/auth/login", json={"email": "ada@example.com", "password": "password456"}).status_code == 200
    assert client.post("/auth/login", json={"email": "ada@example.com", "password": "password123"}).status_code == 401


def test_avatar_upload_partner_and_cross_couple_denial(client) -> None:
    from tests.conftest import auth

    owner = register(client, "ada@example.com")
    partner = register(client, "bello@example.com", name="Bello")
    other = register(client, "other@example.com", name="Other")
    assert client.post("/couples", headers=auth(owner)).status_code == 201
    invite = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    assert client.post("/couples/join", json={"code": invite}, headers=auth(partner)).status_code == 200
    assert client.post("/couples", headers=auth(other)).status_code == 201

    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    uploaded = client.post(
        "/me/avatar",
        files={"file": ("ada.png", png, "image/png")},
        headers=auth(owner),
    )
    assert uploaded.status_code == 200, uploaded.text
    me = uploaded.json()
    assert me["avatar_url"] == f"/users/{me['id']}/avatar"
    assert client.get(me["avatar_url"], headers=auth(owner)).status_code == 200
    assert client.get(me["avatar_url"], headers=auth(partner)).content.startswith(b"\x89PNG")
    assert client.get(me["avatar_url"], headers=auth(other)).status_code == 404
    bad = client.post(
        "/me/avatar",
        files={"file": ("clip.mp4", b"not-an-image", "video/mp4")},
        headers=auth(owner),
    )
    assert bad.status_code == 422
    removed = client.delete("/me/avatar", headers=auth(owner))
    assert removed.status_code == 200
    assert removed.json()["avatar_url"] is None
    assert client.get(me["avatar_url"], headers=auth(partner)).status_code == 404
