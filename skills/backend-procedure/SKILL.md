---
name: backend-procedure
description: Procedimento de backend do cceak para criar ou revisar uma função RPC do PostgREST, validar entrada, definir códigos de erro e idempotência, e revisar o uso de autenticação do GoTrue no site. Use quando o usuário pedir um endpoint, uma função de regra de negócio no servidor, a forma de um erro da API, ou quando um cliente tratar erro de forma frágil.
argument-hint: "[nome-da-funcao | auth | erros]"
--- Procedimento executável para a camada de servidor (PostgREST e GoTrue do Supabase). Executado pelo agente `.claude/agents/backend-specialist.md`. Modelo de dados, RLS e migrações ficam em `skills/database-procedure/SKILL.md`. ## Quando usar - Criar uma função que o site chama por RPC.
- Adicionar uma regra que precisa valer mesmo se o cliente for alterado.
- Padronizar como um erro chega ao navegador.
- Revisar login, sessão e papel administrador. ## Passo 1: contrato antes do código Preencha `docs/pt-br/manual/templates/backend.md` com: - nome da função e rota `POST /rest/v1/rpc/<nome>`;
- parâmetros, tipo, obrigatoriedade e limites;
- retorno;
- erros com `code` estável;
- idempotência (chave natural ou identificador do cliente);
- papel que pode chamar (`anon`, `authenticated`, administrador). Sem contrato, não escreva a função. ## Passo 2: esqueleto da função Modelo de referência, sem segredo e sem dado real: ```sql
create or replace function public.<nome>(p_<param> <tipo>)
returns <tipo_retorno>
language plpgsql
security invoker
set search_path = public
as $$
begin -- 1. validação de entrada (código de erro estável) if p_<param> is null or length(p_<param>) > 200 then raise exception 'argumento inválido: <param>' using errcode = '22023'; end if; -- 2. identidade vinda do JWT, nunca do parâmetro -- if auth.uid() is null then raise exception 'não autenticado' using errcode = '42501'; end if; -- 3. regra de negócio e escrita idempotente -- insert into public.<tabela> (...) values (...) on conflict (<chave>) do nothing; return ...;
end;
$$;
``` `security definer` não é o padrão. Use apenas se a função precisar ler algo que o papel chamador não lê, e documente o motivo no contrato. Nesse caso, `set search_path = public` é obrigatório. ## Passo 3: erros | errcode | Quando | Status HTTP típico (PostgREST) |
|---|---|---|
| `22023` | argumento inválido | 400 |
| `P0001` | regra de negócio com mensagem controlada | 400 |
| `23505` | duplicidade | 409 |
| `42501` | sem permissão | 403 | Confirme o mapeamento na documentação do PostgREST da versão pinada (`v12.2.12`) antes de prometer um status. O cliente lê `code` do corpo da resposta, nunca a mensagem. ## Passo 4: idempotência - Escrita repetível (clique duplo, nova tentativa de rede) usa `on conflict` sobre uma chave natural.
- Se não existe chave natural, o cliente envia um identificador único por operação, e a função o grava com restrição `unique`.
- Registre no contrato qual dos dois foi escolhido. ## Passo 5: autenticação com GoTrue Configuração de referência no compose local: cadastro público desligado (`GOTRUE_DISABLE_SIGNUP`), JWT com expiração de 3600 segundos, e-mail confirmado automaticamente só no ambiente local. Checklist para a revisão: - [ ] Login envia credenciais por HTTPS, em produção, e nunca registra a senha em log.
- [ ] Sessão em `sessionStorage`, não em `localStorage`.
- [ ] Papel administrador vem de `public.is_admin()`, e a tela só esconde o que o banco já nega.
- [ ] Cadastro público desativado no painel do Supabase (ação humana, registrar a data).
- [ ] MFA (TOTP) para administradores: pendente, controle CTRL-06. Não marque como feito.
- [ ] Nenhum uso de `service_role` no cliente. ## Passo 6: cliente - Trate erro por `code`, mostre texto de interface próprio, nunca a mensagem bruta do banco.
- Conteúdo que volta do banco entra com `textContent`, nunca com `innerHTML` (CTRL-07).
- Repetição de operação de escrita só com identificador idempotente. ## Passo 7: verificação 1. Valide a migração com `node scripts/database-check.mjs`.
2. Confirme `node scripts/security-config-check.mjs` e `node scripts/check-site.mjs` verdes, se o site mudou.
3. Teste, no ambiente local do compose, pelo menos: entrada válida, cada entrada inválida, chamada anônima, chamada sem papel, repetição da escrita. Registre o resultado de cada caso.
4. Se o ambiente local não estiver de pé, marque os testes como pendentes. Não os declare aprovados. ## Passo 8: relatório - Contrato resumido, com os códigos de erro.
- Resultado de cada caso de teste.
- Decisões que dependem de humano (cadastro, MFA, papel).
- Riscos residuais e `TODO:`. ## Não faça - Não crie endpoint fora de `public` para dado de negócio.
- Não aceite `user_id` ou `role` como parâmetro para decidir acesso.
- Não exponha mensagem de exceção com nome de tabela, coluna ou SQL.
- Não edite migração já aplicada. Crie uma nova. Irmãos: `.claude/agents/backend-specialist.md` · `docs/pt-br/manual/templates/backend.md` · `skills/database-procedure/SKILL.md` · `skills/revisao-seguranca-soc2/SKILL.md`.
