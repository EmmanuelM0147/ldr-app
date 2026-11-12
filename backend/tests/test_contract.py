from pathlib import Path

import yaml

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "docs" / "openapi.yaml"

REQUIRED: dict[str, set[str]] = {
    "/health": {"get"},
    "/auth/register": {"post"},
    "/auth/login": {"post"},
    "/me": {"get"},
    "/couples": {"post"},
    "/couples/current": {"get", "delete"},
    "/couples/current/invites": {"post"},
    "/couples/join": {"post"},
    "/events": {"get", "post"},
    "/events/{event_id}": {"patch", "delete"},
    "/visits": {"get", "post"},
    "/visits/next": {"get"},
    "/visits/{visit_id}": {"patch", "delete"},
    "/visits/{visit_id}/budget": {"get", "put"},
    "/check-ins": {"get"},
    "/check-ins/today": {"put"},
    "/memories": {"get", "post"},
    "/memories/{memory_id}": {"patch", "delete"},
    "/presence": {"get", "put"},
    "/ws": {"get"},
}


def test_contract_covers_mvp_paths() -> None:
    loaded = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
    assert isinstance(loaded, dict)
    paths = loaded["paths"]
    assert set(paths) == set(REQUIRED)
    for path, methods in REQUIRED.items():
        assert methods == set(paths[path])
