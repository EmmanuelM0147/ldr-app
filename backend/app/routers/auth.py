import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import registration_allowlist
from app.deps import get_clock, get_current_user, get_db
from app.media import absolute_media_path, delete_media_file, save_avatar_file
from app.models import LoginFailure, Membership, RegisterFailure, User
from app.schemas.api import AuthResponse, LoginRequest, RegisterRequest, UserOut, UserPatch
from app.security import create_access_token, hash_password, verify_password
from app.serialize import user_out

router = APIRouter()
LOGIN_FAILURE_LIMIT = 20
REGISTER_FAILURE_LIMIT = 10
AUTH_FAILURE_WINDOW = timedelta(hours=1)
GENERIC_REGISTER_ERROR = "Unable to create an account with that email."
GENERIC_LOGIN_ERROR = "Email or password is wrong."


def _same_couple(db: Session, left: uuid.UUID, right: uuid.UUID) -> bool:
    if left == right:
        return True
    left_couple = db.scalar(select(Membership.couple_id).where(Membership.user_id == left))
    right_couple = db.scalar(select(Membership.couple_id).where(Membership.user_id == right))
    return left_couple is not None and left_couple == right_couple


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _too_many(
    db: Session,
    *,
    model: type[LoginFailure] | type[RegisterFailure],
    ip: str,
    email: str,
    now,
    limit: int,
) -> bool:
    since = now - AUTH_FAILURE_WINDOW
    count = db.scalar(
        select(func.count())
        .select_from(model)
        .where(
            model.created_at >= since,
            or_(model.ip == ip, model.email == email),
        )
    )
    return count is not None and count >= limit


@router.post("/auth/register", response_model=AuthResponse, status_code=201, operation_id="register")
def register(
    body: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> AuthResponse:
    ip = _client_ip(request)
    email = body.email
    if _too_many(
        db,
        model=RegisterFailure,
        ip=ip,
        email=email,
        now=now,
        limit=REGISTER_FAILURE_LIMIT,
    ):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    allowed = registration_allowlist()
    if allowed is not None and email not in allowed:
        db.add(RegisterFailure(ip=ip, email=email, created_at=now))
        db.commit()
        raise HTTPException(status_code=409, detail=GENERIC_REGISTER_ERROR)

    if db.scalar(select(User.id).where(User.email == email)) is not None:
        db.add(RegisterFailure(ip=ip, email=email, created_at=now))
        db.commit()
        raise HTTPException(status_code=409, detail=GENERIC_REGISTER_ERROR)

    user = User(
        email=email,
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
    request: Request,
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> AuthResponse:
    ip = _client_ip(request)
    email = body.email
    if _too_many(
        db,
        model=LoginFailure,
        ip=ip,
        email=email,
        now=now,
        limit=LOGIN_FAILURE_LIMIT,
    ):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        db.add(LoginFailure(ip=ip, email=email, created_at=now))
        db.commit()
        raise HTTPException(status_code=401, detail=GENERIC_LOGIN_ERROR)
    return AuthResponse(access_token=create_access_token(user.id, now), user=user_out(user))


@router.get("/me", response_model=UserOut, operation_id="getMe")
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)


@router.patch("/me", response_model=UserOut, operation_id="updateMe")
def update_me(
    body: UserPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Nothing to update.")
    new_password = changes.pop("new_password", None)
    current_password = changes.pop("current_password", None)
    if new_password is not None:
        if current_password is None or not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=422, detail="Current password is wrong.")
        user.password_hash = hash_password(new_password)
    elif current_password is not None:
        raise HTTPException(status_code=422, detail="Provide a new password to change it.")
    for key, value in changes.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.post("/me/avatar", response_model=UserOut, operation_id="uploadMyAvatar")
async def upload_my_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    content_type, filename, relative = await save_avatar_file(user.id, file)
    delete_media_file(user.avatar_path)
    user.avatar_content_type = content_type
    user.avatar_filename = filename
    user.avatar_path = relative
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.delete("/me/avatar", response_model=UserOut, operation_id="deleteMyAvatar")
def delete_my_avatar(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    delete_media_file(user.avatar_path)
    user.avatar_content_type = None
    user.avatar_filename = None
    user.avatar_path = None
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.get("/users/{user_id}/avatar", operation_id="getUserAvatar")
def get_user_avatar(
    user_id: uuid.UUID,
    caller: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    if not _same_couple(db, caller.id, user_id):
        raise HTTPException(status_code=404, detail="Not found.")
    target = db.get(User, user_id)
    if target is None or not target.avatar_path or not target.avatar_content_type:
        raise HTTPException(status_code=404, detail="Not found.")
    path = absolute_media_path(target.avatar_path)
    return FileResponse(
        path,
        media_type=target.avatar_content_type,
        filename=target.avatar_filename or path.name,
    )
