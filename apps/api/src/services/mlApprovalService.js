/**
 * ML güncelleme onay kuyruğu — referans / donanım etkisi onaylanmadan uygulanmaz.
 */

const dbService = require("./dbService");
const { DOMAINS, SENSORS, ANALYSIS_SENSOR_MAP, ANALYSES } = require("./mlConstants");

function requiresApproval() {
  return dbService.getMlConfig("ml_requires_approval") !== "false";
}

function estimateImprovement(hiveId, records, colony, meta, health) {
  const stats = dbService.getStats();
  const mlStats = dbService.getMlStats();
  const totalRefs = mlStats.referenceRecords || 0;
  const labeledNew = records.filter((r) => r.label).length;
  const domains = [...new Set(records.map((r) => r.domain))];

  const byDomain = {};
  for (const d of domains) {
    const dom = DOMAINS.find((x) => x.id === d);
    const before = dbService
      .listMlReferenceRecords({ domain: d, limit: 5000 })
      .filter((r) => r.hiveId === hiveId).length;
    const adding = records.filter((r) => r.domain === d).length;
    const confidenceDelta = Math.min(
      10,
      Math.round((adding / Math.max(5, before + 1)) * 100) / 10
    );
    byDomain[d] = {
      label: dom?.label || d,
      before,
      adding,
      confidenceDeltaPct: confidenceDelta,
    };
  }

  let acousticDelta = byDomain.acoustic?.confidenceDeltaPct || 0;
  let cameraDelta = byDomain.camera_cv?.confidenceDeltaPct || 0;
  let swarmDelta = byDomain.swarm?.confidenceDeltaPct || 0;

  if (colony?.acousticMl?.guven) {
    acousticDelta = Math.min(12, acousticDelta + (labeledNew > 0 ? 3 : 1));
  }
  if (colony?.hiveCamera?.present && labeledNew > 0) {
    cameraDelta = Math.min(12, cameraDelta + 2);
  }

  const labelCoverageDelta =
    stats.readings?.total > 0
      ? Math.round((labeledNew / stats.readings.total) * 1000) / 10
      : 0;

  const overallPct = Math.min(
    15,
    Math.round(
      records.length * 0.25 +
        labeledNew * 2.5 +
        acousticDelta * 0.4 +
        cameraDelta * 0.3 +
        (health?.mode === "degraded" ? 1.5 : 0)
    )
  );

  const situation = meta?.scenarioLabel || meta?.label || "canlı okuma";
  const modeNote =
    health?.mode === "degraded"
      ? ` (${health.ariciya || "kısmi sensör modu"})`
      : "";

  return {
    overallPct,
    acousticConfidenceDelta: acousticDelta,
    cameraCvDelta: cameraDelta,
    swarmRiskDelta: swarmDelta,
    labelCoverageDeltaPct: labelCoverageDelta,
    referenceDelta: records.length,
    totalRefsAfter: totalRefs + records.length,
    byDomain,
    ariciya: `${situation}${modeNote} için ${records.length} referans kaydı. Onay sonrası tahmini ~%${overallPct} ML olgunluk artışı.`,
    summary: `~%${overallPct} iyileşme · akustik +${acousticDelta}% · ${records.length} yeni referans`,
  };
}

function computeHardwareImpactDelta(reading, colony, health) {
  const avail = health?.available || {};
  const deltas = [];
  for (const def of ANALYSES) {
    if (def.durum !== "calisiyor") continue;
    const mapped = ANALYSIS_SENSOR_MAP[def.id] || [];
    for (const sensorId of SENSORS) {
      if (!mapped.includes(sensorId)) continue;
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
      const nextScore = existing
        ? Math.round(existing.impactScore * 0.85 + impact * 0.15)
        : impact;
      deltas.push({
        sensorId,
        analysisId: def.id,
        impactScore: nextScore,
        samples,
        method: "rolling_ema",
      });
    }
  }
  return deltas;
}

function buildProposalMessage(hiveId, situation, records, improvement, health) {
  const domainLabels = records
    .map((r) => DOMAINS.find((d) => d.id === r.domain)?.label || r.domain)
    .slice(0, 4)
    .join(", ");
  const labeled = records.some((r) => r.label);
  return [
    `Kovan ${hiveId} — "${situation}" durumu için veri kaydedildi.`,
    `${records.length} referans kaydı referans havuzuna eklenmek üzere hazır (${domainLabels}${records.length > 4 ? "…" : ""}).`,
    labeled ? "Yakın muayene etiketi eşleşti — ML hedef değişkeni zenginleşecek." : null,
    health?.mode === "degraded" ? `Sensör modu: kısmi (${health.down?.map((d) => d.label).join(", ") || "—"})` : null,
    `Onaylarsanız beklenen iyileşme: ${improvement.summary}.`,
    "Onaylıyor musunuz?",
  ]
    .filter(Boolean)
    .join(" ");
}

function queueLearningProposal(hiveId, reading, colony, meta, health, records, hardwareDelta) {
  const situation =
    meta?.scenarioLabel ||
    meta?.label ||
    colony?.scoreLabel ||
    (health?.mode === "degraded" ? "kısmi_mod" : "canli");

  if (dbService.hasRecentPendingProposal(hiveId, situation, 30)) {
    return { skipped: true, reason: "duplicate_pending", hiveId, situation };
  }

  const improvement = estimateImprovement(hiveId, records, colony, meta, health);
  const domains = [...new Set(records.map((r) => r.domain))];
  const title = `Referans güncelleme — Kovan ${hiveId}`;
  const message = buildProposalMessage(hiveId, situation, records, improvement, health);

  const proposal = dbService.saveMlProposal({
    hiveId,
    proposalType: "reference_batch",
    situation,
    title,
    message,
    payload: {
      referenceRecords: records,
      hardwareImpact: hardwareDelta,
      readingTs: reading?.ts,
      healthMode: health?.mode,
    },
    improvement,
    domains,
    recordCount: records.length,
    ts: reading?.ts || new Date().toISOString(),
  });

  dbService.appendMlLearningLog("proposal", message, {
    proposalId: proposal.id,
    hiveId,
    improvementPct: improvement.overallPct,
  });

  return { proposal, improvement };
}

function applyHardwareDelta(deltas) {
  for (const d of deltas || []) {
    dbService.upsertMlHardwareImpact(
      d.sensorId,
      d.analysisId,
      d.impactScore,
      d.samples,
      d.method
    );
  }
}

function applyProposal(proposalId, reviewedBy = "admin") {
  const proposal = dbService.getMlProposal(proposalId);
  if (!proposal) return { error: "proposal_not_found" };
  if (proposal.status !== "pending") {
    return { error: "proposal_not_pending", status: proposal.status };
  }

  const refs = proposal.payload?.referenceRecords || [];
  const saved = [];
  for (const rec of refs) {
    saved.push(dbService.saveMlReferenceRecord(rec));
  }
  applyHardwareDelta(proposal.payload?.hardwareImpact);

  const version = Number(dbService.getMlConfig("learning_version") || 1);
  dbService.setMlConfig("learning_version", String(version + 0.1));

  dbService.updateMlProposalStatus(proposalId, "approved", reviewedBy);
  dbService.appendMlLearningLog(
    "approved",
    `Onaylandı #${proposalId}: Kovan ${proposal.hiveId} — ${saved.length} referans uygulandı`,
    {
      proposalId,
      hiveId: proposal.hiveId,
      improvement: proposal.improvement,
      appliedRecords: saved.length,
    }
  );

  return {
    ok: true,
    proposalId,
    appliedRecords: saved.length,
    improvement: proposal.improvement,
    learningVersion: dbService.getMlConfig("learning_version"),
  };
}

function rejectProposal(proposalId, reviewedBy = "admin", reason = null) {
  const proposal = dbService.getMlProposal(proposalId);
  if (!proposal) return { error: "proposal_not_found" };
  if (proposal.status !== "pending") {
    return { error: "proposal_not_pending", status: proposal.status };
  }

  dbService.updateMlProposalStatus(proposalId, "rejected", reviewedBy);
  dbService.appendMlLearningLog(
    "rejected",
    `Reddedildi #${proposalId}: Kovan ${proposal.hiveId}${reason ? ` — ${reason}` : ""}`,
    { proposalId, reason }
  );
  return { ok: true, proposalId, status: "rejected" };
}

function listProposals(opts = {}) {
  return dbService.listMlProposals(opts);
}

module.exports = {
  requiresApproval,
  estimateImprovement,
  computeHardwareImpactDelta,
  queueLearningProposal,
  applyProposal,
  rejectProposal,
  listProposals,
  applyHardwareDelta,
};
