<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/fullstack-procedure/SKILL.md --> Procedimento de orquestração. Executado pelo agente `.claude/agents/fullstack-specialist.md`, que delega cada camada pelo nome. Não duplica os procedimentos de banco, backend, DevOps, DevSecOps ou segurança: aponte para eles. ## Quando usar - A funcionalidade toca mais de uma camada (tabela, função, tela, pipeline).
- Há dúvida sobre a ordem de trabalho ou sobre o que conta como pronto.
- Uma integração falhou: a tela não recebe o dado, o erro aparece cru, ou a permissão diverge entre tela e banco. ## Passo 1: entender o pedido - Escreva a funcionalidade em uma frase e o usuário final que a usa.
- Liste as camadas tocadas: banco, API, cliente (`web/`), pipeline (`.github/`), ambiente (`docker-compose.yml`, Vercel).
- Pergunte o que faltar. Não suponha regra de negócio, papel ou prazo. ## Passo 2: estado atual Leia só o necessário: os arquivos das camadas listadas e as migrações que tocam as tabelas envolvidas. Use `Grep` para achar a chamada no cliente, por exemplo: ```bash
grep -rn "rpc/" web/assets/js/
ls supabase/migrations/
``` ## Passo 3: fatias e ordem Quebre em fatias verticais, cada uma testável. Ordem: 1. Banco: tabela, RLS, função. Delegar a `database-specialist`, com `skills/database-procedure/SKILL.md`.
2. API: contrato da função, validação, erros. Delegar a `backend-specialist`, com `skills/backend-procedure/SKILL.md`.
3. Cliente: chamada, tratamento de erro por `code`, `textContent`. Trabalho do próprio agente, seguindo CTRL-07 e a revisão de `skills/revisao-seguranca-soc2/`.
4. Pipeline e ambiente: só se a entrega mudar workflow ou compose. Delegar a `devops-specialist` e `devsecops-specialist`. Não ligue o cliente a uma função que ainda não existe. Não entregue a fatia 3 antes da 2 estar verificada. ## Passo 4: contrato entre camadas Preencha a seção de contrato de `docs/pt-br/manual/templates/fullstack.md`. Ele é a única fonte que as três camadas consultam: nome da função, entrada, saída, erros por `code`, papel que pode chamar, e a regra de idempotência. ## Passo 5: delegação Para cada fatia, chame o especialista pelo nome com: - objetivo da fatia em uma frase;
- arquivos que ele pode alterar (lista fechada);
- contrato da seção 3 do template;
- critérios de pronto daquela fatia;
- o que já está decidido e o que não pode mudar. Peça a saída de verificação. Conclusão sem saída de comando não conta. ## Passo 6: integração Confira, com evidência, cada item da seção 4 do template: - o cliente envia os parâmetros com o nome e o tipo que a função espera;
- cada `code` de erro documentado é tratado no cliente;
- a permissão é a mesma: o que o papel não pode no banco, a tela não oferece e não aceita;
- a escrita repetida não duplica (idempotência);
- nenhum `service_role`, segredo ou dado pessoal aparece no diff. ## Passo 7: verificação ```bash
node scripts/fullstack-check.mjs
``` Esse comando roda as verificações estáticas de todas as camadas e não substitui os testes de cada especialista. Para cada `FALHA`, delegue a correção ao responsável indicado. Verificações que exigem ambiente real (teste de login, chamada à função com sessão, carga de tela) são pendentes até serem executadas no ambiente local do compose. ## Passo 8: critérios de pronto A entrega está pronta somente quando todos forem verdadeiros, com evidência: - [ ] Fatias de banco, API e cliente verificadas pelos especialistas.
- [ ] `node scripts/fullstack-check.mjs` sem falhas.
- [ ] Checklist de integração completo.
- [ ] Revisão de segurança feita quando a entrega toca dado sensível (`skills/revisao-seguranca-soc2/`).
- [ ] Documentação da decisão, quando houver, em `docs/pt-br/decisions/` e `docs/en-us/decisions/`.
- [ ] Passos humanos listados (migração em produção, deploy, configuração do painel), sem execução pelo agente. ## Passo 9: relatório - Mapa das fatias com o especialista e o estado de cada uma.
- Checklist de integração com resultado.
- Saída resumida de `fullstack-check.mjs`.
- Passos humanos numerados.
- Veredito (PRONTO, PRONTO COM RESSALVAS ou BLOQUEADO) e pendências com dono. ## Não faça - Não faça deploy, migração em produção nem publicação.
- Não repasse o trabalho de um especialista como se fosse seu, sem a verificação dele.
- Não invente regra de negócio, papel ou prazo: use `TODO:`. Irmãos: `.claude/agents/fullstack-specialist.md` · `docs/pt-br/manual/templates/fullstack.md` · `scripts/fullstack-check.mjs` · `skills/database-procedure/SKILL.md` · `skills/backend-procedure/SKILL.md` · `skills/devops-procedure/SKILL.md` · `skills/devsecops-procedure/SKILL.md`.
