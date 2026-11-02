---
id: TCK-0001
title: Portar tickets, RAG e documentação do projeto
type: chore
status: triagem
areas: [docs/projeto, pesquisa/rag, qualidade/gates]
priority: p1
owner: cceak
acceptance: pendente
rounds: 0
max_rounds: 3
challenges: 0
max_challenges: 2
created: 2026-09-27
updated: 2026-09-27
---

# TCK-0001 — Portar tickets, RAG e documentação do projeto

## Contexto

O projeto precisava incorporar um fluxo maduro de tickets, uma organização documental e um padrão
RAG de projeto de referência, adaptados ao domínio CCEAK e à futura stack Vite/Supabase/Vercel.

## Escopo

Faz:
- incorporar CLI, templates, skill e fixtures de tickets;
- organizar `docs/uso` e `docs/projeto`;
- configurar RAG, metadados, camadas e agentes de pesquisa;
- documentar Playwright/Lightpanda e medir CPU dos scripts;

Não faz:
- implementar ainda a aplicação Vite ou o banco Supabase;
- copiar o acervo doutrinário inteiro do projeto de referência;

## Critério de aceite

Escrito na triagem, com o usuário, ANTES de qualquer código. Cada item é
verificável por alguém que não participou da implementação — comando que roda,
tela que abre, número que confere.

- [x] `python3 scripts/tickets/ticket.py selftest` passa.
- [x] `python3 scripts/rag.py ingest --forcar`, `stats`, `busca` e `cruzar` funcionam.
- [x] Documentação organizada em `docs/uso` e `docs/projeto`, em pt-BR.
- [x] CPU do ingest medida em 71%, abaixo do limite de 80% por núcleo nesta execução.
- [ ] Gates definidos no manifesto da aplicação futura são executados quando ele existir.

## Plano

Passos e o agente responsável por cada um.

| # | Passo | Agente | Estado |
|---|---|---|---|
| 1 | Adaptar ferramentas e documentação | Codex | concluído |

## Riscos e contraditório

O `decision-challenger` deve verificar se o RAG não induz conclusões indevidas, se a coleta web
respeita limites e se a futura implementação não é confundida com este scaffold documental.

## Entrega

- Issue: dispensada
- Branch:
- PR:

## Histórico
- `2026-09-27` **ticket-triage** abriu o ticket como `chore`.
