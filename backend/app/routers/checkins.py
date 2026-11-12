from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.models import CheckIn, Couple, User
from app.realtime import hub
from app.schemas.api import CheckInOut, CheckInWrite
from app.serialize import check_in_out

router = APIRouter()


@router.get("/check-ins", response_model=list[CheckInOut], operation_id="listCheckIns")
def list_check_ins(
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[CheckInOut]:
    rows = db.scalars(
        select(CheckIn)
        .where(CheckIn.couple_id == couple.id)
        .order_by(CheckIn.local_date.desc(), CheckIn.created_at.desc())
    ).all()
    return [check_in_out(row) for row in rows]


@router.put("/check-ins/today", response_model=CheckInOut, operation_id="upsertTodayCheckIn")
async def upsert_today(
    body: CheckInWrite,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> CheckInOut:
    local_day = now.astimezone(ZoneInfo(user.timezone)).date()
    existing = db.scalar(
        select(CheckIn).where(CheckIn.user_id == user.id, CheckIn.local_date == local_day)
    )
    if existing is None:
        existing = CheckIn(
            couple_id=couple.id,
            user_id=user.id,
            local_date=local_day,
            mood=body.mood,
            note=body.note,
            created_at=now,
            updated_at=now,
        )
        db.add(existing)
    else:
        if existing.couple_id != couple.id:
            existing.couple_id = couple.id
        existing.mood = body.mood
        existing.note = body.note
        existing.updated_at = now
    db.commit()
    db.refresh(existing)
    saved = check_in_out(existing)
    await hub.publish(couple.id, {"type": "check_in", "check_in": saved.model_dump(mode="json")})
    return saved
