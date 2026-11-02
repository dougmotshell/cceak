#!/usr/bin/env node
/*
 * cceak · Intelie — verificação estática do PWA (sem rede, sem dependências).
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Checa, somente leitura:
 *  1. Manifesto: campos obrigatórios, start_url dentro do scope, cores #rrggbb, display.
 *  2. Ícones: arquivo existe, MIME coerente com a extensão, PNG com dimensões declaradas,
 *     192 e 512 em PNG, um maskable, orçamento de tamanho por arquivo.
 *  3. Atalhos: URL local existente e ícone existente.
 *  4. index.html com link para o manifesto e theme-color; app.js registra /sw.js com escopo "/".
 *  5. sw.js: VERSION; SHELL com itens existentes; inclui "/", "/offline.html" e os ícones do manifesto;
 *     nenhum item em /admin ou com query; guarda contra /admin no fetch.
 *  6. Se SHELL mudou em relação ao HEAD do git e VERSION não mudou: falha.
 *
 * Saída: falhas e avisos; código 1 se houver falha, 0 caso contrário.
 * Uso (na raiz do repositório): node scripts/pwa-check.mjs
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(repo, "web");
const failures = [];
const warnings = [];
const fail = (file, msg) => failures.push(`${relative(repo, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(repo, file)}: ${msg}`);

const ICON_BUDGET_BYTES = 512 * 1024; // orçamento por ícone
const SHELL_BUDGET_BYTES = 5 * 1024 * 1024; // orçamento total do pré-cache
const MIME = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg" };

/** Lê largura e altura do cabeçalho IHDR de um PNG; null se não for PNG. */
function pngSize(path) {
  const b = readFileSync(path);
  const sig = "89504e470d0a1a0a";
  if (b.length < 24 || b.subarray(0, 8).toString("hex") !== sig) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Resolve uma URL local (/x) para um arquivo existente em web/. */
function resolveLocal(url) {
  const clean = url.split(/[?#]/)[0];
  const candidates = [join(web, clean), join(web, clean, "index.html"), join(web, `${clean}.html`)];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
}

// 1. Manifesto
const manifestPath = join(web, "manifest.webmanifest");
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (err) {
  fail(manifestPath, `JSON inválido: ${err.message}`);
}
if (manifest) {
  for (const k of ["name", "short_name", "start_url", "scope", "display", "icons"]) {
    if (!manifest[k]) fail(manifestPath, `campo obrigatório ausente: ${k}`);
  }
  if (manifest.lang && manifest.lang !== "pt-BR") warn(manifestPath, `lang é ${manifest.lang}, o site é pt-BR`);
  if (!["standalone", "fullscreen", "minimal-ui"].includes(manifest.display)) fail(manifestPath, `display inadequado: ${manifest.display}`);
  if (manifest.start_url && manifest.scope && !manifest.start_url.startsWith(manifest.scope)) {
    fail(manifestPath, "start_url fora do scope");
  }
  for (const k of ["theme_color", "background_color"]) {
    if (manifest[k] && !/^#[0-9a-f]{6}$/i.test(manifest[k])) fail(manifestPath, `${k} deve ser #rrggbb`);
  }
  if (!manifest.id) warn(manifestPath, "campo id ausente (recomendado para identidade estável)");

  // 2. Ícones
  const icons = manifest.icons || [];
  for (const icon of icons) {
    const file = resolveLocal(icon.src);
    if (!file) {
      fail(manifestPath, `ícone inexistente: ${icon.src}`);
      continue;
    }
    const ext = extname(file).toLowerCase();
    const size = statSync(file).size;
    if (size > ICON_BUDGET_BYTES) fail(file, `ícone acima do orçamento (${size} bytes)`);
    if (icon.type && MIME[ext] && icon.type !== MIME[ext]) fail(manifestPath, `type ${icon.type} não bate com ${ext} em ${icon.src}`);
    if (ext === ".png") {
      const dim = pngSize(file);
      if (!dim) fail(file, "extensão .png mas conteúdo não é PNG");
      else if (icon.sizes && icon.sizes !== "any") {
        const [w, h] = icon.sizes.split("x").map(Number);
        if (dim.width !== w || dim.height !== h) fail(file, `dimensão real ${dim.width}x${dim.height} difere da declarada ${icon.sizes}`);
      }
    } else if (ext === ".svg") {
      const head = readFileSync(file, "utf8").slice(0, 200);
      if (!/<svg|<\?xml/i.test(head)) fail(file, "extensão .svg mas conteúdo não parece SVG");
    }
  }
  const pngSizes = icons.filter((i) => i.src.endsWith(".png")).map((i) => i.sizes);
  for (const need of ["192x192", "512x512"]) {
    if (!pngSizes.includes(need)) fail(manifestPath, `falta ícone PNG ${need} (critério de instalação)`);
  }
  if (!icons.some((i) => i.purpose === "maskable")) fail(manifestPath, "falta ícone maskable");

  // 3. Atalhos
  for (const sc of manifest.shortcuts || []) {
    if (sc.url && !resolveLocal(sc.url)) fail(manifestPath, `atalho aponta para destino inexistente: ${sc.url}`);
    for (const ic of sc.icons || []) {
      if (!resolveLocal(ic.src)) fail(manifestPath, `ícone de atalho inexistente: ${ic.src}`);
    }
  }
}

// 4. HTML e registro do service worker
const indexPath = join(web, "index.html");
const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
if (!/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/.test(indexHtml)) fail(indexPath, "falta <link rel=\"manifest\">");
if (!/name="theme-color"/.test(indexHtml)) fail(indexPath, "falta meta theme-color");
if (!/apple-touch-icon/.test(indexHtml)) warn(indexPath, "sem apple-touch-icon (iOS usa o ícone da página)");

const appPath = join(web, "assets", "js", "app.js");
const app = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
if (!/serviceWorker\.register\(\s*"\/sw\.js"\s*,\s*\{\s*scope:\s*"\/"/.test(app)) {
  fail(appPath, 'registro do service worker ausente ou sem scope "/"');
}

// 5. Service worker
const swPath = join(web, "sw.js");
const sw = readFileSync(swPath, "utf8");
const version = sw.match(/const VERSION = "([^"]+)"/)?.[1];
if (!version) fail(swPath, "const VERSION ausente");
const shellMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
const shell = shellMatch ? [...shellMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : null;
if (!shell) {
  fail(swPath, "lista SHELL não encontrada");
} else {
  let bytes = 0;
  for (const url of shell) {
    if (url.startsWith("/admin")) fail(swPath, `SHELL inclui área administrativa: ${url}`);
    if (url.includes("?")) fail(swPath, `SHELL inclui URL com query: ${url}`);
    const file = resolveLocal(url);
    if (!file) fail(swPath, `pré-cache aponta para arquivo inexistente: ${url}`);
    else bytes += statSync(file).size;
  }
  if (bytes > SHELL_BUDGET_BYTES) fail(swPath, `pré-cache acima do orçamento (${bytes} bytes)`);
  for (const must of ["/", "/offline.html"]) {
    if (!shell.includes(must)) fail(swPath, `SHELL deve conter ${must}`);
  }
  if (manifest?.start_url && !shell.includes(manifest.start_url)) warn(swPath, `start_url ${manifest.start_url} fora do SHELL`);
  for (const icon of manifest?.icons || []) {
    if (!shell.includes(icon.src)) warn(swPath, `ícone do manifesto fora do SHELL: ${icon.src}`);
  }
  if (!sw.includes('startsWith("/admin")')) fail(swPath, "fetch sem exclusão de /admin");
  if (!sw.includes("if (url.search) return;")) warn(swPath, "fetch sem exclusão de URLs com query");

  // Mudança de SHELL sem subir VERSION
  try {
    const previous = execFileSync("git", ["show", "HEAD:web/sw.js"], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const prevShell = previous.match(/const SHELL = \[([\s\S]*?)\];/)?.[1];
    const prevVersion = previous.match(/const VERSION = "([^"]+)"/)?.[1];
    const normalize = (s) => [...(s || "").matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("|");
    if (prevShell && normalize(prevShell) !== normalize(shellMatch?.[1]) && prevVersion === version) {
      fail(swPath, `SHELL mudou em relação ao HEAD sem subir VERSION (${version})`);
    }
  } catch {
    warn(swPath, "git indisponível ou sem HEAD: comparação de VERSION não feita");
  }
}

const summary = `ícones: ${manifest?.icons?.length ?? 0}; pré-cache: ${shell?.length ?? 0} itens; VERSION: ${version ?? "?"}`;
for (const w of warnings) console.warn(`AVISO: ${w}`);
if (failures.length) {
  console.error(`FALHOU: ${failures.length} problema(s) (${summary})`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: PWA verificado (${summary}); ${warnings.length} aviso(s).`);
