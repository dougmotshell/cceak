#!/usr/bin/env node
/*
 * Verificação estática do site (web/) sem dependências externas.
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Cobre: links e assets locais existentes, ids referenciados por ARIA e âncoras,
 * landmarks e h1, texto alternativo em imagens, ausência de script/estilo inline
 * (compatível com a CSP de web/vercel.json), manifesto e lista de pré-cache do service worker.
 * Saída: lista de falhas; código de saída 1 se houver alguma.
 *
 * Uso: node scripts/check-site.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
const failures = [];
const fail = (file, msg) => failures.push(`${relative(root, file) || file}: ${msg}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Resolve uma URL local (/x) para um arquivo existente em web/. */
function resolveLocal(url) {
  const clean = url.split(/[?#]/)[0];
  const candidates = [
    join(root, clean),
    join(root, clean, "index.html"),
    join(root, `${clean}.html`),
  ];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
}

const htmlFiles = walk(root).filter((f) => f.endsWith(".html"));

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");

  if (!/<html[^>]*\blang="pt-BR"/i.test(html)) fail(file, 'falta <html lang="pt-BR">');
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, "falta <title>");
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) fail(file, `esperado 1 <h1>, encontrado ${h1Count}`);
  if (!/<main[^>]*\bid="conteudo"/i.test(html)) fail(file, 'falta <main id="conteudo">');
  if (!/class="skip-link"/.test(html)) fail(file, "falta link de pular para o conteúdo");

  // Imagens com alt
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=/.test(tag)) fail(file, `imagem sem alt: ${tag.slice(0, 80)}`);
  }

  // Inline: proibido pela CSP (style-src/script-src 'self')
  if (/\sstyle\s*=/i.test(html)) fail(file, "atributo style inline (viola CSP)");
  if (/\son[a-z]+\s*=/i.test(html)) fail(file, "handler on* inline (viola CSP)");
  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/gi)) {
    const isJsonLd = /type="application\/ld\+json"/i.test(attrs);
    if (!/\bsrc=/.test(attrs) && !isJsonLd) fail(file, "script inline (viola CSP)");
  }

  // Ids existentes na página
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const [, attr, value] of html.matchAll(/\b(aria-controls|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
    for (const id of value.split(/\s+/)) {
      if (id && !ids.has(id)) fail(file, `${attr} aponta para id inexistente "${id}"`);
    }
  }

  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
    if (anchor && !ids.has(anchor)) fail(file, `âncora #${anchor} sem alvo`);
  }

  // Links e assets locais
  // (?<![-\w]) evita casar data-cfg-href, que é preenchido em runtime pelo site-config.js
  for (const [, url] of html.matchAll(/(?<![-\w])(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
    if (!url.startsWith("/")) {
      fail(file, `caminho relativo não suportado: ${url}`);
      continue;
    }
    if (!resolveLocal(url)) fail(file, `destino local inexistente: ${url}`);
  }
}

// Manifesto
const manifestPath = join(root, "manifest.webmanifest");
try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const icon of manifest.icons || []) {
    if (!resolveLocal(icon.src)) fail(manifestPath, `ícone inexistente: ${icon.src}`);
  }
  if (!manifest.name || !manifest.short_name) fail(manifestPath, "name/short_name ausentes");
  if (!manifest.icons?.some((i) => i.purpose === "maskable")) fail(manifestPath, "falta ícone maskable");
  if (!["standalone", "fullscreen", "minimal-ui"].includes(manifest.display)) fail(manifestPath, "display inadequado");
} catch (err) {
  fail(manifestPath, `JSON inválido: ${err.message}`);
}

// Service worker: cada item do pré-cache deve existir
const swPath = join(root, "sw.js");
const sw = readFileSync(swPath, "utf8");
const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellBlock) {
  fail(swPath, "lista SHELL não encontrada");
} else {
  for (const [, url] of shellBlock[1].matchAll(/"([^"]+)"/g)) {
    if (!resolveLocal(url)) fail(swPath, `pré-cache aponta para arquivo inexistente: ${url}`);
  }
}

// vercel.json válido e com CSP presente
const vercelPath = join(root, "vercel.json");
try {
  const config = JSON.parse(readFileSync(vercelPath, "utf8"));
  const headers = (config.headers || []).flatMap((h) => h.headers || []);
  if (!headers.some((h) => h.key === "Content-Security-Policy")) fail(vercelPath, "falta Content-Security-Policy");
} catch (err) {
  fail(vercelPath, `JSON inválido: ${err.message}`);
}

if (failures.length) {
  console.error(`FALHOU: ${failures.length} problema(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: ${htmlFiles.length} páginas HTML, manifesto, service worker e vercel.json verificados.`);
