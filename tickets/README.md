# Sistema de tickets — cceak

Todo pedido que deixe artefato ou mudança vira um ticket Markdown versionado. O
ticket guarda o estado do trabalho, critério de aceite, handoffs e histórico.

## Começar

```bash
python3 scripts/tickets/ticket.py new --type research --title "..." --areas pesquisa/web
python3 scripts/tickets/ticket.py board
python3 scripts/tickets/ticket.py show TCK-0001
python3 scripts/tickets/ticket.py move TCK-0001 em-andamento --by agente --note "..."
python3 scripts/tickets/ticket.py handoff TCK-0001 --from agente-a --to agente-b --note "..."
python3 scripts/tickets/ticket.py challenge TCK-0001 --by decision-challenger --verdict ok --note "..."
python3 scripts/tickets/ticket.py accept TCK-0001 --by acceptance-auditor --note "..."
python3 scripts/tickets/ticket.py validate --offline
```

## Tipos

| Tipo | Uso | Entrega |
|---|---|---|
| `feature` | capacidade de produto | issue + branch + PR |
| `bug` | defeito reproduzível | issue + branch + PR |
| `research` | pesquisa web, RAG ou spike documental | commit documentado |
| `docs` | documentação | commit documentado |
| `chore` | manutenção | commit documentado |
| `spike` | pergunta técnica com timebox | issue + branch + PR |
| `external-setup` | configuração fora do repositório | manual e checklist |

## Regras

- Um ticket tem critério de aceite escrito antes da implementação.
- Handoff exige nota de contexto e próximo passo.
- Tickets aceitos precisam de verificação independente.
- `concluido` exige `acceptance: aprovado`.
- O índice `INDEX.md` é gerado pela CLI; não edite manualmente.
- Tickets não armazenam segredos, PII, tokens ou dados privados.

## Verificação

```bash
python3 scripts/tickets/ticket.py selftest
python3 scripts/tickets/ticket.py validate --offline
```
