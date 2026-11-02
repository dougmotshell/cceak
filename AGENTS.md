# cceak

TODO: uma frase dizendo o que este projeto é e para quem.

Este arquivo é o **contrato canônico**. `CLAUDE.md` e `.github/copilot-instructions.md`
o importam; nunca duplique conteúdo neles. Codex, Copilot, Cursor e Gemini CLI leem
este arquivo nativamente.

Irmãos: `.claude/agents/` (agentes) · `skills/` (procedimentos) · `.claude/rules/`
(regras por caminho) · `docs/` (arquitetura, specs, ADRs, manual) · `memory/`.

## Stack

TODO: linguagem, runtime e gerenciador de pacotes — só o que os manifestos comprovam.

## Comandos

| Ação | Comando |
|---|---|
| Instalar | TODO |
| Rodar | TODO |
| Testar | TODO |
| Lint / formatar | TODO |
| Sincronizar superfícies de IA | `python3 scripts/sync-ai-surfaces.py` |

## Convenções que diferem do padrão da ferramenta

TODO: só o que um agente erraria sozinho. Nada dedutível do código — sem listagem de
diretórios, sem inventário de dependências, sem narração de arquitetura.

- Nomes de arquivos e pastas em **lowercase** (`kebab-case`), exceto onde a
  convenção do próprio arquivo exige outra grafia (`README.md`, `AGENTS.md`).
- Identificadores em en-US; prosa em **pt-BR e en-US**, sempre nas duas.
- Documento novo entra em uma das quatro árvores de `docs/` — nunca na raiz.

## Armadilhas

TODO: o que já quebrou aqui e por quê. Uma linha por armadilha.

## Nunca

- Editar arquivo com o banner `managed-by:` — edite a fonte e rode o gerador.
- Escrever segredo, token, hostname real, PII ou nome de cliente.
- Inventar arquitetura, decisão ou passo de usuário: use `TODO:`.

## Documentação

`docs/pt-br/` e `docs/en-us/`, cada um com `architecture/` (C4), `specs/` (SDD),
`decisions/` (ADR) e `manual/`. Índice em `docs/README.md`. Detalhe fica lá, não aqui.

## Memória

`memory/MEMORY.md` é o índice (uma linha por entrada, até 200 linhas); o detalhe vai
nos arquivos por tópico.
