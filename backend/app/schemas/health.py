from enum import StrEnum

from pydantic import BaseModel


class HealthStatus(StrEnum):
    ok = "ok"


class Health(BaseModel):
    status: HealthStatus
