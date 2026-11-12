# Closer spec

Long-distance couples app. One couple space has exactly two members. MVP is a shared visit calendar with a countdown, a visit budget split, a daily check-in, a memory log, presence, and a small opt-in AI feature. Chat and video calls are out of scope.

`docs/openapi.yaml` is the API contract. Implement a path only after it is described there.

## Couple space

- A user registers, then creates a couple space and becomes member one.
- Member one receives a single-use invite code. Member two joins with that code.
- A couple never has more than two members. A third join fails.
- Either member may delete the couple space. That deletes the couple and every row owned by it (memberships, invites, visits, budgets, check-ins, memories, presence, AI settings). User accounts remain so each person can still sign in.

## Auth

- Email and password. Store email lowercase. Password hashed with argon2id. Minimum length 8.
- JWT access token, HMAC, expiry 60 minutes. No refresh token in the MVP; the client signs in again.
- Validate every input. Unknown couple or resource ids return 404 so callers cannot tell other couples exist.

## Invites

- Code is unguessable (at least 128 bits) and shown once. Persist only a SHA-256 hash.
- Single use. Expires 7 days after creation.
- Rate limits: at most 5 codes created per user per hour, and at most 10 failed join attempts per client IP per hour.

## Features

Dates and times are stored in UTC. Each user has an IANA timezone (default `UTC`). The UI converts for display and never assumes Africa/Lagos.

- **Visits.** Both members can create, read, update, and delete visits in their couple. Fields: title, `starts_at`, optional `ends_at`, optional location, optional notes. Countdown is the soonest visit with `starts_at` in the future, including seconds until it starts.
- **Budget.** A visit may have one plan: ISO currency, total in minor units, and two shares that sum to the total.
- **Check-in.** One per member per local calendar date. Mood is `great`, `good`, `okay`, `low`, or `rough`. Optional note, max 280 characters. Both members can read the couple's check-ins.
- **Memories.** Text (max 2000 characters) plus `created_at` and an optional title. Both members can list and add. The author can update or delete their own entry.
- **Presence.** Each member sets `here`, `away`, `busy`, or `sleeping`. The partner can read it. `updated_at` is UTC.
- **AI.** Off unless the couple opts in. The only MVP AI call is a short visit-idea suggestion. If opt-in is false the API returns 403 and makes no outbound model call. Logs must not contain visit text, check-in notes, memories, or model prompts and responses.

## Access control

Every data query includes the caller's couple membership. A member of couple A cannot read or write couple B. Each data endpoint has a test that proves this.

## Stack notes

- API: FastAPI, SQLAlchemy, Alembic, Pydantic models aligned with the OpenAPI schemas.
- Database: Postgres via Docker Compose. Tests may use SQLite until a task needs Postgres-specific behavior. Do not use SQLite in production.
- Web: React, Vite, TypeScript strict, installable PWA. API client generated from `docs/openapi.yaml`. Playwright covers end-to-end flows once pages exist.
- Secrets live in the environment. `.env.example` lists keys with placeholders only.
