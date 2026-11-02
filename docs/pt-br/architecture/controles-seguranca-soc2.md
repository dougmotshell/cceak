# Controles de segurança e prontidão SOC 2 Este documento lista os controles do cceak, onde cada um é verificado e o que ainda falta. Ele prepara o sistema para uma auditoria SOC 2 Tipo I ou II. **A atestação SOC 2 é emitida por um auditor independente (CPA), não por este repositório.** Nenhum conjunto de controles garante que um sistema não será invadido. O objetivo é reduzir a superfície de ataque, detectar falhas cedo e manter prova verificável de cada controle. ## Matriz de controles | Controle | O que cobre | Verificação automática | Critério SOC 2 | Status |
|---|---|---|---|---|
| CTRL-01 · Cabeçalhos e CSP | CSP sem `unsafe-inline`/`unsafe-eval`, HSTS, `frame-ancestors 'none'`, `nosniff`, `/admin` com `noindex` | `scripts/security-config-check.mjs` (HDR-01..06), CI `config` | CC6.6, CC6.7 | Implementado |
| CTRL-02 · Isolamento de dados (RLS) | Toda tabela com RLS; nenhuma escrita para `anon`; `security definer` com `search_path` fixo | `security-config-check.mjs` (RLS-01/02), CI `config` | CC6.1, CC6.3 | Implementado |
| CTRL-03 · Segredos fora do repositório | Sem `service_role`, chave privada ou token versionado; histórico varrido | `security-config-check.mjs` (SEC-01..03), `gitleaks` no CI `secrets`, `detect-private-key` no pre-commit | CC6.1 | Implementado |
| CTRL-04 · Análise estática | OWASP Top 10, XSS e JavaScript | Semgrep no CI `sast` (`--error`) | CC7.1, CC8.1 | Implementado |
| CTRL-05 · Vulnerabilidades conhecidas (CVE) | Pacotes e ações de CI; varredura diária | OSV-Scanner no CI `cve` (agendado diariamente); Dependabot para ações | CC7.1 | Implementado |
| CTRL-06 · Autenticação forte do administrador | Login por senha com verificação de administrador no banco | RLS com `is_admin()`; sessão em `sessionStorage` | CC6.1, CC6.2 | Parcial: falta MFA (TOTP) |
| CTRL-07 · Conteúdo seguro no navegador | `innerHTML` só com literal; dado do banco por `textContent`; links por esquema | `security-config-check.mjs` (CTRL-07, JS-01) | CC6.8 | Implementado |
| CTRL-08 · Gestão de mudanças | Revisão, testes e CI obrigatórios antes de publicar | CI `config`/`sast`/`cve`, revisão via PR | CC8.1 | Parcial: proteção de branch pendente |
| CTRL-09 · Monitoramento e registro | Logs de acesso e de falha de login | Não implementado | CC7.2 | **Pendente** |
| CTRL-10 · Resposta a incidentes | Plano escrito, contatos e prazos | Não implementado | CC7.3, CC7.4 | **Pendente** |
| CTRL-11 · Backup e recuperação | Backup do banco e teste de restauração | Plano do Supabase (free tier não inclui backup automático completo) | A1.2, A1.3 | **Pendente** |
| CTRL-12 · Fornecedores | Revisão de Vercel, Supabase e demais provedores | Não implementado | CC9.2 | **Pendente** | ## Pendências priorizadas 1. **CTRL-06**: ativar MFA (TOTP) para todas as contas administradoras no Supabase Auth, e desabilitar cadastro público.
2. **CTRL-08**: ativar proteção da branch `main` (PR obrigatório, checks `security` e `ci` obrigatórios, sem push direto).
3. **CTRL-09**: registrar tentativas de login falhas e alterações em `site_settings` (a trigger já grava `updated_by` e `updated_at`).
4. **CTRL-10**: escrever o plano de resposta a incidentes em `docs/pt-br/manual/` com responsável e contato.
5. **CTRL-11**: decidir o plano de backup; no free tier, exportar `site_settings` periodicamente é o mínimo.
6. **CTRL-12**: registrar a revisão de cada fornecedor (localização de dados, certificações, cláusulas). ## Como provar um controle Cada controle verificado gera uma evidência em `docs/pt-br/architecture/evidencias/`, usando o template `docs/pt-br/manual/template-evidencia-controle.md`. A evidência traz data, comando, saída resumida, resultado e responsável. Não inclua segredo nem dado pessoal. ## Testes de invasão Testes ofensivos só em ambiente de homologação e com autorização por escrito do responsável. Nenhum teste deste repositório toca sistema de terceiros. ## Referências internas - Agente: `.claude/agents/appsec-soc2.md`
- Procedimento: `skills/revisao-seguranca-soc2/SKILL.md`
- Workflow: `.github/workflows/security.yml`
- Verificador: `scripts/security-config-check.mjs`
- Versão em inglês: `docs/en-us/architecture/security-controls-soc2.md`
