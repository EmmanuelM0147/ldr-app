from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import cors_origin_list
from app.routers import auth, checkins, couples, events, ideas, memories, presence, visits
from app.schemas.health import Health, HealthStatus

app = FastAPI(title="Closer API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(couples.router)
app.include_router(events.router)
app.include_router(visits.router)
app.include_router(checkins.router)
app.include_router(memories.router)
app.include_router(presence.router)
app.include_router(ideas.router)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    parts: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(item) for item in err["loc"] if item != "body")
        message = str(err["msg"])
        parts.append(f"{loc}: {message}" if loc else message)
    return JSONResponse(status_code=422, content={"detail": "; ".join(parts)})


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(_request: Request, _exc: SQLAlchemyError) -> JSONResponse:
    # Return a normal JSON response so CORSMiddleware can attach headers
    # (unhandled 500s often look like "Failed to fetch" in the browser).
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable. Check DATABASE_URL / POSTGRES_URL."},
    )


@app.get("/", operation_id="getRoot")
def get_root() -> dict[str, str]:
    return {"service": "Closer API", "docs": "/docs", "health": "/health"}


@app.get("/health", response_model=Health, operation_id="getHealth")
def get_health() -> Health:
    return Health(status=HealthStatus.ok)
