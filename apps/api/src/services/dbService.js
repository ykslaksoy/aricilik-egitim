/**
 * SQLite — sensör okumaları, ML etiketleri, model meta.
 * Dosya: data/koloni.db
 */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "../../../../data");
const DB_PATH = path.join(DATA_DIR, "koloni.db");
const MODELS_DIR = path.join(DATA_DIR, "models");

/** ML eğitimi için geçerli etiket tipleri */
const LABEL_TYPES = [
  "normal",
  "queen_present",
  "queenless",
  "swarm_risk",
  "swarm_occurred",
  "varroa",
  "robbing",
  "inspection",
  "sensor_fault",
  "harvest",
  "other",
];

let db = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
}

function initDb() {
  ensureDataDir();
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      label TEXT,
      scenario TEXT,
      payload TEXT NOT NULL,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_readings_hive ON readings(hive_id);
    CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts);

    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_value TEXT,
      notes TEXT,
      source TEXT DEFAULT 'manual',
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_labels_hive ON labels(hive_id);
    CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(event_type);
    CREATE INDEX IF NOT EXISTS idx_labels_ts ON labels(ts);

    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      file_path TEXT,
      metrics TEXT,
      active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ml_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ml_reference_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      domain TEXT NOT NULL,
      method TEXT NOT NULL,
      code_ref TEXT,
      situation TEXT,
      sensors_json TEXT NOT NULL,
      features_json TEXT,
      label_json TEXT,
      outcome_json TEXT,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ml_ref_hive ON ml_reference_records(hive_id);
    CREATE INDEX IF NOT EXISTS idx_ml_ref_domain ON ml_reference_records(domain);
    CREATE INDEX IF NOT EXISTS idx_ml_ref_ts ON ml_reference_records(ts);

    CREATE TABLE IF NOT EXISTS ml_necessity_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER,
      scope TEXT DEFAULT 'hive',
      scores_json TEXT NOT NULL,
      camera_decision_json TEXT,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ml_nec_hive ON ml_necessity_snapshots(hive_id);
    CREATE INDEX IF NOT EXISTS idx_ml_nec_ts ON ml_necessity_snapshots(ts);

    CREATE TABLE IF NOT EXISTS ml_hardware_impact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      analysis_id TEXT NOT NULL,
      impact_score REAL NOT NULL,
      samples INTEGER DEFAULT 0,
      method TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(sensor_id, analysis_id)
    );

    CREATE TABLE IF NOT EXISTS ml_learning_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      message TEXT,
      detail_json TEXT,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ml_log_ts ON ml_learning_log(ts);

    CREATE TABLE IF NOT EXISTS ml_pending_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      proposal_type TEXT NOT NULL DEFAULT 'reference_batch',
      status TEXT NOT NULL DEFAULT 'pending',
      situation TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      improvement_json TEXT NOT NULL,
      domains_json TEXT,
      record_count INTEGER DEFAULT 0,
      ts TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ml_prop_status ON ml_pending_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_ml_prop_hive ON ml_pending_proposals(hive_id);

    CREATE TABLE IF NOT EXISTS hive_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'petek_tarama',
      session_id TEXT,
      scores_json TEXT NOT NULL,
      config_json TEXT,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_hive_baselines_hive ON hive_baselines(hive_id);

    CREATE TABLE IF NOT EXISTS hive_score_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      scores_json TEXT NOT NULL,
      revision_json TEXT,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_hive_score_hist_hive ON hive_score_history(hive_id);
    CREATE INDEX IF NOT EXISTS idx_hive_score_hist_ts ON hive_score_history(ts);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      ts TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_journal_hive ON journal_entries(hive_id);

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'arici',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(team_id, email)
    );

    CREATE TABLE IF NOT EXISTS hive_teams (
      hive_id INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      PRIMARY KEY (hive_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      ts TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_offline_client ON offline_queue(client_id);

    CREATE TABLE IF NOT EXISTS subscriptions (
      account_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL DEFAULT 'pro',
      active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sla_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hive_id INTEGER,
      team_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planlandi',
      scheduled_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  seedMlConfigDefaults();
  return db;
}

function seedMlConfigDefaults() {
  const defaults = {
    learning_mode: "active",
    capture_on_ingest: "true",
    capture_on_analysis: "true",
    learning_version: "1",
    necessity_interval_min: "15",
    ml_requires_approval: "true",
  };
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO ml_config (key, value) VALUES (?, ?)"
  );
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, value);
  }
}

function rowToReading(row) {
  const payload = JSON.parse(row.payload);
  return {
    dbId: row.id,
    label: row.label,
    ...payload,
  };
}

function saveReading(reading, label = null) {
  if (!db) initDb();
  const ts = reading.ts || new Date().toISOString();
  const payload = { ...reading };
  delete payload.dbId;
  delete payload.label;

  const stmt = db.prepare(`
    INSERT INTO readings (hive_id, label, scenario, payload, ts)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    reading.hiveId,
    label || reading.scenarioLabel || reading.label || null,
    reading.scenario || null,
    JSON.stringify(payload),
    ts
  );
  return { id: Number(info.lastInsertRowid), hiveId: reading.hiveId, label, ts };
}

function saveLabel(body = {}) {
  if (!db) initDb();
  const hiveId = Number(body.hiveId);
  const eventType = String(body.eventType || "").trim();
  if (!Number.isFinite(hiveId)) return { error: "hive_id_required" };
  if (!eventType || !LABEL_TYPES.includes(eventType)) {
    return { error: "invalid_event_type", allowed: LABEL_TYPES };
  }
  const ts = body.ts || new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO labels (hive_id, event_type, event_value, notes, source, ts)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    hiveId,
    eventType,
    body.eventValue != null ? String(body.eventValue) : null,
    body.notes != null ? String(body.notes) : null,
    body.source || "manual",
    ts
  );
  return {
    ok: true,
    label: {
      id: Number(info.lastInsertRowid),
      hiveId,
      eventType,
      eventValue: body.eventValue ?? null,
      notes: body.notes ?? null,
      source: body.source || "manual",
      ts,
    },
  };
}

function listLabels({ hiveId, eventType, limit = 100, since } = {}) {
  if (!db) initDb();
  let sql = "SELECT * FROM labels WHERE 1=1";
  const params = [];
  if (hiveId != null) {
    sql += " AND hive_id = ?";
    params.push(Number(hiveId));
  }
  if (eventType) {
    sql += " AND event_type = ?";
    params.push(eventType);
  }
  if (since) {
    sql += " AND ts >= ?";
    params.push(since);
  }
  sql += " ORDER BY ts DESC, id DESC LIMIT ?";
  params.push(Math.min(500, limit));
  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => ({
    id: r.id,
    hiveId: r.hive_id,
    eventType: r.event_type,
    eventValue: r.event_value,
    notes: r.notes,
    source: r.source,
    ts: r.ts,
    createdAt: r.created_at,
  }));
}

function loadAllReadings({ hiveId, since, until, limit } = {}) {
  if (!db) initDb();
  let sql = "SELECT * FROM readings WHERE 1=1";
  const params = [];
  if (hiveId != null) {
    sql += " AND hive_id = ?";
    params.push(Number(hiveId));
  }
  if (since) {
    sql += " AND ts >= ?";
    params.push(since);
  }
  if (until) {
    sql += " AND ts <= ?";
    params.push(until);
  }
  sql += " ORDER BY ts ASC, id ASC";
  if (limit) {
    sql += " LIMIT ?";
    params.push(Math.min(500000, limit));
  }
  return db.prepare(sql).all(...params).map(rowToReading);
}

function listRecords(limit = 100) {
  if (!db) initDb();
  const rows = db
    .prepare(
      "SELECT id, hive_id, label, scenario, ts, created_at FROM readings ORDER BY id DESC LIMIT ?"
    )
    .all(limit);
  return rows.map((r) => ({
    id: r.id,
    hiveId: r.hive_id,
    label: r.label,
    scenario: r.scenario,
    ts: r.ts,
    createdAt: r.created_at,
  }));
}

function getStats() {
  if (!db) initDb();
  const readings = db
    .prepare("SELECT COUNT(*) AS total, COUNT(DISTINCT hive_id) AS hives FROM readings")
    .get();
  const labels = db
    .prepare("SELECT COUNT(*) AS total, COUNT(DISTINCT hive_id) AS hives FROM labels")
    .get();
  return {
    path: DB_PATH,
    readings: { total: readings.total, hives: readings.hives },
    labels: { total: labels.total, hives: labels.hives },
    labelTypes: LABEL_TYPES,
  };
}

function flattenReading(r) {
  return {
    id: r.dbId,
    hive_id: r.hiveId,
    ts: r.ts,
    weight_kg: r.weightKg,
    temp_c: r.tempC,
    humidity: r.humidity,
    bee_in: r.beeIn,
    bee_out: r.beeOut,
    vibration: r.vibration,
    audio_rms: r.audioRms,
    battery: r.battery,
    rssi: r.rssi,
    tilt_deg: r.tiltDeg,
    scenario: r.scenario,
    fault: r.fault,
  };
}

function exportDataset({ hiveId, since, until, limit } = {}) {
  const readings = loadAllReadings({ hiveId, since, until, limit });
  const labels = listLabels({
    hiveId,
    since,
    limit: limit || 50000,
  });
  return {
    exportedAt: new Date().toISOString(),
    stats: getStats(),
    readings: readings.map(flattenReading),
    labels,
    schema: {
      readings: "15 dk sensör okuması (ingest)",
      labels: "Muayene / olay etiketi — ML hedef değişkeni",
    },
  };
}

function readingsToCsv(readings) {
  const flat = readings.map(flattenReading);
  if (!flat.length) {
    return "hive_id,ts,weight_kg,temp_c,humidity,bee_in,bee_out,vibration,audio_rms,battery,rssi\n";
  }
  const headers = Object.keys(flat[0]);
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of flat) {
    lines.push(headers.map((h) => esc(row[h])).join(","));
  }
  return lines.join("\n");
}

function labelsToCsv(labels) {
  const headers = ["id", "hive_id", "event_type", "event_value", "notes", "source", "ts"];
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of labels) {
    lines.push(
      [row.id, row.hiveId, row.eventType, row.eventValue, row.notes, row.source, row.ts]
        .map(esc)
        .join(",")
    );
  }
  return lines.join("\n");
}

function seedTestRecordsIfMissing() {
  if (!db) initDb();
  const existing = db
    .prepare("SELECT label FROM readings WHERE label IN ('1. Test', '2. Test')")
    .all()
    .map((r) => r.label);
  const missing = ["1. Test", "2. Test"].filter((l) => !existing.includes(l));
  if (!missing.length) return { seeded: [], alreadyHad: existing };

  const now = Date.now();
  const templates = {
    "1. Test": {
      hiveId: 901,
      scenario: "db-test-1",
      scenarioLabel: "1. Test",
      weightKg: 28.4,
      tempC: 34.2,
      humidity: 62,
      beeIn: 420,
      beeOut: 510,
      vibration: 2.8,
      audioRms: 0.31,
      battery: 88,
      rssi: -72,
    },
    "2. Test": {
      hiveId: 902,
      scenario: "db-test-2",
      scenarioLabel: "2. Test",
      weightKg: 31.1,
      tempC: 33.8,
      humidity: 55,
      beeIn: 880,
      beeOut: 920,
      vibration: 4.1,
      audioRms: 0.44,
      battery: 76,
      rssi: -81,
    },
  };

  const seeded = [];
  for (const label of missing) {
    const t = templates[label];
    const reading = {
      ...t,
      cornerKg: [t.weightKg - 0.1, t.weightKg - 0.1, t.weightKg + 0.1, t.weightKg + 0.1],
      lat: 39.92,
      lon: 41.27,
      tiltDeg: 0,
      cameraPresent: true,
      mainCameraPresent: false,
      transportMode: false,
      ts: new Date(now - (label === "1. Test" ? 3600000 : 1800000)).toISOString(),
    };
    saveReading(reading, label);
    seeded.push(label);
  }
  return { seeded, alreadyHad: existing };
}

function getMlConfig(key) {
  if (!db) initDb();
  if (key) {
    const row = db.prepare("SELECT value FROM ml_config WHERE key = ?").get(key);
    return row?.value ?? null;
  }
  const rows = db.prepare("SELECT key, value, updated_at FROM ml_config").all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function setMlConfig(key, value) {
  if (!db) initDb();
  db.prepare(
    "INSERT INTO ml_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  ).run(key, String(value));
  return { key, value: String(value) };
}

function saveMlReferenceRecord(record) {
  if (!db) initDb();
  const stmt = db.prepare(`
    INSERT INTO ml_reference_records
      (hive_id, domain, method, code_ref, situation, sensors_json, features_json, label_json, outcome_json, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    record.hiveId,
    record.domain,
    record.method,
    record.codeRef || null,
    record.situation || null,
    JSON.stringify(record.sensors || {}),
    record.features != null ? JSON.stringify(record.features) : null,
    record.label != null ? JSON.stringify(record.label) : null,
    record.outcome != null ? JSON.stringify(record.outcome) : null,
    record.ts || new Date().toISOString()
  );
  return { id: Number(info.lastInsertRowid), ...record };
}

function listMlReferenceRecords({ hiveId, domain, limit = 100, since } = {}) {
  if (!db) initDb();
  let sql = "SELECT * FROM ml_reference_records WHERE 1=1";
  const params = [];
  if (hiveId != null) {
    sql += " AND hive_id = ?";
    params.push(Number(hiveId));
  }
  if (domain) {
    sql += " AND domain = ?";
    params.push(domain);
  }
  if (since) {
    sql += " AND ts >= ?";
    params.push(since);
  }
  sql += " ORDER BY ts DESC, id DESC LIMIT ?";
  params.push(Math.min(500, limit));
  return db.prepare(sql).all(...params).map(parseMlReferenceRow);
}

function parseMlReferenceRow(r) {
  return {
    id: r.id,
    hiveId: r.hive_id,
    domain: r.domain,
    method: r.method,
    codeRef: r.code_ref,
    situation: r.situation,
    sensors: JSON.parse(r.sensors_json || "{}"),
    features: r.features_json ? JSON.parse(r.features_json) : null,
    label: r.label_json ? JSON.parse(r.label_json) : null,
    outcome: r.outcome_json ? JSON.parse(r.outcome_json) : null,
    ts: r.ts,
    createdAt: r.created_at,
  };
}

function saveMlNecessitySnapshot({ hiveId, scope, scores, cameraDecision, ts }) {
  if (!db) initDb();
  const stmt = db.prepare(`
    INSERT INTO ml_necessity_snapshots (hive_id, scope, scores_json, camera_decision_json, ts)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    hiveId ?? null,
    scope || (hiveId != null ? "hive" : "fleet"),
    JSON.stringify(scores),
    cameraDecision != null ? JSON.stringify(cameraDecision) : null,
    ts || new Date().toISOString()
  );
  return { id: Number(info.lastInsertRowid) };
}

function getLatestMlNecessity(hiveId) {
  if (!db) initDb();
  const row = hiveId != null
    ? db
        .prepare(
          "SELECT * FROM ml_necessity_snapshots WHERE hive_id = ? ORDER BY ts DESC, id DESC LIMIT 1"
        )
        .get(Number(hiveId))
    : db
        .prepare(
          "SELECT * FROM ml_necessity_snapshots WHERE scope = 'fleet' ORDER BY ts DESC, id DESC LIMIT 1"
        )
        .get();
  if (!row) return null;
  return {
    id: row.id,
    hiveId: row.hive_id,
    scope: row.scope,
    scores: JSON.parse(row.scores_json || "{}"),
    cameraDecision: row.camera_decision_json
      ? JSON.parse(row.camera_decision_json)
      : null,
    ts: row.ts,
  };
}

function upsertMlHardwareImpact(sensorId, analysisId, impactScore, samples, method) {
  if (!db) initDb();
  db.prepare(`
    INSERT INTO ml_hardware_impact (sensor_id, analysis_id, impact_score, samples, method, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(sensor_id, analysis_id) DO UPDATE SET
      impact_score = excluded.impact_score,
      samples = excluded.samples,
      method = excluded.method,
      updated_at = datetime('now')
  `).run(sensorId, analysisId, impactScore, samples || 0, method || "rolling");
}

function listMlHardwareImpact() {
  if (!db) initDb();
  return db
    .prepare(
      "SELECT sensor_id AS sensorId, analysis_id AS analysisId, impact_score AS impactScore, samples, method, updated_at AS updatedAt FROM ml_hardware_impact ORDER BY impact_score DESC"
    )
    .all();
}

function appendMlLearningLog(kind, message, detail = null) {
  if (!db) initDb();
  const ts = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO ml_learning_log (kind, message, detail_json, ts) VALUES (?, ?, ?, ?)"
    )
    .run(kind, message, detail != null ? JSON.stringify(detail) : null, ts);
  return { id: Number(info.lastInsertRowid), kind, message, ts };
}

function listMlLearningLog(limit = 80) {
  if (!db) initDb();
  return db
    .prepare(
      "SELECT id, kind, message, detail_json, ts, created_at FROM ml_learning_log ORDER BY id DESC LIMIT ?"
    )
    .all(Math.min(200, limit))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      message: r.message,
      detail: r.detail_json ? JSON.parse(r.detail_json) : null,
      ts: r.ts,
      createdAt: r.created_at,
    }));
}

function getMlStats() {
  if (!db) initDb();
  const refs = db.prepare("SELECT COUNT(*) AS n FROM ml_reference_records").get();
  const nec = db.prepare("SELECT COUNT(*) AS n FROM ml_necessity_snapshots").get();
  const impact = db.prepare("SELECT COUNT(*) AS n FROM ml_hardware_impact").get();
  const logs = db.prepare("SELECT COUNT(*) AS n FROM ml_learning_log").get();
  const pending = db
    .prepare("SELECT COUNT(*) AS n FROM ml_pending_proposals WHERE status = 'pending'")
    .get();
  const domains = db
    .prepare(
      "SELECT domain, COUNT(*) AS n FROM ml_reference_records GROUP BY domain ORDER BY n DESC"
    )
    .all();
  return {
    referenceRecords: refs.n,
    necessitySnapshots: nec.n,
    hardwareImpactRows: impact.n,
    learningLogEntries: logs.n,
    pendingProposals: pending.n,
    byDomain: domains,
  };
}

function parseProposalRow(r) {
  return {
    id: r.id,
    hiveId: r.hive_id,
    proposalType: r.proposal_type,
    status: r.status,
    situation: r.situation,
    title: r.title,
    message: r.message,
    payload: JSON.parse(r.payload_json || "{}"),
    improvement: JSON.parse(r.improvement_json || "{}"),
    domains: r.domains_json ? JSON.parse(r.domains_json) : [],
    recordCount: r.record_count,
    ts: r.ts,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    createdAt: r.created_at,
  };
}

function saveMlProposal(proposal) {
  if (!db) initDb();
  const info = db
    .prepare(
      `INSERT INTO ml_pending_proposals
        (hive_id, proposal_type, status, situation, title, message, payload_json, improvement_json, domains_json, record_count, ts)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      proposal.hiveId,
      proposal.proposalType || "reference_batch",
      proposal.situation || null,
      proposal.title,
      proposal.message,
      JSON.stringify(proposal.payload || {}),
      JSON.stringify(proposal.improvement || {}),
      JSON.stringify(proposal.domains || []),
      proposal.recordCount || 0,
      proposal.ts || new Date().toISOString()
    );
  return { id: Number(info.lastInsertRowid), status: "pending", ...proposal };
}

function getMlProposal(id) {
  if (!db) initDb();
  const row = db.prepare("SELECT * FROM ml_pending_proposals WHERE id = ?").get(Number(id));
  return row ? parseProposalRow(row) : null;
}

function listMlProposals({ status = "pending", hiveId, limit = 50 } = {}) {
  if (!db) initDb();
  let sql = "SELECT * FROM ml_pending_proposals WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (hiveId != null) {
    sql += " AND hive_id = ?";
    params.push(Number(hiveId));
  }
  sql += " ORDER BY id DESC LIMIT ?";
  params.push(Math.min(200, limit));
  return db.prepare(sql).all(...params).map(parseProposalRow);
}

function countPendingMlProposals(hiveId) {
  if (!db) initDb();
  if (hiveId != null) {
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM ml_pending_proposals WHERE status = 'pending' AND hive_id = ?"
      )
      .get(Number(hiveId)).n;
  }
  return db
    .prepare("SELECT COUNT(*) AS n FROM ml_pending_proposals WHERE status = 'pending'")
    .get().n;
}

function updateMlProposalStatus(id, status, reviewedBy = "admin") {
  if (!db) initDb();
  db.prepare(
    "UPDATE ml_pending_proposals SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
  ).run(status, reviewedBy, Number(id));
  return getMlProposal(id);
}

function hasRecentPendingProposal(hiveId, situation, withinMinutes = 30) {
  if (!db) initDb();
  const since = new Date(Date.now() - withinMinutes * 60000).toISOString();
  const row = db
    .prepare(
      `SELECT id FROM ml_pending_proposals
       WHERE status = 'pending' AND hive_id = ? AND situation = ? AND ts >= ?
       LIMIT 1`
    )
    .get(Number(hiveId), situation, since);
  return Boolean(row);
}

function saveHiveBaseline(hiveId, { source, sessionId, scores, config, ts }) {
  if (!db) initDb();
  const stmt = db.prepare(`
    INSERT INTO hive_baselines (hive_id, source, session_id, scores_json, config_json, ts)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(hive_id) DO UPDATE SET
      source = excluded.source,
      session_id = excluded.session_id,
      scores_json = excluded.scores_json,
      config_json = excluded.config_json,
      ts = excluded.ts,
      created_at = datetime('now')
  `);
  stmt.run(
    Number(hiveId),
    source || "petek_tarama",
    sessionId || null,
    JSON.stringify(scores),
    config ? JSON.stringify(config) : null,
    ts || new Date().toISOString()
  );
  return getHiveBaseline(hiveId);
}

function getHiveBaseline(hiveId) {
  if (!db) initDb();
  const row = db
    .prepare("SELECT * FROM hive_baselines WHERE hive_id = ? LIMIT 1")
    .get(Number(hiveId));
  if (!row) return null;
  return {
    hiveId: row.hive_id,
    source: row.source,
    sessionId: row.session_id,
    scores: JSON.parse(row.scores_json),
    config: row.config_json ? JSON.parse(row.config_json) : null,
    ts: row.ts,
    createdAt: row.created_at,
  };
}

function saveHiveScoreHistory(hiveId, scores, revision, ts) {
  if (!db) initDb();
  const stmt = db.prepare(`
    INSERT INTO hive_score_history (hive_id, scores_json, revision_json, ts)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(
    Number(hiveId),
    JSON.stringify(scores),
    revision ? JSON.stringify(revision) : null,
    ts || scores.ts || new Date().toISOString()
  );
  return { id: Number(info.lastInsertRowid), hiveId: Number(hiveId) };
}

function listHiveScoreHistory(hiveId, { limit = 200, since } = {}) {
  if (!db) initDb();
  let sql = "SELECT * FROM hive_score_history WHERE hive_id = ?";
  const params = [Number(hiveId)];
  if (since) {
    sql += " AND ts >= ?";
    params.push(since);
  }
  sql += " ORDER BY ts ASC, id ASC LIMIT ?";
  params.push(Math.min(500, limit));
  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => ({
    id: r.id,
    hiveId: r.hive_id,
    scores: JSON.parse(r.scores_json),
    revision: r.revision_json ? JSON.parse(r.revision_json) : null,
    ts: r.ts,
    createdAt: r.created_at,
  }));
}

function pruneHiveScoreHistory(hiveId, keep = 500) {
  if (!db) initDb();
  db.prepare(
    `DELETE FROM hive_score_history WHERE hive_id = ? AND id NOT IN (
      SELECT id FROM hive_score_history WHERE hive_id = ? ORDER BY ts DESC, id DESC LIMIT ?
    )`
  ).run(Number(hiveId), Number(hiveId), keep);
}

function saveJournalEntry(hiveId, entry) {
  if (!db) initDb();
  const ts = entry.tarih || new Date().toISOString();
  db.prepare(
    "INSERT INTO journal_entries (hive_id, payload, ts) VALUES (?, ?, ?)"
  ).run(Number(hiveId), JSON.stringify(entry), ts);
  return entry;
}

function listJournalEntries(hiveId) {
  if (!db) initDb();
  const rows = db
    .prepare(
      "SELECT payload, ts FROM journal_entries WHERE hive_id = ? ORDER BY ts DESC LIMIT 200"
    )
    .all(Number(hiveId));
  return rows.map((r) => ({ ...JSON.parse(r.payload), tarih: r.ts }));
}

function listTeams() {
  if (!db) initDb();
  return db.prepare("SELECT * FROM teams ORDER BY created_at DESC").all();
}

function getTeam(teamId) {
  if (!db) initDb();
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
  if (!team) return null;
  const members = db
    .prepare("SELECT email, role FROM team_members WHERE team_id = ?")
    .all(teamId);
  return { ...team, members };
}

function createTeam(name, ownerEmail) {
  if (!db) initDb();
  const id = `team-${Date.now().toString(36)}`;
  db.prepare("INSERT INTO teams (id, name, owner_email) VALUES (?, ?, ?)").run(
    id,
    name,
    ownerEmail || null
  );
  if (ownerEmail) {
    db.prepare(
      "INSERT OR IGNORE INTO team_members (team_id, email, role) VALUES (?, ?, 'owner')"
    ).run(id, ownerEmail);
  }
  return getTeam(id);
}

function addTeamMember(teamId, email, role) {
  if (!db) initDb();
  db.prepare(
    "INSERT OR REPLACE INTO team_members (team_id, email, role) VALUES (?, ?, ?)"
  ).run(teamId, email, role);
  return getTeam(teamId);
}

function getTeamForHive(hiveId) {
  if (!db) initDb();
  const row = db
    .prepare(
      "SELECT t.* FROM teams t JOIN hive_teams ht ON ht.team_id = t.id WHERE ht.hive_id = ?"
    )
    .get(Number(hiveId));
  return row ? getTeam(row.id) : null;
}

function saveOfflineQueue(entry) {
  if (!db) initDb();
  db.prepare(
    "INSERT OR REPLACE INTO offline_queue (id, client_id, payload, status, ts) VALUES (?, ?, ?, ?, ?)"
  ).run(
    entry.id,
    entry.clientId,
    JSON.stringify(entry.payload),
    entry.status,
    entry.ts
  );
}

function listOfflineQueue(clientId, status = null) {
  if (!db) initDb();
  const sql = status
    ? "SELECT * FROM offline_queue WHERE client_id = ? AND status = ? ORDER BY ts ASC"
    : "SELECT * FROM offline_queue WHERE client_id = ? ORDER BY ts ASC";
  const rows = status
    ? db.prepare(sql).all(clientId, status)
    : db.prepare(sql).all(clientId);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    payload: JSON.parse(r.payload),
    status: r.status,
    ts: r.ts,
  }));
}

function getOfflineQueueItem(id) {
  if (!db) initDb();
  const r = db.prepare("SELECT * FROM offline_queue WHERE id = ?").get(id);
  if (!r) return null;
  return {
    id: r.id,
    clientId: r.client_id,
    payload: JSON.parse(r.payload),
    status: r.status,
    ts: r.ts,
  };
}

function updateOfflineQueueStatus(id, status) {
  if (!db) initDb();
  db.prepare(
    "UPDATE offline_queue SET status = ?, synced_at = datetime('now') WHERE id = ?"
  ).run(status, id);
}

function getSubscription(accountId) {
  if (!db) initDb();
  const r = db.prepare("SELECT * FROM subscriptions WHERE account_id = ?").get(accountId);
  if (!r) return null;
  return { accountId: r.account_id, planId: r.plan_id, active: r.active === 1 };
}

function saveSubscription(accountId, planId) {
  if (!db) initDb();
  db.prepare(
    "INSERT OR REPLACE INTO subscriptions (account_id, plan_id, active, updated_at) VALUES (?, ?, 1, datetime('now'))"
  ).run(accountId, planId);
}

function saveSlaRecord(record) {
  if (!db) initDb();
  const info = db
    .prepare(
      "INSERT INTO sla_records (hive_id, team_id, payload, status, scheduled_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      record.hiveId ?? null,
      record.teamId || "default",
      JSON.stringify(record),
      record.status || "planlandi",
      record.scheduledAt
    );
  return { id: info.lastInsertRowid, ...record };
}

function listSlaRecords(teamId = null) {
  if (!db) initDb();
  const rows = teamId
    ? db
        .prepare("SELECT * FROM sla_records WHERE team_id = ? ORDER BY scheduled_at DESC")
        .all(teamId)
    : db.prepare("SELECT * FROM sla_records ORDER BY scheduled_at DESC LIMIT 100").all();
  return rows.map((r) => ({
    id: r.id,
    ...JSON.parse(r.payload),
    status: r.status,
    scheduledAt: r.scheduled_at,
  }));
}

function updateSlaRecord(id, patch) {
  if (!db) initDb();
  const row = db.prepare("SELECT * FROM sla_records WHERE id = ?").get(Number(id));
  if (!row) return null;
  const current = JSON.parse(row.payload);
  const merged = { ...current, ...patch };
  db.prepare("UPDATE sla_records SET payload = ?, status = ? WHERE id = ?").run(
    JSON.stringify(merged),
    patch.status || row.status,
    Number(id)
  );
  return { id: Number(id), ...merged };
}

function getMlFleetStats() {
  if (!db) initDb();
  const readingCount =
    db.prepare("SELECT COUNT(*) AS c FROM readings").get()?.c ?? 0;
  const labelCount = db.prepare("SELECT COUNT(*) AS c FROM labels").get()?.c ?? 0;
  const hiveCount =
    db.prepare("SELECT COUNT(DISTINCT hive_id) AS c FROM readings").get()?.c ?? 0;
  return { readingCount, labelCount, hiveCount };
}

module.exports = {
  initDb,
  saveReading,
  saveLabel,
  listLabels,
  loadAllReadings,
  listRecords,
  getStats,
  exportDataset,
  readingsToCsv,
  labelsToCsv,
  seedTestRecordsIfMissing,
  getMlConfig,
  setMlConfig,
  saveMlReferenceRecord,
  listMlReferenceRecords,
  saveMlNecessitySnapshot,
  getLatestMlNecessity,
  upsertMlHardwareImpact,
  listMlHardwareImpact,
  appendMlLearningLog,
  listMlLearningLog,
  getMlStats,
  saveMlProposal,
  getMlProposal,
  listMlProposals,
  countPendingMlProposals,
  updateMlProposalStatus,
  hasRecentPendingProposal,
  saveHiveBaseline,
  getHiveBaseline,
  saveHiveScoreHistory,
  listHiveScoreHistory,
  pruneHiveScoreHistory,
  saveJournalEntry,
  listJournalEntries,
  listTeams,
  getTeam,
  createTeam,
  addTeamMember,
  getTeamForHive,
  saveOfflineQueue,
  listOfflineQueue,
  getOfflineQueueItem,
  updateOfflineQueueStatus,
  getSubscription,
  saveSubscription,
  saveSlaRecord,
  listSlaRecords,
  updateSlaRecord,
  getMlFleetStats,
  LABEL_TYPES,
  DB_PATH,
  MODELS_DIR,
};
