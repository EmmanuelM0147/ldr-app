# AGENTS.md — Closer (long-distance couples app)

## Product
Closer is a two-person app for couples in long-distance relationships. One "couple space" has exactly 2 members, joined via invite code. MVP: shared visit calendar + countdown, visit planner with budget split, daily check-in, memory log, presence status, small opt-in AI features. Non-goals: chat, video calls.

## Stack
- Backend: FastAPI, SQLAlchemy, Alembic, Postgres (SQLite only in early dev), pytest
- Frontend: React + Vite + TypeScript (PWA), Playwright for e2e
- Infra: Docker Compose, GitHub Actions, AWS
- Contract: /docs/openapi.yaml is the source of truth

## Workflow rules
1. Read /docs/spec.md and /docs/backlog.md before starting. Work on ONE backlog task at a time, in order.
2. Contract-first: update openapi.yaml BEFORE implementing or changing any endpoint.
3. Every task ships with tests. Run the full test suite before saying a task is done.
4. Small diffs. Do not refactor unrelated code. Explain what changed and why in 3-5 lines.
5. After each task: tick it off in backlog.md and append the prompt used to /docs/ai-log.md.

## Security and privacy (non-negotiable)
- Never commit secrets; use env vars and .env.example.
- Every query is scoped by couple_id. A user must never read or write another couple's data. Add a test for this on every endpoint.
- Hash passwords (argon2/bcrypt). JWT with short expiry. Validate all input.
- Invite codes: single use, expiring, rate-limited.
- AI features are opt-in per couple. Never send user content to an LLM without that opt-in. Log no personal content.
- Provide a "delete my couple space" endpoint that removes all data.

## Code conventions
- Python: type hints, ruff, small functions, Pydantic schemas generated to match openapi.yaml.
- TypeScript: strict mode, no `any`, API client generated from openapi.yaml.
- Store all datetimes in UTC; convert to each user's timezone in the UI (Lagos and Abuja share WAT, but don't assume it).

## Definition of done
Tests pass, openapi.yaml updated, no secrets, backlog ticked, ai-log updated.
