/**
 * Kovan Petek Tarama — oturum yönetimi, harita, kalibrasyon kaydı.
 */

const { randomUUID } = require("crypto");
const {
  GAP_COUNT,
  SIDES,
  SIDE_LABEL,
  SESSION_TTL_MS,
  SEGMENT_MIN_SEC,
  SEGMENT_MAX_SEC,
} = require("../../../../packages/shared/petekTaramaConstants");
const {
  validateSegmentQuality,
  analyzePetekTaramaSession,
  segKey,
} = require("./calibrationVisionService");

/** @type {Map<string, object>} */
const sessions = new Map();

function emptyMap() {
  const map = {};
  for (let g = 1; g <= GAP_COUNT; g++) {
    for (const side of SIDES) {
      map[segKey(g, side)] = { gap: g, side, status: "pending" };
    }
  }
  return map;
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAtMs > SESSION_TTL_MS) sessions.delete(id);
  }
}

function mapProgress(segments) {
  let done = 0;
  const total = GAP_COUNT * SIDES.length;
  const cells = [];
  for (let g = 1; g <= GAP_COUNT; g++) {
    for (const side of SIDES) {
      const key = segKey(g, side);
      const seg = segments[key];
      const status = seg?.accepted ? "done" : seg?.status === "retry" ? "retry" : seg?.status === "recording" ? "active" : "pending";
      if (seg?.accepted) done++;
      cells.push({ gap: g, side, sideLabel: SIDE_LABEL[side], status, key });
    }
  }
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
    complete: done === total,
    cells,
  };
}

function publicSession(session) {
  const progress = mapProgress(session.segments);
  return {
    sessionId: session.sessionId,
    hiveId: session.hiveId,
    status: session.status,
    tareKg: session.tareKg,
    weightKg: session.weightKg,
    createdAt: session.createdAt,
    progress,
    analysis: session.analysis || null,
    calibrationApplied: session.calibrationApplied || false,
    audio: session.audio ? { durationSec: session.audio.durationSec, rms: session.audio.rms } : null,
  };
}

/**
 * @param {number} hiveId
 * @param {{ tareKg: number, weightKg: number }} body
 */
function createSession(hiveId, body) {
  purgeExpired();
  const tareKg = Number(body.tareKg);
  const weightKg = Number(body.weightKg);
  if (!Number.isFinite(tareKg) || tareKg < 0) {
    return { error: "invalid_tare", message: "Geçerli boş ağırlık girin" };
  }
  if (!Number.isFinite(weightKg) || weightKg <= tareKg) {
    return { error: "invalid_weight", message: "Dolu tartı boş ağırlıktan büyük olmalı (kapak kapalıyken)" };
  }

  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const session = {
    sessionId,
    hiveId,
    tareKg,
    weightKg,
    status: "scanning",
    segments: emptyMap(),
    audio: null,
    analysis: null,
    calibrationApplied: false,
    createdAt: now,
    createdAtMs: Date.now(),
  };
  sessions.set(sessionId, session);
  return { session: publicSession(session) };
}

function getSession(sessionId) {
  purgeExpired();
  const session = sessions.get(sessionId);
  if (!session) return { error: "not_found" };
  return { session: publicSession(session) };
}

function getSessionRaw(sessionId) {
  purgeExpired();
  return sessions.get(sessionId) || null;
}

/**
 * @param {string} sessionId
 * @param {{ gap: number, side: string, durationSec?: number, quality?: object, previewBase64?: string }} body
 */
function submitSegment(sessionId, body) {
  const session = getSessionRaw(sessionId);
  if (!session) return { error: "not_found" };
  if (session.status === "confirmed") return { error: "already_confirmed" };

  const gap = Number(body.gap);
  const side = String(body.side);
  if (gap < 1 || gap > GAP_COUNT || !SIDES.includes(side)) {
    return { error: "invalid_segment", message: "Aralık 1–10, taraf sol/sağ" };
  }

  const durationSec = Number(body.durationSec ?? 0);
  if (durationSec < SEGMENT_MIN_SEC || durationSec > SEGMENT_MAX_SEC) {
    return {
      error: "invalid_duration",
      message: `Her çekim ${SEGMENT_MIN_SEC}–${SEGMENT_MAX_SEC} sn olmalı`,
    };
  }

  const qualityCheck = validateSegmentQuality(body.quality || {});
  const key = segKey(gap, side);
  const prev = session.segments[key] || { gap, side };

  session.segments[key] = {
    ...prev,
    gap,
    side,
    durationSec,
    quality: qualityCheck.metrics,
    qualityScore: qualityCheck.qualityScore,
    accepted: qualityCheck.ok,
    status: qualityCheck.ok ? "done" : "retry",
    issues: qualityCheck.issues,
    capturedAt: new Date().toISOString(),
    hasPreview: Boolean(body.previewBase64),
  };

  const progress = mapProgress(session.segments);
  if (progress.complete) session.status = "ready";

  return {
    accepted: qualityCheck.ok,
    issues: qualityCheck.issues,
    qualityScore: qualityCheck.qualityScore,
    progress,
    session: publicSession(session),
    ariciya: qualityCheck.ok
      ? `Aralık ${gap} ${SIDE_LABEL[side]} — kabul edildi`
      : qualityCheck.issues[0] || "Tekrar çekin",
  };
}

/**
 * @param {string} sessionId
 * @param {{ durationSec?: number, rms?: number, peak?: number }} body
 */
function submitAudio(sessionId, body) {
  const session = getSessionRaw(sessionId);
  if (!session) return { error: "not_found" };

  session.audio = {
    durationSec: Number(body.durationSec ?? 0),
    rms: Number(body.rms ?? 0.32),
    peak: Number(body.peak ?? 0.5),
    capturedAt: new Date().toISOString(),
  };
  return { ok: true, audio: session.audio };
}

function runAnalysis(sessionId) {
  const session = getSessionRaw(sessionId);
  if (!session) return { error: "not_found" };

  const progress = mapProgress(session.segments);
  if (!progress.complete) {
    return {
      error: "map_incomplete",
      message: "Petek haritası tamamlanmadı",
      progress,
    };
  }

  const analysis = analyzePetekTaramaSession(session);
  if (!analysis.ok) return { error: analysis.error, message: analysis.ariciya };

  session.analysis = analysis;
  session.status = "analyzed";
  return { analysis, session: publicSession(session) };
}

/**
 * Onay → hiveConfig güncelle
 * @param {function} applyConfig (hiveId, config) => void
 */
function confirmSession(sessionId, body, applyConfig) {
  const session = getSessionRaw(sessionId);
  if (!session) return { error: "not_found" };
  if (!session.analysis?.ok) {
    return { error: "not_analyzed", message: "Önce analiz çalıştırın" };
  }
  if (session.calibrationApplied) return { error: "already_confirmed" };

  const a = session.analysis;
  const referenceBeeCount =
    body.referenceBeeCount != null ? Number(body.referenceBeeCount) : a.referenceBeeCount;
  const combKg = body.combKg != null ? Number(body.combKg) : a.combKg;

  const config = {
    tareKg: session.tareKg,
    weightKgAtCalibration: session.weightKg,
    combKg,
    referenceBeeCount,
    petekTaramaSessionId: sessionId,
    petekTaramaAt: new Date().toISOString(),
    petekTaramaConfidence: a.confidence,
    calibrated: true,
  };

  applyConfig(session.hiveId, config);
  session.calibrationApplied = true;
  session.status = "confirmed";

  return {
    ok: true,
    config,
    analysis: a,
    session: publicSession(session),
    ariciya: `Kalibrasyon kaydedildi — ~${referenceBeeCount.toLocaleString("tr-TR")} arı, comb ${combKg} kg, skor ${a.colonyScore}`,
  };
}

module.exports = {
  createSession,
  getSession,
  submitSegment,
  submitAudio,
  runAnalysis,
  confirmSession,
  mapProgress,
  GAP_COUNT,
  SIDES,
};
