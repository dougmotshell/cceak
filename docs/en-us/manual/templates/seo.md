# Technical SEO audit sheet

Information classification (ISO/IEC 27001): Internal Use.
Brand: cceak · Intelie.

Short English version of `docs/pt-br/manual/templates/seo.md`. The pt-BR file is canonical for the checklist; fill `TODO:` where the owner has not supplied the data.

---

## Identification

- **Date (UTC):** YYYY-MM-DDTHH:MM
- **Auditor:** TODO:
- **Content owner:** TODO:
- **Scope:** (page, path, or all of `web/`)
- **Audited commit or version:** TODO:
- **Production domain:** TODO:

## Automated checks

- **Commands:** `node scripts/seo-check.mjs` and `node scripts/check-site.mjs`
- **Result:** [ ] Pass  [ ] Failures
- **Summary output:**

```text
(paste failure lines only, or the OK line)
```

## Per-page checklist

| Page | `lang` | Title (15-65 chars) | Description (50-160 chars) | Canonical https | Open Graph complete | Robots correct | Findings |
|---|---|---|---|---|---|---|---|
| `/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/privacidade/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/termos/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/cookies/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/admin/` (noindex) | [ ] | [ ] | n/a | n/a | n/a | [ ] | |
| `404` and `offline` (noindex) | [ ] | [ ] | n/a | n/a | n/a | [ ] | |

## Crawl files

- [ ] `web/robots.txt` exists, has an https `Sitemap:` line, and does not block the whole site
- [ ] `web/sitemap.xml` exists and lists every indexable page
- [ ] No private page appears in the sitemap

## Findings

| # | Severity (critical, high, medium, low) | Page | Item | Suggested fix | Owner | Due |
|---|---|---|---|---|---|---|
| 1 | | | | | TODO: | TODO: |

## Verdict

- [ ] PASS
- [ ] PASS WITH REMARKS
- [ ] PENDING

**Note:** this sheet measures what the repository can verify. It does not guarantee search ranking.
