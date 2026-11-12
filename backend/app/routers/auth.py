from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_user, get_db
from app.models import User
from app.schemas.api import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.security import create_access_token, hash_password, verify_password
from app.serialize import user_out

router = APIRouter()


@router.post("/auth/register", response_model=AuthResponse, status_code=201, operation_id="register")
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> AuthResponse:
    if db.scalar(select(User.id).where(User.email == body.email)) is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        timezone=body.timezone,
        created_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id, now), user=user_out(user))


@router.post("/auth/login", response_model=AuthResponse, operation_id="login")
def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is wrong.")
    return AuthResponse(access_token=create_access_token(user.id, now), user=user_out(user))


@router.get("/me", response_model=UserOut, operation_id="getMe")
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)
