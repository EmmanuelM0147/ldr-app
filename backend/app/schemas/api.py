from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _blank(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


class UserOut(ApiModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    timezone: str
    created_at: datetime


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1, max_length=40)
    timezone: str = "UTC"

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 40:
            raise ValueError("Display name must be 1 to 40 characters.")
        return cleaned

    @field_validator("timezone")
    @classmethod
    def iana_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Timezone must be a valid IANA name.") from exc
        return value


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()


class AuthResponse(ApiModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: Literal[3600] = 3600
    user: UserOut


class MemberOut(ApiModel):
    user_id: uuid.UUID
    display_name: str
    timezone: str
    joined_at: datetime


class CoupleOut(ApiModel):
    id: uuid.UUID
    ai_opt_in: bool
    created_at: datetime
    members: list[MemberOut]


class InviteCreated(ApiModel):
    code: str
    expires_at: datetime


class JoinRequest(ApiModel):
    code: str = Field(min_length=8)


class EventOut(ApiModel):
    id: uuid.UUID
    couple_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    starts_at: datetime
    ends_at: datetime | None
    location: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class EventWrite(ApiModel):
    title: str = Field(min_length=1, max_length=120)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return _utc(value)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 120:
            raise ValueError("Title must be 1 to 120 characters.")
        return cleaned

    @field_validator("location", "notes")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        return _blank(value)


class EventPatch(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return _utc(value)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 120:
            raise ValueError("Title must be 1 to 120 characters.")
        return cleaned

    @field_validator("location", "notes")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        return _blank(value)


class BudgetShareIn(ApiModel):
    user_id: uuid.UUID
    amount_minor: int = Field(ge=0)


class BudgetIn(ApiModel):
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    total_minor: int = Field(ge=0)
    shares: list[BudgetShareIn] = Field(min_length=2, max_length=2)


class BudgetOut(BudgetIn):
    pass


class VisitOut(ApiModel):
    id: uuid.UUID
    couple_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    starts_at: datetime
    ends_at: datetime
    location: str | None
    notes: str | None
    traveler_user_id: uuid.UUID | None
    budget: BudgetOut | None
    created_at: datetime
    updated_at: datetime


class VisitWrite(ApiModel):
    title: str = Field(min_length=1, max_length=120)
    starts_at: datetime
    ends_at: datetime
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    traveler_user_id: uuid.UUID | None = None
    budget: BudgetIn | None = None

    @field_validator("starts_at", "ends_at")
    @classmethod
    def utc(cls, value: datetime) -> datetime:
        return _utc(value)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 120:
            raise ValueError("Title must be 1 to 120 characters.")
        return cleaned

    @field_validator("location", "notes")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        return _blank(value)


class VisitPatch(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    traveler_user_id: uuid.UUID | None = None

    @field_validator("starts_at", "ends_at")
    @classmethod
    def utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return _utc(value)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 120:
            raise ValueError("Title must be 1 to 120 characters.")
        return cleaned

    @field_validator("location", "notes")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        return _blank(value)


class CountdownOut(ApiModel):
    visit: VisitOut | None
    seconds_until: int | None = Field(default=None, ge=0)


Mood = Literal["great", "good", "okay", "low", "rough"]


class CheckInOut(ApiModel):
    id: uuid.UUID
    couple_id: uuid.UUID
    user_id: uuid.UUID
    local_date: date
    mood: Mood
    note: str | None
    created_at: datetime
    updated_at: datetime


class CheckInWrite(ApiModel):
    mood: Mood
    note: str | None = Field(default=None, max_length=280)

    @field_validator("note")
    @classmethod
    def empty_note(cls, value: str | None) -> str | None:
        return _blank(value)


class MemoryOut(ApiModel):
    id: uuid.UUID
    couple_id: uuid.UUID
    author_id: uuid.UUID
    title: str | None
    body: str
    created_at: datetime
    updated_at: datetime


class MemoryWrite(ApiModel):
    title: str | None = Field(default=None, max_length=80)
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("title")
    @classmethod
    def empty_title(cls, value: str | None) -> str | None:
        cleaned = _blank(value)
        if cleaned is not None and len(cleaned) > 80:
            raise ValueError("Title must be at most 80 characters.")
        return cleaned

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 2000:
            raise ValueError("A memory needs 1 to 2000 characters.")
        return cleaned


class MemoryPatch(ApiModel):
    title: str | None = Field(default=None, max_length=80)
    body: str | None = Field(default=None, min_length=1, max_length=2000)

    @field_validator("title")
    @classmethod
    def empty_title(cls, value: str | None) -> str | None:
        cleaned = _blank(value)
        if cleaned is not None and len(cleaned) > 80:
            raise ValueError("Title must be at most 80 characters.")
        return cleaned

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 2000:
            raise ValueError("A memory needs 1 to 2000 characters.")
        return cleaned


class ErrorOut(ApiModel):
    detail: str


class PresenceOut(ApiModel):
    user_id: uuid.UUID
    free_to_talk: bool
    updated_at: datetime


class PresenceList(ApiModel):
    members: list[PresenceOut]


class PresenceWrite(ApiModel):
    free_to_talk: bool
