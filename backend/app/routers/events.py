import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.models import Couple, Event, User
from app.schemas.api import EventOut, EventPatch, EventWrite
from app.serialize import event_out

router = APIRouter()


def _ordered(starts: datetime, ends: datetime | None) -> None:
    if ends is not None and ends <= starts:
        raise HTTPException(status_code=422, detail="End must be after the start.")


def _event_for_couple(db: Session, couple_id: uuid.UUID, event_id: uuid.UUID) -> Event:
    event = db.scalar(select(Event).where(Event.id == event_id, Event.couple_id == couple_id))
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.get("/events", response_model=list[EventOut], operation_id="listEvents")
def list_events(couple: Couple = Depends(get_current_couple), db: Session = Depends(get_db)) -> list[EventOut]:
    rows = db.scalars(select(Event).where(Event.couple_id == couple.id).order_by(Event.starts_at)).all()
    return [event_out(row) for row in rows]


@router.post("/events", response_model=EventOut, status_code=201, operation_id="createEvent")
def create_event(
    body: EventWrite,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> EventOut:
    _ordered(body.starts_at, body.ends_at)
    event = Event(
        couple_id=couple.id,
        created_by=user.id,
        title=body.title,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        location=body.location,
        notes=body.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_out(event)


@router.patch("/events/{event_id}", response_model=EventOut, operation_id="updateEvent")
def update_event(
    event_id: uuid.UUID,
    body: EventPatch,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> EventOut:
    event = _event_for_couple(db, couple.id, event_id)
    changes = body.model_dump(exclude_unset=True)
    starts = changes.get("starts_at", event.starts_at)
    ends = changes.get("ends_at", event.ends_at)
    _ordered(starts, ends)
    for key, value in changes.items():
        setattr(event, key, value)
    event.updated_at = now
    db.commit()
    db.refresh(event)
    return event_out(event)


@router.delete("/events/{event_id}", status_code=204, operation_id="deleteEvent")
def delete_event(
    event_id: uuid.UUID,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> Response:
    event = _event_for_couple(db, couple.id, event_id)
    db.delete(event)
    db.commit()
    return Response(status_code=204)
