-- SOMENTE DESENVOLVIMENTO LOCAL. Nunca execute em produção.
-- Classificação da informação (ISO/IEC 27001): Uso Interno
--
-- Contas de teste da equipe e dados fictícios da programação, para testar a tela /admin/:
--   diretor@local.test       / dev-diretor-123      (cadastra, edita e remove a programação)
--   colaborador@local.test   / dev-colaborador-123  (cadastra, edita e remove a programação)
--   admin@local.test         / dev-admin-123        (criada em seed-dev.sql; configura o site também)
-- Atividades com prefixo "MOCK" são fictícias. Uma delas fica oculta, para testar a regra de exibição.
-- Roda depois da migração 0002 (ver docker/local/migrate.sh).

-- ---------------------------------------------------------------------------
-- Usuários de teste (mesmo formato do administrador de seed-dev.sql)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-00000000ad11', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diretor@local.test',
   extensions.crypt('dev-diretor-123', extensions.gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-00000000ad12', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'colaborador@local.test',
   extensions.crypt('dev-colaborador-123', extensions.gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- O GoTrue exige a identidade do provedor "email" para o login por senha.
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-00000000ad13', '00000000-0000-0000-0000-00000000ad11',
   '00000000-0000-0000-0000-00000000ad11',
   '{"sub":"00000000-0000-0000-0000-00000000ad11","email":"diretor@local.test","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000ad14', '00000000-0000-0000-0000-00000000ad12',
   '00000000-0000-0000-0000-00000000ad12',
   '{"sub":"00000000-0000-0000-0000-00000000ad12","email":"colaborador@local.test","email_verified":true}',
   'email', now(), now(), now())
on conflict (id) do nothing;

insert into public.equipe (user_id, papel)
values
  ('00000000-0000-0000-0000-00000000ad11', 'diretor'),
  ('00000000-0000-0000-0000-00000000ad12', 'colaborador')
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Dados fictícios da programação (além dos quatro horários reais da migração 0002)
-- ---------------------------------------------------------------------------
insert into public.programacao (id, dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem, ativo)
values
  ('00000000-0000-0000-0000-00000000ee01', 'Quarta-feira', time '20:00', time '21:00',
   'MOCK · Atividade fictícia de teste (dev)', 'Aberto ao público', 50, true),
  ('00000000-0000-0000-0000-00000000ee02', 'Quarta-feira', time '21:00', null,
   'MOCK · Atividade oculta no site, para testar a regra de exibição (dev)', 'Aberto ao público', 60, false)
on conflict (id) do nothing;
