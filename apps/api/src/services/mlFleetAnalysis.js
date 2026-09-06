/**
 * ML filo kalibrasyonu — okuma/etiket istatistikleri + model hazırlık.
 */

const dbService = require("./dbService");
const mlModelService = require("./mlModelService");

function analyzeMlFleet(stats = {}) {
  const readingCount = stats.readingCount ?? 0;
  const labelCount = stats.labelCount ?? 0;
  const hiveCount = stats.hiveCount ?? 0;
  const mlCfg = mlModelService.getConfig();

  const labelRatio = readingCount > 0 ? labelCount / readingCount : 0;
  let readiness = 10;
  if (readingCount >= 1000) readiness += 15;
  if (readingCount >= 10000) readiness += 20;
  if (labelCount >= 50) readiness += 15;
  if (labelCount >= 200) readiness += 15;
  if (hiveCount >= 10) readiness += 10;
  if (hiveCount >= 30) readiness += 10;
  if (mlCfg.acoustic.fileExists) readiness += 15;
  readiness = Math.min(95, readiness);

  let phase = "topla";
  if (readiness >= 70) phase = "egit";
  else if (readiness >= 40) phase = "etiketle";

  return {
    mod: "calisiyor",
    readinessSkoru: readiness,
    phase,
    readingCount,
    labelCount,
    hiveCount,
    labelRatio: Math.round(labelRatio * 1000) / 1000,
    modelReady: mlCfg.acoustic.fileExists,
    modelMode: mlCfg.acoustic.mode,
    hedef: "30 kovan × 1 yıl · 200+ etiket",
    ariciya:
      mlCfg.acoustic.fileExists
        ? `ML model hazır (${mlCfg.acoustic.mode}) · filo ${readiness}/100`
        : `ML toplama ${phase} — ${readingCount} okuma · ${labelCount} etiket · ${readiness}/100`,
  };
}

function getFleetStats() {
  try {
    return dbService.getMlFleetStats?.() || { readingCount: 0, labelCount: 0, hiveCount: 0 };
  } catch {
    return { readingCount: 0, labelCount: 0, hiveCount: 0 };
  }
}

module.exports = { analyzeMlFleet, getFleetStats };
