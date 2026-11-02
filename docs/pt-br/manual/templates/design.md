# Ficha de decisão de design visual Use esta ficha quando uma mudança alterar paleta, tokens, tema, tipografia ou componente compartilhado. Campos `TODO:` aguardam decisão ou dado do responsável. --- ## Identificação - **Data (UTC):** AAAA-MM-DDTHH:MM
- **Responsável pela decisão:** TODO:
- **Escopo (tokens, telas, componentes):** TODO:
- **Motivo da mudança:** TODO:
- **Commit ou versão:** TODO: ## 1. Tokens | Token | Tema claro | Tema escuro | Uso | Par principal | Contraste (mínimo) | Resultado |
|---|---|---|---|---|---|---|
| `--text` | TODO: | TODO: | Texto principal | sobre `--bg` | 4.5:1 | [ ] OK [ ] Falha |
| `--muted` | TODO: | TODO: | Texto secundário | sobre `--surface` | 4.5:1 | [ ] OK [ ] Falha |
| `--primary` | TODO: | TODO: | Ação e link | sobre `--bg` | 4.5:1 | [ ] OK [ ] Falha |
| `--primary-text` | TODO: | TODO: | Texto do botão | sobre `--primary` | 4.5:1 | [ ] OK [ ] Falha |
| `--focus` | TODO: | TODO: | Contorno de foco | sobre `--bg` | 3:1 | [ ] OK [ ] Falha | Valores em hexadecimal. Valores `rgb()` ou `color-mix()` não são avaliados pelo script e precisam de conversão ou de verificação manual registrada. ## 2. Verificação automática - **Comando:** `node scripts/design-check.mjs`
- **Resultado:** [ ] OK [ ] Falhou
- **Saída resumida:** ```text
TODO: cole apenas as linhas de falha, notas ou a linha OK
``` ## 3. Consistência - [ ] Tema escuro redefine todos os tokens do tema claro
- [ ] Os dois blocos de tema escuro têm os mesmos valores
- [ ] Nenhuma cor literal fora dos tokens (ou exceções listadas abaixo)
- [ ] Tipografia usa a pilha do sistema (sem fonte externa)
- [ ] Espaçamento em múltiplos de 0,25rem
- [ ] Botão, campo, aviso e foco iguais em `web/index.html`, `web/admin/` e páginas de sistema Exceções, com justificativa: TODO: ## 4. Marca e classificação - [ ] Nenhuma alteração em logotipo ou ícone sem autorização da organização
- [ ] Imagens e ícones novos têm origem e licença registradas: TODO: ## 5. Decisão - **Alternativas consideradas:** TODO:
- **Decisão tomada:** TODO:
- **Riscos residuais:** TODO:
- **ADR relacionada (se houver):** `docs/pt-br/architecture/decisions/` TODO: ## 6. Aprovação - [ ] APROVADO
- [ ] APROVADO COM RESSALVAS
- [ ] BLOQUEADO (contraste ou paridade falhando)
- [ ] PENDENTE (pré-visualização em homologação não feita)
