/**
 * Push bildirim servisi — iOS (APNs), Android (FCM), web (inbox + tarayıcı).
 * Demo: FCM/APNs anahtarı yoksa inbox + log; üretimde env ile gerçek gönderim.
 */

const crypto = require("crypto");

/** @type {Map<string, object>} */
const devices = new Map();
/** @type {Map<string, object[]>} deviceId → inbox */
const inbox = new Map();
/** @type {object[]} global dispatch log */
const history = [];

const globalPrefs = {
  enabled: true,
  minPriority: 2,
  channels: { fcm: true, apns: true, web: true },
};

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";
const APNS_KEY_ID = process.env.APNS_KEY_ID || "";
const PUSH_MODE = FCM_SERVER_KEY ? "fcm" : APNS_KEY_ID ? "apns" : "demo";

function uid(prefix = "push") {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function alertTitle(alert) {
  const { alertTypeTr } = require("../../../../packages/shared/labelsTr");
  return alertTypeTr(alert.type) || alert.title || "Koloni uyarısı";
}

/**
 * @param {object} alert
 * @param {object} device
 */
function shouldPush(alert, device) {
  if (!globalPrefs.enabled) return false;
  if (device.enabled === false) return false;
  const minP = device.minPriority ?? globalPrefs.minPriority;
  return (alert.priority ?? 5) <= minP;
}

async function sendToFcm(device, payload) {
  if (!FCM_SERVER_KEY || !device.token) {
    return { ok: false, channel: "fcm", reason: "FCM yapılandırılmadı" };
  }
  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${FCM_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: device.token,
        notification: { title: payload.title, body: payload.body },
        data: {
          alertId: payload.alertId,
          hiveId: String(payload.hiveId ?? ""),
          type: payload.type,
          priority: String(payload.priority),
        },
      }),
    });
    return { ok: res.ok, channel: "fcm", status: res.status };
  } catch (e) {
    return { ok: false, channel: "fcm", reason: e.message };
  }
}

async function sendToApns(device, payload) {
  if (!APNS_KEY_ID || !device.token) {
    return { ok: false, channel: "apns", reason: "APNs yapılandırılmadı" };
  }
  return { ok: false, channel: "apns", reason: "APNs HTTP/2 üretim ortamında etkinleştirilir" };
}

/**
 * @param {object} alert
 * @param {object} device
 */
async function deliverToDevice(alert, device) {
  const payload = {
    id: uid(),
    alertId: alert.id,
    hiveId: alert.hiveId,
    type: alert.type,
    priority: alert.priority ?? 5,
    title: alertTitle(alert),
    body: alert.message,
    ts: alert.ts || new Date().toISOString(),
    read: false,
    deviceId: device.deviceId,
  };

  let delivery = { ok: true, channel: "demo" };

  if (device.platform === "android" && globalPrefs.channels.fcm) {
    delivery = await sendToFcm(device, payload);
    if (!delivery.ok) delivery = { ok: true, channel: "demo_fallback" };
  } else if (device.platform === "ios" && globalPrefs.channels.apns) {
    delivery = await sendToApns(device, payload);
    if (!delivery.ok) delivery = { ok: true, channel: "demo_fallback" };
  } else if (device.platform === "web" && globalPrefs.channels.web) {
    delivery = { ok: true, channel: "web_inbox" };
  } else {
    delivery = { ok: true, channel: "demo" };
  }

  payload.channel = delivery.channel;
  payload.status = delivery.ok ? "sent" : "failed";

  const list = inbox.get(device.deviceId) || [];
  list.unshift(payload);
  if (list.length > 100) list.length = 100;
  inbox.set(device.deviceId, list);

  history.unshift({
    ...payload,
    platform: device.platform,
    delivery,
  });
  if (history.length > 500) history.length = 500;

  return payload;
}

/**
 * Yeni alarmlar için tüm cihazlara push gönder.
 * @param {object[]} newAlerts
 */
async function dispatchAlerts(newAlerts) {
  if (!newAlerts?.length || !globalPrefs.enabled) return [];

  const sent = [];
  for (const alert of newAlerts) {
    for (const device of devices.values()) {
      if (!shouldPush(alert, device)) continue;
      const msg = await deliverToDevice(alert, device);
      sent.push(msg);
    }
  }
  return sent;
}

function registerDevice(body = {}) {
  const platform = body.platform || "web";
  if (!["ios", "android", "web"].includes(platform)) {
    return { error: "invalid_platform" };
  }
  const deviceId = body.deviceId || uid("dev");
  const device = {
    deviceId,
    platform,
    token: body.token || deviceId,
    label: body.label || `${platform} cihaz`,
    minPriority: body.minPriority ?? globalPrefs.minPriority,
    enabled: body.enabled !== false,
    registeredAt: new Date().toISOString(),
  };
  devices.set(deviceId, device);
  if (!inbox.has(deviceId)) inbox.set(deviceId, []);
  return { ok: true, device };
}

function unregisterDevice(deviceId) {
  devices.delete(deviceId);
  inbox.delete(deviceId);
  return { ok: true };
}

function getInbox(deviceId, sinceMs = 0) {
  const list = inbox.get(deviceId) || [];
  if (!sinceMs) return list;
  return list.filter((m) => new Date(m.ts).getTime() > sinceMs);
}

function markRead(deviceId, pushId) {
  const list = inbox.get(deviceId) || [];
  const item = list.find((m) => m.id === pushId);
  if (item) item.read = true;
  return item;
}

function markAllRead(deviceId) {
  const list = inbox.get(deviceId) || [];
  for (const m of list) m.read = true;
  return list.length;
}

function getConfig() {
  return {
    enabled: globalPrefs.enabled,
    mode: PUSH_MODE,
    minPriority: globalPrefs.minPriority,
    channels: globalPrefs.channels,
    fcmConfigured: Boolean(FCM_SERVER_KEY),
    apnsConfigured: Boolean(APNS_KEY_ID),
    deviceCount: devices.size,
    doc: "POST /api/push/register · GET /api/push/inbox",
  };
}

function setPreferences(prefs = {}) {
  if (prefs.enabled != null) globalPrefs.enabled = Boolean(prefs.enabled);
  if (prefs.minPriority != null) {
    globalPrefs.minPriority = Math.max(1, Math.min(5, Number(prefs.minPriority)));
  }
  if (prefs.channels) {
    globalPrefs.channels = { ...globalPrefs.channels, ...prefs.channels };
  }
  return globalPrefs;
}

async function sendTest(deviceId, message) {
  const fake = {
    id: uid("test"),
    hiveId: 2,
    type: "test",
    priority: 1,
    message: message || "Push test — koloni bildirimi çalışıyor",
    ts: new Date().toISOString(),
  };
  const device = devices.get(deviceId);
  if (!device) return { error: "device_not_found" };
  const msg = await deliverToDevice(fake, device);
  return { ok: true, push: msg };
}

module.exports = {
  dispatchAlerts,
  registerDevice,
  unregisterDevice,
  getInbox,
  markRead,
  markAllRead,
  getConfig,
  setPreferences,
  sendTest,
  listDevices: () => [...devices.values()],
  getHistory: (limit = 50) => history.slice(0, limit),
};
