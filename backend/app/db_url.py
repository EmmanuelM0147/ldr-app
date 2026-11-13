"""Normalize DATABASE_URL values from Supabase / Vercel / Prisma exports."""

from __future__ import annotations

from sqlalchemy.engine.url import make_url


def normalize_database_url(raw: str) -> str:
    """Return a SQLAlchemy URL that psycopg can open.

    Vercel/Supabase ``POSTGRES_URL`` values often look like
    ``postgres://…@…pooler.supabase.com:6543/postgres?pgbouncer=true&supa=…``.
    Any unknown query key is forwarded to libpq and crashes with
    ``invalid connection option "…"``. Drop the query string entirely and force
    the ``postgresql+psycopg`` driver. SSL is applied via connect_args in deps.
    """
    url = raw.strip().strip('"').strip("'")
    if not url:
        raise ValueError("DATABASE_URL is empty")

    # Some hosts turn "+" into a space when storing env vars.
    if url.startswith("postgresql psycopg://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql psycopg://")
    elif url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql://")

    if url.startswith("sqlite:"):
        return url

    parsed = make_url(url)
    if not parsed.drivername.startswith("postgresql"):
        raise ValueError("DATABASE_URL must be a Postgres or SQLite URL")
    # Drop every query param (pgbouncer, Prisma, stray "supa", etc.).
    cleaned = parsed.set(drivername="postgresql+psycopg", query={})
    return cleaned.render_as_string(hide_password=False)


def supabase_connect_args(url: str) -> dict[str, object]:
    """Driver connect_args for Supabase (ssl + pgbouncer-safe psycopg settings)."""
    parsed = make_url(url)
    host = (parsed.host or "").lower()
    if "supabase.com" not in host and "supabase.co" not in host:
        return {}
    args: dict[str, object] = {"sslmode": "require"}
    # Transaction-mode pooler (port 6543) rejects prepared statements.
    if parsed.port == 6543:
        args["prepare_threshold"] = None
    return args
