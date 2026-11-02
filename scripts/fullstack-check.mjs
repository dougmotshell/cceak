#!/usr/bin/env node
/*
 * Intelie · cceak: executa, em sequência, as verificações estáticas de todas as camadas (sem rede).
 * Classificação da informação (ISO/IEC 27001): Uso Interno
 *
 * Não reimplementa nenhuma regra: apenas chama os scripts de cada especialista e agrega o resultado.
 *  - scripts/security-config-check.mjs   (appsec-soc2)
 *  - scripts/check-site.mjs              (appsec-soc2 / frontend estático)
 *  - scripts/devops-check.mjs            (devops-specialist)
 *  - scripts/devsecops-check.mjs         (devsecops-specialist)
 *  - scripts/database-check.mjs          (database-specialist)
 * Saída: resumo por verificação; código 1 se alguma falhar, 0 caso contrário.
 * Uso (a partir da raiz do repositório): node scripts/fullstack-check.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const checks = [
  ["appsec-soc2", "security-config-check.mjs"],
  ["appsec-soc2", "check-site.mjs"],
  ["devops-specialist", "devops-check.mjs"],
  ["devsecops-specialist", "devsecops-check.mjs"],
  ["database-specialist", "database-check.mjs"],
];

const results = [];
for (const [owner, file] of checks) {
  const path = join(here, file);
  if (!existsSync(path)) {
    results.push({ owner, file, status: "AUSENTE" });
    continue;
  }
  const run = spawnSync(process.execPath, [path], { encoding: "utf8", cwd: join(here, "..") });
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
  const status = run.status === 0 ? "OK" : "FALHA";
  results.push({ owner, file, status, out });
}

for (const r of results) {
  console.log(`[${r.status}] ${r.file} (${r.owner})`);
  if (r.status !== "OK" && r.out) {
    for (const line of r.out.split("\n").slice(0, 40)) console.log(`    ${line}`);
  }
}

const bad = results.filter((r) => r.status !== "OK");
if (bad.length) {
  console.log(`\n${bad.length} de ${results.length} verificação(ões) não passaram. Delegue a correção ao responsável indicado.`);
  process.exit(1);
}
console.log(`\nOK: ${results.length} de ${results.length} verificações estáticas passaram.`);
