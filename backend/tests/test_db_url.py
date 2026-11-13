import pytest

from app.db_url import normalize_database_url


def test_normalize_forces_psycopg_and_strips_supabase_query_junk() -> None:
    raw = (
        "postgres://postgres.abc:s3cret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        "?pgbouncer=true&connection_limit=1&pool_timeout=0&sslmode=require&supa=1"
    )
    out = normalize_database_url(raw)
    assert out.startswith("postgresql+psycopg://")
    assert "?" not in out
    assert "pgbouncer" not in out
    assert "supa=1" not in out
    assert "pooler.supabase.com:6543/postgres" in out
    from app.db_url import supabase_connect_args

    assert supabase_connect_args(out) == {"sslmode": "require", "prepare_threshold": None}


def test_normalize_strips_quotes_and_rejects_empty() -> None:
    assert normalize_database_url('  "postgresql://u:p@h/db"  ').startswith(
        "postgresql+psycopg://"
    )
    with pytest.raises(ValueError):
        normalize_database_url("   ")


def test_sqlite_passthrough() -> None:
    assert normalize_database_url("sqlite:///./closer.db") == "sqlite:///./closer.db"
