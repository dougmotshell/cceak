# Local environment with Docker Compose (): . Runs the whole cceak stack on your machine: site, admin screen, API, authentication and database. Everything runs in containers, at no cost, with no connection to the hosted Supabase. ## Services | Service | Image | Role |
|---|---|---|
| `db` | `supabase/postgres:15.19.0.017` | Postgres with Supabase roles and schema |
| `migrate` | same image | Runs once: sets internal role passwords, applies migration 0001 and the dev seed |
| `auth` | `supabase/gotrue:v2.186.0` | Email and password login, public sign-up disabled |
| `postgrest` | `postgrest/postgrest:v12.2.12` | REST API over the `public` schema, enforced by RLS |
| `web` | `nginx:1.27-alpine` | Serves the site and routes `/rest/v1` and `/auth/v1` on one origin | ## Usage Requirements: Docker with Compose v2. ```bash
node scripts/gen-local-env.mjs # generates .env (secrets) and docker/local/env.js (gitignored)
docker compose up -d --wait # starts everything; the first run downloads the images
``` - Site: http://localhost:8000
- Admin: http://localhost:8000/admin/
- Test login: `admin@local.test` / `dev-admin-123` Stop with `docker compose down`. Remove data too with `docker compose down -v`. ## Security notes - All host ports bind to `127.0.0.1`.
- `.env` and `docker/local/env.js` are generated with random secrets and are gitignored. Never commit them.
- Only the `anon` key is generated. No `service_role` key is written to disk.
- The test admin exists **only** locally, via `docker/local/seed-dev.sql`. Never reuse that seed in production.
- Public sign-up is disabled. ## Differences from production - The local gateway does not validate the `apikey` header (Supabase's Kong does). Anonymous requests use the `anon` role, which has the same privileges as hosted: read `key` and `value`, no writes.
- Security headers and CSP come from `web/vercel.json` in production; the local nginx sets basic headers only.
- Mail is auto-confirmed locally; there is no SMTP.
- MFA is not configured locally. See control CTRL-06 in `docs/en-us/architecture/security-controls-soc2.md`. Reset everything: `docker compose down -v && node scripts/gen-local-env.mjs --force && docker compose up -d --wait`. `--force` invalidates local sessions and login data. Portuguese version: `docs/pt-br/manual/ambiente-local-docker.md`.
