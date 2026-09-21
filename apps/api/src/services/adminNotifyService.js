/**
 * Admin («bize») notifications — user-add / capacity / quota failures.
 * In-memory store + push via pushService when devices registered.
 */
const pushService = require("./pushService");

/** @type {object[]} */
const notifications = [];
/** @type {Map<string, object>} */
const users = new Map();

const ADMIN_MSG = "Kullanıcı yoğunluktan dolayı ekleme yapılamadı";
const USER_MSG = "Talep yoğunluğundan dolayı lütfen yarın deneyiniz.";

const DAILY_LIMIT = Number(process.env.USER_ADD_DAILY_LIMIT || 500);
/** @type {Map<string, number>} yyyy-mm-dd → count */
const dailyAdds = new Map();

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function canAddUser() {
  const k = dayKey();
  const n = dailyAdds.get(k) || 0;
  return n < DAILY_LIMIT;
}

function recordAdd() {
  const k = dayKey();
  dailyAdds.set(k, (dailyAdds.get(k) || 0) + 1);
}

function upsertUser(body = {}) {
  const email = String(body.email || "").trim().toLowerCase();
  const id = body.id || (email ? `u-${email}` : `u-${Date.now()}`);
  const row = {
    id,
    name: body.name || body.ad || "",
    email,
    role: body.role || body.rol || "arici",
    status: body.status || "active",
    source: body.source || "api",
    updatedAt: new Date().toISOString(),
  };
  users.set(id, row);
  return row;
}

function listUsers() {
  return [...users.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/**
 * @param {{ name?: string, email?: string, reason?: string, source?: string, message?: string, ts?: string }} meta
 */
async function notifyUserAddFailure(meta = {}) {
  const entry = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "user_add_failed",
    message: meta.message || ADMIN_MSG,
    detail: meta.reason || meta.source || "capacity_or_quota",
    name: meta.name || "",
    email: meta.email || "",
    source: meta.source || "api",
    userMessage: USER_MSG,
    ts: meta.ts || new Date().toISOString(),
    read: false,
    priority: 2,
  };
  notifications.unshift(entry);
  if (notifications.length > 300) notifications.length = 300;

  if (meta.email || meta.name) {
    upsertUser({
      name: meta.name,
      email: meta.email,
      status: "failed",
      source: meta.source || "failed_add",
    });
  }

  const alert = {
    id: entry.id,
    hiveId: 0,
    type: "user_add_failed",
    title: ADMIN_MSG,
    message: `${ADMIN_MSG} — ${entry.name || "—"} ${entry.email || ""} (${entry.detail}) · ${entry.ts}`,
    priority: 2,
    ts: entry.ts,
  };

  let pushed = [];
  try {
    if (pushService.getConfig().enabled) {
      pushed = await pushService.dispatchAlerts([alert]);
    }
  } catch (e) {
    pushed = [];
  }

  return { ok: true, notification: entry, pushed: pushed.length, userMessage: USER_MSG };
}

function listNotifications(limit = 100) {
  return notifications.slice(0, limit);
}

function markRead(id) {
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
  return n;
}

function registerUser(body = {}) {
  if (!canAddUser()) {
    return { error: "capacity", userMessage: USER_MSG };
  }
  const email = String(body.email || "").trim();
  const name = String(body.name || body.ad || "").trim();
  if (!email && !name) return { error: "name_or_email_required" };
  recordAdd();
  const user = upsertUser({
    name,
    email,
    role: body.role || body.rol || "arici",
    status: "pending",
    source: "register",
  });
  return { ok: true, user, userMessage: null };
}

module.exports = {
  ADMIN_MSG,
  USER_MSG,
  notifyUserAddFailure,
  listNotifications,
  markRead,
  listUsers,
  upsertUser,
  registerUser,
  canAddUser,
};
