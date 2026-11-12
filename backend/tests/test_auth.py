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
