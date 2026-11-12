import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.media import absolute_media_path, delete_media_file, save_memory_file
from app.models import Couple, Memory, User
from app.schemas.api import MemoryOut, MemoryPatch, MemoryWrite
from app.serialize import memory_out

router = APIRouter()


def _own_memory(db: Session, couple_id: uuid.UUID, memory_id: uuid.UUID, author_id: uuid.UUID) -> Memory:
    memory = db.scalar(select(Memory).where(Memory.id == memory_id, Memory.couple_id == couple_id))
    if memory is None or memory.author_id != author_id:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return memory


def _couple_memory(db: Session, couple_id: uuid.UUID, memory_id: uuid.UUID) -> Memory:
    memory = db.scalar(select(Memory).where(Memory.id == memory_id, Memory.couple_id == couple_id))
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return memory


def _clean_title(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > 80:
        raise HTTPException(status_code=422, detail="Title must be at most 80 characters.")
    return cleaned


def _clean_body(value: str, *, allow_empty: bool) -> str:
    cleaned = value.strip()
    if len(cleaned) > 2000:
        raise HTTPException(status_code=422, detail="A memory needs at most 2000 characters.")
    if not cleaned and not allow_empty:
        raise HTTPException(status_code=422, detail="A memory needs 1 to 2000 characters.")
    return cleaned


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


@router.post(
    "/memories/upload",
    response_model=MemoryOut,
    status_code=201,
    operation_id="createMemoryWithMedia",
)
async def create_memory_with_media(
    title: str | None = Form(default=None),
    body: str = Form(default=""),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> MemoryOut:
    kind, content_type, filename, relative = await save_memory_file(couple.id, file)
    memory = Memory(
        couple_id=couple.id,
        author_id=user.id,
        title=_clean_title(title),
        body=_clean_body(body, allow_empty=True),
        media_kind=kind,
        media_content_type=content_type,
        media_filename=filename,
        media_path=relative,
        created_at=now,
        updated_at=now,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory_out(memory)


@router.get("/memories/{memory_id}/media", operation_id="getMemoryMedia")
def get_memory_media(
    memory_id: uuid.UUID,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> FileResponse:
    memory = _couple_memory(db, couple.id, memory_id)
    if not memory.media_path or not memory.media_content_type:
        raise HTTPException(status_code=404, detail="Media not found.")
    path = absolute_media_path(memory.media_path)
    return FileResponse(
        path,
        media_type=memory.media_content_type,
        filename=memory.media_filename or path.name,
    )


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
    delete_media_file(memory.media_path)
    db.delete(memory)
    db.commit()
    return Response(status_code=204)
