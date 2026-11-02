---
id: TCK-9901
title: Fixture — bug entregue sem registrar o elo issue-PR-ticket
type: bug
status: concluido
areas: [qualidade/gates]
priority: p2
owner: software-delivery-engineer
acceptance: aprovado
rounds: 0
max_rounds: 3
challenges: 0
max_challenges: 2
issue: 9901
created: 2026-09-07
updated: 2026-09-07
---

# TCK-9901 — Fixture: bug entregue sem registrar o elo issue-PR-ticket

Fixture do gate do TCK-0021. Reproduz o estado em que TCK-0005, TCK-0007, TCK-0019 e
TCK-0020 chegaram a `concluido`: tipo que exige pull request, issue registrada no front
matter, nenhum registro de qual PR entregou nem do que houve com a issue. Números e
ids são fictícios de propósito — nada aqui aponta para repositório real.

Não é um ticket de trabalho: vive fora de `tickets/` para não entrar no quadro.

## Critério de aceite

- [ ] `ticket.py validate --dir scripts/tickets/fixtures/elo-vermelho` sai diferente de
      0 e nomeia este ticket.

## Entrega

- Issue:
- Branch:
- PR:

## Histórico

- `2026-09-07` **software-delivery-engineer** criou a fixture vermelha do gate do elo (TCK-0021).
