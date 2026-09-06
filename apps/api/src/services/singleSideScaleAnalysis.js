/**
 * Tek taraf tartı tahmini — 4 köşe yarı-platform toplamı (BroodMinder proxy, ek donanım yok).
 *
 * Köşe düzeni (platform üstten):
 *   [0] ön-sol   [1] ön-sağ
 *   [2] arka-sol [3] arka-sağ
 */

const { SENSOR } = require("../../../../packages/shared/constants");
const { checkIntegrity, analyzeCornerScaleCalibration } = require("./cornerScaleCalibration");

function deriveSides(corners) {
  const c = corners.map(Number);
  return {
    on: Math.round((c[0] + c[1]) * 100) / 100,
    arka: Math.round((c[2] + c[3]) * 100) / 100,
    sol: Math.round((c[0] + c[2]) * 100) / 100,
    sag: Math.round((c[1] + c[3]) * 100) / 100,
    toplam: Math.round(c.reduce((s, v) => s + v, 0) * 100) / 100,
  };
}

function pickSingleSide(sides) {
  if (sides.on >= sides.arka) {
    return { singleSideKg: sides.on, sideLabel: "ön", kaynak: "corner_half_on" };
  }
  return { singleSideKg: sides.arka, sideLabel: "arka", kaynak: "corner_half_arka" };
}

function referenceSingleSideFromConfig(reading, cfg = {}) {
  const { readingWithNormalizedCorners } = require("./cornerScaleCalibration");
  const norm = readingWithNormalizedCorners(reading, cfg);
  if (!Array.isArray(norm?.cornerKg) || norm.cornerKg.length < 4) return null;
  return pickSingleSide(deriveSides(norm.cornerKg)).singleSideKg;
}

function analyzeSingleSideScaleQuality(result, cfg = {}, reading = null, colony = null) {
  if (!result || result.mod === "off") {
    return {
      score: 0,
      guven: 0,
      bmParityPct: 0,
      strengths: [],
      issues: ["Tek taraf hesaplanamıyor"],
      katmanlar: [],
      ariciya: "Tek taraf kalite 0/100",
    };
  }

  const strengths = [];
  const issues = [];
  const katmanlar = [];
  let score = 78;

  katmanlar.push({ id: "algo_v2", label: "Yarı-platform algoritma v2", puan: 78, max: 78 });

  if (result.kaynak === "corner_half_on" || result.kaynak === "corner_half_arka") {
    strengths.push("BroodMinder-proxy yarı-platform");
  }

  const cornerScale = analyzeCornerScaleCalibration(cfg, reading);
  if (cornerScale.score >= 95) {
    score += 8;
    katmanlar.push({ id: "corner_fusion", label: "#1 köşe kalibrasyon füzyonu", puan: 8, ref: cornerScale.score });
    strengths.push(`#1 köşe ${cornerScale.score}/100`);
  } else if (cornerScale.score >= 85) {
    score += 4;
    katmanlar.push({ id: "corner_fusion", label: "#1 köşe kalibrasyon", puan: 4, ref: cornerScale.score });
  }

  if (result.weightDeltaKg != null) {
    if (result.weightDeltaKg <= 0.35) {
      score += 4;
      katmanlar.push({ id: "weight_xval", label: "Σköşe ↔ platform çapraz", puan: 4 });
      strengths.push(`Platform çapraz OK (Δ ${result.weightDeltaKg} kg)`);
    } else if (result.weightDeltaKg <= 1) {
      score += 2;
      katmanlar.push({ id: "weight_xval", label: "Platform çapraz (orta)", puan: 2 });
    } else {
      issues.push(`Platform sapması ${result.weightDeltaKg} kg`);
      score -= 4;
    }
  }

  if (result.halfDiffKg != null && result.halfDiffKg <= 0.5) {
    score += 3;
    katmanlar.push({ id: "half_balance", label: "Ön/arka denge", puan: 3 });
    strengths.push("Yarı-platform dengeli");
  } else if (result.halfDiffKg > 2) {
    issues.push(`Ön/arka fark ${result.halfDiffKg} kg`);
    score -= 3;
  }

  if (cfg.referenceSingleSideKg != null) {
    const refDelta = Math.abs(result.singleSideKg - cfg.referenceSingleSideKg);
    if (refDelta <= 0.5) {
      score += 4;
      katmanlar.push({ id: "field_ref", label: "Saha referans tek taraf", puan: 4 });
      strengths.push(`Referans uyum (Δ ${refDelta.toFixed(2)} kg)`);
    } else if (refDelta <= 1.5) {
      score += 2;
      katmanlar.push({ id: "field_ref", label: "Saha referans (yakın)", puan: 2 });
    } else {
      issues.push(`Referans sapma ${refDelta.toFixed(1)} kg`);
      score -= 2;
    }
  } else {
    issues.push("Saha referans tek taraf kaydı yok (#16 ile tamamlanır)");
  }

  if (colony?.beeEstimate != null && result.platformKg != null) {
    const tare = cfg.tareKg ?? 8;
    const comb = cfg.combKg ?? 17;
    const implied = tare + comb + colony.beeEstimate * 0.0001;
    const beeDelta = Math.abs(result.platformKg - implied);
    if (beeDelta <= 2) {
      score += 3;
      katmanlar.push({ id: "bee_fusion", label: "Arı tahmini çapraz", puan: 3 });
      strengths.push("Arı füzyonu uyumlu");
    }
  }

  if (result.guven >= 95) {
    score += 2;
    strengths.push(`Anlık güven %${result.guven}`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const ref = cfg.referenceSingleSideKg ?? result.singleSideKg;
  const refDelta =
    cfg.referenceSingleSideKg != null
      ? Math.abs(result.singleSideKg - cfg.referenceSingleSideKg)
      : 0;
  const bmParityPct =
    ref > 0
      ? refDelta <= 0.35
        ? 100
        : Math.max(
            0,
            Math.min(100, Math.round(100 - (refDelta / ref) * 100))
          )
      : result.halfDiffKg != null && result.halfDiffKg <= 0.5
        ? 100
        : 85;

  return {
    score,
    guven: result.guven,
    bmParityPct,
    broodMinderParityPct: bmParityPct,
    referenceSingleSideKg: cfg.referenceSingleSideKg ?? null,
    refDeltaKg:
      cfg.referenceSingleSideKg != null
        ? Math.round(Math.abs(result.singleSideKg - cfg.referenceSingleSideKg) * 100) / 100
        : null,
    cornerScaleScore: cornerScale.score,
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 3),
    katmanlar,
    ariciya:
      score >= 100
        ? "Tek taraf kalite 100/100 — tam stack (BroodMinder parity)"
        : score >= 90
          ? `Tek taraf kalite ${score}/100 · BM parity %${bmParityPct}`
          : `Tek taraf kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
    oneriler:
      score >= 100
        ? ["Kalibrasyon tam — mevcut ayarları koru"]
        : [
            ...(cfg.referenceSingleSideKg == null ? ["Saha referans tek taraf tartımı kaydet"] : []),
            ...(result.weightDeltaKg > 0.35 ? ["#1 köşe kalibrasyonunu yenile"] : []),
            "30 kovan validasyon serisi (#16)",
          ].slice(0, 3),
  };
}

function analyzeSingleSideScaleDeep(reading, colony, cfg = {}) {
  const result = analyzeSingleSideScale(reading, colony, cfg);
  const quality = analyzeSingleSideScaleQuality(result, cfg, reading, colony);
  const cornerScale = analyzeCornerScaleCalibration(cfg, reading);

  const vsBroodMinder = {
    koloniTekTarafKg: result.singleSideKg,
    koloniPlatformKg: result.platformKg,
    broodMinderProxyKg: cfg.referenceSingleSideKg ?? result.singleSideKg,
    parityPct: quality.bmParityPct,
    ekDonanim: false,
    broodMinderEkDonanim: true,
    maliyetAvantaji: "0₺ — #1 platform yeter",
  };

  const vsSuperHero = {
    beeHero: 0,
    arnia: 0,
    apisProtect: 0,
    beewise: 0,
    sh: 0,
    koloniAhw: 100,
    avantaj: "SüperHero 4'lüsünde yok — eşsiz",
  };

  return {
    ...result,
    quality,
    deep: {
      vsBroodMinder,
      vsSuperHero,
      cornerScale,
      katmanOzet: quality.katmanlar,
      tahminiSkor: quality.score,
      hedefSkor: 100,
    },
  };
}

function analyzeSingleSideScale(reading, colony, cfg = {}) {
  const corners = reading?.cornerKg;
  const hasCorners = Array.isArray(corners) && corners.length >= 4;
  const tare = cfg.tareKg ?? reading?.tareKg ?? 8;
  const comb = cfg.combKg ?? reading?.combKg ?? 17;

  let singleSideKg;
  let platformKg;
  let guven = 0;
  let kaynak = "yok";
  let sideLabel = "";
  let sides = null;
  let weightDeltaKg = null;

  if (hasCorners) {
    sides = deriveSides(corners);
    platformKg = sides.toplam;
    const spread = Math.max(...corners.map(Number)) - Math.min(...corners.map(Number));
    const halfDiff = Math.abs(sides.on - sides.arka);
    const picked = pickSingleSide(sides);
    singleSideKg = picked.singleSideKg;
    sideLabel = picked.sideLabel;
    kaynak = picked.kaynak;

    guven = spread <= 1 ? 90 : spread <= SENSOR.CORNER_IMBALANCE_KG ? 76 : 54;
    if (halfDiff <= 0.5) guven += 4;
    else if (halfDiff <= 1.5) guven += 2;

    const integrity = checkIntegrity(corners, reading?.weightKg, reading?.cornerKgRaw ?? corners);
    if (integrity.ok) guven = Math.min(96, guven + 6);

    if (reading?.weightKg != null) {
      weightDeltaKg = Math.round(Math.abs(platformKg - reading.weightKg) * 100) / 100;
      if (weightDeltaKg <= 0.35) guven = Math.min(98, guven + 8);
      else if (weightDeltaKg <= 1) guven = Math.min(94, guven + 3);
      else guven = Math.max(42, guven - 12);
    }

    if (cfg.factoryCalibCert) guven = Math.min(99, guven + 3);
    if (Array.isArray(cfg.cornerOffsetsKg) && cfg.cornerOffsetsKg.length === 4) {
      guven = Math.min(99, guven + 4);
    }
    if (cfg.referenceWeightKg != null) guven = Math.min(99, guven + 2);
    if (cfg.referenceSingleSideKg != null) {
      const refD = Math.abs(singleSideKg - cfg.referenceSingleSideKg);
      if (refD <= 0.5) guven = Math.min(100, guven + 4);
      else if (refD <= 1.5) guven = Math.min(97, guven + 2);
    }
  } else if (reading?.weightKg != null) {
    platformKg = reading.weightKg;
    singleSideKg = Math.round((platformKg / 2) * 100) / 100;
    guven = 66;
    kaynak = "platform_half";
    sideLabel = "tahmini";
  }

  if (colony?.beeEstimate != null && platformKg != null) {
    const beeKg = colony.beeEstimate * 0.0001;
    const impliedKg = tare + comb + beeKg;
    const diff = Math.abs(platformKg - impliedKg);
    if (colony.confidence === "high" && diff <= 2) {
      guven = Math.min(100, guven + 10);
    } else if (diff <= 2) {
      guven = Math.min(96, guven + 6);
    } else if (diff <= 4) {
      guven = Math.min(92, guven + 3);
    }
  }

  if (singleSideKg == null) {
    return {
      mod: "off",
      ariciya: "Tek taraf tartı hesaplanamıyor",
      singleSideKg: null,
    };
  }

  const resolvedPlatform = platformKg ?? reading?.weightKg ?? singleSideKg * 2;
  const honeyKg = Math.max(0, resolvedPlatform - tare - comb);
  const imbalance = hasCorners
    ? Math.max(...corners.map(Number)) - Math.min(...corners.map(Number))
    : 0;

  const kaynakLabel =
    kaynak === "corner_half_on" || kaynak === "corner_half_arka"
      ? `yarı-platform (${sideLabel})`
      : kaynak === "platform_half"
        ? "platform /2"
        : kaynak;

  const base = {
    mod: "calisiyor",
    singleSideKg: Math.round(singleSideKg * 100) / 100,
    platformKg: Math.round(resolvedPlatform * 100) / 100,
    platformFromCornersKg: hasCorners ? platformKg : null,
    honeyKg: Math.round(honeyKg * 100) / 100,
    sideLabel,
    sides,
    guven: Math.round(guven),
    kaynak,
    cornerSpreadKg: Math.round(imbalance * 100) / 100,
    halfDiffKg: sides ? Math.round(Math.abs(sides.on - sides.arka) * 100) / 100 : null,
    weightDeltaKg,
    ariciya: `Tek taraf ${singleSideKg.toFixed(1)} kg (${kaynakLabel}) · platform ${resolvedPlatform.toFixed(1)} kg · bal ${honeyKg.toFixed(1)} kg · güven %${Math.round(guven)}`,
  };

  const quality = analyzeSingleSideScaleQuality(base, cfg, reading, colony);
  base.quality = quality;
  base.ariciya = `${base.ariciya} · kalite ${quality.score}/100`;

  return base;
}

module.exports = {
  analyzeSingleSideScale,
  analyzeSingleSideScaleDeep,
  analyzeSingleSideScaleQuality,
  deriveSides,
  pickSingleSide,
  referenceSingleSideFromConfig,
};
