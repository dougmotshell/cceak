# Documentação — cceak

Índice no padrão do projeto de referência: `docs/uso/` responde “como usar” e
`docs/projeto/` responde “como o sistema é construído”. Toda a prosa é pt-BR;
identificadores técnicos podem permanecer em en-US.

| Árvore | Conteúdo | Estado |
|---|---|---|
| [`uso/`](uso/) | manuais, operação, pesquisas e fontes públicas | em evolução |
| [`projeto/c4/`](projeto/c4/) | arquitetura C4 | em evolução |
| [`projeto/sdd/`](projeto/sdd/) | especificações orientadas a comportamento | [portal público CCEAK](projeto/sdd/portal-publico-cceak.md) |
| [`projeto/adr/`](projeto/adr/) | decisões arquiteturais | ADR-0001 a ADR-0004 |

## Pesquisa e RAG

As pesquisas públicas ficam em [`uso/pesquisas/`](uso/pesquisas/). O índice RAG usa
metadados em `biblioteca/metadata/`, configurações em `rag/` e o comando
`python3 scripts/rag.py`.

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
- Arquivos autorados: sem banner `managed-by:`, o gerador nunca toca aqui.
