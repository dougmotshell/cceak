# Ficha de desempenho e orçamento de frontend Use esta ficha em revisões de desempenho ou antes de uma publicação relevante. Campos `TODO:` aguardam dado de medição. --- ## Identificação - **Data (UTC):** AAAA-MM-DDTHH:MM
- **Responsável:** TODO:
- **Commit ou versão:** TODO:
- **Escopo (páginas e arquivos):** TODO: ## 1. Orçamento de bytes (sem compressão) Comando: `node scripts/frontend-check.mjs` | Tipo | Atual (bytes) | Limite proposto | Situação |
|---|---|---|---|
| JavaScript total | TODO: | 150 KB | [ ] OK [ ] Acima |
| CSS total | TODO: | 80 KB | [ ] OK [ ] Acima |
| HTML por página (maior página) | TODO: | 60 KB | [ ] OK [ ] Acima |
| Imagem (maior) | TODO: | 300 KB | [ ] OK [ ] Acima | Os limites são propostos. Alteração depende de decisão do responsável, registrada abaixo. Decisão sobre limites (se alterados): TODO: ## 2. Verificações estruturais | Verificação | Resultado |
|---|---|
| Scripts bloqueantes no `<head>` | [ ] Nenhum [ ] Encontrado (ver achados) |
| Imagens sem `width`/`height` | [ ] Nenhuma [ ] Encontrada |
| Imagens sem `loading="lazy"` (exceto a primeira) | [ ] Nenhuma [ ] Encontrada |
| Recurso de terceiro fora da CSP | [ ] Nenhum [ ] Encontrado |
| `eval`, `new Function`, `document.write`, XHR síncrono | [ ] Nenhum [ ] Encontrado |
| Pré-cache do service worker completo | [ ] Sim [ ] Não | ## 3. Medição em homologação Não preencha com valores de repositório. Sem medição, deixe `PENDENTE`. | Página | Dispositivo simulado | Rede | LCP | INP | CLS | Ferramenta e versão |
|---|---|---|---|---|---|---|
| `/` | TODO: | TODO: | PENDENTE | PENDENTE | PENDENTE | TODO: |
| `/admin/` | TODO: | TODO: | PENDENTE | PENDENTE | PENDENTE | TODO: | ## 4. Offline e cache - [ ] Página inicial abre sem rede após a primeira visita
- [ ] Navegação sem rede cai em `offline.html`
- [ ] Nova versão substitui o cache antigo (nome da versão alterado)
- [ ] Nada autenticado ou de banco fica em cache público ## 5. Achados | # | Severidade (crítica, alta, média, baixa) | Arquivo:linha | Impacto (LCP, INP, CLS, CSP, cache) | Correção sugerida | Responsável |
|---|---|---|---|---|---|
| 1 | | | | | TODO: | ## 6. Veredito - [ ] APROVADO
- [ ] APROVADO COM RESSALVAS
- [ ] BLOQUEADO
- [ ] PENDENTE (medição não feita)
