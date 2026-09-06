/**
 * Kalibrasyon kalitesi — tüm tahminlere güven çarpanı.
 */

const { SCORE, SENSOR } = require("../../../../packages/shared/constants");
const { analyzeCornerScaleCalibration } = require("./cornerScaleCalibration");

function analyzeCalibrationQuality(history, reading, colony, cfg = {}, meta = {}) {
  const issues = [];
  const strengths = [];
  let score = 50;

  if (cfg.referenceBeeCount && cfg.middayBeeOutRef) {
    score += 25;
    strengths.push("Referans arı sayımı kalibre");
  } else if (cfg.referenceBeeCount && cfg.petekTaramaAt) {
    score += 22;
    strengths.push("Kovan Petek Tarama kalibrasyonu");
  } else {
    issues.push("Referans arı sayımı yok — trafik tahmini orta güven");
  }

  if (cfg.petekTaramaConfidence >= 85) {
    score += 5;
    strengths.push(`Petek tarama güveni %${cfg.petekTaramaConfidence}`);
  }

  if (cfg.tareKg != null && cfg.combKg != null) {
    score += 10;
    strengths.push("Tare + petek kayıtlı");
  }

  const traffic = colony?.middayTraffic || { samples: 0 };
  if (traffic.samples >= 20) {
    score += 15;
    strengths.push(`${traffic.samples} öğlen örneği`);
  } else if (traffic.samples < 4) {
    issues.push("Az öğlen verisi — IR kalibrasyonu beklet");
    score -= 10;
  }

  if (reading?.cameraPresent && colony?.sensors?.ir) {
    const cmp = meta._hiveCameraIr || null;
    if (cmp?.agrees) {
      score += 10;
      strengths.push("Kamera ↔ IR uyumlu");
    } else if (reading.cameraBeeOut != null) {
      issues.push("Kamera ↔ IR sapması — öğlen kalibrasyonu öner");
      score -= 5;
    }
  }

  if (colony?.calibrated) score += 8;

  const cornerScale = analyzeCornerScaleCalibration(cfg, reading);
  if (cornerScale.score >= 98) {
    score += 8;
    strengths.push(`4 köşe kalibrasyon ${cornerScale.score}/100`);
  } else if (cornerScale.score >= 85) {
    score += 4;
    strengths.push(`4 köşe kalibrasyon ${cornerScale.score}/100`);
  } else if (cornerScale.issues.length) {
    issues.push(cornerScale.issues[0]);
    score -= 4;
  }
  if (cornerScale.imbalanceKg < 0.5 && cfg.cornerOffsetsKg) {
    score += 5;
    strengths.push("Köşe dengesi mükemmel (offset)");
  } else if (cornerScale.imbalanceKg >= SENSOR.CORNER_IMBALANCE_KG) {
    issues.push(`Köşe farkı ${cornerScale.imbalanceKg} kg — offset öner`);
    score -= 6;
  }

  if (reading?.loraRssi != null && reading.loraRssi > -100) {
    score += 5;
    strengths.push("LoRa bağlantısı aktif");
  }

  if (reading?.beeIn != null && reading?.beeOut != null && traffic.samples >= 8) {
    score += 4;
    strengths.push("IR trafik akışı düzenli");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let guven = "dusuk";
  if (score >= 75) guven = "yuksek";
  else if (score >= 55) guven = "orta";

  const carpan = score >= 75 ? 1 : score >= 55 ? 0.85 : 0.7;

  return {
    calScore: score,
    guven,
    carpan,
    cornerScale,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 4),
    ariciya: `Kalibrasyon güveni ${score}/100 (${guven})${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler: issues.length
      ? [
          ...(cornerScale.suggestOffsets && !cfg.cornerOffsetsKg
            ? ["Köşe offset kalibrasyonu uygula"]
            : []),
          "Öğlen trafik kalibrasyonu tamamla",
          "Referans arı sayımı gir",
        ].slice(0, 3)
      : ["Kalibrasyon iyi — mevcut ayarları koru"],
  };
}

module.exports = { analyzeCalibrationQuality };
