# QA remediation log

Fixes for issues from `docs/qa-report.md`. One entry per issue.

---

## SEC-01 ? Default / weak `JWT_SECRET` mints valid tokens (critical)

**Issue:** `config.py` defaulted `jwt_secret` to `dev-only-change-me-not-for-production`, and Compose fell back to `change-me-to-a-long-random-string`. Anyone who knew those values could forge HS256 JWTs.

**Fix:**
- `Settings.jwt_secret` is required (no default) and validated: reject empty/whitespace, known placeholders, and secrets shorter than 32 characters.
- Compose requires `JWT_SECRET` via `${JWT_SECRET:???}` (no weak default).
- `.env.example` documents generating a strong secret; placeholders noted as rejected at boot.
- Tests: `backend/tests/test_jwt_secret.py` (weak secrets raise `ValidationError`; forged token with old default ? 401).

**OpenAPI:** unchanged (deployment config, not API contract).

---

## SEC-02 ? Concurrent invite join can exceed 2 members (high)

**Issue:** `POST /couples/join` checked member count and `invite.used_at` then inserted a membership in a separate step (TOCTOU). Two racers (or two unused invites) could both pass checks and create a third member. No DB cap on memberships per couple.

**Fix:**
- Added `memberships.seat` (1 = creator, 2 = joiner) with `UNIQUE(couple_id, seat)` and `CHECK(seat IN (1, 2))` ? migration `0006_membership_seat`.
- Join claims the invite with `UPDATE ?? WHERE used_at IS NULL` (rowcount must be 1) and inserts `seat=2`; `IntegrityError` ? 409.
- Tests: `test_db_rejects_third_membership_for_couple`, `test_concurrent_join_same_invite_caps_at_two_members`.

**OpenAPI:** unchanged (409 Conflict already documented for join).

---

## SEC-03 ? No login rate limit (high)

**Issue:** `POST /auth/login` accepted unlimited failed attempts (credential stuffing).

**Fix:**
- Added `login_failures` table (migration `0007_login_failures`).
- After 20 failed logins from one client IP within an hour, further login attempts return 429 (including correct passwords until the window passes).
- OpenAPI: documented `429` on `/auth/login`.
- Test: `test_login_rate_limited_after_failed_attempts`.

---

## FUNC-01 ? Partner ?today? uses viewer timezone (high)

**Issue:** `PartnerTodayCards` matched every member?s check-in to one `today` string from the viewer?s timezone, so near midnight a partner?s valid local-date check-in looked missing (and could show under Earlier).

**Fix:**
- Each card resolves `localDate(member.timezone)` for that member.
- Check-ins ?Earlier? list excludes each author?s own local today the same way.
- Test: `PartnerTodayCards` FUNC-01 case (Lagos already 13 Nov, London still 12 Nov).

**OpenAPI:** unchanged.

---

## FUNC-02 ? Visit/event times use browser local, not profile IANA TZ (high)

**Issue:** Event `combineLocalDateTime` and visit `datetime-local` parsing used `new Date(...)`, which interprets wall times in the **browser** zone. Calendar display buckets by profile TZ ? mismatch.

**Fix:**
- Added `zonedLocalDateTimeToUtc` / `zonedDateTimeLocalToUtc` in `format.ts` (IANA wall time ? UTC ISO).
- `EventForm` takes `timeZone` and converts through that helper.
- Visit create parses `datetime-local` values with the profile timezone.
- Tests: `format.test.ts` FUNC-02 cases; EventForm Lagos 10:00 ? `09:00Z`.

---

## FUNC-15 ? Presence sticky after close (high)

**Issue:** `free_to_talk` stayed true after the tab/socket closed; no disconnect handler or TTL.

**Fix:**
- Hub tracks sockets per user; when the last socket leaves, clear that user?s `free_to_talk` and publish.
- GET/list path expires `free_to_talk` older than 30 minutes.
- OpenAPI: documented TTL on GET and disconnect clear on `/ws`.
- Tests: `test_websocket_disconnect_clears_free_to_talk`, `test_stale_free_to_talk_is_cleared_by_ttl`.

---

## FUNC-16 ? WebSocket no reconnect after network loss (high)

**Issue:** `apiClient.subscribe` opened one WebSocket and never reconnected after `close` (network loss left live updates dead until reload).

**Fix:**
- Reconnect with exponential backoff (1s ? 30s cap) after unexpected close; stop cancels retries.
- Test: `reconnects the live socket after a network close (FUNC-16)`.

**OpenAPI:** unchanged.

---

## FUNC-22 ? Peer not invalidated when partner deletes space (high)

**Issue:** Deleting the couple removed DB rows but did not notify the other member?s live session, so their UI kept showing the space until refresh.

**Fix:**
- `DELETE /couples/current` publishes `{type:"couple_gone"}` over the couple WebSocket before deleting rows.
- Session clears `couple` + `presence` on `couple_gone`; mock client emits the same event.
- OpenAPI: added `couple_gone` to `LiveEvent`; documented on `/ws`.
- Tests: `test_delete_notifies_partner_over_websocket`; mockClient emit test.

---

## A11Y-P0-1 ? Timezone footer obscured by bottom nav

**Issue:** `.zone` footer only had small margin while `.sheet` used `--nav-clearance`, so ?Times shown in ??? sat under the fixed tab bar (~88px).

**Fix:**
- `.shell:has(.tabs) .zone` uses `margin-bottom: var(--nav-clearance)`.
- `--nav-height` set to `5.5rem`; clearance includes nav bottom offset + spacing.
- Test: tokens.test A11Y-P0-1 CSS assertion.

---

## A11Y-P0-2 ? BottomSheet no focus trap / initial focus

**Issue:** Dialog opened without moving focus; Tab could leave into page content behind the overlay.

**Fix:**
- On open, focus first focusable (or panel); Tab cycles within the dialog; Escape closes; restore prior focus on close.
- `aria-labelledby` on the dialog title.
- Tests: `BottomSheet.test.tsx` initial focus + Tab trap.

---

## A11Y-P0-3 ? Nav icons double-announced (?Home Home?)

**Issue:** Bottom nav SVGs defaulted to a `<title>` matching the text label, so the accessible name became ?Home Home?.

**Fix:** Render nav icons with `title=""` (decorative / `aria-hidden`) next to the visible label.
- Test: `BottomNav` accessible names are single labels only.

## SEC-05 ? Delete space requires typed confirm on the API (medium)

**Issue:** `DELETE /couples/current` succeeded with only a JWT; typed `DELETE` lived in the UI only.

**Fix:**
- OpenAPI `CoupleDelete` body with `confirm` enum `DELETE` (required).
- Backend rejects missing/wrong confirm with 422; UI client always sends `{confirm:"DELETE"}` after the form gate.
- Test: `test_delete_requires_typed_confirm_body`.

**OpenAPI:** `DELETE /couples/current` requestBody + `CoupleDelete` schema.

---

## SEC-04 ? Token invalidation on password change (fixed); sign-out still client-only

**Issue:** JWTs remain valid until `exp` after client sign-out or password change.

**Fix (password change/reset):**
- Added `users.password_changed_at` (migration `0011_password_changed_at`).
- Set on `PATCH /me` password change and `POST /auth/reset-password`.
- `get_current_user` rejects tokens whose `iat` is strictly before `password_changed_at`.
- Settings UI signs out after a successful password change.
- Tests: old bearer ? 401 after change and after reset.

**Decision (client sign-out only):** Still TTL-only ? clearing the token locally does not revoke it server-side. No denylist.

## FUNC-03 ? This week uses profile IANA TZ (medium)

**Issue:** `itemsThisWeek` used `Date#setHours(0,0,0,0)` (device-local midnight), so the week window could disagree with the profile timezone used for display.

**Fix:**
- Week window is local midnight ? +7 days in the profile IANA zone via `localDate` + `zonedLocalDateTimeToUtc`.
- Home passes `user.timezone` into `itemsThisWeek`.
- Test: windows the week in America/New_York vs UTC (FUNC-03).

**OpenAPI:** unchanged.

## A11Y-P1 ? Safe-area insets for tabs and FAB

**Issue:** No `viewport-fit=cover` / `safe-area-inset-bottom`; home-indicator phones could clip the floating tab bar and FAB.

**Fix:**
- `viewport-fit=cover` on the viewport meta.
- `--safe-bottom` token; folded into `--nav-clearance`, `.tabs` bottom, and `.fab` bottom.
- Test: tokens.test A11Y-P1 assertions.

**OpenAPI:** unchanged.

---

## SEC-06 ? Spoofed upload Content-Type accepted (medium)

**Issue:** Avatar and memory uploads trusted the client `Content-Type` and did not check magic bytes, so non-image bytes labeled `image/jpeg` were stored.

**Fix:**
- `sniff_content_type` for JPEG/PNG/WebP/MP4/WebM magic.
- `save_avatar_file` / `save_memory_file` require sniffed type to match the declared Content-Type; mismatch ? 422.
- OpenAPI upload descriptions note magic sniffing.
- Tests: sniff helpers; spoofed JPEG on avatar and memory upload.

**OpenAPI:** `/me/avatar` and `/memories/upload` file descriptions.

---

## SEC-07 ? Delete space must clear on-disk media (medium)

**Issue:** `DELETE /couples/current` deleted memory rows and called `delete_media_file`, but tests never asserted disk files were gone; empty couple folders could remain; path escape on delete was weaker than read.

**Fix:**
- `purge_couple_media` removes the couple media directory after per-file deletes.
- `delete_media_file` resolves under `MEDIA_ROOT` and refuses escapes.
- Test uploads a PNG, deletes the space, asserts file + folder gone and couple/memory rows zero.
- OpenAPI 204 description notes on-disk memory media removed.

**OpenAPI:** `DELETE /couples/current` 204 description.
