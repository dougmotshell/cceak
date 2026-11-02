#!/usr/bin/env node
/*
 * Verificação de ficha de post (Instagram) sem rede e sem dependências.
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Confere: seções "## Legenda" e "## Texto alternativo" presentes e sem TODO;
 * legenda de vídeo quando o formato é Reels ou vídeo; limite de caracteres da legenda;
 * número de hashtags; ausência de e-mail e de telefone no arquivo.
 * Os limites são pontos de partida: confirmar na documentação oficial da Meta antes de tratá-los como definitivos.
 * Saída: falhas por arquivo; código 1 se houver alguma falha, 0 se tudo passar.
 *
 * Uso: node scripts/social-copy-check.mjs <ficha.md> [outra.md ...]
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";

const CAPTION_MAX_CHARS = 2200; // verificar na documentação oficial da Meta
const HASHTAG_MAX = 30; // verificar na documentação oficial da Meta

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/;

/** Devolve o corpo de uma seção "## Título" até o próximo "## " ou o fim. */
function section(text, title) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start === -1) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

function formatOf(text) {
  const m = text.match(/^- \*\*Formato:\*\*\s*(.*)$/im);
  return m ? m[1] : "";
}

function checkFile(file) {
  const failures = [];
  const text = readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");

  const caption = section(text, "Legenda");
  if (caption === null) {
    failures.push('falta a seção "## Legenda"; o arquivo não parece uma ficha de post');
    return failures;
  }
  if (!caption) failures.push("legenda vazia");
  if (caption.includes("TODO:")) failures.push("legenda ainda contém TODO:");
  const chars = Array.from(caption).length;
  if (chars > CAPTION_MAX_CHARS) {
    failures.push(`legenda com ${chars} caracteres, acima do limite de ${CAPTION_MAX_CHARS}`);
  }

  const alt = section(text, "Texto alternativo");
  if (!alt) failures.push('texto alternativo ausente ("## Texto alternativo")');
  else if (alt.includes("TODO:")) failures.push("texto alternativo ainda contém TODO:");

  if (/reel|v[ií]deo/i.test(formatOf(text))) {
    const videoCaption = section(text, "Legenda do vídeo");
    if (!videoCaption) failures.push('formato de vídeo sem "## Legenda do vídeo"');
    else if (videoCaption.includes("TODO:")) failures.push("legenda do vídeo ainda contém TODO:");
  }

  const hashtags = section(text, "Hashtags") ?? "";
  const count = (hashtags.match(/#[\p{L}\p{N}_]+/gu) || []).length;
  if (count > HASHTAG_MAX) failures.push(`${count} hashtags, acima do limite de ${HASHTAG_MAX}`);

  if (EMAIL.test(text)) failures.push("e-mail encontrado no arquivo (dado pessoal)");
  if (PHONE.test(text)) failures.push("possível telefone encontrado no arquivo (dado pessoal)");

  return failures;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/social-copy-check.mjs <ficha.md> [outra.md ...]");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  let failures;
  try {
    failures = checkFile(file);
  } catch (err) {
    failures = [`não foi possível ler: ${err.message}`];
  }
  const label = relative(process.cwd(), file) || file;
  if (failures.length) {
    failed += 1;
    console.error(`FALHOU: ${label}`);
    for (const f of failures) console.error(`  - ${f}`);
  } else {
    console.log(`OK: ${label}`);
  }
}

if (failed) {
  console.error(`${failed} de ${files.length} arquivo(s) com falha.`);
  process.exit(1);
}
console.log(`${files.length} arquivo(s) verificado(s) sem falhas.`);
