/**
 * C — Ürün/yazılım vs O — Operasyon/prod karşılaştırması
 * Çalıştır: node scripts/ops-compare.js
 */
const { FEATURES } = require("./superhero-score-data.js");

const avg = (arr, key) =>
  Math.round((arr.reduce((s, f) => s + f[key], 0) / arr.length) * 10) / 10;

const C = FEATURES.filter((f) => f.g === "C");
const O = FEATURES.filter((f) => f.g === "O");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  C — ÜRÜN / YAZILIM (API + UI + PWA; prod hariç)              ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const cAhead = C.filter((f) => f.cSw > f.sh);
const cBehind = C.filter((f) => f.cSw < f.sh);

console.log("Ortalama     | koloni (cSw) | SüperHero | Fark");
console.log("-------------|--------------|-----------|------");
console.log(
  `14 madde     | ${String(avg(C, "cSw")).padStart(12)} | ${String(avg(C, "sh")).padStart(9)} | ${(avg(C, "cSw") - avg(C, "sh")).toFixed(1)}`
);
console.log(
  `\nBirebir: +${cAhead.length} önde / -${cBehind.length} geride`
);
console.log(`(Eski bileşik k: koloni ${avg(C, "k")} — prod operasyon cezası dahil)\n`);

C.sort((a, b) => b.cSw - b.sh - (a.cSw - a.sh)).forEach((f) => {
  const tag = f.cSw > f.sh ? "✓ ÖNDE" : f.cSw < f.sh ? "✗ GERİ" : "= EŞİT";
  console.log(`${tag} | ${f.n}\n       cSw ${f.cSw} | SH ${f.sh} | bileşik k ${f.k}`);
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  O — OPERASYON / PROD (mağaza, auth, saha ekibi, SMS…)       ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("Ortalama     | koloni (k) | SüperHero | Fark");
console.log("-------------|------------|-----------|------");
console.log(
  `${O.length} madde     | ${String(avg(O, "k")).padStart(10)} | ${String(avg(O, "sh")).padStart(9)} | ${(avg(O, "k") - avg(O, "sh")).toFixed(1)}`
);

O.sort((a, b) => b.sh - b.k - (a.sh - a.k)).forEach((f) => {
  console.log(`\n  ${f.n} [${f.ref}]\n    koloni ${f.k} | SH ${f.sh} | gap ${f.sh - f.k}`);
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  ÖZET                                                         ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(
  `\nC bileşik (k) ${avg(C, "k")} → prod cezası: ${(avg(C, "cSw") - avg(C, "k")).toFixed(1)} puan`
);
console.log(`C yazılım (cSw) ${avg(C, "cSw")} | SüperHero ${avg(C, "sh")}`);
console.log(`O operasyon ${avg(O, "k")} | SüperHero ${avg(O, "sh")} → gap −${(avg(O, "sh") - avg(O, "k")).toFixed(1)}`);

console.log("\n── Tüm kategoriler (koloni) ──");
const A = FEATURES.filter((f) => f.g === "A");
const R = FEATURES.filter((f) => f.g === "R");
console.log(`A donanım tasarımı  ${avg(A, "aHw")}`);
console.log(`R saha referans     ${avg(R, "k")}`);
console.log(`C ürün/yazılım      ${avg(C, "cSw")}`);
console.log(`O operasyon/prod    ${avg(O, "k")}`);
