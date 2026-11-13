from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_couple, get_db
from app.gemini import (
    DAILY_LIMIT,
    DateIdeasClient,
    GeminiNotConfiguredError,
    get_gemini_client,
)
from app.models import AiDailyUsage, Couple
from app.schemas.api import DateIdeas, DateIdeasRequest

router = APIRouter()


def _utc_today() -> date:
    return datetime.now(UTC).date()


def _consume_daily_quota(db: Session, couple_id: object, today: date) -> None:
    row = db.scalar(
        select(AiDailyUsage).where(
            AiDailyUsage.couple_id == couple_id,
            AiDailyUsage.day == today,
        )
    )
    if row is None:
        row = AiDailyUsage(couple_id=couple_id, day=today, request_count=0)
        db.add(row)
        db.flush()
    if row.request_count >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Daily AI idea limit reached. Try again tomorrow.",
        )
    row.request_count += 1
    db.commit()


@router.post("/ai/date-ideas", response_model=DateIdeas, operation_id="createDateIdeas")
def create_date_ideas(
    body: DateIdeasRequest,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    gemini: DateIdeasClient = Depends(get_gemini_client),
) -> DateIdeas:
    if not couple.ai_enabled:
        raise HTTPException(status_code=403, detail="Turn on AI ideas in settings first.")

    _consume_daily_quota(db, couple.id, _utc_today())

    try:
        return gemini.generate(
            duration_minutes=body.duration_minutes,
            budget=body.budget,
            mode=body.mode,
            mood=body.mood,
        )
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Date ideas are not configured.") from exc
