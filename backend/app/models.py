from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UtcDateTime


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(40))
    timezone: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    # When set, bearer tokens with iat strictly before this instant are rejected (SEC-04).
    password_changed_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    avatar_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    membership: Mapped[Membership | None] = relationship(back_populates="user")


class Couple(Base):
    __tablename__ = "couples"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Column kept as ai_opt_in for existing DBs; API field is ai_enabled.
    ai_enabled: Mapped[bool] = mapped_column("ai_opt_in", default=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)

    memberships: Mapped[list[Membership]] = relationship(back_populates="couple")
    invites: Mapped[list[Invite]] = relationship(back_populates="couple")
    events: Mapped[list[Event]] = relationship(back_populates="couple")
    visits: Mapped[list[Visit]] = relationship(back_populates="couple")
    check_ins: Mapped[list[CheckIn]] = relationship(back_populates="couple")
    memories: Mapped[list[Memory]] = relationship(back_populates="couple")
    ai_usage: Mapped[list[AiDailyUsage]] = relationship(back_populates="couple")
    notifications: Mapped[list[AppNotification]] = relationship(back_populates="couple")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id"),
        UniqueConstraint("couple_id", "seat", name="uq_memberships_couple_seat"),
        CheckConstraint("seat IN (1, 2)", name="ck_memberships_seat_range"),
    )

    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # Seat 1 = creator, seat 2 = joiner. Unique per couple so a join race cannot add a third member.
    seat: Mapped[int] = mapped_column(SmallInteger)
    joined_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="membership")


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime)
    used_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="invites")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(120))
    starts_at: Mapped[datetime] = mapped_column(UtcDateTime)
    ends_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="events")


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(120))
    starts_at: Mapped[datetime] = mapped_column(UtcDateTime)
    ends_at: Mapped[datetime] = mapped_column(UtcDateTime)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    traveler_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="visits")
    budget: Mapped[Budget | None] = relationship(back_populates="visit")


class Budget(Base):
    __tablename__ = "budgets"

    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.id", ondelete="CASCADE"), primary_key=True)
    currency: Mapped[str] = mapped_column(String(3))
    total_minor: Mapped[int]

    visit: Mapped[Visit] = relationship(back_populates="budget")
    shares: Mapped[list[BudgetShare]] = relationship(back_populates="budget")


class BudgetShare(Base):
    __tablename__ = "budget_shares"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("budgets.visit_id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    amount_minor: Mapped[int]

    budget: Mapped[Budget] = relationship(back_populates="shares")


class CheckIn(Base):
    __tablename__ = "check_ins"
    __table_args__ = (UniqueConstraint("user_id", "local_date"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    local_date: Mapped[date]
    mood: Mapped[str] = mapped_column(String(16))
    note: Mapped[str | None] = mapped_column(String(280), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="check_ins")


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str | None] = mapped_column(String(80), nullable=True)
    body: Mapped[str] = mapped_column(String(2000))
    media_kind: Mapped[str | None] = mapped_column(String(16), nullable=True)
    media_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    media_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)

    couple: Mapped[Couple] = relationship(back_populates="memories")


class Presence(Base):
    __tablename__ = "presence"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    free_to_talk: Mapped[bool] = mapped_column(default=False)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)


class JoinFailure(Base):
    __tablename__ = "join_failures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class LoginFailure(Base):
    __tablename__ = "login_failures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True, default="")
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class RegisterFailure(Base):
    __tablename__ = "register_failures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True, default="")
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime)
    used_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)


class PasswordResetFailure(Base):
    __tablename__ = "password_reset_failures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True, default="")
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class AiDailyUsage(Base):
    """Per-couple Gemini request counter for a UTC calendar day."""

    __tablename__ = "ai_daily_usage"
    __table_args__ = (UniqueConstraint("couple_id", "day"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    day: Mapped[date]
    request_count: Mapped[int] = mapped_column(default=0)

    couple: Mapped[Couple] = relationship(back_populates="ai_usage")


class AppNotification(Base):
    """In-app alert for one member. Push delivery is out of scope."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    couple_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(String(280))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)
    read_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    couple: Mapped[Couple] = relationship(back_populates="notifications")
