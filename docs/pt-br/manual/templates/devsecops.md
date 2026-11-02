# Ficha de triagem de segurança do pipeline · cceak

Marca: Intelie · cceak.
Classificação da informação (ISO/IEC 27001): Uso Interno.

Uma ficha por alerta ou por revisão de workflow. Não registre valor de segredo, token ou chave: registre apenas caminho, linha e tipo. Use `TODO:` quando faltar informação.

---

## 1. Identificação

- **Data (UTC):** TODO:
- **Responsável pela triagem:** TODO:
- **Origem:** Semgrep | OSV-Scanner | gitleaks | Dependabot | revisão manual | `scripts/devsecops-check.mjs`
- **Identificador (regra, CVE, GHSA ou DSO-xx):** TODO:
- **Controle relacionado:** CTRL-TODO: (ver `docs/pt-br/architecture/controles-seguranca-soc2.md`)

## 2. Achado

- **Arquivo e linha:** TODO:
- **Descrição objetiva:** TODO:
- **Pacote, ação ou imagem afetada, com versão atual:** TODO:
- **Versão corrigida ou ação recomendada:** TODO:
- **Caminho vulnerável alcançado pelo código?** sim | não | não verificado (motivo: TODO:)
- **Exposição:** pública | interna | apenas CI

## 3. Classificação

| Critério | Resultado |
|---|---|
| Severidade | crítica · alta · média · baixa · falso positivo |
| Explorável na prática | sim · não · não verificado |
| Alcançável no código | sim · não · não verificado |
| Prazo sugerido | TODO: |

Justificativa (uma frase): TODO:

## 4. Decisão

- [ ] Corrigir agora (PR próprio, com o gate verde)
- [ ] Agendar: prazo TODO:
- [ ] Aceitar risco: responsável TODO:, validade TODO:, motivo TODO:
- [ ] Falso positivo: justificativa registrada na configuração da ferramenta (comentário com motivo e data)

## 5. Verificação após a correção

- [ ] `node scripts/devsecops-check.mjs` sem falhas
- [ ] Workflow `security` verde no commit de correção
- [ ] Alerta fechado na ferramenta de origem, com referência à correção

Saída literal do comando (resumida, sem segredos): TODO:

## 6. Se o achado for segredo

- [ ] Valor não reproduzido em nenhum arquivo, log ou resposta
- [ ] Rotação solicitada ao responsável: TODO:
- [ ] Avaliado como incidente (CTRL-10): sim | não, motivo TODO:
- [ ] Reescrita de histórico: não realizada | autorizada por TODO:

## 7. Registro de evidência (opcional)

Se o achado sustentar um controle SOC 2, copie `docs/pt-br/manual/template-evidencia-controle.md` para `docs/pt-br/architecture/evidencias/AAAA-MM-DD-CTRL-xx.md` e preencha. Nunca inclua segredo ou dado pessoal na evidência.
