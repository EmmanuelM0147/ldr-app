# Development process

Short loop for every change. Details and security rules live in [`../AGENTS.md`](../AGENTS.md). Team roles: [`agent-team.md`](agent-team.md).

## Per-task loop

1. Read [`spec.md`](spec.md) and the next open item in [`backlog.md`](backlog.md).
2. If the task touches an HTTP/WS contract, update [`openapi.yaml`](openapi.yaml) first.
3. Implement the smallest diff that meets acceptance criteria.
4. Add or extend tests (unit and/or API/integration). Include cross-couple denial on data endpoints.
5. Run the suite: from repo root, `./scripts/test` (Unix) or `.\scripts\test.ps1` (Windows).
6. Tick the backlog item and append the prompt + outcome to [`ai-log.md`](ai-log.md).
7. Commit/push only when the human asks.

## Definition of done

Tests pass, OpenAPI updated when needed, no secrets committed, backlog ticked, ai-log updated.
