"""Run Alembic upgrades (used on cold start for serverless demos)."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import resolved_database_url


def _backend_root() -> Path:
    return Path(__file__).resolve().parent.parent


def alembic_config() -> Config:
    root = _backend_root()
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    url = resolved_database_url()
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return cfg


def run_upgrade() -> None:
    """Apply pending migrations. Idempotent when already at head."""
    url = resolved_database_url()
    if url.startswith("sqlite:"):
        return
    command.upgrade(alembic_config(), "head")
