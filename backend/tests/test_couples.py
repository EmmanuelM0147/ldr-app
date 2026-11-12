from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import Event, Invite, User
from app.security import hash_invite_code
from tests.conftest import auth, register


def test_create_invite_join_and_reject_a_third(client, db_factory) -> None:
    owner = register(client, "ada@example.com", name="Ada")
    assert client.post("/couples").status_code == 401
    created = client.post("/couples", headers=auth(owner))
    assert created.status_code == 201
    assert created.json()["id"]
    assert len(created.json()["members"]) == 1
    again = client.post("/couples", headers=auth(owner))
    assert again.status_code == 409

    invite = client.post("/couples/current/invites", headers=auth(owner))
    assert invite.status_code == 201
    code = invite.json()["code"]
    expires = datetime.fromisoformat(invite.json()["expires_at"])
    assert timedelta(days=6, hours=23) < expires - datetime.now(UTC) < timedelta(days=7, hours=1)
    with db_factory() as db:
        row = db.scalar(select(Invite).where(Invite.code_hash == hash_invite_code(code)))
        assert row is not None
        assert row.code_hash != code

    partner = register(client, "bello@example.com", name="Bello")
    joined = client.post("/couples/join", json={"code": code}, headers=auth(partner))
    assert joined.status_code == 200
    assert len(joined.json()["members"]) == 2

    outsider = register(client, "chi@example.com", name="Chi")
    third = client.post("/couples/join", json={"code": code}, headers=auth(outsider))
    assert third.status_code == 409

    client.post("/couples", headers=auth(outsider))
    other_code = client.post("/couples/current/invites", headers=auth(outsider)).json()["code"]
    already = client.post("/couples/join", json={"code": other_code}, headers=auth(owner))
    assert already.status_code == 409


def test_invite_rate_limit_and_bad_codes(client, db_factory) -> None:
    owner = register(client, "ada@example.com")
    client.post("/couples", headers=auth(owner))
    for _ in range(5):
        assert client.post("/couples/current/invites", headers=auth(owner)).status_code == 201
    limited = client.post("/couples/current/invites", headers=auth(owner))
    assert limited.status_code == 429

    partner = register(client, "bello@example.com", name="Bello")
    for _ in range(10):
        failed = client.post("/couples/join", json={"code": "not-a-real-code"}, headers=auth(partner))
        assert failed.status_code == 400
    blocked = client.post("/couples/join", json={"code": "not-a-real-code"}, headers=auth(partner))
    assert blocked.status_code == 429


def test_expired_and_reused_codes(client, db_factory) -> None:
    owner = register(client, "ada@example.com")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    with db_factory() as db:
        invite = db.scalar(select(Invite).where(Invite.code_hash == hash_invite_code(code)))
        assert invite is not None
        invite.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    partner = register(client, "bello@example.com", name="Bello")
    expired = client.post("/couples/join", json={"code": code}, headers=auth(partner))
    assert expired.status_code == 400

    fresh = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    with db_factory() as db:
        invite = db.scalar(select(Invite).where(Invite.code_hash == hash_invite_code(fresh)))
        assert invite is not None
        invite.used_at = datetime.now(UTC)
        db.commit()
    reused = client.post("/couples/join", json={"code": fresh}, headers=auth(partner))
    assert reused.status_code == 400


def test_delete_keeps_users_and_other_couple(client, db_factory) -> None:
    owner = register(client, "ada@example.com", name="Ada")
    partner = register(client, "bello@example.com", name="Bello")
    other = register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    client.post("/couples/join", json={"code": code}, headers=auth(partner))
    client.post(
        "/events",
        json={"title": "Ours", "starts_at": "2026-12-01T10:00:00Z"},
        headers=auth(owner),
    )
    client.post("/couples", headers=auth(other))
    client.post(
        "/events",
        json={"title": "Theirs", "starts_at": "2026-12-02T10:00:00Z"},
        headers=auth(other),
    )

    lonely = register(client, "dapo@example.com", name="Dapo")
    assert client.delete("/couples/current", headers=auth(lonely)).status_code == 404

    deleted = client.delete("/couples/current", headers=auth(partner))
    assert deleted.status_code == 204
    assert client.get("/me", headers=auth(owner)).status_code == 200
    assert client.get("/me", headers=auth(partner)).status_code == 200
    with db_factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 4
        titles = db.scalars(select(Event.title)).all()
    assert titles == ["Theirs"]
    assert client.get("/events", headers=auth(other)).json()[0]["title"] == "Theirs"
