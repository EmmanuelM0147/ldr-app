import logging

from app.llm import get_llm_client
from app.main import app
from tests.conftest import auth, register


class FakeLlm:
    def __init__(self) -> None:
        self.calls: list[str | None] = []
        self.reply = "Cook a shared recipe over video, then eat together when you reunite."

    def suggest_date_night(self, vibe: str | None) -> str:
        self.calls.append(vibe)
        return self.reply


def _pair(client):
    owner = register(client, "ada@example.com", name="Ada")
    partner = register(client, "bello@example.com", name="Bello")
    client.post("/couples", headers=auth(owner))
    code = client.post("/couples/current/invites", headers=auth(owner)).json()["code"]
    client.post("/couples/join", json={"code": code}, headers=auth(partner))
    return owner, partner


def test_ideas_forbidden_until_opt_in(client, caplog) -> None:
    owner, _partner = _pair(client)
    fake = FakeLlm()
    app.dependency_overrides[get_llm_client] = lambda: fake
    try:
        with caplog.at_level(logging.INFO):
            denied = client.post("/ideas", json={}, headers=auth(owner))
        assert denied.status_code == 403
        assert fake.calls == []
        assert fake.reply not in caplog.text

        client.patch("/couples/current", json={"ai_opt_in": True}, headers=auth(owner))
        with caplog.at_level(logging.INFO):
            ok = client.post("/ideas", json={"vibe": "quiet"}, headers=auth(owner))
        assert ok.status_code == 200
        assert ok.json()["idea"] == fake.reply
        assert fake.calls == ["quiet"]
        assert fake.reply not in caplog.text
        assert "quiet" not in caplog.text
    finally:
        app.dependency_overrides.pop(get_llm_client, None)


def test_ideas_cross_couple_denied(client) -> None:
    owner, _partner = _pair(client)
    outsider = register(client, "chi@example.com", name="Chi")
    client.post("/couples", headers=auth(outsider))
    client.patch("/couples/current", json={"ai_opt_in": True}, headers=auth(owner))
    client.patch("/couples/current", json={"ai_opt_in": True}, headers=auth(outsider))

    fake = FakeLlm()
    app.dependency_overrides[get_llm_client] = lambda: fake
    try:
        # Outsider has their own couple; they cannot act as Ada's couple.
        # Asking ideas succeeds only for their own opted-in space (separate call count).
        own = client.post("/ideas", headers=auth(outsider))
        assert own.status_code == 200
        assert len(fake.calls) == 1

        # User with no couple gets 404, not Ada's ideas.
        alone = register(client, "dee@example.com", name="Dee")
        missing = client.post("/ideas", headers=auth(alone))
        assert missing.status_code == 404
        assert len(fake.calls) == 1
    finally:
        app.dependency_overrides.pop(get_llm_client, None)


def test_ideas_partner_can_request_when_opted_in(client) -> None:
    owner, partner = _pair(client)
    client.patch("/couples/current", json={"ai_opt_in": True}, headers=auth(partner))
    fake = FakeLlm()
    app.dependency_overrides[get_llm_client] = lambda: fake
    try:
        ok = client.post("/ideas", headers=auth(partner))
        assert ok.status_code == 200
        assert fake.calls == [None]
        # Owner sees the same opt-in and can also request.
        again = client.post("/ideas", headers=auth(owner))
        assert again.status_code == 200
        assert len(fake.calls) == 2
    finally:
        app.dependency_overrides.pop(get_llm_client, None)
