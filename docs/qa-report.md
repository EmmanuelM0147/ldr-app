# Closer QA report (2026-11-13)

Independent, report-only passes. **Do not treat this file as fixed** — triage and remediations go in `docs/qa-log.md` in a separate fix chat.

Sources: [QA-1 Security](b53269a8-cd30-4a53-83ce-4aa474f8f8d8) · [QA-2 Functional](04df4390-1424-4428-931c-bd306d62e608) · [QA-3 Frontend/a11y](c755f658-4559-4bfd-b9a2-35f01c7d6e22)

---

## Suggested fix order (critical / high / P0 first)

| Priority | ID | Area | Summary |
|---|---|---|---|
| 1 | SEC-01 | Security | Default / weak `JWT_SECRET` mints valid tokens |
| 2 | SEC-02 | Security | Concurrent invite join can exceed 2 members |
| 3 | SEC-03 | Security | No login rate limit |
| 4 | FUNC-01 | Functional | Partner “today” uses viewer timezone |
| 5 | FUNC-02 | Functional | Visit/event times use browser local, not profile IANA TZ |
| 6 | FUNC-15 | Functional | Presence sticky after close (no TTL / disconnect clear) |
| 7 | FUNC-16 | Functional | WebSocket no reconnect after network loss |
| 8 | FUNC-22 | Functional | Peer not invalidated when partner deletes space |
| 9 | A11Y-P0-1 | a11y | Timezone footer obscured by bottom nav |
| 10 | A11Y-P0-2 | a11y | BottomSheet no focus trap / initial focus |
| 11 | A11Y-P0-3 | a11y | Nav icons double-announced (“Home Home”) |

Then medium/P1, then low/P2.

---

## QA-1: Security and authorization

Static analysis (pytest import failed in that environment). Cross-couple IDOR on data/media/WS looks solid in code + existing tests.

| ID | Severity | Steps to reproduce | Expected vs actual | Suggested test |
|---|---|---|---|---|
| SEC-01 | critical | Run API with default `JWT_SECRET`; forge HS256 JWT; call `/me`. | Refuse weak secret; forged tokens 401. | Actual: defaults mint valid tokens (`config.py`, compose). | Boot fails or auth rejects default/empty secret; forge → 401. |
| SEC-02 | high | Concurrent `POST /couples/join` with same unused code from two users. | At most 2 members; invite single-use. | Actual: TOCTOU; no DB max-2 on memberships. | Double-join race → one 200, one 4xx, count=2. |
| SEC-03 | high | Many failed `POST /auth/login` for a real email. | Rate limit / 429. | Actual: no login counter. | 20+ failures → 429. |
| SEC-04 | medium | Sign out (client-only) or change password; reuse old Bearer. | Tokens invalidated (or document TTL-only). | Actual: JWT valid until `exp`. | Post sign-out / password change: old JWT still works. |
| SEC-05 | medium | `DELETE /couples/current` with JWT, no confirm body. | Typed confirmation (spec). | Actual: confirm UI-only. | API delete without `DELETE` word succeeds. |
| SEC-06 | medium | Upload non-image bytes with `Content-Type: image/jpeg`. | Reject bad magic. | Actual: trusts content-type. | Spoofed type → 422. |
| SEC-07 | medium | Delete space; check DB **and** disk media. | All rows + media gone. | Actual: code deletes files; tests don’t assert media/files. | Zero couple rows; media path gone. |
| SEC-08 | low | Upload `../../evil` filename; poison `media_path`. | Stay under MEDIA_ROOT. | Actual: UUID store OK; delete path less strict than absolute resolve. | No `..` in stored path; poisoned path can’t escape. |
| SEC-09 | low | WS without token; wrong couple. | Close 1008; no cross-couple. | Actual: isolation OK; accept before auth. | Keep WS tests; bound unauth accepts. |
| SEC-10 | low | Ideas without opt-in; opted-in vibe injection. | 403 / no log of personal content. | Actual: gate OK; vibe only in prompt. | Opt-out 0 LLM calls; no memory text in client msgs. |
| SEC-11 | low | Register existing email. | Anti-enumeration or accepted risk. | Actual: 409 reveals existence. | Document or uniform errors. |
| SEC-12 | low | Missing/expired/forged JWT; oversize upload. | 401 / 422. | Actual: mostly OK; gaps in expired/oversize tests. | Expired → 401; oversize → 422. |

**Cleared:** Couple-scoped events/visits/budgets/check-ins/memories/media/avatars/presence; invite expiry/reuse/third-member happy path; argon2id; CORS from env; WS token in first frame.

---

## QA-2: Functional and edge cases

Code + test review only (app not run in that pass).

1. **FUNC-01 high** — Partner “today” uses viewer TZ (`PartnerTodayCards` / `CheckInsPage`). Each partner should use *their* local date.
2. **FUNC-02 high** — Visit/event create uses browser `Date` / `combineLocalDateTime`, not profile IANA TZ; calendar buckets by profile TZ → mismatch.
3. **FUNC-03 medium** — “This week” uses device-local midnight (`ThisWeekList`).
4. **FUNC-04 info** — DST display via `Intl` OK if UTC stored correctly (undermined by #2).
5. **FUNC-05 info** — End-before-start rejected (backend + UI + tests).
6. **FUNC-06 low** — Past visits / long ranges allowed (spec-OK).
7. **FUNC-07 info** — Arrives/Leaves validation present.
8. **FUNC-08 info** — Budget shares ≠ total rejected (tests pass).
9. **FUNC-09 info** — Negatives blocked by schema/UI.
10. **FUNC-10 low** — `Math.round(n*100)` float edge cases.
11. **FUNC-11 low** — Currency is `[A-Z]{3}` not ISO registry.
12. **FUNC-12 info** — Same-day check-in upsert works.
13. **FUNC-13 medium** — Streak UI-only; no multi-TZ streak test.
14. **FUNC-14 low** — Note `maxLength={320}` vs 280 spec.
15. **FUNC-15 high** — Presence sticky after close; no disconnect/TTL clear.
16. **FUNC-16 high** — WS `subscribe` has no reconnect.
17. **FUNC-17 medium** — Two tabs likely OK while sockets up; unverified.
18. **FUNC-18 medium** — Empty/loading/error uneven; no offline UX.
19. **FUNC-19 low** — Missing client `maxLength` on some titles.
20. **FUNC-20 info/low** — React text escapes XSS; no RTL/`dir`.
21. **FUNC-21 info** — Delete space keeps accounts; cascade matches spec.
22. **FUNC-22 high** — Remaining partner not live-cleared after peer deletes space.
23. **FUNC-23 medium** — Compose `pairing.spec.ts` still expects “Route / city” vs From/To UI.

---

## QA-3: Frontend and accessibility

Live checks at 320 / 375 / 414 + CSS review.

### P0
1. **A11Y-P0-1** — `.zone` footer under bottom nav (~88px overlap @320); clearance on `.sheet` only.
2. **A11Y-P0-2** — `BottomSheet` no focus move/trap; page behind stays tabbable.
3. **A11Y-P0-3** — Icon `<title>` + label → “Home Home” etc. on Main nav.

### P1
4. Password toggle 40×40 and `outline: none` on `:focus-visible`.
5. No `safe-area-inset` / `viewport-fit=cover` on tabs/FAB.
6. FAB covers calendar days @320.
7. Month cells &lt;44px wide below ~414.
8. AI opt-in checkbox / row &lt;44px.
9. Timezone `<select>` name polluted by option text (`ProfileSettingsForm`).
10. Event dots `aria-hidden`; days only announce number.
11. PWA: no service worker; icons not maskable.
12. Account menu: weak keyboard pattern (no focus into menu / arrows).

### P2
13. `--nav-height` underestimates real bar (~88px vs 4.5rem).
14. “Memories” tab label tight @320.
15. No `prefers-reduced-motion` (no motion today either).
16. Manifest theme/bg vs CSS token drift.
17. No skip link.

**Solid:** AA color tokens + tests; global `:focus-visible`; `--touch-min` on many controls; FAB/nav aria-labels; landmarks/live regions; sheet nav clearance for main content.

---

## Triage chat prompt (paste)

```
Here is the QA report: see docs/qa-report.md (and the tables below if pasted).

Fix critical and high issues (and a11y P0) one at a time. For each: write a failing test first, fix the code, confirm the test passes, update openapi.yaml if needed, and append the issue and the fix to docs/qa-log.md.

Start with SEC-01, then SEC-02, SEC-03, then FUNC-01, FUNC-02, FUNC-15, FUNC-16, FUNC-22, then A11Y-P0-1..3.
```
