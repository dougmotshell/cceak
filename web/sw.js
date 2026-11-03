/* * * Estratégia: * - Navegação (HTML): rede primeiro; sem rede, página salva; sem nada, offline.html. * - Shell estático (páginas, CSS, JS, imagens da marca): stale-while-revalidate. * - Leituras públicas do Supabase (site_settings, programacao, estudos), feitas com a chave anon: * rede primeiro com limite de tempo; sem rede, a última resposta salva. Requisições com sessão * de usuário (Authorization diferente da chave anon) nunca são gravadas. * - Área administrativa, métodos não GET e outras origens: não são interceptados. * * Ao mudar qualquer arquivo do shell (ou SHELL), aumente VERSION: o cache antigo é removido. * Cada item do pré-cache é gravado separadamente: um arquivo ausente não impede a instalação. */
const VERSION = "v21";
const CACHE = `cceak-${VERSION}`;
const DATA_CACHE = "cceak-data";
const NETWORK_TIMEOUT_MS = 5000;
const SHELL = [
  "/",
  "/offline.html",
  "/estudos",
  "/privacidade",
  "/termos",
  "/cookies",
  "/assets/css/base.css",
  "/assets/js/app.js",
  "/assets/js/config-schema.js",
  "/assets/js/site-config.js",
  "/assets/js/estudos.js",
  "/assets/js/env.js",
  "/manifest.webmanifest",
  "/assets/img/icon.svg",
  "/assets/img/icon-192.png",
  "/assets/img/icon-512.png",
  "/assets/img/icon-maskable-512.png",
  "/assets/img/apple-touch-icon.png",
  "/assets/img/casa/logo-allan-kardec.png",
  "/assets/img/casa/allan-kardec.png",
  "/assets/img/casa/banner-claro.jpg",
  "/assets/img/casa/banner-escuro.jpg"
]; /** Leituras anônimas e públicas do Supabase que o site guarda para uso offline. */
const PUBLIC_REST = /^\/rest\/v1\/(site_settings|programacao|estudos)$/;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(
          SHELL.map((url) =>
            cache.add(url).catch((err) => console.warn("[cceak-sw] pré-cache ignorado:", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url); // Dados públicos do Supabase: a origem é diferente, por isso vem antes do filtro de origem. if (isPublicRest(request, url)) { event.respondWith(restNetworkFirst(request)); return; } if (url.origin !== self.location.origin) return; // Área administrativa nunca vai para o cache (CTRL-02/07). if (url.pathname.startsWith("/admin")) return; if (request.mode === "navigate") { event.respondWith(networkFirst(request)); return; } // Outros recursos com query (ex.: ?v=...) não são cacheados. if (url.search) return; event.respondWith(staleWhileRevalidate(request));
}); /** Verdadeiro só para leitura anônima (Bearer = chave anon) de uma tabela pública. */
function isPublicRest(request, url) {
  if (!PUBLIC_REST.test(url.pathname)) return false;
  const key = request.headers.get("apikey");
  return Boolean(key) && request.headers.get("authorization") === `Bearer ${key}`;
}
async function restNetworkFirst(request) {
  const data = await caches.open(DATA_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) data.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await data.match(request);
    if (cached) return cached;
    return new Response("[]", {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && !url.search) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    return (
      offline ||
      new Response("Sem conexão.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    );
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
