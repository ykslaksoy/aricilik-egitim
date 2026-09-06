/**
 * Yerinde kurulum / SLA — enterprise servis takibi.
 */

const dbService = require("./dbService");

const SLA_DEFAULTS = {
  installDays: 7,
  responseHours: 24,
  uptimePct: 99,
};

function listInstallations(teamId = null) {
  return dbService.listSlaRecords(teamId);
}

function createInstallation(record) {
  const normalized = {
    hiveId: record.hiveId,
    teamId: record.teamId || "default",
    scheduledAt: record.scheduledAt || new Date().toISOString(),
    status: record.status || "planlandi",
    technician: record.technician || null,
    sla: { ...SLA_DEFAULTS, ...(record.sla || {}) },
    notes: record.notes || "",
  };
  return dbService.saveSlaRecord(normalized);
}

function updateInstallation(id, patch) {
  return dbService.updateSlaRecord(id, patch);
}

function slaStatus(record) {
  if (!record) return null;
  const scheduled = new Date(record.scheduledAt);
  const daysSince = Math.round((Date.now() - scheduled.getTime()) / 86400000);
  let status = record.status;
  if (status === "planlandi" && daysSince > record.sla?.installDays) status = "gecikti";
  return { ...record, computedStatus: status, daysSince };
}

module.exports = {
  SLA_DEFAULTS,
  listInstallations,
  createInstallation,
  updateInstallation,
  slaStatus,
};
