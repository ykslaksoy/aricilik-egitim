/**
 * Offline-first — yerel kuyruk + bağlantı dönünce senkron.
 */
const STORAGE_KEY = "koloni_offline_queue";
const CLIENT_ID_KEY = "koloni_client_id";

function clientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = "web-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

function queueSize() {
  return loadQueue().length;
}

function enqueue(payload) {
  const q = loadQueue();
  const entry = {
    clientEventId: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    payload,
    ts: new Date().toISOString(),
  };
  q.push(entry);
  saveQueue(q);
  updateBadge();
  return entry;
}

async function syncQueue() {
  const q = loadQueue();
  if (!q.length || !navigator.onLine) return { synced: 0, pending: q.length };
  try {
    const res = await fetch("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId(), items: q }),
    });
    const data = await res.json();
    if (!data.ok) return { synced: 0, pending: q.length };
    const syncedIds = new Set(
      (data.results || []).filter((r) => r.status === "synced" || r.status === "duplicate").map((r) => r.id)
    );
    const remaining = q.filter((item) => !syncedIds.has(item.clientEventId));
    saveQueue(remaining);
    updateBadge();
    return { synced: syncedIds.size, pending: remaining.length };
  } catch {
    return { synced: 0, pending: q.length };
  }
}

function updateBadge() {
  const el = document.getElementById("offline-status");
  if (!el) return;
  const n = queueSize();
  el.textContent = n ? `Offline kuyruk: ${n}` : navigator.onLine ? "Çevrimiçi" : "Offline mod";
  el.classList.toggle("warn", n > 0);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* ignore */
  }
}

window.koloniOffline = {
  clientId,
  enqueue,
  syncQueue,
  queueSize,
  updateBadge,
  registerServiceWorker,
};

window.addEventListener("online", () => syncQueue().then(updateBadge));
document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  syncQueue().then(updateBadge);
});
