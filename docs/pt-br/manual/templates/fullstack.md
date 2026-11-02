# Plano de entrega ponta a ponta · cceak Um plano por funcionalidade que atravessa camadas. Não inclua segredo, chave, dado pessoal ou dado de cliente em exemplos. Use `TODO:` quando faltar informação, e não invente regra de negócio. --- ## 1. Identificação - **Funcionalidade (uma frase):** TODO:
- **Usuário final e papel:** TODO:
- **Responsável pela entrega:** TODO:
- **Data de início e de alvo (UTC):** TODO:
- **Camadas tocadas:** [ ] banco [ ] API [ ] cliente (`web/`) [ ] pipeline [ ] ambiente ## 2. Fatias e ordem de trabalho | # | Fatia | Especialista | Depende de | Arquivos permitidos | Estado |
|---|---|---|---|---|---|
| 1 | Tabela, RLS e função | `database-specialist` | (nenhuma) | `supabase/migrations/NNNN_slug.sql` | pendente |
| 2 | Contrato e validação da função | `backend-specialist` | 1 | TODO: | pendente |
| 3 | Chamada e tratamento de erro no cliente | agente principal | 2 | TODO: | pendente |
| 4 | Pipeline ou ambiente, se houver | `devops-specialist` / `devsecops-specialist` | 3 | TODO: | pendente | Estados permitidos: pendente, em andamento, pronta, bloqueada (com motivo e dono). ## 3. Contrato entre camadas - **Função (rota):** `POST /rest/v1/rpc/TODO:`
- **Entrada:** TODO: (nome, tipo, obrigatório, limite)
- **Saída:** TODO:
- **Erros por `code`:** | `code` | Quando | Ação no cliente |
|---|---|---|
| `22023` | argumento inválido | TODO: |
| `P0001` | regra de negócio | TODO: |
| `23505` | duplicidade | TODO: |
| `42501` | sem permissão | TODO: | - **Papel que pode chamar:** anônimo | usuário logado | administrador
- **Idempotência:** chave natural | identificador do cliente | não se aplica (TODO:) ## 4. Checklist de integração (frontend, API e banco) Cada item precisa de evidência (saída de comando, teste ou print de verificação com caminho do arquivo). - [ ] O cliente envia o nome e o tipo de parâmetro que a função espera
- [ ] Cada `code` documentado é tratado no cliente, e a mensagem exibida é de interface, não a bruta do banco
- [ ] A permissão é a mesma nas três camadas: o banco nega, a API recusa, a tela não oferece
- [ ] Escrita repetida não duplica dado
- [ ] Conteúdo vindo do banco é exibido com `textContent`, nunca com `innerHTML` (CTRL-07)
- [ ] Sessão em `sessionStorage`, e nenhum `service_role` no cliente
- [ ] Estados de carregamento, vazio e erro estão tratados na tela
- [ ] Nenhum segredo, token ou dado pessoal no diff ou nos logs ## 5. Verificações | Verificação | Comando ou método | Resultado | Responsável |
|---|---|---|---|
| Estática de todas as camadas | `node scripts/fullstack-check.mjs` | TODO: | agente |
| Migração | `node scripts/database-check.mjs` | TODO: | `database-specialist` |
| Função com sessões de cada papel (local) | TODO: | pendente | TODO: |
| Tela com dado real de teste (local) | TODO: | pendente | TODO: |
| Revisão de segurança (se houver dado sensível) | `skills/revisao-seguranca-soc2/` | TODO: | `appsec-soc2` | Verificação que exige ambiente real fica como "pendente" até ser executada. Não marque como aprovada por suposição. ## 6. Critérios de pronto - [ ] Todas as fatias estão "pronta", com verificação do especialista
- [ ] `fullstack-check.mjs` sem falhas
- [ ] Checklist de integração completo
- [ ] Revisão de segurança concluída, quando aplicável
- [ ] Decisão relevante registrada em `docs/pt-br/decisions/` e `docs/en-us/decisions/`
- [ ] Passos humanos da seção 7 listados e confirmados por quem executa ## 7. Passos humanos (não executados pelo agente) | # | Passo | Executor | Confirmação |
|---|---|---|---|
| 1 | Aplicar migração no ambiente de homologação | TODO: | [ ] |
| 2 | Publicar o site (ver ficha de deploy) | TODO: | [ ] |
| 3 | Ajustar configuração no painel do Supabase, se a entrega exigir | TODO: | [ ] | ## 8. Pendências e riscos | Item | Dono | Prazo | Observação |
|---|---|---|---|
| TODO: | TODO: | TODO: | TODO: | **Veredito:** PRONTO | PRONTO COM RESSALVAS | BLOQUEADO
