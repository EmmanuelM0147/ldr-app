import json

from fastapi import WebSocketDisconnect

from tests.conftest import auth, register


def _couple(client, owner: str, partner_email: str, partner_name: str) -> str:
    created = client.post("/couples", headers=auth(owner))
    assert created.status_code == 201
    invite = client.post("/couples/current/invites", headers=auth(owner))
    assert invite.status_code == 201
    partner = register(client, partner_email, name=partner_name)
    joined = client.post("/couples/join", json={"code": invite.json()["code"]}, headers=auth(partner))
    assert joined.status_code == 200
    return partner


def test_presence_is_visible_to_the_couple_only(client) -> None:
    ada = register(client, "ada@example.com", name="Ada")
    bello = _couple(client, ada, "bello@example.com", "Bello")
    chi = register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(chi))

    denied = client.get("/presence")
    assert denied.status_code == 401
    alone = client.get("/presence", headers=auth(chi))
    assert alone.status_code == 200
    assert alone.json()["members"][0]["free_to_talk"] is False

    updated = client.put("/presence", json={"free_to_talk": True}, headers=auth(ada))
    assert updated.status_code == 200
    flags = {item["user_id"]: item["free_to_talk"] for item in updated.json()["members"]}
    ada_id = client.get("/me", headers=auth(ada)).json()["id"]
    assert flags[ada_id] is True

    seen = client.get("/presence", headers=auth(bello))
    assert seen.status_code == 200
    assert {item["user_id"]: item["free_to_talk"] for item in seen.json()["members"]}[ada_id] is True

    hidden = client.get("/presence", headers=auth(chi))
    assert ada_id not in {item["user_id"] for item in hidden.json()["members"]}


def _expect_closed(socket) -> None:
    try:
        socket.receive_text()
    except WebSocketDisconnect as exc:
        assert exc.code == 1008
        return
    raise AssertionError("socket stayed open")


def test_socket_rejects_a_missing_token(client) -> None:
    with client.websocket_connect("/ws") as socket:
        socket.send_text("{}")
        _expect_closed(socket)


def test_socket_rejects_a_bad_token(client) -> None:
    with client.websocket_connect("/ws") as socket:
        socket.send_text('{"token":"not-a-jwt"}')
        _expect_closed(socket)


def test_websocket_disconnect_clears_free_to_talk(client) -> None:
    """FUNC-15: closing the live socket must not leave free_to_talk sticky."""
    ada = register(client, "ada@example.com", name="Ada")
    bello = _couple(client, ada, "bello@example.com", "Bello")
    ada_id = client.get("/me", headers=auth(ada)).json()["id"]
    assert client.put("/presence", json={"free_to_talk": True}, headers=auth(ada)).status_code == 200

    with client.websocket_connect("/ws") as socket:
        socket.send_text(json.dumps({"token": ada}))
        # Partner sees Ada free while connected.
        listed = client.get("/presence", headers=auth(bello)).json()
        assert {item["user_id"]: item["free_to_talk"] for item in listed["members"]}[ada_id] is True

    after = client.get("/presence", headers=auth(bello)).json()
    assert {item["user_id"]: item["free_to_talk"] for item in after["members"]}[ada_id] is False


def test_stale_free_to_talk_is_cleared_by_ttl(client, db_factory) -> None:
    """FUNC-15: free_to_talk older than the TTL is treated as offline."""
    import uuid
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.models import Presence

    ada = register(client, "ada@example.com", name="Ada")
    bello = _couple(client, ada, "bello@example.com", "Bello")
    ada_id = client.get("/me", headers=auth(ada)).json()["id"]
    assert client.put("/presence", json={"free_to_talk": True}, headers=auth(ada)).status_code == 200
    with db_factory() as db:
        row = db.scalar(select(Presence).where(Presence.user_id == uuid.UUID(ada_id)))
        assert row is not None
        row.updated_at = datetime.now(UTC) - timedelta(minutes=31)
        db.commit()

    listed = client.get("/presence", headers=auth(bello)).json()
    assert {item["user_id"]: item["free_to_talk"] for item in listed["members"]}[ada_id] is False


def test_partner_joined_is_pushed_only_inside_the_couple(client) -> None:
    ada = register(client, "ada@example.com", name="Ada")
    assert client.post("/couples", headers=auth(ada)).status_code == 201
    invite = client.post("/couples/current/invites", headers=auth(ada))
    assert invite.status_code == 201
    bello = register(client, "bello@example.com", name="Bello")
    chi = register(client, "chi@example.com", name="Chi")
    assert client.post("/couples", headers=auth(chi)).status_code == 201
    bello_id = client.get("/me", headers=auth(bello)).json()["id"]

    with client.websocket_connect("/ws") as waiting, client.websocket_connect("/ws") as outsider:
        waiting.send_text(json.dumps({"token": ada}))
        outsider.send_text(json.dumps({"token": chi}))
        joined = client.post(
            "/couples/join",
            json={"code": invite.json()["code"]},
            headers=auth(bello),
        )
        assert joined.status_code == 200
        frames = [waiting.receive_json(), waiting.receive_json()]
        types = {frame["type"] for frame in frames}
        assert "partner_joined" in types
        live = next(frame for frame in frames if frame["type"] == "partner_joined")
        assert len(live["couple"]["members"]) == 2
        assert any(item["user_id"] == bello_id for item in live["couple"]["members"])
        # Outsider only sees their own couple traffic; Ada's join must not appear.
        other = client.put("/presence", json={"free_to_talk": True}, headers=auth(chi))
        assert other.status_code == 200
        leaked = outsider.receive_json()
        assert leaked["type"] == "presence"
        assert bello_id not in {item["user_id"] for item in leaked["members"]}


def test_socket_stays_inside_the_couple(client) -> None:
    ada = register(client, "ada@example.com", name="Ada")
    bello = _couple(client, ada, "bello@example.com", "Bello")
    chi = register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(chi))
    ada_id = client.get("/me", headers=auth(ada)).json()["id"]

    with client.websocket_connect("/ws") as partner, client.websocket_connect("/ws") as outsider:
        partner.send_text(json.dumps({"token": bello}))
        outsider.send_text(json.dumps({"token": chi}))
        presence = client.put("/presence", json={"free_to_talk": True}, headers=auth(ada))
        assert presence.status_code == 200
        live = partner.receive_json()
        assert live["type"] == "presence"
        assert any(item["user_id"] == ada_id and item["free_to_talk"] for item in live["members"])

        check_in = client.put(
            "/check-ins/today",
            json={"mood": "good", "note": "Kitchen is quiet."},
            headers=auth(ada),
        )
        assert check_in.status_code == 200
        update = partner.receive_json()
        assert update["type"] == "check_in"
        assert update["check_in"]["mood"] == "good"
        assert update["check_in"]["note"] == "Kitchen is quiet."

        other = client.put("/presence", json={"free_to_talk": True}, headers=auth(chi))
        assert other.status_code == 200
        leaked = outsider.receive_json()
        assert leaked["type"] == "presence"
        assert ada_id not in {item["user_id"] for item in leaked["members"]}
