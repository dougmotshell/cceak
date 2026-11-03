#!/bin/sh
# Prepara o banco do ambiente local, na ordem certa:
# 1. espera a imagem criar os papéis internos do Supabase;
# 2. define as senhas deles com POSTGRES_PASSWORD (GoTrue e PostgREST autenticam com elas);
# 3. espera o GoTrue criar as colunas de auth.users (ele reinicia até a senha estar pronta);
# 4. aplica as migrações 0001 a 0003 e as sementes de desenvolvimento (idempotentes).
# 4. applies migrations 0001 through 0003 and the development seeds (idempotently).
set -eu
export PGHOST=db PGPORT=5432 PGUSER=supabase_admin PGDATABASE=postgres
export PGPASSWORD="$POSTGRES_PASSWORD"
q() {
  psql -tAc "$1"
}

echo "1. aguardando papéis internos..."
until q "select 1 from pg_roles where rolname='supabase_auth_admin'" | grep -q 1 &&
  q "select 1 from pg_roles where rolname='authenticator'" | grep -q 1
do
  sleep 2
done

echo "2. definindo senhas dos papéis internos..."
psql -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD'" \
  -c "ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD'"

echo "3. aguardando o GoTrue criar auth.users..."
until q "select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email_confirmed_at'" | grep -q 1
do
  sleep 2
done

echo "4. aplicando migrações 0001 a 0003 e sementes de desenvolvimento..."
psql -v ON_ERROR_STOP=1 \
  -f /sql/0001_site_settings.sql \
  -f /sql/0002_programacao_equipe.sql \
  -f /sql/0003_estudos.sql \
  -f /sql/seed-dev.sql \
  -f /sql/seed-equipe-dev.sql \
  -f /sql/seed-estudos-dev.sql

echo "migração concluída"
