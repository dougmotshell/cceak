# End-to-end delivery plan · cceak

Brand: Intelie · cceak.
Information classification (ISO/IEC 27001): Internal Use (Uso Interno).

Short English version. The Portuguese source of truth is [`docs/pt-br/manual/templates/fullstack.md`](../../../pt-br/manual/templates/fullstack.md). One plan per feature that crosses layers. Do not include secrets, keys, personal data or customer data in examples. Use `TODO:` for missing information; do not invent business rules.

## Sections

1. **Identification:** feature in one sentence, end user and role, owner, start and target dates in UTC, layers touched (database, API, client, pipeline, environment).
2. **Slices and work order:** vertical slices with specialist, dependency, allowed files and state (pending, in progress, ready, blocked). Default order: database (`database-specialist`), API (`backend-specialist`), client (main agent), pipeline or environment (`devops-specialist`, `devsecops-specialist`).
3. **Contract between layers:** route, input, output, errors by `code`, who may call, idempotency strategy.
4. **Integration checklist:** the client sends the parameters the function expects; each documented `code` is handled in the client with interface text; permissions match in database, API and screen; repeated writes do not duplicate data; database content is rendered with `textContent`; session in `sessionStorage`; no `service_role` in the client; loading, empty and error states handled; no secrets or personal data in the diff or logs. Each item needs evidence.
5. **Verifications:** `scripts/fullstack-check.mjs` (static, all layers), `scripts/database-check.mjs`, real-environment checks (marked pending until run locally), security review when sensitive data is involved.
6. **Definition of done:** all slices ready with specialist verification, green static check, completed integration checklist, security review when applicable, decision recorded in `docs/pt-br/decisions/` and `docs/en-us/decisions/`, human steps listed.
7. **Human steps:** applying migrations to staging or production, deployment, Supabase dashboard settings. The agent never runs them.
8. **Open items and risks:** owner and deadline for each item. Verdict: ready, ready with caveats, or blocked.
