---
name: devops-procedure
description: Procedimento de DevOps do cceak para alterar ou validar o ambiente local com Docker Compose, o pipeline de CI não relacionado a segurança, o deploy estático na Vercel, observabilidade e rollback. Use quando o usuário pedir para subir ou corrigir o ambiente local, mexer no docker-compose, revisar deploy ou rollback, investigar falha de build ou de healthcheck, ou preparar uma janela de release.
agent: agent
argument-hint: "[local | ci | deploy | rollback]"
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/devops-procedure/SKILL.md --> Procedimento executável para mudanças de infraestrutura. Executado pelo agente `.claude/agents/devops-specialist.md`. Não substitui a revisão de segurança (`skills/revisao-seguranca-soc2/`). ## Quando usar - Alterar `docker-compose.yml`, `docker/local/` ou `web/vercel.json`.
- Subir, reiniciar ou diagnosticar o ambiente local.
- Ajustar `.github/workflows/ci.yml` (jobs de teste, lint, tipo e harness).
- Planejar deploy ou rollback de produção. ## Passo 1: delimitar o alvo Pelo argumento:
- `local`: passos 2 a 4.
- `ci`: passo 5.
- `deploy` ou `rollback`: passo 6.
- Sem argumento: pergunte qual alvo, sem supor. ## Passo 2: validação estática (sempre antes de editar) ```bash
node scripts/devops-check.mjs
``` Cada linha `FALHA DOC-xx` aponta a regra. Leia o arquivo indicado antes de propor correção. Registre a saída literal no relatório. ## Passo 3: ambiente local Pré-requisitos documentados em `docs/pt-br/manual/ambiente-local-docker.md`. Comandos de referência, do próprio cabeçalho do compose: ```bash
node scripts/gen-local-env.mjs # gera .env (0600) e docker/local/env.js (ambos não versionados)
docker compose config --quiet # valida a sintaxe sem subir nada
docker compose up -d --wait # sobe; --wait espera healthchecks
docker compose ps # estado de cada serviço
docker compose logs --tail=100 <serviço> # diagnóstico
docker compose down # para, preserva dados
``` `docker compose config --quiet` é a única verificação com Docker que o agente pode rodar sem efeito colateral. `up`, `down -v` e qualquer comando que apague volume exigem confirmação humana. ## Passo 4: critérios do ambiente local - Todas as portas do host em `127.0.0.1`.
- Imagens com tag fixa, nunca `latest`.
- Serviços de longa duração com `healthcheck`; tarefas únicas com `restart: "no"`.
- Segredos só por `${VAR}`, gerados por `scripts/gen-local-env.mjs`.
- Se `docker` não estiver disponível no ambiente, marque "não executado: sem Docker" e não aprove. ## Passo 5: CI (jobs não relacionados a segurança) - Preserve o contrato: cada job chama um alvo `make`. Não duplique a lógica no YAML.
- Valide a sintaxe do YAML pelo próprio GitHub após o push; localmente, confira indentação e chaves.
- Não remova `continue-on-error` dos jobs `sensors` sem os alvos `make test/lint/typecheck` existirem. Remover antes disso faz o job quebrar sem motivo.
- Após qualquer alteração em `.github/workflows/`, rode `node scripts/devsecops-check.mjs`. ## Passo 6: deploy e rollback (somente procedimento) O agente não executa deploy, migração nem rollback. Preencha `docs/pt-br/manual/templates/devops.md` com: 1. Versão de origem e de destino (commit ou tag).
2. Versão anterior conhecida, para o rollback.
3. Verificação pós-deploy: rota de saúde, página principal e login administrativo, cada um com resultado esperado.
4. Critério de disparo do rollback.
5. Responsável humano e janela. Peça confirmação explícita antes de qualquer etapa com efeito em produção. Migração de banco com operação destrutiva segue `skills/database-procedure/SKILL.md`. ## Passo 7: relatório - Veredito: PRONTO, PRONTO COM RESSALVAS ou BLOQUEADO.
- Tabela: arquivo, mudança, regra DOC-xx atendida.
- Saída resumida de `devops-check.mjs` e, se houver, de `devsecops-check.mjs`.
- Passos manuais em lista numerada.
- Pendências `TODO:` e riscos residuais. ## Falhas comuns | Sintoma | Causa provável | Ação |
|---|---|---|
| `DOC-04` sem healthcheck | serviço sem teste de saúde | adicionar `healthcheck` com comando do próprio serviço |
| `DOC-02` sem tag | imagem sem versão | fixar a tag revisada, não `latest` |
| `DOC-06` segredo literal | senha escrita no YAML | trocar por `${VAR}` e gerar pelo script |
| `service_healthy` nunca chega | healthcheck com comando errado ou serviço demorando | ver `docker compose logs`, não relaxar a condição | Irmãos: `.claude/agents/devops-specialist.md` (agente) · `docs/pt-br/manual/templates/devops.md` (ficha de deploy) · `scripts/devops-check.mjs` · `skills/devsecops-procedure/SKILL.md`. $ARGUMENTS
