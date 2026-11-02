# ADR 0003 — Supabase como banco de dados do portal

- **Status:** aceita
- **Data:** 27/09/2026
- **Escopo:** conteúdo público do portal CCEAK
- **Relacionada:** [`portal-publico-cceak.md`](../sdd/portal-publico-cceak.md)
- **Complementa:** [`0002-vite-vercel.md`](0002-vite-vercel.md)

## Contexto

O portal precisa publicar estudos, palestras, gravações e eventos com data de
revisão, fonte e estado editorial. A interface será construída com Vite e entregue
pela Vercel. Foi definido que o banco de dados será Supabase.

Como a primeira versão é pública, o principal risco é expor rascunhos, dados vencidos
ou credenciais privilegiadas pelo cliente web.

## Decisão

Usar o PostgreSQL do Supabase como persistência do conteúdo e a Data API/client library
do Supabase para leitura pública. A primeira modelagem terá `studies`, `talks` e
`events`, com campos editoriais de publicação, fonte e revisão.

Todas as tabelas expostas terão Row Level Security habilitado. O papel anônimo terá
somente `SELECT` sobre registros publicados e dentro das regras de validade. Operações
de edição e publicação ficam fora da primeira área pública e exigirão um fluxo
editorial a ser definido posteriormente.

Migrações, seeds de teste e policies serão versionados. A chave pública do cliente
poderá ser configurada no frontend; `service_role`, tokens e secrets permanecerão
somente em ambientes protegidos.

## Consequências

### Positivas

- banco PostgreSQL adequado para consultas por data e calendário;
- RLS permite testar explicitamente o que visitantes anônimos podem ler;
- conteúdo deixa de depender de dados hardcoded no bundle do Vite;
- migrações e seeds tornam o ambiente de teste reproduzível.

### Custos e riscos

- será necessário definir autenticação e fluxo editorial antes de permitir escrita;
- Data API, grants e RLS precisam ser configurados juntos;
- mudanças de schema exigem migração e teste, não edição manual no projeto remoto;
- o portal dependerá de disponibilidade e configuração correta do Supabase.

## Alternativas consideradas

| Alternativa | Decisão |
|---|---|
| JSON estático no repositório | insuficiente para cronograma e calendário atualizáveis |
| Banco local/autogerenciado | não escolhido: adicionaria operação fora do escopo inicial |
| CMS externo | adiado até existir responsável editorial e fluxo de aprovação |

## Verificação obrigatória

Antes da primeira publicação:

1. aplicar migrações em um projeto de teste;
2. executar testes com `anon` para conteúdo publicado, rascunho, vencido e cancelado;
3. confirmar que o frontend não contém `service_role` nem secrets;
4. revisar grants e policies de toda tabela exposta;
5. executar advisors/verificações de segurança disponíveis na versão pinada do CLI;
6. testar o build Vite e o preview Vercel usando as variáveis públicas corretas.

Documentação consultada em 27/09/2026: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
e [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
