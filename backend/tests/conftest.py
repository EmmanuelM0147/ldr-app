from collections.abc import Iterator
from pathlib import Path
import os

# Settings require a strong JWT_SECRET at import (CORS middleware loads settings).
os.environ["JWT_SECRET"] = "test-secret-not-for-production-use"

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.deps import get_db, reset_engine
from app.main import app


@pytest.fixture
def database_url(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> str:
    url = f"sqlite:///{tmp_path / 'app.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("JWT_SECRET", "test-secret-not-for-production-use")
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path / "media"))
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    return url


@pytest.fixture
def db_factory(database_url: str) -> Iterator[sessionmaker[Session]]:
    reset_engine()
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override() -> Iterator[Session]:
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield factory
    app.dependency_overrides.clear()
    engine.dispose()
    reset_engine()


@pytest.fixture
def client(db_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def register(
    client: TestClient,
    email: str,
    *,
    name: str = "Ada",
    timezone: str = "UTC",
    password: str = "password123",
) -> str:
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": name, "timezone": timezone},
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    assert isinstance(token, str)
    return token


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
