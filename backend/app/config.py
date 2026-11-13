from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Known weak / placeholder values that must never mint production-valid JWTs.
_WEAK_JWT_SECRETS = frozenset(
    {
        "dev-only-change-me-not-for-production",
        "change-me-to-a-long-random-string",
        "change-me",
        "secret",
        "jwt-secret",
        "your-secret-here",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./closer.db"
    # Required via JWT_SECRET env. No weak default — boot fails if missing/weak.
    jwt_secret: str
    cors_origins: str = (
        "http://localhost:5173,http://localhost,http://127.0.0.1:5173,http://127.0.0.1"
    )
    media_root: str = "./media"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Comma-separated emails. Empty = open registration. When set, only these may register.
    registration_allowed_emails: str = ""
    # Base URL for reset links in AUTH_RESET_DEBUG responses (frontend origin).
    public_app_url: str = "http://localhost:5173"
    # When true, forgot-password may include reset_url in JSON (local/tests only).
    auth_reset_debug: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_strong(cls, value: str) -> str:
        secret = value.strip()
        if not secret:
            raise ValueError("JWT_SECRET must not be empty")
        if secret.lower() in _WEAK_JWT_SECRETS or secret in _WEAK_JWT_SECRETS:
            raise ValueError("JWT_SECRET is a known weak/placeholder value")
        if len(secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return secret


def get_settings() -> Settings:
    return Settings()


def registration_allowlist() -> set[str] | None:
    """Return lowercased emails when allowlist is set; None means registration is open."""
    raw = get_settings().registration_allowed_emails.strip()
    if not raw:
        return None
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def cors_origin_list() -> list[str]:
    return [item.strip() for item in get_settings().cors_origins.split(",") if item.strip()]
