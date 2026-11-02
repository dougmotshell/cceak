#!/usr/bin/env node
/*
 * cceak · Intelie — verificação local de integrações Google (sem rede, sem dependências).
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Checa somente arquivos do repositório:
 *  1. Domínios Google usados em web/ estão permitidos pela diretiva CSP correta (web/vercel.json).
 *  2. Domínios Google na CSP sem uso em web/ são avisos (menor privilégio).
 *  3. Nenhuma chave de API Google (AIza...) nem segredo OAuth versionado (o valor nunca é impresso).
 *  4. Se Google Analytics é usado, web/privacidade/ menciona o Google.
 *
 * Saída: falhas e avisos; código 1 se houver falha, 0 caso contrário.
 * Uso (na raiz do repositório): node scripts/google-apis-check.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(repo, "web");
const vercelPath = join(webDir, "vercel.json");
const failures = [];
const warnings = [];
const fail = (file, msg) => failures.push(`${relative(repo, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(repo, file)}: ${msg}`);

// host -> serviço e diretivas CSP que precisam permiti-lo quando usado pelo navegador
const HOSTS = [
  { host: "accounts.google.com", service: "Sign-In", directives: ["script-src", "frame-src", "connect-src"] },
  { host: "apis.google.com", service: "Sign-In (legado)", directives: ["script-src"] },
  { host: "www.googletagmanager.com", service: "Analytics", directives: ["script-src", "connect-src", "img-src"], analytics: true },
  { host: "www.google-analytics.com", service: "Analytics", directives: ["connect-src", "img-src"], analytics: true },
  { host: "region1.google-analytics.com", service: "Analytics", directives: ["connect-src"], analytics: true },
  { host: "fonts.googleapis.com", service: "Fonts", directives: ["style-src"] },
  { host: "fonts.gstatic.com", service: "Fonts", directives: ["font-src"] },
  { host: "maps.googleapis.com", service: "Maps", directives: ["script-src", "connect-src", "img-src"] },
  { host: "maps.gstatic.com", service: "Maps", directives: ["img-src"] }
];
// APIs de servidor (Sheets, Drive, Search Console, Business Profile): não devem ser chamadas do navegador
const SERVER_ONLY = ["sheets.googleapis.com", "www.googleapis.com", "oauth2.googleapis.com", "searchconsole.googleapis.com", "mybusiness.googleapis.com"];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const textFiles = walk(webDir).filter((f) => [".html", ".js", ".css", ".json", ".webmanifest"].includes(extname(f)));
const usedHosts = new Map(); // host -> [arquivo]
for (const file of textFiles) {
  const src = readFileSync(file, "utf8");
  for (const { host } of HOSTS) if (src.includes(host)) usedHosts.set(host, [...(usedHosts.get(host) || []), file]);
  for (const host of SERVER_ONLY) if (src.includes(host)) fail(file, `${host} chamado do navegador (use servidor)`);
  if (/AIza[0-9A-Za-z_-]{35}/.test(src)) fail(file, "chave de API Google (AIza...) versionada");
  if (/GOCSPX-[0-9A-Za-z_-]{20,}/.test(src)) fail(file, "client secret OAuth versionado");
  if (/client_secret["']?\s*[:=]\s*["'][^"']{8,}/i.test(src)) fail(file, "client_secret literal versionado");
}

// CSP
let csp = {};
try {
  const cfg = JSON.parse(readFileSync(vercelPath, "utf8"));
  const header = cfg.headers.flatMap((h) => h.headers || []).find((h) => h.key === "Content-Security-Policy");
  for (const part of (header?.value || "").split(";")) {
    const [name, ...vals] = part.trim().split(/\s+/);
    if (name) csp[name] = vals;
  }
} catch (err) {
  fail(vercelPath, `não foi possível ler a CSP: ${err.message}`);
}

const allowedBy = (directive, host) => {
  const values = csp[directive] || csp["default-src"] || [];
  return values.some((v) => v === `https://${host}` || v === `https://*.${host.split(".").slice(1).join(".")}` || v === host);
};

for (const entry of HOSTS) {
  if (!usedHosts.has(entry.host)) continue;
  for (const dir of entry.directives) {
    if (!allowedBy(dir, entry.host)) {
      fail(vercelPath, `${entry.host} (${entry.service}) usado em web/, mas ${dir} não o permite`);
    }
  }
}

// Menor privilégio: domínios Google na CSP sem uso
const cspText = Object.values(csp).flat().join(" ");
for (const entry of HOSTS) {
  if (!usedHosts.has(entry.host) && cspText.includes(entry.host)) {
    warn(vercelPath, `${entry.host} permitido na CSP sem uso em web/ (remover ou justificar na ficha)`);
  }
}

// Analytics exige menção na página de privacidade
const analyticsUsed = HOSTS.some((h) => h.analytics && usedHosts.has(h.host));
if (analyticsUsed) {
  const privacy = join(webDir, "privacidade", "index.html");
  const text = existsSync(privacy) ? readFileSync(privacy, "utf8") : "";
  if (!/google/i.test(text)) fail(privacy, "Google Analytics em uso, mas a página de privacidade não menciona o Google");
}

const used = [...usedHosts.keys()];
const summary = used.length ? `domínios Google em uso: ${used.join(", ")}` : "nenhum serviço Google em uso em web/";
for (const w of warnings) console.warn(`AVISO: ${w}`);
if (failures.length) {
  console.error(`FALHOU: ${failures.length} problema(s) (${summary})`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: integrações Google verificadas (${summary}); ${warnings.length} aviso(s).`);
