# Backlog

Work top to bottom, one task at a time. Update `docs/openapi.yaml` before changing an endpoint. Each task ships tests. Data endpoints include a test that a member of another couple cannot read or write the resource. After a task: tick it here and append the prompt to `docs/ai-log.md`.

- [x] 1. Scaffold the API: OpenAPI, `GET /health`, pytest, Ruff, Postgres Compose, GitHub Actions.
- [ ] 2. Register and log in. Argon2id passwords, 60-minute JWT, input validation, IANA timezone on the user.
- [ ] 3. Create a couple space; the creator is member one.
- [ ] 4. Invite codes: hashed, single-use, 7-day expiry, rate limits, join as member two, reject a third member.
- [ ] 5. Delete couple space and all couple-owned rows. Isolation test against a second couple.
- [ ] 6. Visits CRUD plus next-visit countdown.
- [ ] 7. Visit budget split. Shares must sum to the total.
- [ ] 8. Daily check-in, one per member per local date.
- [ ] 9. Memory log. Author can update or delete their own entry.
- [ ] 10. Presence status, readable by the partner.
- [ ] 11. Couple AI opt-in. Visit-idea call is refused when off and must not log personal content.
- [ ] 12. React + Vite + TypeScript PWA shell and generated API client.
- [ ] 13. Web screens for visits, budget, check-in, memories, and presence.
