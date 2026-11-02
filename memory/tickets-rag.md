# Lições: tickets e RAG

- O sistema de tickets exige fixtures de elo vermelho/verde para o `selftest`; copiar só o CLI
  deixa o gate falsamente quebrado.
- O RAG trabalha com fontes autoradas em `docs/uso/` e metadados separados em
  `biblioteca/metadata/`; cada documento precisa de caminho relativo e tags para cobertura por
  camada.
- Playwright é o runner principal; Lightpanda é fallback condicionado à compatibilidade. O
  ingest RAG medido nesta máquina ficou em 71% de CPU e não exigiu paralelização adicional.
