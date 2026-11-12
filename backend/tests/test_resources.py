from datetime import UTC, datetime

from app.deps import get_clock
from app.main import app
from tests.conftest import auth, register


def _pair(client) -> tuple[str, str, str]:
    owner = register(client, "ada@example.com", name="Ada", timezone="Pacific/Kiritimati")
    partner = register(client, "bello@example.com", name="Bello", timezone="Pacific/Pago_Pago")
    other = register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    client.post("/couples/join", json={"code": code}, headers=auth(partner))
    client.post("/couples", headers=auth(other))
    return owner, partner, other


def test_events_are_couple_scoped(client) -> None:
    owner, partner, other = _pair(client)
    created = client.post(
        "/events",
        json={"title": "Flight", "starts_at": "2026-12-02T10:00:00Z", "ends_at": "2026-12-01T10:00:00Z"},
        headers=auth(owner),
    )
    assert created.status_code == 422
    created = client.post(
        "/events",
        json={"title": "Flight", "starts_at": "2026-12-01T10:00:00Z", "ends_at": "2026-12-02T10:00:00Z"},
        headers=auth(owner),
    )
    assert created.status_code == 201
    event_id = created.json()["id"]
    assert client.get("/events", headers=auth(partner)).json()[0]["title"] == "Flight"
    hidden = client.delete(f"/events/{event_id}", headers=auth(other))
    assert hidden.status_code == 404
    assert client.get("/events", headers=auth(owner)).json()[0]["id"] == event_id
    assert client.delete(f"/events/{event_id}", headers=auth(partner)).status_code == 204
    assert client.get("/events", headers=auth(owner)).json() == []


def test_visits_countdown_and_budget(client) -> None:
    owner, partner, other = _pair(client)
    past = client.post(
        "/visits",
        json={
            "title": "Last time",
            "starts_at": "2020-01-01T00:00:00Z",
            "ends_at": "2020-01-02T00:00:00Z",
        },
        headers=auth(owner),
    )
    assert past.status_code == 201
    future = client.post(
        "/visits",
        json={
            "title": "Lagos",
            "starts_at": "2026-12-01T00:00:00Z",
            "ends_at": "2026-12-08T00:00:00Z",
            "location": "Lagos",
        },
        headers=auth(partner),
    )
    assert future.status_code == 201
    visit_id = future.json()["id"]
    later = client.post(
        "/visits",
        json={
            "title": "Later",
            "starts_at": "2027-01-01T00:00:00Z",
            "ends_at": "2027-01-02T00:00:00Z",
        },
        headers=auth(owner),
    )
    assert later.status_code == 201
    countdown = client.get("/visits/next", headers=auth(owner)).json()
    assert countdown["visit"]["title"] == "Lagos"
    assert countdown["seconds_until"] > 0

    members = client.get("/couples/current", headers=auth(owner)).json()["members"]
    bad = client.put(
        f"/visits/{visit_id}/budget",
        json={
            "currency": "NGN",
            "total_minor": 100,
            "shares": [
                {"user_id": members[0]["user_id"], "amount_minor": 40},
                {"user_id": members[1]["user_id"], "amount_minor": 50},
            ],
        },
        headers=auth(owner),
    )
    assert bad.status_code == 422
    saved = client.put(
        f"/visits/{visit_id}/budget",
        json={
            "currency": "NGN",
            "total_minor": 100,
            "shares": [
                {"user_id": members[0]["user_id"], "amount_minor": 40},
                {"user_id": members[1]["user_id"], "amount_minor": 60},
            ],
        },
        headers=auth(partner),
    )
    assert saved.status_code == 200
    assert saved.json()["total_minor"] == 100
    assert client.put(
        f"/visits/{visit_id}/budget",
        json=saved.json(),
        headers=auth(other),
    ).status_code == 404
    assert client.get(f"/visits/{visit_id}/budget", headers=auth(owner)).json()["currency"] == "NGN"
    assert client.delete(f"/visits/{visit_id}", headers=auth(owner)).status_code == 204
    assert client.get(f"/visits/{visit_id}/budget", headers=auth(partner)).status_code == 404

    with_budget = client.post(
        "/visits",
        json={
            "title": "Split on create",
            "starts_at": "2026-12-20T00:00:00Z",
            "ends_at": "2026-12-27T00:00:00Z",
            "traveler_user_id": members[0]["user_id"],
            "budget": {
                "currency": "USD",
                "total_minor": 200,
                "shares": [
                    {"user_id": members[0]["user_id"], "amount_minor": 120},
                    {"user_id": members[1]["user_id"], "amount_minor": 80},
                ],
            },
        },
        headers=auth(owner),
    )
    assert with_budget.status_code == 201
    assert with_budget.json()["traveler_user_id"] == members[0]["user_id"]
    assert with_budget.json()["budget"]["total_minor"] == 200
    assert with_budget.json()["budget"]["shares"][0]["amount_minor"] + with_budget.json()["budget"]["shares"][1][
        "amount_minor"
    ] == 200
    outsider = client.post(
        "/visits",
        json={
            "title": "Bad traveler",
            "starts_at": "2026-12-28T00:00:00Z",
            "ends_at": "2026-12-29T00:00:00Z",
            "traveler_user_id": "00000000-0000-4000-8000-000000000099",
        },
        headers=auth(owner),
    )
    assert outsider.status_code == 422


def test_check_in_uses_local_date_and_hides_other_couples(client) -> None:
    owner, partner, other = _pair(client)
    moment = datetime(2026, 11, 12, 0, 30, tzinfo=UTC)
    app.dependency_overrides[get_clock] = lambda: moment
    try:
        mine = client.put("/check-ins/today", json={"mood": "great", "note": "Ada's note"}, headers=auth(owner))
        theirs = client.put("/check-ins/today", json={"mood": "low", "note": "Bello's note"}, headers=auth(partner))
        other_note = client.put("/check-ins/today", json={"mood": "okay", "note": "Chi's note"}, headers=auth(other))
        updated = client.put("/check-ins/today", json={"mood": "good", "note": "Updated"}, headers=auth(owner))
    finally:
        app.dependency_overrides.pop(get_clock, None)
    assert mine.status_code == 200
    assert mine.json()["local_date"] == "2026-11-12"
    assert theirs.json()["local_date"] == "2026-11-11"
    assert updated.status_code == 200
    assert updated.json()["id"] == mine.json()["id"]
    listed = client.get("/check-ins", headers=auth(partner)).json()
    notes = {item["note"] for item in listed}
    assert notes == {"Updated", "Bello's note"}
    assert other_note.json()["note"] == "Chi's note"
    assert "Chi's note" not in notes


def test_memories_are_author_scoped(client) -> None:
    owner, partner, other = _pair(client)
    created = client.post("/memories", json={"title": "Hall", "body": "You waved."}, headers=auth(owner))
    assert created.status_code == 201
    assert created.json()["media"] is None
    memory_id = created.json()["id"]
    assert client.get("/memories", headers=auth(partner)).json()[0]["body"] == "You waved."
    denied = client.patch(f"/memories/{memory_id}", json={"body": "Changed"}, headers=auth(partner))
    assert denied.status_code == 404
    foreign = client.delete(f"/memories/{memory_id}", headers=auth(other))
    assert foreign.status_code == 404
    updated = client.patch(f"/memories/{memory_id}", json={"body": "You waved first."}, headers=auth(owner))
    assert updated.status_code == 200
    assert client.get("/memories", headers=auth(partner)).json()[0]["body"] == "You waved first."


def test_memory_media_upload_and_cross_couple_denial(client) -> None:
    owner, partner, other = _pair(client)
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    uploaded = client.post(
        "/memories/upload",
        data={"title": "Gate", "body": ""},
        files={"file": ("gate.png", png, "image/png")},
        headers=auth(owner),
    )
    assert uploaded.status_code == 201, uploaded.text
    body = uploaded.json()
    assert body["media"]["kind"] == "image"
    assert body["media"]["url"] == f"/memories/{body['id']}/media"
    memory_id = body["id"]
    media = client.get(f"/memories/{memory_id}/media", headers=auth(partner))
    assert media.status_code == 200
    assert media.content.startswith(b"\x89PNG")
    assert client.get(f"/memories/{memory_id}/media", headers=auth(other)).status_code == 404
    bad = client.post(
        "/memories/upload",
        data={"body": "nope"},
        files={"file": ("note.txt", b"hello", "text/plain")},
        headers=auth(owner),
    )
    assert bad.status_code == 422
    assert client.delete(f"/memories/{memory_id}", headers=auth(owner)).status_code == 204
    assert client.get(f"/memories/{memory_id}/media", headers=auth(partner)).status_code == 404
