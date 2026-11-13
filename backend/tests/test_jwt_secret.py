"""SEC-01: refuse default / weak JWT_SECRET so forged tokens cannot mint with known secrets."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from pydantic import ValidationError

from app.config import Settings


WEAK_SECRETS = (
    "dev-only-change-me-not-for-production",
    "change-me-to-a-long-random-string",
    "change-me",
    "secret",
    "",
    "   ",
    "short-secret",
)


@pytest.mark.parametrize("secret", WEAK_SECRETS)
def test_settings_reject_weak_jwt_secret(secret: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", secret)
    with pytest.raises(ValidationError):
        Settings()


def test_forged_token_with_default_secret_is_rejected(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Even if an attacker knows the old default, tokens signed with it must not work."""
    from tests.conftest import register

    token = register(client, "ada@example.com")
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    now = datetime.now(UTC)
    # Decode a real token to get a user id, then re-sign with the known weak default.
    payload = jwt.decode(
        token,
        "test-secret-not-for-production-use",
        algorithms=["HS256"],
    )
    forged = jwt.encode(
        {
            "sub": payload["sub"],
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        "dev-only-change-me-not-for-production",
        algorithm="HS256",
    )
    denied = client.get("/me", headers={"Authorization": f"Bearer {forged}"})
    assert denied.status_code == 401
