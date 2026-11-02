# Ficha de contrato de função ou endpoint · cceak

Marca: Intelie · cceak.
Classificação da informação (ISO/IEC 27001): Uso Interno.

Uma ficha por função exposta pelo PostgREST (`POST /rest/v1/rpc/<nome>`) ou por fluxo do GoTrue. Não inclua valor de chave, senha, token, nem dado de pessoa real em exemplos. Use `TODO:` quando faltar informação.

---

## 1. Identificação

- **Nome da função ou fluxo:** TODO:
- **Rota:** `POST /rest/v1/rpc/TODO:` ou TODO: (fluxo GoTrue)
- **Versões pinadas:** PostgREST `v12.2.12`, GoTrue `v2.186.0` (confirmar no compose antes de publicar)
- **Responsável técnico:** TODO:
- **Data:** TODO:
- **Migração que cria ou altera a função:** `supabase/migrations/NNNN_slug.sql` (TODO:)

## 2. Quem pode chamar

| Papel | Pode chamar | Motivo |
|---|---|---|
| `anon` (visitante) | sim / não | TODO: |
| `authenticated` (usuário logado) | sim / não | TODO: |
| Administrador (`public.is_admin()`) | sim / não | TODO: |

Identidade vem de `auth.uid()` ou `auth.jwt()`. Nenhum parâmetro decide acesso.

## 3. Entrada

| Parâmetro | Tipo | Obrigatório | Limite e formato | Validação no servidor |
|---|---|---|---|---|
| TODO: | TODO: | sim / não | TODO: | TODO: |

## 4. Saída

- **Tipo de retorno:** TODO:
- **Exemplo de corpo (dado fictício):** TODO:

## 5. Erros

| `code` (errcode) | Quando ocorre | Mensagem controlada | Status HTTP esperado | Ação do cliente |
|---|---|---|---|---|
| `22023` | argumento inválido | TODO: | 400 | TODO: |
| `P0001` | regra de negócio | TODO: | 400 | TODO: |
| `23505` | duplicidade | TODO: | 409 | TODO: |
| `42501` | sem permissão | TODO: | 403 | TODO: |

A mensagem não revela nome de tabela, coluna nem SQL.

## 6. Idempotência

- **Escrita repetível?** sim / não
- **Estratégia:** chave natural (`on conflict`) | identificador enviado pelo cliente (`unique`) | não se aplica
- **Chave ou campo usado:** TODO:
- **Comportamento na repetição:** TODO:

## 7. Segurança

- [ ] `security invoker` (padrão), ou `security definer` com justificativa: TODO:
- [ ] Se `security definer`: `set search_path = public` presente
- [ ] Sem `service_role` no cliente
- [ ] Sem dado pessoal em log ou mensagem de erro
- [ ] Revisado por `appsec-soc2` ou `devsecops-specialist`, se a função toca dado sensível: TODO:

## 8. Casos de teste (ambiente local)

| # | Caso | Entrada | Resultado esperado | Resultado obtido | Status |
|---|---|---|---|---|---|
| 1 | entrada válida | TODO: | sucesso | TODO: | pendente |
| 2 | entrada inválida (cada regra) | TODO: | erro `22023` | TODO: | pendente |
| 3 | chamada anônima, se não permitida | TODO: | erro `42501` | TODO: | pendente |
| 4 | repetição da mesma escrita | TODO: | sem duplicidade | TODO: | pendente |

Status permitidos: aprovado, reprovado, pendente (com motivo). Não marque "aprovado" sem a saída do teste.

## 9. Decisões em aberto

- TODO: (ex.: cadastro público, MFA, limite de taxa, retenção de dado)
