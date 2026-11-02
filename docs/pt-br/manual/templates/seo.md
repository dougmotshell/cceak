# Ficha de auditoria de SEO técnico Preencha uma ficha por auditoria. Os campos marcados como `TODO:` dependem de dado que o responsável ainda não informou. --- ## Identificação - **Data (UTC):** AAAA-MM-DDTHH:MM
- **Responsável pela auditoria:** TODO:
- **Responsável pelo conteúdo:** TODO:
- **Escopo:** (página, caminho ou `web/` inteiro)
- **Commit ou versão auditada:** TODO:
- **Domínio de produção:** TODO: (use o domínio confirmado pelo responsável) ## Verificação automática - **Comando:** `node scripts/seo-check.mjs` e `node scripts/check-site.mjs`
- **Resultado:** [ ] Aprovado [ ] Com falhas
- **Saída resumida:** ```text
(cole apenas as linhas de falha ou a linha OK)
``` ## Checklist por página | Página | `lang` | Título (15-65) | Description (50-160) | Canonical https | Open Graph completo | Robots correto | Achados |
|---|---|---|---|---|---|---|---|
| `/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/privacidade/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/termos/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/cookies/` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | |
| `/admin/` (noindex) | [ ] | [ ] | n/a | n/a | n/a | [ ] | |
| `404` e `offline` (noindex) | [ ] | [ ] | n/a | n/a | n/a | [ ] | | ## Arquivos de rastreamento - [ ] `web/robots.txt` existe, tem linha `Sitemap:` em https e não bloqueia o site inteiro
- [ ] `web/sitemap.xml` existe e lista todas as páginas indexáveis
- [ ] Nenhuma página de `sitemap.xml` é privada ## Achados | # | Severidade (crítica, alta, média, baixa) | Página | Item | Correção sugerida | Responsável | Prazo |
|---|---|---|---|---|---|---|
| 1 | | | | | TODO: | TODO: | ## Pendências fora do escopo - TODO: (conteúdo em `site_settings`, domínio, painel do Supabase, Search Console) ## Veredito - [ ] APROVADO
- [ ] APROVADO COM RESSALVAS
- [ ] PENDENTE **Observação:** esta ficha mede o que é verificável no repositório. Não há garantia de posição em buscadores.
