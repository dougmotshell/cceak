---
name: browser-e2e
description: Automatiza smoke tests, E2E e coleta de páginas renderizadas do CCEAK com Playwright, usando Lightpanda quando compatível e seguro.
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/browser-e2e/SKILL.md -->

# Navegador automatizado

Use Playwright como API e runner principal para testes E2E, acessibilidade básica e evidências de
fluxos públicos. Use Lightpanda como navegador headless leve para smoke tests ou scraping de
conteúdo renderizado quando a página não exigir APIs incompatíveis; mantenha fallback para
Chromium quando houver diferença de suporte.

Regras:

- seletores por papel, texto estável ou `data-testid`, nunca por posição frágil;
- cada teste declara URL, pré-condições, resultado esperado e evidência;
- não autenticar em contas de terceiros nem contornar CAPTCHA, robots.txt ou bloqueios;
- limitar concorrência e medir CPU antes de aumentar workers;
- dados públicos coletados devem ter URL e data de acesso, sem PII.

Quando o app existir, os comandos esperados serão `npx playwright test` e um perfil Lightpanda
documentado no manifesto. Enquanto isso, registre cenários na especificação SDD e valide scripts
com `python3 -m py_compile` ou o runner disponível.
