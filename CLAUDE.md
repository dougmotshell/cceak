@AGENTS.md

`AGENTS.md` é canônico: tudo que vale para Claude Code, Codex e Copilot vive lá. Aqui
fica só o que é específico do Claude Code. Se uma seção serviria para as três CLIs,
ela está no lugar errado.

## Subagentes

TODO: um por linha — nome e quando acionar. Fonte: `.claude/agents/<n>.md`.

## Comandos de barra

Gerados por `scripts/sync-ai-surfaces.py` a partir de `skills/` e `.claude/agents/`.
TODO: liste os que existem.

## Servidores MCP

TODO: os deste projeto e para que servem. Fonte: `.mcp.json`.

## Gerado vs. autorado

`.claude/skills/` e `.claude/commands/` são **gerados**. Edite `skills/<n>/SKILL.md`
ou `.claude/agents/<n>.md` e rode `python3 scripts/sync-ai-surfaces.py`.
Nunca edite um arquivo que abre com `managed-by:`.
