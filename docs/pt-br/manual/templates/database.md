# Ficha de migração e de backup · cceak Uma ficha por migração em `supabase/migrations/` e uma seção de backup por ciclo. Não inclua senha, chave, `service_role` nem dado pessoal. Use `TODO:` quando faltar informação. --- ## 1. Migração - **Arquivo:** `supabase/migrations/NNNN_slug.sql` (TODO:)
- **Propósito em uma frase:** TODO:
- **Responsável:** TODO:
- **Data (UTC):** TODO:
- **Ordem em relação às demais migrações:** TODO: (depende de TODO:) ## 2. Modelo afetado | Objeto | Tipo (tabela, índice, função, política, trigger) | Criar ou alterar | Dono do dado | Quem lê | Quem escreve |
|---|---|---|---|---|---|
| TODO: | TODO: | TODO: | TODO: | TODO: | TODO: | ## 3. Papéis e acesso | Papel | Lê | Escreve | Base da regra |
|---|---|---|---|
| `anon` | TODO: | não (padrão) | TODO: |
| `authenticated` | TODO: | TODO: | TODO: |
| Administrador (`public.is_admin()`) | TODO: | TODO: | TODO: | - [ ] `enable row level security` em toda tabela nova de `public`
- [ ] Nenhuma política de escrita para `anon` ou `public`
- [ ] Função `security definer` com `set search_path = public`, ou não se aplica
- [ ] Dado sensível fora de tabela de leitura pública ## 4. Idempotência e destruição - [ ] `create ... if not exists` em tabela, índice e extensão
- [ ] `create or replace` em função
- [ ] `drop policy if exists` antes de cada `create policy`
- [ ] `drop trigger if exists` antes de cada `create trigger`
- [ ] Operação destrutiva presente: não | sim, com marcador `-- aprovado-destrutivo: TODO:` e confirmação humana em TODO: ## 5. Validação | Verificação | Comando | Resultado | Observação |
|---|---|---|---|
| Estática | `node scripts/database-check.mjs` | TODO: | TODO: |
| Segurança de configuração | `node scripts/security-config-check.mjs` | TODO: | TODO: |
| Aplicação em banco local | TODO: (fora do agente) | TODO: | TODO: |
| Reaplicação (idempotência) | TODO: (aplicar duas vezes) | TODO: | TODO: | Status permitidos: aprovado, reprovado, pendente (com motivo). Não marque "aprovado" sem saída de comando. ## 6. Plano de reversão - **É reversível?** sim | não | parcialmente, motivo: TODO:
- **Como reverter:** TODO: (nova migração de reversão, não edição da anterior)
- **Dado que seria perdido:** nenhum | TODO: ## 7. Backup e restauração - **Frequência de backup:** TODO: (CTRL-11)
- **Último backup (data, tipo, onde fica com acesso restrito):** TODO:
- **Último teste de restauração (data, banco local, resultado):** TODO:
- **Responsável pelo backup:** TODO:
- **Tempo estimado de restauração:** TODO: Restauração não testada não conta como controle. Registre a evidência em `docs/pt-br/architecture/evidencias/` seguindo `docs/pt-br/manual/template-evidencia-controle.md`. ## 8. Passos humanos (não executados pelo agente) | # | Passo | Executor | Confirmação |
|---|---|---|---|
| 1 | TODO: (ex.: aplicar no banco de homologação) | TODO: | [ ] |
| 2 | TODO: (ex.: verificar linhas após aplicação) | TODO: | [ ] |
