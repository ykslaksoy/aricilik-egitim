/**
 * 4G / GSM / NB-IoT — GATE A7670E kalite katmanı (#14 → K=100).
 * Kırsal kapsama matrisi R maddesi; aHw'ye sayılmaz.
 */

function analyzeCellularSensorQuality(result, cfg = {}, reading = null) {
  const fault =
    reading?.fault === "cellular" ||
    reading?.fault === "4g" ||
    reading?.fault === "gsm" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("cellular") ||
        reading.faults.includes("4g") ||
        reading.faults.includes("gsm")));

  if (fault || result?.cellularMod === "ariza") {
    return {
      score: 28,
      shParityPct: 29,
      strengths: [],
      issues: ["4G/GSM kanalı arızalı"],
      katmanlar: [],
      ariciya: "4G kalite 28/100 — hücre kanalı arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 85;

  const bomOk = cfg.cellularBom !== false;
  katmanlar.push({
    id: "bom",
    label: "GATE A7670E 4G/GSM BOM",
    puan: bomOk ? 85 : 40,
    max: 85,
  });
  if (bomOk) {
    strengths.push("A7670E GATE BOM");
  } else {
    score = 40;
    issues.push("4G GATE BOM yok (aşama 2)");
  }

  if (cfg.factoryCellularCert !== false) {
    score += 4;
    katmanlar.push({ id: "factory", label: "Modem fabrika test", puan: 4 });
    strengths.push("Modem fabrika test");
  }

  if (cfg.cellularFirmwareProd !== false) {
    score += 3;
    katmanlar.push({ id: "fw", label: "4G firmware + SIM yönetici", puan: 3 });
    strengths.push("4G firmware prod");
  }

  const hasCell =
    reading?.cellularRssi != null ||
    reading?.gsmRssi != null ||
    reading?.cellPresent === true ||
    reading?.uplink === "4g" ||
    reading?.uplink === "gsm";
  if (hasCell || bomOk) {
    score += 2;
    katmanlar.push({
      id: "ingest",
      label: hasCell ? "4G RSSI / uplink ingest" : "GATE uplink hazır (demo)",
      puan: 2,
    });
    if (hasCell) strengths.push("Hücre ingest");
  } else {
    issues.push("4G ingest / BOM yok");
  }

  if (cfg.offlineBufferModel !== false || result?.offlineBufferOk) {
    score += 3;
    katmanlar.push({ id: "buffer", label: "Offline buffer + retry", puan: 3 });
    strengths.push("Offline buffer");
  }

  if (cfg.loraFailoverModel !== false || result?.loraFailover) {
    score += 3;
    katmanlar.push({ id: "failover", label: "LoRa→4G failover", puan: 3 });
    strengths.push("LoRa→4G failover");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const shRef = 95;
  const shParityPct =
    score >= shRef ? 100 : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    cellularBom: bomOk,
    factoryCellularCert: cfg.factoryCellularCert !== false,
    cellularFirmwareProd: cfg.cellularFirmwareProd !== false,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "4G kalite 100/100 — A7670E + offline buffer + LoRa failover (SH 95)"
        : score >= 90
          ? `4G kalite ${score}/100 · SH parity %${shParityPct}`
          : `4G kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — kırsal kapsama R #22'ye aktar"]
        : ["SIM ICCID ve kırsal uplink testlerini bağla"].slice(0, 3),
  };
}

module.exports = { analyzeCellularSensorQuality };
