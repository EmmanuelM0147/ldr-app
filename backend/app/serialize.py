from app.models import Budget, CheckIn, Couple, Event, Memory, Presence, User, Visit
from app.schemas.api import (
    BudgetOut,
    BudgetShareIn,
    CheckInOut,
    CoupleOut,
    EventOut,
    MemberOut,
    MemoryOut,
    PresenceOut,
    UserOut,
    VisitOut,
)


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        timezone=user.timezone,
        created_at=user.created_at,
    )


def couple_out(couple: Couple) -> CoupleOut:
    members = [
        MemberOut(
            user_id=item.user_id,
            display_name=item.user.display_name,
            timezone=item.user.timezone,
            joined_at=item.joined_at,
        )
        for item in sorted(couple.memberships, key=lambda item: item.joined_at)
    ]
    return CoupleOut(
        id=couple.id,
        ai_opt_in=couple.ai_opt_in,
        created_at=couple.created_at,
        members=members,
    )


def event_out(event: Event) -> EventOut:
    return EventOut(
        id=event.id,
        couple_id=event.couple_id,
        created_by=event.created_by,
        title=event.title,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        location=event.location,
        notes=event.notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


def budget_out(budget: Budget) -> BudgetOut:
    shares = sorted(budget.shares, key=lambda item: str(item.user_id))
    return BudgetOut(
        currency=budget.currency,
        total_minor=budget.total_minor,
        shares=[BudgetShareIn(user_id=item.user_id, amount_minor=item.amount_minor) for item in shares],
    )


def visit_out(visit: Visit) -> VisitOut:
    return VisitOut(
        id=visit.id,
        couple_id=visit.couple_id,
        created_by=visit.created_by,
        title=visit.title,
        starts_at=visit.starts_at,
        ends_at=visit.ends_at,
        location=visit.location,
        notes=visit.notes,
        budget=budget_out(visit.budget) if visit.budget is not None else None,
        created_at=visit.created_at,
        updated_at=visit.updated_at,
    )


def presence_out(item: Presence) -> PresenceOut:
    return PresenceOut(user_id=item.user_id, free_to_talk=item.free_to_talk, updated_at=item.updated_at)


def check_in_out(item: CheckIn) -> CheckInOut:
    return CheckInOut(
        id=item.id,
        couple_id=item.couple_id,
        user_id=item.user_id,
        local_date=item.local_date,
        mood=item.mood,  # type: ignore[arg-type]
        note=item.note,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def memory_out(item: Memory) -> MemoryOut:
    return MemoryOut(
        id=item.id,
        couple_id=item.couple_id,
        author_id=item.author_id,
        title=item.title,
        body=item.body,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )
