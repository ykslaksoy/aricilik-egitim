/**
 * Kovan başlangıç skoru (Petek Tarama) + sensör revizyonu + trend kayıtları.
 */

const dbService = require("./dbService");

/** Skorlanabilir tüm boyutlar — tek snapshot şeması */
const SCORE_FIELDS = [
  { key: "weightKg", label: "Tartı", unit: "kg", higherBetter: true },
  { key: "colonyScore", label: "Koloni skoru", unit: "", higherBetter: true },
  { key: "healthScore", label: "Sağlık", unit: "", higherBetter: true },
  { key: "swarmRiskScore", label: "Oğul riski", unit: "", higherBetter: false },
  { key: "diseaseRiskScore", label: "Hastalık riski", unit: "", higherBetter: false },
  { key: "beeEstimate", label: "Arı tahmini", unit: "", higherBetter: true },
  { key: "honeyKgEstimate", label: "Bal tahmini", unit: "kg", higherBetter: true },
  { key: "harvestReadiness", label: "Hasat hazırlık", unit: "", higherBetter: true },
  { key: "tempScore", label: "Sıcaklık skoru", unit: "", higherBetter: true },
  { key: "humScore", label: "Nem skoru", unit: "", higherBetter: true },
  { key: "deepHealth", label: "Sağlık (derin)", unit: "", higherBetter: true },
  { key: "deepSwarm", label: "Oğul (derin)", unit: "", higherBetter: false },
  { key: "calibrationScore", label: "Kalibrasyon güveni", unit: "", higherBetter: true },
];

/**
 * @param {object} reading
 * @param {object} colony
 * @param {object} config
 * @param {object} [extra]
 */
function extractScoreSnapshot(reading, colony, config = {}, extra = {}) {
  const c = colony || {};
  const deep = c.scoresDeep || {};
  const analysis = extra.analysis || null;

  const snapshot = {
    ts: reading?.ts || analysis?.ts || new Date().toISOString(),
    weightKg: reading?.weightKg ?? config.weightKgAtCalibration ?? null,
    colonyScore: analysis?.colonyScore ?? c.score ?? null,
    healthScore: c.healthScore ?? deep.health?.healthScore ?? null,
    swarmRiskScore: c.swarmRiskScore ?? deep.swarm?.swarmRiskScore ?? null,
    diseaseRiskScore: c.diseaseRiskScore ?? deep.disease?.varroaProxy ?? null,
    beeEstimate: analysis?.referenceBeeCount ?? config.referenceBeeCount ?? c.beeEstimate ?? null,
    beeEstimateMin: analysis?.referenceBeeCountMin ?? c.beeEstimateMin ?? null,
    beeEstimateMax: analysis?.referenceBeeCountMax ?? c.beeEstimateMax ?? null,
    honeyKgEstimate: analysis?.honeyKgEstimate ?? c.harvest?.honeyKgEstimate ?? null,
    combKg: analysis?.combKg ?? config.combKg ?? null,
    beeKg: analysis?.beeKg ?? null,
    harvestReadiness: c.harvest?.hazirlikSkoru ?? null,
    tempScore: c.temperature?.tempScore ?? null,
    humScore: c.humidity?.humScore ?? null,
    tempC: reading?.tempC ?? null,
    humidity: reading?.humidity ?? null,
    beeIn: reading?.beeIn ?? null,
    beeOut: reading?.beeOut ?? null,
    audioRms: reading?.audioRms ?? null,
    vibration: reading?.vibration ?? null,
    strengthLabel: analysis?.strengthLabel ?? c.strengthLabel ?? null,
    swarmPhase: c.swarmPhase ?? null,
    deepSwarm: deep.swarm?.swarmRiskScore ?? null,
    deepDisease: deep.disease?.varroaProxy ?? null,
    deepHealth: deep.health?.healthScore ?? null,
    deepBroodActive: c.broodEmergence?.active ?? false,
    calibrationScore: c.calibration?.calScore ?? analysis?.confidence ?? config.petekTaramaConfidence ?? null,
    referenceBeeCount: config.referenceBeeCount ?? analysis?.referenceBeeCount ?? null,
    tareKg: config.tareKg ?? null,
    petekTaramaConfidence: config.petekTaramaConfidence ?? analysis?.confidence ?? null,
    source: extra.source || "sensor",
  };
  return snapshot;
}

function deltaTrend(baselineVal, currentVal, higherBetter = true) {
  if (baselineVal == null || currentVal == null || !Number.isFinite(baselineVal) || !Number.isFinite(currentVal)) {
    return { delta: null, trend: "unknown", label: "—" };
  }
  const delta = Math.round((currentVal - baselineVal) * 10) / 10;
  let trend = "stable";
  if (Math.abs(delta) < 0.05 || (Math.abs(delta) < 1 && Math.abs(baselineVal) > 10)) {
    trend = "stable";
  } else if (higherBetter ? delta > 0 : delta < 0) {
    trend = "up";
  } else {
    trend = "down";
  }
  return { delta, trend, label: delta > 0 ? `+${delta}` : String(delta) };
}

/**
 * @param {object} baselineScores
 * @param {object} currentScores
 */
function computeRevision(baselineScores, currentScores) {
  if (!baselineScores || !currentScores) {
    return { hasBaseline: false, dimensions: [], ozet: "Başlangıç skoru yok — Petek Tarama yapın" };
  }

  const dimensions = SCORE_FIELDS.map(({ key, label, unit, higherBetter }) => {
    const base = baselineScores[key];
    const cur = currentScores[key];
    const { delta, trend, label: deltaLabel } = deltaTrend(base, cur, higherBetter);
    return {
      key,
      label,
      unit,
      baseline: base,
      current: cur,
      delta,
      deltaLabel,
      trend,
      higherBetter,
    };
  }).filter((d) => d.baseline != null || d.current != null);

  const improved = dimensions.filter(
    (d) => d.trend === "up" || (d.trend === "down" && !d.higherBetter)
  ).length;
  const worsened = dimensions.filter(
    (d) => d.trend === "down" || (d.trend === "up" && !d.higherBetter)
  ).length;

  let ozet = "Başlangıç skoruna göre stabil";
  if (worsened > improved + 1) ozet = "Başlangıç skoruna göre bazı göstergeler zayıfladı";
  else if (improved > worsened + 1) ozet = "Başlangıç skoruna göre koloni güçleniyor";

  const weightRev = dimensions.find((d) => d.key === "weightKg");
  const healthRev = dimensions.find((d) => d.key === "healthScore");
  const highlights = [];
  if (weightRev?.delta != null) highlights.push(`Tartı ${weightRev.deltaLabel} kg`);
  if (healthRev?.delta != null) highlights.push(`Sağlık ${healthRev.deltaLabel}`);

  return {
    hasBaseline: true,
    baselineTs: baselineScores.ts,
    currentTs: currentScores.ts,
    dimensions,
    improved,
    worsened,
    stable: dimensions.length - improved - worsened,
    ozet,
    highlights,
    ariciya: `${ozet}${highlights.length ? ` · ${highlights.join(" · ")}` : ""}`,
  };
}

/**
 * Petek Tarama onayı → başlangıç skoru kaydı.
 */
function saveBaselineFromPetekTarama(hiveId, session, analysis, reading, colony, config) {
  const scores = extractScoreSnapshot(reading, colony, config, {
    analysis,
    source: "petek_tarama",
  });
  scores.mapQualityScore = analysis.mapQualityScore;
  scores.segmentCount = analysis.segmentsAnalyzed;

  const saved = dbService.saveHiveBaseline(hiveId, {
    source: "petek_tarama",
    sessionId: session.sessionId,
    scores,
    config: {
      tareKg: config.tareKg,
      combKg: config.combKg,
      referenceBeeCount: config.referenceBeeCount,
      weightKgAtCalibration: config.weightKgAtCalibration,
      petekTaramaConfidence: config.petekTaramaConfidence,
      petekTaramaAt: config.petekTaramaAt,
    },
    ts: scores.ts,
  });

  const revision = computeRevision(scores, scores);
  dbService.saveHiveScoreHistory(hiveId, scores, { ...revision, kind: "baseline_set" }, scores.ts);
  dbService.pruneHiveScoreHistory(hiveId, 500);

  return saved;
}

/**
 * Her sensör okumasında snapshot + revizyon kaydı.
 */
function recordSensorRevision(hiveId, reading, colony, config) {
  const baseline = dbService.getHiveBaseline(hiveId);
  const current = extractScoreSnapshot(reading, colony, config, { source: "sensor" });
  const revision = baseline
    ? computeRevision(baseline.scores, current)
    : { hasBaseline: false, ozet: "Başlangıç skoru yok" };

  dbService.saveHiveScoreHistory(hiveId, current, revision, current.ts);
  dbService.pruneHiveScoreHistory(hiveId, 500);

  return { baseline, current, revision };
}

function getBaseline(hiveId) {
  return dbService.getHiveBaseline(hiveId);
}

function getRevision(hiveId, reading, colony, config) {
  const baseline = dbService.getHiveBaseline(hiveId);
  const current = extractScoreSnapshot(reading, colony, config, { source: "sensor" });
  const revision = baseline
    ? computeRevision(baseline.scores, current)
    : { hasBaseline: false, ozet: "Başlangıç skoru yok — Petek Tarama yapın" };
  return { baseline, current, revision };
}

/**
 * Grafik analiz — zaman serisi + başlangıç çizgisi.
 */
function getTrends(hiveId, days = 90) {
  const baseline = dbService.getHiveBaseline(hiveId);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const history = dbService.listHiveScoreHistory(hiveId, { limit: 500, since });

  const seriesKeys = [
    "weightKg",
    "colonyScore",
    "healthScore",
    "beeEstimate",
    "honeyKgEstimate",
    "swarmRiskScore",
  ];

  const series = {};
  for (const key of seriesKeys) {
    series[key] = history
      .map((h) => ({ ts: h.ts, value: h.scores[key] }))
      .filter((p) => p.value != null && Number.isFinite(p.value));
  }

  const baselineLines = {};
  if (baseline?.scores) {
    for (const key of seriesKeys) {
      if (baseline.scores[key] != null) baselineLines[key] = baseline.scores[key];
    }
  }

  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;

  return {
    hiveId,
    days,
    baseline: baseline
      ? { ts: baseline.ts, source: baseline.source, scores: baseline.scores, config: baseline.config }
      : null,
    baselineLines,
    series,
    pointCount: history.length,
    range: first && latest ? { from: first.ts, to: latest.ts } : null,
    latestRevision: latest?.revision || null,
    fieldMeta: SCORE_FIELDS.filter((f) => seriesKeys.includes(f.key)),
  };
}

/**
 * DB boşsa bellek geçmişinden trend üret (demo).
 * @param {number} hiveId
 * @param {object[]} memorySeries
 * @param {object} config
 * @param {function} analyzeColonyFn
 */
function buildTrendsFromMemory(hiveId, memorySeries, config, analyzeColonyFn) {
  const baseline = dbService.getHiveBaseline(hiveId);
  const seriesKeys = [
    "weightKg",
    "colonyScore",
    "healthScore",
    "beeEstimate",
    "honeyKgEstimate",
    "swarmRiskScore",
  ];
  const series = {};
  for (const k of seriesKeys) series[k] = [];

  const step = Math.max(1, Math.floor((memorySeries?.length || 0) / 48));
  for (let i = 0; i < (memorySeries?.length || 0); i += step) {
    const reading = memorySeries[i];
    const slice = memorySeries.slice(0, i + 1);
    let colony = null;
    try {
      colony = analyzeColonyFn(slice, reading, config);
    } catch (_) {
      colony = {};
    }
    const snap = extractScoreSnapshot(reading, colony, config, { source: "memory" });
    for (const k of seriesKeys) {
      if (snap[k] != null) series[k].push({ ts: snap.ts, value: snap[k] });
    }
  }

  const baselineLines = {};
  if (baseline?.scores) {
    for (const k of seriesKeys) {
      if (baseline.scores[k] != null) baselineLines[k] = baseline.scores[k];
    }
  }

  const pointCount = series.weightKg?.length || 0;
  return {
    hiveId,
    days: 90,
    baseline: baseline
      ? { ts: baseline.ts, source: baseline.source, scores: baseline.scores, config: baseline.config }
      : null,
    baselineLines,
    series,
    pointCount,
    range:
      memorySeries?.length > 0
        ? { from: memorySeries[0].ts, to: memorySeries[memorySeries.length - 1].ts }
        : null,
    latestRevision: null,
    fieldMeta: SCORE_FIELDS.filter((f) => seriesKeys.includes(f.key)),
    source: "memory_fallback",
  };
}

module.exports = {
  SCORE_FIELDS,
  extractScoreSnapshot,
  computeRevision,
  saveBaselineFromPetekTarama,
  recordSensorRevision,
  getBaseline,
  getRevision,
  getTrends,
  buildTrendsFromMemory,
};
