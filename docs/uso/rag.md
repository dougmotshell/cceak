# RAG do CCEAK

O RAG é um índice local para pesquisar pesquisas, fontes públicas e documentação do projeto. Ele
não substitui a conferência na fonte original e declara lacunas por camada.

```bash
python3 scripts/rag.py ingest --forcar
python3 scripts/rag.py stats
python3 scripts/rag.py busca "Casa de Cultura Espírita Allan Kardec" --limite 10
python3 scripts/rag.py cruzar "palestras" --markdown
```

Metadados ficam em `biblioteca/metadata/`; as camadas em `rag/camadas.json`; sinônimos em
`rag/sinonimos.json`. Relatórios de pesquisa ficam em `docs/uso/pesquisas/`. A ingestão deve ser
reexecutada após mudanças de conteúdo ou metadados.
