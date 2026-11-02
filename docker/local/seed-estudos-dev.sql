-- SOMENTE DESENVOLVIMENTO LOCAL. Nunca execute em produção.
--
-- Um estudo fictício de 500 páginas, na página 250 (barra de progresso em 50%).
-- O trigger da migração 0003 cria a atividade correspondente na programação.
-- Só insere se o estudo ainda não existe: o trigger não deve rodar duas vezes.
-- Roda depois da migração 0003 (ver docker/local/migrate.sh). insert into public.estudos (id, livro, total_paginas, pagina_atual, referencia, data_estudo, hora_inicio, hora_fim, ativo)
select '00000000-0000-0000-0000-00000000e501', 'MOCK · Livro fictício de 500 páginas', 500, 250, 'Parte I, capítulo 2', date '2026-11-28', time '19:00', time '20:00', true
where not exists (select 1 from public.estudos where id = '00000000-0000-0000-0000-00000000e501');
