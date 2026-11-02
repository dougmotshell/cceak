<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/ux-ui-procedure/SKILL.md --> Procedimento de avaliação de experiência e interface. O agente executor é `.claude/agents/ux-ui-specialist.md`. Esta skill não tem script: a evidência é de análise do código e das telas. Quando um achado precisar de teste, registre como pendente. ## Quando usar - Tela, fluxo ou formulário novo ou alterado.
- Dúvida sobre se a pessoa entende o próximo passo.
- Revisão de textos de erro, de sucesso, de carregamento ou de botão.
- Preparação de um teste com pessoas reais. ## Passo a passo ### 1. Definir a tarefa
Escreva em uma frase o que a pessoa quer fazer (ex.: "entrar na administração e editar o telefone de contato"). Liste os passos mínimos. ### 2. Mapear o fluxo no código
- Site público: `web/index.html` e `web/assets/js/app.js`.
- Administração: `web/admin/index.html` e `web/assets/js/admin.js`.
- Páginas de sistema: `web/404.html`, `web/offline.html`.
- Textos: `grep -rn "Erro\|erro\|falha\|Carregando\|Salvo\|Sucesso" web/` para achar todas as mensagens. ### 3. Percorrer cada passo
Para cada um, anote:
- O que a pessoa vê (texto, estado, ação disponível).
- O que pode fazer a seguir.
- O que acontece se der errado, e se a pessoa consegue se recuperar sem ajuda. ### 4. Checar estados
Cada tela ou ação com dado precisa de:
- **Vazio:** explica o motivo e oferece a próxima ação.
- **Carregando:** indica que algo está acontecendo, sem travar a tela inteira sem necessidade.
- **Erro de rede:** diz que a conexão falhou e como tentar de novo.
- **Erro de validação:** aponta o campo e a correção, junto ao campo.
- **Sucesso:** confirma o que foi feito.
- **Sessão expirada (admin):** explica e leva ao login sem perder o que foi digitado, quando possível.
- **Offline:** mostra o que funciona sem rede e o que não funciona. ### 5. Aplicar heurísticas
Use as dez heurísticas de Nielsen como lista de verificação: visibilidade do estado, correspondência com o mundo real, controle e liberdade, consistência, prevenção de erros, reconhecimento em vez de memorização, flexibilidade, design estético e minimalista, ajuda para recuperar de erros, ajuda e documentação. ### 6. Revisar microcopy em pt-BR
- Botão com verbo de ação: "Salvar alterações", não "OK".
- Erro com causa e correção: "Informe um e-mail válido, como nome@empresa.com.br", não "Erro de validação".
- Sem jargão de sistema ("payload", "token", "500", "RLS"). Sem nome de tabela.
- Frase curta; uma ideia por frase.
- Tratamento por "você".
- Sem culpar a pessoa ("Você digitou errado") e sem exclamação de alarme. Para cada texto a mudar, escreva a versão atual e a proposta lado a lado. ### 7. Priorizar
- **Bloqueia:** a pessoa não consegue concluir a tarefa.
- **Atrapalha:** conclui, mas com dúvida ou retrabalho.
- **Incomoda:** questão de texto ou consistência sem impacto na tarefa. ### 8. Validação
Não há script para esta avaliação. Quando a correção tocar acessibilidade ou desempenho, rode os controles técnicos:
```bash
node scripts/a11y-check.mjs
node scripts/frontend-check.mjs
```
Teste com pessoas reais: proponha um roteiro com uma tarefa, o critério de sucesso e quantas pessoas. Registre como pendente. ### 9. Registro
Preencha `docs/pt-br/manual/templates/ux-ui.md`. Não inclua dado pessoal de quem testou. ## Regras - Não defina cor, tipografia ou espaçamento: encaminhe ao `design-specialist`.
- Não colete dados de uso identificáveis para "medir" a tela.
- Não apresente a avaliação de análise como resultado de teste com usuários.
