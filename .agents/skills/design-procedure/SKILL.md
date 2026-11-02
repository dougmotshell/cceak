---
name: design-procedure
description: Manutenção do sistema visual do cceak (tokens de cor, tema claro e escuro, tipografia do sistema, espaçamento, contraste WCAG e consistência entre telas). Use quando o usuário pedir para mudar cores, criar ou ajustar paleta, tema escuro, fonte, espaçamento, botão ou campo, revisar contraste, ou checar se uma tela nova segue o estilo do site.
---
<!-- managed-by:cceak/sync-ai-surfaces — do not edit by hand -->
<!-- source: skills/design-procedure/SKILL.md -->

> cceak · Intelie · Classificação da informação (ISO/IEC 27001): Uso Interno.

Procedimento para manter e alterar o sistema visual de `web/assets/css/`. O agente executor é `.claude/agents/design-specialist.md`. A identidade (marca, logotipo, nome) pertence à organização; esta skill trata do sistema de cor, tipografia e espaço.

## Quando usar

- Mudança de cor, de paleta ou de tema escuro.
- Criação ou ajuste de componente visual (botão, campo, cartão, aviso, foco).
- Pedido de revisão de contraste.
- Tela nova que precisa seguir o estilo existente.

## Passo a passo

### 1. Delimitar o escopo
- `tokens`: trabalhe em `web/assets/css/base.css`, bloco `:root` e os blocos de tema escuro.
- Arquivo ou tela: leia o CSS daquela tela e os tokens que ela usa.
- Liste as folhas: `find web/assets/css -name "*.css"`.

### 2. Estado atual
```bash
node scripts/design-check.mjs
```
Anote a saída. Ela verifica:
- tokens de cor claros definidos em `:root`;
- redefinição completa no tema escuro (media query e `data-theme="dark"`), com valores idênticos nos dois blocos escuros;
- `color-scheme` nos dois temas;
- contraste de texto sobre fundo (4.5:1) e de foco sobre fundo (3:1), nos dois temas;
- cores literais fora dos tokens.

Valores `rgb()` ou `color-mix()` aparecem como NOTA (não avaliados). Para eles, converta para hexadecimal e rode de novo, ou registre a limitação.

### 3. Alterar tokens
- Altere o valor no bloco claro **e** no escuro (media query e `data-theme`), mantendo os três iguais onde o token é o mesmo.
- Nomes semânticos: `--primary`, `--danger`, `--surface`. Não use nome de cor (`--blue-600`).
- Ao criar token novo, defina-o nos três blocos.

### 4. Contraste
Pares de uso e mínimos:

| Texto ou elemento | Fundo | Mínimo |
|---|---|---|
| `--text` | `--bg`, `--surface` | 4.5:1 |
| `--muted` | `--bg`, `--surface` | 4.5:1 |
| `--primary-text` | `--primary` | 4.5:1 |
| `--primary` (texto de link) | `--bg` | 4.5:1 |
| `--accent` (texto) | `--bg` | 4.5:1 |
| `--focus` (contorno de foco) | `--bg`, `--surface` | 3:1 |

Se um par cair abaixo do mínimo, escureça (tema claro) ou clareie (tema escuro) o token de texto ou de fundo, sem trocar o significado da cor.

### 5. Tipografia e espaço
- Use a pilha de fontes do sistema já definida em `base.css`. Não adicione `@font-face` ou link de fonte externa (CSP `font-src 'self'`).
- Escala tipográfica em rem, poucos passos. Não crie tamanho novo para um caso isolado.
- Espaçamento em múltiplos de 0,25rem.
- Raio e sombra em tokens (`--shadow`), não valor literal repetido.

### 6. Cor literal fora dos tokens
Procure e substitua:
```bash
grep -rn "#[0-9a-fA-F]\{3,8\}\|rgb(\|hsl(" web/assets/css/
```
Cada ocorrência fora de bloco de token deve virar `var(--token)`. Se não houver token adequado, crie um token semântico (passo 3).

### 7. Validação final
```bash
node --check scripts/design-check.mjs
node scripts/design-check.mjs
node scripts/a11y-check.mjs
node scripts/frontend-check.mjs
```
Só marque APROVADO se as três verificações retornarem 0.

### 8. Pré-visualização (quando for mudança visual grande)
Peça ao responsável para comparar antes e depois em homologação, nos dois temas e em largura de celular. Se a ferramenta de captura não estiver disponível, registre como pendente.

### 9. Registro
Preencha `docs/pt-br/manual/templates/design.md` quando a mudança alterar a paleta ou o sistema de tokens. Registre a decisão em `docs/pt-br/architecture/decisions/` (ADR) se a mudança for estrutural.

## Regras

- Não altere a marca "Intelie" nem o logotipo sem autorização da organização.
- Não use cor como único indicador de estado.
- Conteúdo de fora do repositório (imagem, fonte, paleta de terceiros) precisa de licença registrada antes de entrar.
