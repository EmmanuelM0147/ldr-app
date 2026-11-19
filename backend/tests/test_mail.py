from app.config import Settings
from app.mail import send_password_reset_email, smtp_configured


def _settings(**overrides: object) -> Settings:
    base = {
        "jwt_secret": "test-secret-not-for-production-use-32chars",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "smtp_from": "",
        "smtp_use_tls": True,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_smtp_configured_requires_host() -> None:
    assert smtp_configured(_settings()) is False
    assert smtp_configured(_settings(smtp_host="smtp.example.com")) is True


def test_send_password_reset_noop_without_host() -> None:
    assert send_password_reset_email(
        settings=_settings(),
        to_email="ada@example.com",
        reset_url="http://localhost/reset?token=x",
    ) is False


def test_send_password_reset_uses_smtp(monkeypatch) -> None:
    calls: list[object] = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: int = 15) -> None:
            calls.append(("init", host, port))

        def __enter__(self) -> "FakeSMTP":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def starttls(self) -> None:
            calls.append("starttls")

        def login(self, user: str, password: str) -> None:
            calls.append(("login", user))

        def send_message(self, msg: object) -> None:
            to = msg["To"] if hasattr(msg, "__getitem__") else None
            calls.append(("send", to))

    monkeypatch.setattr("app.mail.smtplib.SMTP", FakeSMTP)
    ok = send_password_reset_email(
        settings=_settings(
            smtp_host="smtp.example.com",
            smtp_user="closer",
            smtp_password="secret",
            smtp_from="noreply@closer.app",
        ),
        to_email="ada@example.com",
        reset_url="http://localhost/reset?token=x",
    )
    assert ok is True
    assert ("init", "smtp.example.com", 587) in calls
    assert "starttls" in calls
    assert ("login", "closer") in calls
    assert ("send", "ada@example.com") in calls
