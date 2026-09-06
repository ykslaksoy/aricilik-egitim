#!/usr/bin/env node
/**
 * koloni güçlü maddeler — koruma raporu (CLI)
 * Kullanım: node scripts/strength-preserve.js [--json]
 */

const { getStrengthPreserveReport, APPLIED_V1 } = require("../apps/api/src/services/strengthPreserveService");

const json = process.argv.includes("--json");

function main() {
  const report = getStrengthPreserveReport();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("═".repeat(72));
  console.log("  koloni — KORUNACAK GÜÇLÜ MADDELER");
  console.log("═".repeat(72));
  console.log(`  ${report.count} madde · ort skor ${report.ortK} → ${report.ortBoosted} (+${report.ortDelta})`);
  console.log(`  Uygulanan v1: ${APPLIED_V1.join(", ")}`);
  console.log("─".repeat(72));

  const byCat = {};
  for (const item of report.items) {
    if (!byCat[item.g]) byCat[item.g] = [];
    byCat[item.g].push(item);
  }

  const catLabel = { A: "Donanım", B: "Zekâ", C: "Yazılım", D: "koloni özel" };

  for (const g of ["A", "B", "C", "D"]) {
    const items = byCat[g];
    if (!items?.length) continue;
    console.log(`\n  [${g}] ${catLabel[g] || g}`);
    for (const item of items) {
      const sh = item.sh ? `SH ${item.sh}` : "SH —";
      const score =
        item.delta > 0 ? `${item.k} → ${item.boosted} (+${item.delta})` : `${item.boosted}`;
      const flag = item.applied?.length ? ` ✓ ${item.applied.join(", ")}` : "";
      const ahead = item.aheadOfSh ? "▲" : " ";
      console.log(`  ${ahead} ${score.padEnd(16)} ${sh.padEnd(8)} ${item.n}${flag}`);
      if (!item.applied?.length && item.iyilestirme) {
        console.log(`      → ${item.iyilestirme}`);
      }
    }
  }

  console.log("\n" + "─".repeat(72));
  console.log(`  ${report.note}`);
  console.log("═".repeat(72));
}

main();
