/*
 * cceak · Intelie — comportamento do site
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Sem dependências e sem build. Tudo que toca armazenamento fica em try/catch:
 * o site precisa funcionar mesmo com cookies ou localStorage bloqueados.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var COOKIE_NAME = "cceak_consent";
  var CONSENT_DAYS = 180;
  var THEME_KEY = "cceak-theme";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Armazenamento tolerante a falhas ---------- */
  function readTheme() {
    try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function writeTheme(value) {
    try { window.localStorage.setItem(THEME_KEY, value); } catch (e) { /* bloqueado: ignora */ }
  }

  function readConsent() {
    var match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
    if (!match) return null;
    try { return JSON.parse(decodeURIComponent(match[1])); } catch (e) { return null; }
  }

  function writeConsent(analytics) {
    var value = encodeURIComponent(JSON.stringify({ v: 1, analytics: analytics, ts: Date.now() }));
    var secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = COOKIE_NAME + "=" + value + "; Max-Age=" + CONSENT_DAYS * 86400 +
      "; Path=/; SameSite=Lax" + secure;
  }

  /* ---------- Tema claro/escuro ---------- */
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit) return explicit;
    return systemDark.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    // Só o glifo muda; o nome acessível é o texto visível do botão (WCAG 2.5.3).
    var glyph = document.querySelector("#theme-toggle .theme-glyph");
    if (glyph) glyph.textContent = theme === "dark" ? "☀" : "☾";
  }

  var savedTheme = readTheme();
  if (savedTheme === "light" || savedTheme === "dark") applyTheme(savedTheme);
  else applyTheme(currentTheme());

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      writeTheme(next);
    });
  }

  /* ---------- Menu mobile ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.hidden = !open;
  }

  if (menuBtn && nav) {
    setMenu(false);
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target instanceof HTMLAnchorElement) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia("(min-width: 801px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Cabeçalho e progresso de leitura (um frame por rolagem) ---------- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".progress");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      progress.style.setProperty("--p", ratio.toFixed(4));
    }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- Revelar elementos ao entrar na tela ---------- */
  var revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealItems.forEach(function (el) { observer.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Instalação do app (PWA) ---------- */
  var installSection = document.getElementById("instalar");
  var installBtn = document.getElementById("install-btn");
  var deferredPrompt = null;
  var isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone && installSection) installSection.hidden = true;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    });
  }

  window.addEventListener("appinstalled", function () {
    if (installSection) installSection.hidden = true;
  });

  /* ---------- Service worker (somente em contexto seguro) ---------- */
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {
        /* Sem offline/instalação: o site continua funcionando normalmente. */
      });
    });
  }

  /* ---------- Banner de cookies ---------- */
  var banner = document.getElementById("cookie-banner");
  var manageBtn = document.getElementById("cookie-manage");

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function showBanner() {
    if (banner) banner.hidden = false;
  }

  if (banner) {
    var consent = readConsent();
    if (consent && consent.v === 1) hideBanner();
    else showBanner();

    banner.addEventListener("click", function (event) {
      var action = event.target && event.target.getAttribute("data-consent");
      if (action === "accept") writeConsent(true);
      else if (action === "reject") writeConsent(false);
      else return;
      hideBanner();
      if (manageBtn) manageBtn.focus();
    });
  }

  if (manageBtn) {
    manageBtn.addEventListener("click", showBanner);
  }

  /* ---------- Botão voltar ao topo ---------- */
  var toTop = document.getElementById("to-top");
  if (toTop) {
    var SHOW_AFTER = 600;

    /* Sem requestAnimationFrame: um frame que nunca dispara deixava o estado preso. */
    function updateToTop() {
      toTop.hidden = window.pageYOffset < SHOW_AFTER;
    }

    window.addEventListener("scroll", updateToTop, { passive: true });

    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var brand = document.querySelector(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });

    updateToTop();
  }
})();
