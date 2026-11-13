import pytest

from app.db_url import normalize_database_url


def test_normalize_forces_psycopg_and_strips_supabase_query_junk() -> None:
    raw = (
        "postgres://postgres.abc:s3cret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        "?pgbouncer=true&connection_limit=1&pool_timeout=0&sslmode=require&supa=1"
    )
    out = normalize_database_url(raw)
    assert out.startswith("postgresql+psycopg://")
    query = out.split("?", 1)[1] if "?" in out else ""
    assert "pgbouncer" not in query
    assert "connection_limit" not in query
    assert "supa=" not in query
    assert "sslmode=require" in query
    assert "pooler.supabase.com:6543/postgres" in out


def test_normalize_strips_quotes_and_rejects_empty() -> None:
    assert normalize_database_url('  "postgresql://u:p@h/db"  ').startswith(
        "postgresql+psycopg://"
    )
    with pytest.raises(ValueError):
        normalize_database_url("   ")


def test_sqlite_passthrough() -> None:
    assert normalize_database_url("sqlite:///./closer.db") == "sqlite:///./closer.db"
