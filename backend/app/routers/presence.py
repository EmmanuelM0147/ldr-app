import json
import uuid

import jwt
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import session_factory
from app.deps import get_clock, get_current_couple, get_current_user, get_db, get_engine
from app.models import Couple, Membership, Presence, User
from app.realtime import hub
from app.schemas.api import PresenceList, PresenceWrite
from app.security import read_user_id
from app.serialize import presence_out

router = APIRouter()


def _members(db: Session, couple_id: uuid.UUID) -> PresenceList:
    rows = db.scalars(select(Presence).where(Presence.couple_id == couple_id).order_by(Presence.user_id)).all()
    return PresenceList(members=[presence_out(row) for row in rows])


def _payload(body: PresenceList) -> dict[str, object]:
    return {"type": "presence", "members": [item.model_dump(mode="json") for item in body.members]}


@router.get("/presence", response_model=PresenceList, operation_id="getPresence")
def get_presence(
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> PresenceList:
    return _members(db, couple.id)


@router.put("/presence", response_model=PresenceList, operation_id="setPresence")
async def set_presence(
    body: PresenceWrite,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> PresenceList:
    row = db.scalar(select(Presence).where(Presence.user_id == user.id, Presence.couple_id == couple.id))
    if row is None:
        row = Presence(user_id=user.id, couple_id=couple.id, free_to_talk=body.free_to_talk, updated_at=now)
        db.add(row)
    else:
        row.free_to_talk = body.free_to_talk
        row.updated_at = now
    db.commit()
    listed = _members(db, couple.id)
    await hub.publish(couple.id, _payload(listed))
    return listed


def _token(raw: str) -> str | None:
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(body, dict):
        return None
    token = body.get("token")
    if not isinstance(token, str) or not token.strip():
        return None
    return token.strip()


@router.websocket("/ws")
async def couple_events(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
    except WebSocketDisconnect:
        return
    token = _token(raw)
    if token is None:
        await websocket.close(code=1008)
        return
    try:
        user_id = read_user_id(token)
    except (jwt.PyJWTError, ValueError):
        await websocket.close(code=1008)
        return

    db = session_factory(get_engine())()
    try:
        couple_id = db.scalar(select(Membership.couple_id).where(Membership.user_id == user_id))
        known_user = db.get(User, user_id) is not None
    finally:
        db.close()
    if couple_id is None or not known_user:
        await websocket.close(code=1008)
        return
    hub.join(couple_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.leave(couple_id, websocket)
