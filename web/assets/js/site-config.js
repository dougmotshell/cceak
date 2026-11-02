/*
 * cceak — aplica a configuração central (Supabase) ao site público
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Fluxo: padrões (config-schema.js) <- última cópia válida (localStorage) <- Supabase (rede).
 * Todo texto vem do banco e é gravado com textContent. Nada é inserido como HTML,
 * e links só aceitam esquemas seguros (#, /, https, mailto).
 */
(function () {
  "use strict";

  var CONFIG = window.CCEAK_CONFIG;
  var ENV = window.CCEAK_ENV || {};
  var CACHE_KEY = "cceak-config-cache";
  var root = document.documentElement;

  var ICONS = {
    bolt: [["path", { d: "M13 2 3 14h9l-1 8 10-12h-9z" }]],
    offline: [["path", { d: "M1 1l22 22" }], ["path", { d: "M16.7 11.1A10.9 10.9 0 0 1 22 12.5" }], ["path", { d: "M5 12.6a10.9 10.9 0 0 1 4.1-2.4" }], ["path", { d: "M2 8.8a15.9 15.9 0 0 1 4-2.8" }], ["path", { d: "M8.5 16.4a5.4 5.4 0 0 1 4.3-1.4" }], ["path", { d: "M12 20h.01" }]],
    a11y: [["circle", { cx: "12", cy: "4.5", r: "2" }], ["path", { d: "M4 7.5h16" }], ["path", { d: "M12 7.5v5" }], ["path", { d: "m8 21 4-8.5 4 8.5" }]],
    lock: [["rect", { x: "4", y: "11", width: "16", height: "10", rx: "2" }], ["path", { d: "M8 11V7a4 4 0 0 1 8 0v4" }]]
  };

  function svgIcon(name) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    var attrs = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    var spec = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : ICONS.bolt;
    spec.forEach(function (item) {
      var node = document.createElementNS(NS, item[0]);
      Object.keys(item[1]).forEach(function (k) { node.setAttribute(k, item[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  var SAFE_HREF = /^(#|\/(?![\/\\])|https:\/\/|mailto:)/;
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function safeHref(value) {
    return typeof value === "string" && SAFE_HREF.test(value) ? value : null;
  }

  /** Luminância relativa (WCAG) para checar contraste da cor principal com texto branco. */
  function contrastWithWhite(hex) {
    var n = parseInt(hex.slice(1), 16);
    var lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    return 1.05 / (lum + 0.05);
  }

  function setMeta(selector, value) {
    var node = document.querySelector(selector);
    if (node && value) node.setAttribute("content", value);
  }

  function applyBrandColor(color) {
    // Só aplica cor que atenda 4,5:1 com o texto branco do botão principal.
    if (typeof color === "string" && HEX.test(color) && contrastWithWhite(color) >= 4.5) {
      root.style.setProperty("--primary", color);
      setMeta('meta[name="theme-color"][media*="light"]', color);
    }
  }

  function bindText(cfg) {
    document.querySelectorAll("[data-cfg]").forEach(function (node) {
      var path = node.getAttribute("data-cfg").split(".");
      var section = cfg[path[0]];
      var value = section && section[path[1]];
      if (typeof value === "string" && value !== "") node.textContent = value;
    });
    document.querySelectorAll("[data-cfg-href]").forEach(function (node) {
      var path = node.getAttribute("data-cfg-href").split(".");
      var section = cfg[path[0]];
      var value = section && section[path[1]];
      if (/email$/.test(path[1])) {
        // Sem e-mail válido, o link some: nunca mostra o texto de exemplo.
        var valid = typeof value === "string" && EMAIL.test(value);
        node.hidden = !valid;
        if (valid) {
          node.setAttribute("href", "mailto:" + value);
          node.textContent = value;
        }
        return;
      }
      var href = safeHref(value);
      if (href) node.setAttribute("href", href);
    });
  }

  function renderFeatures(items) {
    var grid = document.getElementById("features-grid");
    if (!grid) return;
    grid.textContent = "";
    items.filter(function (f) { return f.enabled !== false && f.title; }).forEach(function (f) {
      var card = el("article", "card reveal is-visible");
      var icon = el("span", "card-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.appendChild(svgIcon(f.icon));
      card.appendChild(icon);
      card.appendChild(el("h3", null, f.title));
      card.appendChild(el("p", null, f.text || ""));
      grid.appendChild(card);
    });
  }

  function renderFaq(items) {
    var list = document.getElementById("faq-list");
    if (!list) return;
    list.textContent = "";
    items.filter(function (q) { return q.enabled !== false && q.question; }).forEach(function (q) {
      var details = el("details");
      details.appendChild(el("summary", null, q.question));
      details.appendChild(el("p", null, q.answer || ""));
      list.appendChild(details);
    });
  }

  function renderSocial(items) {
    var list = document.getElementById("social-list");
    if (!list) return;
    list.textContent = "";
    items.filter(function (s) { return s.enabled !== false && safeHref(s.url) && s.url.indexOf("https://") === 0; })
      .forEach(function (s) {
        var li = el("li");
        var a = el("a", "btn btn--ghost", s.label || s.network || "Rede social");
        a.setAttribute("href", s.url);
        a.setAttribute("rel", "noopener noreferrer");
        a.setAttribute("target", "_blank");
        // Abre em nova aba: avisa leitores de tela sem depender de cor ou ícone.
        a.setAttribute("aria-label", (s.label || s.network || "Rede social") + " (abre em nova aba)");
        li.appendChild(a);
        list.appendChild(li);
      });
    var wrap = document.getElementById("social-wrap");
    if (wrap) wrap.hidden = list.childElementCount === 0;
  }

  /** Liga/desliga seções por flag. Recursos, passos e perguntas também somem quando estão vazios. */
  function applyFlags(flags, cfg) {
    var map = {
      show_install: "instalar",
      show_faq: "perguntas",
      show_contact: "contato",
      show_accessibility: "acessibilidade",
      show_features: "recursos",
      show_steps: "como-funciona",
      show_reviews: "avaliacoes",
      show_map: "localizacao",
      show_social: "redes"
    };
    Object.keys(map).forEach(function (flag) {
      var section = document.getElementById(map[flag]);
      if (section) section.hidden = flags[flag] === false;
    });
    var emptyRules = {
      recursos: cfg.features.length === 0,
      perguntas: cfg.faq.length === 0,
      avaliacoes: cfg.reviews.length === 0,
      redes: cfg.social.length === 0
    };
    Object.keys(emptyRules).forEach(function (id) {
      var section = document.getElementById(id);
      if (section && emptyRules[id]) section.hidden = true;
    });
  }

  function applyPageMeta(cfg) {
    var brand = cfg.brand;
    var seo = cfg.seo;
    // Título e descrição de SEO só valem para a página inicial; as páginas legais mantêm os seus.
    var isHome = !!document.getElementById("hero-titulo");
    if (brand.language) root.setAttribute("lang", brand.language);
    setMeta('meta[name="application-name"]', brand.name);
    if (!isHome) { applyBrandColor(brand.brand_color); return; }
    if (seo.title) document.title = seo.title;
    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[name="application-name"]', brand.name);
    applyBrandColor(brand.brand_color);
  }

  /** Avaliações curadas: texto com textContent; nota com rótulo acessível. */
  function renderReviews(items, reviewsUrl) {
    var list = document.getElementById("reviews-list");
    if (!list) return;
    list.textContent = "";
    var shown = items.filter(function (r) { return r.enabled !== false && r.text; });
    shown.forEach(function (r) {
      var rating = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
      var card = el("article", "card review");
      // Estrelas decorativas escondidas; a nota vai como texto para leitor de tela.
      var stars = el("p", "stars", "★".repeat(rating) + "☆".repeat(5 - rating));
      stars.setAttribute("aria-hidden", "true");
      card.appendChild(stars);
      card.appendChild(el("p", "visually-hidden", "Nota " + rating + " de 5"));
      card.appendChild(el("p", "review-text", r.text));
      var meta = (r.author || "Frequentador(a)") + (r.date ? " · " + r.date : "");
      card.appendChild(el("p", "review-meta", meta));
      list.appendChild(card);
    });
    var wrap = document.getElementById("reviews-wrap");
    if (wrap) wrap.hidden = shown.length === 0;
    var link = document.getElementById("reviews-link");
    var href = safeHref(reviewsUrl);
    if (link) {
      if (href) link.setAttribute("href", href);
      link.hidden = !href;
    }
  }

  /* ---------- Programação da Casa (tabela programacao, só atividades ativas) ---------- */
  var PROG_CACHE_KEY = "cceak-programacao-cache";
  var PROG_PATH = "/rest/v1/programacao?select=dia_label,hora_inicio,hora_fim,atividade,quem_pode,ordem" +
    "&ativo=eq.true&order=ordem.asc,hora_inicio.asc";

  function fmtHora(t) { return t ? String(t).slice(0, 5) : ""; }

  /** Cartões da programação. Texto sempre com textContent; a seção some se não houver atividades. */
  function renderProgramacao(rows) {
    var section = document.getElementById("programacao");
    var list = document.getElementById("programacao-list");
    if (!section || !list) return;
    list.textContent = "";
    (Array.isArray(rows) ? rows : []).forEach(function (p) {
      if (!p || !p.dia_label || !p.atividade) return;
      var li = el("li", "card");
      li.appendChild(el("h3", null, p.dia_label));
      var horario = fmtHora(p.hora_inicio) + (p.hora_fim ? " às " + fmtHora(p.hora_fim) : "");
      li.appendChild(el("p", "programacao-horario", horario));
      li.appendChild(el("p", null, p.atividade));
      li.appendChild(el("p", "review-meta", "Quem pode participar: " + (p.quem_pode || "Aberto ao público")));
      list.appendChild(li);
    });
    section.hidden = list.childElementCount === 0;
  }

  function readProgCache() {
    try {
      var raw = window.localStorage.getItem(PROG_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function loadProgramacao() {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;
    fetch(ENV.supabaseUrl.replace(/\/$/, "") + PROG_PATH, {
      headers: { apikey: ENV.supabaseAnonKey, Authorization: "Bearer " + ENV.supabaseAnonKey },
      signal: controller ? controller.signal : undefined,
      cache: "no-store"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        try { window.localStorage.setItem(PROG_CACHE_KEY, JSON.stringify(rows)); } catch (e) { /* bloqueado */ }
        renderProgramacao(rows);
      })
      .catch(function () { /* Sem rede: mantém o cache ou esconde a seção. */ })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  /** Endereço, telefone (tel:) e WhatsApp (wa.me), com dígitos validados. */
  function renderLocal(local) {
    var phoneDigits = String(local.phone || "").replace(/\D/g, "");
    var telLink = document.getElementById("phone-link");
    if (telLink && phoneDigits.length >= 10) {
      telLink.setAttribute("href", "tel:+55" + phoneDigits.replace(/^55/, ""));
      telLink.textContent = local.phone;
    }
    var waDigits = String(local.whatsapp || "").replace(/\D/g, "");
    ["whatsapp-link", "whatsapp-contact"].forEach(function (id) {
      var waLink = document.getElementById(id);
      if (!waLink) return;
      waLink.hidden = waDigits.length < 12;
      if (waDigits.length >= 12) waLink.setAttribute("href", "https://wa.me/" + waDigits);
    });
    var cepWrap = document.getElementById("cep-wrap");
    if (cepWrap) cepWrap.hidden = !local.cep;
    var mapLink = document.getElementById("business-link");
    var businessHref = safeHref(local.business_url);
    if (mapLink) {
      if (businessHref && businessHref.indexOf("https://") === 0) mapLink.setAttribute("href", businessHref);
      mapLink.hidden = !businessHref;
    }
    setupMap();
  }

  /* ---------- Mapa do Google: carrega só por clique ou quando a seção chega à tela ---------- */
  var MAP_SRC = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d353.000509880103!2d-43.25112448520865!3d-22.6429312392784!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9973579c4176a9%3A0xdc211daa60fc2910!2sCasa%20de%20Cultura%20Esp%C3%ADrita%20Allan%20Kardec!5e0!3m2!1sen!2sbr!4v1686405496701!5m2!1sen!2sbr";
  var mapMounted = false;

  function mountMap(box) {
    if (mapMounted || !box) return;
    mapMounted = true;
    var frame = el("iframe", "map-frame");
    frame.setAttribute("title", "Mapa: Casa de Cultura Espírita Allan Kardec no Google Maps");
    frame.setAttribute("loading", "lazy");
    frame.setAttribute("src", MAP_SRC);
    box.textContent = "";
    box.appendChild(frame);
  }

  function setupMap() {
    var box = document.getElementById("map-box");
    if (!box || box.dataset.mapReady) return;
    box.dataset.mapReady = "1";
    var button = document.getElementById("map-load");
    if (button) button.addEventListener("click", function () { mountMap(box); });
    if (typeof IntersectionObserver === "function") {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          mountMap(box);
        }
      }, { rootMargin: "200px 0px" });
      io.observe(box);
    }
  }

  function apply(cfg) {
    applyPageMeta(cfg);
    bindText(cfg);
    renderFeatures(cfg.features);
    renderFaq(cfg.faq);
    renderSocial(cfg.social);
    renderReviews(cfg.reviews, cfg.local.reviews_url);
    renderLocal(cfg.local);
    applyFlags(cfg.flags, cfg);
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(published) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(published)); } catch (e) { /* bloqueado */ }
  }

  /** Converte as linhas do banco ({key, value}) em um objeto por seção. */
  function rowsToObject(rows) {
    var out = {};
    rows.forEach(function (row) { out[row.key] = row.value; });
    return out;
  }

  function load() {
    var cached = readCache();
    apply(CONFIG.merge(cached));
    renderProgramacao(readProgCache());

    if (!ENV.supabaseUrl || !ENV.supabaseAnonKey || !window.fetch) return;
    loadProgramacao();

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;

    fetch(ENV.supabaseUrl.replace(/\/$/, "") + "/rest/v1/site_settings?select=key,value", {
      headers: { apikey: ENV.supabaseAnonKey, Authorization: "Bearer " + ENV.supabaseAnonKey },
      signal: controller ? controller.signal : undefined,
      cache: "no-store"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        var published = rowsToObject(rows);
        writeCache(published);
        apply(CONFIG.merge(published));
      })
      .catch(function () {
        /* Sem rede: permanece com o cache ou com os padrões já aplicados. */
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  if (CONFIG) load();
})();
