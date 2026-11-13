from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.models import Event, Invite, Membership, User
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


def test_db_rejects_third_membership_for_couple(client, db_factory) -> None:
    """SEC-02: memberships must be capped at two seats even if join checks race."""
    from datetime import datetime

    from sqlalchemy.exc import IntegrityError

    owner = register(client, "ada@example.com", name="Ada")
    register(client, "bello@example.com", name="Bello")
    register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(owner))
    now = datetime.now(UTC)
    with db_factory() as db:
        couple_id = db.scalar(select(Membership.couple_id))
        assert couple_id is not None
        bello = db.scalar(select(User).where(User.email == "bello@example.com"))
        chi = db.scalar(select(User).where(User.email == "chi@example.com"))
        assert bello is not None and chi is not None
        db.add(Membership(couple_id=couple_id, user_id=bello.id, joined_at=now, seat=2))
        db.commit()
        db.add(Membership(couple_id=couple_id, user_id=chi.id, joined_at=now, seat=2))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        assert db.scalar(select(func.count()).select_from(Membership)) == 2


def test_concurrent_join_same_invite_caps_at_two_members(client, db_factory) -> None:
    """SEC-02: two clients racing on one unused invite must not create a third member."""
    owner = register(client, "ada@example.com", name="Ada")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    partner_a = register(client, "bello@example.com", name="Bello")
    partner_b = register(client, "chi@example.com", name="Chi")

    def attempt(token: str) -> int:
        return client.post("/couples/join", json={"code": code}, headers=auth(token)).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(attempt, partner_a), pool.submit(attempt, partner_b)]
        statuses = sorted(future.result() for future in as_completed(futures))

    assert statuses.count(200) == 1, statuses
    assert statuses[0] == 200
    assert statuses[1] in {400, 409}, statuses
    with db_factory() as db:
        count = db.scalar(select(func.count()).select_from(Membership))
    assert count == 2


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


def _delete_couple(client, token: str, confirm: str | None = "DELETE"):
    """Starlette TestClient.delete() has no json=; use request() for the body."""
    if confirm is None:
        return client.request("DELETE", "/couples/current", headers=auth(token))
    return client.request(
        "DELETE", "/couples/current", headers=auth(token), json={"confirm": confirm}
    )


def test_delete_requires_typed_confirm_body(client) -> None:
    """SEC-05: API delete without confirm=DELETE must not succeed."""
    owner = register(client, "ada@example.com", name="Ada")
    client.post("/couples", headers=auth(owner))

    missing = _delete_couple(client, owner, confirm=None)
    assert missing.status_code == 422

    wrong = _delete_couple(client, owner, confirm="delete")
    assert wrong.status_code == 422
    assert client.get("/couples/current", headers=auth(owner)).status_code == 200

    ok = _delete_couple(client, owner)
    assert ok.status_code == 204
    assert client.get("/couples/current", headers=auth(owner)).status_code == 404


def test_delete_notifies_partner_over_websocket(client) -> None:
    """FUNC-22: remaining partner gets couple_gone so the UI can clear the space."""
    import json

    owner = register(client, "ada@example.com", name="Ada")
    partner = register(client, "bello@example.com", name="Bello")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    client.post("/couples/join", json={"code": code}, headers=auth(partner))

    with client.websocket_connect("/ws") as socket:
        socket.send_text(json.dumps({"token": partner}))
        deleted = _delete_couple(client, owner)
        assert deleted.status_code == 204
        event = socket.receive_json()
        assert event == {"type": "couple_gone"}

    assert client.get("/couples/current", headers=auth(partner)).status_code == 404


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
    assert _delete_couple(client, lonely).status_code == 404

    deleted = _delete_couple(client, partner)
    assert deleted.status_code == 204
    assert client.get("/me", headers=auth(owner)).status_code == 200
    assert client.get("/me", headers=auth(partner)).status_code == 200
    with db_factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 4
        titles = db.scalars(select(Event.title)).all()
    assert titles == ["Theirs"]
    assert client.get("/events", headers=auth(other)).json()[0]["title"] == "Theirs"


def test_update_couple_ai_opt_in(client) -> None:
    owner = register(client, "ada@example.com")
    partner = register(client, "bello@example.com", name="Bello")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    client.post("/couples/join", json={"code": code}, headers=auth(partner))
    assert client.get("/couples/current", headers=auth(owner)).json()["ai_opt_in"] is False
    enabled = client.patch("/couples/current", json={"ai_opt_in": True}, headers=auth(partner))
    assert enabled.status_code == 200
    assert enabled.json()["ai_opt_in"] is True
    assert client.get("/couples/current", headers=auth(owner)).json()["ai_opt_in"] is True
    disabled = client.patch("/couples/current", json={"ai_opt_in": False}, headers=auth(owner))
    assert disabled.status_code == 200
    assert disabled.json()["ai_opt_in"] is False
