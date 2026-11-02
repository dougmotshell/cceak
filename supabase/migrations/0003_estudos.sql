-- cceak · Intelie — estudos da Casa (material, progresso e vínculo com a programação)
-- Classificação da informação (ISO/IEC 27001): Uso Interno
--
-- Regras:
--   - Leitura pública (anon): somente estudos com ativo = true.
--   - Escrita: equipe (admins, diretores e colaboradores), pela RLS.
--   - Cada estudo tem uma atividade correspondente em programacao, criada, atualizada e
--     removida automaticamente por trigger. A equipe não cadastra a programação do estudo à mão.
--   - progresso_pct é calculado pelo banco: pagina_atual / total_paginas.
-- Depende de 0001 (is_admin) e 0002 (is_equipe, programacao). Idempotente.

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------
create table if not exists public.estudos (
  id uuid primary key default gen_random_uuid(),
  livro text not null check (char_length(livro) between 1 and 200),
  total_paginas integer not null check (total_paginas between 1 and 100000),
  pagina_atual integer check (pagina_atual is null or pagina_atual between 0 and total_paginas),
  capitulo text check (capitulo is null or char_length(capitulo) between 1 and 120),
  subcapitulo text check (subcapitulo is null or char_length(subcapitulo) between 1 and 120),
  item text check (item is null or char_length(item) between 1 and 120),
  numero text check (numero is null or char_length(numero) between 1 and 40),
  referencia text check (referencia is null or char_length(referencia) between 1 and 200),
  data_estudo date not null,
  hora_inicio time not null,
  hora_fim time,
  progresso_pct numeric(5, 1) generated always as (
    case when pagina_atual is null then null
         else round(pagina_atual::numeric * 100 / total_paginas, 1)
    end
  ) stored,
  programacao_id uuid references public.programacao (id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint estudos_horas_validas check (hora_fim is null or hora_fim > hora_inicio),
  constraint estudos_localizacao_obrigatoria check (
    pagina_atual is not null or capitulo is not null or subcapitulo is not null
    or item is not null or numero is not null or referencia is not null
  )
);

create index if not exists estudos_data_idx on public.estudos (ativo, data_estudo, hora_inicio);

-- ---------------------------------------------------------------------------
-- Carimbo de autoria (mesmo padrão de programacao_stamp)
-- ---------------------------------------------------------------------------
create or replace function public.estudos_stamp()
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

drop trigger if exists estudos_stamp on public.estudos;
create trigger estudos_stamp
  before insert or update on public.estudos
  for each row execute function public.estudos_stamp();

-- ---------------------------------------------------------------------------
-- Vínculo com a programação: cria, atualiza e remove a atividade correspondente.
-- security definer: a equipe grava em estudos, e o banco mantém a programação coerente.
-- ---------------------------------------------------------------------------
create or replace function public.estudos_programacao_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia text := to_char(new.data_estudo, 'DD/MM/YYYY');
  v_atividade text := 'Estudo: ' || new.livro || coalesce(' · ' || new.referencia, '');
begin
  if tg_op = 'INSERT' or new.programacao_id is null then
    insert into public.programacao (dia_label, hora_inicio, hora_fim, atividade, quem_pode, ordem, ativo)
    values (v_dia, new.hora_inicio, new.hora_fim, v_atividade, 'Aberto ao público', 25, new.ativo)
    returning id into new.programacao_id;
  else
    update public.programacao
       set dia_label = v_dia,
           hora_inicio = new.hora_inicio,
           hora_fim = new.hora_fim,
           atividade = v_atividade,
           ativo = new.ativo
     where id = new.programacao_id;
  end if;
  return new;
end;
$$;

drop trigger if exists estudos_programacao_sync on public.estudos;
create trigger estudos_programacao_sync
  before insert or update on public.estudos
  for each row execute function public.estudos_programacao_sync();

create or replace function public.estudos_programacao_remove()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.programacao where id = old.programacao_id;
  return old;
end;
$$;

drop trigger if exists estudos_programacao_remove on public.estudos;
create trigger estudos_programacao_remove
  after delete on public.estudos
  for each row execute function public.estudos_programacao_remove();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.estudos enable row level security;

drop policy if exists estudos_public_read on public.estudos;
create policy estudos_public_read on public.estudos
  for select to anon, authenticated
  using (ativo or public.is_equipe());

drop policy if exists estudos_equipe_insert on public.estudos;
create policy estudos_equipe_insert on public.estudos
  for insert to authenticated
  with check (public.is_equipe());

drop policy if exists estudos_equipe_update on public.estudos;
create policy estudos_equipe_update on public.estudos
  for update to authenticated
  using (public.is_equipe())
  with check (public.is_equipe());

drop policy if exists estudos_equipe_delete on public.estudos;
create policy estudos_equipe_delete on public.estudos
  for delete to authenticated
  using (public.is_equipe());

-- ---------------------------------------------------------------------------
-- Privilégios de tabela. Autoria e progresso calculado não são graváveis pelo cliente.
-- ---------------------------------------------------------------------------
revoke all on public.estudos from anon, authenticated;
grant select (id, livro, total_paginas, pagina_atual, progresso_pct, capitulo, subcapitulo, item,
              numero, referencia, data_estudo, hora_inicio, hora_fim, ativo, updated_at)
  on public.estudos to anon, authenticated;
grant insert (livro, total_paginas, pagina_atual, capitulo, subcapitulo, item, numero, referencia,
              data_estudo, hora_inicio, hora_fim, ativo)
  on public.estudos to authenticated;
grant update (livro, total_paginas, pagina_atual, capitulo, subcapitulo, item, numero, referencia,
              data_estudo, hora_inicio, hora_fim, ativo)
  on public.estudos to authenticated;
grant delete on public.estudos to authenticated;

-- ---------------------------------------------------------------------------
-- Como cadastrar um estudo: pela tela /admin/estudos/ (equipe). Não há semente aqui;
-- os dados de exemplo ficam só no ambiente local (docker/local).
-- ---------------------------------------------------------------------------
