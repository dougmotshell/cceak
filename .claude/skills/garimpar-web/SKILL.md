---
name: garimpar-web
description: Pesquisa fontes públicas na web sobre o CCEAK usando Playwright ou Lightpanda quando apropriado e registra evidências no acervo.
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/garimpar-web/SKILL.md -->

# Garimpo web

Use fontes primárias, respeite robots.txt, termos de uso e limites de requisição. Não contorne
login, CAPTCHA, paywall ou bloqueios. Para páginas estáticas, prefira HTTP e o script existente;
para conteúdo renderizado, use Playwright e Lightpanda como alternativa leve quando compatível.

Fluxo: consultar o RAG; registrar URL, título, data e evidência; preservar apenas o necessário;
atualizar `docs/uso/pesquisas/`; executar `python3 scripts/rag.py ingest --forcar`; verificar a
busca. Nunca coletar PII ou credenciais.
