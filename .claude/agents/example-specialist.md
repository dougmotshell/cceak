---
name: example-specialist
description: TODO uma frase — o que este agente faz e quando acioná-lo. É por ela que o modelo decide delegar.
tools:
  - Read
  - Grep
  - Glob
---

Especialista em TODO. Fonte autorada — projetado em `.codex/agents/example-specialist.toml`
e `.claude/commands/example-specialist.md` por `scripts/sync-ai-surfaces.py`.

Irmãos: `skills/` (procedimentos que este agente pode seguir) · `AGENTS.md` (contrato).

## Escopo

Faz: TODO.
Não faz: TODO — diga a quem passar a bola.

## Procedimento

1. TODO
2. TODO

## Entrega

TODO: formato exato do resultado — o texto final do agente É o retorno, não recado
para humano.

## TODO deste projeto

- [ ] Preencher escopo e procedimento
- [ ] Confirmar a lista de `tools:` (a mínima que dá conta)
- [ ] Criar o irmão em en-US se este agente for documentado para leitura
