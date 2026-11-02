---
description: Executa busca cruzada no RAG por camadas institucionais, redes públicas, produto e projeto.
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/rag-cruzar/SKILL.md -->

# Busca cruzada

```bash
python3 scripts/rag.py camadas --obras
python3 scripts/rag.py cruzar "<tema>" --markdown --limite 4 --por-obra 1
```

Leia todas as camadas configuradas em `rag/camadas.json`. Uma camada vazia deve aparecer como
lacuna. Se o vocabulário da fonte for diferente, use `rag/sinonimos.json` ou variantes explícitas.
Não transforme uma lacuna em afirmação sobre a instituição.
