# Backlog

Work in numbered order, one task at a time. Each task is meant to take under an hour. Update `docs/openapi.yaml` before changing an endpoint. Data endpoints need a cross-couple test. After a task, tick it here and append the prompt to `docs/ai-log.md`.

Done already: repo layout, Cursor rules, `GET /health`, draft Compose file.

## Auth + pairing

- [x] 1. Write the OpenAPI contract for auth, pairing, events, visits (including budget and countdown), check-ins, and memories.
  - Acceptance: every story in the spec for those areas has a path, a schema, and error responses. `GET /health` stays.
  - Tests: a YAML load check that each required path exists. No app code yet.

- [x] 2. Scaffold the Vite + React + TypeScript app and a typed mock client that matches the contract.
  - Acceptance: strict TypeScript, no `any`. Mock register, login, create space, and join return the contract shapes.
  - Tests: `tsc --noEmit`. A unit test that the mock join rejects a reused code.

- [x] 3. Register and login screens on mocked data.
  - Acceptance: email, password (min 8), display name, and IANA timezone. Errors render from the mock.
  - Tests: component test for a short password and a successful mock login.

- [x] 4. SQLite, SQLAlchemy, and the first Alembic migration for users.
  - Acceptance: user row matches the spec. Email unique and lowercase. Password hashed with argon2id.
  - Tests: migration upgrade/downgrade on SQLite. Duplicate email fails.

- [x] 5. `POST /auth/register` and `POST /auth/login`.
  - Acceptance: JWT expires in 60 minutes. Bad input returns 422. Unknown login returns 401.
  - Tests: register, login, wrong password, short password, invalid timezone.

- [x] 6. Create a couple space. Creator is the only member.
  - Acceptance: a user already in a couple gets 409. Response includes the couple id.
  - Tests: create, second create fails, unauthenticated request fails.

- [x] 7. Create an invite code.
  - Acceptance: plaintext returned once. Only SHA-256 stored. Expires in 7 days. Sixth create in an hour returns 429.
  - Tests: hash is not the plaintext. Expiry is about 7 days. Rate limit.

- [x] 8. Join with a code.
  - Acceptance: member two joins, code becomes used, a third user gets 409, expired or reused code gets 400, 11th failed attempt from one IP in an hour gets 429.
  - Tests: those cases, plus a user already in a couple cannot join.

- [x] 9. Delete the couple space.
  - Acceptance: either member can delete. Couple-owned rows are gone. Both user rows remain. Non-member gets 404.
  - Tests: delete as each member, then a second couple is untouched.

## Calendar

- [x] 10. Mocked events list and create form.
  - Acceptance: title, start, optional end, location, and notes. End before start shows an error.
  - Tests: component test for the end-before-start case.

- [x] 11. Events API.
  - Acceptance: both members can create, list, update, and delete. Times stored in UTC. Other couple gets 404.
  - Tests: CRUD plus a cross-couple read and delete.

## Visit planner

- [x] 12. Mocked visit list, countdown, and budget form.
  - Acceptance: countdown shows the next future visit. Budget amounts must sum to the total.
  - Tests: component test for a bad split and an empty countdown.

- [x] 13. Visits API and countdown.
  - Acceptance: `ends_at` after `starts_at`. Countdown is the soonest future `starts_at` and seconds until then, or empty.
  - Tests: CRUD, countdown choice, past visits ignored, cross-couple 404.

- [x] 14. Budget API, one per visit.
  - Acceptance: ISO currency, two non-negative minor-unit amounts that sum to the total. Deleting the visit deletes the budget.
  - Tests: bad sum returns 422. Other couple's visit returns 404.

## Check-ins

- [x] 15. Mocked check-in form and list.
  - Acceptance: one mood and optional note (max 280) per local day. A second submit updates the same day.
  - Tests: component test for the update and for a too-long note.

- [x] 16. Check-in API.
  - Acceptance: unique per user and local date in that user's timezone. Both members can list the couple's check-ins.
  - Tests: upsert, timezone date boundary, cross-couple 404.

## Memories

- [x] 17. Mocked memory list and composer.
  - Acceptance: optional title (max 80) and body (1–2000). Edit and delete controls show only on the author's entries.
  - Tests: component test that a partner's entry has no delete control.

- [x] 18. Memories API.
  - Acceptance: both members can add and list. Only the author can update or delete. Others get 404.
  - Tests: author update, partner update denied, cross-couple 404.

## Presence

- [x] 19. Replace mocks with a client generated from `docs/openapi.yaml`.
  - Acceptance: screens call the API. Auth token is sent on data requests. The UI formats UTC times in the user's timezone.
  - Tests: one client test that a data call includes the bearer token.

- [x] 20. Presence REST and WebSocket.
  - Acceptance: a member can set `free_to_talk` and read both flags. The socket requires a valid JWT and pushes presence and check-in changes only to that couple.
  - Tests: missing JWT is rejected. Couple A does not receive couple B's events.

## AI features

- [x] 21. Couple AI opt-in and date-night ideas.
  - Acceptance: off by default. Ideas return 403 and do not call the model until either member opts in. API key is read from the environment. Prompts and replies are not logged.
  - Tests: opt-in off and on, with the model client mocked. Log capture contains no idea text.

## Deploy

- [x] 22. Move the app to Postgres and Alembic. Dockerfiles and Compose for api, db, and frontend. Update `.env.example`.
  - Acceptance: `docker compose up` runs all three. SQLite remains available for unit tests.
  - Tests: existing pytest still passes. One migration test against Postgres.

- [x] 22b. Profile photo upload in settings.
  - Acceptance: JPEG/PNG/WebP up to 5 MiB. Partner in the same couple can fetch it; other couples get 404. Settings can upload and remove.
  - Tests: upload, partner fetch, cross-couple denial, remove.

- [x] 23. Playwright: user A creates a space, user B joins, both see the same visit and check-in.
  - Acceptance: the flow runs against the Compose stack.
  - Tests: that Playwright spec.

- [x] 24. GitHub Actions: lint, test, build images, and deploy to AWS only after tests pass. Write `docs/deploy.md`.
  - Acceptance: the deploy job needs the test job. The doc lists the required secrets and the rollback step.
  - Tests: workflow YAML includes the job order. No secrets are committed.

- [x] 25. After QA fixes, write `README.md` with what it does, architecture, how to run, a link to `docs/ai-log.md`, and a privacy section.
  - Acceptance: a newcomer can run the stack from the README alone.
  - Tests: commands in the README match Compose and pytest.

## Post-MVP auth

- [x] 26. Forgot / reset password (token flow; email delivery deferred).
  - Acceptance: `POST /auth/forgot-password` always returns a generic 200; `POST /auth/reset-password` accepts a single-use expiring token. Rate-limited. `AUTH_RESET_DEBUG=1` may return `reset_url` for local/tests. Login links to forgot + reset pages.
  - Tests: forgot generic/no enumeration, debug URL, reset + reuse denied, rate limit. SMTP not required.

## Live join feedback

- [x] 27. In-app notice when partner joins via invite (WebSocket `partner_joined`).
  - Acceptance: after a successful join, sockets in that couple receive `partner_joined` with the updated couple. Waiting partner UI refreshes members and shows a short status notice. No push/email. Cross-couple sockets do not receive it.
  - Tests: WS test for join broadcast + outsider denial; mock client emits; frontend handles the event.

- [x] 28. Invite code Copy / Paste CTAs.
  - Acceptance: after creating an invite on Home (and Settings), a Copy code button writes the code to the clipboard and shows Copied. Join form has a Paste code button that fills the input from the clipboard when permitted.
  - Tests: component test for copy/paste control labels and callbacks.

- [x] 29. In-app notifications (no push).
  - Acceptance: couple-scoped notifications for partner join, new check-in, new event, and new visit. `GET /notifications`, mark one/all read. LiveEvent `notification`. Cross-couple denial. UI list with unread badge. Push remains out of scope.
  - Tests: create-on-action, list scoped to recipient, mark read, outsider 404, WS payload.
