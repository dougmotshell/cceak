# Production manual — Supabase and Vercel (cceak) > Source of truth: `docs/pt-br/manual/producao-supabase-vercel.md` (pt-BR). This English version mirrors it; if they diverge, the pt-BR file wins. cceak — Casa de Cultura Espírita Allan Kardec (): ****. Step-by-step guide to publish cceak in production: create the Supabase project, apply the migrations, register the administrators, configure Vercel and the domain, and verify that the published environment is secure. Audience: whoever performs the first deployment or ships a change to production. ## Before you start You need: - Administrator access to the production Supabase project ( account).
- Administrator access to the Vercel team or account that will host the site.
- Access to the Git repository where cceak is versioned, with push permission on `main`.
- Access to the DNS provider of the public domain.
- A corporate password manager. **Passwords and keys do not go into this manual, into the repository, or into chat.** This project has no `service_role` key. The site uses the `anon` key (public by design). Data protection comes from RLS in the database, not from a frontend secret. ## Overview ```mermaid
flowchart LR V[Visitor] -->|HTTPS| VC[Vercel<br/>static site · web/ folder] A[Administrator / staff] -->|HTTPS /admin/| VC VC -->|"anon key + user JWT"| API[Supabase<br/>PostgREST + Auth] API --> DB[(PostgreSQL<br/>RLS enabled)]
``` - The site is **static**: plain HTML, CSS and JavaScript in `web/`. There is no build step.
- All data reads and writes go through the Supabase API, under RLS.
- The administration area (`/admin/`) is `noindex` and not indexed by search engines. --- ## Part 1 — Production Supabase ### 1.1 Create the project 1. In the Supabase dashboard, click **New project** inside the organization.
2. Project name: `cceak-prod` (or the name the team standardized).
3. Choose the region closest to the audience. Check availability in the form itself.
4. Set the database password and **store it in the password manager**. The dashboard cannot show it again, so do not lose it.
5. Wait for provisioning to finish before continuing. Expected result: the project shows as *Active* in the dashboard. ### 1.2 Apply the migrations, in order The migrations are in `supabase/migrations/`. Apply **exactly** in this order, one at a time, in the **SQL Editor** of the production project: 1. `0001_site_settings.sql` — tables `admins` and `site_settings`, function `is_admin()`, RLS and privileges.
2. `0002_programacao_equipe.sql` — tables `equipe` and `programacao`, with the initial real schedule.
3. `0003_estudos.sql` — table `estudos` and synchronization with the schedule. For each file: open it in the repository, copy the whole content, paste it into the SQL Editor and click **Run**. Check for a red error before moving on. The migrations are idempotent (`create ... if not exists`, `drop policy if exists`), so re-running them does not break the database. Still, **do not re-run** without a reason. > **Do not run in production** the files in `docker/local/`: `seed-dev.sql`, `seed-equipe-dev.sql` and `seed-estudos-dev.sql`. They create test accounts with known passwords and fictitious data. They exist only for the local environment (see `docs/en-us/manual/local-docker-environment.md`). ### 1.3 Check RLS and privileges Run in the SQL Editor. Every table must show `rls_enabled = true`: ```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('admins', 'site_settings', 'equipe', 'programacao', 'estudos')
order by c.relname;
``` Expected result: five rows, all with `rls_enabled = true`. If any shows `false`, stop and fix it before publishing. Also confirm that the `anon` role cannot write. After the site is published (Part 3), run the test from outside, with the public key and placeholders replaced: ```bash
curl -s -o /dev/null -w "%{http_code}\n" \ -X POST "https://<project>.supabase.co/rest/v1/site_settings" \ -H "apikey: <anon-key>" \ -H "Content-Type: application/json" \ -d '{"key":"test","value":{}}'
``` Expected result: `401` or `403`. Any `201` or `204` is an incident: remove the test row and review the policies before continuing. ### 1.4 Configure authentication Under **Authentication**: 1. **Providers > Email** - Keep the email-and-password provider **enabled**. - **Disable** public sign-ups (*Allow new users to sign up*). Public registration must stay closed. Only administrators create accounts. - Keep email confirmation enabled.
2. **URL Configuration** - *Site URL*: `https://<public-domain>` (the final domain from Part 3). - *Redirect URLs*: include only `https://<public-domain>/admin/` and the login URLs the team actually uses. Do not leave broad wildcards.
3. **Email (SMTP)**: the default Supabase mail sender has volume limits and is not meant for heavy use. If the team will use password recovery and invitations often, configure 's own SMTP. Record the decision (see "Open items"). ### 1.5 Register the first administrator 1. Under **Authentication > Users**, click **Add user > Create new user**.
2. Enter the administrator's email and a strong password generated by the password manager.
3. Tick the option to auto-confirm the email, or confirm it through the link sent.
4. Still in the SQL Editor, link the user to the administrators table: ```sql
insert into public.admins (user_id)
select id from auth.users where email = '<administrator-email>'
on conflict (user_id) do nothing;
``` Expected result: one row inserted. Running the command again does not duplicate anything. ### 1.6 Register directors and staff (optional) The `papel` (role) field accepts only `diretor` (director) or `colaborador` (staff) — a database constraint. Directors and staff edit the schedule; they **cannot** change the site configuration. First create the user under **Authentication > Users**, as in 1.5. Then: ```sql
insert into public.equipe (user_id, papel)
select id, '<diretor-or-colaborador>' from auth.users
where email = '<person-email>'
on conflict (user_id) do nothing;
``` ### 1.7 Get the URL and the public key Under **Project Settings > API**, copy: - **Project URL** (format `https://<project>.supabase.co`), for the `supabaseUrl` field.
- **`anon` key** (public), for the `supabaseAnonKey` field. **Never copy the `service_role` key** into the site, the repository, chat, or Vercel as a public variable. If it leaks, revoke it immediately in the same dashboard and notify the security owner. > If the dashboard shows new keys (*publishable*/*secret*) alongside the legacy ones (*anon*/*service_role*), the current site depends on the `anon` key in JWT format. Do not change the format without validating with the team, because a change breaks login and reads. ### 1.8 Plan, backups and project pausing - Confirm the project plan under **Project Settings > Billing**. On the free plan, a project may be **paused** after a period of inactivity, and automatic backups may be limited. Check what the chosen plan guarantees.
- Before each new migration, export a backup (or record the restore point available) and note the date.
- Record the plan and the owner in `docs/en-us/architecture/security-controls-soc2.md` (CTRL-12, suppliers). --- ## Part 2 — Configure the site for production The site reads its Supabase connection from a single file: `web/assets/js/env.js`. In the repository it ships **empty**. Without values, the administration area is disabled and the site uses the defaults in `config-schema.js`. ### 2.1 How `env.js` reaches production Today the site has no build step. Therefore, **Vercel environment variables do not reach the browser**: the Vercel panel stores values, but a static site does not read them. For the current deployment, the path is: 1. Edit `web/assets/js/env.js` on the branch that goes to production and fill in: ```js
window.CCEAK_ENV = { supabaseUrl: "https://<project>.supabase.co", supabaseAnonKey: "<anon-key>"
};
``` 2. Confirm the file contains no `service_role` key and no other secret.
3. Commit and push to `main`. The `anon` key is public by design. The RLS policies from Part 1 protect the data. The file's own header says so. > **Documentation rule:** `AGENTS.md` forbids real hostnames in documents. That is why this manual uses placeholders. The real value lives only in `env.js` on the production branch, never in manuals, issues or chats. ### 2.2 Adjust the CSP if the Supabase address changes `web/vercel.json` allows connections to `https://*.supabase.co` and `wss://*.supabase.co`. If the project uses a **custom domain** for the Supabase API (for example `api.<domain>`), the CSP blocks the calls silently. In that case, add the new host to `connect-src` in `web/vercel.json` and repeat the test from Part 4. ### 2.3 Local checks before publishing From the repository root: ```bash
node scripts/security-config-check.mjs # headers, RLS, secrets and innerHTML
node scripts/check-site.mjs # links, assets, manifest and service worker
``` These are the same checks the `security` workflow runs in CI. If one fails, fix it before pushing. --- ## Part 3 — Vercel ### 3.1 Import the repository 1. In the Vercel dashboard, click **Add New > Project** and choose the cceak repository.
2. On the configuration screen, use these values: | Field | Value | Why |
|---|---|---|
| **Root Directory** | `web` | `vercel.json` and the static site live in `web/`. |
| **Framework Preset** | *Other* | Static site, no framework. |
| **Build Command** | empty | There is no build step. |
| **Output Directory** | empty | The contents of `web/` are published as they are. |
| **Production Branch** | `main` | Only what is in `main` goes to production. | 3. Click **Deploy**. ### 3.2 Environment variables on Vercel cceak **does not need** environment variables on Vercel today: the connection lives in `env.js` (Part 2). Do not put `service_role` there. If the team decides to generate `env.js` from Vercel variables, that requires a new build step. The team must design and review that change before adopting it (see "Open items"). When it exists, register the variables under **Settings > Environment Variables**, enabling only the **Production** environment for production values. ### 3.3 Preview deployments: mind the database Every branch or pull request creates a **preview** on Vercel. The preview uses the same `env.js` from its branch. **If that branch points to the production Supabase, the preview's administration writes to the live database.** Before enabling administration on previews, choose one option and record the decision: - **a)** Turn off previews for branches other than `main` (under **Settings > Git**).
- **b)** Use a staging Supabase project for previews.
- **c)** Keep previews, but do not place production values in `env.js` outside `main`. Until the decision is recorded, do not sign in to the administration of a preview with production credentials. ### 3.4 Public domain 1. Under **Settings > Domains**, add the public domain (`<public-domain>`).
2. Vercel shows the required DNS record (usually an `A` or `CNAME`). Create it at the DNS provider.
3. Wait for verification. HTTPS (certificate) is issued automatically.
4. Update the `Site URL` in Supabase (1.4) to the final domain.
5. Set the canonical domain (with or without `www`) and redirect the other one, to avoid duplicate content. ### 3.5 Confirm the security headers After the first deployment, check that the published domain sends what `web/vercel.json` declares: ```bash
curl -sI https://<public-domain>/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin-opener"
curl -sI https://<public-domain>/admin/ | grep -iE "x-robots-tag|cache-control"
``` Expected result: the Content-Security-Policy, HSTS, `X-Frame-Options: DENY` and the other headers appear in the response. The `/admin/` route shows `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`. ### 3.6 Deployment protection Under **Settings > Deployment Protection**, keep protection enabled on previews. Access to preview environments must be restricted to the team. Do not leave previews public with data or administration. --- ## Part 4 — Publication checklist Use this list for the first publication and for every change that touches the database, authentication or `vercel.json`: - [ ] Migrations 0001, 0002 and 0003 applied in production, without errors.
- [ ] Query in section 1.3: every table with `rls_enabled = true`.
- [ ] Anonymous write test returns `401` or `403` (section 1.3).
- [ ] Public sign-up disabled; email confirmation enabled (section 1.4).
- [ ] *Site URL* and *Redirect URLs* point to the final domain (section 1.4).
- [ ] At least one administrator registered in `public.admins` (section 1.5).
- [ ] `env.js` on the `main` branch has `supabaseUrl` and `supabaseAnonKey`, with no `service_role` (section 2.1).
- [ ] `security-config-check.mjs` and `check-site.mjs` pass (section 2.3).
- [ ] Production deployment completed on Vercel, from `main` (section 3.1).
- [ ] Domain serves valid HTTPS and the canonical domain is set (section 3.4).
- [ ] Headers confirmed with `curl` (section 3.5).
- [ ] Public site opens and shows the schedule and the published configuration.
- [ ] Administrator sign-in at `/admin/` works, and editing a setting saves (then revert it).
- [ ] Previews: the decision in section 3.3 is recorded. ## Part 5 — Changes and rollback ### Publish a site change 1. Open a branch and a pull request. Vercel creates a preview: test on it, remembering section 3.3.
2. Merge into `main`. Vercel publishes to production automatically. ### Publish a database change 1. **Never edit** a migration already applied in production. Create the next numbered file (`0004_...sql`, then `0005_...`), append-only.
2. Write the migration idempotently.
3. Take the backup or record the restore point (1.8).
4. Apply in the SQL Editor, check the query in 1.3 and the tests in Part 4. ### Rollback - **Site:** under **Deployments**, promote the previous deployment back to production, or use *Instant Rollback*. You do not need to revert the commit.
- **Database:** there is no automatic "undo" for migrations. To revert, create a new migration that reverses the effect, or restore the backup. That is why 1.8 is mandatory.
- **Site configuration:** the previous value is recorded by the database (`updated_at`, `updated_by`). The administration lets you return to a previous value when editing. ## Troubleshooting | Symptom | Likely cause | What to do |
|---|---|---|
| Administration says it is disabled | `env.js` with empty values | Fill in `supabaseUrl` and `supabaseAnonKey` (section 2.1). |
| Sign-in fails with *invalid credentials* | User not confirmed, wrong password, or user not registered | Confirm the user under **Authentication > Users** and the password from the password manager. |
| Sign-in works, but the screen shows no permission | User is not in `public.admins` or `public.equipe` | Run the insert in sections 1.5 or 1.6. |
| Supabase calls blocked, with no visible error | CSP does not allow the API host | Adjust `connect-src` in `web/vercel.json` (section 2.2) and check the browser console. |
| Change on the site does not show | Browser or service worker cache | Hard reload (Ctrl+Shift+R). `sw.js` is `no-cache`, but the browser may keep the previous version until reload. |
| API connection error or the project does not respond | Project paused or under maintenance | Resume the project in the Supabase dashboard and confirm the plan (section 1.8). |
| `401` or `403` on a write made by the administration | Role without permission or expired session | Sign out and back in. If it persists, check the link in `admins` or `equipe`. |
| Domain does not open | DNS not propagated or wrong record | Confirm the record required under **Settings > Domains** and wait for propagation. | ## Responsible sharing - Do not send `env.js` with real values, passwords, keys or the administration panel to third parties (suppliers, partners, volunteers outside the team). Use the channels approved by 's policy.
- Third-party access must be granted with the minimum role and reviewed periodically.
- Do not paste production URLs, keys or dashboard screenshots into chats, issues or public documents.
- Personal data (names, phone numbers, emails of attendees or volunteers) must not appear in examples, screenshots or tests. ## Open items and decisions - [ ] Production domain and canonical domain (section 3.4).
- [ ] Configuration strategy: keep `env.js` versioned (today) or create a build step that uses Vercel variables. Team decision.
- [ ] Preview policy (section 3.3): option a, b or c.
- [ ] Own SMTP for Supabase emails (section 1.4).
- [ ] MFA for administrators: pending control CTRL-06 in the pt-BR security controls document.
- [ ] Sitemap URL in `web/robots.txt` (currently a TODO), once the domain exists.
- [ ] Vercel and Supabase supplier review: CTRL-12.
- [ ] Supabase plan and backup policy confirmed (section 1.8).
