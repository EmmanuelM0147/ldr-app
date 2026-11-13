# Demo readiness

Local Compose (or host API + Vite against Compose Postgres) is the supported demo path. No cloud deploy is required for a live walkthrough.

## Env checklist

Copy `.env.example` → `.env`, then:

1. **`JWT_SECRET`** — required, ≥32 characters, not a placeholder.  
   `python -c "import secrets; print(secrets.token_urlsafe(48))"`
2. **`REGISTRATION_ALLOWED_EMAILS`** — optional. Comma-separated; when set, only those emails can register (same generic 409 as a taken address). Leave empty for open local registration. Documented in `.env.example` and the README.
3. **`LLM_API_KEY`** — optional; only needed if you demo date-night ideas after the couple opts in. Keep empty otherwise. Never commit real keys.

## Preferred: full Compose

```bash
cp .env.example .env
# set JWT_SECRET (and optional REGISTRATION_ALLOWED_EMAILS) in .env
docker compose up --build
# UI http://localhost:5173  ·  API docs http://localhost:8000/docs
```

Pairing e2e against that stack:

```bash
cd frontend && npm run test:e2e:compose
```

## Fallback: Compose DB + host API + Vite

When Docker Hub / image rebuild is awkward but Postgres is already up:

```bash
docker compose up -d db
cd backend
# PowerShell: load JWT_SECRET from .env or set explicitly
$env:DATABASE_URL="postgresql+psycopg://closer:closer@localhost:5433/closer"
$env:JWT_SECRET="<from-.env>"
$env:CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

In another terminal (omit `VITE_API_URL` so Vite proxies `/auth`, `/ws`, etc. to `:8000`):

```bash
cd frontend
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
npm run dev -- --host 127.0.0.1 --port 5173
```

## Still outstanding for a public live demo

- Publish a stable URL (AWS/Render/etc.) — needs secrets + one verified deploy; not done from this pass.
- Demo video link in the README.
- Real PNGs under `docs/screenshots/` (see that folder’s README for capture steps).
- Optional: set `REGISTRATION_ALLOWED_EMAILS` on the public host so random signups stay closed.
