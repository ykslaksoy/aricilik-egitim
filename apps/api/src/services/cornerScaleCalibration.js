/**
 * 4 köşe platform tartı — offset, sıcaklık drift, bütünlük, otomatik sıfırlama.
 */

const { SENSOR } = require("../../../../packages/shared/constants");

const TEMP_DRIFT_KG_PER_C = 0.012;
const INTEGRITY_TOLERANCE_KG = 0.35;

function cornerImbalance(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length !== 4) return 0;
  const vals = cornerKg.map(Number).filter((x) => Number.isFinite(x));
  if (vals.length < 4) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

function applyCornerOffsets(cornerKg, offsets) {
  if (!Array.isArray(cornerKg) || cornerKg.length !== 4) return cornerKg;
  if (!Array.isArray(offsets) || offsets.length !== 4) return cornerKg;
  return cornerKg.map(
    (v, i) => Math.round((Number(v) - (Number(offsets[i]) || 0)) * 100) / 100
  );
}

function applyTempDrift(cornerKg, calibTempC, currentTempC) {
  if (!Array.isArray(cornerKg) || cornerKg.length !== 4) return cornerKg;
  if (calibTempC == null || currentTempC == null) return cornerKg;
  const drift = (Number(currentTempC) - Number(calibTempC)) * TEMP_DRIFT_KG_PER_C;
  return cornerKg.map((v) => Math.round((Number(v) - drift) * 100) / 100);
}

function normalizeCorners(reading, cfg = {}) {
  let corners = reading?.cornerKgRaw ?? reading?.cornerKg;
  if (!Array.isArray(corners) || corners.length !== 4) return null;
  corners = applyTempDrift(corners, cfg.calibTempC, reading?.tempC);
  corners = applyCornerOffsets(corners, cfg.cornerOffsetsKg);
  return corners;
}

function checkIntegrity(cornerKg, weightKg, rawCornerKg) {
  const check = Array.isArray(rawCornerKg) && rawCornerKg.length === 4 ? rawCornerKg : cornerKg;
  if (!Array.isArray(check) || check.length !== 4 || weightKg == null) {
    return { ok: null, deltaKg: null, sumKg: null };
  }
  const sum = check.reduce((s, v) => s + Number(v), 0);
  const delta = Math.abs(sum - Number(weightKg));
  return {
    ok: delta <= INTEGRITY_TOLERANCE_KG,
    deltaKg: Math.round(delta * 100) / 100,
    sumKg: Math.round(sum * 100) / 100,
  };
}

/** Dengesiz köşeleri ortalamaya sıfırla — otomatik tare offset önerisi */
function suggestCornerOffsets(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length !== 4) return null;
  const nums = cornerKg.map(Number);
  if (nums.some((v) => !Number.isFinite(v))) return null;
  const avg = nums.reduce((s, v) => s + v, 0) / 4;
  const cornerOffsetsKg = nums.map((v) => Math.round((v - avg) * 1000) / 1000);
  return {
    cornerOffsetsKg,
    avgKg: Math.round(avg * 100) / 100,
    expectedImbalanceKg: 0,
  };
}

function analyzeCornerScaleCalibration(cfg = {}, reading = null) {
  const rawCorners = reading?.cornerKgRaw ?? reading?.cornerKg;
  const normalized = normalizeCorners(reading, cfg);
  const rawImb = cornerImbalance(rawCorners);
  const normImb = cornerImbalance(normalized || rawCorners);
  const integrity = checkIntegrity(normalized || rawCorners, reading?.weightKg, rawCorners);

  const strengths = [];
  const issues = [];
  let score = 85;

  if (cfg.factoryCalibCert) {
    score += 5;
    strengths.push("Fabrika kalibrasyon sertifikası");
  }
  if (Array.isArray(cfg.cornerOffsetsKg) && cfg.cornerOffsetsKg.length === 4) {
    score += 4;
    strengths.push("Köşe offset kalibrasyonu");
  }
  if (cfg.calibTempC != null) {
    score += 3;
    strengths.push(`Sıcaklık referansı ${cfg.calibTempC}°C`);
  }
  if (integrity.ok) {
    score += 3;
    strengths.push(`Bütünlük OK (Δ ${integrity.deltaKg} kg)`);
  } else if (integrity.ok === false) {
    issues.push(`Köşe toplamı sapması ${integrity.deltaKg} kg`);
    score -= 5;
  }
  if (cfg.referenceWeightKg != null) {
    score += 1;
    strengths.push(`Referans tartım ${cfg.referenceWeightKg} kg`);
  }
  if (normImb < 0.5) {
    score += 2;
    strengths.push("Köşe dengesi mükemmel");
  } else if (normImb >= SENSOR.CORNER_IMBALANCE_KG) {
    issues.push(`Köşe farkı ${normImb.toFixed(1)} kg`);
    score -= 8;
  }

  score = Math.max(0, Math.min(100, score));

  const suggestOffsets =
    rawImb >= SENSOR.CORNER_IMBALANCE_KG ? suggestCornerOffsets(rawCorners) : null;

  return {
    score,
    rawImbalanceKg: Math.round(rawImb * 10) / 10,
    imbalanceKg: Math.round(normImb * 10) / 10,
    normalizedCorners: normalized,
    integrity,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    suggestOffsets,
    factoryCalibCert: Boolean(cfg.factoryCalibCert),
    ariciya:
      score >= 100
        ? "4 köşe kalibrasyon 100/100 — tam stack"
        : score >= 95
          ? `4 köşe kalibrasyon ${score}/100 — fabrika + offset + bütünlük`
          : `4 köşe kalibrasyon ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      suggestOffsets && !cfg.cornerOffsetsKg
        ? ["Köşe offset kalibrasyonu uygula (otomatik sıfırlama)"]
        : normImb >= SENSOR.CORNER_IMBALANCE_KG
          ? ["Platformu terazi; köşe offset kalibrasyonu"]
          : ["Kalibrasyon iyi — mevcut ayarları koru"],
  };
}

function readingWithNormalizedCorners(reading, cfg = {}) {
  if (!reading) return reading;
  const normalized = normalizeCorners(reading, cfg);
  if (!normalized) return reading;
  return { ...reading, cornerKgRaw: reading.cornerKg, cornerKg: normalized };
}

module.exports = {
  cornerImbalance,
  applyCornerOffsets,
  applyTempDrift,
  normalizeCorners,
  checkIntegrity,
  suggestCornerOffsets,
  analyzeCornerScaleCalibration,
  readingWithNormalizedCorners,
  TEMP_DRIFT_KG_PER_C,
  INTEGRITY_TOLERANCE_KG,
};
