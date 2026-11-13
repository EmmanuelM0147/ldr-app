import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

EXPECTED = {
    "users",
    "couples",
    "memberships",
    "invites",
    "events",
    "visits",
    "budgets",
    "budget_shares",
    "check_ins",
    "memories",
    "presence",
    "join_failures",
    "login_failures",
    "register_failures",
}


def _migrate(url: str) -> None:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine = create_engine(url)
    names = set(inspect(engine).get_table_names())
    assert EXPECTED <= names
    command.downgrade(config, "base")
    assert "users" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    assert "users" in inspect(engine).get_table_names()
    engine.dispose()


def test_upgrade_and_downgrade(tmp_path) -> None:
    _migrate(f"sqlite:///{tmp_path / 'migrate.db'}")


def _postgres_available(url: str) -> bool:
    try:
        engine = create_engine(url)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


def test_postgres_upgrade_and_downgrade() -> None:
    # Compose creates the app database for POSTGRES_USER; there is no default "postgres" db.
    admin_url = os.environ.get(
        "CLOSER_PG_ADMIN_URL",
        "postgresql+psycopg://closer:closer@localhost:5433/closer",
    )
    if not _postgres_available(admin_url):
        pytest.skip("Postgres is not available")

    db_name = "closer_migrate_test"
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        connection.execute(text(f'CREATE DATABASE "{db_name}"'))
    admin.dispose()

    test_url = admin_url.rsplit("/", 1)[0] + f"/{db_name}"
    try:
        _migrate(test_url)
    finally:
        admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        admin.dispose()
