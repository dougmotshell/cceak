---
name: rag-pesquisar
description: Consulta o acervo RAG do CCEAK e entrega um dossiê com fontes, lacunas e verificações explícitas.
---

# Pesquisa no RAG

Use o RAG como índice de apoio, nunca como autorização para inventar fatos. Antes de concluir:

```bash
python3 scripts/rag.py stats
python3 scripts/rag.py busca "<tema>" --limite 12
python3 scripts/rag.py cruzar "<tema>" --limite 3 --por-obra 1 --markdown
```

Registre consultas, trechos, fontes e lacunas. Distingua “não encontrado no acervo” de “não
existe”. Para informação atual, confirme na fonte pública original e registre a data de acesso em
`docs/uso/pesquisas/`.

## Entrega

- pergunta e escopo;
- consultas e filtros;
- evidências com link ou arquivo de origem;
- síntese separando fato, inferência e `[VERIFICAR]`;
- `[LACUNA DE ACERVO: nome]` para camadas sem cobertura;
- riscos de privacidade, copyright e desatualização.
