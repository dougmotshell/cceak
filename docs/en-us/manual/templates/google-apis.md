# Google API integration sheet > **Source of truth:** [`docs/pt-br/manual/templates/google-apis.md`](../../../pt-br/manual/templates/google-apis.md). This short version lists the same decisions. Do not paste keys, secrets, non-public client IDs or visitor data. One sheet per Google service. Record for each: - [ ] Purpose on the site and whether it is optional (what the visitor loses if blocked).
- [ ] Whether a Google account is needed, and the minimal OAuth scopes.
- [ ] Credential type and origin or referrer restrictions.
- [ ] Free quota, expected usage and the date the official documentation was checked.
- [ ] Personal data involved, LGPD legal basis, and consent before any third-party script loads.
- [ ] Domain allowed in the correct CSP directive in `web/vercel.json`, with no unused Google domain left behind.
- [ ] `node scripts/google-apis-check.mjs` passes.
- [ ] Verdict: OK, OK WITH CAVEATS or BLOCKED.
