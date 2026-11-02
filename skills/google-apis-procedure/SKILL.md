---
name: google-apis-procedure
description: Procedimento para avaliar, configurar e validar integrações com APIs do Google no cceak — Sign-In, Analytics/GA4, Search Console, Business Profile, Maps, Fonts, Sheets e Drive. Use quando o usuário pedir para adicionar Google Analytics, login com Google, mapa, fonte do Google, planilha ou arquivo do Drive, ou para checar escopos, cota, consentimento ou a CSP dos domínios Google.
argument-hint: "[servico: signin | analytics | search-console | business-profile | maps | fonts | sheets | drive]"
--- Entrega uma ficha de decisão por serviço Google e a checagem local da CSP e dos segredos. Não chama o Google. Executado pelo agente `.claude/agents/google-apis-specialist.md`. ## Passo 1: ficha do serviço Abra `docs/pt-br/manual/templates/google-apis.md` e preencha a seção do serviço pedido. Responda, antes de qualquer código: 1. Para que serve no site, e o que o visitante perde se for bloqueado?
2. Exige conta Google do visitante, conta do responsável ou nenhuma?
3. Quais escopos OAuth? Escolha o mínimo.
4. Qual a cota gratuita, e o uso previsto cabe nela?
5. Há dado pessoal? Há consentimento? Qual a base legal?
6. Qual o domínio que o navegador vai acessar? Ele entra na CSP. ## Passo 2: checagem local ```bash
node scripts/google-apis-check.mjs
``` O script lê `web/` e `web/vercel.json`. Ele:
- procura domínios Google em HTML, CSS e JS de `web/`;
- confere se a diretiva CSP correspondente (`script-src`, `connect-src`, `style-src`, `font-src`, `img-src`, `frame-src`) os permite;
- avisa sobre domínios Google na CSP sem uso no código (princípio do menor privilégio);
- falha se houver chave de API Google (`AIza...`) versionada;
- falha se Analytics for usado e a página de privacidade não mencionar o Google. Registre a saída. Um aviso não bloqueia; uma falha bloqueia. ## Passo 3: configuração no console (pelo responsável) Estes passos ficam fora do repositório e são executados por quem tem acesso ao Google Cloud ou à propriedade do serviço: - **Sign-In:** criar cliente OAuth do tipo "Aplicativo da Web", listar as origens JavaScript autorizadas (apenas as origens do site) e a tela de consentimento OAuth.
- **Analytics (GA4):** criar propriedade e fluxo de dados web; ativar anonimização de IP onde o plano e a configuração permitirem; não enviar e-mail nem nome como parâmetro.
- **Search Console:** verificar a propriedade (método de DNS preferido, não arquivo HTML público se evitável).
- **Business Profile:** API restrita e aprovação do Google; o uso exige conta de gestor do perfil.
- **Maps:** chave de API com restrição de referenciador HTTP e restrição à API Maps; cota gratuita por mês.
- **Fonts:** sem conta. Preferir hospedar a fonte no próprio site (`font-src 'self'`) para não depender de terceiro.
- **Sheets e Drive:** conta de serviço ou OAuth com escopo de arquivo específico. Nunca no navegador com chave privada. Para cada passo, grave só o nome lógico do que foi feito (ex.: "cliente OAuth criado pelo responsável em AAAA-MM-DD"), nunca o ID do cliente se ele não for público, nem o segredo. ## Passo 4: consentimento e privacidade - Antes do aceite, nenhum script de terceiro carrega. Use o padrão de `web/assets/js/app.js` e a página `web/cookies/`.
- A página `web/privacidade/` deve nomear o serviço, a finalidade e como revogar o consentimento.
- Se o serviço envia dado para fora do Brasil, registre como `TODO:` para o DPO avaliar a transferência internacional. ## Passo 5: relatório Veredito no topo. Depois a tabela de serviços (escopos, cota, conta, consentimento, situação), os achados do script e as pendências com dono. ## Regras - Não adicione um domínio Google à CSP só para "fazer funcionar" sem registrar a finalidade.
- Não coloque chave de API no código. Restrinja por origem quando o serviço aceitar.
- Dado pessoal de visitante não vai para planilha ou log sem decisão registrada.
- Cota e preço: consulte a documentação oficial e registre a data.
