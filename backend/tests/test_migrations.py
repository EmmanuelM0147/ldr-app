from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_upgrade_and_downgrade(tmp_path) -> None:
    url = f"sqlite:///{tmp_path / 'migrate.db'}"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    engine = create_engine(url)
    names = set(inspect(engine).get_table_names())
    assert {"users", "couples", "memberships", "invites", "events", "visits", "budgets", "check_ins", "memories"} <= names
    command.downgrade(config, "base")
    assert "users" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    assert "users" in inspect(engine).get_table_names()
    engine.dispose()
