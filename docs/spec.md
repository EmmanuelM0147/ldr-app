# Closer spec

## Problem

Couples living apart lose the small shared record of when they will next be together, what a visit will cost, and how the other person is doing today. Chat and calls already exist elsewhere. Closer is the private space for the plan and the daily pulse.

## Users

Two adults in one long-distance relationship. Each has an account (email, password, display name, IANA timezone). A person belongs to at most one couple space. There is no public profile and no third member.

## MVP user stories

### Register and sign in

As a partner, I create an account with email, password, and display name so only we can open the space.

Acceptance criteria:

- Email is stored lowercase and must be unique.
- Password is at least 8 characters and stored as an argon2id hash.
- Display name is required, 1–40 characters.
- Timezone is a valid IANA name, default `UTC`.
- Sign-in returns a JWT that expires in 60 minutes. There is no refresh token.
- Invalid email, short password, or bad timezone is rejected with a validation error.

### Create a space and invite

As a partner, I create our space and get an invite code so my partner can join.

Acceptance criteria:

- The creator becomes member one.
- The code is unguessable (at least 128 bits), shown once, and only its SHA-256 hash is stored.
- The code expires 7 days after creation, is single-use, and at most 5 codes can be created per user per hour.
- A user who is already in a couple cannot create another space.

### Join with a code

As the partner, I submit the code and become member two.

Acceptance criteria:

- A valid unused, unexpired code adds the caller as member two and marks the code used.
- Reuse, expiry, or a couple that already has two members fails.
- More than 10 failed join attempts from one client IP in an hour are rejected.
- The plaintext code is never stored or logged.

### Account and space settings

As a partner, I update my profile and our space preferences.

Acceptance criteria:

- I can change my display name and IANA timezone.
- I can upload or remove a profile photo (JPEG, PNG, or WebP, max 5 MiB).
- I can change my password with the current password plus a new password (min 8 characters).
- Email is shown but not changed here.
- My partner in the same couple can see my profile photo; other couples cannot.
- Either member can turn couple AI (`ai_enabled`) on or off.
- Either member can delete the couple space from settings with typed confirmation.

### Delete the couple space

As either member, I delete the space so our shared data is gone.

Acceptance criteria:

- Either member can delete it.
- The delete removes the couple and every couple-owned row: memberships, invites, events, visits, budgets, check-ins, memories, and presence.
- Both user accounts remain and can sign in.
- A non-member receives 404.

### Shared calendar

As a member, I add and edit events so we share one calendar.

Acceptance criteria:

- An event has a title, `starts_at`, optional `ends_at`, optional location, and optional notes.
- Both members can create, list, update, and delete events in their couple.
- `ends_at`, when set, is after `starts_at`.
- A member of another couple gets 404.

### Visit and countdown

As a member, I plan a visit and see how long until the next one.

Acceptance criteria:

- A visit has a title, `starts_at`, `ends_at`, optional location, and optional notes. `ends_at` is after `starts_at`.
- Both members can create, list, update, and delete visits in their couple.
- The countdown is the visit with the soonest `starts_at` still in the future, plus the number of seconds until then. If none, the countdown is empty.
- Times are stored in UTC.

### Budget split

As a member, I attach one budget to a visit so we agree who covers what.

Acceptance criteria:

- One budget per visit: ISO 4217 currency, total in minor units, and exactly two amounts.
- The two amounts are non-negative integers and their sum equals the total.
- Both members can read and replace the budget. Deleting the visit deletes its budget.
- A budget for another couple's visit returns 404.

### Daily check-in

As a member, I record today's mood and an optional note, and I can read my partner's.

Acceptance criteria:

- One check-in per member per local calendar date in that member's timezone.
- Mood is `great`, `good`, `okay`, `low`, or `rough`. The note is optional and at most 280 characters.
- A second check-in on the same local date updates the existing one.
- Both members can list check-ins for their couple. Another couple's check-ins return 404.

### Memory log

As a member, I save a memory and edit or delete only my own.

Acceptance criteria:

- A memory has an optional title (max 80 characters) and a body (1–2000 characters).
- A memory may include one photo (JPEG/PNG/WebP, max 10 MiB) or one video (MP4/WebM, max 40 MiB). Text-only memories still require a body; media memories may use an empty body.
- Both members can list and add memories in the couple, and both can download that couple's media.
- Only the author can update or delete that memory. The partner receives 404.
- Another couple's memory returns 404.

### Presence

As a member, I mark myself free to talk, and my partner sees it change live.

Acceptance criteria:

- Presence is a boolean, `free_to_talk`, with `updated_at` in UTC.
- Either member can set their own flag and read both flags.
- A WebSocket authenticated with the same JWT pushes presence changes, new or updated check-ins, `partner_joined` when the second member joins via invite code, and `notification` frames for the in-app inbox.
- A socket without a valid JWT is closed. Events are never sent to another couple.
- Push notifications are out of scope. In-app notifications are stored per recipient for partner join, check-ins, new events, and new visits.

### In-app notifications

As a member, I see alerts when my partner joins or adds shared activity.

Acceptance criteria:

- Each notification belongs to one recipient in a couple: kind, title, body, `created_at`, optional `read_at`.
- Kinds: `partner_joined`, `check_in`, `event_created`, `visit_created`, `memory_created`.
- Either member can list only their own notifications and mark one or all as read.
- Another couple's notification id returns 404.
- Clients may poll `GET /notifications` and `GET /couples/current` while the tab is visible so the inbox stays fresh when the WebSocket is unavailable (for example on some serverless hosts).

### Date night ideas

As a couple, we turn on AI and ask for date-night ideas.

Acceptance criteria:

- AI is off (`ai_enabled` false) until either member opts the couple in. Either member can turn it off.
- `POST /ai/date-ideas` returns 403 and makes no outbound model call when AI is off.
- Request body: duration, budget, mode (`together` or `apart`), optional mood. Response: 3–5 ideas with title, description, and estimated cost.
- The Gemini API key and model come from `GEMINI_API_KEY` and `GEMINI_MODEL` on the server only.
- Prompt and response text are not written to logs (status and latency only). Per-couple limit of 10 requests per UTC day.

## Non-goals

- Chat, voice, and video calls.
- More than two members, multiple spaces per user, or a public directory.
- Payments, push notifications, and general file storage outside the memory log.
- Refresh tokens and third-party login.

## Data model

All ids are UUIDs. All timestamps are UTC.

- **User.** `email` unique, `password_hash`, `display_name`, `timezone`, `created_at`.
- **Couple.** `ai_enabled` default false, `created_at`.
- **Membership.** `couple_id`, `user_id`, `joined_at`. Unique on `user_id`. At most two rows per couple.
- **Invite.** `couple_id`, `code_hash`, `created_by`, `expires_at`, `used_at` nullable, `created_at`.
- **Event.** `couple_id`, `created_by`, `title`, `starts_at`, `ends_at` nullable, `location` nullable, `notes` nullable, `created_at`, `updated_at`.
- **Visit.** `couple_id`, `created_by`, `title`, `starts_at`, `ends_at`, `location` nullable, `notes` nullable, `created_at`, `updated_at`.
- **Budget.** `visit_id` unique, `currency`, `total_minor`, and two shares (`user_id`, `amount_minor`).
- **CheckIn.** `couple_id`, `user_id`, `local_date`, `mood`, `note` nullable, `created_at`, `updated_at`. Unique on (`user_id`, `local_date`).
- **Memory.** `couple_id`, `author_id`, `title` nullable, `body`, optional media (`kind`, `content_type`, `filename`, stored path), `created_at`, `updated_at`.
- **Presence.** `user_id`, `couple_id`, `free_to_talk`, `updated_at`.

## Privacy

- Every data query is scoped by the caller's couple membership. Unknown ids return 404.
- Passwords are hashed. Invite codes are hashed. JWTs expire in 60 minutes.
- Invite creation and failed joins are rate-limited.
- Personal content (notes, memories, visit text, model prompts and replies) is not logged.
- No model call runs unless that couple's `ai_enabled` is true.
- Deleting the couple space deletes all couple-owned data. Both user accounts remain.
