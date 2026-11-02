---
name: database-procedure
description: Procedimento de banco de dados do cceak para criar ou revisar migrações do Supabase (tabelas, índices, RLS, políticas, funções security definer), validar idempotência e segurança estática, e planejar backup e restauração. Use quando o usuário pedir uma migração, uma política de acesso, um índice, uma função de banco, uma revisão de RLS, ou o plano de backup e de restauração.
argument-hint: "[migracao | rls | funcao | backup]"
--- Procedimento executável para o banco PostgreSQL do Supabase. Executado pelo agente `.claude/agents/database-specialist.md`. A revisão de segurança da aplicação continua em `skills/revisao-seguranca-soc2/`. ## Quando usar - Criar ou alterar tabela, índice, política de RLS ou função em `supabase/migrations/`.
- Revisar quem pode ler e escrever o quê.
- Planejar backup, restauração ou teste de restauração.
- Investigar erro de permissão (`42501`) ou lentidão de consulta. ## Passo 1: delimitar Pelo argumento:
- `migracao`: passos 2 a 5.
- `rls`: passo 4 e revisão das políticas existentes.
- `funcao`: passo 3 e passo 4 para a política de execução.
- `backup`: passo 6.
- Sem argumento: pergunte o alvo. ## Passo 2: estado atual (sem suposição) ```bash
ls supabase/migrations/
``` Leia apenas as migrações que tocam a tabela ou a função alvo. A migração `0001` pode estar em reescrita por outra frente: trate-a como base de leitura e não a edite. ## Passo 3: escrever a migração Nome `NNNN_slug.sql`, com o próximo número livre. Modelo de referência, idempotente: ```sql create table if not exists public.<tabela> ( id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now()
); alter table public.<tabela> enable row level security; drop policy if exists <tabela>_select_publico on public.<tabela>;
create policy <tabela>_select_publico on public.<tabela> for select to anon, authenticated using (true); create index if not exists <tabela>_created_at_idx on public.<tabela> (created_at);
``` Funções: `create or replace function`, com `set search_path = public` quando `security definer`. Triggers: `drop trigger if exists` antes de `create trigger`. Não use `drop table`, `truncate`, `drop column` ou `drop schema` sem o marcador: ```sql
-- aprovado-destrutivo: <referência da confirmação humana>
``` ## Passo 4: RLS e papéis Papéis do Supabase no projeto:
- `anon`: visitante sem login.
- `authenticated`: usuário com sessão.
- Administrador: `authenticated` com linha em `public.admins`, verificado por `public.is_admin()`. Checklist:
- [ ] `enable row level security` na mesma migração que cria a tabela.
- [ ] Nenhuma política de escrita (`insert`, `update`, `delete`, `all`) para `anon` ou `public`.
- [ ] Escrita administrativa usa `public.is_admin()` nas cláusulas `using` e `with check`.
- [ ] Leitura pública só para dado publicado de propósito, com justificativa.
- [ ] Nenhuma tabela sensível legível por `anon`. Liste as políticas atuais com grep, para não criar duplicidade: ```bash
grep -rn "create policy" supabase/migrations/
``` ## Passo 5: validação ```bash
node scripts/database-check.mjs
node scripts/security-config-check.mjs
``` Cada `FALHA DB-xx` aponta a regra: | Regra | Significado |
|---|---|
| DB-01 | nome de arquivo ou número repetido |
| DB-02..04 | falta `if not exists` |
| DB-05, DB-06 | falta `drop ... if exists` antes de policy ou trigger |
| DB-07, DB-08 | função sem `or replace`, ou `security definer` sem `search_path` |
| DB-09, DB-10 | tabela `public` sem RLS, ou RLS desligado |
| DB-11, DB-12 | escrita concedida a `anon` ou `public` |
| DB-13 | operação destrutiva sem marcador de aprovação | A verificação é heurística por texto. Ela não prova que o banco aceita a migração. Para isso, aplique em banco local do compose (fora do agente) e confirme. ## Passo 6: backup e restauração (plano) Estado documentado em CTRL-11: backup automático completo não está garantido no plano gratuito. Plano mínimo a ser decidido pelo responsável: 1. Exportar `site_settings` e `admins` (sem dado pessoal além do necessário) em periodicidade definida: TODO: frequência.
2. Guardar o export com acesso restrito e classificação .
3. Testar a restauração em banco local, em data definida: TODO: data.
4. Registrar o resultado no template de evidência de CTRL-11. Restauração não testada não conta como controle. ## Passo 7: relatório - Veredito: PRONTO, PRONTO COM RESSALVAS ou BLOQUEADO.
- Tabela de tabelas e políticas afetadas.
- Saída resumida de `database-check.mjs`.
- Passos humanos (aplicar em produção, executar backup) como lista, sem executar.
- Preencha `docs/pt-br/manual/templates/database.md` quando houver migração ou plano de backup a registrar. ## Não faça - Não aplique migração em produção.
- Não coloque senha, chave ou `service_role` em migração ou seed.
- Não crie política `for all` sem `to` explícito e sem revisar cada comando.
- Não edite migração já aplicada. Irmãos: `.claude/agents/database-specialist.md` · `docs/pt-br/manual/templates/database.md` · `scripts/database-check.mjs` · `skills/backend-procedure/SKILL.md` · `skills/devops-procedure/SKILL.md`.
