# Manual de produção — Supabase e Vercel (cceak) cceak — Casa de Cultura Espírita Allan Kardec (): ****. Passo a passo para publicar o cceak em produção: criar o projeto Supabase, aplicar as migrações, cadastrar os administradores, configurar a Vercel e o domínio, e verificar que o ambiente publicado está seguro. Para quem é: quem faz a primeira implantação ou manda uma mudança para produção. Versão em inglês: `docs/en-us/manual/production-supabase-vercel.md`. ## Antes de começar Você precisa de: - Acesso de administração ao projeto Supabase de produção (conta da ).
- Acesso de administração à equipe ou à conta Vercel que vai hospedar o site.
- Acesso ao repositório Git onde o cceak está versionado, com permissão de `push` na branch `main`.
- Acesso ao provedor de DNS do domínio público.
- Um gerenciador de senhas corporativo. **Senhas e chaves não vão para este manual, para o repositório nem para o chat.** Não existe `service_role` neste projeto. A chave que o site usa é a `anon` (pública por desenho). A proteção dos dados fica no RLS do banco, não em segredo de frontend. ## Visão geral ```mermaid
flowchart LR V[Visitante] -->|HTTPS| VC[Vercel<br/>site estático · pasta web/] A[Administrador / equipe] -->|HTTPS /admin/| VC VC -->|"chave anon + JWT do usuário"| API[Supabase<br/>PostgREST + Auth] API --> DB[(PostgreSQL<br/>RLS ativa)]
``` - O site é **estático**: HTML, CSS e JavaScript puros em `web/`. Não há etapa de build.
- Toda leitura e escrita de dados passa pela API do Supabase, sob RLS.
- A administração (`/admin/`) é `noindex` e não é indexada pelos buscadores. --- ## Parte 1 — Supabase de produção ### 1.1 Criar o projeto 1. No painel do Supabase, clique em **New project** dentro da organização da .
2. Nome do projeto: `cceak-prod` (ou o nome padronizado pela equipe).
3. Escolha a região mais próxima do público. Confirme a disponibilidade no próprio formulário.
4. Defina a senha do banco e **guarde-a no gerenciador de senhas**. Ela não é recuperável pela interface, então não a perca.
5. Aguarde o provisionamento terminar antes de seguir. Resultado esperado: o projeto aparece como *Active* no painel. ### 1.2 Aplicar as migrações, em ordem As migrações estão em `supabase/migrations/`. Aplique **exatamente** nesta ordem, uma por vez, no **SQL Editor** do projeto de produção: 1. `0001_site_settings.sql` — tabelas `admins` e `site_settings`, função `is_admin()`, RLS e privilégios.
2. `0002_programacao_equipe.sql` — tabelas `equipe` e `programacao`, com a programação real inicial.
3. `0003_estudos.sql` — tabela `estudos` e sincronização com a programação. Para cada arquivo: abra-o no repositório, copie o conteúdo inteiro, cole no SQL Editor e clique em **Run**. Confira se não há erro vermelho antes de passar para o próximo. As migrações são idempotentes (`create ... if not exists`, `drop policy if exists`), então reexecutar não quebra o banco. Ainda assim, **não reexecute** sem motivo. > **Não execute em produção** os arquivos de `docker/local/`: `seed-dev.sql`, `seed-equipe-dev.sql` e `seed-estudos-dev.sql`. Eles criam contas de teste com senhas conhecidas e dados fictícios. Eles existem só para o ambiente local (ver `docs/pt-br/manual/ambiente-local-docker.md`). ### 1.3 Conferir RLS e privilégios Rode no SQL Editor. Todas as tabelas precisam aparecer com `rls_ativa = true`: ```sql
select c.relname as tabela, c.relrowsecurity as rls_ativa
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('admins', 'site_settings', 'equipe', 'programacao', 'estudos')
order by c.relname;
``` Resultado esperado: cinco linhas, todas com `rls_ativa = true`. Se alguma vier `false`, pare e corrija antes de publicar. Confira também que o papel `anon` não consegue escrever. Depois de publicar o site (Parte 3), faça o teste a partir de fora, com a chave pública, substituindo os marcadores: ```bash
curl -s -o /dev/null -w "%{http_code}\n" \ -X POST "https://<projeto>.supabase.co/rest/v1/site_settings" \ -H "apikey: <chave-anon>" \ -H "Content-Type: application/json" \ -d '{"key":"teste","value":{}}'
``` Resultado esperado: `401` ou `403`. Qualquer `201` ou `204` é incidente: remova a linha de teste e revise as políticas antes de seguir. ### 1.4 Configurar a autenticação Em **Authentication**: 1. **Providers > Email** - Mantenha o provedor de e-mail e senha **ligado**. - **Desligue** a opção de permitir novos cadastros (*Allow new users to sign up*). O cadastro público deve ficar fechado. Só o administrador cria contas. - Mantenha a confirmação de e-mail ligada.
2. **URL Configuration** - *Site URL*: `https://<dominio-publico>` (o domínio final, da Parte 3). - *Redirect URLs*: inclua apenas `https://<dominio-publico>/admin/` e as URLs de login que a equipe realmente usa. Não deixe curingas amplos.
3. **E-mail (SMTP)**: o envio padrão do Supabase tem limite de volume e não é para uso intenso. Se a equipe for usar recuperação de senha e convites com frequência, configure um SMTP próprio da . Registre a decisão (ver "Pendências"). ### 1.5 Cadastrar o primeiro administrador 1. Em **Authentication > Users**, clique em **Add user > Create new user**.
2. Informe o e-mail do administrador e uma senha forte gerada pelo gerenciador de senhas.
3. Marque a opção de confirmar o e-mail automaticamente, ou confirme-o pelo link enviado.
4. Ainda no SQL Editor, vincule o usuário à tabela de administradores: ```sql
insert into public.admins (user_id)
select id from auth.users where email = '<email-do-administrador>'
on conflict (user_id) do nothing;
``` Resultado esperado: uma linha inserida. Repetir o comando não duplica nada. ### 1.6 Cadastrar diretores e colaboradores (opcional) O papel aceita só `diretor` ou `colaborador` (restrição no banco). Diretores e colaboradores editam a programação; eles **não** alteram a configuração do site. Primeiro crie o usuário em **Authentication > Users**, como no item 1.5. Depois: ```sql
insert into public.equipe (user_id, papel)
select id, '<diretor-ou-colaborador>' from auth.users
where email = '<email-da-pessoa>'
on conflict (user_id) do nothing;
``` ### 1.7 Obter a URL e a chave pública Em **Project Settings > API**, copie: - **Project URL** (formato `https://<projeto>.supabase.co`), para o campo `supabaseUrl`.
- **Chave `anon`** (pública), para o campo `supabaseAnonKey`. **Nunca copie a chave `service_role`** para o site, para o repositório, para o chat ou para a Vercel como variável pública. Se ela vazar, revogue-a imediatamente no mesmo painel e avise o responsável pela segurança. > Se o painel mostrar chaves novas (*publishable*/*secret*) além das antigas (*anon*/*service_role*), o site atual depende da chave `anon` no formato JWT. Não troque o formato sem validar com o time, porque a troca quebra o login e as leituras. ### 1.8 Plano, backup e pausa do projeto - Confirme o plano do projeto em **Project Settings > Billing**. No plano gratuito, o projeto pode ser **pausado** após período sem uso, e os backups automáticos podem ser limitados. Verifique o que o plano escolhido garante.
- Antes de cada migração nova, exporte um backup (ou registre o ponto de restauração disponível) e anote a data.
- Registre o plano e o responsável em `docs/pt-br/architecture/controles-seguranca-soc2.md` (CTRL-12, fornecedores). --- ## Parte 2 — Configurar o site para produção O site lê a conexão com o Supabase de um único arquivo: `web/assets/js/env.js`. No repositório, ele vem **vazio**. Sem valores, a administração fica desativada e o site usa os padrões de `config-schema.js`. ### 2.1 Como o `env.js` chega ao ar Hoje o site não tem etapa de build. Por isso, **as variáveis de ambiente da Vercel não chegam ao navegador**: o painel da Vercel guarda valores, mas um site estático não os lê. Para a implantação atual, o caminho é: 1. Edite `web/assets/js/env.js` no branch que vai para produção e preencha: ```js
window.CCEAK_ENV = { supabaseUrl: "https://<projeto>.supabase.co", supabaseAnonKey: "<chave-anon>"
};
``` 2. Confirme que o arquivo não tem `service_role` nem nenhum outro segredo.
3. Faça o commit e o `push` para `main`. A chave `anon` é pública por desenho. O que protege os dados são as políticas RLS da Parte 1. O próprio cabeçalho de `env.js` diz isso. > **Atenção à regra de documentação:** o `AGENTS.md` proíbe hostname real em documento. Por isso, este manual usa marcadores. O valor real fica só no `env.js` do branch de produção, nunca em manuais, issues ou chats. ### 2.2 Ajustar a CSP se o endereço do Supabase mudar O `web/vercel.json` libera conexões para `https://*.supabase.co` e `wss://*.supabase.co`. Se o projeto usar um **domínio personalizado** para a API do Supabase (por exemplo, `api.<dominio>`), a CSP bloqueia as chamadas em silêncio. Nesse caso, acrescente o novo host em `connect-src` no `web/vercel.json` e refaça o teste da Parte 4. ### 2.3 Verificações locais antes de subir Na raiz do repositório: ```bash
node scripts/security-config-check.mjs # cabeçalhos, RLS, segredos e innerHTML
node scripts/check-site.mjs # links, assets, manifesto e service worker
``` As duas são as mesmas verificações que o workflow `security` roda na CI. Se alguma falhar, corrija antes de fazer o `push`. --- ## Parte 3 — Vercel ### 3.1 Importar o repositório 1. No painel da Vercel, clique em **Add New > Project** e escolha o repositório do cceak.
2. Na tela de configuração, use estes valores: | Campo | Valor | Por quê |
|---|---|---|
| **Root Directory** | `web` | O `vercel.json` e o site estático estão em `web/`. |
| **Framework Preset** | *Other* | Site estático, sem framework. |
| **Build Command** | vazio | Não há etapa de build. |
| **Output Directory** | vazio | O conteúdo de `web/` é publicado como está. |
| **Production Branch** | `main` | Só o que está em `main` vai para produção. | 3. Clique em **Deploy**. ### 3.2 Variáveis de ambiente na Vercel Hoje o cceak **não precisa** de variáveis de ambiente na Vercel: a conexão fica no `env.js` (Parte 2). Não cadastre `service_role` ali. Se a equipe decidir gerar o `env.js` a partir das variáveis da Vercel, isso exige uma etapa de build nova. Essa mudança deve ser feita e revisada pelo time antes de ser adotada (ver "Pendências"). Quando ela existir, cadastre as variáveis em **Settings > Environment Variables**, marcando apenas o ambiente **Production** para os valores de produção. ### 3.3 Preview deployments: cuidado com o banco Toda branch ou pull request gera um **preview** na Vercel. O preview usa o mesmo `env.js` do branch. **Se esse branch apontar para o Supabase de produção, a administração do preview escreve no banco real.** Antes de liberar a administração em previews, escolha uma destas opções e registre a decisão: - **a)** Desligar previews para branches que não sejam `main` (em **Settings > Git**).
- **b)** Usar um projeto Supabase de homologação para os previews.
- **c)** Manter os previews, mas não colocar `env.js` com valores de produção fora de `main`. Enquanto a decisão não estiver registrada, não faça login na administração de um preview com credenciais de produção. ### 3.4 Domínio público 1. Em **Settings > Domains**, adicione o domínio público (`<dominio-publico>`).
2. A Vercel mostra o registro DNS exigido (geralmente um `A` ou `CNAME`). Crie-o no provedor de DNS.
3. Aguarde a verificação. O HTTPS (certificado) é emitido automaticamente.
4. Atualize o `Site URL` no Supabase (item 1.4) para o domínio final.
5. Defina o domínio canônico (com ou sem `www`) e configure o redirecionamento do outro, para não haver conteúdo duplicado. ### 3.5 Confirmar os cabeçalhos de segurança Depois do primeiro deploy, confira que o domínio publicado envia o que o `web/vercel.json` declara: ```bash
curl -sI https://<dominio-publico>/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin-opener"
curl -sI https://<dominio-publico>/admin/ | grep -iE "x-robots-tag|cache-control"
``` Resultado esperado: os cabeçalhos da Content-Security-Policy, HSTS, `X-Frame-Options: DENY` e demais aparecem na resposta. A rota `/admin/` mostra `X-Robots-Tag: noindex, nofollow` e `Cache-Control: no-store`. ### 3.6 Proteção de deploy Em **Settings > Deployment Protection**, mantenha a proteção ativa nos previews. O acesso ao ambiente de preview deve ser restrito à equipe. Não deixe previews públicos com dados ou administração. --- ## Parte 4 — Checklist de publicação Use esta lista na primeira publicação e em toda mudança que toque banco, autenticação ou `vercel.json`: - [ ] Migrações 0001, 0002 e 0003 aplicadas em produção, sem erro.
- [ ] Consulta da seção 1.3: todas as tabelas com `rls_ativa = true`.
- [ ] Teste de escrita anônima retorna `401` ou `403` (seção 1.3).
- [ ] Cadastro público desligado; confirmação de e-mail ligada (seção 1.4).
- [ ] *Site URL* e *Redirect URLs* apontam para o domínio final (seção 1.4).
- [ ] Pelo menos um administrador cadastrado em `public.admins` (seção 1.5).
- [ ] `env.js` do branch `main` com `supabaseUrl` e `supabaseAnonKey`, sem `service_role` (seção 2.1).
- [ ] `security-config-check.mjs` e `check-site.mjs` passam (seção 2.3).
- [ ] Deploy de produção concluído na Vercel, a partir de `main` (seção 3.1).
- [ ] Domínio com HTTPS válido e domínio canônico definido (seção 3.4).
- [ ] Cabeçalhos conferidos com `curl` (seção 3.5).
- [ ] Site público abre, mostra a programação e a configuração publicada.
- [ ] Login do administrador em `/admin/` funciona e a edição de uma configuração é salva (e desfeita).
- [ ] Previews: decisão da seção 3.3 registrada. ## Parte 5 — Mudanças e rollback ### Publicar uma mudança de site 1. Abra um branch e um pull request. A Vercel cria um preview: teste nele, lembrando a seção 3.3.
2. Faça o merge em `main`. A Vercel publica em produção automaticamente. ### Publicar uma mudança de banco 1. **Nunca edite** uma migração já aplicada em produção. Crie a próxima numerada (`0004_...sql`, depois `0005_...`), append-only.
2. Escreva a migração de forma idempotente.
3. Faça o backup ou registre o ponto de restauração (item 1.8).
4. Aplique no SQL Editor, confira a consulta da seção 1.3 e os testes da Parte 4. ### Rollback - **Site:** em **Deployments**, promova o deploy anterior de volta para produção ou use o *Instant Rollback*. Não é preciso refazer o commit.
- **Banco:** não existe "desfazer" automático de migração. Para reverter, crie uma migração nova que desfaça o efeito, ou restaure o backup. Por isso o item 1.8 é obrigatório.
- **Configuração do site:** o valor anterior fica registrado pelo banco (`updated_at`, `updated_by`). A administração permite voltar a um valor anterior ao editar. ## Solução de problemas | Sintoma | Causa provável | O que fazer |
|---|---|---|
| Administração mostra que está desativada | `env.js` com valores vazios | Preencha `supabaseUrl` e `supabaseAnonKey` (seção 2.1). |
| Login falha com *invalid credentials* | Usuário não confirmado, senha errada ou usuário não cadastrado | Confirme o usuário em **Authentication > Users** e a senha pelo gerenciador de senhas. |
| Login funciona, mas a tela fica sem permissão | Usuário não está em `public.admins` ou `public.equipe` | Rode o insert das seções 1.5 ou 1.6. |
| Chamadas ao Supabase bloqueadas, sem erro visível | CSP não libera o host da API | Ajuste `connect-src` em `web/vercel.json` (seção 2.2) e confira o console do navegador. |
| Alteração no site não aparece | Cache do navegador ou do service worker | Recarregue forçado (Ctrl+Shift+R). `sw.js` é `no-cache`, mas o navegador pode manter a versão anterior até recarregar. |
| API responde com erro de conexão ou o projeto não responde | Projeto pausado ou em manutenção | Reative o projeto no painel do Supabase e confirme o plano (seção 1.8). |
| `401` ou `403` numa escrita feita pela administração | Papel sem permissão ou sessão expirada | Saia e entre de novo. Se persistir, confira o vínculo em `admins` ou `equipe`. |
| Domínio não abre | DNS não propagou ou registro errado | Confirme o registro exigido em **Settings > Domains** e aguarde a propagação. | ## Compartilhamento responsável - Não envie para terceiros (fornecedores, parceiros, voluntários de fora da equipe) o `env.js` com valores reais, senhas, chaves ou o painel de administração. Use os canais aprovados pela política da .
- Acessos de terceiros devem ser concedidos com o papel mínimo e revisados periodicamente.
- Não cole URL de produção, chave ou print de painel em chats, issues ou documentos públicos.
- Dados pessoais (nomes, telefones, e-mails de frequentadores ou de voluntários) não devem aparecer em exemplos, prints ou testes. ## Pendências e decisões em aberto - [ ] Domínio de produção e domínio canônico (seção 3.4).
- [ ] Estratégia de configuração: manter `env.js` versionado (hoje) ou criar etapa de build que use variáveis da Vercel. Decisão do time.
- [ ] Política para previews (seção 3.3): opção a, b ou c.
- [ ] SMTP próprio para e-mails do Supabase (seção 1.4).
- [ ] MFA para administradores: pendência CTRL-06 em `docs/pt-br/architecture/controles-seguranca-soc2.md`.
- [ ] URL do sitemap em `web/robots.txt` (hoje é um TODO), depois que o domínio existir.
- [ ] Revisão de fornecedores Vercel e Supabase: CTRL-12.
- [ ] Plano do Supabase e política de backup confirmados (seção 1.8).
