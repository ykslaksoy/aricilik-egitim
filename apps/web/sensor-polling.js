/**
 * SüperArı — sensör ölçüm zamanlayıcısı (istemci + demo simülasyonu).
 * Canlıda gerçek cihazlar entegrasyonla push eder; zamanlayıcı aralıkta prune + demo okuma üretir.
 */
(function (global) {
  'use strict';

  var CONFIG_KEY = 'superari.sensor.polling.v1';
  var RETENTION_DAYS = 183; /* ~6 ay */
  var MS_DAY = 86400000;
  var TICK_MS = 60000;
  var SW_TAG = 'superari-sensor-poll';

  var STORAGE_BY_TIP = {
    tarti: 'superari.sensor.tarti.v1',
    isi_nem: 'superari.sensor.isi_nem.v1',
    ses: 'superari.sensor.ses.v1',
    titresim: 'superari.sensor.titresim.v1',
    ir: 'superari.sensor.ir.v1'
  };

  /** Rakip varsayımları: BroodMinder tartı ~1 sa; TH sık; Arnia/bScale günlük/4x günlük ağırlık. */
  var DEFAULT_INTERVAL_MS = {
    tarti: 3600000,
    isi_nem: 900000,
    ses: 3600000,
    titresim: 1800000,
    ir: 14400000,
    gateway: 86400000,
    kamera_arilik: 86400000,
    kamera_merkez: 86400000,
    kamera_kovan: 86400000,
    role_hub: 86400000
  };

  var INTERVAL_PRESETS = [
    { ms: 900000, label: '15 dk' },
    { ms: 1800000, label: '30 dk' },
    { ms: 3600000, label: '1 saat' },
    { ms: 14400000, label: '4 saat' },
    { ms: 43200000, label: '12 saat' },
    { ms: 86400000, label: '24 saat' }
  ];

  var POLLABLE_TIPS = ['tarti', 'isi_nem', 'ses', 'titresim', 'ir'];

  function readJ(k, d) {
    try {
      var v = JSON.parse(global.localStorage.getItem(k) || 'null');
      return v == null ? d : v;
    } catch (e) { return d; }
  }
  function writeJ(k, v) {
    try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function isLive() {
    try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; }
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocalIso() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function dayOf(at) { return String(at || '').slice(0, 10); }

  function emptyConfig() {
    return { defaults: {}, byDevice: {}, byApiary: {}, lastPoll: {} };
  }

  function getConfig() {
    var c = readJ(CONFIG_KEY, null);
    if (!c || typeof c !== 'object') return emptyConfig();
    c.defaults = c.defaults && typeof c.defaults === 'object' ? c.defaults : {};
    c.byDevice = c.byDevice && typeof c.byDevice === 'object' ? c.byDevice : {};
    c.byApiary = c.byApiary && typeof c.byApiary === 'object' ? c.byApiary : {};
    c.lastPoll = c.lastPoll && typeof c.lastPoll === 'object' ? c.lastPoll : {};
    return c;
  }

  function saveConfig(c) { writeJ(CONFIG_KEY, c || emptyConfig()); }

  function storageKey(tip) { return STORAGE_BY_TIP[tip] || null; }

  function defaultIntervalMs(tip) {
    var t = String(tip || '');
    if (DEFAULT_INTERVAL_MS[t] != null) return DEFAULT_INTERVAL_MS[t];
    return 3600000;
  }

  function normalizeInterval(ms) {
    var n = Number(ms);
    if (!isFinite(n) || n < 300000) return null;
    var hit = INTERVAL_PRESETS.filter(function (p) { return p.ms === n; })[0];
    return hit ? hit.ms : Math.min(86400000, Math.round(n / 60000) * 60000);
  }

  function resolveIntervalMs(device) {
    if (!device) return 3600000;
    var c = getConfig();
    var id = device.id != null ? String(device.id) : '';
    var tip = device.tip || device.type || '';
    var ap = device.apiaryId != null ? String(device.apiaryId) : '';
    if (id && c.byDevice[id] != null) {
      var d0 = normalizeInterval(c.byDevice[id]);
      if (d0) return d0;
    }
    if (ap && c.byApiary[ap] && c.byApiary[ap][tip] != null) {
      var a0 = normalizeInterval(c.byApiary[ap][tip]);
      if (a0) return a0;
    }
    if (c.defaults[tip] != null) {
      var g0 = normalizeInterval(c.defaults[tip]);
      if (g0) return g0;
    }
    return defaultIntervalMs(tip);
  }

  function setDeviceInterval(deviceId, ms) {
    var iv = normalizeInterval(ms);
    if (!deviceId || !iv) return false;
    var c = getConfig();
    c.byDevice[String(deviceId)] = iv;
    saveConfig(c);
    return true;
  }

  function setApiaryInterval(apiaryId, tip, ms) {
    var iv = normalizeInterval(ms);
    if (!apiaryId || !tip || !iv) return false;
    var c = getConfig();
    var ap = String(apiaryId);
    c.byApiary[ap] = c.byApiary[ap] || {};
    c.byApiary[ap][String(tip)] = iv;
    saveConfig(c);
    return true;
  }

  function intervalLabel(ms) {
    var p = INTERVAL_PRESETS.filter(function (x) { return x.ms === ms; })[0];
    if (p) return p.label;
    if (ms < 3600000) return Math.round(ms / 60000) + ' dk';
    if (ms < 86400000) return Math.round(ms / 3600000) + ' saat';
    return Math.round(ms / 86400000) + ' gün';
  }

  function retentionCutoffIso() {
    return new Date(Date.now() - RETENTION_DAYS * MS_DAY).toISOString().slice(0, 16);
  }

  function maxPointsForInterval(ms) {
    var iv = Number(ms) || 3600000;
    return Math.ceil((RETENTION_DAYS * MS_DAY) / iv);
  }

  function readStore(tip) {
    var key = storageKey(tip);
    if (!key) return [];
    var arr = readJ(key, []);
    return Array.isArray(arr) ? arr : [];
  }

  function writeStore(tip, arr) {
    var key = storageKey(tip);
    if (!key) return;
    writeJ(key, arr);
  }

  function pruneList(list, tip) {
    var cut = retentionCutoffIso();
    var out = (list || []).filter(function (x) {
      if (!x || !x.at) return false;
      return String(x.at).slice(0, 16) >= cut;
    });
    out.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    return out;
  }

  function pruneTip(tip) {
    var key = storageKey(tip);
    if (!key) return 0;
    var before = readStore(tip);
    var after = pruneList(before, tip);
    if (after.length !== before.length) writeStore(tip, after);
    return before.length - after.length;
  }

  function pruneAll() {
    var n = 0;
    POLLABLE_TIPS.forEach(function (t) { n += pruneTip(t); });
    return n;
  }

  function appendReading(rec) {
    if (!rec || !rec.type || !rec.hiveId || !rec.at) return null;
    var tip = rec.type;
    var key = storageKey(tip);
    if (!key) return null;
    var list = pruneList(readStore(tip), tip);
    var dup = list.some(function (x) {
      return Number(x.hiveId) === Number(rec.hiveId) && String(x.deviceId || '') === String(rec.deviceId || '') && x.at === rec.at;
    });
    if (dup) return null;
    var row = {
      hiveId: Number(rec.hiveId),
      deviceId: rec.deviceId != null ? String(rec.deviceId) : undefined,
      at: String(rec.at).slice(0, 16),
      type: tip
    };
    if (tip === 'tarti' && rec.kg != null) row.kg = Math.round(Number(rec.kg) * 100) / 100;
    if (tip === 'isi_nem') {
      if (rec.tempC != null) row.tempC = Math.round(Number(rec.tempC) * 10) / 10;
      if (rec.rh != null) row.rh = Math.round(Number(rec.rh));
    }
    if (tip === 'ses' && rec.level != null) row.level = Math.round(Number(rec.level) * 10) / 10;
    if (tip === 'titresim' && rec.level != null) row.level = Math.round(Number(rec.level) * 10) / 10;
    if (tip === 'ir' && rec.count != null) row.count = Math.round(Number(rec.count));
    if (rec.demo) row.demo = true;
    list.push(row);
    list = pruneList(list, tip);
    writeStore(tip, list);
    try {
      global.dispatchEvent(new CustomEvent('superari:sensor-reading', { detail: { tip: tip, row: row } }));
    } catch (e) { /* ignore */ }
    return row;
  }

  function lastReading(tip, hiveId, deviceId) {
    var list = readStore(tip).filter(function (x) {
      if (Number(x.hiveId) !== Number(hiveId)) return false;
      if (deviceId != null && String(x.deviceId || '') !== String(deviceId)) return false;
      return true;
    });
    return list.length ? list[list.length - 1] : null;
  }

  function isDue(device, nowMs) {
    if (!device || POLLABLE_TIPS.indexOf(device.tip) < 0) return false;
    if (device.status !== 'bagli') return false;
    var c = getConfig();
    var last = c.lastPoll[String(device.id)] || 0;
    var iv = resolveIntervalMs(device);
    return !last || (nowMs - last) >= iv;
  }

  function markPolled(deviceId, nowMs) {
    var c = getConfig();
    c.lastPoll[String(deviceId)] = nowMs;
    saveConfig(c);
  }

  function simulateDemo(device) {
    var D = global.SuperAriDemo;
    var tip = device.tip;
    var hiveId = device.hiveId;
    if (hiveId == null) return null;
    var h = D && D.hiveById ? D.hiveById(hiveId) : null;
    var at = nowLocalIso();
    if (tip === 'tarti') {
      var w = h && Number(h.weightKg) > 0 ? Number(h.weightKg) : 35;
      var wob = Math.sin(Date.now() / 3600000 + Number(hiveId)) * 0.35;
      return appendReading({ type: 'tarti', hiveId: hiveId, deviceId: device.id, at: at, kg: Math.round((w + wob) * 10) / 10, demo: true });
    }
    if (tip === 'isi_nem') {
      var base = 34.5 - (h && h.healthScore != null ? (100 - Number(h.healthScore)) / 25 : 0);
      return appendReading({ type: 'isi_nem', hiveId: hiveId, deviceId: device.id, at: at, tempC: Math.round((base + Math.sin(Date.now() / 7200000) * 0.4) * 10) / 10, rh: Math.round(52 + (h && h.deltaKg ? Number(h.deltaKg) * 2 : 0)), demo: true });
    }
    if (tip === 'ses') {
      return appendReading({ type: 'ses', hiveId: hiveId, deviceId: device.id, at: at, level: Math.round((0.35 + Math.random() * 0.25) * 100) / 100, demo: true });
    }
    if (tip === 'titresim') {
      return appendReading({ type: 'titresim', hiveId: hiveId, deviceId: device.id, at: at, level: Math.round((0.2 + Math.random() * 0.15) * 100) / 100, demo: true });
    }
    if (tip === 'ir') {
      var prev = lastReading('ir', hiveId, device.id);
      var cnt = prev && prev.count != null ? Number(prev.count) : 40 + (Number(hiveId) % 20);
      return appendReading({ type: 'ir', hiveId: hiveId, deviceId: device.id, at: at, count: cnt + Math.floor(Math.random() * 8), demo: true });
    }
    return null;
  }

  function pollDevice(device) {
    if (!device) return null;
    var nowMs = Date.now();
    if (!isDue(device, nowMs)) return null;
    var row = null;
    if (device.source === 'demo' || !isLive()) row = simulateDemo(device);
    else pruneTip(device.tip); /* canlı: yalnız saklama; okuma entegrasyon push eder */
    markPolled(device.id, nowMs);
    return row;
  }

  function listDueDevices() {
    var Dev = global.SuperAriDevices;
    if (!Dev || !Dev.listDevices) return [];
    var nowMs = Date.now();
    var list = [];
    try { list = Dev.listDevices(); } catch (e) { list = []; }
    return list.filter(function (d) { return isDue(d, nowMs); });
  }

  function tick() {
    pruneAll();
    var polled = 0;
    listDueDevices().forEach(function (d) {
      if (pollDevice(d)) polled += 1;
    });
    return polled;
  }

  var timer = null;
  function startScheduler() {
    if (timer != null) return;
    tick();
    timer = global.setInterval(tick, TICK_MS);
    try {
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.visibilityState === 'visible') tick();
      });
    } catch (e) { /* ignore */ }
    registerPeriodicSync();
  }

  function registerPeriodicSync() {
    if (!('serviceWorker' in global.navigator)) return;
    global.navigator.serviceWorker.ready.then(function (reg) {
      if (!reg || !reg.periodicSync) return;
      return reg.periodicSync.register(SW_TAG, { minInterval: 3600000 }).catch(function () { /* ignore */ });
    }).catch(function () { /* ignore */ });
  }

  function onSwMessage(ev) {
    if (!ev || !ev.data) return;
    if (ev.data.type === 'sensor-poll') tick();
  }

  function mountSwListener() {
    try {
      if ('serviceWorker' in global.navigator) {
        global.navigator.serviceWorker.addEventListener('message', onSwMessage);
      }
    } catch (e) { /* ignore */ }
  }

  function presetsForTip(tip) {
    var base = [3600000, 14400000, 43200000, 86400000];
    if (tip === 'isi_nem' || tip === 'titresim') base.unshift(tip === 'isi_nem' ? 900000 : 1800000);
    return INTERVAL_PRESETS.filter(function (p) { return base.indexOf(p.ms) >= 0; });
  }

  function selectHtml(device) {
    var iv = resolveIntervalMs(device);
    var opts = presetsForTip(device.tip).map(function (p) {
      return '<option value="' + p.ms + '"' + (p.ms === iv ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');
    return '<label class="poll-meta" data-poll-wrap><span>Ölçüm sıklığı</span> <select data-poll-device="' + String(device.id).replace(/"/g, '&quot;') + '" data-poll-tip="' + String(device.tip).replace(/"/g, '&quot;') + '">' + opts + '</select> · <span class="poll-ret">Veri saklama: 6 ay</span></label>';
  }

  function bindPollSelects(root) {
    var el = root || global.document;
    if (!el || !el.querySelectorAll) return;
    el.querySelectorAll('select[data-poll-device]').forEach(function (sel) {
      if (sel.__saPollBound) return;
      sel.__saPollBound = true;
      sel.addEventListener('click', function (e) { e.stopPropagation(); });
      sel.addEventListener('change', function (e) {
        e.stopPropagation();
        setDeviceInterval(sel.getAttribute('data-poll-device'), Number(sel.value));
      });
    });
  }

  global.SuperAriSensorPolling = {
    CONFIG_KEY: CONFIG_KEY,
    RETENTION_DAYS: RETENTION_DAYS,
    STORAGE_BY_TIP: STORAGE_BY_TIP,
    DEFAULT_INTERVAL_MS: DEFAULT_INTERVAL_MS,
    INTERVAL_PRESETS: INTERVAL_PRESETS,
    SW_TAG: SW_TAG,
    storageKey: storageKey,
    getConfig: getConfig,
    saveConfig: saveConfig,
    defaultIntervalMs: defaultIntervalMs,
    resolveIntervalMs: resolveIntervalMs,
    setDeviceInterval: setDeviceInterval,
    setApiaryInterval: setApiaryInterval,
    intervalLabel: intervalLabel,
    maxPointsForInterval: maxPointsForInterval,
    retentionCutoffIso: retentionCutoffIso,
    readStore: readStore,
    pruneAll: pruneAll,
    pruneTip: pruneTip,
    appendReading: appendReading,
    pollDevice: pollDevice,
    tick: tick,
    startScheduler: startScheduler,
    selectHtml: selectHtml,
    bindPollSelects: bindPollSelects,
    presetsForTip: presetsForTip
  };

  mountSwListener();
  if (typeof global.document !== 'undefined') {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', startScheduler);
    } else {
      startScheduler();
    }
  }
})(typeof window !== 'undefined' ? window : this);
