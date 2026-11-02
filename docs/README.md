# Documentação — cceak

Índice. Todo documento deste projeto mora em uma das quatro árvores abaixo, dentro da
subárvore da sua língua. Nunca solto na raiz, nunca dois padrões no mesmo arquivo.

Toda pasta sob `docs/` é **lowercase**, inclusive a da língua: `docs/pt-br/`,
`docs/en-us/`. pt-BR é a fonte da verdade; o irmão en-US abre com um ponteiro para ele.

| Árvore | Padrão | Um arquivo por | Estado |
|---|---|---|---|
| [`architecture/`](pt-br/architecture/) | C4 | nível | TODO |
| [`specs/`](pt-br/specs/) | SDD | capacidade | TODO |
| [`decisions/`](pt-br/decisions/) | ADR (MADR) | decisão | TODO |
| [`manual/`](pt-br/manual/) | manual do usuário | tarefa de público | TODO ou "não se aplica: <razão>" |

## Deliberadamente ausente

TODO: o que não existe aqui e por quê — ausência declarada vale mais que árvore vazia.

## Regras

- Diagrama é texto: Mermaid (ou PlantUML) cercado no Markdown, para diferenciar e
  revisar. Imagem binária pode ilustrar, nunca ser a única fonte.
- Cada documento C4 fica no seu nível — sem detalhe de container no documento de
  contexto.
- ADR é append-only: uma decisão aceita é superada por outra
  (`Status: superseded by NNNN`), nunca reescrita; número nunca é reusado.
- Ligação nos dois sentidos: spec nomeia os ADRs que a restringem, ADR nomeia o nível
  C4 e as specs que move.
- Arquivos AUTORADOS: sem banner `managed-by:`, o gerador nunca toca aqui.
