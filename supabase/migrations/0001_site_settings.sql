--
-- Modelo: uma linha por seção de configuração (chave text, valor jsonb).
-- - Leitura pública (anon): o site lê a configuração publicada.
-- - Escrita apenas para administradores cadastrados na tabela admins (RLS).
-- Aplique com: Supabase Dashboard > SQL Editor, ou `supabase db push`. -- ---------------------------------------------------------------------------
-- Administradores: quem pode alterar a configuração
-- ---------------------------------------------------------------------------
create table if not exists public.admins ( user_id uuid primary key references auth.users (id) on delete cascade, created_at timestamptz not null default now()
); -- Função que verifica se o usuário autenticado é administrador.
-- security definer evita recursão de RLS e não expõe a tabela admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$; revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated; -- ---------------------------------------------------------------------------
-- Configuração do site
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings ( key text primary key check (key ~ '^[a-z_]{2,40}$'), value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid references auth.users (id) on delete set null
); -- Carimba quem e quando alterou, sem depender do cliente.
create or replace function public.site_settings_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new;
end;
$$; drop trigger if exists site_settings_stamp on public.site_settings;
create trigger site_settings_stamp before insert or update on public.site_settings for each row execute function public.site_settings_stamp(); -- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.site_settings enable row level security; -- admins: cada administrador vê apenas a própria linha; escrita só pelo SQL (service role).
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select to authenticated using (user_id = auth.uid()); -- site_settings: leitura pública; escrita somente para administradores.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true); drop policy if exists site_settings_admin_insert on public.site_settings;
create policy site_settings_admin_insert on public.site_settings for insert to authenticated with check (public.is_admin()); drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin()); drop policy if exists site_settings_admin_delete on public.site_settings;
create policy site_settings_admin_delete on public.site_settings for delete to authenticated using (public.is_admin()); -- ---------------------------------------------------------------------------
-- Privilégios de tabela (camada além do RLS). Nada além do necessário.
-- - anon: só lê key e value (updated_by, o UUID do administrador, fica fora).
-- - authenticated: escreve em site_settings; lê admins apenas a própria linha pelo RLS.
-- ---------------------------------------------------------------------------
revoke all on public.site_settings from anon, authenticated;
grant select (key, value, updated_at) on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated; revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated; -- ---------------------------------------------------------------------------
-- Como cadastrar o primeiro administrador (executar manualmente, depois de
-- criar o usuário em Authentication > Users com e-mail e senha):
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'TODO-email-do-administrador';
-- ---------------------------------------------------------------------------
