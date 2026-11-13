# Deploy Closer

Primary target is **AWS** (ECS + RDS) via GitHub Actions. **Vercel** can host a demo of the Vite frontend and FastAPI API as two projects; it is not a full substitute for ECS (WebSockets and local media disks are limited).

---

## AWS (production path)

Closer ships as two container images (API + web) built in GitHub Actions. Tests and a dry-run image build must pass before the deploy job runs. Deploy runs only on pushes to `main`.

## Pipeline order

Defined in `.github/workflows/test.yml`:

1. `backend` — Ruff + pytest  
2. `frontend` — TypeScript check + Vitest  
3. `build-images` — needs `backend` and `frontend`; builds API and web Docker images (no push)  
4. `deploy` — needs `backend`, `frontend`, and `build-images`; pushes to ECR and rolls ECS services

If any test job fails, images are not treated as releasable and deploy does not start.

## AWS shape (target)

| Piece | Role |
|---|---|
| Amazon ECR | `closer-api` and `closer-web` repositories |
| ECS Fargate | One service for the API, one for the nginx frontend |
| RDS Postgres | Application database (`DATABASE_URL`) |
| EFS or S3 | Optional later; MVP media can use an EFS mount at `MEDIA_ROOT` |
| ALB / HTTPS | Terminate TLS; route `/` to web, `/api` or API host to the API |

Wire `CORS_ORIGINS` and `VITE_API_URL` to the public HTTPS origins before the first production build.

## GitHub configuration

### Secrets (Actions → Secrets)

| Secret | Purpose |
|---|---|
| `AWS_ROLE_ARN` | IAM role for GitHub OIDC (`id-token: write` on the deploy job) |
| `ECR_REGISTRY` | Registry host, e.g. `123456789012.dkr.ecr.eu-west-1.amazonaws.com` |
| `ECS_CLUSTER` | ECS cluster name |
| `ECS_SERVICE_API` | ECS service name for the API |
| `ECS_SERVICE_WEB` | ECS service name for the frontend |

Do not commit access keys. Prefer OIDC federation to the `AWS_ROLE_ARN` role with least privilege: ECR push, ECS update/describe, and pass-role only as required.

### Variables (Actions → Variables)

| Variable | Purpose |
|---|---|
| `AWS_REGION` | Defaults to `eu-west-1` if unset |
| `VITE_API_URL` | Public API base URL baked into the web image at build time |
| `DEPLOY_ENABLED` | Set to `true` to run the `deploy` job on `main`; leave unset until secrets exist |

### Environment

The deploy job uses the `production` environment so you can require reviewers and store environment-scoped secrets.

## Application secrets on the API task

Set these on the ECS task definition / Secrets Manager (not in git):

- `DATABASE_URL`
- `JWT_SECRET` (strong random string, min 32 characters; placeholders rejected at boot)
- `CORS_ORIGINS`
- `MEDIA_ROOT` (path on the task filesystem or mount)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional; ideas stay disabled until a couple opts in)

Match names in `.env.example`.

## First-time AWS checklist

1. Create ECR repos `closer-api` and `closer-web`.
2. Create RDS Postgres; run `alembic upgrade head` from a one-off task or release step using the API image.
3. Create ECS cluster + task definitions that pull from ECR and inject secrets.
4. Create the GitHub OIDC provider and deploy role; store `AWS_ROLE_ARN` and the secrets above.
5. Set `VITE_API_URL` and `AWS_REGION` repository variables.
6. Push to `main` and confirm `backend` → `frontend` → `build-images` → `deploy`.

## Rollback

1. Find the previous good image tag (prior `github.sha`) in ECR.  
2. Update both ECS task definitions (or services) to that tag for `closer-api` and `closer-web`.  
3. Run:

```bash
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_API" --force-new-deployment
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_WEB" --force-new-deployment
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE_API" "$ECS_SERVICE_WEB"
```

4. If a bad migration shipped, restore RDS from the last snapshot before retrying a forward migration. Prefer expand/contract migrations so rollback rarely needs a down revision in production.

## Local images (no AWS)

```bash
docker compose build
docker compose up
```

CI’s `build-images` job is the same Dockerfiles with `push: false`.

---

## Vercel (optional demo)

Use **two** Vercel projects from the same GitHub repo. Do not put frontend and API in one project without a monorepo/services setup.

### Backend project

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Framework | FastAPI (auto) / Python |
| Entrypoint | `app.main:app` (also in `backend/pyproject.toml` → `[tool.vercel]`) |

**Environment variables (Production):**

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | yes | ≥32 chars; not a placeholder |
| `DATABASE_URL` | yes* | Managed Postgres pooler URL, e.g. `postgresql+psycopg://postgres.<ref>:<urlencoded-password>@aws-0-….pooler.supabase.com:6543/postgres`. Vercel’s `POSTGRES_URL` works as a fallback when `DATABASE_URL` is unset/SQLite. The app strips all query params (`pgbouncer`, `supa`, etc.) and sets `sslmode=require` for Supabase hosts. Do not use `SUPABASE_URL` (https API). SQLite will fail auth on Vercel |
| `CORS_ORIGINS` | yes | Exact frontend origin(s), e.g. `https://frontend-kohl-one-76.vercel.app` |
| `MEDIA_ROOT` | optional | Ephemeral on Vercel; fine for tiny demos only |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | optional | Server-only; date ideas stay off until couple opts in |
| `REGISTRATION_ALLOWED_EMAILS` | optional | Comma-separated allowlist |
| `PUBLIC_APP_URL` | optional | Frontend origin for reset-link debug |
| `AUTH_RESET_DEBUG` | no | Leave unset/`0` in production |

The API runs `alembic upgrade head` on cold start (skipped for SQLite). Confirm register returns `201` (not `503`) after the first cold start. You can still migrate manually:

```bash
cd backend
alembic upgrade head
```

Use a **dedicated** Postgres for Closer (do not point at another product’s Supabase). Prefer the pooler URL on port `6543`.

**Sanity checks** (replace with your API host):

```bash
curl -sS https://backend-lilac-nine-81.vercel.app/
curl -sS https://backend-lilac-nine-81.vercel.app/health
# OPTIONS should include Access-Control-Allow-Origin for your frontend:
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://frontend-kohl-one-76.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://backend-lilac-nine-81.vercel.app/auth/login
```

Root `/` returning `{"detail":"Not Found"}` on older deploys was normal before `GET /` existed; `/health` is the liveness check. Auth routes must return JSON (401/422), not a platform 500.

### Frontend project

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Rewrites | `frontend/vercel.json` → SPA fallback to `index.html` |

**Environment variables (must be available at Build time):**

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes | Public API origin, no trailing slash, e.g. `https://backend-lilac-nine-81.vercel.app` |

If `VITE_API_URL` is missing, the client falls back to `window.location.origin` and login POSTs to the static site → generic **"Request failed."** After changing `VITE_API_URL`, trigger a **Redeploy** (rebuild), not only a restart.

### Verify login end-to-end

1. Open the frontend `/login` URL (hard refresh should not 404).
2. DevTools → Network: `POST …/auth/login` must hit the **backend** host, not the frontend host.
3. Preflight `OPTIONS` must show `Access-Control-Allow-Origin` matching the frontend.
4. Wrong password → `401` with `"Email or password is wrong."`; success → token + redirect home.

### Vercel limitations

- Presence WebSocket (`/ws`) is unreliable on Vercel serverless; prefer AWS/ECS for realtime.
- Uploaded media under `MEDIA_ROOT` does not persist across instances; use object storage later.
- Always use external Postgres; never rely on SQLite on Vercel.
