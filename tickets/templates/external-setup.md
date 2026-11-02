---
template: external-setup
id: {{ID}}
title: {{TITLE}}
type: external-setup
status: triagem
areas: [manual/external-setup]
priority: p2
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

## Plataforma de terceiro

Qual painel (Supabase, Vercel, Neon, provedor de IA, GitHub, Pluggy…), qual plano
e qual limite gratuito. Este ticket só existe porque o passo principal acontece
FORA deste repositório.

## O que o desenvolvedor precisa configurar lá

1.
2.

## O que volta para cá

Variável de ambiente, URL ou identificador que passa a existir em `.env.example`.
**Chave, token ou segredo gerado no painel nunca entra em documento nem em commit** —
o manual diz onde clicar e como o valor se chama, jamais o valor.

## Critério de aceite

- [ ] Tutorial em `docs/uso/external-setup/<arquivo>.md` (pt-BR, língua única).
- [ ] Cada passo tem o nome exato do botão ou campo do painel, na ordem em que aparece.
- [ ] `.env.example` lista a variável nova com valor de exemplo inócuo.
- [ ] Um leitor que nunca usou o painel chega ao fim sem adivinhar nada.
- [ ] Nenhum segredo real no diff.

## Riscos e contraditório

O painel muda de layout. O que no tutorial envelhece primeiro?

## Entrega

- Issue: dispensada
- Branch:
- PR:

## Histórico
