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

## 2026-11-12 — Prompt pack step 1: spec

Rewrote `docs/spec.md` after these answers: email and password with display name and IANA timezone; calendar events are separate from budgeted visits; one currency with two amounts that sum to the total; one mood plus an optional note per local day; either member can delete the space and both accounts stay.

Prompt: same Cursor prompt pack logged in step 0.

## 2026-11-12 — Prompt pack step 2: backlog

Replaced `docs/backlog.md` with 25 ordered tasks in the requested groups. Each task has acceptance criteria and test notes.

Prompt: same Cursor prompt pack logged in step 0.

## 2026-11-12 — Prompt pack step 3: contract and mocked frontend

Wrote the OpenAPI paths for auth, pairing, events, visits, check-ins, and memories. The React app runs against an in-memory client with the same shapes. No new backend routes.

Prompt: same Cursor prompt pack logged in step 0.

## 2026-11-12 — Prompt pack step 4: backend

Implemented the FastAPI API on SQLite with Alembic revision `0001_initial`. Auth uses argon2id and a 60-minute JWT. Invite codes are stored as SHA-256, expire in 7 days, and are rate-limited. Events, visits, budgets, check-ins, and memories are scoped by couple. Pytest covers cross-couple denial (15 passed) and ruff is clean.

Prompt: proceed

## 2026-11-12 — Prompt pack step 5: connect and real-time

The React app now calls the API through a client generated from `docs/openapi.yaml`. Presence is `GET`/`PUT /presence`, and `/ws` pushes presence and check-in changes to that couple only. The socket takes the JWT in the first frame, not the URL. Backend tests: 19 passed. Frontend tests: 10 passed.

Prompt: proceed

## 2026-11-12 — Prompt pack step 6: Postgres and Docker

Added `psycopg`, Dockerfiles for api and frontend, and Compose services for db/api/frontend. Host Postgres is on port 5433 to avoid a local Postgres on 5432. SQLite unit tests remain the default. Migration tests cover SQLite and Postgres. Backend tests: 20 passed. `docker compose up` serves the stack.

Prompt: proceed

## 2026-11-12 — Frontend UX against the spec

Moved delete to Settings with typed `DELETE` confirmation, fixed the header, showed home events plus countdown, added optional budget fields on visit create (OpenAPI `VisitWrite.budget`), put the timezone line in the shared shell footer, and showed both partners' today check-ins. Frontend 12 tests and backend 20 tests passed.

Prompt: Review the frontend against /docs/spec.md and list gaps. Then fix in this order: (1) move "Delete space" to a settings page with typed confirmation, (2) fix header layout, (3) show events list and visit countdown, (4) add budget/cost fields to visits, (5) put timezone footer in the shared layout, (6) show both partners' check-ins. Update openapi.yaml first where fields change. Add tests.

## 2026-11-12 — UI redesign step 1: design tokens

Added `frontend/src/tokens.css` with warm palette, partner accent colors, type scale, 8px spacing, radii, shadows, and dark mode (`prefers-color-scheme` / `data-theme`). Raised muted text contrast to WCAG AA. Frontend tokens tests passed.

Prompt: Redesign the frontend UI for Closer without changing the API. Mobile-first PWA, keep the warm palette and serif headings. Do these in order, one commit each: (1) Design tokens…

## 2026-11-12 — UI redesign step 2: layout shell

Icon + label bottom nav (44px targets), avatar menu with Settings and Sign out, `/settings` with typed `DELETE` for space removal, and Check-in label on `/check-ins`. Frontend 17 tests and backend suite passed.

Prompt: same redesign prompt as step 1 (item 2).

## 2026-11-12 — UI redesign step 3: home

Home now has a hero countdown (or plan-visit CTA), partner cards with initial/city/local time/status/mood, quick actions, and a this-week list of events and visits. Frontend 22 tests passed.

Prompt: same redesign prompt as step 1 (item 3).

## 2026-11-12 — UI redesign step 4: calendar

Month grid marks event days, day detail lists that day's events, and a FAB opens a bottom-sheet event form with end-after-start checks and en-GB date framing. Frontend 23 tests passed.

Prompt: same redesign prompt as step 1 (item 4).

## 2026-11-12 — UI redesign step 5: visits

Added `traveler_user_id` to the OpenAPI Visit schemas, migration `0003_visit_traveler`, and backend validation. Visit cards show route, dates, traveler, countdown chip, and cost split; the form takes traveler and optional budget. Backend 20 and frontend 24 tests passed.

Prompt: same redesign prompt as step 1 (item 5).

## 2026-11-12 — UI redesign step 6: check-in

Emoji mood chips, side-by-side partner check-ins, streak counter, and a daily prompt placeholder. Frontend 26 tests passed.

Prompt: same redesign prompt as step 1 (item 6).

## 2026-11-12 — UI redesign step 7: memories

Timeline cards plus an On this day section; photo upload deferred with a note in the form. Frontend 28 tests passed.

Prompt: same redesign prompt as step 1 (item 7).
