---
description: Pesquisar uma instituição ou tema em múltiplas fontes públicas, comparar evidências e documentar um relatório reproduzível em pt-BR.
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/pesquisa-web/SKILL.md -->

Use esta skill quando a tarefa exigir investigação em várias páginas públicas e um
relatório auditável. O resultado deve distinguir fato publicado, inferência e lacuna.

## Procedimento

1. Delimite a entidade pelo nome, localidade e identificadores encontrados; trate links
   curtos ou compartilhados apenas como pistas até confirmar o destino.
2. Busque fontes independentes: fonte institucional, diretório/registro e entidade
   setorial ou governamental. Não misture homônimos.
3. Registre URL, título, data de consulta, resultado relevante e grau de confiança.
4. Escreva o relatório em `docs/pt-br/pesquisas/` usando `templates/pesquisa-web.md`.
5. Para coleta repetível, use `scripts/web-research.py` com no máximo 4 workers por
   padrão; a tarefa é limitada por rede e não deve saturar um núcleo.

## Verificação

Execute `python3 -m py_compile scripts/web-research.py` e confira que todo fato
material no relatório possui uma fonte clicável e uma data de consulta.
