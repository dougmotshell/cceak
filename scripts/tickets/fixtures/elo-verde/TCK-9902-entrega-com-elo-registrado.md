---
id: TCK-9902
title: Fixture — bug entregue com o elo issue-PR-ticket registrado
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
pr: 9902
created: 2026-09-07
updated: 2026-09-07
---

# TCK-9902 — Fixture: bug entregue com o elo issue-PR-ticket registrado

Par verde da fixture anterior: o mesmo ticket, agora com o PR no front matter e o
`## Entrega` levando um terceiro à issue e ao pull request sem passar pelo histórico do
git, com o veredito estruturado `fechada:#<PR>`. Serve para provar que o gate não é um
vermelho constante — ele distingue.

## Critério de aceite

- [x] `ticket.py validate --dir scripts/tickets/fixtures/elo-verde` sai 0.

## Entrega

- Issue: [#9901](https://github.com/exemplo/exemplo/issues/9901) — `fechada:#9902`
- Branch: `fix/tck-9901-entrega-sem-elo`
- PR: [#9902](https://github.com/exemplo/exemplo/pull/9902)

## Histórico

- `2026-09-07` **software-delivery-engineer** criou a fixture verde do gate do elo (TCK-0021).
