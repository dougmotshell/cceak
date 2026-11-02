# Function or endpoint contract sheet · cceak (): (). Short English version. The Portuguese source of truth is [`docs/pt-br/manual/templates/backend.md`](../../../pt-br/manual/templates/backend.md). One sheet per function exposed by PostgREST (`POST /rest/v1/rpc/<name>`) or per GoTrue flow. Do not include key values, passwords, tokens or real personal data in examples. Use `TODO:` for missing information. ## Sections 1. **Identification:** function or flow name, route, pinned versions (PostgREST `v12.2.12`, GoTrue `v2.186.0`), technical owner, date, migration that creates or changes it.
2. **Who can call:** `anon`, `authenticated`, administrator (`public.is_admin()`). Identity comes from `auth.uid()` or `auth.jwt()`, never from a parameter.
3. **Input:** parameter, type, required flag, limit and format, server-side validation.
4. **Output:** return type and an example body with fictitious data.
5. **Errors:** `code` (errcode), when it occurs, controlled message, expected HTTP status, client action. Messages never reveal table, column or SQL names.
6. **Idempotency:** whether writes are repeatable, strategy (natural key with `on conflict`, client-sent identifier with `unique`, or not applicable), behavior on repetition.
7. **Security checklist:** `security invoker` by default or justified `security definer` with `set search_path = public`, no `service_role` in the client, no personal data in logs, review by `appsec-soc2` or `devsecops-specialist` when sensitive data is involved.
8. **Local test cases:** valid input, each invalid input rule, anonymous call when not allowed, repeated write. Status is approved, rejected or pending (with reason). Never mark approved without test output.
9. **Open decisions:** signup policy, MFA, rate limits, data retention, as `TODO:`.
