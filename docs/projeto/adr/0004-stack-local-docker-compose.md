# ADR 0004 — Stack local reproduzível com Docker Compose

- **Status:** aceita
- **Data:** 27/09/2026
- **Escopo:** desenvolvimento e testes do portal CCEAK
- **Relacionada:** [`portal-publico-cceak.md`](../sdd/portal-publico-cceak.md)
- **Complementa:** [`0002-vite-vercel.md`](0002-vite-vercel.md) e [`0003-supabase-como-banco-de-dados.md`](0003-supabase-como-banco-de-dados.md)

## Contexto

O portal combina Vite, Supabase e Vercel. Para que o desenvolvimento e o TDD não
dependam de banco remoto, a aplicação precisa de uma stack local completa e
reproduzível, iniciada por Docker Compose e com dados descartáveis.

O Supabase recomenda o CLI para inicializar e controlar o stack local, que executa
os serviços em containers Docker. Copiar o compose interno do Supabase para o projeto
criaria uma segunda fonte de verdade e aumentaria o risco de incompatibilidade.

## Decisão

Usar Docker Compose como entrada de orquestração do projeto e o Supabase CLI como
provisionador da composição oficial de serviços Supabase. O projeto terá um serviço
`web` para o Vite e uma rotina documentada que inicia o Supabase local com
`npx supabase start`.

O comando de alto nível do projeto deverá iniciar os dois lados, manter portas
limitadas a `127.0.0.1`, aplicar migrações e seeds reproduzíveis e permitir rodar
testes de frontend, integração e RLS contra a instância local.

## Componentes locais

- container `web`: Node com dependências pinadas e servidor Vite;
- stack Supabase gerenciada pelo CLI: Postgres, API, Auth, Storage, Realtime,
  Studio, Mailpit e serviços auxiliares compatíveis com a versão pinada;
- migrações SQL, policies RLS e seed sob `supabase/`;
- testes executados no host ou em container dedicado, conforme a ferramenta escolhida.

## Consequências

### Positivas

- onboarding reproduzível para desenvolvimento e revisão;
- TDD de banco e RLS sem alterar dados remotos;
- mesmo modelo de migração pode ser promovido para o Supabase hospedado;
- volumes e credenciais locais permanecem descartáveis.

### Custos e riscos

- primeira inicialização baixa imagens e exige espaço/memória Docker;
- o CLI e as imagens Supabase precisam ser atualizados de forma coordenada;
- Compose não substitui hardening de produção;
- a stack local não deve ser exposta em rede pública.

## Verificação

1. `npx supabase init` cria uma configuração local versionada;
2. `npx supabase start` inicia a stack em runtime compatível com Docker;
3. `docker compose up web` inicia o Vite e alcança o Supabase local;
4. `npx supabase db reset` recria schema, grants, RLS e seed;
5. testes com `anon` rejeitam rascunhos e dados vencidos;
6. `docker compose down` e `npx supabase stop` encerram sem dados secretos no repositório.

Referências consultadas em 27/09/2026: [CLI Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started),
[fluxo de desenvolvimento local](https://supabase.com/docs/guides/local-development/cli-workflows)
e [stack Docker auto-hospedada](https://supabase.com/docs/guides/self-hosting/docker).
