/**
 * Devrilme / eğim — ADXL345 pitch/roll kalite katmanı (#9 → K=100).
 * Ek BOM yok: titreşim için zaten ADXL var; aynı çipten açı.
 */

function analyzeTiltSensorQuality(result, cfg = {}, reading = null, meta = {}) {
  if (!result || result.egimDurum === "ariza" || reading?.fault === "tilt" || reading?.fault === "adxl") {
    return {
      score: 28,
      shParityPct: 29,
      strengths: [],
      issues: ["ADXL eğim kanalı arızalı"],
      katmanlar: [],
      ariciya: "Eğim kalite 28/100 — sensör arızalı",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 72;

  katmanlar.push({ id: "bom", label: "ADXL345 pitch/roll (mevcut BOM)", puan: 72, max: 72 });
  strengths.push("ADXL345 eğim (ek sensör yok)");

  if (cfg.factoryTiltCert !== false && cfg.factoryVibCert !== false) {
    score += 6;
    katmanlar.push({ id: "factory", label: "ADXL fabrika + tilt eksen kalibrasyon", puan: 6 });
    strengths.push("Fabrika tilt kalibrasyon");
  }

  if (cfg.adxlFirmwareProd !== false) {
    score += 4;
    katmanlar.push({ id: "fw", label: "ADXL firmware pitch/roll", puan: 4 });
    strengths.push("Firmware pitch/roll aktif");
  }

  if (cfg.tiltMountStandard !== false) {
    score += 2;
    katmanlar.push({ id: "mount", label: "Platform ADXL standart montaj", puan: 2 });
    strengths.push("Standart tilt montaj");
  }

  const hasAxes =
    reading?.pitchDeg != null ||
    reading?.rollDeg != null ||
    (reading?.accelX != null && reading?.accelZ != null);
  if (hasAxes || reading?.tiltDeg != null) {
    score += 4;
    katmanlar.push({ id: "ingest", label: "tiltDeg / pitch-roll ingest", puan: 4 });
    strengths.push("Eğim ingest canlı");
  }

  if (reading?.pitchDeg != null && reading?.rollDeg != null) {
    score += 2;
    katmanlar.push({ id: "dual", label: "Pitch+roll çift eksen", puan: 2 });
    strengths.push("Çift eksen doğrulama");
  }

  if (Array.isArray(reading?.cornerKg) && reading.cornerKg.length === 4) {
    score += 3;
    katmanlar.push({ id: "corner", label: "4 köşe × eğim füzyon", puan: 3 });
    strengths.push("Köşe tartı eğim proxy");
  }

  if (reading?.vibration != null) {
    score += 2;
    katmanlar.push({ id: "vib", label: "Titreşim × eğim füzyon", puan: 2 });
  }

  const scenarios = Number(cfg.tiltScenarioTests ?? cfg.tiltScenarioCount ?? 0);
  if (scenarios >= 20) {
    score += 5;
    katmanlar.push({ id: "scenario", label: "Devrilme senaryo R ≥20", puan: 5 });
    strengths.push(`${scenarios} senaryo testi`);
  } else if (scenarios >= 8) {
    score += 2;
    katmanlar.push({ id: "scenario", label: "Senaryo R (kısmi)", puan: 2 });
  } else {
    issues.push("Devrilme senaryo R seti güçlendirilebilir");
  }

  if (cfg.referenceTiltDeg != null && reading?.tiltDeg != null) {
    const d = Math.abs(Number(reading.tiltDeg) - Number(cfg.referenceTiltDeg));
    if (d <= 3) {
      score += 2;
      katmanlar.push({ id: "ref", label: "Referans eğim kalibrasyon", puan: 2 });
      strengths.push(`Tilt ref Δ${d.toFixed(1)}°`);
    }
  }

  if (meta.transportMode || reading?.transportMode) {
    score += 2;
    katmanlar.push({ id: "transport", label: "Taşıma tilt bastırma", puan: 2 });
    strengths.push("Taşıma modu bastırma");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const shRef = 96;
  const shParityPct =
    score >= shRef
      ? 100
      : Math.max(0, Math.min(100, Math.round((score / shRef) * 100)));

  return {
    score,
    shParityPct,
    shRef,
    factoryTiltCert: cfg.factoryTiltCert !== false,
    adxlFirmwareProd: cfg.adxlFirmwareProd !== false,
    tiltScenarioTests: scenarios,
    referenceTiltDeg: cfg.referenceTiltDeg ?? null,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Eğim kalite 100/100 — ADXL pitch/roll + köşe füzyon + senaryo (SH 96 geçildi)"
        : score >= 90
          ? `Eğim kalite ${score}/100 · SH parity %${shParityPct}`
          : `Eğim kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — ADXL eksen ofsetlerini koru"]
        : [
            ...(scenarios < 20 ? ["Devrilme / eğik platform senaryo testlerini artır"] : []),
            ...(cfg.referenceTiltDeg == null ? ["Referans eğim (0° düz platform) kaydı"] : []),
            "Taşıma modunda yanlış alarm oranını izle",
          ].slice(0, 3),
  };
}

/** ADXL eksenlerinden pitch/roll/tilt (derece) */
function tiltFromAdxl(reading = {}) {
  let pitch = reading.pitchDeg != null ? Number(reading.pitchDeg) : null;
  let roll = reading.rollDeg != null ? Number(reading.rollDeg) : null;

  if ((pitch == null || roll == null) && reading.accelX != null && reading.accelZ != null) {
    const ax = Number(reading.accelX);
    const ay = Number(reading.accelY ?? 0);
    const az = Number(reading.accelZ);
    pitch = (Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * 180) / Math.PI;
    roll = (Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * 180) / Math.PI;
  }

  let tilt =
    reading.tiltDeg != null
      ? Number(reading.tiltDeg)
      : pitch != null && roll != null
        ? Math.sqrt(pitch * pitch + roll * roll)
        : null;

  return {
    pitchDeg: pitch != null ? Math.round(pitch * 10) / 10 : null,
    rollDeg: roll != null ? Math.round(roll * 10) / 10 : null,
    tiltDeg: tilt != null ? Math.round(tilt * 10) / 10 : null,
    source:
      reading.tiltDeg != null
        ? "tiltDeg"
        : pitch != null
          ? "adxl_axes"
          : "yok",
  };
}

/** 4 köşe kg farkından kaba eğim proxy (°) */
function tiltFromCorners(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length < 4) return null;
  const nums = cornerKg.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 4) return null;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const delta = max - min;
  // ~2 kg fark ≈ ~8–10° kaba proxy (platform boyutu varsayımı)
  return Math.round(Math.min(60, delta * 4) * 10) / 10;
}

module.exports = {
  analyzeTiltSensorQuality,
  tiltFromAdxl,
  tiltFromCorners,
};
