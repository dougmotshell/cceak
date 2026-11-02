# Frontend performance and budget sheet

Information classification (ISO/IEC 27001): Internal Use.
Brand: cceak · Intelie.

Use this sheet for performance reviews or before a significant release. `TODO:` fields await measurement data.

---

## Identification

- **Date (UTC):** YYYY-MM-DDTHH:MM
- **Owner:** TODO:
- **Commit or version:** TODO:
- **Scope (pages and files):** TODO:

## 1. Byte budget (uncompressed)

Command: `node scripts/frontend-check.mjs`

| Type | Current (bytes) | Proposed limit | Status |
|---|---|---|---|
| Total JavaScript | TODO: | 150 KB | [ ] OK [ ] Over |
| Total CSS | TODO: | 80 KB | [ ] OK [ ] Over |
| HTML per page (largest) | TODO: | 60 KB | [ ] OK [ ] Over |
| Image (largest) | TODO: | 300 KB | [ ] OK [ ] Over |

Limits are proposals. Changing them requires an owner decision, recorded below.

## 2. Structural checks

- [ ] No render-blocking scripts in `<head>`
- [ ] Every image has `width` and `height`; all but the first are lazy-loaded
- [ ] No third-party resource outside the CSP
- [ ] No `eval`, `new Function`, `document.write` or synchronous XHR
- [ ] Service worker pre-cache complete

## 3. Measurement in staging

Leave values as `PENDING` when no measurement was taken.

| Page | Simulated device | Network | LCP | INP | CLS | Tool and version |
|---|---|---|---|---|---|---|
| `/` | TODO: | TODO: | PENDING | PENDING | PENDING | TODO: |
| `/admin/` | TODO: | TODO: | PENDING | PENDING | PENDING | TODO: |

## 4. Offline and cache

- [ ] Home page opens offline after the first visit
- [ ] Offline navigation falls back to `offline.html`
- [ ] A new release replaces the old cache (cache version changed)
- [ ] No authenticated or database content is cached publicly

## 5. Findings

| # | Severity (critical, high, medium, low) | File:line | Impact (LCP, INP, CLS, CSP, cache) | Suggested fix | Owner |
|---|---|---|---|---|---|
| 1 | | | | | TODO: |

## 6. Verdict

- [ ] PASS
- [ ] PASS WITH REMARKS
- [ ] BLOCKED
- [ ] PENDING (measurement not taken)
