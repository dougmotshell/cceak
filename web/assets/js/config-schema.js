/*
 * cceak — esquema e valores padrão da configuração do site
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Fonte única do que é configurável. Usado por:
 *  - site-config.js (aplica a configuração publicada no site público);
 *  - admin.js (gera o formulário da tela de administração a partir deste esquema).
 * Ao adicionar um campo aqui, ele aparece automaticamente na administração.
 * Os valores padrão valem enquanto nenhuma linha correspondente existir no Supabase.
 *
 * Padrões atuais: Casa de Cultura Espírita Allan Kardec (Duque de Caxias - RJ).
 * Dados de CNPJ conferidos na BrasilAPI em 2026-11-02 (ver docs/pt-br/manual/site-casa-kardec.md).
 */
(function (global) {
  "use strict";

  var SECTIONS = [
    {
      key: "brand",
      title: "Marca e identidade",
      help: "Nome exibido no cabeçalho, no título das páginas e no app instalado.",
      fields: [
        { name: "name", label: "Nome do site", type: "text", required: true, max: 60 },
        { name: "company", label: "Empresa responsável (marca)", type: "text", required: true, max: 80 },
        { name: "tagline", label: "Frase de apoio", type: "text", max: 120 },
        { name: "short_name", label: "Nome curto (ícone do app)", type: "text", max: 14 },
        { name: "language", label: "Idioma", type: "select", options: ["pt-BR", "en-US"] },
        { name: "classification", label: "Classificação da informação", type: "text", max: 60 },
        { name: "credit", label: "Crédito de desenvolvimento (rodapé)", type: "text", max: 80 },
        { name: "brand_color", label: "Cor principal", type: "color" }
      ],
      defaults: {
        name: "Casa Allan Kardec",
        company: "Casa de Cultura Espírita Allan Kardec",
        tagline: "Estudo, acolhimento e divulgação da Doutrina Espírita.",
        short_name: "Allan Kardec",
        language: "pt-BR",
        classification: "Uso Interno",
        credit: "Site desenvolvido por intelie",
        brand_color: "#023167"
      }
    },
    {
      key: "seo",
      title: "SEO e compartilhamento",
      help: "Título e descrição usados por buscadores e por pré-visualizações em redes.",
      fields: [
        { name: "title", label: "Título da página inicial", type: "text", max: 70 },
        { name: "description", label: "Descrição", type: "textarea", max: 160 },
        { name: "site_url", label: "Endereço público do site", type: "url" }
      ],
      defaults: {
        title: "Casa de Cultura Espírita Allan Kardec · Duque de Caxias - RJ",
        description: "Casa de Cultura Espírita Allan Kardec em Duque de Caxias (RJ): endereço, contato, avaliações e localização.",
        site_url: ""
      }
    },
    {
      key: "local",
      title: "Endereço, telefone e mapa",
      help: "Aparecem na seção de localização. O mapa só carrega depois que o visitante clicar, por privacidade.",
      fields: [
        { name: "address_line", label: "Logradouro e número", type: "text", max: 120, required: true },
        { name: "city", label: "Cidade e estado", type: "text", max: 80 },
        { name: "cep", label: "CEP", type: "text", max: 10 },
        { name: "phone", label: "Telefone (exibição)", type: "text", max: 20 },
        { name: "whatsapp", label: "WhatsApp (somente números, com DDI)", type: "text", max: 20 },
        { name: "hours", label: "Horário de funcionamento", type: "textarea", max: 300 },
        { name: "map_query", label: "Texto usado no mapa (endereço completo)", type: "text", max: 200 },
        { name: "reviews_url", label: "Link para as avaliações no Google", type: "url" },
        { name: "business_url", label: "Link da ficha no Google Maps", type: "url" }
      ],
      defaults: {
        address_line: "Av. A, lote 32, quadra 34, área 04 - Nova Campinas",
        city: "Duque de Caxias - RJ",
        cep: "",
        phone: "(21) 97738-8945",
        whatsapp: "5521977388945",
        hours: "Reuniões públicas aos sábados, às 18h",
        map_query: "Av. A, lote 32, quadra 34, área 04 - Nova Campinas, Duque de Caxias - RJ",
        reviews_url: "https://share.google/DwbRMCLsFoa9Sb4xF",
        business_url: ""
      }
    },
    {
      key: "reviews",
      title: "Avaliações (curadoria manual)",
      help: "Copie avaliações da ficha do Google com autorização de quem escreveu. Use iniciais ou \"Frequentador(a)\", nunca o nome completo. Sem API paga: a Casa atualiza esta lista.",
      list: true,
      itemFields: [
        { name: "rating", label: "Nota", type: "select", options: ["5", "4", "3", "2", "1"] },
        { name: "author", label: "Autor (iniciais ou \"Frequentador(a)\")", type: "text", max: 40, required: true },
        { name: "text", label: "Texto da avaliação", type: "textarea", max: 600, required: true },
        { name: "date", label: "Mês e ano (AAAA-MM)", type: "text", max: 7 },
        { name: "enabled", label: "Exibir", type: "bool" }
      ],
      defaults: []
    },
    {
      key: "contact",
      title: "Contato",
      help: "Canal público de contato. Não coletamos dados pessoais por aqui.",
      fields: [
        { name: "email", label: "E-mail de contato", type: "email" }
      ],
      defaults: { email: "allankardecceak@gmail.com" }
    },
    {
      key: "social",
      title: "Redes sociais",
      help: "Aparecem na seção de contato. Use a ordem para definir a sequência. Só links https são exibidos.",
      list: true,
      itemFields: [
        { name: "network", label: "Rede", type: "select", options: ["instagram", "facebook", "youtube", "tiktok", "x", "linkedin", "other"] },
        { name: "label", label: "Texto do link", type: "text", max: 40 },
        { name: "url", label: "Endereço (https://)", type: "url", required: true },
        { name: "enabled", label: "Exibir", type: "bool" }
      ],
      defaults: [
        { network: "youtube", label: "Canal no YouTube", url: "https://www.youtube.com/@allankardeccceak9167", enabled: true }
      ]
    },
    {
      key: "hero",
      title: "Página inicial · Destaque",
      help: "Bloco principal no topo da página.",
      fields: [
        { name: "eyebrow", label: "Texto pequeno acima do título", type: "text", max: 80 },
        { name: "title", label: "Título", type: "textarea", max: 120, required: true },
        { name: "subtitle", label: "Subtítulo", type: "textarea", max: 260 },
        { name: "cta_primary_text", label: "Botão principal (texto)", type: "text", max: 40 },
        { name: "cta_primary_href", label: "Botão principal (destino)", type: "text", max: 120 },
        { name: "cta_secondary_text", label: "Botão secundário (texto)", type: "text", max: 40 },
        { name: "cta_secondary_href", label: "Botão secundário (destino)", type: "text", max: 120 }
      ],
      defaults: {
        eyebrow: "Duque de Caxias · RJ",
        title: "Casa de Cultura Espírita Allan Kardec",
        subtitle: "Um espaço de estudo, acolhimento e divulgação da Doutrina Espírita. TODO: revisar este texto com a Casa.",
        cta_primary_text: "Como chegar",
        cta_primary_href: "#localizacao",
        cta_secondary_text: "Fale conosco",
        cta_secondary_href: "#contato"
      }
    },
    {
      key: "features",
      title: "Página inicial · Recursos",
      help: "Cartões da seção de recursos. Ícones disponíveis: bolt, offline, a11y, lock. Sem itens, a seção não aparece.",
      list: true,
      itemFields: [
        { name: "icon", label: "Ícone", type: "select", options: ["bolt", "offline", "a11y", "lock"] },
        { name: "title", label: "Título", type: "text", max: 60, required: true },
        { name: "text", label: "Texto", type: "textarea", max: 220 },
        { name: "enabled", label: "Exibir", type: "bool" }
      ],
      defaults: []
    },
    {
      key: "faq",
      title: "Página inicial · Perguntas frequentes",
      help: "Perguntas exibidas na seção de perguntas. Sem itens, a seção não aparece.",
      list: true,
      itemFields: [
        { name: "question", label: "Pergunta", type: "text", max: 160, required: true },
        { name: "answer", label: "Resposta", type: "textarea", max: 600, required: true },
        { name: "enabled", label: "Exibir", type: "bool" }
      ],
      defaults: []
    },
    {
      key: "legal",
      title: "Dados legais",
      help: "Usados nas páginas de privacidade e termos. Confirme com o responsável antes de publicar.",
      fields: [
        { name: "controller_name", label: "Controlador (razão social)", type: "text", max: 120 },
        { name: "controller_document", label: "CNPJ do controlador", type: "text", max: 20 },
        { name: "dpo_name", label: "Encarregado de dados (nome ou função)", type: "text", max: 80 },
        { name: "dpo_email", label: "E-mail do encarregado", type: "email" },
        { name: "forum", label: "Comarca do foro", type: "text", max: 80 }
      ],
      defaults: {
        controller_name: "Casa de Cultura Espírita Allan Kardec",
        controller_document: "07.174.471/0001-65",
        dpo_name: "",
        dpo_email: "",
        forum: "Duque de Caxias (RJ)"
      }
    },
    {
      key: "flags",
      title: "Seções ligadas ou desligadas",
      help: "Desative seções inteiras sem tocar em código.",
      fields: [
        { name: "show_reviews", label: "Mostrar avaliações", type: "bool" },
        { name: "show_map", label: "Mostrar mapa e localização", type: "bool" },
        { name: "show_social", label: "Mostrar redes sociais", type: "bool" },
        { name: "show_contact", label: "Mostrar contato", type: "bool" },
        { name: "show_features", label: "Mostrar a seção de recursos", type: "bool" },
        { name: "show_steps", label: "Mostrar a seção 'Como funciona'", type: "bool" },
        { name: "show_faq", label: "Mostrar perguntas frequentes", type: "bool" },
        { name: "show_install", label: "Mostrar a seção de instalação do app", type: "bool" },
        { name: "show_accessibility", label: "Mostrar a seção de acessibilidade", type: "bool" }
      ],
      defaults: {
        show_reviews: true,
        show_map: true,
        show_social: true,
        show_contact: true,
        show_features: false,
        show_steps: false,
        show_faq: true,
        show_install: true,
        show_accessibility: false
      }
    }
  ];

  /** Mescla valores publicados sobre os padrões, seção a seção. Ignora tipos errados. */
  function merge(published) {
    var out = {};
    SECTIONS.forEach(function (section) {
      var pub = published && published[section.key];
      if (section.list) {
        out[section.key] = Array.isArray(pub) ? pub : clone(section.defaults);
      } else {
        out[section.key] = Object.assign(clone(section.defaults), isObject(pub) ? pub : {});
      }
    });
    return out;
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }

  global.CCEAK_CONFIG = { SECTIONS: SECTIONS, merge: merge, clone: clone };
})(window);
