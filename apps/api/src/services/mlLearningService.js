/**
 * Sürekli ML öğrenme — referans kayıt, sensör gereklilik skoru, donanım etkisi.
 * Yönetici paneli: GET /api/admin/ml/*
 */

const dbService = require("./dbService");
const mlModelService = require("./mlModelService");
const mlApprovalService = require("./mlApprovalService");
const hardwareIntegrityService = require("./hardwareIntegrityService");
const { SENSORS, ANALYSIS_SENSOR_MAP, DOMAINS, ANALYSES } = require("./mlConstants");
const { SENSOR_LABELS } = require("./sensorHealth");

function isLearningActive() {
  return dbService.getMlConfig("learning_mode") === "active";
}

function sensorSnapshot(reading, health) {
  const avail = health?.available || {};
  return {
    scale: { kg: reading?.weightKg, ok: avail.scale !== false },
    temp: { c: reading?.tempC, ok: avail.temp !== false },
    humidity: { pct: reading?.humidity, ok: avail.humidity !== false },
    ir: { in: reading?.beeIn, out: reading?.beeOut, ok: avail.ir !== false },
    mic: { rms: reading?.audioRms, ok: avail.mic !== false },
    vibration: { v: reading?.vibration, ok: avail.vibration !== false },
    camera: {
      present: Boolean(reading?.cameraPresent),
      ok: avail.camera !== false,
      cvIn: reading?.cameraBeeIn,
      cvOut: reading?.cameraBeeOut,
    },
  };
}

function extractFeatures(reading, colony) {
  return {
    weightKg: reading?.weightKg,
    tempC: reading?.tempC,
    humidity: reading?.humidity,
    beeIn: reading?.beeIn,
    beeOut: reading?.beeOut,
    audioRms: reading?.audioRms,
    vibration: reading?.vibration,
    colonyScore: colony?.score,
    healthScore: colony?.healthScore,
    swarmRisk: colony?.swarmRiskScore,
    beeEstimate: colony?.beeEstimate,
    acousticDominant: colony?.acousticMl?.baskin?.key,
  };
}

function nearestLabel(hiveId, ts) {
  const labels = dbService.listLabels({ hiveId, limit: 20 });
  if (!labels.length) return null;
  const t = new Date(ts).getTime();
  let best = null;
  let bestDelta = Infinity;
  for (const l of labels) {
    const d = Math.abs(new Date(l.ts).getTime() - t);
    if (d < bestDelta) {
      bestDelta = d;
      best = l;
    }
  }
  if (bestDelta > 7 * 86400000) return null;
  return best;
}

function buildReferenceRecords(hiveId, reading, colony, meta, health) {
  if (!isLearningActive()) return [];
  if (dbService.getMlConfig("capture_on_analysis") !== "true") return [];

  const sensors = sensorSnapshot(reading, health);
  const features = extractFeatures(reading, colony);
  const label = nearestLabel(hiveId, reading.ts);
  const records = [];

  for (const dom of DOMAINS) {
    const situation = meta?.scenarioLabel || meta?.label || colony?.scoreLabel || "canli";
    const outcome = {
      colonyScore: colony?.score,
      healthScore: colony?.healthScore,
      swarmRisk: colony?.swarmRiskScore,
      swarmPhase: colony?.swarmPhase,
      mode: health?.mode,
    };

    if (dom.id === "acoustic" && colony?.acousticMl) {
      outcome.acoustic = colony.acousticMl.baskin;
      outcome.guven = colony.acousticMl.guven;
    }
    if (dom.id === "camera_cv" && colony?.hiveCamera) {
      outcome.cameraMod = colony.hiveCamera.mod;
      outcome.counts = colony.hiveCamera.counts;
    }

    records.push({
      hiveId,
      domain: dom.id,
      method: dom.method,
      codeRef: dom.codeRef,
      situation,
      sensors,
      features,
      label: label
        ? { eventType: label.eventType, notes: label.notes, ts: label.ts }
        : null,
      outcome,
      ts: reading.ts || new Date().toISOString(),
    });
  }
  return records;
}

/** Doğrudan kaydet (onay kapalı veya onay sonrası uygulama) */
function applyReferenceRecords(records) {
  const saved = [];
  for (const rec of records) {
    saved.push(dbService.saveMlReferenceRecord(rec));
  }
  return saved;
}

function captureReferenceRecords(hiveId, reading, colony, meta, health) {
  return applyReferenceRecords(
    buildReferenceRecords(hiveId, reading, colony, meta, health)
  );
}

function computeSensorNecessity(reading, colony, health, meta = {}) {
  const avail = health?.available || {};
  const fallbacks = health?.fallbacks || [];
  const stats = dbService.getStats();
  const labelCount = stats.labels?.total || 0;
  const scores = {};

  for (const sensorId of SENSORS) {
    const hardware = true;

    let analysisDeps = 0;
    let activeDeps = 0;
    for (const [analysisId, sensors] of Object.entries(ANALYSIS_SENSOR_MAP)) {
      if (!sensors.includes(sensorId)) continue;
      analysisDeps++;
      const def = ANALYSES.find((a) => a.id === analysisId);
      if (def?.durum === "calisiyor") activeDeps++;
    }

    const depScore = Math.min(100, activeDeps * 12 + analysisDeps * 4);
    const dataOk = avail[sensorId === "camera" ? "camera" : sensorId] !== false;
    const dataScore = dataOk ? 85 : 15;

    const fbPenalty = fallbacks.some((f) => f.includes(sensorId) || f.startsWith(`${sensorId}→`) || f.includes(`→${sensorId}`))
      ? 25
      : fallbacks.some((f) => f.startsWith(`${sensorId === "scale" ? "tartı" : sensorId}`))
        ? 20
        : 0;

    let mlValue = 0;
    if (sensorId === "mic") mlValue = labelCount > 0 ? 45 : 25;
    if (sensorId === "ir") mlValue = 35;
    if (sensorId === "scale") mlValue = 40;
    if (sensorId === "camera") mlValue = computeCameraMlValue(reading, colony, labelCount);
    if (sensorId === "temp" || sensorId === "humidity") mlValue = 20;

    const refs = dbService.listMlReferenceRecords({ limit: 500 }).filter((r) => {
      const s = r.sensors || {};
      const key = sensorId === "scale" ? "scale" : sensorId;
      return s[key]?.ok !== false;
    });
    if (refs.length > 50) mlValue = Math.min(100, mlValue + 15);
    if (labelCount >= 10) mlValue = Math.min(100, mlValue + 10);

    const operational = Math.round(
      depScore * 0.45 + dataScore * 0.35 + Math.max(0, 100 - fbPenalty) * 0.2
    );
    const necessity = Math.round(
      operational * 0.55 + mlValue * 0.45
    );

    scores[sensorId] = {
      label: SENSOR_LABELS[sensorId] || sensorId,
      necessity,
      operational,
      mlValue,
      redundancy: fbPenalty,
      hardware,
      available: dataOk,
      analysisDeps: activeDeps,
      ariciya: buildNecessityMessage(sensorId, necessity, mlValue, dataOk),
    };
  }

  return scores;
}

function computeCameraMlValue(reading, colony, labelCount) {
  let gain = 15;
  const camRefs = dbService
    .listMlReferenceRecords({ domain: "camera_cv", limit: 100 });
  const labeledCam = camRefs.filter((r) => r.label).length;
  if (labeledCam >= 3) gain += 20;
  if (colony?.hiveCamera?.irComparison?.agrees === true) gain += 10;
  if (colony?.beeEstimateSource?.includes("cv")) gain += 15;
  if (labelCount >= 5) gain += 12;
  const queenLabels = dbService.listLabels({ eventType: "queenless", limit: 10 }).length;
  if (queenLabels > 0 && reading.cameraPresent) gain += 8;
  return Math.min(100, gain);
}

function buildNecessityMessage(sensorId, necessity, mlValue, dataOk) {
  if (!dataOk) return `${SENSOR_LABELS[sensorId] || sensorId} arızalı — yedek sensörler devrede`;
  if (necessity >= 70) return "Kritik — analizler büyük ölçüde buna bağlı";
  if (necessity >= 40) return "Önemli — kısmi modda skor düşer";
  if (mlValue >= 30) return "Operasyonel düşük ama ML veri değeri var";
  return "Düşük gereklilik — çıkarılabilir aday";
}

function evaluateCameraDecision(scores, reading, health = null) {
  const cam = scores.camera || {};
  const camAvail = health?.available?.camera !== false && reading?.cameraPresent !== false;
  if (!camAvail) {
    return {
      action: "ariza",
      actionLabel: "Arıza — kamera onarım",
      operationalNecessity: cam.operational ?? 45,
      mlLearningGain: cam.mlValue ?? 0,
      necessity: cam.necessity ?? 40,
      ariciya: "Kamera arızalı — tam donanım paketinde zorunlu; IR ve tartı yedek devrede",
    };
  }

  const op = cam.operational ?? 0;
  const ml = cam.mlValue ?? 0;
  const nec = cam.necessity ?? 0;

  if (ml >= 28 && op < 35) {
    return {
      action: "kal_ml",
      actionLabel: "Kal — ML öğrenme değeri yüksek",
      operationalNecessity: op,
      mlLearningGain: ml,
      necessity: nec,
      ariciya:
        "Operasyonel ihtiyaç düşük ama kamera etiket doğrulama ve CV eğitimine katkı sağlıyor",
      criteria: { mlMin: 28, opMax: 35 },
    };
  }

  if (nec >= 45 || op >= 50) {
    return {
      action: "kal",
      actionLabel: "Kal — operasyonel gerekli",
      operationalNecessity: op,
      mlLearningGain: ml,
      necessity: nec,
      ariciya: "Trafik doğrulama / güvenlik / arı tahmini için kamera gerekli",
    };
  }

  return {
    action: "izle",
    actionLabel: "İzle — 2 hafta daha veri topla",
    operationalNecessity: op,
    mlLearningGain: ml,
    necessity: nec,
    ariciya: "Karar için daha fazla etiketli kamera kaydı gerekli",
  };
}

function updateHardwareImpact(reading, colony, health) {
  const avail = health?.available || {};
  for (const def of ANALYSES) {
    if (def.durum !== "calisiyor") continue;
    const mapped = ANALYSIS_SENSOR_MAP[def.id] || [];
    for (const sensorId of SENSORS) {
      const contributes = mapped.includes(sensorId);
      if (!contributes) continue;
      const sensorOk = avail[sensorId === "camera" ? "camera" : sensorId] !== false;
      let impact = sensorOk ? 72 : 18;
      if (sensorId === "scale" && colony?.beeEstimateSource?.includes("weight")) impact += 12;
      if (sensorId === "ir" && colony?.beeEstimateSource?.includes("traffic")) impact += 12;
      if (sensorId === "camera" && colony?.beeEstimateSource?.includes("cv")) impact += 15;
      if (sensorId === "mic" && colony?.acousticMl?.mod === "calisiyor") impact += 10;

      const existing = dbService.listMlHardwareImpact().find(
        (r) => r.sensorId === sensorId && r.analysisId === def.id
      );
      const samples = (existing?.samples || 0) + 1;
      const rolling = existing
        ? Math.round(existing.impactScore * 0.85 + impact * 0.15)
        : impact;
      dbService.upsertMlHardwareImpact(sensorId, def.id, rolling, samples, "rolling_ema");
    }
  }
}

function processHiveLearning(hiveId, reading, colony, meta, health, { forceProposal = false } = {}) {
  if (!isLearningActive()) return null;

  const records = buildReferenceRecords(hiveId, reading, colony, meta, health);
  const scores = computeSensorNecessity(reading, colony, health, meta);
  const cameraDecision = evaluateCameraDecision(scores, reading, health);
  const hardwareDelta = mlApprovalService.computeHardwareImpactDelta(
    reading,
    colony,
    health
  );

  const ts = reading?.ts || new Date().toISOString();
  dbService.saveMlNecessitySnapshot({
    hiveId,
    scope: "hive",
    scores,
    cameraDecision,
    ts,
  });

  if (!records.length) {
    return { scores, cameraDecision, referenceCount: 0 };
  }

  if (mlApprovalService.requiresApproval() || forceProposal) {
    const queued = mlApprovalService.queueLearningProposal(
      hiveId,
      reading,
      colony,
      meta,
      health,
      records,
      hardwareDelta
    );
    if (queued.skipped) {
      return {
        scores,
        cameraDecision,
        referenceCount: 0,
        awaitingApproval: true,
        skipped: true,
      };
    }
    return {
      scores,
      cameraDecision,
      referenceCount: 0,
      awaitingApproval: true,
      proposalId: queued.proposal.id,
      improvement: queued.improvement,
      message: queued.proposal.message,
    };
  }

  const refs = applyReferenceRecords(records);
  mlApprovalService.applyHardwareDelta(hardwareDelta);
  dbService.appendMlLearningLog("capture", `Kovan ${hiveId}: ${refs.length} referans kayıt`, {
    hiveId,
    domains: refs.map((r) => r.domain),
  });

  return { scores, cameraDecision, referenceCount: refs.length, applied: true };
}

function computeFleetNecessity(hives) {
  const agg = {};
  for (const s of SENSORS) {
    agg[s] = { necessity: 0, mlValue: 0, count: 0, hardware: 0 };
  }

  for (const h of hives) {
    const reading = h.reading || h;
    const colony = h.colony;
    const health = h.sensorHealth || colony?.sensorHealth;
    const scores = computeSensorNecessity(reading, colony, health, {});
    for (const s of SENSORS) {
      if (!scores[s]) continue;
      agg[s].necessity += scores[s].necessity;
      agg[s].mlValue += scores[s].mlValue;
      agg[s].count += 1;
      if (scores[s].hardware) agg[s].hardware += 1;
    }
  }

  const fleetScores = {};
  for (const s of SENSORS) {
    const n = agg[s].count || 1;
    fleetScores[s] = {
      label: SENSOR_LABELS[s] || s,
      necessity: Math.round(agg[s].necessity / n),
      mlValue: Math.round(agg[s].mlValue / n),
      hivesWithHardware: agg[s].hardware,
      hivesSampled: agg[s].count,
    };
  }

  const cameraDecision = evaluateCameraDecision(fleetScores, { cameraPresent: true });

  dbService.saveMlNecessitySnapshot({
    hiveId: null,
    scope: "fleet",
    scores: fleetScores,
    cameraDecision,
    ts: new Date().toISOString(),
  });

  return { scores: fleetScores, cameraDecision };
}

function getLearningStatus() {
  const config = dbService.getMlConfig();
  const mlStats = dbService.getMlStats();
  const dbStats = dbService.getStats();
  const model = mlModelService.getConfig();
  return {
    active: isLearningActive(),
    mode: config.learning_mode || "active",
    version: config.learning_version || "1",
    captureOnIngest: config.capture_on_ingest === "true",
    captureOnAnalysis: config.capture_on_analysis === "true",
    requiresApproval: mlApprovalService.requiresApproval(),
    pendingProposals: dbService.countPendingMlProposals(),
    model,
    data: dbStats,
    ml: mlStats,
    domains: DOMAINS.map((d) => ({ id: d.id, label: d.label, method: d.method })),
  };
}

function getAdminDashboard(latestHives = []) {
  const status = getLearningStatus();
  const dbStats = dbService.getStats();
  const model = mlModelService.getConfig();
  const fleet = computeFleetNecessity(latestHives);
  const hardwareImpact = dbService.listMlHardwareImpact();
  const recentLog = dbService.listMlLearningLog(40);
  const recentRefs = dbService.listMlReferenceRecords({ limit: 30 });
  const pendingProposals = mlApprovalService.listProposals({ status: "pending", limit: 20 });

  const bySensor = {};
  for (const row of hardwareImpact) {
    if (!bySensor[row.sensorId]) {
      bySensor[row.sensorId] = { sensorId: row.sensorId, label: SENSOR_LABELS[row.sensorId], analyses: [] };
    }
    bySensor[row.sensorId].analyses.push({
      analysisId: row.analysisId,
      impactScore: row.impactScore,
      samples: row.samples,
    });
  }

  const labelCoverage = {};
  for (const t of dbService.LABEL_TYPES) {
    labelCoverage[t] = dbService.listLabels({ eventType: t, limit: 500 }).length;
  }

  const trainingQueue = {
    acoustic: {
      labelsNeeded: Math.max(0, 50 - (dbStats.labels?.total || 0)),
      queenlessLabels: labelCoverage.queenless || 0,
      status: model.acoustic?.fileExists ? "model_ready" : "collecting",
    },
    camera_cv: {
      labeledRefs: recentRefs.filter((r) => r.domain === "camera_cv" && r.label).length,
      status: fleet.cameraDecision?.action === "kal_ml" ? "keep_for_ml" : "evaluate",
    },
  };

  const hardwareIntegrity = hardwareIntegrityService.evaluateFleetIntegrity(latestHives);

  return {
    generatedAt: new Date().toISOString(),
    learning: status,
    hardwareIntegrity,
    fleetNecessity: fleet,
    perHiveNecessity: latestHives.slice(0, 20).map((h) => {
      const id = h.hiveId || h.reading?.hiveId;
      const snap = dbService.getLatestMlNecessity(id);
      return {
        hiveId: id,
        scenarioLabel: h.scenarioLabel || h.meta?.label,
        scores: snap?.scores || null,
        cameraDecision: snap?.cameraDecision || null,
        ts: snap?.ts,
      };
    }),
    hardwareImpact: Object.values(bySensor),
    hardwareImpactMatrix: hardwareImpact,
    referenceRecords: {
      recent: recentRefs,
      total: status.ml.referenceRecords,
      byDomain: status.ml.byDomain,
    },
    learningLog: recentLog,
    labelCoverage,
    trainingQueue,
    requiresApproval: mlApprovalService.requiresApproval(),
    pendingProposals,
    pendingCount: pendingProposals.length,
    dataQuality: {
      readings: dbStats.readings?.total || 0,
      labels: dbStats.labels?.total || 0,
      labelRatio:
        dbStats.readings?.total > 0
          ? Math.round(((dbStats.labels?.total || 0) / dbStats.readings.total) * 1000) / 10
          : 0,
      hives: dbStats.readings?.hives || 0,
    },
  };
}

module.exports = {
  isLearningActive,
  buildReferenceRecords,
  applyReferenceRecords,
  captureReferenceRecords,
  computeSensorNecessity,
  evaluateCameraDecision,
  updateHardwareImpact,
  processHiveLearning,
  computeFleetNecessity,
  getLearningStatus,
  getAdminDashboard,
  DOMAINS,
  SENSORS,
};
