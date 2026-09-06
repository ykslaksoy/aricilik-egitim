/**
 * Titreşim / ivme — ADXL345 kalibrasyon + yağma/rüzgar etiket kalitesi.
 */

function analyzeVibrationSensorQuality(result, cfg = {}, reading = null, colony = null, meta = {}) {
  if (!result || result.profile === "ariza" || reading?.fault === "vibration") {
    return {
      score: 30,
      shParityPct: 33,
      strengths: [],
      issues: ["Titreşim sensörü arızalı"],
      katmanlar: [],
      ariciya: "Titreşim kalite 30/100 — sensör arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 78;

  katmanlar.push({ id: "bom", label: "ADXL345 BOM + ingest", puan: 78, max: 78 });
  strengths.push("ADXL345 ivmeölçer (BOM)");

  if (cfg.factoryVibCert !== false) {
    score += 5;
    katmanlar.push({ id: "factory", label: "ADXL fabrika kalibrasyon", puan: 5 });
    strengths.push("Fabrika kalibrasyon sertifikası");
  }

  if (cfg.adxlFirmwareProd !== false) {
    score += 4;
    katmanlar.push({ id: "fw", label: "Firmware prod", puan: 4 });
    strengths.push("ADXL firmware prod");
  }

  if (reading?.audioRms != null) {
    score += 3;
    katmanlar.push({ id: "audio", label: "Titreşim × akustik", puan: 3 });
  }

  if (colony?.weightDrop6hKg != null || reading?.weightKg != null) {
    score += 3;
    katmanlar.push({ id: "weight", label: "Titreşim × tartı", puan: 3 });
  }

  const labeled = Number(cfg.vibrationLabeledEvents ?? 0);
  if (labeled >= 50) {
    score += 5;
    katmanlar.push({ id: "labels", label: "Yağma/rüzgar/taşıma etiket ≥50", puan: 5 });
    strengths.push(`${labeled} olay etiketi`);
  } else if (labeled >= 15) {
    score += 2;
    katmanlar.push({ id: "labels", label: "Etiket seti (kısmi)", puan: 2 });
  } else {
    issues.push("Titreşim saha etiket seti zayıf (R #18)");
  }

  if (cfg.referenceVibration != null && reading?.vibration != null) {
    const d = Math.abs(Number(reading.vibration) - Number(cfg.referenceVibration));
    if (d <= 2) {
      score += 2;
      katmanlar.push({ id: "ref", label: "Referans titreşim kalibrasyon", puan: 2 });
      strengths.push(`Vib ref Δ ${d}`);
    }
  }

  if (meta.transportMode || reading?.transportMode) {
    score += 1;
    strengths.push("Taşıma modu farkındalığı");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 92;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    vibrationLabeledEvents: labeled,
    referenceVibration: cfg.referenceVibration ?? null,
    factoryVibCert: cfg.factoryVibCert !== false,
    adxlFirmwareProd: cfg.adxlFirmwareProd !== false,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Titreşim kalite 100/100 — ADXL + yağma füzyon + etiket (SH 92 geçildi)"
        : score >= 90
          ? `Titreşim kalite ${score}/100 · SH parity %${shParityPct}`
          : `Titreşim kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(labeled < 50 ? ["Yağma/rüzgar/taşıma olay etiketlerini artır"] : []),
            ...(cfg.referenceVibration == null ? ["Referans titreşim kalibrasyonu"] : []),
            "ADXL FFT spektrum sınıfı genişlet",
          ].slice(0, 3),
  };
}

module.exports = { analyzeVibrationSensorQuality };
