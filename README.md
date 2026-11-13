# Closer

A private two-person app for couples in long-distance relationships. Shared visit calendar and countdown, visit planner with cost split, daily check-ins, a memory timeline, and a "free to talk" presence signal.

**Live demo:** _not published yet_  ·  **Demo video:** _not published yet_  ·  **Repo:** https://github.com/EmmanuelM0147/ldr-app

## Why this exists

When you live in different cities, chat apps already handle talking — what gets lost is the shared plan: when you next meet, what the trip costs, how the other person is feeling today, and whether they are free to talk right now. Closer is for exactly two people who want one private couple space for that plan and daily pulse, not another messenger or video call tool.

## Features

- Invite-code pairing: exactly two members per couple space
- Shared calendar and visit planner with countdown and cost split
- Daily check-in with mood and a shared prompt
- Memory timeline with photos/videos and "on this day"
- Real-time presence ("free to talk")
- Opt-in AI features: date-night ideas (weekly recap not in MVP)
- Delete-my-space: removes all couple data and media

## Screenshots

Real captures go under [`docs/screenshots/`](docs/screenshots/README.md) (see capture steps there). Slots:

- Home (countdown + partner cards) — `docs/screenshots/home.png`
- Calendar — `docs/screenshots/calendar.png`
- Visits — `docs/screenshots/visits.png`
- Check-in — `docs/screenshots/check-in.png`
- Memories — `docs/screenshots/memories.png`

## Architecture

React PWA → FastAPI → PostgreSQL. Presence and check-in updates go over an authenticated WebSocket (`/ws`). Memory and avatar media are stored under `MEDIA_ROOT` on the API host (local disk in Compose; object storage is a later deploy choice). Date-night ideas call an external LLM only when the couple has opted in. **`docs/openapi.yaml` is the API contract** — update it before changing endpoints.

```
┌─────────────┐     HTTPS / WS      ┌─────────────┐     SQL      ┌──────────┐
│ React PWA   │ ──────────────────► │ FastAPI     │ ───────────► │ Postgres │
│ (Vite/TS)   │ ◄────────────────── │ SQLAlchemy  │              └──────────┘
└─────────────┘   JSON + media      │ Alembic     │──► MEDIA_ROOT
                                    └──────┬──────┘
                                           │ opt-in only
                                           ▼
                                      LLM API (ideas)
```

| Layer | Tech |
|---|---|
| Frontend | React, Vite, TypeScript, PWA |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL (SQLite for early unit tests) |
| Real-time | WebSockets |
| Tests | pytest, Vitest, Playwright |
| Infra | Docker Compose, GitHub Actions; AWS deploy planned |

## Run it locally

```bash
cp .env.example .env
# Required: set JWT_SECRET to a strong random string (≥32 chars). Example:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
# Optional: REGISTRATION_ALLOWED_EMAILS=you@example.com,partner@example.com
#   When set, only those emails can register; empty keeps registration open.
docker compose up --build
# frontend: http://localhost:5173   api docs: http://localhost:8000/docs
```

Without Compose, point `DATABASE_URL` at Postgres (or leave it unset for SQLite), set `JWT_SECRET`, run Alembic + Uvicorn from `backend/`, and `npm run dev` in `frontend/`. Host-API + Compose-DB fallback commands are in [`docs/demo.md`](docs/demo.md).

Run tests:

```bash
cd backend && pytest
cd frontend && npm test
cd frontend && npm run test:e2e          # mock API
cd frontend && npm run test:e2e:compose  # pairing against Compose stack
```

## Deployment

GitHub Actions (`.github/workflows/test.yml`) runs backend Ruff + pytest and frontend typecheck + Vitest, then builds API/web images. On pushes to `main`, a `deploy` job (needs those jobs) pushes to ECR and rolls ECS services when secrets are configured. Secrets, variables, first-time AWS setup, and rollback are in [`docs/deploy.md`](docs/deploy.md). Local Compose remains the default for day-to-day work.

## How I used AI tools

This project was built with AI tooling under an explicit engineering process.

**Tools:** Cursor (Agent mode), Composer / Claude-family models in Cursor, Vitest and Playwright for verification.

**Workflow**

1. Spec first: `docs/spec.md` written with an AI "product manager" pass, then reviewed and edited by me.
2. Backlog: `docs/backlog.md` broken into small, testable tasks.
3. Rules: `AGENTS.md` and `.cursor/rules` keep every session aligned (contract-first, tests per task, security rules).
4. Contract-first: `docs/openapi.yaml` defined before endpoints; frontend built against it (mock client first, then generated client).
5. Independent QA: separate chats review security, edge cases, and accessibility (findings fixed with tests; keep notes in `docs/qa-log.md` when you run a formal pass).
6. Every prompt logged in `docs/ai-log.md`.

**What AI did well:** turning the charter into a concrete OpenAPI contract and backlog; scaffolding couple-scoped CRUD with cross-couple denial tests; wiring presence over WebSockets; keeping UI work iterative (tokens → PWA → screens → polish) without inventing chat.

**Where it went wrong and how I caught it:**

- Visit/event lookups drafted as "load by id" until rules and tests forced `couple_id` in the same query — caught by cross-couple 404 tests and the Closer agent rule.
- Optional visit budget with a default currency treated blank amounts as a zero split — caught in the polish pass; form parsing now ignores empty amounts and requires shares to sum to the total.
- Password field toggle sat inside a `<label>`, so Playwright `getByLabel("Password")` also hit "Show password" — caught in e2e; label structure and exact matching fixed.

**What I reviewed by hand:** auth, JWT handling, invite hashing/expiry/rate limits, couple_id scoping, delete-space cascades, media path isolation, env-only secrets, and AI opt-in gating (no model call when off).

## Security and privacy

- Every query is scoped to the couple; cross-couple access is tested on data endpoints (404).
- Passwords are argon2id hashes; JWTs expire in 60 minutes.
- Invite codes are single-use, expire in 7 days, stored as SHA-256, and rate-limited.
- AI features are opt-in per couple; prompts and replies are not logged; no call when opt-in is off.
- Delete-my-space removes couple-owned rows and media; both user accounts remain.
- Media lives on the API filesystem under `MEDIA_ROOT` today — encrypt volume/backups at the host or move to managed object storage for production. No end-to-end encryption of couple content.

## Testing

- **Backend:** pytest for auth, pairing, events, visits/budgets, check-ins, memories, presence/WS, ideas (LLM mocked), and cross-couple denial.
- **Frontend:** Vitest for formatters, tokens/contrast, forms, and key components.
- **E2E:** Playwright mock flows (home, calendar-add, visit-add) and Compose pairing (`user A` invites, `user B` joins, both see shared data).
- **CI:** GitHub Actions runs backend lint + pytest, frontend typecheck + Vitest, Docker image builds, then gated deploy on `main`. Playwright e2e stays local (`npm run test:e2e` / `test:e2e:compose`).

## Limitations and next steps

- No end-to-end encryption; operator of the API can read stored content.
- No push notifications; presence is in-app WebSocket only.
- One couple space per user; no chat or video (by design).
- Media is local disk in Compose, not yet object storage / CDN.
- Live demo URL, demo video, and screenshot gallery are still outstanding.
- AWS resources (ECR/ECS/RDS) must be provisioned and GitHub secrets set before `deploy` succeeds — see `docs/deploy.md`.

## Project structure

```
/backend   FastAPI app, models, migrations, tests
/frontend  React PWA, unit + e2e tests
/docs      spec.md, backlog.md, openapi.yaml, ai-log.md
AGENTS.md  rules for coding agents
```
