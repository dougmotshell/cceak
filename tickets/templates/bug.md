---
template: bug
id: {{ID}}
title: {{TITLE}}
type: bug
status: triagem
areas: []
priority: p1
owner: ticket-triage
acceptance: pendente
rounds: 0
max_rounds: 3
challenges: 0
max_challenges: 2
created:
updated:
---

# {{ID}} — {{TITLE}}

## Sintoma

O que o usuário viu, com as palavras dele. Mensagem de erro literal entre crases.
Nada de dado real de família, valor real ou PII: use exemplo fictício.

## Reprodução

1.
2.
3.

Esperado:
Obtido:

## Alcance

- Desde quando (commit, versão ou data):
- Quem é afetado (todos os households, um fluxo, um dispositivo):
- Dado corrompido? Precisa correção retroativa?

## Causa raiz

Preenchido pelo agente que investigar, com `arquivo:linha`. Enquanto não houver
evidência, fica `TODO:` — hipótese não é causa raiz.

## Critério de aceite

- [ ] Teste que falha antes da correção e passa depois (`arquivo:teste`).
- [ ] A reprodução acima não reproduz mais.
- [ ] Nenhuma regressão: os gates definidos no `Makefile`/manifesto estão verdes.
- [ ] Se houve dado corrompido, o plano de correção retroativa está descrito e executado.

## Riscos e contraditório

O `decision-challenger` ataca a causa raiz: a evidência sustenta, ou só correlaciona?

## Entrega

Bug exige issue no GitHub antes da branch, e o PR fecha a issue. Depois do merge, o
elo fica registrado aqui e em `pr:` — `ticket.py validate` reprova `aceite` sem isso.
Na linha da issue vão o número, o link do GitHub e o veredito estruturado —
`fechada:#<PR>`, ou `aberta:TCK-NNNN` nomeando o ticket sucessor que responde por ela.
Palavra em prosa não vale como veredito.

- Issue:
- Branch:
- PR:

## Histórico
