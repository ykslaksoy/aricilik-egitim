/**
 * A — Donanım tasarımı vs SüperHero (saha referansı hariç)
 * R — Saha referans verisi ayrı rapor
 * Çalıştır: node scripts/hardware-compare.js
 */
const { FEATURES } = require("./superhero-score-data.js");

const avg = (arr, key) =>
  Math.round((arr.reduce((s, f) => s + f[key], 0) / arr.length) * 10) / 10;

const A = FEATURES.filter((f) => f.g === "A");
const R = FEATURES.filter((f) => f.g === "R");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  A — DONANIM TASARIMI (BOM + firmware; saha hariç)          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const aAhead = A.filter((f) => f.aHw > f.sh);
const aBehind = A.filter((f) => f.aHw < f.sh);
const aTie = A.filter((f) => f.aHw === f.sh);

console.log("Ortalama     | koloni (aHw) | SüperHero | Fark");
console.log("-------------|--------------|-----------|------");
console.log(
  `15 madde     | ${String(avg(A, "aHw")).padStart(12)} | ${String(avg(A, "sh")).padStart(9)} | ${(avg(A, "aHw") - avg(A, "sh")).toFixed(1)}`
);
console.log(
  `\nBirebir: +${aAhead.length} önde / ${aTie.length} eşit / -${aBehind.length} geride`
);
console.log(`(Eski bileşik k: koloni ${avg(A, "k")} — saha cezası dahil)\n`);

console.log("── Tüm A maddeleri ──");
A.sort((a, b) => b.aHw - b.sh - (a.aHw - a.sh)).forEach((f) => {
  const tag = f.aHw > f.sh ? "✓ ÖNDE" : f.aHw < f.sh ? "✗ GERİ" : "= EŞİT";
  const bom = f.bom === true ? "BOM✓" : f.bom === false ? "BOM✗" : String(f.bom);
  console.log(
    `${tag} | ${f.n}\n       aHw ${f.aHw} | SH ${f.sh} | bileşik k ${f.k} | ${bom}`
  );
});

console.log("\n── Gerçek donanım eksik (BOM✗) ──");
A.filter((f) => f.bom === false).forEach((f) => {
  console.log(`  • ${f.n} — aHw ${f.aHw} / SH ${f.sh}`);
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  R — SAHA REFERANS VERİSİ (ayrı kategori)                   ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("Ortalama     | koloni (k) | SüperHero | Fark");
console.log("-------------|------------|-----------|------");
console.log(
  `${R.length} madde     | ${String(avg(R, "k")).padStart(10)} | ${String(avg(R, "sh")).padStart(9)} | ${(avg(R, "k") - avg(R, "sh")).toFixed(1)}`
);

R.forEach((f) => {
  console.log(`\n  ${f.n} [${f.ref}]\n    koloni ${f.k} | SH ${f.sh} | gap ${f.sh - f.k}`);
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  ÖZET — neden eski A skoru düşüktü                           ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(
  `\nA bileşik (k) ${avg(A, "k")} → saha kanıtı cezası: ${(avg(A, "aHw") - avg(A, "k")).toFixed(1)} puan`
);
console.log(
  `A tasarım (aHw) ${avg(A, "aHw")} → SüperHero ${avg(A, "sh")} → ${avg(A, "aHw") >= avg(A, "sh") ? "ÖNDE ✓" : "geride " + (avg(A, "sh") - avg(A, "aHw")).toFixed(1)}`
);
console.log(`R saha referans ${avg(R, "k")} → asıl büyük gap burada (−${(avg(R, "sh") - avg(R, "k")).toFixed(1)})`);
