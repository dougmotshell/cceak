#!/usr/bin/env node
/*
 * cceak · Intelie
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Verificação estática do sistema visual sobre web/assets/css (somente leitura, sem rede,
 * sem dependências). Cobre: tokens de cor em :root (paleta clara), redefinição completa
 * no tema escuro (media query e data-theme="dark" com os mesmos valores), color-scheme em
 * ambos os temas, contraste WCAG (texto 4.5:1; foco e indicadores 3:1) para os pares de
 * uso real nos dois temas, e cores literais fora dos tokens.
 *
 * Pares avaliados com valor hexadecimal. Valores não hexadecimais (rgb(), color-mix())
 * são listados como não avaliados, não aprovados.
 *
 * Saída: lista de falhas; código de saída 1 se houver alguma.
 * Uso: node scripts/design-check.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
const cssDir = join(webRoot, "assets", "css");
const failures = [];
const notes = [];
const fail = (file, msg) => failures.push(`${relative(webRoot, file) || file}: ${msg}`);

// Pares de uso real: [texto/elemento, fundo, mínimo WCAG]
const PAIRS = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["muted", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["primary-text", "primary", 4.5],
  ["primary", "bg", 4.5],
  ["accent", "bg", 4.5],
  ["focus", "bg", 3],
  ["focus", "surface", 3],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function parseHex(value) {
  const m = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Extrai as declarações de custom properties de um bloco. */
function declarations(body) {
  const out = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

const cssFiles = walk(cssDir).filter((f) => extname(f) === ".css");
const baseFile = join(cssDir, "base.css");
let base;
try {
  base = readFileSync(baseFile, "utf8");
} catch {
  console.error(`FALHOU: arquivo de tokens ausente: ${relative(webRoot, baseFile)}`);
  process.exit(1);
}

// Blocos de tema. Comentários são removidos antes do parse.
const stripped = base.replace(/\/\*[\s\S]*?\*\//g, "");
let light = null;
const darkBlocks = [];
for (const [, rawSel, body] of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = rawSel.trim();
  if (sel === ":root") light = { ...(light ?? {}), ...declarations(body) };
  else if (sel.includes('data-theme="dark"') || sel.includes(':root:not([data-theme="light"])')) {
    darkBlocks.push({ sel, decl: declarations(body) });
  }
}

if (!light) fail(baseFile, "bloco :root (paleta clara) não encontrado");
if (darkBlocks.length < 2) fail(baseFile, "esperados 2 blocos de tema escuro (media query e data-theme=\"dark\")");

if (light) {
  if (!light["color-scheme"]) fail(baseFile, "color-scheme ausente no tema claro");
  for (const block of darkBlocks) {
    if (!block.decl["color-scheme"]) fail(baseFile, `color-scheme ausente em ${block.sel}`);
    // Cada token do tema claro precisa ser redefinido no escuro (senão herda o valor claro)
    for (const name of Object.keys(light)) {
      if (name === "color-scheme") continue;
      if (!(name in block.decl)) fail(baseFile, `token ${name} não redefinido em ${block.sel}`);
    }
  }
  // Os dois blocos escuros não podem divergir
  if (darkBlocks.length === 2) {
    const [a, b] = darkBlocks.map((d) => d.decl);
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[name] !== b[name]) fail(baseFile, `tema escuro divergente: ${name} = ${a[name]} vs ${b[name]}`);
    }
  }

  // Contraste nos dois temas
  const themes = { claro: light, escuro: darkBlocks[0]?.decl ?? {} };
  for (const [themeName, tokens] of Object.entries(themes)) {
    const merged = { ...light, ...tokens };
    for (const [fgName, bgName, min] of PAIRS) {
      const fgRaw = merged[`--${fgName}`];
      const bgRaw = merged[`--${bgName}`];
      if (!fgRaw || !bgRaw) {
        fail(baseFile, `tema ${themeName}: par --${fgName}/--${bgName} sem token`);
        continue;
      }
      const fg = parseHex(fgRaw);
      const bg = parseHex(bgRaw);
      if (!fg || !bg) {
        notes.push(`tema ${themeName}: --${fgName} (${fgRaw}) / --${bgName} (${bgRaw}) não avaliado (não hexadecimal)`);
        continue;
      }
      const ratio = contrast(fg, bg);
      if (ratio < min) {
        fail(baseFile, `tema ${themeName}: --${fgName} sobre --${bgName} = ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`);
      }
    }
  }
}

// Cores literais fora dos tokens
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/i;
const TOKEN_DECL = /^\s*--[\w-]+\s*:/;
for (const file of cssFiles) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  css.split("\n").forEach((line, i) => {
    if (TOKEN_DECL.test(line)) return;
    if (COLOR_LITERAL.test(line)) fail(file, `linha ${i + 1}: cor literal fora dos tokens: ${line.trim().slice(0, 80)}`);
  });
}

for (const n of notes) console.log(`NOTA: ${n}`);
if (failures.length) {
  console.error(`FALHOU: ${failures.length} problema(s) de design`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `OK: ${Object.keys(light ?? {}).length} tokens de cor, ${PAIRS.length} pares de contraste nos dois temas e ${cssFiles.length} folhas de estilo verificados.`,
);
