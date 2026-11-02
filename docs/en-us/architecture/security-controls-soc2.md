# Security controls and SOC 2 readiness (): . This document lists the cceak controls, where each one is verified, and what is still missing. It prepares the system for a SOC 2 Type I or Type II audit. **The SOC 2 attestation is issued by an independent CPA auditor, not by this repository.** No control set guarantees that a system will never be breached. The goal is to shrink the attack surface, catch defects early, and keep verifiable proof for every control. ## Control matrix | Control | Scope | Automated check | SOC 2 criterion | Status |
|---|---|---|---|---|
| CTRL-01 · Headers and CSP | CSP without `unsafe-inline`/`unsafe-eval`, HSTS, `frame-ancestors 'none'`, `nosniff`, `/admin` with `noindex` | `scripts/security-config-check.mjs` (HDR-01..06), CI `config` job | CC6.6, CC6.7 | Implemented |
| CTRL-02 · Data isolation (RLS) | Every table has RLS; no write for `anon`; `security definer` with fixed `search_path` | `security-config-check.mjs` (RLS-01/02), CI `config` job | CC6.1, CC6.3 | Implemented |
| CTRL-03 · Secrets kept out of the repository | No `service_role` key, private key or token committed; history scanned | `security-config-check.mjs` (SEC-01..03), `gitleaks` in CI `secrets` job, `detect-private-key` in pre-commit | CC6.1 | Implemented |
| CTRL-04 · Static analysis | OWASP Top 10, XSS and JavaScript rules | Semgrep in CI `sast` job (`--error`) | CC7.1, CC8.1 | Implemented |
| CTRL-05 · Known vulnerabilities (CVE) | Dependencies and CI actions; daily scan | OSV-Scanner in CI `cve` job (scheduled daily); Dependabot for actions | CC7.1 | Implemented |
| CTRL-06 · Strong administrator authentication | Password login with database-backed administrator check | RLS with `is_admin()`; session in `sessionStorage` | CC6.1, CC6.2 | Partial: MFA (TOTP) missing |
| CTRL-07 · Safe browser content | `innerHTML` only with literals; database data via `textContent`; links validated by scheme | `security-config-check.mjs` (CTRL-07, JS-01) | CC6.8 | Implemented |
| CTRL-08 · Change management | Review, tests and CI required before publishing | CI `config`/`sast`/`cve` jobs, review through PR | CC8.1 | Partial: branch protection pending |
| CTRL-09 · Monitoring and logging | Login failure and configuration change logs | Not implemented | CC7.2 | **Pending** |
| CTRL-10 · Incident response | Written plan, contacts and deadlines | Not implemented | CC7.3, CC7.4 | **Pending** |
| CTRL-11 · Backup and recovery | Database backup and restore test | Supabase plan (free tier lacks full automatic backup) | A1.2, A1.3 | **Pending** |
| CTRL-12 · Vendors | Review of Vercel, Supabase and other providers | Not implemented | CC9.2 | **Pending** | ## Priority gaps 1. **CTRL-06**: enable TOTP MFA for every administrator account in Supabase Auth and disable public sign-up.
2. **CTRL-08**: protect the `main` branch (PR required, `security` and `ci` checks required, no direct push).
3. **CTRL-09**: log failed logins and changes to `site_settings`.
4. **CTRL-10**: write the incident response plan with an owner and contacts.
5. **CTRL-11**: decide the backup plan; on the free tier, periodically exporting `site_settings` is the minimum.
6. **CTRL-12**: record a review of each vendor. ## Proving a control Each verified control produces evidence in `docs/pt-br/architecture/evidencias/` using the Portuguese template `docs/pt-br/manual/template-evidencia-controle.md`. Never include secrets or personal data. ## Penetration testing Offensive tests run only in a staging environment with written authorization from the owner. Nothing in this repository touches third-party systems.
