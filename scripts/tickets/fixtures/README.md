# Fixtures do gate de tickets

Tickets de mentira, com id fora da faixa de trabalho (`TCK-99xx`) e fora de `tickets/`,
para o gate do elo issue ↔ PR ↔ ticket ser exercitado contra um caso conhecido em vez de
contra o quadro real — que muda a cada ticket entregue.

| Pasta | O que reproduz | Esperado |
|---|---|---|
| `elo-vermelho/` | ticket de tipo com PR em `concluido`, com issue registrada e nenhum registro do PR nem do destino da issue (o estado que deixou as issues #3 a #6 abertas) | `validate --dir` sai **1** e nomeia `TCK-9901` |
| `elo-verde/` | o mesmo ticket com `pr:` no front matter e `## Entrega` levando à issue e ao PR | `validate --dir` sai **0** |

```sh
python3 scripts/tickets/ticket.py validate --dir scripts/tickets/fixtures/elo-vermelho  # 1
python3 scripts/tickets/ticket.py validate --dir scripts/tickets/fixtures/elo-verde     # 0
```

O veredito da linha da issue é um **token estruturado**, não uma palavra na prosa:
`` `fechada:#<PR>` `` ou `` `aberta:TCK-NNNN` ``. Antes disso, uma linha como "segue
aberta, será fechada depois" — sem sucessor e sem nada feito — passava pelo gate.

A regra em si é coberta por `ticket.py selftest` (bloco `LINK_TESTS`), que roda em
`make tickets` — as fixtures provam o gate de ponta a ponta, pela linha de comando.
