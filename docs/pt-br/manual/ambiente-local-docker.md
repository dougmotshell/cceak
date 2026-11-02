# Ambiente local com Docker Compose

Classificação da informação (ISO/IEC 27001): Uso Interno.

Sobe o cceak inteiro na sua máquina: site, administração, API, autenticação e banco. Tudo roda em contêineres, sem custo e sem conexão com o Supabase hospedado.

## O que sobe

| Serviço | Imagem | Papel |
|---|---|---|
| `db` | `supabase/postgres:15.19.0.017` | Postgres com os papéis e o schema do Supabase |
| `migrate` | mesma imagem | Roda uma vez: define senhas internas, aplica a migração 0001 e a semente de dev |
| `auth` | `supabase/gotrue:v2.186.0` | Login por e-mail e senha, cadastro público desligado |
| `postgrest` | `postgrest/postgrest:v12.2.12` | API REST sobre o schema `public`, com RLS |
| `web` | `nginx:1.27-alpine` | Serve o site e roteia `/rest/v1` e `/auth/v1` na mesma origem |

Os serviços `postgrest` e `auth` são o backend: o Supabase hospedado usa exatamente esses componentes por trás do gateway.

## Como usar

Pré-requisitos: Docker com Compose v2.

```bash
node scripts/gen-local-env.mjs      # gera .env (segredos) e docker/local/env.js (gitignored)
docker compose up -d --wait         # sobe tudo; a primeira vez baixa as imagens
```

Depois:

- Site: http://localhost:8000
- Administração: http://localhost:8000/admin/
- Login de teste: `admin@local.test` / `dev-admin-123`

Parar: `docker compose down`. Apagar também os dados: `docker compose down -v`.

Verificar o estado: `docker compose ps` e `docker compose logs -f migrate auth`.

## Segurança do ambiente local

- Todas as portas do host ficam em `127.0.0.1`. Nada fica acessível pela rede da sua casa ou escritório.
- `.env` e `docker/local/env.js` são gerados com segredos aleatórios e estão no `.gitignore`. Nunca os versione.
- Só a chave `anon` é gerada. Não existe chave `service_role` no disco.
- O usuário `admin@local.test` e a senha `dev-admin-123` existem **somente** no ambiente local, pela semente `docker/local/seed-dev.sql`. Não reutilize essa semente em produção.
- O cadastro público fica desligado (`GOTRUE_DISABLE_SIGNUP`).

## Diferença para produção

- **Gateway:** o nginx local não valida o cabeçalho `apikey`, como o Kong do Supabase faz. Localmente, uma requisição sem JWT válido usa o papel `anon`, cujas permissões são as mesmas do hospedado: leitura de `key` e `value` e nenhuma escrita. Teste de escrita anônima: deve retornar 401.
- **Cabeçalhos de segurança e CSP:** vêm do `web/vercel.json` no hospedado. O nginx local só define cabeçalhos básicos.
- **E-mail:** `GOTRUE_MAILER_AUTOCONFIRM=true`. Não há SMTP local.
- **MFA:** não configurado localmente. Antes de produção, ver a pendência CTRL-06 em `docs/pt-br/architecture/controles-seguranca-soc2.md`.

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---|---|---|
| `POSTGRES_PASSWORD ... rode scripts/gen-local-env.mjs` | `.env` não existe | Rode o gerador |
| `auth` reiniciando com `password authentication failed` | Papel interno ainda sem senha | Aguarde; o `migrate` define a senha e o `auth` se recupera sozinho |
| Login retorna `invalid_credentials` | Semente antiga, de antes da correção de `aud` e identidade | `docker compose down -v` e suba de novo |
| Site com configuração antiga | Cache do navegador ou do service worker | Recarregue forçado (Ctrl+Shift+R) |

Para recomeçar do zero: `docker compose down -v && node scripts/gen-local-env.mjs --force && docker compose up -d --wait`. O `--force` invalida sessões e dados de login locais.

## Arquivos

- `docker-compose.yml`: definição dos serviços.
- `docker/local/nginx.conf`: gateway e roteamento.
- `docker/local/migrate.sh`: ordem de preparação do banco.
- `docker/local/seed-dev.sql`: administrador de teste (só dev).
- `scripts/gen-local-env.mjs`: gera segredos e `env.js` local.

Versão em inglês: `docs/en-us/manual/local-docker-environment.md`.
