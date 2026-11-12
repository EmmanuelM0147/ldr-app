from collections.abc import Iterator
from datetime import UTC, datetime

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.db import session_factory
from app.models import Couple, Membership, User
from app.security import read_user_id

_bearer = HTTPBearer(auto_error=False)
_engine = None
_factory = None


def get_engine():
    global _engine, _factory
    if _engine is None:
        url = get_settings().database_url
        args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, connect_args=args)
        _factory = session_factory(_engine)
    return _engine


def get_db() -> Iterator[Session]:
    factory = _factory if _factory is not None else session_factory(get_engine())
    db = factory()
    try:
        yield db
    finally:
        db.close()


def get_clock() -> datetime:
    return datetime.now(UTC)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sign in again.")
    try:
        user_id = read_user_id(creds.credentials)
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Sign in again.") from exc
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in again.")
    return user


def get_current_couple(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Couple:
    couple_id = db.scalar(select(Membership.couple_id).where(Membership.user_id == user.id))
    if couple_id is None:
        raise HTTPException(status_code=404, detail="You do not have a couple space.")
    couple = db.scalar(
        select(Couple)
        .where(Couple.id == couple_id)
        .options(selectinload(Couple.memberships).selectinload(Membership.user))
    )
    if couple is None:
        raise HTTPException(status_code=404, detail="You do not have a couple space.")
    return couple


def reset_engine() -> None:
    global _engine, _factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _factory = None
