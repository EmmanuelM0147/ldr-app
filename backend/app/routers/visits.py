import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_clock, get_current_couple, get_current_user, get_db
from app.models import Budget, BudgetShare, Couple, User, Visit
from app.schemas.api import BudgetIn, BudgetOut, CountdownOut, VisitOut, VisitPatch, VisitWrite
from app.serialize import budget_out, visit_out

router = APIRouter()


def _ordered(starts: datetime, ends: datetime | None) -> None:
    if ends is None:
        raise HTTPException(status_code=422, detail="A visit needs an end.")
    if ends <= starts:
        raise HTTPException(status_code=422, detail="End must be after the start.")


def _visit_for_couple(db: Session, couple_id: uuid.UUID, visit_id: uuid.UUID) -> Visit:
    visit = db.scalar(
        select(Visit)
        .where(Visit.id == visit_id, Visit.couple_id == couple_id)
        .options(selectinload(Visit.budget).selectinload(Budget.shares))
    )
    if visit is None:
        raise HTTPException(status_code=404, detail="Visit not found.")
    return visit


def _traveler_for_couple(couple: Couple, traveler_user_id: uuid.UUID | None) -> uuid.UUID | None:
    if traveler_user_id is None:
        return None
    member_ids = {item.user_id for item in couple.memberships}
    if traveler_user_id not in member_ids:
        raise HTTPException(status_code=422, detail="Traveler must be a member of this space.")
    return traveler_user_id


def _apply_budget(db: Session, couple: Couple, visit: Visit, body: BudgetIn) -> None:
    if len(couple.memberships) < 2:
        raise HTTPException(status_code=409, detail="Both partners need to join before a budget.")
    first, second = body.shares
    if first.amount_minor + second.amount_minor != body.total_minor:
        raise HTTPException(status_code=422, detail="The two shares must add up to the total.")
    member_ids = {item.user_id for item in couple.memberships}
    share_ids = {first.user_id, second.user_id}
    if len(share_ids) != 2 or not share_ids <= member_ids:
        raise HTTPException(status_code=422, detail="Shares must belong to the two partners.")
    db.execute(delete(BudgetShare).where(BudgetShare.visit_id == visit.id))
    db.execute(delete(Budget).where(Budget.visit_id == visit.id))
    db.add(Budget(visit_id=visit.id, currency=body.currency, total_minor=body.total_minor))
    db.add(BudgetShare(visit_id=visit.id, user_id=first.user_id, amount_minor=first.amount_minor))
    db.add(BudgetShare(visit_id=visit.id, user_id=second.user_id, amount_minor=second.amount_minor))


@router.get("/visits/next", response_model=CountdownOut, operation_id="getNextVisit")
def get_next_visit(
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> CountdownOut:
    visit = db.scalar(
        select(Visit)
        .where(Visit.couple_id == couple.id, Visit.starts_at > now)
        .order_by(Visit.starts_at)
        .options(selectinload(Visit.budget).selectinload(Budget.shares))
        .limit(1)
    )
    if visit is None:
        return CountdownOut(visit=None, seconds_until=None)
    seconds = max(0, int((visit.starts_at - now).total_seconds()))
    return CountdownOut(visit=visit_out(visit), seconds_until=seconds)


@router.get("/visits", response_model=list[VisitOut], operation_id="listVisits")
def list_visits(couple: Couple = Depends(get_current_couple), db: Session = Depends(get_db)) -> list[VisitOut]:
    rows = db.scalars(
        select(Visit)
        .where(Visit.couple_id == couple.id)
        .order_by(Visit.starts_at)
        .options(selectinload(Visit.budget).selectinload(Budget.shares))
    ).all()
    return [visit_out(row) for row in rows]


@router.post("/visits", response_model=VisitOut, status_code=201, operation_id="createVisit")
def create_visit(
    body: VisitWrite,
    user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> VisitOut:
    _ordered(body.starts_at, body.ends_at)
    traveler_id = _traveler_for_couple(couple, body.traveler_user_id)
    visit = Visit(
        couple_id=couple.id,
        created_by=user.id,
        title=body.title,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        location=body.location,
        notes=body.notes,
        traveler_user_id=traveler_id,
        created_at=now,
        updated_at=now,
    )
    db.add(visit)
    db.flush()
    if body.budget is not None:
        _apply_budget(db, couple, visit, body.budget)
    db.commit()
    return visit_out(_visit_for_couple(db, couple.id, visit.id))


@router.patch("/visits/{visit_id}", response_model=VisitOut, operation_id="updateVisit")
def update_visit(
    visit_id: uuid.UUID,
    body: VisitPatch,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
    now=Depends(get_clock),
) -> VisitOut:
    visit = _visit_for_couple(db, couple.id, visit_id)
    changes = body.model_dump(exclude_unset=True)
    starts = changes.get("starts_at", visit.starts_at)
    ends = changes.get("ends_at", visit.ends_at)
    _ordered(starts, ends)
    if "traveler_user_id" in changes:
        changes["traveler_user_id"] = _traveler_for_couple(couple, changes["traveler_user_id"])
    for key, value in changes.items():
        setattr(visit, key, value)
    visit.updated_at = now
    db.commit()
    return visit_out(_visit_for_couple(db, couple.id, visit.id))


@router.delete("/visits/{visit_id}", status_code=204, operation_id="deleteVisit")
def delete_visit(
    visit_id: uuid.UUID,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> Response:
    visit = _visit_for_couple(db, couple.id, visit_id)
    if visit.budget is not None:
        for share in list(visit.budget.shares):
            db.delete(share)
        db.delete(visit.budget)
    db.delete(visit)
    db.commit()
    return Response(status_code=204)


@router.get("/visits/{visit_id}/budget", response_model=BudgetOut, operation_id="getBudget")
def get_budget(
    visit_id: uuid.UUID,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> BudgetOut:
    visit = _visit_for_couple(db, couple.id, visit_id)
    if visit.budget is None:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return budget_out(visit.budget)


@router.put("/visits/{visit_id}/budget", response_model=BudgetOut, operation_id="putBudget")
def put_budget(
    visit_id: uuid.UUID,
    body: BudgetOut,
    couple: Couple = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> BudgetOut:
    visit = _visit_for_couple(db, couple.id, visit_id)
    _apply_budget(db, couple, visit, body)
    db.commit()
    db.expire_all()
    saved = _visit_for_couple(db, couple.id, visit.id).budget
    if saved is None:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return budget_out(saved)
