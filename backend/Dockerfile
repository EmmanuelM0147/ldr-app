FROM python:3.13-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh

RUN pip install --no-cache-dir . \
    && sed -i 's/\r$//' ./scripts/entrypoint.sh \
    && chmod +x ./scripts/entrypoint.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

ENTRYPOINT ["sh", "./scripts/entrypoint.sh"]
