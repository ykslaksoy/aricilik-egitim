/**
 * #3 Yavru alanı prob — derin analiz
 * node scripts/yavru-prob-deep-analysis.js
 */
const { FEATURES } = require("./superhero-score-data.js");
const { analyzeBroodZoneQuality, estimateBroodTemp } = require("../apps/api/src/services/broodZoneAnalysis.js");

const f = FEATURES.find((x) => x.n.includes("Yavru alanı"));
const sh = f.sh;

console.log("╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║  #3 YAVRU ALANI PROB (PETEK) — DERİN ANALİZ                             ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

console.log(`MASTER: K (aHw) ${f.aHw} | SH ${sh} | k ${f.k} | ${f.aHw >= sh ? "ÖNDE" : "GERİDE"}\n`);

console.log("RAKİP SKORLARI (SH = max):");
console.log(`  BeeHero ${f.bh} | Arnia ${f.ar} | ApisProtect ${f.ap} | Beewise ${f.bw} → SH **${sh}**\n`);

const demoReading = { tempC: 33.6, tempBroodC: 36.2, weightKg: 27.2 };
const demoColony = { beeEstimate: 38000, broodEmergence: { active: true, dailyEmergence: 1200 } };
const demoCfg = {
  broodProbePresent: true,
  factoryProbeCert: true,
  broodProbeOffsetC: 0,
  referenceBroodTempC: 36.2,
};
const fused = estimateBroodTemp(demoReading, demoColony, demoCfg);
const mockResult = {
  mod: "calisiyor",
  tempBroodC: fused.tempBroodC,
  olcum: fused.olcum,
  kaynak: fused.kaynak,
  skor: 100,
  durum: "ideal",
  fusionDeltaC: fused.fusionDeltaC,
};
const quality = analyzeBroodZoneQuality(mockResult, demoCfg, demoReading, demoColony);

console.log("CANLI SİMÜLASYON:");
console.log(`  İç sıcaklık (tempC)     ${demoReading.tempC}°C`);
console.log(`  Prob (tempBroodC)       ${demoReading.tempBroodC}°C`);
console.log(`  Füzyon sonucu           ${fused.tempBroodC}°C (${fused.olcum})`);
console.log(`  Kalite skoru            ${quality.score}/100`);
console.log(`  SH parity               %${quality.shParityPct}\n`);

console.log("KATMANLAR:");
quality.katmanlar.forEach((k) => console.log(`  · ${k.label} (+${k.puan})`));

console.log("\n100'E GİDEN YOL:");
console.log("  68 model + 8 BOM + 10 prob + 8 füzyon + 4 referans + 3 fabrika + 3 ideal + 2 yavru çıkışı = 106 → cap 100");
