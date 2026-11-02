# SDD — Portal público da Casa de Cultura Espírita Allan Kardec

Especificação orientada a testes para uma experiência pública de apresentação,
estudos, palestras e eventos da Casa de Cultura Espírita Allan Kardec (CCEAK).

| Campo | Valor |
|---|---|
| Estado | rascunho |
| Dono | a definir com a instituição |
| Base de conteúdo | [`pesquisa-casa-de-cultura-espirita-allan-kardec.md`](../../uso/pesquisas/pesquisa-casa-de-cultura-espirita-allan-kardec.md) |
| Idioma inicial | pt-BR |
| Público | visitantes, estudantes e frequentadores |
| Stack | Vite para a aplicação web; Supabase para dados; Vercel para preview e produção |
| ADRs que a restringem | nenhum |
| Nível C4 afetado | sistema e containers, ainda não decididos |

## 1. Problema e objetivo

As informações públicas da CCEAK estão distribuídas entre diretórios e redes
sociais. Uma pessoa interessada precisa encontrar rapidamente o que a instituição é,
quando estudar, quais palestras assistir e quais eventos acompanhar.

O portal deve ser uma referência pública, simples e atualizável para:

- apresentar a instituição e seus canais oficiais informados;
- publicar o cronograma de estudos;
- catalogar palestras e apontar gravações públicas;
- divulgar eventos em um calendário.

O sucesso inicial será medido por uma pessoa conseguir, sem autenticação, chegar à
programação desejada em até três interações a partir da página inicial e abrir a
fonte pública de uma gravação ou evento quando houver.

## 2. Evidências e limites da pesquisa

- A pesquisa identifica a CCEAK em Nova Campinas, Duque de Caxias/RJ.
- O CEERJ publica estudos doutrinários, reunião mediúnica, atendimento espiritual e
  evangelização infantil; também publica horários de sexta e sábado.
- O YouTube se apresenta como “Allan Kardec CCEAK” e descreve conteúdo de eventos,
  palestras e arte espírita.
- Há divergência pública de endereço entre o CEERJ e um diretório cadastral. O portal
  não deve fixar endereço como fato definitivo antes da confirmação institucional.
- O Instagram e o YouTube são canais informados na pesquisa, mas o vínculo jurídico
  com o CNPJ não foi comprovado independentemente.

Esses fatos são conteúdo inicial, não um contrato imutável. Todo item publicado deve
ter origem, data de revisão e estado de confirmação.

## 3. Escopo

### Dentro

1. Landing page pública.
2. Área pública de estudos com cronograma.
3. Área pública de palestras com lista e gravações.
4. Área pública de eventos com calendário.
5. Links para Instagram e YouTube.
6. Estados vazios, conteúdo indisponível e aviso de atualização.
7. Metadados básicos para compartilhamento e mecanismos de busca.

### Fora da primeira versão

- login, cadastro de frequentadores ou área privada;
- inscrição, pagamento ou emissão de ingressos;
- comentários, chat ou mensagens privadas;
- reprodução ou hospedagem de vídeos dentro do portal;
- confirmação automática de endereço, horários ou situação cadastral;
- painel administrativo, CMS ou integração específica antes de uma decisão de
  publicação ser tomada;
- atendimento espiritual online ou aconselhamento religioso/saúde.

## 4. Mapa público

| Rota conceitual | Objetivo | Conteúdo principal |
|---|---|---|
| `/` | orientar a primeira visita | identidade, resumo, próximos itens e canais |
| `/estudos` | encontrar estudos | cronograma, modalidade, público e observações |
| `/palestras` | explorar palestras | lista, tema, data, palestrante e gravação |
| `/eventos` | acompanhar eventos | calendário, detalhes e estado do evento |

Os caminhos são conceituais; a escolha de framework e roteamento fica em aberto.

## 5. Requisitos funcionais

| ID | Requisito | Aceitação observável |
|---|---|---|
| R1 | A página inicial apresenta a CCEAK | visitante vê nome, propósito resumido e links para estudos, palestras e eventos |
| R2 | A página inicial expõe canais públicos | Instagram e YouTube aparecem como links identificados, abrindo em destino público |
| R3 | A landing mostra próximos conteúdos | quando houver dados futuros, estudos, palestras e eventos próximos são destacados; sem dados, cada bloco apresenta estado vazio útil |
| R4 | O cronograma de estudos é consultável | visitante filtra ou percorre dia, horário, atividade, modalidade e observação |
| R5 | O cronograma sinaliza confirmação | cada item informa data de revisão e se é confirmado, provisório ou precisa de confirmação |
| R6 | A lista de palestras é navegável | visitante vê tema, data, palestrante quando disponível e estado da gravação |
| R7 | Gravações públicas são acessíveis | item com gravação apresenta link YouTube; item sem gravação informa “gravação não publicada” sem link quebrado |
| R8 | Eventos aparecem em calendário | visitante navega período e identifica eventos por data, título e estado |
| R9 | Evento tem detalhe legível | detalhe informa título, início, fim quando houver, local/modalidade, descrição e fonte |
| R10 | Dados ausentes não são inventados | campos desconhecidos exibem “não informado” ou são omitidos conforme a regra de conteúdo |
| R11 | Conteúdo desatualizado é sinalizado | item cuja revisão expirou exibe aviso e não se apresenta como confirmado |
| R12 | O portal funciona sem autenticação | todas as rotas públicas e links de conteúdo publicado são acessíveis em sessão anônima |

## 6. Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| N1 | Acessibilidade | navegação por teclado, foco visível, títulos hierárquicos, contraste e textos alternativos |
| N2 | Responsividade | fluxos principais funcionam em viewport móvel e desktop |
| N3 | Desempenho | conteúdo inicial não bloqueia a navegação por imagens ou embeds externos |
| N4 | Privacidade | não coletar dados pessoais de visitantes na primeira versão |
| N5 | Integridade editorial | fonte e data de revisão acompanham cada item de programação |
| N6 | Segurança | conteúdo externo é tratado como não confiável; links usam HTTPS quando disponível |
| N7 | Indexabilidade | cada área tem título, descrição e URL compartilhável coerentes |

## 7. Modelo de conteúdo mínimo

Os campos abaixo são contratos de domínio, não componentes. A persistência será feita
no Supabase; a ferramenta de edição e o fluxo de publicação serão decididos depois.

### Estudo

```text
id, título, descrição opcional, dia_da_semana, início, fim,
modalidade (presencial|online|híbrida|não_informada), local opcional,
público opcional, estado (confirmado|provisório|precisa_de_confirmação),
fonte, revisado_em
```

### Palestra

```text
id, título, resumo opcional, data, horário opcional, palestrante opcional,
url_gravação opcional, estado_gravação (publicada|não_publicada|indisponível),
fonte, revisado_em
```

### Evento

```text
id, título, descrição opcional, início, fim opcional,
modalidade (presencial|online|híbrida|não_informada), local opcional,
url_inscrição opcional, estado (agendado|realizado|cancelado|precisa_de_confirmação),
fonte, revisado_em
```

Regras: horários usam `America/Sao_Paulo`; datas sem horário não recebem um horário
inventado; URL externa inválida ou indisponível não deve ser apresentada como ativa.

### Persistência no Supabase

O conteúdo será persistido no PostgreSQL gerenciado pelo Supabase. A modelagem inicial
prevê as entidades `studies`, `talks` e `events`, com uma fonte e data de revisão em
cada registro. Os nomes são uma proposta de implementação; o contrato público é o
modelo de conteúdo acima.

- tabelas expostas pela Data API terão RLS habilitado;
- visitantes anônimos terão apenas leitura de registros publicados e válidos;
- registros provisórios, vencidos ou não publicados não serão retornados ao público;
- permissões de banco serão concedidas explicitamente e testadas junto das policies;
- a chave pública do cliente pode estar no frontend, mas `service_role` e secrets
  nunca podem ser enviados ao navegador ou versionados;
- migrações e seeds de teste serão versionados antes de qualquer deploy.

Referências técnicas: [segurança da Data API do Supabase](https://supabase.com/docs/guides/api/securing-your-api)
e [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 8. Cenários de aceitação

Os cenários são a especificação executável futura. Cada cenário deve começar como
um teste falhando em uma superfície pública, antes da implementação correspondente.

### Landing

```gherkin
Cenário: visitante entende o portal na primeira tela
  Dado que acesso a página inicial sem autenticação
  Então vejo o nome da CCEAK e um resumo da sua proposta
  E vejo caminhos para estudos, palestras e eventos

Cenário: visitante abre os canais públicos
  Dado que acesso a página inicial
  Quando seleciono o canal Instagram ou YouTube
  Então sou levado ao endereço público correspondente
```

### Estudos

```gherkin
Cenário: visitante consulta um estudo confirmado
  Dado que existe um estudo confirmado no sábado às 18:00
  Quando acesso a área de estudos
  Então vejo atividade, horário, modalidade e data de revisão

Cenário: visitante não confunde dado provisório com confirmação
  Dado que um horário está marcado como precisa de confirmação
  Quando acesso a área de estudos
  Então o aviso de confirmação aparece junto do horário
```

### Palestras

```gherkin
Cenário: visitante abre uma gravação publicada
  Dado que uma palestra possui uma URL pública de gravação
  Quando acesso a lista de palestras e seleciono a palestra
  Então vejo tema, data e um link para a gravação

Cenário: palestra sem gravação
  Dado que uma palestra não possui gravação publicada
  Quando acesso a palestra
  Então vejo que a gravação não foi publicada
  E não vejo um link quebrado
```

### Eventos

```gherkin
Cenário: visitante encontra evento no período selecionado
  Dado que existe um evento agendado em um mês futuro
  Quando navego até esse mês no calendário
  Então vejo o título e a data do evento
  E consigo abrir seus detalhes

Cenário: calendário sem eventos
  Dado que não existem eventos no período selecionado
  Quando acesso o calendário
  Então vejo uma mensagem de ausência de eventos
  E continuo podendo navegar para outro período
```

## 9. Plano TDD por fatias verticais

O ciclo de cada item é: escrever um teste de comportamento falhando (red), implementar
somente o necessário (green), e deixar a refatoração para a revisão da fatia. Não
escrever uma bateria inteira de testes antes de ter a primeira implementação.

| Ordem | Fatia | Primeiro teste de comportamento | Pronto quando |
|---|---|---|---|
| 0 | contrato de conteúdo | item desconhecido não é exibido como confirmado | schema/validação rejeita dado sem fonte ou estado |
| 1 | dados e RLS | visitante anônimo lê somente conteúdo publicado | migração, grants e policies passam contra Supabase de teste |
| 2 | shell público | visitante anônimo encontra as quatro áreas | rotas públicas renderizam navegação e estados básicos |
| 3 | landing | nome, resumo e três chamadas para ação aparecem | R1–R3 e N7 cobertos |
| 4 | estudos | estudo confirmado aparece com horário e revisão | R4–R5 e regra de fuso cobertos |
| 5 | palestras | palestra com e sem gravação mostra estados corretos | R6–R7 cobertos |
| 6 | eventos | calendário encontra evento futuro e suporta vazio | R8–R9 cobertos |
| 7 | fontes e atualização | item vencido mostra aviso | R10–R11 cobertos |
| 8 | qualidade pública | fluxo anônimo passa acessibilidade e responsividade básica | R12 e N1–N6 verificados |

### Seams de teste acordadas pela spec

- navegação HTTP/roteamento público;
- renderização observável das páginas;
- contrato de conteúdo validado na fronteira de publicação;
- links públicos e estados de disponibilidade;
- calendário visto pelo visitante.

Não testar detalhes internos, classes privadas, chamadas entre módulos ou snapshots
que apenas repitam a implementação.

### Matriz mínima de testes

| Camada | O que prova | Exemplos |
|---|---|---|
| contrato | conteúdo seguro e completo | estudo sem fonte é rejeitado; evento sem título é rejeitado |
| banco/RLS | exposição pública correta | anon lê publicado; anon não lê rascunho, vencido ou não publicado |
| unidade | regras puras de domínio | ordenação cronológica; estado de revisão vencido |
| integração | rota recebe e exibe conteúdo | `/estudos` exibe item confirmado; `/eventos` muda período |
| aceitação | fluxo do visitante | landing → área → detalhe → link externo |
| acessibilidade | uso sem mouse e leitura semântica | foco, headings, nomes de links, alt text |

O comando de teste fica **a definir junto com a stack**; não declarar um comando
executável até haver manifesto e ferramenta escolhidos.

## 10. Fases de entrega

1. **Descoberta e confirmação:** validar endereço, horários, identidade dos canais,
   responsáveis editoriais e frequência de atualização.
2. **Contrato editorial:** aprovar o modelo de estudo, palestra e evento e a política
   para item provisório, vencido ou sem fonte.
3. **Primeira fatia:** shell público + landing, com conteúdo estático mínimo e testes.
4. **Programação:** estudos, palestras e eventos, sempre uma fatia por vez no ciclo
   TDD.
5. **Persistência:** criar projeto Supabase, migrações, seeds e policies RLS; validar
   consultas públicas com o papel `anon` antes da integração com o frontend.
6. **Publicação segura:** escolher mecanismo de atualização, incluir revisão editorial,
   acessibilidade, SEO e monitoramento de links.

## 11. Questões abertas que bloqueiam implementação

- [ ] Quem aprova e atualiza o conteúdo?
- [ ] Qual canal é a fonte oficial para horários e eventos?
- [ ] O endereço deve ser exibido antes da divergência ser resolvida?
- [ ] Haverá apenas links para YouTube ou também catálogo de vídeos?
- [ ] Os estudos são exclusivamente presenciais ou existem modalidades online?
- [ ] Qual framework de interface, biblioteca de testes e fluxo editorial serão adotados sobre Vite/Supabase/Vercel?
- [ ] Qual política de retenção e acessibilidade será exigida para gravações?

## 12. Decisões técnicas de aplicação e entrega

Para a primeira implementação, a aplicação web será construída com **Vite**, usará
**Supabase** para persistência e será publicada na **Vercel**. A decisão de entrega
está em
[`0002-vite-vercel.md`](../adr/0002-vite-vercel.md).

### Contrato de build e deploy

| Ambiente | Comportamento esperado | Verificação |
|---|---|---|
| local | servidor Vite para desenvolvimento | comando de desenvolvimento definido no `package.json` |
| validação | build de produção reproduzível | `vite build` ou script equivalente, após o manifesto existir |
| preview | cada branch/PR gera URL isolada na Vercel | smoke tests e aceitação contra a URL de preview |
| produção | somente artefato validado é promovido | `vercel build --prod` + `vercel deploy --prebuilt --prod` ou integração Git equivalente |

O token Vercel, IDs de organização/projeto e variáveis de ambiente ficam somente no
provedor de CI/Vercel; nunca entram no repositório. A versão da CLI Vercel deve ser
fixada quando o pipeline for criado.

### TDD da entrega

Antes de cada promoção:

1. testes de contrato e unidade passam;
2. testes de aceitação executam contra o preview;
3. verificação de acessibilidade e links externos passa;
4. o preview validado é promovido, evitando reconstrução de um artefato diferente.

## 13. Stack local completa com Docker Compose

O desenvolvimento deve ser reproduzível sem depender de serviços remotos. A entrada
principal será um comando do projeto, por exemplo `make dev`, que sobe a aplicação
Vite e a stack local do Supabase em um runtime compatível com Docker Compose.

### Serviços locais

| Serviço | Responsabilidade | Exposição local |
|---|---|---|
| `web` | Vite em modo desenvolvimento, com hot reload | `localhost:5173` |
| `supabase` | orquestração do stack local pelo CLI Supabase | controlada pelo CLI |
| Postgres local | banco, migrações e seeds | URL/porta exibida por `supabase status` |
| API/Auth/Storage/Realtime | serviços Supabase usados pela aplicação | URLs exibidas por `supabase status` |
| Studio | inspeção local do projeto Supabase | `localhost:54323` ou porta informada pelo CLI |
| Mailpit | captura local de e-mails, se Auth for usado | URL exibida pelo CLI |
| testes | testes unitários, integração, RLS e aceitação | executados sob demanda |

O Supabase CLI é a fonte de verdade para a composição dos serviços Supabase: ele
baixa as imagens compatíveis e controla `supabase start`, `supabase stop`, `supabase
status` e reset local. O Docker Compose fornece o runtime e a orquestração do
ambiente; não será copiado manualmente o compose interno do Supabase, evitando
divergência entre versões.

### Arquivos esperados quando a implementação começar

```text
docker-compose.yml       # serviço web e rede local do projeto
.dockerignore
Dockerfile               # imagem de desenvolvimento do web
supabase/config.toml     # configuração local versionada
supabase/migrations/     # schema, grants e RLS versionados
supabase/seed.sql        # dados públicos mínimos para desenvolvimento
.env.example             # nomes de variáveis, sem valores secretos
```

### Fluxo local obrigatório

1. instalar Docker e uma versão pinada do CLI Supabase como dependência de
   desenvolvimento;
2. executar `npx supabase init` uma vez para criar `supabase/`;
3. executar `npx supabase start` para iniciar a stack Supabase em containers;
4. executar `docker compose up web` para iniciar o Vite com as URLs locais exibidas
   por `npx supabase status`;
5. aplicar migrações e seeds por `npx supabase db reset` em ambiente descartável;
6. executar testes TDD e RLS contra a instância local;
7. parar os serviços com `docker compose down` e `npx supabase stop`.

O bind local deve ficar restrito a `127.0.0.1`; a stack de desenvolvimento nunca
deve ser exposta à internet. O Compose e o CLI devem usar versões fixadas e o
lockfile deve ser versionado.

### Critérios de pronto do ambiente

- uma pessoa nova reproduz o ambiente com Docker, instalação de dependências e os
  comandos documentados;
- o frontend usa apenas variáveis públicas locais;
- `db reset` recria schema, policies e dados de demonstração sem passos manuais;
- testes provam que `anon` lê somente conteúdo permitido;
- desligar e subir novamente não exige alteração manual de volumes ou containers.
