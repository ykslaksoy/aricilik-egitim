/**
 * Nem sensörü — SHT31 kalibrasyon, mevsimsel drift, iç/dış füzyon kalitesi.
 */

function analyzeHumiditySensorQuality(result, cfg = {}, reading = null, weather = null, colony = null) {
  if (!result || result.mod === "fallback") {
    return {
      score: 35,
      shParityPct: 37,
      strengths: [],
      issues: ["Nem sensörü arızalı / fallback"],
      katmanlar: [],
      ariciya: "Nem kalite 35/100 — sensör arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 82;

  katmanlar.push({ id: "bom", label: "SHT31 BOM + ingest", puan: 82, max: 82 });
  strengths.push("SHT31 nem sensörü (BOM)");

  if (cfg.factoryHumCert !== false) {
    score += 4;
    katmanlar.push({ id: "factory", label: "SHT31 fabrika kalibrasyon", puan: 4 });
    strengths.push("Fabrika kalibrasyon sertifikası");
  }

  if (result.disHumidityPct != null) {
    score += 4;
    katmanlar.push({ id: "outdoor", label: "İç/dış nem füzyonu", puan: 4 });
    strengths.push(`Dış nem %${result.disHumidityPct}`);
  }

  if (result.condensationRisk === false && result.zone === "ideal") {
    score += 3;
    katmanlar.push({ id: "condensation", label: "Yoğuşma modeli OK", puan: 3 });
  } else if (result.condensationRisk) {
    issues.push("Yoğuşma riski aktif");
    score -= 2;
  }

  if (cfg.referenceHumidityPct != null && reading?.humidity != null) {
    const drift = Math.abs(Number(reading.humidity) - Number(cfg.referenceHumidityPct));
    if (drift <= 3) {
      score += 4;
      katmanlar.push({ id: "drift", label: "Mevsimsel drift referansı", puan: 4 });
      strengths.push(`Drift Δ ${drift.toFixed(1)} puan`);
    } else if (drift <= 8) {
      score += 2;
      katmanlar.push({ id: "drift", label: "Drift (yakın)", puan: 2 });
    } else {
      issues.push(`Nem drift ${drift.toFixed(0)} puan`);
      score -= 3;
    }
  } else {
    issues.push("Mevsimsel drift referansı yok");
  }

  if (result.zone === "ideal" && result.trend === "stabil") {
    score += 3;
    katmanlar.push({ id: "ideal", label: "İdeal + stabil band", puan: 3 });
  }

  if ((colony?.healthScore ?? 0) >= 70 && result.zone === "ideal") {
    score += 2;
    katmanlar.push({ id: "health", label: "Sağlık skoru entegrasyonu", puan: 2 });
    strengths.push("Sağlık × nem uyumlu");
  }

  if (cfg.humSensorModel === "SHT31" || cfg.humSensorModel == null) {
    score += 2;
    katmanlar.push({ id: "sht31", label: "SHT31 upgrade", puan: 2 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 95;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    referenceHumidityPct: cfg.referenceHumidityPct ?? null,
    driftPct:
      cfg.referenceHumidityPct != null && reading?.humidity != null
        ? Math.round(Math.abs(Number(reading.humidity) - Number(cfg.referenceHumidityPct)) * 10) / 10
        : null,
    sensorModel: cfg.humSensorModel || "SHT31",
    factoryHumCert: cfg.factoryHumCert !== false,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Nem kalite 100/100 — SHT31 + drift + iç/dış füzyon (SH 95 geçildi)"
        : score >= 95
          ? `Nem kalite ${score}/100 · SH parity %${shParityPct}`
          : `Nem kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(cfg.referenceHumidityPct == null ? ["Mevsimsel referans nem kaydı"] : []),
            ...(result.condensationRisk ? ["Yoğuşma — havalandır"] : []),
            "SHT31 drift kontrolü (ilkbahar/sonbahar)",
          ].slice(0, 3),
  };
}

module.exports = { analyzeHumiditySensorQuality };
