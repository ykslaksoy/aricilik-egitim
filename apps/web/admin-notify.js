/**
 * SuperAri — admin («bize») notifications for user-add / quota / capacity failures.
 * Primary store: localStorage (static Vercel). Optional POST /api/admin/notify when API up.
 */
(function (global) {
  var NOTIF_KEY = 'superari_admin_notifications';
  var USERS_KEY = 'superari_admin_users';
  var USER_MSG = 'Talep yoğunluğundan dolayı lütfen yarın deneyiniz.';
  var ADMIN_MSG = 'Kullanıcı yoğunluktan dolayı ekleme yapılamadı';

  function nowIso() {
    return new Date().toISOString();
  }

  function readList(key) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, arr) {
    try {
      global.localStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
    } catch (e) { /* ignore */ }
  }

  function upsertUser(user) {
    if (!user) return;
    var list = readList(USERS_KEY);
    var email = String(user.email || '').toLowerCase();
    var id = user.id || (email ? 'u-' + email : 'u-' + Date.now());
    var idx = list.findIndex(function (u) {
      return u.id === id || (email && String(u.email || '').toLowerCase() === email);
    });
    var row = {
      id: id,
      name: user.name || user.ad || '',
      email: user.email || '',
      role: user.role || user.rol || '',
      status: user.status || 'active',
      source: user.source || 'demo',
      updatedAt: nowIso()
    };
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], row);
    else list.unshift(row);
    writeList(USERS_KEY, list);
    return row;
  }

  function listUsers() {
    return readList(USERS_KEY);
  }

  function listNotifications() {
    return readList(NOTIF_KEY);
  }

  function markNotificationRead(id) {
    var list = readList(NOTIF_KEY);
    list.forEach(function (n) {
      if (n.id === id) n.read = true;
    });
    writeList(NOTIF_KEY, list);
  }

  function clearNotifications() {
    writeList(NOTIF_KEY, []);
  }

  /**
   * Notify admins («bize») that a user could not be added / quota / capacity hit.
   * @param {{ reason?: string, name?: string, email?: string, source?: string, userMessage?: string }} meta
   */
  function notifyAdminsBusy(meta) {
    meta = meta || {};
    var entry = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      type: 'user_add_failed',
      message: ADMIN_MSG,
      detail: meta.reason || meta.source || 'capacity_or_quota',
      name: meta.name || meta.ad || '',
      email: meta.email || '',
      source: meta.source || 'client',
      userMessage: meta.userMessage || USER_MSG,
      ts: nowIso(),
      read: false
    };
    var list = readList(NOTIF_KEY);
    list.unshift(entry);
    writeList(NOTIF_KEY, list);

    // Best-effort server push / alert store
    try {
      global.fetch('/api/admin/notify-user-add-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: entry.name,
          email: entry.email,
          reason: entry.detail,
          source: entry.source,
          message: entry.message,
          ts: entry.ts
        })
      }).catch(function () { /* API may be absent on static host */ });
    } catch (e) { /* ignore */ }

    return entry;
  }

  /**
   * Show user-facing busy message AND notify admins. Call whenever USER_MSG is shown.
   */
  function warnUserBusyAndNotify(meta) {
    notifyAdminsBusy(meta || {});
    return USER_MSG;
  }

  function isBusyOrQuotaError(err) {
    if (!err) return false;
    var s = '';
    if (typeof err === 'string') s = err;
    else if (err.message) s = String(err.message);
    else if (err.code) s = String(err.code);
    else s = String(err);
    s = s.toLowerCase();
    return (
      s.indexOf('quota') >= 0 ||
      s.indexOf('rate') >= 0 ||
      s.indexOf('limit') >= 0 ||
      s.indexOf('429') >= 0 ||
      s.indexOf('capacity') >= 0 ||
      s.indexOf('busy') >= 0 ||
      s.indexOf('yogun') >= 0 ||
      s.indexOf('yoğun') >= 0 ||
      s.indexOf('exceed') >= 0 ||
      s.indexOf('yandex_quota') >= 0 ||
      s.indexOf('ymaps_script_error') >= 0 ||
      s.indexOf('ymaps_timeout') >= 0
    );
  }

  global.SuperAriAdminNotify = {
    USER_MSG: USER_MSG,
    ADMIN_MSG: ADMIN_MSG,
    NOTIF_KEY: NOTIF_KEY,
    USERS_KEY: USERS_KEY,
    notifyAdminsBusy: notifyAdminsBusy,
    warnUserBusyAndNotify: warnUserBusyAndNotify,
    isBusyOrQuotaError: isBusyOrQuotaError,
    listNotifications: listNotifications,
    markNotificationRead: markNotificationRead,
    clearNotifications: clearNotifications,
    listUsers: listUsers,
    upsertUser: upsertUser
  };
})(window);
