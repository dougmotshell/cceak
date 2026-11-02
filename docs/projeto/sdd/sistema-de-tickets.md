# SDD: sistema de tickets

## Objetivo

Dar rastreabilidade a bugs, funcionalidades, pesquisas, documentação, configuração externa e
manutenção do portal CCEAK, com estados explícitos e validação antes de conclusão.

## Contrato

O CLI em `scripts/tickets/ticket.py` cria tickets Markdown em `tickets/`, usando templates em
`tickets/templates/`. Cada ticket possui ID, tipo, estado, área, critérios de aceite, plano,
evidências e histórico. O conteúdo operacional é pt-BR; identificadores permanecem estáveis.

```bash
python3 scripts/tickets/ticket.py selftest
python3 scripts/tickets/ticket.py new --type feature --title "Nome" --area plataforma/frontend
python3 scripts/tickets/ticket.py list
python3 scripts/tickets/check-ticket-ref.py tickets/TCK-0001.md
```

## Estados e gates

`triagem → pronto → em-andamento → bloqueado → revisão → concluído`, com `cancelado` para itens
retirados. Um ticket só pode ser concluído com critérios de aceite marcados, evidência vinculada,
documentação atualizada e testes/gates executados ou justificados.

## Segurança

Não registrar segredos, PII, credenciais ou conteúdo protegido em massa. Pesquisa web deve manter
URL, data, método e limitações. Alterações que mudem comportamento público exigem atualização de
SDD/ADR quando aplicável.
