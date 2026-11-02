#!/usr/bin/env node
/*
 * cceak · Intelie
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Verificação estática de SEO sobre web/ (somente leitura, sem rede, sem dependências).
 * Cobre: título e meta description (tamanho), canonical absoluto em https, Open Graph
 * com og:image absoluto, robots (noindex nas páginas privadas e ausência nas públicas),
 * JSON-LD válido, robots.txt com linha Sitemap, e sitemap.xml cobrindo as páginas indexáveis.
 * Saída: lista de falhas; código de saída 1 se houver alguma.
 *
 * Uso: node scripts/seo-check.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
const failures = [];
const fail = (file, msg) => failures.push(`${relative(root, file) || file}: ${msg}`);

// Limites de texto (caracteres). Propostos; ajuste com o responsável pelo conteúdo.
const LIMITS = { titleMin: 15, titleMax: 65, descMin: 50, descMax: 160 };

// Páginas que não devem ser indexadas (caminho relativo a web/).
const PRIVATE_PAGES = ["admin/index.html", "404.html", "offline.html"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];

function metaContent(html, key, value) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(tag, key) === value) return attr(tag, "content");
  }
  return undefined;
}

/** Caminho público de uma página HTML (web/termos/index.html -> /termos/). */
function pagePath(rel) {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

const htmlFiles = walk(root).filter((f) => f.endsWith(".html"));
const indexablePaths = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = relative(root, file).split("\\").join("/");
  const isPrivate = PRIVATE_PAGES.includes(rel);
  const robots = metaContent(html, "name", "robots") ?? "";

  // Título
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  if (!title) fail(file, "título vazio ou ausente");
  else if (!isPrivate && (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)) {
    fail(file, `título com ${title.length} caracteres (esperado ${LIMITS.titleMin}-${LIMITS.titleMax})`);
  }

  // Meta description
  const desc = metaContent(html, "name", "description");
  if (desc === undefined) {
    if (!isPrivate) fail(file, "falta <meta name=\"description\">");
  } else if (!isPrivate && (desc.length < LIMITS.descMin || desc.length > LIMITS.descMax)) {
    fail(file, `description com ${desc.length} caracteres (esperado ${LIMITS.descMin}-${LIMITS.descMax})`);
  }

  // Viewport (presença; a acessibilidade do zoom é checada por scripts/a11y-check.mjs)
  if (metaContent(html, "name", "viewport") === undefined) fail(file, "falta meta viewport");

  // Robots: privadas precisam de noindex; públicas não podem ter noindex
  if (isPrivate && !/noindex/i.test(robots)) fail(file, "página privada sem <meta name=\"robots\" content=\"noindex\">");
  if (!isPrivate && /noindex/i.test(robots)) fail(file, `página pública com noindex (${robots})`);

  if (!isPrivate) {
    indexablePaths.push(pagePath(rel));

    // Canonical absoluto em https
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map(([tag]) => tag)
      .find((tag) => /\brel="canonical"/i.test(tag));
    const href = canonical ? attr(canonical, "href") : undefined;
    if (!href) fail(file, "falta <link rel=\"canonical\">");
    else if (!href.startsWith("https://")) fail(file, `canonical não absoluto em https: ${href}`);
    else if (href.includes("TODO")) fail(file, "canonical com placeholder TODO");

    // Open Graph
    for (const prop of ["og:title", "og:description", "og:image", "og:type", "og:locale"]) {
      if (metaContent(html, "property", prop) === undefined) fail(file, `falta ${prop}`);
    }
    const ogImage = metaContent(html, "property", "og:image") ?? "";
    if (ogImage && !ogImage.startsWith("https://")) {
      fail(file, `og:image deve ser URL absoluta em https (atual: ${ogImage})`);
    }
  }

  // JSON-LD válido
  for (const [, body] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(body);
    } catch (err) {
      fail(file, `JSON-LD inválido: ${err.message}`);
    }
  }
}

// robots.txt
const robotsPath = join(root, "robots.txt");
if (!existsSync(robotsPath)) {
  fail(robotsPath, "robots.txt ausente");
} else {
  const txt = readFileSync(robotsPath, "utf8");
  if (!/^Sitemap:\s*https:\/\//im.test(txt)) fail(robotsPath, "falta linha 'Sitemap: https://...'");
  if (/^Disallow:\s*\/\s*$/im.test(txt)) fail(robotsPath, "'Disallow: /' bloqueia o site inteiro");
}

// sitemap.xml
const sitemapPath = join(root, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  fail(sitemapPath, "sitemap.xml ausente");
} else {
  const xml = readFileSync(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) fail(sitemapPath, "nenhum <loc> encontrado");
  const listedPaths = new Set();
  for (const loc of locs) {
    if (!loc.startsWith("https://")) {
      fail(sitemapPath, `<loc> não é https: ${loc}`);
      continue;
    }
    listedPaths.add(new URL(loc).pathname);
  }
  for (const p of indexablePaths) {
    if (!listedPaths.has(p)) fail(sitemapPath, `página indexável ausente do sitemap: ${p}`);
  }
  for (const p of listedPaths) {
    if (!indexablePaths.includes(p)) fail(sitemapPath, `sitemap lista caminho que não é página indexável: ${p}`);
  }
}

if (failures.length) {
  console.error(`FALHOU: ${failures.length} problema(s) de SEO`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: SEO verificado em ${htmlFiles.length} páginas, robots.txt e sitemap.xml (${indexablePaths.length} indexáveis).`);
