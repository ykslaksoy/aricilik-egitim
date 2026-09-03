/**
 * Güneş + uzun pil — panel/LiFePO4 + uyku + şarj tahmini (#13 → K=100).
 * Saha 12 ay logu R maddesi; aHw'ye sayılmaz.
 */

function analyzePowerSensorQuality(result, cfg = {}, reading = null) {
  const fault =
    reading?.fault === "battery" ||
    reading?.fault === "solar" ||
    reading?.fault === "power" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("battery") ||
        reading.faults.includes("solar") ||
        reading.faults.includes("power")));

  if (fault || result?.profile === "ariza") {
    return {
      score: 30,
      shParityPct: 32,
      strengths: [],
      issues: ["Pil/güneş kanalı arızalı"],
      katmanlar: [],
      ariciya: "Güneş+pil kalite 30/100 — güç kanalı arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 90;

  const bomOk = cfg.solarBatteryBom !== false;
  katmanlar.push({
    id: "bom",
    label: "6W panel + LiFePO4 / CN3065 BOM",
    puan: bomOk ? 90 : 55,
    max: 90,
  });
  if (bomOk) {
    strengths.push("Panel+LiFePO4 BOM");
  } else {
    score = 55;
    issues.push("Güneş/pil BOM eksik");
  }

  if (cfg.factoryPowerCert !== false) {
    score += 2;
    katmanlar.push({ id: "factory", label: "Şarj/BMS fabrika test", puan: 2 });
    strengths.push("Fabrika güç test");
  }

  if (cfg.powerFirmwareProd !== false) {
    score += 2;
    katmanlar.push({ id: "fw", label: "Uyku + şarj firmware", puan: 2 });
    strengths.push("Uyku/şarj firmware");
  }

  if (reading?.battery != null) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "battery% ingest", puan: 2 });
    strengths.push("Pil ingest canlı");
  } else {
    issues.push("battery ingest yok");
  }

  const hasSolar =
    reading?.solarChargeW != null ||
    reading?.solarPanelW != null ||
    reading?.charging === true ||
    reading?.weatherStation?.solarW != null ||
    reading?.solarW != null;
  if (hasSolar) {
    score += 2;
    katmanlar.push({ id: "solar", label: "Güneş şarj / solarW füzyon", puan: 2 });
    strengths.push("Güneş şarj kanalı");
  }

  if (cfg.sleepModeModel !== false || result?.sleepModeActive) {
    score += 1;
    katmanlar.push({ id: "sleep", label: "Uyku modu modeli", puan: 1 });
  }

  if (result?.daysLeftEstimate != null || cfg.chargeEstimateModel !== false) {
    score += 1;
    katmanlar.push({ id: "estimate", label: "Şarj/gün tahmini", puan: 1 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const shRef = 94;
  const shParityPct =
    score >= shRef ? 100 : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    solarBatteryBom: bomOk,
    factoryPowerCert: cfg.factoryPowerCert !== false,
    powerFirmwareProd: cfg.powerFirmwareProd !== false,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Güneş+pil kalite 100/100 — panel+LiFePO4 + uyku + şarj tahmini (SH 94)"
        : score >= 90
          ? `Güneş+pil kalite ${score}/100 · SH parity %${shParityPct}`
          : `Güneş+pil kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — kış pil logunu R #21'e aktar"]
        : ["Uyku eşiği ve panel wattını doğrula"].slice(0, 3),
  };
}

module.exports = { analyzePowerSensorQuality };
