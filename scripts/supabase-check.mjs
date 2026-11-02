#!/usr/bin/env node
/* * * Checa, lendo apenas arquivos do repositório: * 1. Tabelas usadas em /rest/v1/<tabela> (web/assets/js/) existem em supabase/migrations/. * 2. Rotas /auth/v1/ usadas estão na lista prevista; /storage/v1 e /functions/v1 não são usados. * 3. Tabelas usadas têm RLS ligado. * 4. Nenhum grant ou política de escrita para o papel anon. * 5. Funções security definer têm search_path fixo. * 6. Nomes de migração em sequência NNNN_nome.sql sem lacunas. * 7. connect-src de web/vercel.json permite *.supabase.co. * 8. env.js: URL com https; chave pública não é service_role (o valor nunca é impresso). * * Saída: lista de falhas e avisos; código 1 se houver falha, 0 caso contrário. * Uso (na raiz do repositório): node scripts/supabase-check.mjs */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url"; const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const webJs = join(repo, "web", "assets", "js");
const migrationsDir = join(repo, "supabase", "migrations");
const failures = [];
const warnings = [];
const fail = (file, msg) => failures.push(`${relative(repo, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(repo, file)}: ${msg}`); const ALLOWED_AUTH_ROUTES = new Set(["token", "logout", "user"]);
const ALLOWED_AUTH_GRANTS = new Set(["password", "refresh_token"]); // 1. Uso no site
const jsFiles = existsSync(webJs) ? readdirSync(webJs).filter((f) => f.endsWith(".js")).map((f) => join(webJs, f)) : [];
const usedTables = new Map(); // tabela -> arquivo
for (const file of jsFiles) { const src = readFileSync(file, "utf8"); for (const [, table] of src.matchAll(/\/rest\/v1\/([a-z_][a-z0-9_]*)/g)) { if (!usedTables.has(table)) usedTables.set(table, file); } for (const [, route] of src.matchAll(/\/auth\/v1\/([a-z_]+)/g)) { if (!ALLOWED_AUTH_ROUTES.has(route)) fail(file, `rota /auth/v1/${route} não prevista no contrato`); } for (const [, grant] of src.matchAll(/grant_type=([a-z_]+)/g)) { if (!ALLOWED_AUTH_GRANTS.has(grant)) fail(file, `grant_type "${grant}" não previsto no contrato`); } const other = src.match(/\/(storage|functions)\/v1\//); if (other) fail(file, `uso de /${other[1]}/v1 não está no contrato atual`);
} // 2. Migrações
const migrations = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort() : [];
if (migrations.length === 0) fail(migrationsDir, "nenhuma migração encontrada");
let expected = 1;
const sql = [];
for (const name of migrations) { const file = join(migrationsDir, name); const m = name.match(/^(\d{4})_[a-z0-9_]+\.sql$/); if (!m) { fail(file, "nome fora do padrão NNNN_nome.sql (kebab/snake minúsculo)"); continue; } if (Number(m[1]) !== expected) fail(file, `sequência quebrada: esperado ${String(expected).padStart(4, "0")}`); expected = Number(m[1]) + 1; const text = readFileSync(file, "utf8"); sql.push({ file, text: text.toLowerCase() });
}
const all = sql.map((s) => s.text).join("\n"); // Tabelas declaradas e com RLS
const declared = new Set([...all.matchAll(/create table (?:if not exists )?public\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]));
const rlsOn = new Set([...all.matchAll(/alter table public\.([a-z_][a-z0-9_]*) enable row level security/g)].map((m) => m[1]));
for (const [table, file] of usedTables) { if (!declared.has(table)) fail(file, `tabela "${table}" usada pelo site não é criada em supabase/migrations/`); else if (!rlsOn.has(table)) fail(file, `tabela "${table}" sem enable row level security`);
}
for (const t of declared) { if (!rlsOn.has(t)) fail(migrationsDir, `tabela public.${t} sem RLS ligado`);
} // 3. Escrita para anon
for (const s of sql) { for (const [stmt] of s.text.matchAll(/grant\s+[^;]*;/g)) { if (/\b(insert|update|delete|all)\b/.test(stmt) && /\bto\b[^;]*\banon\b/.test(stmt)) { fail(s.file, `grant de escrita para anon: ${stmt.trim().slice(0, 100)}`); } } for (const [stmt] of s.text.matchAll(/create policy[\s\S]*?;/g)) { if (/\bto\b[^;]*\banon\b/.test(stmt) && /for\s+(insert|update|delete|all)\b/.test(stmt)) { fail(s.file, "política de escrita para anon"); } }
} // 4. security definer com search_path
for (const s of sql) { for (const [block] of s.text.matchAll(/create (?:or replace )?function[\s\S]*?\$\$;/g)) { if (/security definer/.test(block) && !/set search_path\s*=/.test(block)) { fail(s.file, "função security definer sem set search_path"); } }
} // 5. CSP
const vercelPath = join(repo, "web", "vercel.json");
try { const csp = JSON.parse(readFileSync(vercelPath, "utf8")) .headers.flatMap((h) => h.headers || []) .find((h) => h.key === "Content-Security-Policy"); const connect = csp?.value.match(/connect-src([^;]*)/)?.[1] || ""; if (usedTables.size || [...jsFiles].some((f) => readFileSync(f, "utf8").includes("/auth/v1/"))) { if (!connect.includes("https://*.supabase.co")) fail(vercelPath, "connect-src não permite https://*.supabase.co"); if (!connect.includes("wss://*.supabase.co")) warn(vercelPath, "connect-src sem wss://*.supabase.co (só necessário para Realtime)"); }
} catch (err) { fail(vercelPath, `não foi possível ler a CSP: ${err.message}`);
} // 6. env.js (valores nunca são impressos)
const envPath = join(webJs, "env.js");
if (existsSync(envPath)) { const env = readFileSync(envPath, "utf8"); const url = env.match(/supabaseUrl:\s*"([^"]*)"/)?.[1] ?? ""; const key = env.match(/supabaseAnonKey:\s*"([^"]*)"/)?.[1] ?? ""; if (url && !/^https:\/\/[a-z0-9.-]+$/i.test(url)) fail(envPath, "supabaseUrl deve ser uma URL https sem caminho"); if (key.startsWith("sb_secret_")) fail(envPath, "chave secreta (sb_secret_) no navegador"); if (key) { const parts = key.split("."); if (parts.length === 3) { try { const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); if (payload.role === "service_role") fail(envPath, "service_role embutida no navegador"); } catch { warn(envPath, "chave com formato JWT não decodificável"); } } } if (!url || !key) warn(envPath, "configuração em branco: site usa padrões e administração fica desativada");
} else { fail(envPath, "arquivo ausente");
} const summary = `tabelas no site: ${usedTables.size}; migrações: ${migrations.length}; tabelas com RLS: ${rlsOn.size}`;
for (const w of warnings) console.warn(`AVISO: ${w}`);
if (failures.length) { console.error(`FALHOU: ${failures.length} problema(s) (${summary})`); for (const f of failures) console.error(` - ${f}`); process.exit(1);
}
console.log(`OK: contrato Supabase verificado (${summary}); ${warnings.length} aviso(s).`);
