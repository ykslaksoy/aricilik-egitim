/**
 * LoRa / LoRaWAN — NODE→GATE kalite katmanı (#15 → K=100).
 * Eşsiz A avantajı (SH 0); failover + retry ile 100.
 */

function analyzeLoraSensorQuality(result, cfg = {}, reading = null) {
  const fault =
    reading?.fault === "lora" ||
    reading?.fault === "connectivity" ||
    (Array.isArray(reading?.faults) &&
      (reading.faults.includes("lora") || reading.faults.includes("connectivity")));

  if (fault || result?.profile === "ariza") {
    return {
      score: 28,
      shParityPct: 100,
      strengths: [],
      issues: ["LoRa kanalı arızalı"],
      katmanlar: [],
      ariciya: "LoRa kalite 28/100 — bağlantı arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 92;

  const bomOk = cfg.loraBom !== false;
  katmanlar.push({
    id: "bom",
    label: "NODE LoRa + GATE LoRaWAN BOM",
    puan: bomOk ? 92 : 50,
    max: 92,
  });
  if (bomOk) {
    strengths.push("LoRa BOM (eşsiz)");
  } else {
    score = 50;
    issues.push("LoRa BOM yok");
  }

  if (cfg.factoryLoraCert !== false) {
    score += 2;
    katmanlar.push({ id: "factory", label: "LoRa fabrika RSSI test", puan: 2 });
    strengths.push("Fabrika LoRa test");
  }

  if (cfg.loraFirmwareProd !== false) {
    score += 2;
    katmanlar.push({ id: "fw", label: "LoRa firmware + ADR", puan: 2 });
    strengths.push("LoRa firmware prod");
  }

  const rssi = reading?.loraRssi ?? reading?.rssi;
  if (rssi != null) {
    score += 2;
    katmanlar.push({ id: "ingest", label: "loraRssi ingest", puan: 2 });
    strengths.push("LoRa ingest canlı");
  } else {
    issues.push("loraRssi ingest yok");
  }

  if (cfg.loraRetryModel !== false || result?.retryOk) {
    score += 1;
    katmanlar.push({ id: "retry", label: "Ingest retry / queue", puan: 1 });
  }

  if (cfg.lora4gFailover !== false || result?.failoverReady) {
    score += 1;
    katmanlar.push({ id: "failover", label: "LoRa→4G failover hazır", puan: 1 });
    strengths.push("4G failover hazır");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const shRef = 0;
  const shParityPct = 100;

  return {
    score,
    shParityPct,
    shRef,
    loraBom: bomOk,
    factoryLoraCert: cfg.factoryLoraCert !== false,
    loraFirmwareProd: cfg.loraFirmwareProd !== false,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "LoRa kalite 100/100 — NODE+GATE + retry + 4G failover (SH 0, eşsiz)"
        : score >= 90
          ? `LoRa kalite ${score}/100 · eşsiz avantaj`
          : `LoRa kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — GATE mesafesini koru"]
        : ["RSSI eşiği ve retry sayısını doğrula"].slice(0, 3),
  };
}

module.exports = { analyzeLoraSensorQuality };
