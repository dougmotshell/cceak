#!/usr/bin/env node
/*
 * Verificação determinística de configuração de segurança (sem dependências).
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Checa o que pode ser provado por leitura de arquivos, sem rede:
 *  1. Cabeçalhos de segurança e CSP em web/vercel.json (sem unsafe-inline/unsafe-eval em scripts).
 *  2. Toda tabela de public.* nas migrações do Supabase tem RLS ligado.
 *  3. Nenhuma política concede escrita para o papel anon.
 *  4. Nenhum JWT com role=service_role embutido em arquivos versionados.
 *  5. Nenhuma chave privada ou segredo óbvio versionado.
 *  6. innerHTML só recebe literais (ver docs/pt-br/architecture/controles-seguranca-soc2.md, CTRL-07).
 *  7. Sem eval / new Function / document.write.
 *
 * Saída: lista de achados; código 1 se houver falha, 0 caso contrário.
 * Uso: node scripts/security-config-check.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];
const fail = (file, rule, msg) => findings.push({ file: relative(repo, file), rule, msg });

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist"]);
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const webFiles = walk(join(repo, "web"));
const sqlFiles = walk(join(repo, "supabase")).filter((f) => extname(f) === ".sql");
const allTextFiles = walk(repo).filter((f) => {
  const ext = extname(f);
  return [".html", ".js", ".mjs", ".json", ".sql", ".md", ".yml", ".yaml", ".css", ".webmanifest", ".py"].includes(ext);
});

/* 1. Cabeçalhos e CSP ---------------------------------------------------- */
const vercelPath = join(repo, "web", "vercel.json");
if (!existsSync(vercelPath)) {
  fail(vercelPath, "HDR-00", "web/vercel.json ausente");
} else {
  const config = JSON.parse(readFileSync(vercelPath, "utf8"));
  const globalHeaders = (config.headers || []).find((h) => h.source === "/(.*)")?.headers || [];
  const get = (key) => globalHeaders.find((h) => h.key === key)?.value;
  const csp = get("Content-Security-Policy") || "";
  const scriptSrc = (csp.match(/script-src([^;]*)/) || [])[1] || "";
  const required = {
    "Strict-Transport-Security": (v) => /max-age=\d{7,}/.test(v),
    "X-Content-Type-Options": (v) => v === "nosniff",
    "X-Frame-Options": (v) => v === "DENY",
    "Referrer-Policy": (v) => !!v,
    "Permissions-Policy": (v) => !!v,
  };
  for (const [key, ok] of Object.entries(required)) {
    const v = get(key);
    if (!v || !ok(v)) fail(vercelPath, "HDR-01", `cabeçalho ${key} ausente ou fraco`);
  }
  if (!csp) fail(vercelPath, "HDR-02", "Content-Security-Policy ausente");
  if (/unsafe-(inline|eval)/.test(scriptSrc)) fail(vercelPath, "HDR-03", "script-src permite unsafe-inline/unsafe-eval");
  if (!/object-src 'none'/.test(csp)) fail(vercelPath, "HDR-04", "object-src deve ser 'none'");
  if (!/frame-ancestors 'none'/.test(csp)) fail(vercelPath, "HDR-05", "frame-ancestors deve ser 'none'");
  const admin = (config.headers || []).find((h) => h.source.startsWith("/admin"))?.headers || [];
  if (!admin.some((h) => h.key === "X-Robots-Tag" && /noindex/.test(h.value))) {
    fail(vercelPath, "HDR-06", "/admin deve ter X-Robots-Tag noindex");
  }
}

/* 2 e 3. RLS e escrita para anon ------------------------------------------ */
const tables = new Map();
for (const file of sqlFiles) {
  const sql = readFileSync(file, "utf8");
  for (const [, name] of sql.matchAll(/create table if not exists public\.(\w+)/gi)) {
    tables.set(name, file);
  }
  for (const [, name] of sql.matchAll(/alter table public\.(\w+) enable row level security/gi)) {
    tables.set(name, tables.get(name) || file);
    tables.set(`__rls__${name}`, file);
  }
  const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) || [];
  for (const block of policyBlocks) {
    const writes = /for\s+(insert|update|delete|all)\b/i.test(block);
    const toAnon = /to\s+[^;]*\banon\b/i.test(block);
    if (writes && toAnon) fail(file, "RLS-02", `política de escrita concedida a anon: ${block.split("\n")[0]}`);
  }
}
for (const [name, file] of tables) {
  if (name.startsWith("__rls__")) continue;
  if (!tables.has(`__rls__${name}`)) fail(file, "RLS-01", `tabela public.${name} sem enable row level security`);
}
if (tables.size === 0 && sqlFiles.length === 0) {
  // Sem migrações ainda: não é falha, mas fica registrado.
  console.log("INFO: nenhuma migração em supabase/ ainda; checagem de RLS não se aplica.");
}

/* 4 e 5. Segredos versionados -------------------------------------------- */
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const PRIVATE_KEY = /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/;
const SECRET_HINTS = /(sb_secret_[A-Za-z0-9_]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})/;
for (const file of allTextFiles) {
  if (file === fileURLToPath(import.meta.url)) continue;
  const text = readFileSync(file, "utf8");
  for (const [token] of text.matchAll(JWT)) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") fail(file, "SEC-01", "JWT service_role versionado (use somente no servidor, fora do repositório)");
    } catch (e) { /* não é um JWT decodificável: ignora */ }
  }
  if (PRIVATE_KEY.test(text)) fail(file, "SEC-02", "chave privada versionada");
  if (SECRET_HINTS.test(text)) fail(file, "SEC-03", "padrão de segredo conhecido versionado");
}

/* 6 e 7. JavaScript do site ----------------------------------------------- */
for (const file of webFiles.filter((f) => extname(f) === ".js")) {
  const text = readFileSync(file, "utf8");
  for (const [, rhs] of text.matchAll(/\.innerHTML\s*=\s*([^;\n]+)/g)) {
    if (!/^\s*['"]/.test(rhs)) fail(file, "CTRL-07", `innerHTML recebe valor não literal: ${rhs.trim().slice(0, 60)}`);
  }
  if (/\beval\s*\(|new Function\s*\(|document\.write\s*\(/.test(text)) fail(file, "JS-01", "uso de eval, new Function ou document.write");
}

/* Relatório ---------------------------------------------------------------- */
if (findings.length) {
  console.error(`FALHOU: ${findings.length} achado(s) de segurança`);
  for (const f of findings) console.error(`  [${f.rule}] ${f.file}: ${f.msg}`);
  process.exit(1);
}
console.log(`OK: configuração de segurança verificada (${webFiles.length} arquivos web, ${sqlFiles.length} migração(ões) SQL).`);
