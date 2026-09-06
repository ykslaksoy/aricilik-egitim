/**
 * Kovan Petek Tarama — görüntü / ses analizi (edge ML yer tutucu + kalite kapısı).
 * Gerçek cihazda: segment video → yoğunluk / doluluk sınıflandırıcı.
 */

const {
  GAP_COUNT,
  SIDES,
  QUALITY,
  BEE_MASS_KG,
  WAX_KG_DEFAULT,
  WAX_KG_PER_GAP,
} = require("../../../../packages/shared/petekTaramaConstants");

function segKey(gap, side) {
  return `${gap}-${side}`;
}

function hashSeed(hiveId, gap, side, extra = 0) {
  return ((hiveId || 1) * 997 + gap * 31 + (side === "left" ? 7 : 13) + extra) % 10000;
}

function pseudo01(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * @param {{ blur?: number, brightness?: number, motion?: number, framing?: number }} q
 */
function validateSegmentQuality(q = {}) {
  const issues = [];
  const blur = q.blur ?? 0;
  const brightness = q.brightness ?? 0;
  const motion = q.motion ?? 1;
  const framing = q.framing ?? 0;

  if (blur < QUALITY.BLUR_MIN) issues.push("Görüntü bulanık — sabitleyin ve tekrar çekin");
  if (brightness < QUALITY.BRIGHTNESS_MIN) issues.push("Çok karanlık — gölge veya flaş kullanın");
  if (brightness > QUALITY.BRIGHTNESS_MAX) issues.push("Aşırı parlak — açı veya gölge ayarlayın");
  if (motion > QUALITY.MOTION_MAX) issues.push("Çok hareket — telefonu sabitleyin");
  if (framing < QUALITY.FRAMING_MIN) issues.push("Petek aralığı kadrajda değil — hizalayın");

  const scores = [blur / QUALITY.BLUR_MIN, brightness >= QUALITY.BRIGHTNESS_MIN ? 1 : 0, motion <= QUALITY.MOTION_MAX ? 1 : 0, framing / QUALITY.FRAMING_MIN];
  const qualityScore = Math.round((scores.reduce((a, b) => a + Math.min(1, b), 0) / scores.length) * 100);

  return {
    ok: issues.length === 0,
    issues,
    qualityScore,
    metrics: { blur, brightness, motion, framing },
  };
}

/**
 * Tek segment yoğunluk + doluluk (demo: kalite + hiveId deterministik).
 * @param {number} hiveId
 * @param {number} gap 1..10
 * @param {'left'|'right'} side
 * @param {object} quality
 * @param {number} [weightKg]
 */
function analyzeSegmentDensity(hiveId, gap, side, quality, weightKg = 30) {
  const seed = hashSeed(hiveId, gap, side);
  const q = validateSegmentQuality(quality);
  const baseDensity = 0.42 + pseudo01(seed) * 0.38;
  const weightBoost = Math.min(0.12, (weightKg - 24) / 120);
  const qualityFactor = (q.qualityScore / 100) * 0.15;
  const density = Math.min(0.98, baseDensity + weightBoost + qualityFactor);

  const fillRoll = pseudo01(seed + 3);
  let fillType = "karisik";
  if (fillRoll > 0.72) fillType = "bal";
  else if (fillRoll > 0.45) fillType = "yavru";
  else if (fillRoll < 0.18) fillType = "bos";

  const beeFactor = fillType === "bal" ? 0.35 : fillType === "bos" ? 0.55 : 0.85;
  const estimatedBeesInView = Math.round(density * beeFactor * (420 + pseudo01(seed + 5) * 180));

  return {
    gap,
    side,
    density: Math.round(density * 100) / 100,
    fillType,
    beesInView: estimatedBeesInView,
    qualityScore: q.qualityScore,
    accepted: q.ok,
    issues: q.issues,
  };
}

/**
 * @param {{ durationSec?: number, rms?: number, peak?: number }} audio
 */
function analyzeScanAudio(audio = {}) {
  const rms = audio.rms ?? 0.35;
  const duration = audio.durationSec ?? 0;
  let mood = "normal";
  let queenlessSuspect = false;
  let swarmPrep = false;
  const notes = [];

  if (duration < 5) notes.push("Ses kaydı kısa — güven düşük");
  if (rms < 0.08) {
    mood = "sessiz";
    queenlessSuspect = true;
    notes.push("Düşük uğultu — ana kaybı şüphesi (yerinde doğrulayın)");
  } else if (rms > 0.62) {
    mood = "yoğun";
    swarmPrep = rms > 0.72;
    if (swarmPrep) notes.push("Yoğun uğultu — oğul hazırlığı olabilir");
  }

  return {
    mood,
    rms: Math.round(rms * 1000) / 1000,
    durationSec: duration,
    queenlessSuspect,
    swarmPrep,
    notes,
    ariciya:
      notes[0] ||
      (mood === "normal" ? "Koloni uğultusu normal" : `Ses: ${mood}`),
  };
}

/**
 * Tüm segmentler + tartı → koloni kalibrasyon analizi.
 * @param {object} session
 */
function analyzePetekTaramaSession(session) {
  const { hiveId, tareKg, weightKg, segments = {}, audio } = session;
  const segmentList = [];
  let mapComplete = true;
  let mapScore = 0;

  for (let gap = 1; gap <= GAP_COUNT; gap++) {
    for (const side of SIDES) {
      const key = segKey(gap, side);
      const seg = segments[key];
      if (!seg?.accepted) {
        mapComplete = false;
        continue;
      }
      const analysis = analyzeSegmentDensity(hiveId, gap, side, seg.quality, weightKg);
      segmentList.push({ ...seg, analysis });
      mapScore += analysis.qualityScore;
    }
  }

  if (!mapComplete) {
    return {
      ok: false,
      error: "map_incomplete",
      ariciya: "Petek haritası tamamlanmadı — eksik aralıkları çekin",
    };
  }

  const avgQuality = Math.round(mapScore / (GAP_COUNT * SIDES.length));
  const totalBeesInView = segmentList.reduce((s, x) => s + (x.analysis?.beesInView || 0), 0);

  /** Görünür alan → koloni tahmini (üst kat + aralık çarpanı) */
  const visibilityFactor = 2.8 + (avgQuality / 100) * 0.6;
  let referenceBeeCount = Math.round(totalBeesInView * visibilityFactor);

  /** Tartı ile üst sınır kontrolü */
  const netKg = weightKg - tareKg;
  const maxBeeKg = Math.max(0.5, netKg - 2);
  const maxBeesFromWeight = Math.round(maxBeeKg / BEE_MASS_KG);
  referenceBeeCount = Math.min(referenceBeeCount, maxBeesFromWeight);

  const beeKg = Math.round(referenceBeeCount * BEE_MASS_KG * 10) / 10;
  let combKg = Math.round((netKg - beeKg) * 10) / 10;
  if (combKg < 0) combKg = 0;

  const balSegments = segmentList.filter((s) => s.analysis?.fillType === "bal").length;
  const yavruSegments = segmentList.filter((s) => s.analysis?.fillType === "yavru").length;
  const waxKg = Math.round(Math.min(combKg, WAX_KG_DEFAULT + WAX_KG_PER_GAP * 2) * 10) / 10;
  const honeyKg = Math.round(Math.max(0, combKg - waxKg) * 10) / 10;

  const spread = avgQuality >= 80 ? 0.1 : avgQuality >= 65 ? 0.14 : 0.18;
  const beeMin = Math.round(referenceBeeCount * (1 - spread));
  const beeMax = Math.round(referenceBeeCount * (1 + spread));

  const audioAnalysis = analyzeScanAudio(audio || {});

  let confidence = avgQuality;
  if (weightKg <= tareKg) confidence -= 25;
  if ((audio?.durationSec ?? 0) >= 20) confidence += 5;
  if (audioAnalysis.queenlessSuspect) confidence -= 8;
  confidence = Math.max(0, Math.min(98, Math.round(confidence)));

  /** Başlangıç koloni skoru (kalibrasyon anı) */
  let colonyScore = 50;
  if (referenceBeeCount >= 45000) colonyScore += 22;
  else if (referenceBeeCount >= 35000) colonyScore += 14;
  else if (referenceBeeCount >= 28000) colonyScore += 8;
  else if (referenceBeeCount < 18000) colonyScore -= 12;
  if (honeyKg >= 12) colonyScore += 10;
  else if (honeyKg >= 6) colonyScore += 5;
  if (confidence >= 85) colonyScore += 5;
  colonyScore = Math.max(0, Math.min(100, colonyScore));

  let strengthLabel = "Orta";
  if (referenceBeeCount >= 45000) strengthLabel = "Çok güçlü";
  else if (referenceBeeCount >= 35000) strengthLabel = "Güçlü";
  else if (referenceBeeCount < 20000) strengthLabel = "Zayıf";

  return {
    ok: true,
    mapComplete: true,
    segmentsAnalyzed: segmentList.length,
    mapQualityScore: avgQuality,
    confidence,
    referenceBeeCount,
    referenceBeeCountMin: beeMin,
    referenceBeeCountMax: beeMax,
    beeKg,
    combKg,
    waxKgEstimate: waxKg,
    honeyKgEstimate: honeyKg,
    netWeightKg: Math.round(netKg * 10) / 10,
    fillSummary: { bal: balSegments, yavru: yavruSegments, toplam: segmentList.length },
    audio: audioAnalysis,
    colonyScore,
    strengthLabel,
    segmentDetails: segmentList.map((s) => ({
      gap: s.gap,
      side: s.side,
      fillType: s.analysis?.fillType,
      density: s.analysis?.density,
      qualityScore: s.analysis?.qualityScore,
    })),
    ariciya: `Petek taraması: ~${referenceBeeCount.toLocaleString("tr-TR")} arı, ~${honeyKg} kg bal · güven %${confidence}`,
    oneriler: [
      confidence < 75 ? "Düşük güven — zayıf segmentleri tekrar çekin" : null,
      audioAnalysis.queenlessSuspect ? "Ana kontrolü yapın" : null,
      "Onay sonrası sensörler bu referansa göre izlenir",
    ].filter(Boolean),
  };
}

module.exports = {
  validateSegmentQuality,
  analyzeSegmentDensity,
  analyzeScanAudio,
  analyzePetekTaramaSession,
  segKey,
};
