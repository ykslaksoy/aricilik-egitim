/**
 * SüperHero vs koloni — 44 + 56 + A/R ayrım skor motoru
 * SH = max(BeeHero, Arnia, ApisProtect, Beewise) per feature
 */
const { FEATURES } = require("./superhero-score-data.js");

function avg(arr, key) {
  return Math.round((arr.reduce((s, f) => s + f[key], 0) / arr.length) * 10) / 10;
}

function weighted44(arr, key) {
  const A = arr.filter((f) => f.g === "A");
  const B = arr.filter((f) => f.g === "B");
  const C = arr.filter((f) => f.g === "C");
  return Math.round((avg(A, key) * 0.22 + avg(B, key) * 0.38 + avg(C, key) * 0.4) * 10) / 10;
}

function report(label, key) {
  const all = FEATURES;
  const std = all.filter((f) => f.g !== "D" && f.g !== "R");
  console.log(`\n=== ${label} (${key}) ===`);
  console.log("44 basit:", avg(std, key), "| 44 ağırlıklı:", weighted44(all, key));
  console.log("56 basit (44+D):", avg(all.filter((f) => f.g !== "R"), key));
  ["A", "B", "C", "D"].forEach((g) => {
    const gArr = all.filter((f) => f.g === g);
    if (!gArr.length) return;
    const kKey = g === "A" && key === "k" ? "aHw" : key;
    const kLabel = g === "A" && key === "k" ? "aHw" : key;
    console.log(`  ${g}: SH ${avg(gArr, "sh")} | K ${avg(gArr, kKey)} (${kLabel})`);
  });
  const wins = std.filter((f) => f[key] > f.sh).length;
  const loses = std.filter((f) => f[key] < f.sh).length;
  console.log(`  44 birebir: koloni +${wins} / -${loses}`);
}

report("ŞİMDİ (k)", "k");

// A donanım tasarımı ayrı
const A = FEATURES.filter((f) => f.g === "A");
console.log("\n=== A DONANIM TASARIMI (aHw vs SH) ===");
console.log("koloni aHw ort:", avg(A, "aHw"), "| SH ort:", avg(A, "sh"));
console.log("Önde:", A.filter((f) => f.aHw > f.sh).length, "| Geride:", A.filter((f) => f.aHw < f.sh).length);

const R = FEATURES.filter((f) => f.g === "R");
console.log("\n=== R SAHA REFERANS (k vs SH) ===");
console.log("koloni ort:", avg(R, "k"), "| SH ort:", avg(R, "sh"));

const C = FEATURES.filter((f) => f.g === "C");
const O = FEATURES.filter((f) => f.g === "O");
console.log("\n=== C ÜRÜN/YAZILIM (cSw vs SH) ===");
console.log("koloni cSw ort:", avg(C, "cSw"), "| SH ort:", avg(C, "sh"));
console.log("Önde:", C.filter((f) => f.cSw > f.sh).length, "| Geride:", C.filter((f) => f.cSw < f.sh).length);

console.log("\n=== O OPERASYON/PROD (k vs SH) ===");
console.log("koloni ort:", avg(O, "k"), "| SH ort:", avg(O, "sh"));

module.exports = { FEATURES, avg, weighted44 };
