from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./closer.db"
    jwt_secret: str = "dev-only-change-me-not-for-production"
    cors_origins: str = (
        "http://localhost:5173,http://localhost,http://127.0.0.1:5173,http://127.0.0.1"
    )
    media_root: str = "./media"


def get_settings() -> Settings:
    return Settings()

def cors_origin_list() -> list[str]:
    return [item.strip() for item in get_settings().cors_origins.split(",") if item.strip()]
