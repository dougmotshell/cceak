# Template de evidência de controle Copie este arquivo para `docs/pt-br/architecture/evidencias/AAAA-MM-DD-CTRL-xx.md` e preencha. Uma evidência por controle e por data. --- ## Controle - **ID:** CTRL-xx
- **Nome:**
- **Critério SOC 2:** (ex.: CC6.1) ## Verificação - **Data (UTC):** AAAA-MM-DDTHH:MM
- **Responsável:**
- **Ambiente:** local | CI (link do run) | produção
- **Comando executado:** ```bash
# cole o comando exato
``` - **Saída resumida:** (cole apenas as linhas relevantes, sem segredos) ## Resultado - [ ] Aprovado
- [ ] Aprovado com ressalva: descreva
- [ ] Reprovado: descreva e abra issue ## Ressalvas e ações | Item | Responsável | Prazo |
|---|---|---|
| | | | ## Checklist de higiene - [ ] Nenhum segredo, chave `service_role`, token ou senha no arquivo.
- [ ] Nenhum dado pessoal ou nome de cliente.
- [ ] Links para runs de CI em vez de copiar logs longos.
