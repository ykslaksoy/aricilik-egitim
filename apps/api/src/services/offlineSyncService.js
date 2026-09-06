/**
 * Offline-first senkron — kuyruk + idempotent ingest.
 */

const crypto = require("crypto");
const dbService = require("./dbService");

function enqueue(clientId, payload) {
  const id = payload.clientEventId || `off-${crypto.randomBytes(6).toString("hex")}`;
  const entry = {
    id,
    clientId,
    payload,
    status: "pending",
    ts: new Date().toISOString(),
  };
  dbService.saveOfflineQueue(entry);
  return entry;
}

function listPending(clientId) {
  return dbService.listOfflineQueue(clientId, "pending");
}

function markSynced(id) {
  dbService.updateOfflineQueueStatus(id, "synced");
}

function processBatch(clientId, items, ingestFn) {
  const results = [];
  for (const item of items) {
    const existing = dbService.getOfflineQueueItem(item.clientEventId || item.id);
    if (existing?.status === "synced") {
      results.push({ id: item.clientEventId || item.id, status: "duplicate" });
      continue;
    }
    try {
      ingestFn(item.payload);
      markSynced(item.clientEventId || item.id);
      results.push({ id: item.clientEventId || item.id, status: "synced" });
    } catch (err) {
      results.push({ id: item.clientEventId || item.id, status: "error", message: err.message });
    }
  }
  return results;
}

module.exports = { enqueue, listPending, markSynced, processBatch };
