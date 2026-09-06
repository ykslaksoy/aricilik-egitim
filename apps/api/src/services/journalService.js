/**
 * Muayene / ilaç / besleme günlüğü — CRUD + meta senkron.
 */

const dbService = require("./dbService");

function listJournal(hiveId) {
  return dbService.listJournalEntries(hiveId);
}

function addJournalEntry(hiveId, entry, hiveMetaMap) {
  const normalized = {
    tarih: entry.tarih || entry.date || new Date().toISOString(),
    tip: entry.tip || entry.type || "muayene",
    not: entry.not || entry.note || "",
    ilac: entry.ilac || entry.treatment || null,
    besleme: entry.besleme || entry.feeding || null,
    miktar: entry.miktar || entry.amount || null,
    arici: entry.arici || entry.beekeeper || null,
  };
  dbService.saveJournalEntry(hiveId, normalized);
  syncMetaFromJournal(hiveId, hiveMetaMap);
  return normalized;
}

function syncMetaFromJournal(hiveId, hiveMetaMap) {
  const entries = listJournal(hiveId);
  const meta = hiveMetaMap.get(hiveId) || {};
  meta.muayeneGunlugu = entries.filter((e) => e.tip === "muayene" || e.tip === "inspection");
  meta.ilacGecmisi = entries
    .filter((e) => e.ilac)
    .map((e) => ({ ilac: e.ilac, tarih: e.tarih, miktar: e.miktar }));
  meta.beslemeGecmisi = entries
    .filter((e) => e.besleme)
    .map((e) => ({ besleme: e.besleme, tarih: e.tarih, miktar: e.miktar }));
  const last = entries[0];
  if (last?.tip === "muayene") meta.sonMuayeneAt = last.tarih;
  hiveMetaMap.set(hiveId, meta);
}

module.exports = { listJournal, addJournalEntry, syncMetaFromJournal };
