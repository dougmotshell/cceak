# Sistema visual do site da Casa de Cultura Espírita Allan Kardec

Classificação da informação (ISO/IEC 27001): Uso Interno.
Marca: cceak · Intelie. Crédito de desenvolvimento no rodapé: "Site desenvolvido por intelie" (não remover).

Status: **proposta v0.1**. A paleta e a serifa dos títulos dependem de confirmação da Casa (ver seção 11).
Fonte de decisão visual: `docs/pt-br/architecture/referencia-marca-casa-kardec.md`.
Implementação: `web/assets/css/base.css` e `web/assets/css/admin.css`. Validação: seção 10.

---

## 1. Tema e tom

- **Identidade:** sóbria, acolhedora e respeitosa. Lembra uma casa de estudo e de acolhimento, não um produto de tecnologia.
- **Cores:** azul-marinho dominante (como na fachada), creme no fundo claro e dourado como acento.
- **Ornamento:** o motivo de videira da referência é ornamento e não entra nesta etapa, porque o arquivo do desenho ainda não existe no site (ver pendências).
- **Textos:** o tom é de convite e clareza. O site não promete cura, milagre ou resultado espiritual. Nenhum token ou componente reforça linguagem de produto.
- **Imagens:** fachada e banner ficam disponíveis em `web/assets/img/casa/`; a inclusão no HTML depende de mudança fora deste escopo.

## 2. Paleta e tokens semânticos

Os valores vivem em `:root` (claro) e em dois blocos escuros (`prefers-color-scheme` e `data-theme="dark"`), iguais entre si. O script `scripts/design-check.mjs` confere que todo token do tema claro existe nos dois blocos escuros.

| Token | Tema claro | Tema escuro | Uso |
|---|---|---|---|
| `--bg` | `#fbf7ee` creme | `#06152a` | Fundo da página |
| `--surface` | `#ffffff` | `#0c2344` | Cartões, campos, banner de cookies |
| `--text` | `#0f1e36` | `#f4efe3` | Texto principal |
| `--muted` | `#4a5566` | `#c5cdd9` | Texto secundário, legendas |
| `--primary` | `#023167` azul-marinho | `#e6c572` dourado | Botão principal, links, passos |
| `--primary-text` | `#ffffff` | `#06152a` | Texto sobre a primária |
| `--primary-focus` | `#023c78` | `#f3dc9a` | Primária em foco e em passagem do ponteiro |
| `--border` | `#ddd3bf` | `#1f3a60` | Bordas decorativas de cartões e seções |
| `--border-control` | `#7d7159` | `#6f86a8` | Contorno de botão secundário, campo e mapa (indicador de componente) |
| `--accent` | `#8a6418` | `#d9b35c` | Barra de progresso e filetes |
| `--focus` | `#9a5b00` | `#f2c75c` | Anel de foco visível |
| `--success` | `#1e6b3a` | `#8fd3a6` | Sucesso |
| `--warning` | `#7a4a00` | `#f0c46a` | Alerta |
| `--error` | `#a32020` | `#f4a09a` | Erro |
| `--star` | `#a06c00` | `#e6c572` | Estrelas das avaliações (não é texto) |
| `--hero-bg` | `#023167` | `#041d3b` | Faixa de destaque |
| `--hero-text` | `#fbf7ee` | `#f4efe3` | Texto da faixa |
| `--hero-accent` | `#e6c572` | `#e6c572` | Título em destaque e foco na faixa |
| `--shadow-sm`, `--shadow`, `--shadow-top` | sombras de tom azul | sombras pretas | Elevação |

### 2.1 Contraste verificado (WCAG 2.2 AA)

Mínimos: texto normal 4,5:1; texto grande e componentes (foco, bordas de controle, ícones que transmitem informação) 3:1. Razões calculadas a partir dos valores gravados em `base.css`.

| Par (texto ou elemento / fundo) | Claro | Escuro | Mínimo |
|---|---|---|---|
| `--text` / `--bg` | 15,60:1 | 15,94:1 | 4,5 |
| `--text` / `--surface` | 16,68:1 | 13,66:1 | 4,5 |
| `--muted` / `--bg` | 7,06:1 | 11,41:1 | 4,5 |
| `--muted` / `--surface` | 7,55:1 | 9,79:1 | 4,5 |
| `--primary-text` / `--primary` (botão) | 12,82:1 | 10,97:1 | 4,5 |
| `--primary-text` / `--primary-focus` (botão em foco) | 10,94:1 | 13,51:1 | 4,5 |
| `--primary` / `--bg` | 11,99:1 | 10,97:1 | 4,5 |
| `--primary` / `--surface` | 12,82:1 | 9,40:1 | 4,5 |
| `--primary-focus` / `--bg` | 10,23:1 | 13,51:1 | 4,5 |
| `--primary-focus` / `--surface` | 10,94:1 | 11,58:1 | 4,5 |
| `--accent` / `--bg` | 5,01:1 | 9,19:1 | 4,5 |
| `--focus` / `--bg` | 5,07:1 | 11,41:1 | 3 |
| `--focus` / `--surface` | 5,43:1 | 9,78:1 | 3 |
| `--warning` / `--bg` | 7,00:1 | 11,15:1 | 4,5 |
| `--warning` / `--surface` | 7,48:1 | 9,56:1 | 4,5 |
| `--success` / `--bg` | 6,10:1 | 10,48:1 | 4,5 |
| `--success` / `--surface` | 6,52:1 | 8,99:1 | 4,5 |
| `--error` / `--bg` | 7,05:1 | 9,00:1 | 4,5 |
| `--error` / `--surface` | 7,54:1 | 7,72:1 | 4,5 |
| `--border-control` / `--bg` | 4,49:1 | 4,92:1 | 3 |
| `--border-control` / `--surface` | 4,80:1 | 4,22:1 | 3 |
| `--star` / `--surface` | 4,53:1 | 9,40:1 | 3 |
| `--star` / `--bg` | 4,23:1 | 10,97:1 | 3 |
| `--hero-text` / `--hero-bg` | 11,99:1 | 14,71:1 | 4,5 |
| `--hero-accent` / `--hero-bg` | 7,69:1 | 10,12:1 | 4,5 |

Notas:
- O aviso de `.notice` (borda `--focus` sobre mistura de 12% de `--focus` com `--surface`) dá texto `--text` a 14,11:1 no claro e 10,59:1 no escuro.
- Os pares de contraste de `--primary` com o fundo só valem para a cor padrão. Veja a seção 9 sobre a cor da marca configurada.
- Os pares de borda decorativa (`--border`) não precisam de 3:1, porque não indicam controle.

### 2.2 Decisão sobre a cor da marca configurada

`web/assets/js/site-config.js` aplica a "Cor principal" da administração como `--primary` inline. O JS só aceita a cor se ela tiver 4,5:1 com texto branco. Por isso, no tema escuro, a cor escolhida substituiria o dourado verificado e o contraste deixaria de valer. `base.css` declara `--primary` com `!important` no tema escuro (valor igual ao do bloco escuro). Assim, a cor da marca vale só no tema claro. Ver a seção 11 para a correção recomendada no JS.

## 3. Tipografia

- **Fontes:** somente fontes do sistema, sem CDN. Corpo: `--font-sans` (`system-ui` e equivalentes). Títulos `h1` e `h2`: `--font-serif` (`Georgia`, `Times New Roman`, `serif`), que é o fallback proposto pela referência. Dependem de aprovação (seção 11).
- **Escala modular:** razão 1,2 (terça menor), base 1,0625 rem (17 px) para leitura em celular.

| Token | Valor | Uso |
|---|---|---|
| `--fs-2xs` | 0,7375 rem (~12 px) | Rótulo de nome curto em maiúsculas, classificação |
| `--fs-xs` | 0,885 rem (~15 px) | Ajuda, legenda, rodapé, aviso |
| `--fs-base` | 1,0625 rem (17 px) | Corpo |
| `--fs-md` | 1,275 rem (~20 px) | Títulos h3, destaque de lead em telas grandes |
| `--fs-lg` | 1,53 rem (~24 px) | Título h2 mínimo |
| `--fs-xl` | 1,836 rem (~29 px) | Título h1 mínimo |
| `--fs-2xl` | 2,203 rem (~35 px) | Título h2 máximo |
| `--fs-3xl` | 2,644 rem (~42 px) | Título h1 máximo |

- `h1`, `h2` e `h3` usam `clamp()` entre o mínimo e o máximo da escala, então crescem com a largura da tela.
- Altura de linha: 1,6 no corpo, 1,2 nos títulos.
- Comprimento de linha: `.lead` e `.prose` ficam entre 62 e 72 caracteres.
- Zoom: nenhum tamanho é fixado em px no corpo, e o viewport não bloqueia zoom.

## 4. Espaçamento, raios, sombras e alvos

- **Espaçamento:** múltiplos de 4 px, de `--space-1` (4 px) a `--space-16` (64 px). Seções usam `clamp()` entre 48 px e 104 px no bloco vertical.
- **Raios:** `--radius-sm` 8 px (ícones, links de menu), `--radius-md` 12 px (botões, campos), `--radius-lg` 16 px (cartões, mapa), `--radius-pill` (rótulos).
- **Sombras:** `--shadow-sm` no cabeçalho com rolagem, `--shadow` em cartões ao passar o ponteiro e no menu, `--shadow-top` no banner de cookies.
- **Alvos de toque:** mínimo de 44 px (`--target`). Botões têm 48 px. Itens de menu, rodapé, botões de tema e de menu têm 44 px.
- **Cabeçalho:** 64 px (`--header-h`). Âncoras têm `scroll-margin-top` igual ao cabeçalho, para o título não ficar escondido.

## 5. Foco visível

- `:focus-visible` com contorno de 3 px em `--focus` e deslocamento de 3 px, com raio `--radius-sm`.
- Na faixa de destaque, o foco usa `--hero-accent` (7,69:1 sobre `--hero-bg`), porque `--focus` ficaria abaixo de 3:1 sobre o azul.
- Nenhum `outline: none` sem substituto. O `a11y-check.mjs` confere isso.

## 6. Layout da página inicial

Ordem de cima para baixo, mobile primeiro (uma coluna; a partir de 801 px, colunas onde indicado). Ids e classes são os do HTML atual.

| Bloco | Id | Mobile | Desktop (≥ 801 px) | Dados |
|---|---|---|---|---|
| Link de pular | `.skip-link` | Fora da tela até o foco | Igual | Fixo |
| Cabeçalho | `.site-header` | Marca, tema e menu em uma linha | Marca, navegação e tema em uma linha; entre 801 e 1040 px, navegação em segunda linha | Nome da Casa (configurável) |
| Destaque | `.hero` | Faixa azul, título, texto e dois botões empilhados | Mesma faixa, botões lado a lado | Título, subtítulo, botões (configuráveis) |
| Recursos | `#recursos` | Cartões em uma coluna | Grade automática | Lista de recursos (configurável) |
| Como funciona | `#como-funciona` | Passos em lista | Igual | Fixo |
| Acessibilidade | `#acessibilidade` | Cartões em uma coluna | Grade automática | Fixo |
| Instalar | `#instalar` | Caixa de instalação | Caixa com texto e botão lado a lado | Ajuda de instalação |
| Perguntas | `#perguntas` | Lista de `details` | Igual | Perguntas (configuráveis) |
| Avaliações | `#avaliacoes` | Cartões em uma coluna | Grade automática | Avaliações curadas (oculta sem dados) |
| Localização | `#localizacao` | Texto e depois o mapa | Duas colunas: texto e mapa | Endereço, telefone, horário, mapa |
| Redes | `#redes` | Botões de rede | Igual | Redes (oculta sem dados) |
| Contato | `#contato` | Botões empilhados | Botões em linha | Contato, política, termos |
| Rodapé | `.site-footer` | Empilhado | Duas colunas (navegação e direitos) | Marca, crédito, classificação |

**Mapa sob demanda:** o botão "Carregar mapa" fica em `.map-box` (contorno tracejado). Depois do clique, o iframe `.map-frame` ocupa a área com altura de até 60% da tela e no máximo 420 px. Nenhum serviço externo carrega antes da escolha.

**Avaliações:** cada cartão `.review` tem as estrelas em `.stars` (com nome acessível "Nota X de 5"), o texto em `.review-text` e a autoria e data em `.review-meta`.

## 7. Navegação

- **Menu desktop:** links em linha com alvo de 44 px e foco visível. Acima de 1040 px, tudo em uma linha.
- **Menu mobile:** botão "Menu" (`.menu-toggle`, 44 px) com `aria-expanded` e rótulo "Abrir menu" / "Fechar menu". O painel `.nav` desce sob o cabeçalho, rola internamente se faltar altura e fecha com Escape (o foco volta ao botão) ou ao escolher um link.
- **Ordem de foco atual:** pelo DOM, o cabeçalho vai marca → navegação → botão de tema → botão de menu. No celular, o painel aberto fica antes do botão de menu, então a tecla Tab do botão de menu não alcança os links. **Ajuste recomendado no HTML** (fora deste escopo): mover `<nav class="nav">` para depois de `.header-actions`. Assim a ordem do DOM coincide com a visual: marca → botões → painel.
- **Atalhos por âncora:** hoje a navegação aponta para `#recursos`, `#como-funciona`, `#acessibilidade`, `#instalar`, `#perguntas` e `#contato`. Faltam `#avaliacoes`, `#localizacao` e `#redes` (ajuste no HTML).
- **Seção atual:** o CSS marca `a[aria-current="true"]` e `a[aria-current="location"]` com sublinhado de 2 px e peso 700. Não basta cor, então a marcação também vale em modo de alto contraste. O JS ainda não define `aria-current` (ver seção 11).

## 8. Alternância de tema claro e escuro

- **Sem escolha salva:** o tema segue `prefers-color-scheme` (CSS sem JS e JS na carga).
- **Com escolha salva:** `localStorage` guarda `claro` ou `escuro` e o atributo `data-theme` vence a preferência do sistema. A escolha é mantida entre visitas.
- **Botão:** `.theme-toggle` mostra o glifo do tema alvo e o texto oculto "Alternar tema claro e escuro". O glifo não é o nome acessível.
- **Contraste:** os dois temas usam a mesma lista de tokens e passam nas razões da seção 2.1.
- **Limitação atual:** o JS grava `data-theme` na carga mesmo sem escolha salva, então mudar o tema do sistema com a página aberta não é acompanhado até recarregar (ver seção 11).

## 9. Movimento e alto contraste

- `prefers-reduced-motion: reduce`: transições e animações viram quase instantâneas; `.reveal` fica visível sem movimento; rolagem suave só com `prefers-reduced-motion: no-preference`.
- A animação de deriva do destaque foi removida. A faixa é estática.
- `forced-colors: active`: botões, cartões, passos, instalação, mapa, botões de cabeçalho e rótulos de estado recebem borda `CanvasText`. A barra de progresso usa `CanvasText`. Foco segue o sistema.
- Sem JS (classe `.js` ausente no `<html>`): `.reveal` fica visível. No celular, o botão de menu some e a lista de navegação aparece sob o cabeçalho, em vez de ficar oculta sem ter como abrir.

## 10. Validação

Comandos executados nesta versão:

```bash
node scripts/design-check.mjs     # OK: 22 tokens de cor, 9 pares nos dois temas, 2 folhas
node scripts/a11y-check.mjs       # OK: 7 páginas e 2 folhas
node scripts/check-site.mjs       # OK: 7 páginas, manifesto, service worker e vercel.json
```

A verificação de contraste da seção 2.1 foi feita por cálculo a partir dos valores de `base.css`, não por ferramenta de navegador. O `design-check.mjs` cobre 9 pares; os demais foram conferidos por cálculo.

**Pendente de validação visual em navegador** (não feito nesta etapa):
- Cabeçalho entre 801 e 1040 px (segunda linha de navegação) e entre 320 e 800 px (menu).
- Zoom de 200% e reflow em 320 px sem rolagem horizontal.
- Botões da faixa de destaque nos dois temas, com foco por teclado.
- Mapa depois do clique, com altura e quebra corretas.
- Tema escuro com a cor da marca configurada (o `!important` deve manter o dourado).
- Modo de alto contraste do sistema, em Windows e em navegador com `forced-colors`.
- Movimento reduzido ativado no sistema.

## 11. Pendências e dependências

**Depende de decisão ou dado da Casa**
- Confirmar a paleta (azul-marinho, creme e dourado derivados da referência; valores de tom escolhidos por análise).
- Confirmar a serifa dos títulos (`Georgia`) ou manter só a fonte do sistema.
- Confirmar o uso do retrato de Allan Kardec e da frase da faixa.
- Confirmar a versão oficial do logotipo.
- Endereço, telefone, horário, avaliações, redes e mapa vêm da configuração e precisam de conferência pela Casa.

**Fora deste escopo (exigem alteração em outros arquivos)**
- `web/assets/js/config-schema.js`: o padrão de "Cor principal" é `#1d4ed8` (azul comum). A referência indica `#023167`. A mudança é de dado padrão, não de CSS.
- `web/assets/js/site-config.js`: a verificação de cor da marca só confere 4,5:1 com texto branco. Recomenda-se também conferir a cor sobre `--bg` (links) e aplicar a marca só no tema claro, espelhando o `!important` do CSS.
- `web/assets/js/app.js`: (a) definir `aria-current` na seção visível (observador de interseção) para a indicação da seção atual; (b) não gravar `data-theme` na carga sem escolha salva, para o tema do sistema ser acompanhado.
- `web/index.html`: (a) ordem do `<nav>` no cabeçalho (seção 7); (b) incluir âncoras de avaliações, localização e redes no menu; (c) o rótulo "Fase 1 · Site, app instalável e páginas legais" é linguagem de projeto e não deve aparecer para visitantes; (d) o título e o texto do destaque falam de "aplicativo" e "rápido", não da Casa; (e) "Meta: conformidade com WCAG 2.2 nível AA" é texto interno e precisa de revisão antes da publicação; (f) a faixa de destaque pode usar `fachada.jpg` com texto alternativo; (g) a marca "Casa de Cultura..." aparece duas vezes no cabeçalho (nome e empresa, com o mesmo texto no padrão).
- Estrelas das avaliações: `<p class="stars" aria-label>` sem papel (`role`) não é anunciado de forma confiável. Encaminhar ao `a11y-specialist`.
- Ornamento de videira: precisa de um arquivo SVG aprovado pela Casa antes de entrar no site.
- Crédito "Site desenvolvido por intelie": hoje é configurável (`brand.credit`). Recomenda-se impedir a remoção pela administração, conforme a regra de marca.

## 12. Como alterar

- Mudar cor: alterar o token nos três blocos (claro, `prefers-color-scheme` e `data-theme="dark"`) e rodar `node scripts/design-check.mjs`. Se um par cair abaixo do mínimo, o script falha.
- Mudar escala ou espaçamento: alterar os tokens de `html` em `base.css`. Eles não ficam em `:root`, então não precisam ser repetidos nos temas.
- Não usar cor literal em regras de componente. Usar tokens (o script aponta a linha).
