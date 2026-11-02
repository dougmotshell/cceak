# Supabase deployment and verification checklist > **Source of truth:** [`docs/pt-br/manual/templates/supabase.md`](../../../pt-br/manual/templates/supabase.md). This short version lists the same checks. Do not paste keys, real project URLs, project IDs or e-mails. - [ ] `node scripts/supabase-check.mjs` passes.
- [ ] Every table the site calls through `/rest/v1/` exists in `supabase/migrations/` with RLS enabled.
- [ ] No write policy or write grant for the `anon` role.
- [ ] Every `security definer` function sets `search_path = public`.
- [ ] Public sign-up disabled in the Supabase dashboard (owner: TODO:).
- [ ] Only the project URL and the public key are in `env.js`; no `service_role` key anywhere in the repository.
- [ ] Free-plan limits confirmed on the official pricing page on TODO: (date).
- [ ] Verdict recorded: OK, OK WITH CAVEATS or BLOCKED.
