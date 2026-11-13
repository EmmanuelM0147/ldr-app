"""Create and publish in-app notifications for the other couple member(s)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import AppNotification, Couple
from app.realtime import hub
from app.schemas.api import NotificationKind
from app.serialize import notification_out


def queue_for_partners(
    db: Session,
    couple: Couple,
    *,
    actor_user_id: uuid.UUID,
    kind: NotificationKind,
    title: str,
    body: str,
    now: datetime,
) -> list[AppNotification]:
    rows: list[AppNotification] = []
    for membership in couple.memberships:
        if membership.user_id == actor_user_id:
            continue
        row = AppNotification(
            couple_id=couple.id,
            recipient_user_id=membership.user_id,
            kind=kind,
            title=title[:120],
            body=body[:280],
            created_at=now,
            read_at=None,
        )
        db.add(row)
        rows.append(row)
    if rows:
        db.flush()
    return rows


async def publish_rows(couple_id: uuid.UUID, rows: list[AppNotification]) -> None:
    for row in rows:
        await hub.publish(
            couple_id,
            {"type": "notification", "notification": notification_out(row).model_dump(mode="json")},
        )
