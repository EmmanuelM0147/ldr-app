import json

from tests.conftest import auth, register


def _pair(client) -> tuple[str, str]:
    ada = register(client, "ada@example.com", name="Ada")
    assert client.post("/couples", headers=auth(ada)).status_code == 201
    invite = client.post("/couples/current/invites", headers=auth(ada))
    assert invite.status_code == 201
    bello = register(client, "bello@example.com", name="Bello")
    joined = client.post("/couples/join", json={"code": invite.json()["code"]}, headers=auth(bello))
    assert joined.status_code == 200
    return ada, bello


def test_partner_join_creates_notification_for_waiting_member(client) -> None:
    ada = register(client, "ada@example.com", name="Ada")
    assert client.post("/couples", headers=auth(ada)).status_code == 201
    invite = client.post("/couples/current/invites", headers=auth(ada))
    bello = register(client, "bello@example.com", name="Bello")
    with client.websocket_connect("/ws") as waiting:
        waiting.send_text(json.dumps({"token": ada}))
        joined = client.post(
            "/couples/join",
            json={"code": invite.json()["code"]},
            headers=auth(bello),
        )
        assert joined.status_code == 200
        first = waiting.receive_json()
        second = waiting.receive_json()
        types = {first["type"], second["type"]}
        assert types == {"partner_joined", "notification"}
        note = first if first["type"] == "notification" else second
        assert note["notification"]["kind"] == "partner_joined"
        assert "Bello" in note["notification"]["body"]

    listed = client.get("/notifications", headers=auth(ada))
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["kind"] == "partner_joined"
    assert client.get("/notifications", headers=auth(bello)).json() == []


def test_notifications_are_couple_scoped_and_markable(client) -> None:
    ada, bello = _pair(client)
    chi = register(client, "chi@example.com", name="Chi")
    assert client.post("/couples", headers=auth(chi)).status_code == 201

    check_in = client.put(
        "/check-ins/today",
        json={"mood": "good", "note": "Hi"},
        headers=auth(bello),
    )
    assert check_in.status_code == 200
    for_ada = client.get("/notifications", headers=auth(ada)).json()
    assert any(item["kind"] == "check_in" for item in for_ada)
    note_id = next(item["id"] for item in for_ada if item["kind"] == "check_in")

    denied = client.post(f"/notifications/{note_id}/read", headers=auth(chi))
    assert denied.status_code == 404

    read = client.post(f"/notifications/{note_id}/read", headers=auth(ada))
    assert read.status_code == 200
    assert read.json()["read_at"] is not None

    assert client.post("/notifications/read-all", headers=auth(ada)).status_code == 204
    remaining = client.get("/notifications", headers=auth(ada)).json()
    assert all(item["read_at"] is not None for item in remaining)


def test_event_and_visit_notify_partner(client) -> None:
    ada, bello = _pair(client)
    event = client.post(
        "/events",
        json={
            "title": "Call",
            "starts_at": "2030-01-01T18:00:00Z",
            "ends_at": "2030-01-01T19:00:00Z",
        },
        headers=auth(ada),
    )
    assert event.status_code == 201
    visit = client.post(
        "/visits",
        json={
            "title": "Lagos trip",
            "starts_at": "2030-02-01T10:00:00Z",
            "ends_at": "2030-02-05T10:00:00Z",
        },
        headers=auth(ada),
    )
    assert visit.status_code == 201
    kinds = {item["kind"] for item in client.get("/notifications", headers=auth(bello)).json()}
    assert "event_created" in kinds
    assert "visit_created" in kinds
    ada_kinds = {item["kind"] for item in client.get("/notifications", headers=auth(ada)).json()}
    assert "event_created" not in ada_kinds
    assert "visit_created" not in ada_kinds
