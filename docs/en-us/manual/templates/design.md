# Visual design decision sheet (): . Use this sheet when a change alters the palette, tokens, theme, typography or a shared component. `TODO:` fields await the owner's decision or data. --- ## Identification - **Date (UTC):** YYYY-MM-DDTHH:MM
- **Decision owner:** TODO:
- **Scope (tokens, screens, components):** TODO:
- **Reason for the change:** TODO:
- **Commit or version:** TODO: ## 1. Tokens | Token | Light theme | Dark theme | Use | Main pair | Contrast (minimum) | Result |
|---|---|---|---|---|---|---|
| `--text` | TODO: | TODO: | Main text | on `--bg` | 4.5:1 | [ ] OK [ ] Fail |
| `--muted` | TODO: | TODO: | Secondary text | on `--surface` | 4.5:1 | [ ] OK [ ] Fail |
| `--primary` | TODO: | TODO: | Action and link | on `--bg` | 4.5:1 | [ ] OK [ ] Fail |
| `--primary-text` | TODO: | TODO: | Button text | on `--primary` | 4.5:1 | [ ] OK [ ] Fail |
| `--focus` | TODO: | TODO: | Focus outline | on `--bg` | 3:1 | [ ] OK [ ] Fail | ## 2. Automated check - **Command:** `node scripts/design-check.mjs`
- **Result:** [ ] OK [ ] Failed
- **Summary output:** ```text
TODO: paste failure, note or OK lines only
``` ## 3. Consistency - [ ] Dark theme redefines every light token
- [ ] Both dark theme blocks have identical values
- [ ] No literal colour outside tokens (or exceptions listed below)
- [ ] Typography uses the system stack (no external font)
- [ ] Spacing in multiples of 0.25rem
- [ ] Button, field, notice and focus match across the site, `/admin` and system pages Exceptions and justification: TODO: ## 4. Brand and classification - [ ] No logo or icon change without organization authorization
- [ ] New images or icons have recorded origin and licence: TODO: ## 5. Verdict - [ ] PASS
- [ ] PASS WITH REMARKS
- [ ] BLOCKED (contrast or parity failing)
- [ ] PENDING (staging preview not done)
