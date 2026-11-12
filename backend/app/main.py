from fastapi import FastAPI

from app.schemas.health import Health, HealthStatus

app = FastAPI(title="Closer API", version="0.1.0")


@app.get("/health", response_model=Health, operation_id="getHealth")
def get_health() -> Health:
    return Health(status=HealthStatus.ok)
