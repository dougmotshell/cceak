@AGENTS.md

`AGENTS.md` é canônico. Aqui fica só o que é específico do Copilot.

## Prompts

`.github/prompts/*.prompt.md` são **gerados** de `skills/<n>/SKILL.md`. Frontmatter
válido: `name`, `description`, `agent` e, opcionalmente, `argument-hint`, `model`,
`tools`. A chave `mode:` está depreciada — não use.

## Regras por caminho

`.github/instructions/*.instructions.md` são **gerados** de `.claude/rules/*.md`; o
`applyTo:` vem do `paths:` da fonte.

## Gerado vs. autorado

Edite a fonte, rode `python3 scripts/sync-ai-surfaces.py`, nunca edite um arquivo que
abre com `managed-by:`.
