from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = REPO_ROOT / "docs" / "openapi.yaml"


def _contract() -> dict:
    loaded = yaml.safe_load(CONTRACT_PATH.read_text(encoding="utf-8"))
    assert isinstance(loaded, dict)
    return loaded


def test_health_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"status": "ok"}


def _schema(document: dict, schema: dict) -> dict:
    if "$ref" not in schema:
        return schema
    name = schema["$ref"].rsplit("/", 1)[-1]
    resolved = document["components"]["schemas"][name]
    assert isinstance(resolved, dict)
    return resolved


def test_health_matches_openapi() -> None:
    spec = _contract()
    generated = app.openapi()

    assert generated["info"]["title"] == spec["info"]["title"]
    assert generated["info"]["version"] == spec["info"]["version"]
    assert generated["paths"]["/health"]["get"]["operationId"] == "getHealth"

    contract_health = spec["components"]["schemas"]["Health"]
    live_health = generated["components"]["schemas"]["Health"]
    assert live_health["required"] == contract_health["required"] == ["status"]

    contract_status = _schema(spec, contract_health["properties"]["status"])
    live_status = _schema(generated, live_health["properties"]["status"])
    assert live_status["enum"] == contract_status["enum"] == ["ok"]
