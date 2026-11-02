# Deploy and rollback sheet · cceak

Brand: Intelie · cceak.
Information classification (ISO/IEC 27001): Internal Use (Uso Interno).

Short English version. The Portuguese source of truth is [`docs/pt-br/manual/templates/devops.md`](../../../pt-br/manual/templates/devops.md). Do not paste secrets, tokens, passwords, real production hostnames or personal data. Use `TODO:` when information is missing.

## Sections

1. **Identification:** release (tag or commit), target environment (local, staging, production), window in UTC, executor and human approver.
2. **Scope:** changed areas (static frontend, database migrations, CI pipeline, local environment) with risk level.
3. **Pre-checks:** `scripts/devops-check.mjs`, `scripts/devsecops-check.mjs` when the pipeline changes, `scripts/check-site.mjs` when `web/` changes, `scripts/database-check.mjs` when migrations change, green CI and a security review when required.
4. **Rollback base:** previous tag or commit, how to revert, last applied migration and whether it is reversible.
5. **Execution steps:** each step has a human executor and a recorded confirmation. The agent never runs production steps.
6. **Post-deploy checks:** home page, public configuration, admin login (valid and invalid accounts), security headers, no new 5xx or unexpected RLS errors in logs.
7. **Rollback trigger:** failed post-deploy check without a known fix, RLS or authentication errors affecting users, or suspected data or secret exposure (also activate the incident response plan, CTRL-10).
8. **Closing record:** result (success, success with caveats, rollback executed), residual risks, next step.
