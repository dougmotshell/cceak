---
template: spike
id: {{ID}}
title: {{TITLE}}
type: spike
status: triagem
areas: []
priority: p2
owner: ticket-triage
acceptance: pendente
rounds: 0
max_rounds: 2
challenges: 0
max_challenges: 1
created:
updated:
---

# {{ID}} — {{TITLE}}

## Pergunta

Uma pergunta, respondível, com resposta que muda uma decisão. Se a resposta não
muda nada, o spike não deveria existir.

## Timebox

Máximo de rodadas: 2. Passou disso, o guardrail bloqueia e a decisão vai ao humano
com o que já se sabe.

## Critério de aceite

- [ ] A pergunta está respondida com evidência (`arquivo:linha`, saída de comando, medição).
- [ ] A resposta está registrada onde vai ser lida de novo: ADR em `docs/*/decisions/`
      ou lição em `memory/`.
- [ ] O ticket de implementação que este spike destrava foi aberto (ou dispensado, com motivo).
- [ ] Nenhum código de produção ficou como resíduo do experimento.

## Riscos e contraditório

O `decision-challenger` pergunta: a evidência responde a pergunta feita, ou uma parecida?

## Entrega

Tipo `spike` exige issue no GitHub antes da branch, e o PR fecha a issue. Depois do
merge, o elo fica registrado aqui e em `pr:` — `ticket.py validate` reprova `aceite`
sem isso.
Na linha da issue vão o número, o link do GitHub e o veredito estruturado —
`fechada:#<PR>`, ou `aberta:TCK-NNNN` nomeando o ticket sucessor que responde por ela.
Palavra em prosa não vale como veredito.

- Issue:
- Branch:
- PR:

## Histórico
