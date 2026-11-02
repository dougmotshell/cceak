# Ficha de deploy e rollback · cceak Preencha uma ficha por release. Não cole segredo, token, senha, hostname real de produção nem dado pessoal. Use `TODO:` quando faltar informação. --- ## 1. Identificação - **Release (tag ou commit):** TODO:
- **Ambiente de destino:** local | homologação | produção
- **Data e janela (UTC):** TODO:
- **Responsável pela execução:** TODO:
- **Aprovador humano:** TODO: ## 2. Escopo da mudança | Área | Arquivos ou serviços | Mudança | Risco (baixo, médio, alto) |
|---|---|---|---|
| Frontend estático (Vercel) | `web/` | TODO: | TODO: |
| Banco (migrações) | `supabase/migrations/` | TODO: | TODO: |
| Pipeline (CI) | `.github/workflows/` | TODO: | TODO: |
| Ambiente local | `docker-compose.yml` | TODO: | TODO: | ## 3. Pré-verificações - [ ] `node scripts/devops-check.mjs` executado, saída anexada
- [ ] `node scripts/devsecops-check.mjs` executado, se o pipeline mudou
- [ ] `node scripts/check-site.mjs` executado, se `web/` mudou
- [ ] Migrações revisadas com `node scripts/database-check.mjs`, se houve mudança de banco
- [ ] CI verde no commit de destino (`ci` e `security`)
- [ ] Revisão de segurança aprovada (`skills/revisao-seguranca-soc2/`), se houve mudança em `web/`, `supabase/` ou `.github/` ## 4. Versão anterior (base do rollback) - **Tag ou commit anterior:** TODO:
- **Como voltar (comando ou ação no painel):** TODO:
- **Última migração aplicada e se é reversível:** TODO: ## 5. Passos de execução Cada passo tem um executor humano. O agente não executa passos com efeito em produção. | # | Passo | Executor | Confirmação registrada |
|---|---|---|---|
| 1 | TODO: | TODO: | [ ] |
| 2 | TODO: | TODO: | [ ] | ## 6. Verificação pós-deploy | Verificação | Resultado esperado | Resultado obtido | OK |
|---|---|---|---|
| Página inicial responde | HTTP 200 e título correto | TODO: | [ ] |
| Configuração pública carrega | dados publicados visíveis | TODO: | [ ] |
| Login administrativo | entra com conta válida, recusa conta inválida | TODO: | [ ] |
| Cabeçalhos de segurança | CSP e HSTS presentes | TODO: | [ ] |
| Logs sem erro novo | nenhum erro 5xx ou de RLS inesperado | TODO: | [ ] | ## 7. Critério de rollback Dispare o rollback se qualquer um destes ocorrer nos primeiros 30 minutos: - [ ] Verificação da seção 6 falhou e não há correção conhecida em até TODO: minutos
- [ ] Erro de RLS ou de autenticação afetando usuários
- [ ] Vazamento de dado ou de segredo suspeito (acione também o plano de resposta a incidentes, CTRL-10)
- [ ] Outro: TODO: ## 8. Registro final - **Resultado:** sucesso | sucesso com ressalvas | rollback executado
- **Ressalvas e riscos residuais:** TODO:
- **Próximo passo:** TODO:
