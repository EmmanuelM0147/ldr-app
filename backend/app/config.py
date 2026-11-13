from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./closer.db"
    jwt_secret: str = "dev-only-change-me-not-for-production"
    cors_origins: str = (
        "http://localhost:5173,http://localhost,http://127.0.0.1:5173,http://127.0.0.1"
    )
    media_root: str = "./media"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    # Comma-separated emails. Empty = open registration. When set, only these may register.
    registration_allowed_emails: str = ""


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
