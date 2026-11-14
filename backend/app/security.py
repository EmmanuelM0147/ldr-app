import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

_hasher = PasswordHasher()
TOKEN_TTL = timedelta(minutes=60)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def hash_invite_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: uuid.UUID, now: datetime) -> str:
    issued = now.astimezone(UTC)
    payload = {"sub": str(user_id), "iat": issued, "exp": issued + TOKEN_TTL}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm="HS256")


def read_user_id(token: str) -> uuid.UUID:
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    return uuid.UUID(str(payload["sub"]))


def read_token_issued_at(token: str) -> datetime:
    """Return the token `iat` as an aware UTC datetime."""
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    raw = payload.get("iat")
    if raw is None:
        raise ValueError("Token is missing iat.")
    if isinstance(raw, datetime):
        issued = raw
    else:
        issued = datetime.fromtimestamp(int(raw), tz=UTC)
    if issued.tzinfo is None:
        return issued.replace(tzinfo=UTC)
    return issued.astimezone(UTC)
