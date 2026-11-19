# Closer

A private **two-person** app for couples in a long-distance relationship.

Shared visit calendar and countdown, trip budget split, daily check-ins, a memory timeline (with photos/videos), in-app notifications, and a "free to talk" presence signal. **Not** a chat or video app.

**Repo:** https://github.com/EmmanuelM0147/ldr-app  
**Live demo:** [app](https://frontend-kohl-one-76.vercel.app) · [API](https://backend-lilac-nine-81.vercel.app)  
**Demo video:** not published yet — recording script: [`docs/demo-video.md`](docs/demo-video.md)

Hosted on Vercel (frontend + FastAPI) with Supabase Postgres. Presence/WebSocket is best locally or on AWS/ECS; see [`docs/deploy.md`](docs/deploy.md).

---

## Quick start

You need Docker Desktop (or Docker Engine + Compose).

```bash
# 1. Env
cp .env.example .env

# 2. Required secret (≥32 chars; placeholders like change-me are rejected)
python -c "import secrets; print(secrets.token_urlsafe(48))"
# Paste the value into .env as JWT_SECRET=...

# 3. Run
docker compose up --build
```

| Service  | URL                         |
| -------- | --------------------------- |
| App      | http://localhost:5173       |
| API docs | http://localhost:8000/docs  |

First visit: register → create a couple space → share the invite code with your partner (or a second browser/profile).

More env notes: [`.env.example`](.env.example). Demo tips and a host-API fallback: [`docs/demo.md`](docs/demo.md).

---

## Why this exists

Chat apps already handle talking. What gets messy across cities is the **shared plan**: when you next meet, what the trip costs, how each of you feels today, and whether the other person is free to talk. Closer is one private couple space for that plan and daily pulse.

---

## Features

- **Pairing** — invite code with copy/paste CTAs; exactly two members per space; live notice when a partner joins
- **Calendar & visits** — shared events, visit countdown, optional cost split
- **Check-ins** — daily mood (+ optional note) both partners can see
- **Memories** — timeline with photos/videos and "on this day"
- **Notifications** — in-app inbox (bell + unread badge): partner join, check-ins, new events/visits; mark one/all read. No push
- **Presence** — "free to talk" over an authenticated WebSocket
- **Opt-in AI** — date ideas via Google Gemini (`POST /ai/date-ideas`), only when the couple enables AI
- **Account** — timezone-aware profiles, rate-limited auth, forgot/reset password (email SMTP not wired yet)
- **Delete space** — removes all couple data and media; user accounts remain

---

## Screenshots

From the local PWA (~390×844). How they were captured: [`docs/screenshots/`](docs/screenshots/README.md).

| Home | Calendar | Visits |
| --- | --- | --- |
| ![Home](docs/screenshots/home.png) | ![Calendar](docs/screenshots/calendar.png) | ![Visits](docs/screenshots/visits.png) |

| Check-in | Memories |
| --- | --- |
| ![Check-in](docs/screenshots/check-in.png) | ![Memories](docs/screenshots/memories.png) |

Also: [login](docs/screenshots/login.png) · [settings](docs/screenshots/settings.png)

---

## Architecture

```
React PWA  ──HTTPS / WS──►  FastAPI (+ Alembic)  ──SQL──►  PostgreSQL
                              │
                              ├── MEDIA_ROOT (avatars, memory files)
                              └── Gemini (date ideas, opt-in only)
```

| Layer     | Stack                                              |
| --------- | -------------------------------------------------- |
| Frontend  | React, Vite, TypeScript, PWA                       |
| Backend   | FastAPI, SQLAlchemy, Alembic                       |
| Database  | PostgreSQL (SQLite only for some unit tests)       |
| Real-time | WebSocket `/ws` (JWT; presence, check-ins, partner join, notifications) |
| AI        | Google Gemini (`google-genai`), server-side keys   |
| Tests     | pytest, Vitest, Playwright                         |
| Infra     | Docker Compose, GitHub Actions → AWS (see deploy)  |

**Contract:** [`docs/openapi.yaml`](docs/openapi.yaml) is the source of truth — update it before changing endpoints.

| Doc | Link |
| --- | --- |
| Product spec | [`docs/spec.md`](docs/spec.md) |
| Task tracker (acceptance criteria) | [`docs/backlog.md`](docs/backlog.md) |
| Agent team + collaboration | [`docs/agent-team.md`](docs/agent-team.md) |
| Dev process loop | [`docs/process.md`](docs/process.md) |
| Agent rules | [`AGENTS.md`](AGENTS.md) |
| Prompt log (evidence agents used the tracker) | [`docs/ai-log.md`](docs/ai-log.md) |

---

## Develop without full Compose rebuild

Preferred day-to-day path is still `docker compose up --build`.

If you only need Postgres in Docker and want the API/UI on the host:

```bash
docker compose up -d db

# backend (from backend/, with venv active)
# DATABASE_URL=postgresql+psycopg://closer:closer@localhost:5433/closer
# JWT_SECRET=... CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# frontend (from frontend/)
# VITE_API_URL=http://localhost:8000   # or leave unset and use the Vite proxy
npm install
npm run dev
```

PowerShell-oriented steps: [`docs/demo.md`](docs/demo.md).

---

## Tests

Unit + API/integration suites in one command:

```bash
# Unix / Git Bash
./scripts/test.sh

# Windows PowerShell
.\scripts\test.ps1
```

Or separately:

```bash
cd backend && pytest
cd frontend && npm test
cd frontend && npm run test:e2e              # Playwright vs mock API
cd frontend && npm run test:e2e:compose      # pairing e2e (Compose up)
```

CI (`.github/workflows/test.yml`): Ruff + pytest, frontend typecheck + Vitest, image builds on every PR/push. CD: Vercel auto-deploys the live app/API from `main`; the workflow also has a gated AWS/ECS deploy job when `DEPLOY_ENABLED=true` (see [`docs/deploy.md`](docs/deploy.md)).

---

## Deployment

Local Compose is the default for demos.

Production path: GitHub Actions builds images, then a gated `deploy` job pushes to ECR and updates ECS when secrets are set. Secrets, AWS setup, optional Vercel wiring, and rollback: [`docs/deploy.md`](docs/deploy.md).

---

## Security and privacy

- Every data query is scoped to the caller’s couple; other couples get **404**. Cross-couple denial is tested on data endpoints.
- Passwords: **argon2id**. JWTs expire in **60 minutes**. `JWT_SECRET` must be ≥32 characters (placeholders rejected at boot).
- Invite codes: single-use, 7-day expiry, SHA-256 at rest, rate-limited. Login/register are rate-limited too.
- Optional `REGISTRATION_ALLOWED_EMAILS` locks who can sign up (demos / closed beta).
- Forgot/reset password uses hashed, single-use, short-lived tokens. Optional **SMTP_*** env sends the reset email; `AUTH_RESET_DEBUG=1` may also return `reset_url` locally — never in production.
- Register returns a **generic 409** for taken or disallowed emails (same copy); status may still hint existence — accepted for this MVP.
- AI date ideas are **off until the couple opts in** (`ai_enabled`). Only short form fields go to Gemini via `GEMINI_API_KEY` / `GEMINI_MODEL`. Prompts and replies are not logged; no model call when opt-in is off (limit: 10/couple/UTC day).
- Delete space removes couple-owned rows and media under `MEDIA_ROOT`. User accounts remain.
- Media is on the API host filesystem today — encrypt volumes/backups or move to object storage for production. No E2E encryption of couple content.

---

## How AI was used on this project

Built with Cursor agents under an explicit team process: product-manager → planner → contract → implementer, one backlog task at a time, with prompts logged after each slice. See [`docs/agent-team.md`](docs/agent-team.md) and [`docs/process.md`](docs/process.md). Rules: [`AGENTS.md`](AGENTS.md), [`.cursor/rules/closer.mdc`](.cursor/rules/closer.mdc).

**Worked well:** OpenAPI + backlog from the charter; couple-scoped CRUD with denial tests; WebSocket presence; iterative UI without inventing chat.

**Caught with tests/rules (not left as-is):**

- Loading visits/events by id alone → fixed to always filter by `couple_id`
- Empty budget fields treated as a zero split → ignore blanks; shares must sum to total
- Password “show” control nested in the label broke Playwright → structure/exact match fixed

Auth, invites, scoping, delete cascades, media isolation, secrets-in-env, and AI opt-in gating were reviewed by hand. Formal QA notes: [`docs/qa-log.md`](docs/qa-log.md) / [`docs/qa-report.md`](docs/qa-report.md).

---

## Limitations

- No end-to-end encryption (the API operator can read stored content)
- No push notifications (in-app inbox + WebSocket only)
- One couple space per user; no chat or video (by design)
- Media is local disk in Compose / ephemeral on Vercel, not object storage/CDN yet
- Password-reset email needs `SMTP_HOST` (and related) configured; otherwise only debug `reset_url` / no delivery
- Demo video still outstanding (script in [`docs/demo-video.md`](docs/demo-video.md))
- Vercel serverless WebSocket for presence is unreliable; prefer Compose or AWS/ECS for realtime demos
- AWS (ECR/ECS/RDS) + GitHub secrets + `DEPLOY_ENABLED=true` required before the full CI→ECS deploy path runs

---

## Project layout

```
backend/    FastAPI app, models, migrations, pytest
frontend/   React PWA, Vitest, Playwright
docs/       spec, backlog, agent-team, process, openapi, ai-log, demo, deploy, screenshots
scripts/    single-command test runners (test.sh / test.ps1)
AGENTS.md   rules for coding agents (+ links to modular docs)
```
