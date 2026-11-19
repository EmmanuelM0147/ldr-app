# Agent team and process

How humans and Cursor agents ship Closer. This is the collaboration map for criterion **Agent Team Specification**.

## Roles

| Role | Who | Responsibility |
| --- | --- | --- |
| Product owner | Human | Priorities, clarifications, demo URLs, “proceed” / stop |
| Product manager agent | Cursor (prompted) | `docs/spec.md` stories + acceptance criteria |
| Planner agent | Cursor (prompted) | Ordered `docs/backlog.md` tasks with acceptance + test notes |
| Contract agent | Cursor | Update `docs/openapi.yaml` before any endpoint change |
| Implementer agent | Cursor (default) | One backlog task at a time; code + tests |
| Reviewer (human) | Human | Spot-check security, privacy, UX; approve deploy secrets |
| QA agent / pass | Cursor or human | `docs/qa-report.md` findings → remediations in `docs/qa-log.md` |

One Cursor chat may wear several agent hats; the **role** is defined by the prompt and the doc it owns, not by a separate bot account.

## How they work together

```
Human priority
    → PM: spec.md
    → Planner: backlog.md (acceptance criteria per task)
    → Implementer: read AGENTS.md + spec + next open backlog item
         → update openapi.yaml first (if API)
         → implement + tests
         → tick backlog.md, append prompt to ai-log.md
    → Human: review / “proceed” / commit-push when asked
```

Rules that keep agents aligned:

1. **One backlog task at a time**, in order (`AGENTS.md`).
2. **Contract-first** — OpenAPI is source of truth.
3. **Couple_id scoping** and cross-couple denial tests on data endpoints.
4. **Evidence** — every finished task is ticked in `docs/backlog.md` and logged in `docs/ai-log.md` with the prompt used.

## Evidence that agents used the tracker

- `docs/backlog.md` — checked tasks with acceptance criteria (auth, pairing, calendar, notifications, SEC-* remediations).
- `docs/ai-log.md` — chronological prompts + outcomes after each slice.
- `.cursor/rules/closer.mdc` — always-on constraints for the implementer agent.

## Related docs

- Process rules: [`../AGENTS.md`](../AGENTS.md)
- Spec: [`spec.md`](spec.md)
- Tracker: [`backlog.md`](backlog.md)
- Prompt log: [`ai-log.md`](ai-log.md)
- Deploy / CI: [`deploy.md`](deploy.md)
