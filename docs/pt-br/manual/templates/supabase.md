# Checklist de implantação e verificação do Supabase

Classificação da informação (ISO/IEC 27001): Uso Interno. Marca: Intelie.

Copie este checklist para a mudança (ou para a evidência de implantação) e preencha. Não cole chaves, URLs reais de projeto, IDs de projeto nem e-mails. Use `TODO:` quando faltar dado.

## Identificação

- **Mudança:** TODO: número da migração e descrição
- **Ambiente:** local | hospedado (TODO: nome lógico, ex.: homologação)
- **Responsável pela aplicação:** TODO:
- **Data (UTC):** AAAA-MM-DDTHH:MM

## 1. Contrato site-banco

- [ ] `node scripts/supabase-check.mjs` executado sem falhas. Saída resumida: TODO:
- [ ] Toda tabela usada em `/rest/v1/<tabela>` (em `web/assets/js/`) existe em `supabase/migrations/`.
- [ ] Toda rota de `/auth/v1/` usada é uma das previstas (`token`, `logout`, `user`).
- [ ] `connect-src` de `web/vercel.json` permite `https://*.supabase.co` e `wss://*.supabase.co`.

## 2. Banco e RLS

- [ ] Toda tabela nova tem `enable row level security`.
- [ ] Uma política por comando (select, insert, update, delete), com `using` e `with check` quando há escrita.
- [ ] Nenhuma política de escrita para `anon`.
- [ ] Toda função `security definer` tem `set search_path = public` e `revoke ... from public`.
- [ ] Grants mínimos: `revoke all ... from anon, authenticated` seguido do necessário.
- [ ] Migração nova com número sequencial; migração antiga não foi editada.

## 3. Autenticação

- [ ] Cadastro público (sign-up) desativado no painel do Supabase. Confirmado por: TODO:
- [ ] Senha forte e confirmação de e-mail conforme política do responsável. Política: TODO:
- [ ] Sessão de administrador em `sessionStorage` (não em `localStorage`).
- [ ] Administradores cadastrados na tabela `admins` por processo manual: TODO: quem autoriza.

## 4. Chaves e configuração

- [ ] `web/assets/js/env.js` contém só a URL do projeto e a chave pública (anon ou publishable).
- [ ] Nenhuma chave `service_role` ou `sb_secret_` no repositório. Verificado por: `scripts/supabase-check.mjs` e `scripts/security-config-check.mjs`.
- [ ] Chaves rotacionadas se houve exposição. Data da última rotação: TODO:

## 5. Plano e limites (conferir na página oficial de preços)

Valores de referência do plano gratuito, a confirmar na data da verificação:

| Recurso | Limite de referência | Uso previsto | Situação |
|---|---|---|---|
| Projetos por organização | TODO: confirmar | TODO: | TODO: |
| Banco de dados | TODO: confirmar (MB) | TODO: | TODO: |
| Armazenamento de arquivos | TODO: confirmar (GB) | TODO: | TODO: |
| Usuários ativos mensais (Auth) | TODO: confirmar | TODO: | TODO: |
| Transferência de saída (egress) | TODO: confirmar (GB) | TODO: | TODO: |
| Invocações de Edge Functions | TODO: confirmar | TODO: | TODO: |
| Pausa por inatividade | TODO: confirmar (dias) | TODO: | TODO: |
| Backup e recuperação | TODO: confirmar o que o plano inclui | TODO: | TODO: |

Data da consulta à página de preços: TODO:

## 6. Resultado

- [ ] Aprovado
- [ ] Aprovado com ressalvas: TODO: descreva
- [ ] Bloqueado: TODO: motivo

Pendências (painel, plano pago, decisão do responsável): TODO:
