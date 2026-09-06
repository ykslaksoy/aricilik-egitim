/**
 * Donanım bütünlüğü — tam beepack paketi, sensör durumu, analiz kapsamı.
 * Graceful degradation: kısmi arızada izleme sürer, bütünlük skoru düşer.
 */

const { ANALYSES } = require("../../../../packages/shared/analysisRegistry");
const { SENSOR_LABELS } = require("./sensorHealth");
const { statusForHive } = require("./analysisStatus");

/** Tek paket — tüm kovanlarda tam donanım */
const FULL_PACKAGE = {
  id: "full",
  label: "beepack (tam donanım)",
  sensors: ["scale", "temp", "humidity", "ir", "mic", "vibration", "camera", "connectivity"],
  optional: ["mainCamera"],
};

/** Sensör arızası → etkilenen analizler */
const SENSOR_FAILURE_IMPACT = {
  scale: {
    primary: ["tarti", "kose_tarti", "baglanti", "hasat_zamani", "yavru_cikisi"],
    shared: ["koloni_skoru", "saglik_skoru", "ogul_riski", "ari_tahmini", "ogul_derin", "yavru_derin", "hava_indeksleri"],
    fallback: "IR · kamera CV · ses",
  },
  ir: {
    primary: ["ir_trafik", "kamera_ir_ky"],
    shared: ["ogul_riski", "ari_tahmini", "ogul_derin", "yavru_derin", "hava_indeksleri"],
    fallback: "Tartı · kamera CV",
  },
  humidity: {
    primary: ["nem"],
    shared: ["saglik_skoru", "hastalik_derin", "koloni_skoru"],
    fallback: "Dış hava nem verisi",
  },
  temp: {
    primary: ["sicaklik"],
    shared: ["saglik_skoru", "hastalik_derin", "koloni_skoru"],
    fallback: "—",
  },
  mic: {
    primary: ["mikrofon", "akustik_ml"],
    shared: ["ogul_derin"],
    fallback: "IR trafik (zayıf proxy)",
  },
  vibration: {
    primary: ["titresim"],
    shared: ["kamera_guvenlik"],
    fallback: "Tartı düşüşü + IR",
  },
  camera: {
    primary: ["kovan_kamera", "kamera_ir_ky"],
    shared: ["kamera_guvenlik", "ari_tahmini"],
    fallback: "IR sayaç · tartı",
  },
  mainCamera: {
    primary: ["arilik_kamera"],
    shared: ["kamera_guvenlik", "arilik_birlesik"],
    fallback: "Kovan kameraları · titreşim · IR",
    optional: true,
  },
  connectivity: {
    primary: ["baglanti"],
    shared: ["koloni_skoru", "kovan_ozeti", "kovan_durumlari"],
    fallback: "—",
    critical: true,
  },
};

function analysisLabel(id) {
  return ANALYSES.find((a) => a.id === id)?.ad || id;
}

function sensorRows(health) {
  const rows = [];
  for (const id of FULL_PACKAGE.sensors) {
    const key = id === "connectivity" ? "connectivity" : id;
    const ok = health?.available?.[key] !== false;
    rows.push({
      id,
      label: id === "connectivity" ? "Bağlantı (LoRa)" : SENSOR_LABELS[id] || id,
      ok,
      status: ok ? "aktif" : "ariza",
      optional: FULL_PACKAGE.optional.includes(id),
    });
  }
  return rows;
}

function buildImpactForDown(downIds) {
  const impacts = [];
  for (const sensorId of downIds) {
    const ref = SENSOR_FAILURE_IMPACT[sensorId];
    if (!ref) continue;
    const affected = [...new Set([...(ref.primary || []), ...(ref.shared || [])])].map((id) => ({
      id,
      ad: analysisLabel(id),
      severity: (ref.primary || []).includes(id) ? "durur" : "duser",
    }));
    impacts.push({
      sensorId,
      sensorLabel: SENSOR_LABELS[sensorId] || sensorId,
      fallback: ref.fallback || "—",
      critical: Boolean(ref.critical),
      analyses: affected,
    });
  }
  return impacts;
}

function computeScores(sensorRows, analysisStatus) {
  const expected = sensorRows.filter((s) => !s.optional);
  const okCount = expected.filter((s) => s.ok).length;
  const sensorPct = expected.length ? Math.round((okCount / expected.length) * 100) : 100;

  const applicable = (analysisStatus?.analizler || []).filter(
    (a) => !["plan", "kapali", "atlandi"].includes(a.runtime) || a.runtime === "atlandi"
  );
  const active = applicable.filter((a) => a.runtime === "calisti").length;
  const degraded = applicable.filter((a) => a.runtime === "degraded").length;
  const broken = applicable.filter((a) => ["ariza", "veri_yok"].includes(a.runtime)).length;
  const skipped = (analysisStatus?.analizler || []).filter((a) => a.runtime === "atlandi").length;
  const denom = Math.max(1, active + degraded + broken);
  const analysisPct = Math.round(((active + degraded * 0.55) / denom) * 100);
  const overall = Math.round(sensorPct * 0.45 + analysisPct * 0.55);

  return {
    overall,
    sensorPct,
    analysisPct,
    sensorsOk: okCount,
    sensorsTotal: expected.length,
    analysesActive: active,
    analysesDegraded: degraded,
    analysesBroken: broken,
    analysesSkipped: skipped,
  };
}

function integrityLabel(score, mode) {
  if (mode === "critical") return { key: "kritik", label: "Kritik", cls: "critical" };
  if (score >= 90) return { key: "tam", label: "Tam bütünlük", cls: "full" };
  if (score >= 70) return { key: "iyi", label: "İyi — kısmi yedek", cls: "good" };
  if (score >= 45) return { key: "kisitli", label: "Kısıtlı", cls: "warn" };
  return { key: "dusuk", label: "Düşük", cls: "low" };
}

function buildAriciya(scores, mode, down, fallbacks) {
  if (mode === "critical") {
    return "Bağlantı veya kritik sensör kaybı — izleme sınırlı.";
  }
  if (mode === "full" && scores.overall >= 90) {
    return `${FULL_PACKAGE.label} — tüm sensörler ve analizler normal.`;
  }
  const downLabels = down.map((d) => d.label || d.id).join(", ");
  const fb = fallbacks?.length ? ` Yedek: ${fallbacks.join(" · ")}.` : "";
  return `Donanım bütünlüğü %${scores.overall} — ${downLabels || "kısmi mod"}.${fb} İzleme devam ediyor.`;
}

function evaluateHardwareIntegrity(hive) {
  const health = hive.sensorHealth || hive.colony?.sensorHealth;
  const sensors = sensorRows(health);
  const analysisStatus = statusForHive(hive);
  const scores = computeScores(sensors, analysisStatus);
  const mode = health?.mode || "full";
  const down = health?.down || sensors.filter((s) => !s.ok).map((s) => ({ id: s.id, label: s.label }));
  const fallbacks = health?.fallbacks || [];
  const impacts = buildImpactForDown(down.map((d) => d.id || d));
  const band = integrityLabel(scores.overall, mode);

  return {
    package: FULL_PACKAGE.id,
    packageLabel: FULL_PACKAGE.label,
    mode,
    score: scores.overall,
    sensorScore: scores.sensorPct,
    analysisScore: scores.analysisPct,
    band: band.key,
    bandLabel: band.label,
    bandClass: band.cls,
    sensors,
    scores,
    fallbacks,
    down,
    impacts,
    analysisSummary: {
      calisti: scores.analysesActive,
      degraded: scores.analysesDegraded,
      broken: scores.analysesBroken,
      atlandi: scores.analysesSkipped,
      toplam: analysisStatus.toplam,
    },
    ariciya: buildAriciya(scores, mode, down, fallbacks),
    monitoringContinues: mode !== "critical",
  };
}

function getImpactMatrix() {
  const sensorIds = ["scale", "ir", "humidity", "temp", "mic", "vibration", "camera", "mainCamera", "connectivity"];
  return sensorIds.map((sensorId) => {
    const ref = SENSOR_FAILURE_IMPACT[sensorId];
    if (!ref) return null;
    const fmt = (ids) => (ids || []).slice(0, 6).map(analysisLabel).join(", ");
    return {
      sensorId,
      sensorLabel: SENSOR_LABELS[sensorId] || sensorId,
      fallback: ref.fallback,
      critical: Boolean(ref.critical),
      durur: fmt(ref.primary),
      duser: fmt(ref.shared),
    };
  }).filter(Boolean);
}

function evaluateFleetIntegrity(hives = []) {
  const rows = hives.map((h) => {
    const ig = evaluateHardwareIntegrity(h);
    return {
      hiveId: h.hiveId || h.reading?.hiveId,
      scenarioLabel: h.scenarioLabel || h.meta?.label,
      score: ig.score,
      band: ig.band,
      mode: ig.mode,
      down: (ig.down || []).map((d) => d.label || d.id),
    };
  });
  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : 100;
  return {
    averageScore: avg,
    hiveCount: rows.length,
    degradedCount: rows.filter((r) => r.mode === "degraded").length,
    criticalCount: rows.filter((r) => r.mode === "critical").length,
    hives: rows.sort((a, b) => a.score - b.score),
    impactMatrix: getImpactMatrix(),
  };
}

module.exports = {
  FULL_PACKAGE,
  PACKAGE: { full: FULL_PACKAGE },
  SENSOR_FAILURE_IMPACT,
  evaluateHardwareIntegrity,
  evaluateFleetIntegrity,
  getImpactMatrix,
  getPackageImpactMatrix: getImpactMatrix,
};
