import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_clock, get_current_user, get_db
from app.deps import get_current_couple as load_couple
from app.models import (
    Budget,
    BudgetShare,
    CheckIn,
    Couple,
    Event,
    Invite,
    JoinFailure,
    Membership,
    Memory,
    Presence,
    User,
    Visit,
)
from app.schemas.api import CoupleOut, InviteCreated, JoinRequest
from app.security import hash_invite_code
from app.serialize import couple_out

router = APIRouter()
INVITE_TTL = timedelta(days=7)
HOUR = timedelta(hours=1)


def _load_couple(db: Session, couple_id: object) -> Couple:
    couple = db.scalar(
        select(Couple)
        .where(Couple.id == couple_id)
        .options(selectinload(Couple.memberships).selectinload(Membership.user))
    )
    if couple is None:
        raise HTTPException(status_code=404, detail="You do not have a couple space.")
    return couple


@router.post("/couples", response_model=CoupleOut, status_code=201, operation_id="createCouple")
def create_couple(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> CoupleOut:
    if db.scalar(select(Membership.user_id).where(Membership.user_id == user.id)) is not None:
        raise HTTPException(status_code=409, detail="You already have a couple space.")
    couple = Couple(ai_opt_in=False, created_at=now)
    db.add(couple)
    db.flush()
    db.add(Membership(couple_id=couple.id, user_id=user.id, joined_at=now))
    db.add(Presence(user_id=user.id, couple_id=couple.id, free_to_talk=False, updated_at=now))
    db.commit()
    return couple_out(_load_couple(db, couple.id))


@router.get("/couples/current", response_model=CoupleOut, operation_id="getCurrentCouple")
def get_current_couple(couple: Couple = Depends(load_couple)) -> CoupleOut:
    return couple_out(couple)


@router.delete("/couples/current", status_code=204, operation_id="deleteCurrentCouple")
def delete_current_couple(
    couple: Couple = Depends(load_couple),
    db: Session = Depends(get_db),
) -> Response:
    visit_ids = select(Visit.id).where(Visit.couple_id == couple.id)
    db.execute(delete(BudgetShare).where(BudgetShare.visit_id.in_(select(Budget.visit_id).where(Budget.visit_id.in_(visit_ids)))))
    db.execute(delete(Budget).where(Budget.visit_id.in_(visit_ids)))
    db.execute(delete(Visit).where(Visit.couple_id == couple.id))
    db.execute(delete(Event).where(Event.couple_id == couple.id))
    db.execute(delete(CheckIn).where(CheckIn.couple_id == couple.id))
    db.execute(delete(Memory).where(Memory.couple_id == couple.id))
    db.execute(delete(Presence).where(Presence.couple_id == couple.id))
    db.execute(delete(Invite).where(Invite.couple_id == couple.id))
    db.execute(delete(Membership).where(Membership.couple_id == couple.id))
    db.execute(delete(Couple).where(Couple.id == couple.id))
    db.commit()
    return Response(status_code=204)


@router.post(
    "/couples/current/invites",
    response_model=InviteCreated,
    status_code=201,
    operation_id="createInvite",
)
def create_invite(
    user: User = Depends(get_current_user),
    couple: Couple = Depends(load_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> InviteCreated:
    if len(couple.memberships) >= 2:
        raise HTTPException(status_code=409, detail="This space already has two people.")
    since = now - HOUR
    recent = db.scalar(
        select(func.count())
        .select_from(Invite)
        .where(Invite.created_by == user.id, Invite.created_at >= since)
    )
    if recent is not None and recent >= 5:
        raise HTTPException(status_code=429, detail="Too many invite codes. Try again later.")
    code = secrets.token_urlsafe(16)
    expires_at = now + INVITE_TTL
    db.add(
        Invite(
            couple_id=couple.id,
            code_hash=hash_invite_code(code),
            created_by=user.id,
            expires_at=expires_at,
            used_at=None,
            created_at=now,
        )
    )
    db.commit()
    return InviteCreated(code=code, expires_at=expires_at)


@router.post("/couples/join", response_model=CoupleOut, operation_id="joinCouple")
def join_couple(
    body: JoinRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> CoupleOut:
    ip = request.client.host if request.client else "unknown"
    since = now - HOUR
    failures = db.scalar(
        select(func.count()).select_from(JoinFailure).where(JoinFailure.ip == ip, JoinFailure.created_at >= since)
    )
    if failures is not None and failures >= 10:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    invite = db.scalar(select(Invite).where(Invite.code_hash == hash_invite_code(body.code.strip())))
    if invite is None or invite.expires_at <= now:
        _record_failure(db, ip, now)
        raise HTTPException(status_code=400, detail="That invite code is not valid.")

    member_count = db.scalar(
        select(func.count()).select_from(Membership).where(Membership.couple_id == invite.couple_id)
    )
    if member_count is not None and member_count >= 2:
        raise HTTPException(status_code=409, detail="This space already has two people.")
    if invite.used_at is not None:
        _record_failure(db, ip, now)
        raise HTTPException(status_code=400, detail="That invite code is not valid.")
    if db.scalar(select(Membership.user_id).where(Membership.user_id == user.id)) is not None:
        raise HTTPException(status_code=409, detail="You already have a couple space.")

    invite.used_at = now
    db.add(Membership(couple_id=invite.couple_id, user_id=user.id, joined_at=now))
    db.add(Presence(user_id=user.id, couple_id=invite.couple_id, free_to_talk=False, updated_at=now))
    db.commit()
    return couple_out(_load_couple(db, invite.couple_id))


def _record_failure(db: Session, ip: str, now: object) -> None:
    db.add(JoinFailure(ip=ip, created_at=now))
    db.commit()
