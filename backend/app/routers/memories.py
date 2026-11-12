import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.models import Couple, Memory, User
from app.schemas.api import MemoryOut, MemoryPatch, MemoryWrite
from app.serialize import memory_out

router = APIRouter()


def _own_memory(db: Session, couple_id: uuid.UUID, memory_id: uuid.UUID, author_id: uuid.UUID) -> Memory:
    memory = db.scalar(select(Memory).where(Memory.id == memory_id, Memory.couple_id == couple_id))
    if memory is None or memory.author_id != author_id:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return memory


@router.get("/memories", response_model=list[MemoryOut], operation_id="listMemories")
def list_memories(
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[MemoryOut]:
    rows = db.scalars(
        select(Memory).where(Memory.couple_id == couple.id).order_by(Memory.created_at.desc())
    ).all()
    return [memory_out(row) for row in rows]


@router.post("/memories", response_model=MemoryOut, status_code=201, operation_id="createMemory")
def create_memory(
    body: MemoryWrite,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> MemoryOut:
    memory = Memory(
        couple_id=couple.id,
        author_id=user.id,
        title=body.title,
        body=body.body,
        created_at=now,
        updated_at=now,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory_out(memory)


@router.patch("/memories/{memory_id}", response_model=MemoryOut, operation_id="updateMemory")
def update_memory(
    memory_id: uuid.UUID,
    body: MemoryPatch,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> MemoryOut:
    memory = _own_memory(db, couple.id, memory_id, user.id)
    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(memory, key, value)
    memory.updated_at = now
    db.commit()
    db.refresh(memory)
    return memory_out(memory)


@router.delete("/memories/{memory_id}", status_code=204, operation_id="deleteMemory")
def delete_memory(
    memory_id: uuid.UUID,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> Response:
    memory = _own_memory(db, couple.id, memory_id, user.id)
    db.delete(memory)
    db.commit()
    return Response(status_code=204)
