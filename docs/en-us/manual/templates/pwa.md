# PWA checklist: install, offline and update > **Source of truth:** [`docs/pt-br/manual/templates/pwa.md`](../../../pt-br/manual/templates/pwa.md). This short version lists the same checks. Do not paste the real production URL, customer domains or user data. - [ ] `node scripts/pwa-check.mjs` passes.
- [ ] Manifest: `name`, `short_name`, `start_url`, `scope`, `display`, `lang`.
- [ ] Icons 192 and 512 in PNG with the declared dimensions; one `maskable` icon.
- [ ] `VERSION` in `web/sw.js` increased whenever `SHELL` changes.
- [ ] `SHELL` holds only offline shell files; no `/admin`, no data, no query strings.
- [ ] Manual install test, offline test and update test on staging over HTTPS (browser and version recorded).
- [ ] Lighthouse PWA or installability audit without criteria errors.
- [ ] Verdict: OK, OK WITH CAVEATS or BLOCKED.
