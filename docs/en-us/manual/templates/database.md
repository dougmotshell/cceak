# Migration and backup sheet · cceak

Brand: Intelie · cceak.
Information classification (ISO/IEC 27001): Internal Use (Uso Interno).

Short English version. The Portuguese source of truth is [`docs/pt-br/manual/templates/database.md`](../../../pt-br/manual/templates/database.md). One sheet per migration in `supabase/migrations/`, and one backup section per cycle. Do not include passwords, keys, `service_role` or personal data. Use `TODO:` for missing information.

## Sections

1. **Migration:** file name (`NNNN_slug.sql`), purpose in one sentence, owner, date in UTC, order relative to other migrations.
2. **Model affected:** each object (table, index, function, policy, trigger), create or alter, data owner, who reads, who writes.
3. **Roles and access:** what `anon`, `authenticated` and the administrator (`public.is_admin()`) can read and write, and the rule behind it. Checklist: RLS enabled on every new `public` table; no write policy for `anon` or `public`; `security definer` only with `set search_path = public`; no sensitive data in a publicly readable table.
4. **Idempotency and destruction:** `if not exists` on tables, indexes and extensions; `create or replace` on functions; `drop ... if exists` before policies and triggers; destructive operation only with the `-- aprovado-destrutivo:` marker and recorded human approval.
5. **Validation:** `scripts/database-check.mjs`, `scripts/security-config-check.mjs`, application on a local database (outside the agent), re-application to confirm idempotency. Never mark approved without command output.
6. **Rollback plan:** reversible or not, how (a new reverse migration, never an edit), data that would be lost.
7. **Backup and restore:** frequency (CTRL-11), last backup and where it is kept with restricted access, last restore test with date and result, owner, estimated restore time. An untested restore does not count as a control.
8. **Human steps:** each step has an executor and a recorded confirmation. The agent never runs them.
