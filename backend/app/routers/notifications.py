import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.models import AppNotification, Couple, User
from app.schemas.api import NotificationOut
from app.serialize import notification_out

router = APIRouter()


@router.get("/notifications", response_model=list[NotificationOut], operation_id="listNotifications")
def list_notifications(
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    rows = db.scalars(
        select(AppNotification)
        .where(
            AppNotification.couple_id == couple.id,
            AppNotification.recipient_user_id == user.id,
        )
        .order_by(AppNotification.created_at.desc())
    ).all()
    return [notification_out(row) for row in rows]


@router.post(
    "/notifications/read-all",
    status_code=204,
    operation_id="markAllNotificationsRead",
)
def mark_all_read(
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> Response:
    db.execute(
        update(AppNotification)
        .where(
            AppNotification.couple_id == couple.id,
            AppNotification.recipient_user_id == user.id,
            AppNotification.read_at.is_(None),
        )
        .values(read_at=now)
    )
    db.commit()
    return Response(status_code=204)


@router.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationOut,
    operation_id="markNotificationRead",
)
def mark_one_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> NotificationOut:
    row = db.scalar(
        select(AppNotification).where(
            AppNotification.id == notification_id,
            AppNotification.couple_id == couple.id,
            AppNotification.recipient_user_id == user.id,
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if row.read_at is None:
        row.read_at = now
        db.commit()
        db.refresh(row)
    return notification_out(row)
