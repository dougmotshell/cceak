#!/usr/bin/env node
/* * * Verificação estática de frontend sobre web/ (HTML, CSS e JS sem build). Somente leitura, * sem rede, sem dependências. Cobre: orçamento de bytes (JS, CSS, HTML, imagens), scripts * que bloqueiam a renderização no <head>, dimensões de imagem (CLS), carregamento * preguiçoso fora da primeira imagem, recursos de terceiros (a CSP só aceita 'self'), * e padrões de JS proibidos pela CSP ou que degradam aparelhos antigos. * * Os limites abaixo são propostos e devem ser confirmados com o responsável. * Não mede Core Web Vitals reais: para isso use Lighthouse (chrome-devtools) em ambiente de homologação. * * Saída: lista de falhas; código de saída 1 se houver alguma. * Uso: node scripts/frontend-check.mjs */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url"; const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
const failures = [];
const fail = (file, msg) => failures.push(`${relative(webRoot, file) || file}: ${msg}`); // Orçamentos em bytes (sem compressão). Propostos; ajuste com o responsável.
const BUDGET = { jsTotal: 150 * 1024, cssTotal: 80 * 1024, htmlPage: 60 * 1024, image: 300 * 1024,
}; function walk(dir, out = []) { for (const name of readdirSync(dir)) { const full = join(dir, name); if (statSync(full).isDirectory()) walk(full, out); else out.push(full); } return out;
} const files = walk(webRoot);
const size = (f) => statSync(f).size;
const byExt = (ext) => files.filter((f) => extname(f) === ext);
const htmlFiles = byExt(".html");
const jsFiles = byExt(".js");
const cssFiles = byExt(".css");
const imageFiles = files.filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f)); // Orçamentos agregados
const jsTotal = jsFiles.reduce((s, f) => s + size(f), 0);
const cssTotal = cssFiles.reduce((s, f) => s + size(f), 0);
if (jsTotal > BUDGET.jsTotal) fail(webRoot, `JS total ${jsTotal} bytes acima do orçamento ${BUDGET.jsTotal}`);
if (cssTotal > BUDGET.cssTotal) fail(webRoot, `CSS total ${cssTotal} bytes acima do orçamento ${BUDGET.cssTotal}`);
for (const f of htmlFiles) { if (size(f) > BUDGET.htmlPage) fail(f, `HTML com ${size(f)} bytes acima do orçamento ${BUDGET.htmlPage}`);
}
for (const f of imageFiles) { if (size(f) > BUDGET.image) fail(f, `imagem com ${size(f)} bytes acima do orçamento ${BUDGET.image}`);
} // HTML: render-blocking, CLS e lazy loading
for (const file of htmlFiles) { const html = readFileSync(file, "utf8"); const head = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? ""; for (const [tag] of head.matchAll(/<script\b[^>]*\bsrc=[^>]*>/gi)) { if (!/\b(defer|async)\b|type="module"/i.test(tag)) { fail(file, `script bloqueante no <head>: ${tag.slice(0, 80)}`); } } // Imagens: width/height evitam salto de layout (CLS) const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]); imgs.forEach((tag, i) => { if (!(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag))) { fail(file, `imagem sem width/height (CLS): ${tag.slice(0, 80)}`); } // A primeira imagem pode ser acima da dobra; as demais devem ser preguiçosas if (i > 0 && !/\bloading="lazy"/i.test(tag) && !/\bfetchpriority="high"/i.test(tag)) { fail(file, `imagem sem loading="lazy": ${tag.slice(0, 80)}`); } }); // Recursos de terceiros: a CSP só aceita 'self' e Supabase (connect-src) for (const [, url] of html.matchAll(/<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)="(https?:\/\/[^"]+)"/gi)) { if (!url.startsWith("https://fonts.") && !url.includes("supabase.co")) { fail(file, `recurso de terceiro referenciado no HTML: ${url}`); } }
} // CSS: fontes externas e @import remoto bloqueiam a renderização
for (const file of cssFiles) { const css = readFileSync(file, "utf8"); if (/@import\s+url\(\s*['"]?https?:/i.test(css)) fail(file, "@import remoto bloqueia a renderização"); if (/url\(\s*['"]?https?:/i.test(css)) fail(file, "url() remota em CSS (viola CSP img/font-src)");
} // JS: padrões proibidos pela CSP ou ruins em aparelhos antigos
const JS_RULES = [ [/\bdocument\.write\s*\(/, "document.write bloqueia o parser"], [/\beval\s*\(/, "eval viola CSP (script-src sem unsafe-eval)"], [/\bnew\s+Function\s*\(/, "new Function viola CSP"], [/\.open\s*\([^)]*,\s*false\s*\)/, "XMLHttpRequest síncrono bloqueia a thread principal"], [/\binnerHTML\s*=(?!\s*(['"`])\1\s*;)/, "atribuição a innerHTML (aceitar só literal fixo; dado do banco entra por textContent)"],
];
for (const file of jsFiles) { if (file.endsWith("sw.js")) continue; // o service worker tem regras próprias const js = readFileSync(file, "utf8"); for (const [re, msg] of JS_RULES) { if (re.test(js)) fail(file, msg); }
} if (failures.length) { console.error(`FALHOU: ${failures.length} problema(s) de frontend`); for (const f of failures) console.error(` - ${f}`); process.exit(1);
}
console.log( `OK: frontend verificado (${htmlFiles.length} HTML, ${jsFiles.length} JS = ${jsTotal} B, ${cssFiles.length} CSS = ${cssTotal} B, ${imageFiles.length} imagens).`,
);
