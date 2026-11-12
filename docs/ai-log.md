# AI log

## 2026-11-12 — Task 1: Scaffold the API

The repo had no spec or backlog, so those were written from the charter. Task 1 added `GET /health` to the contract and implemented it.

Prompt:

```
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
```

## 2026-11-12 — Prompt pack step 0: setup

Added `.cursor/rules/closer.mdc` and the `frontend` directory. Spec rewrite waits on clarifying questions.

Prompt:

```
# Closer — Cursor Prompt Pack
Use Agent mode. Commit after every step. Log each prompt in /docs/ai-log.md.

## 0. Setup
Create repo `closer` with /docs, /backend, /frontend. Add AGENTS.md (root) and .cursor/rules/closer.mdc from this kit.

## 1. Spec
You are a product manager. Read AGENTS.md. Write /docs/spec.md for Closer: problem, users, MVP user stories with acceptance criteria, non-goals, data model, privacy requirements. Ask me up to 5 clarifying questions first.

## 2. Backlog
Read /docs/spec.md. Create /docs/backlog.md: small tasks (each under an hour), ordered, each with acceptance criteria and test notes. Groups: auth+pairing, calendar, visit planner, check-ins, memories, presence, AI features, deploy.

## 3. Contract + mocked frontend
Write /docs/openapi.yaml for auth, pairing, events, visits, check-ins, memories. Then build the React frontend against mocked data matching the contract. No backend yet.

## 4. Backend
Implement the FastAPI backend to match openapi.yaml exactly. SQLite first, SQLAlchemy models, Alembic, JWT auth, invite-code pairing. Enforce couple_id scoping everywhere. Add pytest tests per endpoint, including cross-couple access denial.

## 5. Connect + real-time
Connect the frontend to the real API (generated client). Add WebSocket presence ("free to talk") and live updates for check-ins.

## 6. Postgres + Docker
Move to Postgres with Alembic migrations. Add Dockerfiles and docker-compose.yml (api, db, frontend). Add .env.example.

## 7. Tests
Add integration tests against Postgres and a Playwright test: user A creates a space, user B joins via code, both see a shared visit and a check-in.

## 8. CI/CD + deploy
Add GitHub Actions: lint, test, build images, deploy to AWS only if tests pass. Document the deploy steps in /docs/deploy.md.

## 9. AI feature
Add an opt-in "date night ideas" endpoint using an LLM API. Key in env vars only, per-couple opt-in toggle, no content logging, tests with the LLM mocked.

## 10. Independent QA (new chat)
Act as an independent QA engineer. Read the spec and tests. Try to break: cross-couple authorization, invite-code reuse/expiry, timezone bugs, input validation, WebSocket auth. Report issues only; do not fix.

## 11. Fix + document
Fix the QA findings one at a time with tests. Then write README.md: what it does, architecture, how to run, how AI tools were used (link ai-log.md), and a privacy section.
```
