---
description: Procedimento de DevSecOps do cceak para revisar a segurança do pipeline (SAST, SCA, segredos, imagens, permissões de workflow e política de branch) e triar alertas do Semgrep, OSV-Scanner, gitleaks ou Dependabot. Use quando o usuário pedir para revisar workflows ou dependabot, triar um alerta de CVE ou de segredo, adicionar ação de terceiros ou imagem de container, ou definir quais checks bloqueiam o merge.
argument-hint: "[workflow | alerta | dependencia | branch]"
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/devsecops-procedure/SKILL.md --> Procedimento executável da segurança no ciclo de entrega. Executado pelo agente `.claude/agents/devsecops-specialist.md`. A revisão de aplicação (CSP, RLS, cliente) continua em `skills/revisao-seguranca-soc2/`. ## Quando usar - Alterar `.github/workflows/` ou `.github/dependabot.yml`.
- Chegou alerta de Semgrep, OSV-Scanner, gitleaks ou Dependabot.
- Adicionar ação de terceiros (`uses:`) ou imagem de container.
- Definir ou revisar a proteção da branch `main`. ## Passo 1: delimitar Pelo argumento:
- `workflow`: passos 2 e 3.
- `alerta`: passo 4.
- `dependencia`: passo 5.
- `branch`: passo 6.
- Sem argumento: pergunte qual alvo. ## Passo 2: verificação determinística ```bash
node scripts/devsecops-check.mjs
``` Regras: DSO-01 permissões no topo, DSO-02 sem `pull_request_target`, DSO-03 ações fixadas, DSO-04 imagens com tag, DSO-05 entrada não confiável só por `env:`, DSO-06 gitleaks, semgrep e osv-scanner presentes em `security.yml`, DSO-07 sem `continue-on-error` em gate de segurança, DSO-08 Dependabot cobre `github-actions`. Cada falha vira achado. Não classifique uma falha determinística como falso positivo sem provar com a linha de código. ## Passo 3: revisão manual do workflow - Gatilhos: `pull_request` é o padrão. `pull_request_target` com código do PR é bloqueante.
- Segredos: usados só em job que precisa. Nunca impressos em `run:` nem passados como argumento visível.
- Checkout com `fetch-depth: 0` só onde o histórico é necessário (ex.: gitleaks).
- Jobs de segurança com permissão de escrita (`security-events: write`) apenas quando publicam resultado. ## Passo 4: triagem de alerta 1. Identifique a ferramenta e a regra (ou o identificador GHSA/CVE).
2. Localize o arquivo e a linha. Leia o contexto antes de julgar.
3. Classifique: crítica, alta, média, baixa ou falso positivo.
4. Para segredo: não reproduza o valor. Registre caminho, linha e tipo. Acione rotação pelo responsável e considere o incidente (CTRL-10). Reescrita do histórico só com autorização.
5. Para falso positivo: justifique na própria configuração da ferramenta (comentário com motivo e data), não desligando o gate. ## Passo 5: dependência e CVE 1. Para cada CVE, anote: pacote, versão afetada, versão corrigida, se o código alcança o caminho vulnerável e se a exposição é pública.
2. Priorize o que é explorável e alcançável. Vulnerabilidade sem caminho alcançável vira pendência com prazo, não emergência.
3. Atualização de versão só com confirmação do responsável. Para ação de CI, prefira trocar a tag pela nova versão revisada, e registre o SHA quando o risco justificar. ## Passo 6: política de branch (proposta, não aplicada pelo agente) Proteção recomendada para `main`, a ser configurada pelo responsável no GitHub: - Pull request obrigatório, com ao menos uma revisão.
- Checks obrigatórios: `ci` e `security`.
- Sem push direto e sem force-push.
- Branches órfãs removidas após merge. O agente não altera configuração do GitHub. Registre o estado atual (TODO: se não verificado) e o que falta. ## Passo 7: relatório - Veredito: APROVADO, APROVADO COM RESSALVAS ou BLOQUEADO.
- Tabela de achados com severidade, arquivo:linha, regra e controle `CTRL-xx`.
- Saída resumida de `devsecops-check.mjs`.
- Pendências fora do escopo, sem aplicar.
- Se houver evidência a arquivar, use `docs/pt-br/manual/templates/devsecops.md` e siga o template de evidência de `docs/pt-br/manual/template-evidencia-controle.md`. ## Referências - Matriz de controles e status: `docs/pt-br/architecture/controles-seguranca-soc2.md`.
- Revisão de aplicação: `skills/revisao-seguranca-soc2/SKILL.md`.
- Agente de aplicação: `.claude/agents/appsec-soc2.md`. Irmãos: `.claude/agents/devsecops-specialist.md` · `docs/pt-br/manual/templates/devsecops.md` · `scripts/devsecops-check.mjs`. $ARGUMENTS
