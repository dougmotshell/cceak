# Memória — cceak

Índice. **Uma linha por entrada, no máximo 200 linhas**; o detalhe vai no arquivo por
tópico em `memory/<topico>.md`. Se uma entrada não cabe numa linha, ela não pertence
aqui.

Irmãos: `AGENTS.md` (contrato) · `docs/projeto/adr/` (decisões, que são imutáveis e não
memória).

## Entradas

- [pesquisa-web](pesquisa-web.md) — coleta deve separar evidência, inferência e divergência entre fontes.
- [tickets-rag](tickets-rag.md) — fixtures, metadados, camadas RAG e critério de CPU para este fluxo.

## Regras

- Data relativa vira data absoluta ("na semana passada" → `2026-08-17`).
- Não registre o que o repositório já conta: estrutura de código, histórico do git,
  conteúdo do `AGENTS.md`.
- Nunca registre segredo, token, hostname real, PII ou nome de cliente.
- Entrada errada é apagada, não corrigida por acréscimo.
