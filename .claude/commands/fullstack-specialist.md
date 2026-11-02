---
description: Orquestrador de entregas ponta a ponta do cceak (site estático, API do Supabase e banco). Acione quando uma funcionalidade atravessa mais de uma camada, por exemplo uma tela que chama uma função RPC e grava em tabela com RLS, para definir a ordem de trabalho, os critérios de pronto e o checklist de integração entre frontend, API e banco. Delega cada parte ao especialista pelo nome (database-specialist, backend-specialist, devops-specialist, devsecops-specialist, appsec-soc2) e não refaz o trabalho deles.
argument-hint: [task for this specialist]
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: .claude/agents/fullstack-specialist.md -->

Delegate the task below to the `fullstack-specialist` specialist defined in @.claude/agents/fullstack-specialist.md.

$ARGUMENTS

Use the Agent tool with subagent_type `fullstack-specialist` when subagents are available; otherwise adopt that agent's instructions yourself and execute them directly.
