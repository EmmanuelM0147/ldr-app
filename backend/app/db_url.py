"""Normalize DATABASE_URL values from Supabase / Vercel / Prisma exports."""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# Query keys safe to pass through to psycopg/libpq.
_ALLOWED_QUERY_KEYS = frozenset({"sslmode", "connect_timeout", "application_name"})


def normalize_database_url(raw: str) -> str:
    """Return a SQLAlchemy URL that psycopg can open.

    Vercel/Supabase often inject ``POSTGRES_URL`` like
    ``postgres://…@…pooler.supabase.com:6543/postgres?pgbouncer=true&…``.
    Those extra query keys become libpq options and crash with errors such as
    ``invalid connection option "supa"``. Strip unknown query params and force
    the ``postgresql+psycopg`` driver.
    """
    url = raw.strip().strip('"').strip("'")
    if not url:
        raise ValueError("DATABASE_URL is empty")

    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql+psycopg://"):
        pass
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql://")

    if url.startswith("sqlite:"):
        return url

    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        raise ValueError("DATABASE_URL is not a valid SQLAlchemy URL")

    kept = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() in _ALLOWED_QUERY_KEYS
    ]
    query = urlencode(kept)
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", query, ""))
