/*
 * cceak · Intelie — service worker
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Estratégia:
 *  - Navegação (HTML): rede primeiro; sem rede, página salva; sem nada, offline.html.
 *  - Arquivos estáticos do shell: stale-while-revalidate (responde rápido e atualiza em segundo plano).
 *  - Outras origens e métodos não GET: não são interceptados.
 * Ao publicar mudanças no shell, aumente VERSION para limpar o cache antigo.
 */
const VERSION = "v16";
const CACHE = `cceak-${VERSION}`;

const SHELL = [
  "/",
  "/offline.html",
  "/assets/css/base.css",
  "/assets/js/app.js",
  "/manifest.webmanifest",
  "/assets/img/icon.svg",
  "/assets/img/icon-192.png",
  "/assets/img/icon-512.png",
  "/assets/img/icon-maskable-512.png",
  "/assets/img/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Área administrativa nunca vai para o cache (CTRL-02/07); URLs com query não são cacheadas.
  if (url.pathname.startsWith("/admin")) return;
  if (url.search) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    return offline || new Response("Sem conexão.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
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
