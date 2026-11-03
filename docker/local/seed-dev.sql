-- SOMENTE DESENVOLVIMENTO LOCAL. Nunca execute em produção.
--
-- Cria um administrador de teste para a tela /admin no ambiente local:
-- e-mail: admin@local.test
-- senha: dev-admin-123
-- Roda depois da migração 0001 (ordem dos arquivos em docker/local/initdb).
-- Runs after migration 0001 (see the file order in docker/local/initdb).
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-00000000ad01',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@local.test',
  extensions.crypt('dev-admin-123', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into public.admins (user_id)
values ('00000000-0000-0000-0000-00000000ad01')
on conflict (user_id) do nothing;

-- O GoTrue exige a identidade do provedor "email" para o login por senha.
-- GoTrue requires the "email" provider identity for password sign-in.
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-00000000ad02',
  '00000000-0000-0000-0000-00000000ad01',
  '00000000-0000-0000-0000-00000000ad01',
  '{"sub":"00000000-0000-0000-0000-00000000ad01","email":"admin@local.test","email_verified":true}',
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;
