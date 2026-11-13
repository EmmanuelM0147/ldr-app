import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app import models  # noqa: F401
from app.db import Base
from app.db_url import normalize_database_url, supabase_connect_args

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Prefer DATABASE_URL; fall back to POSTGRES_URL when unset or still on default SQLite.
database_url = (os.environ.get("DATABASE_URL") or "").strip()
postgres_url = (os.environ.get("POSTGRES_URL") or "").strip()
if (not database_url or database_url.startswith("sqlite:")) and postgres_url:
    database_url = postgres_url
if not database_url:
    database_url = config.get_main_option("sqlalchemy.url")
if database_url:
    database_url = normalize_database_url(database_url)
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=supabase_connect_args(database_url) if database_url else {},
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
