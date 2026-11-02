-- cceak · Intelie — programação da Casa e equipe com permissão de edição
-- Classificação da informação (ISO/IEC 27001): Uso Interno
--
-- Papéis (depois de aplicar a 0001):
--   - admins (0001): administração completa, inclusive a configuração do site.
--   - equipe, papel 'diretor' ou 'colaborador': cadastra, edita e remove a programação.
--   - Público (anon): lê somente as atividades com ativo = true.
-- Idempotente: pode ser aplicada mais de uma vez.
-- Aplique com: Supabase Dashboard > SQL Editor, ou `supabase db push`.

-- ---------------------------------------------------------------------------
-- Equipe: diretores e colaboradores (administradores continuam em admins)
-- ---------------------------------------------------------------------------
create table if not exists public.equipe (
  user_id uuid primary key references auth.users (id) on delete cascade,
  papel text not null check (papel in ('diretor', 'colaborador')),
  created_at timestamptz not null default now()
);

-- Verdadeiro para administradores e para diretores/colaboradores cadastrados.
create or replace function public.is_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from public.equipe e where e.user_id = auth.uid());
$$;

revoke all on function public.is_equipe() from public;
grant execute on function public.is_equipe() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Programação da Casa: uma linha por atividade
-- ---------------------------------------------------------------------------
create table if not exists public.programacao (
  id uuid primary key default gen_random_uuid(),
  dia_label text not null check (char_length(dia_label) between 1 and 80),
  hora_inicio time not null,
  hora_fim time,
  atividade text not null check (char_length(atividade) between 1 and 400),
  quem_pode text not null default 'Aberto ao público' check (char_length(quem_pode) between 1 and 120),
  ordem integer not null default 0 check (ordem between 0 and 999),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint programacao_horas_validas check (hora_fim is null or hora_fim > hora_inicio)
);

create index if not exists programacao_ordem_idx on public.programacao (ativo, ordem);

-- Carimba quem criou e quem alterou, sem depender do cliente.
create or replace function public.programacao_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists programacao_stamp on public.programacao;
create trigger programacao_stamp
  before insert or update on public.programacao
  for each row execute function public.programacao_stamp();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.equipe enable row level security;
alter table public.programacao enable row level security;

-- equipe: cada pessoa vê apenas a própria linha. Cadastro é feito pelo SQL (responsável técnico).
drop policy if exists equipe_self_read on public.equipe;
create policy equipe_self_read on public.equipe
  for select to authenticated
  using (user_id = auth.uid());

-- programacao: público lê só o que está ativo; equipe lê tudo e grava.
drop policy if exists programacao_public_read on public.programacao;
create policy programacao_public_read on public.programacao
  for select to anon, authenticated
  using (ativo or public.is_equipe());

drop policy if exists programacao_equipe_insert on public.programacao;
create policy programacao_equipe_insert on public.programacao
  for insert to authenticated
  with check (public.is_equipe());

drop policy if exists programacao_equipe_update on public.programacao;
create policy programacao_equipe_update on public.programacao
  for update to authenticated
  using (public.is_equipe())
  with check (public.is_equipe());

drop policy if exists programacao_equipe_delete on public.programacao;
create policy programacao_equipe_delete on public.programacao
  for delete to authenticated
  using (public.is_equipe());

-- ---------------------------------------------------------------------------
-- Privilégios de tabela (camada além do RLS). Nada além do necessário.
--  - anon: lê apenas colunas públicas. created_by e updated_by ficam de fora.
--  - authenticated: grava apenas colunas editáveis; quem pode, pelo RLS, é a equipe.
-- ---------------------------------------------------------------------------
revoke all on public.equipe from anon, authenticated;
grant select on public.equipe to authenticated;

revoke all on public.programacao from anon, authenticated;
grant select (id, dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem, ativo, updated_at)
  on public.programacao to anon, authenticated;
grant insert (dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem, ativo)
  on public.programacao to authenticated;
grant update (dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem, ativo)
  on public.programacao to authenticated;
grant delete on public.programacao to authenticated;

-- ---------------------------------------------------------------------------
-- Conteúdo inicial: programação atual da Casa (só se a tabela estiver vazia).
-- ---------------------------------------------------------------------------
insert into public.programacao (dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem)
select v.dia_label, v.hora_inicio, v.hora_fim, v.atividade, v.quem_pode, v.ordem
from (values
  ('Sexta-feira', time '19:00', time '20:00',
   'Estudo dos livros (Livro dos Espíritos e Livro dos Médiuns)', 'Aberto ao público', 10),
  ('Sábado', time '17:00', time '18:00',
   'Estudo do Livro "A Gênese - Milagres e predições segundo o Espiritismo"', 'Aberto ao público', 20),
  ('Sábado', time '18:00', time '19:00',
   'Palestra e/ou estudo em grupo. Após as atividades, temos o Passe.', 'Aberto ao público', 30),
  ('Último sábado de cada mês', time '19:00', time '19:30',
   'Palestra e/ou estudo em grupo (Dia da família). Após as atividades, temos o Passe e comemoramos os aniversariantes do mês.',
   'Aberto ao público', 40)
) as v (dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem)
where not exists (select 1 from public.programacao);

-- ---------------------------------------------------------------------------
-- Como cadastrar diretores e colaboradores (executar manualmente, depois de criar
-- o usuário em Authentication > Users):
--
--   insert into public.equipe (user_id, papel)
--   select id, 'colaborador' from auth.users where email = 'TODO-email-da-pessoa';
-- ---------------------------------------------------------------------------
