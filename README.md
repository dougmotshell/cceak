# cceak

TODO: uma frase — o que é e para quem.

`CTX-07`: este README é a orientação de fallback para quem (ou o que) chega sem ler
`AGENTS.md`. Curto de propósito; o detalhe vive em `docs/`.

## Começar

```bash
# TODO: instalar
# TODO: rodar
make help          # alvos disponíveis
make sync          # regenerar as superfícies de IA
make harness       # pontuar o harness (npx harness-score)
```

## Estrutura

| Caminho | O que é |
|---|---|
| `AGENTS.md` | contrato canônico para agentes de IA — leia primeiro |
| `docs/` | arquitetura (C4), specs (SDD), decisões (ADR) e manual, em `pt-br/` e `en-us/` |
| `skills/`, `.claude/agents/`, `.claude/rules/` | fontes autoradas do harness |
| `scripts/sync-ai-surfaces.py` | projeta as fontes nas superfícies de cada CLI |
| `.claude/hooks/` | gates e feedback em tempo de execução |

Arquivo que abre com `managed-by:` é **gerado**: edite a fonte e rode `make sync`.

## Contribuir

```bash
pre-commit install     # gates locais antes do commit
make test lint typecheck
```

## Licença

MIT — veja [`LICENSE`](LICENSE).
