# ADR 0002 — Vite na aplicação e Vercel na entrega

- **Status:** aceita
- **Data:** 27/09/2026
- **Escopo:** portal público da CCEAK
- **Relacionada:** [`portal-publico-cceak.md`](../specs/portal-publico-cceak.md)

## Contexto

O portal planejado é uma experiência pública com landing page, cronograma de
estudos, catálogo de palestras e calendário de eventos. O repositório ainda não
possui manifesto de aplicação ou stack comprovada. Foi solicitado que a solução use
Vite e seja implantada na Vercel.

## Decisão

Usar Vite como ferramenta de desenvolvimento e build da aplicação web e Vercel como
plataforma de preview e produção. O pipeline deverá separar validação, build e
deploy; em CI, o artefato validado será publicado com `vercel deploy --prebuilt`.

## Consequências

### Positivas

- build estático adequado ao escopo público inicial;
- previews isolados para validar cada fatia TDD antes da produção;
- possibilidade de promover o artefato validado sem reconstruí-lo;
- a decisão permanece independente de CMS até que a política editorial seja definida.

### Custos e riscos

- será necessário escolher framework de interface, biblioteca de testes e estratégia
  de roteamento dentro do ecossistema Vite;
- rotas de uma SPA precisam de fallback apropriado na Vercel;
- conteúdo externo do Instagram e YouTube pode sofrer bloqueios ou mudar sem aviso;
- credenciais de Vercel precisam ser configuradas fora do repositório.

## Alternativas consideradas

| Alternativa | Decisão |
|---|---|
| Vite + hospedagem estática genérica | não escolhida: não atende ao pedido de Vercel |
| Next.js na Vercel | não escolhida: o pedido determina Vite e o primeiro escopo não exige SSR |
| CMS antes da aplicação | adiada: ainda faltam responsável editorial e fluxo de aprovação |

## Verificação

Esta decisão será considerada implementada quando houver:

1. manifesto com scripts de desenvolvimento, teste e build;
2. build Vite reproduzível;
3. projeto Vercel vinculado sem segredos versionados;
4. preview validado pelos testes de aceitação e acessibilidade;
5. promoção para produção a partir do artefato validado.
