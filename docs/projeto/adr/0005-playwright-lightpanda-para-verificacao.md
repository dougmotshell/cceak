# ADR-0005: Playwright e Lightpanda para verificação web

- **Status:** aceito
- **Data:** 2026-09-27
- **Relacionada:** [`portal-publico-cceak.md`](../sdd/portal-publico-cceak.md)

## Contexto

O portal público precisa de smoke tests, testes E2E e coleta controlada de páginas públicas. O
projeto pode usar Playwright e Lightpanda, mas os dois navegadores não devem ser tratados como
equivalentes sem verificar compatibilidade.

## Decisão

Playwright é a API e o runner principal. Lightpanda é uma opção headless de menor custo para
smoke tests ou páginas compatíveis. Chromium continua sendo o fallback para APIs, renderização ou
diagnóstico que o Lightpanda não suportar.

Testes devem limitar concorrência, registrar evidência e respeitar robots.txt, termos de uso,
CAPTCHA, autenticação e privacidade.

## Consequências

- o cenário E2E é escrito uma vez e pode ter perfis de navegador;
- diferenças de suporte precisam ser registradas como limitação, não mascaradas;
- o custo de CPU é medido antes de distribuir workers;
- scraping público permanece mínimo, rastreável e sem dados pessoais.
