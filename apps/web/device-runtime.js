/**
 * SuperAriDevices — Demo | Canlı çalışma modu + cihaz durumları.
 *
 * Ayrım (sıkı):
 *  - demo  → yalnızca sabit DEMO_SEED (asla superari.devices / discovered / user apiary-hive LS)
 *  - live  → yalnızca superari.devices + superari.discovered
 *
 * Durumlar: Yok · Bağlı · Kopuk · Arızalı
 * Tak–çalıştır: varsa çalışır; yoksa Yok.
 */
(function (global) {
  'use strict';

  var MODE_KEY = 'superari.workMode';
  var DEVICES_KEY = 'superari.devices';
  var DISCOVERED_KEY = 'superari.discovered';
  var DEFAULT_BATTERY_LOW_PCT = 20;
  /** Demo modda pil simülasyonu (oturum içi; DEMO_SEED dosyası değişmez). */
  var DEMO_PIL_SS = 'superari.demo.pil.v1';
  var demoBatteryPatch = (function () { try { return JSON.parse(global.sessionStorage.getItem(DEMO_PIL_SS) || '{}') || {}; } catch (e) { return {}; } })(); /* k161: oturum boyunca yenilemede korunur */

  var STATUS = {
    yok: 'yok',
    bagli: 'bagli',
    kopuk: 'kopuk',
    arizali: 'arizali'
  };

  var TIP_LABELS = {
    tarti: 'Tartı',
    isi_nem: 'Sıcaklık/Nem',
    ir: 'IR',
    ses: 'Ses (mikrofon)',
    titresim: 'Titreşim (ivmeölçer)',
    /* eski birleşik tip → Ses olarak göster (geriye uyum) */
    ses_titresim: 'Ses (mikrofon)',
    gateway: 'Gateway (Wi‑Fi / hücresel)',
    kamera_arilik: 'Arılık kamerası',
    kamera_merkez: 'Arılık kamerası',
    kamera_kovan: 'Kovan kamerası',
    role_hub: 'Wireless röle / hub',
    aku_kovan: 'Kovan bataryası',
    aku_merkez: 'Gateway bataryası',
    dis_isi_nem: 'Merkezi ısı / nem'
  };

  /**
   * Sabit demo cihaz paketi — kullanıcı localStorage ile karışmaz.
   * En az bir Bağlı, bir Kopuk, bir Arızalı; Yok yoklukla ima edilir.
   */
  var DEMO_SEED = [
    {
      id: 'demo-gw-a1',
      tip: 'gateway',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: null,
      hiveName: null,
      status: 'bagli',
      battery: null,
      lastMins: 1,
      channels: ['Gateway']
    },
    {
      id: 'demo-cam-a1',
      tip: 'kamera_arilik',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: null,
      hiveName: null,
      status: 'bagli',
      battery: 88,
      lastMins: 2,
      channels: ['Arılık kamerası']
    },
    {
      id: 'demo-tarti-101',
      tip: 'tarti',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 101,
      hiveName: 'Kovan 101',
      status: 'bagli',
      battery: 72,
      lastMins: 4,
      channels: ['Tartı']
    },
    {
      id: 'demo-isi-101',
      tip: 'isi_nem',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 101,
      hiveName: 'Kovan 101',
      status: 'bagli',
      battery: 68,
      lastMins: 3,
      channels: ['Sıcaklık/Nem']
    },
    {
      id: 'demo-isi-118-kopuk',
      tip: 'isi_nem',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 118,
      hiveName: 'Kovan 118',
      status: 'kopuk',
      battery: 41,
      lastMins: 210,
      channels: ['Sıcaklık/Nem']
    },
    {
      id: 'demo-tarti-211-arizali',
      tip: 'tarti',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: 211,
      hiveName: 'Kovan 211',
      status: 'arizali',
      battery: 4,
      lastMins: 15,
      channels: ['Tartı']
    },
    {
      id: 'demo-cam-a2-kopuk',
      tip: 'kamera_arilik',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: null,
      hiveName: null,
      status: 'kopuk',
      battery: 52,
      lastMins: 320,
      channels: ['Arılık kamerası']
    },
    {
      id: 'demo-cam-kovan-118-arizali',
      tip: 'kamera_kovan',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 118,
      hiveName: 'Kovan 118',
      status: 'arizali',
      battery: 2,
      lastMins: 95,
      channels: ['Kovan kamerası']
    },
    {
      id: 'demo-ir-102',
      tip: 'ir',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 102,
      hiveName: 'Kovan 102',
      status: 'bagli',
      battery: 77,
      lastMins: 6,
      channels: ['IR']
    },
    {
      id: 'demo-ses-204',
      tip: 'ses',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      hiveId: 204,
      hiveName: 'Kovan 204',
      status: 'bagli',
      battery: 61,
      lastMins: 8,
      channels: ['Ses']
    },
    {
      id: 'demo-titresim-102',
      tip: 'titresim',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      hiveId: 102,
      hiveName: 'Kovan 102',
      status: 'bagli',
      battery: 74,
      lastMins: 5,
      channels: ['Titreşim']
    }
  ];

  function getMode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m === 'live' || m === 'demo') return m;
    } catch (e) { /* ignore */ }
    return 'demo';
  }

  function setMode(mode) {
    var next = mode === 'live' ? 'live' : 'demo';
    try { localStorage.setItem(MODE_KEY, next); } catch (e) { /* ignore */ }
    /* Same-tab Ana refresh: storage events don't fire here; ping + BroadcastChannel do */
    try { localStorage.setItem(MODE_KEY + '.ping', String(Date.now()) + ':' + next); } catch (ePing) { /* ignore */ }
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('superari-workMode').postMessage({ mode: next });
      }
    } catch (eBc) { /* ignore */ }
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-work-mode', next);
        syncDemoBanner();
      }
    } catch (e2) { /* ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('superari:workMode', { detail: { mode: next } }));
    } catch (e3) { /* ignore */ }
    return next;
  }

  function isDemo() { return getMode() === 'demo'; }
  function isLive() { return getMode() === 'live'; }

  function statusLabel(s) {
    var map = { yok: 'Veri yok', bagli: 'Bağlı', kopuk: 'Kopuk', arizali: 'Arızalı', devre_disi: 'Devre dışı' };
    return map[s] || map.yok;
  }

  function statusTone(s) {
    if (s === STATUS.bagli) return 'status-bagli';
    if (s === STATUS.kopuk) return 'status-kopuk';
    if (s === STATUS.arizali) return 'status-arizali';
    if (s === 'devre_disi') return 'status-yok status-devredisi';
    return 'status-yok';
  }

  /** Ana tile tone: green/tan/red */
  function statusAnaTone(s) {
    if (s === STATUS.bagli) return 'green';
    if (s === STATUS.kopuk) return 'tan';
    if (s === STATUS.arizali) return 'red';
    return 'tan';
  }

  function tipLabel(tip) {
    return TIP_LABELS[tip] || tip || 'Cihaz';
  }
  /** Eski ses_titresim kayıtları Ses döşemesinde görünür; yeni kod ses | titresim yazar. */
  function tipFamily(tip) {
    var t = String(tip || '');
    if (t === 'ses_titresim' || t === 'ses') return 'ses';
    if (t === 'titresim') return 'titresim';
    return t;
  }

  function isCameraTip(tip) {
    var t = String(tip || '').toLowerCase();
    return t === 'kamera_arilik' || t === 'kamera_merkez' || t === 'kamera_kovan' ||
      t === 'merkezi_kamera' || t === 'kovan_kamerasi' ||
      t.indexOf('kamera') !== -1;
  }

  function isApiaryTip(tip) {
    return tip === 'kamera_arilik' || tip === 'kamera_merkez' ||
      tip === 'gateway' || tip === 'role_hub' || tip === 'aku_merkez' || tip === 'dis_isi_nem';
  }

  function readJsonArray(key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function writeJsonArray(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr || [])); return true; } catch (e) { return false; }
  }

  function clampBatteryPct(n) {
    var x = Number(n);
    if (!isFinite(x)) return null;
    return Math.max(0, Math.min(100, Math.round(x)));
  }

  function getLowBatteryThreshold(apiaryId) {
    var P = global.SuperAriSensorPolling;
    if (P && typeof P.getBatteryLowPct === 'function') {
      return P.getBatteryLowPct(apiaryId);
    }
    try { var E = global.SuperAriEsikler && global.SuperAriEsikler.get(); if (E && E.uyari && E.uyari.dusukPilYuzde > 0) return clampBatteryPct(E.uyari.dusukPilYuzde); } catch (e) { /* ignore */ }
    return DEFAULT_BATTERY_LOW_PCT;
  }

  function attachBatteryFields(out, raw, apiaryId) {
    var src = raw || {};
    var pct = src.batteryPct != null ? src.batteryPct : (src.battery != null ? src.battery : null);
    out.batteryPct = pct == null ? null : clampBatteryPct(pct);
    out.battery = out.batteryPct;
    out.batteryV = src.batteryV != null && isFinite(Number(src.batteryV))
      ? Math.round(Number(src.batteryV) * 100) / 100 : null;
    out.batteryAt = src.batteryAt != null ? String(src.batteryAt).slice(0, 16) : null;
    var thr = getLowBatteryThreshold(apiaryId != null ? apiaryId : out.apiaryId);
    out.batteryLow = pilAcik(apiaryId != null ? apiaryId : out.apiaryId) && out.batteryPct != null && out.batteryPct <= thr;
    return out;
  }

  /* koloni-220: Pil düşüklüğü kuralı yönetici panelinden kapatılabilir (genel / kullanıcı / arılık) */
  function pilAcik(aid) { try { var C = global.SuperAriDemo && global.SuperAriDemo.colony; return !(C && C.kuralAcik) || C.kuralAcik('pil', aid); } catch (e) { return true; } }

  function isBatteryLow(device) {
    if (!device || device.disabled || isDisabled(device.id) || !pilAcik(device.apiaryId)) return false;
    if (!device.batteryAt && device.source !== 'demo' && device.batteryPct == null) return false;
    /* k160: tahmine dayalı — kalan gün ≤ eşik (Orta/Yüksek, panelde). Hesaplanıyorsa yalnız gerçek okunan yüzde eşiği. */
    try { var P2 = global.SuperAriPlan2; if (P2 && P2.bataryaPlan) { var bp = P2.bataryaPlan(device); if (bp.durum === 'tamam') return !!bp.severity; if (bp.durum === 'veri_yok') return false; } } catch (eP) { /* ignore */ }
    if (device.batteryLow === true) return true;
    var pct = device.batteryPct != null ? device.batteryPct : device.battery;
    if (pct == null) return false;
    return Number(pct) <= getLowBatteryThreshold(device.apiaryId);
  }

  function hasBatterySensor(tip) {
    return tip !== 'gateway';
  }

  function patchStoredDevice(id, patch, source) {
    if (!id || !patch) return false;
    var key = source === 'discovered' ? DISCOVERED_KEY : DEVICES_KEY;
    var list = readJsonArray(key);
    var found = false;
    list = list.map(function (d) {
      if (!d || String(d.id) !== String(id)) return d;
      found = true;
      return Object.assign({}, d, patch);
    });
    if (!found) return false;
    return writeJsonArray(key, list);
  }

  /** Pil okuması sonrası cihaz kaydını güncelle (canlı LS / demo oturum). */
  function setDeviceBattery(deviceId, fields, meta) {
    if (!deviceId || !fields) return false;
    var pct = fields.batteryPct != null ? fields.batteryPct : fields.battery;
    var patch = {
      batteryPct: pct == null ? null : clampBatteryPct(pct),
      battery: pct == null ? null : clampBatteryPct(pct),
      batteryV: fields.batteryV != null ? Math.round(Number(fields.batteryV) * 100) / 100 : undefined,
      batteryAt: fields.batteryAt != null ? String(fields.batteryAt).slice(0, 16) : undefined
    };
    Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete patch[k]; });
    if (isDemo()) {
      demoBatteryPatch[String(deviceId)] = Object.assign({}, demoBatteryPatch[String(deviceId)] || {}, patch);
      try { global.sessionStorage.setItem(DEMO_PIL_SS, JSON.stringify(demoBatteryPatch)); } catch (e) { /* ignore */ }
      try {
        global.dispatchEvent(new CustomEvent('superari:device-battery', { detail: { deviceId: deviceId, patch: patch } }));
      } catch (e) { /* ignore */ }
      return true;
    }
    var src = meta && meta.source === 'discovered' ? 'discovered' : 'user';
    var ok = patchStoredDevice(deviceId, patch, src);
    if (!ok) patchStoredDevice(deviceId, patch, src === 'discovered' ? 'user' : 'discovered');
    try {
      global.dispatchEvent(new CustomEvent('superari:device-battery', { detail: { deviceId: deviceId, patch: patch } }));
    } catch (e2) { /* ignore */ }
    return true;
  }

  function mergeDemoBattery(raw) {
    var p = demoBatteryPatch[String(raw.id)];
    return p ? Object.assign({}, raw, p) : raw;
  }

  function resolveLiveNames(row) {
    var D = global.SuperAriDemo;
    var hiveId = row.hiveId != null ? row.hiveId : null;
    var apiaryId = row.apiaryId != null ? row.apiaryId : null;
    var hive = null;
    var ap = null;
    if (hiveId != null && D && D.hiveById) {
      hive = D.hiveById(hiveId);
      if (hive && apiaryId == null) apiaryId = hive.apiaryId;
    }
    if (apiaryId != null && D && D.apiaryById) {
      ap = D.apiaryById(apiaryId);
    }
    return {
      hiveId: hiveId,
      hiveName: hive
        ? (hive.name || ('Kovan ' + hive.id))
        : (hiveId != null ? ('Kovan ' + hiveId) : null),
      apiaryId: apiaryId != null ? String(apiaryId) : 'none',
      apiaryName: ap ? (ap.name || ap.place || 'Arılık') : (apiaryId ? String(apiaryId) : '—')
    };
  }

  function normalizeLive(raw, source) {
    if (!raw) return null;
    var tip = raw.tip || raw.type || '';
    var names = resolveLiveNames(raw);
    /* k160: gerçek okuma (zaman damgası) yoksa «Bağlı» denmez — durum «yok» (Veri yok) */
    var hasReading = raw.lastMins != null || !!raw.at || !!raw.batteryAt || !!raw.lastAt;
    var status = raw.status || (hasReading ? STATUS.bagli : STATUS.yok);
    if (status !== STATUS.bagli && status !== STATUS.kopuk &&
        status !== STATUS.arizali && status !== STATUS.yok) {
      status = hasReading ? STATUS.bagli : STATUS.yok;
    }
    if (status === STATUS.bagli && !hasReading) status = STATUS.yok;
    var kind = isCameraTip(tip) ? 'kamera' : 'paket';
    var out = {
      id: raw.id || (source + '-' + tip + '-' + (names.hiveId || names.apiaryId || 'x')),
      tip: tip,
      typeLabel: tipLabel(tip),
      kind: kind,
      source: source || 'user',
      status: status,
      hiveId: names.hiveId,
      hiveName: names.hiveName || (kind === 'kamera' ? tipLabel(tip) : 'Cihaz'),
      apiaryId: names.apiaryId,
      apiaryName: names.apiaryName,
      lastMins: raw.lastMins != null ? raw.lastMins : null,
      channels: raw.channels || [tipLabel(tip)],
      at: raw.at || null
    };
    /* k160: pil yalnız gerçek okumadan (batteryAt) — tarihsiz pil değeri gösterilmez */
    return attachBatteryFields(out, raw.batteryAt || raw.at ? raw : Object.assign({}, raw, { battery: null, batteryPct: null }), out.apiaryId);
  }

  function normalizeDemo(raw) {
    /* k160: örnek pakette uydurma durum/pil yok — gerçek okuma gelmediği için «Veri yok», pil boş, düşük pil uyarısı üretilmez */
    var merged = mergeDemoBattery(Object.assign({}, raw, { status: STATUS.yok, lastMins: null, battery: null, batteryPct: null, batteryV: null, batteryAt: null }));
    if (merged.batteryAt || merged.batteryPct != null) merged.status = STATUS.bagli; /* gerçek okuma (sorgu/okuma kaydı) geldiyse */
    var tip = merged.tip || '';
    var kind = isCameraTip(tip) ? 'kamera' : 'paket';
    var out = {
      id: merged.id,
      tip: tip,
      typeLabel: tipLabel(tip),
      kind: kind,
      source: 'demo',
      status: merged.status,
      hiveId: merged.hiveId,
      hiveName: merged.hiveName || (kind === 'kamera' ? tipLabel(tip) : 'Cihaz'),
      apiaryId: String(merged.apiaryId || 'none'),
      apiaryName: merged.apiaryName || 'Arılık',
      lastMins: merged.lastMins != null ? merged.lastMins : null,
      channels: merged.channels || [tipLabel(tip)],
      at: null
    };
    return attachBatteryFields(out, merged, out.apiaryId);
  }

  /** Demo: yalnızca DEMO_SEED — kullanıcı kaydı okunmaz. */
  function demoList() {
    return DEMO_SEED.map(normalizeDemo);
  }

  /** Live: yalnızca registry + discovered — demo seed karışmaz. */
  function liveList() {
    var byId = {};
    readJsonArray(DEVICES_KEY).forEach(function (d) {
      var n = normalizeLive(d, 'user');
      if (n) {
        if (!d.status) n.status = STATUS.bagli;
        byId[n.id] = n;
      }
    });
    readJsonArray(DISCOVERED_KEY).forEach(function (d) {
      var n = normalizeLive(d, 'discovered');
      if (n) {
        if (!d.status) n.status = STATUS.bagli;
        byId[n.id] = n;
      }
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  /* k189: elle «Cihaz ekle» — Canlı: superari.devices; Demo: ayrı anahtar (Demo kaydı Canlı'ya karışmaz). Okuma gelene kadar durum «Veri yok». */
  var DEMO_USER_KEY = 'superari.devices.demoUser';
  function addDevice(o) {
    o = o || {};
    var tip = String(o.tip || '').trim();
    if (!tip || !/^[a-z_]{2,32}$/.test(tip)) throw new Error('Cihaz türü seçin');
    var hiveId = o.hiveId != null && o.hiveId !== '' ? Number(o.hiveId) : null;
    var apiaryId = o.apiaryId != null && o.apiaryId !== '' ? String(o.apiaryId) : null;
    if (apiaryId == null && hiveId == null) throw new Error('Arılık seçin');
    var row = { id: 'u-' + tip + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), tip: tip, hiveId: hiveId, apiaryId: apiaryId, status: STATUS.yok, addedAt: new Date().toISOString(), manual: true };
    var nm = String(o.name || '').trim().slice(0, 60); if (nm) row.name = nm;
    /* k192: sıcaklık/nem sensörünün yeri — kuluçka sıcaklığı kuralı yalnız 'kulucka' için çalışır */
    if (tip === 'isi_nem' && (o.yer === 'kulucka' || o.yer === 'ballik')) row.yer = o.yer;
    var key = isDemo() ? DEMO_USER_KEY : DEVICES_KEY;
    var l = readJsonArray(key); l.push(row);
    if (!writeJsonArray(key, l)) throw new Error('Kaydedilemedi (depolama dolu/kapalı)');
    try { global.dispatchEvent(new CustomEvent('superari-devices-changed')); } catch (e) { /* ignore */ }
    return row;
  }
  function removeUserDevice(id) {
    [DEVICES_KEY, DEMO_USER_KEY].forEach(function (k) { var l = readJsonArray(k); var n = l.filter(function (d) { return d && d.id !== id; }); if (n.length !== l.length) writeJsonArray(k, n); });
  }
  function demoUserList() {
    return readJsonArray(DEMO_USER_KEY).map(function (d) { var n = normalizeLive(d, 'user'); if (n) { n.status = STATUS.yok; n.demo = true; } return n; }).filter(Boolean);
  }
  /* koloni-220: Kovan bazında cihaz «Devre dışı bırak» — kullanıcı (düzenleme yetkisi; Sahip her zaman). Devre dışı cihaz: uyarı/push/rozet/görev yok, okumaları hesaba girmez. Kayıt: localStorage (cihaz kaydıyla aynı yer). */
  var DIS_KEY = 'superari.devices.disabled';
  function disMap() { try { var o = JSON.parse(localStorage.getItem(DIS_KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
  function isDisabled(id) { return id != null && !!disMap()[String(id)]; }
  function canToggle() { try { var Y = global.SuperAriYetki; return !Y || Y.rol() === 'owner' || !!Y.izin('duzen'); } catch (e) { return true; } }
  function setDisabled(id, on, meta) {
    if (id == null) return false;
    if (!canToggle()) throw new Error('Bu işlem için arılık düzenleme yetkisi gerekiyor');
    var m = disMap(), k = String(id);
    if (on) m[k] = Object.assign({ at: new Date().toISOString() }, meta || {}); else delete m[k];
    try { localStorage.setItem(DIS_KEY, JSON.stringify(m)); } catch (e) { return false; }
    try { global.dispatchEvent(new CustomEvent('superari-devices-changed', { detail: { id: k, disabled: !!on } })); } catch (e2) { /* ignore */ }
    ddBulutYaz(k, !!on, m[k] || meta || {});
    return true;
  }
  /* Bulut: public.cihaz_devre_disi — yönetici paneli görür/değiştirir; uygulama açılışta yöneticinin değişikliğini alır. Bulut yoksa yerel kayıt geçerli. */
  function ddClient() { var B = global.SuperAriBulut; if (!B || !B.client) return Promise.reject(new Error('bulut-yok')); return B.client().then(function (c) { return c.auth.getUser().then(function (u) { var us = u && u.data && u.data.user; if (!us) throw new Error('oturum-yok'); return { c: c, u: us }; }); }); }
  /* koloni-222: ekip genelinde — kayıt arılığın Sahibinin hesabında (sa_cihaz_dd_yaz: düzenleme yetkisi, Sahip her zaman). Ekip üyeleri okur; açılışta, odakta ve canlı (realtime) yenilenir. */
  var UUIDRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function ddBulutYaz(id, on, meta) {
    var d = null; try { d = (isDemo() ? demoList().concat(demoUserList()) : liveList()).filter(function (x) { return String(x.id) === String(id); })[0]; } catch (e) { d = null; }
    if (d && d.source === 'demo') return Promise.resolve(false);
    var ap = d && d.apiaryId != null && UUIDRE.test(String(d.apiaryId)) ? String(d.apiaryId) : (meta && UUIDRE.test(String(meta.apiaryId || '')) ? String(meta.apiaryId) : null);
    var hv = meta && meta.hiveId != null ? Number(meta.hiveId) : (d && d.hiveId != null ? Number(d.hiveId) : null);
    return ddClient().then(function (o) {
      return o.c.rpc('sa_cihaz_dd_yaz', { p_apiary: ap, p_device: String(id), p_on: !!on, p_kovan_id: hv, p_kovan_ad: d ? d.hiveName || null : null, p_tip: (meta && meta.tip) || (d && d.tip) || null, p_cihaz_ad: d ? (d.name || d.typeLabel || null) : null, p_arilik_ad: d ? d.apiaryName || null : null })
        .then(function (r) { if (r && r.error) throw r.error; ddTazele(); return ekibePush(o, String(id)); });
    }).then(function () { return true; }).catch(function () { return false; });
  }
  /** Değiştirenin az önce oluşan ekip bildirimlerini sunucuya ver → ekibe push (değiştiren hariç). */
  function ekibePush(o) {
    return o.c.from('ekip_bildirim').select('id').eq('kod', 'cihaz_devre_disi').eq('kim', o.u.id).gte('at', new Date(Date.now() - 120000).toISOString()).order('id', { ascending: false }).limit(5)
      .then(function (r) { var ids = (r && r.data || []).map(function (x) { return x.id; }); if (!ids.length) return;
        return o.c.auth.getSession().then(function (s) { var t = s && s.data && s.data.session && s.data.session.access_token; if (!t || !global.fetch) return;
          return global.fetch('/api/push-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'ekip_cihaz', ids: ids }) }); }); })
      .catch(function () { /* push olmasa da Uyarılar kartı gelir */ });
  }
  var EB_SON = 'superari.ekip.cihaz.son.v1';
  /** Ekipten gelen «cihaz devre dışı / tekrar etkin» bildirimleri → Uyarılar kartı (kendi değişikliğin hariç). */
  function ekipBildirimOku(o) {
    var son = null; try { son = global.localStorage.getItem(EB_SON); } catch (e) { son = null; }
    var q = o.c.from('ekip_bildirim').select('id,apiary_id,olay,baslik,metin,hive_ref,kim,at').eq('kod', 'cihaz_devre_disi').order('id', { ascending: true }).limit(50);
    q = son ? q.gt('id', Number(son)) : q.gte('at', new Date(Date.now() - 86400000).toISOString());
    return q.then(function (r) {
      var L = r && !r.error && Array.isArray(r.data) ? r.data : []; if (!L.length) return;
      var K = global.SuperAriKritik; if (!K || !K.ac) return; /* Uyarılar kartı olmayan sayfada okunmuş sayma */
      L.forEach(function (x) { if (x.kim !== o.u.id && K && K.ac) K.ac({ kod: 'cihaz_dd', anahtar: 'eb' + x.id, hiveId: x.hive_ref, apiaryId: x.apiary_id, baslik: x.baslik, metin: x.metin, ekibeGitme: true }); });
      try { global.localStorage.setItem(EB_SON, String(L[L.length - 1].id)); } catch (e2) { /* ignore */ }
    }).catch(function () { /* ignore */ });
  }
  function ddBulutOku() {
    return ddClient().then(function (o) {
      ekipBildirimOku(o); ddCanli(o);
      return o.c.from('cihaz_devre_disi').select('device_id,apiary_id,kovan_id,tip,devre_disi,updated_at,degistiren,degistiren_email');
    }).then(function (r) {
      if (!r || r.error || !Array.isArray(r.data)) return false;
      var m = disMap(), once = JSON.stringify(m), son = {};
      r.data.slice().sort(function (a, b) { return a.updated_at < b.updated_at ? -1 : 1; }).forEach(function (x) { son[String(x.device_id)] = x; });
      Object.keys(son).forEach(function (k) { var x = son[k]; if (x.devre_disi) m[k] = Object.assign({}, m[k] || {}, { at: x.updated_at, hiveId: x.kovan_id, tip: x.tip, apiaryId: x.apiary_id, by: x.degistiren, byEmail: x.degistiren_email, bulut: true }); else delete m[k]; });
      /* bulutta artık olmayan, daha önce buluttan gelmiş kayıt → kaldır (ekip başka telefondan açtı/sildi) */
      Object.keys(m).forEach(function (k) { if (m[k] && m[k].bulut && !son[k]) delete m[k]; });
      if (JSON.stringify(m) !== once) { try { localStorage.setItem(DIS_KEY, JSON.stringify(m)); } catch (e) { return false; } try { global.dispatchEvent(new CustomEvent('superari-devices-changed', { detail: { bulut: true } })); } catch (e2) { /* ignore */ } }
      return true;
    }).catch(function () { return false; });
  }
  var ddKanal = null, ddZam = 0;
  function ddCanli(o) {
    if (ddKanal || !o.c.channel) return;
    try {
      ddKanal = o.c.channel('cihaz-dd-' + o.u.id.slice(0, 8))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cihaz_devre_disi' }, function () { ddTazele(); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ekip_bildirim' }, function () { ddTazele(); })
        .subscribe();
    } catch (e) { ddKanal = null; }
  }
  function ddTazele() { if (ddZam) return; ddZam = global.setTimeout(function () { ddZam = 0; ddBulutOku(); }, 400); }
  if (global.setTimeout && global.document) {
    global.setTimeout(ddBulutOku, 900);
    global.document.addEventListener('visibilitychange', function () { if (global.document.visibilityState === 'visible') ddTazele(); });
    if (global.addEventListener) global.addEventListener('focus', ddTazele);
    if (global.setInterval) global.setInterval(function () { if (!global.document.hidden) ddBulutOku(); }, 120000);
  }
  /** Okuma bu kovanın bu türdeki devre dışı cihazından mı? (hesaplardan çıkarılır) */
  function okumaKapali(hiveId, tip) {
    var m = disMap(), ks = Object.keys(m); if (!ks.length || hiveId == null) return false;
    var t = String(tip || ''); if (t === 'isi' || t === 'nem') t = 'isi_nem';
    return ks.some(function (k) { var x = m[k] || {}; return x.hiveId != null && Number(x.hiveId) === Number(hiveId) && String(x.tip) === t; });
  }
  function disRaw() { try { return localStorage.getItem(DIS_KEY) || ''; } catch (e) { return ''; } }
  function markDisabled(list) {
    var m = disMap();
    return list.map(function (d) { if (d && m[String(d.id)]) { d.disabled = true; d.prevStatus = d.status; d.status = 'devre_disi'; d.batteryLow = false; } return d; });
  }
  function toggleHtml(d) {
    if (!d) return '';
    var off = !!d.disabled, can = canToggle();
    return '<div class="dd-box" data-dd-id="' + String(d.id).replace(/"/g, '') + '" data-dd-hive="' + (d.hiveId != null ? d.hiveId : '') + '" data-dd-tip="' + String(d.tip || '') + '" style="margin-top:6px;min-height:34px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="ks-btn dd-btn" data-dd-toggle="1"' + (can ? '' : ' disabled title="Düzenleme yetkin yok"') + ' style="min-height:32px;padding:4px 10px;font-weight:800">' + (off ? 'Tekrar etkinleştir' : 'Devre dışı bırak') + '</button>' +
      '<span class="dd-note meta" style="font-size:12px">' + (off ? 'Devre dışı · uyarı vermez, okumaları hesaba girmez' : (can ? '' : 'Yalnız düzenleme yetkisi olanlar')) + '</span></div>';
  }
  if (global.document && !global.__saDdBound) {
    global.__saDdBound = true;
    global.document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-dd-toggle]') : null; if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var box = b.closest('.dd-box'), id = box.getAttribute('data-dd-id'), off = isDisabled(id);
      if (!off && !global.confirm('Bu cihaz devre dışı bırakılsın mı?\nUyarı, bildirim ve görev üretmez; okumaları hesaplara girmez. İstediğinde tek dokunuşla geri açabilirsin.')) return;
      try { setDisabled(id, !off, { hiveId: box.getAttribute('data-dd-hive') === '' ? null : Number(box.getAttribute('data-dd-hive')), tip: box.getAttribute('data-dd-tip') }); } catch (er) { global.alert(er.message); return; }
      var now = !off, card = box.closest('[data-dd-card]') || box.parentNode;
      b.textContent = now ? 'Tekrar etkinleştir' : 'Devre dışı bırak';
      box.querySelector('.dd-note').textContent = now ? 'Devre dışı · uyarı vermez, okumaları hesaba girmez' : 'Etkinleştirildi';
      if (card && card.classList) card.classList.toggle('dd-off', now);
      [].forEach.call(card.querySelectorAll('[data-dd-status]'), function (el) { if (now) { el.setAttribute('data-dd-prev', el.textContent); el.textContent = 'Devre dışı'; } else if (el.getAttribute('data-dd-prev') != null) el.textContent = el.getAttribute('data-dd-prev'); });
    }, true);
    try { var st = global.document.createElement('style'); st.textContent = '.dd-off{opacity:.62}.dd-off .dd-btn{opacity:1}.status-devredisi{background:#e5e7eb!important;color:#374151!important}'; (global.document.head || global.document.documentElement).appendChild(st); } catch (eS) { /* ignore */ }
  }

  function listDevices() {
    return markDisabled(isDemo() ? demoList().concat(demoUserList()) : liveList());
  }

  function cameraDevices() {
    return listDevices().filter(function (d) { return d && d.kind === 'kamera'; });
  }

  function summarizeList(list) {
    var counts = { yok: 0, bagli: 0, kopuk: 0, arizali: 0, devre_disi: 0, total: list.length };
    list.forEach(function (d) {
      var s = d.status || STATUS.yok;
      if (counts[s] != null) counts[s] += 1;
      else counts.yok += 1;
    });
    return counts;
  }

  function summarize() { return summarizeList(listDevices()); }
  function summarizeCameras() { return summarizeList(cameraDevices()); }

  function badgeFromSummary(s) {
    if (!s.total) return { text: 'Yok', tone: 'tan' };
    var text = isLive()
      ? String(s.bagli > 0 ? s.bagli : s.total)
      : String(s.total);
    var tone = 'green';
    if (s.arizali > 0) tone = 'red';
    else if (s.kopuk > 0) tone = 'tan';
    return { text: text, tone: tone };
  }

  function anaCihazBadge() { return badgeFromSummary(summarize()); }
  function anaKameraBadge() { return badgeFromSummary(summarizeCameras()); }

  /* —— Demo mod banner (Ana + anahtar sayfalar) —— */
  var BANNER_STYLE_ID = 'superari-demo-banner-style';
  var BANNER_ID = 'superari-demo-banner';

  function ensureBannerStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BANNER_STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = BANNER_STYLE_ID;
    st.textContent =
      '#' + BANNER_ID + '{' +
      'display:none;align-items:center;justify-content:center;' +
      'gap:6px;padding:6px 12px;margin:0;font-size:12px;font-weight:800;' +
      'letter-spacing:.02em;color:#5c4a2a;' +
      'background:linear-gradient(180deg,#fff6df 0%,#f5e6b8 100%);' +
      'border-bottom:1.5px solid #e0c56a;font-family:inherit;' +
      '}' +
      '#' + BANNER_ID + '{display:none!important}' +
      '#' + BANNER_ID + ' .demo-chip{' +
      'display:inline-block;padding:2px 10px;border-radius:999px;' +
      'border:1.5px solid #c9a84a;background:#fffaf0;color:#3d2e12;' +
      'font-size:11px;font-weight:800;' +
      '}' +
      '.status-pill.status-yok{background:#f1f3f5;color:#868e96;border-color:#ced4da}' +
      '.status-pill.status-bagli{background:#ebfbee;color:#2b8a3e;border-color:#8ce99a}' +
      '.status-pill.status-kopuk{background:#fff4e6;color:#e67700;border-color:#ffc078}' +
      '.status-pill.status-arizali{background:#fff5f5;color:#c92a2a;border-color:#ffa8a8}' +
      '.mode-banner{' +
      'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' +
      'padding:10px 12px;border-radius:12px;margin-bottom:12px;' +
      'border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#f5e6b8);' +
      'font-size:12px;font-weight:700;color:#5c4a2a;' +
      '}' +
      '.mode-banner.live{' +
      'border-color:#cfd8e3;background:#f7f8fa;color:#6b635a;' +
      '}' +
      '.mode-banner[hidden]{display:none}'; /* Canlı'da mod rozeti yok (yalnız Demo) */
    document.head.appendChild(st);
  }

  function syncDemoBanner() {
    if (typeof document === 'undefined') return;
    ensureBannerStyles();
    var mode = getMode();
    try { document.documentElement.setAttribute('data-work-mode', mode); } catch (e) {}
    /* Üst Demo şeridi yok — Ana’da Konumu sabitle butonu «Demo Modu» yazar */
    var el = document.getElementById(BANNER_ID);
    if (el && el.parentNode) {
      try { el.parentNode.removeChild(el); } catch (e2) {}
    }
  }

  function mount() {
    if (typeof document === 'undefined') return;
    function go() {
      try { document.documentElement.setAttribute('data-work-mode', getMode()); } catch (e) {}
      syncDemoBanner();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go);
    } else {
      go();
    }
  }

  global.SuperAriDevices = {
    MODE_KEY: MODE_KEY,
    DEVICES_KEY: DEVICES_KEY,
    DISCOVERED_KEY: DISCOVERED_KEY,
    STATUS: STATUS,
    TIP_LABELS: TIP_LABELS,
    DEMO_SEED: DEMO_SEED,
    DEMO_USER_KEY: DEMO_USER_KEY,
    addDevice: addDevice,
    removeUserDevice: removeUserDevice,
    getMode: getMode,
    setMode: setMode,
    isDemo: isDemo,
    isLive: isLive,
    statusLabel: statusLabel,
    statusTone: statusTone,
    statusAnaTone: statusAnaTone,
    tipLabel: tipLabel, tipFamily: tipFamily,
    isCameraTip: isCameraTip,
    isApiaryTip: isApiaryTip,
    listDevices: listDevices, isDisabled: isDisabled, setDisabled: setDisabled, okumaKapali: okumaKapali, canToggle: canToggle, ddBulutOku: ddBulutOku, toggleHtml: toggleHtml, disRaw: disRaw,
    cameraDevices: cameraDevices,
    summarize: summarize,
    summarizeCameras: summarizeCameras,
    anaCihazBadge: anaCihazBadge,
    anaKameraBadge: anaKameraBadge,
    syncDemoBanner: syncDemoBanner,
    ensureBannerStyles: ensureBannerStyles,
    DEFAULT_BATTERY_LOW_PCT: DEFAULT_BATTERY_LOW_PCT,
    clampBatteryPct: clampBatteryPct,
    getLowBatteryThreshold: getLowBatteryThreshold,
    isBatteryLow: isBatteryLow,
    hasBatterySensor: hasBatterySensor,
    setDeviceBattery: setDeviceBattery
  };

  mount();
})(typeof window !== 'undefined' ? window : this);

/* LOCKED 2026-09-23 — Ana bee/podium/name layout + safe grid. Do not change without explicit user ask.
 * Group centered in mid gap: exit (top) → podium → breed name (bottom). Protect muayeneHint dock. */
(function injectSafeAnaLayout() {
  try {
    if (typeof document === 'undefined') return;
    var apply = function () {
      if (!document.getElementById('weatherStrip') || !document.getElementById('grid')) return;
      if (document.getElementById('ana-safe-layout-css')) return;
      var s = document.createElement('style');
      s.id = 'ana-safe-layout-css';
      s.textContent = [
        '#grid{flex:0 0 auto!important;grid-template-rows:repeat(4,122px)!important;gap:5px!important}',
        '#weatherStrip,.weather{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:visible!important}',
        '#weatherStrip .forecast{flex:1 1 auto!important;min-height:0!important;position:relative!important;z-index:1!important}',
        '#weatherStrip .weather-top{flex:0 0 auto!important;position:relative!important;z-index:2!important}',
        /* idle dock: allow podium into white forecast; active notes keep clip via base CSS */
        '#muayeneHint.muayene-hint.is-idle{flex:0 0 auto!important;flex-shrink:0!important;overflow:visible!important;position:relative!important;z-index:5!important}',
        '#muayeneHint .muayene-hint-mid{overflow:visible!important;position:relative!important;z-index:6!important}',
        /* LOCKED: center exit+podium+name as one group in mid gap between Arılar/Sessiz */
        '.muayene-hint-mid .bee-exit{top:50%!important;bottom:auto!important;left:50%!important;transform:translate(-50%,calc(-50% - 18px))!important;margin:0!important;z-index:31!important}',
        '.muayene-hint-mid .bee-podium{top:50%!important;bottom:auto!important;left:50%!important;transform:translate(-50%,-50%)!important;margin:0!important;z-index:30!important;flex-direction:column!important;gap:2px!important;pointer-events:none!important}',
        '.bee-podium:not(.is-hidden){display:flex!important}',
        '.bee-podium .podium-name{overflow:visible!important;z-index:30!important;max-width:160px!important}',
        '.bee-podium .podium-name.is-on{opacity:1!important;transform:none!important}'
      ].join('');
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();
  } catch (e) { /* ignore */ }
})();

/* Forecast temps: night (lo) then day (hi) — do not touch muayeneHint controls */
(function fixForecastNightDay() {
  try {
    if (typeof document === 'undefined') return;
    function rewrite(el) {
      if (!el) return;
      var html = el.innerHTML || '';
      var mHiFirst = html.match(/^(\d+)°\s*<span class="lo">\/\s*(\d+)°<\/span>\s*$/);
      if (mHiFirst) {
        el.innerHTML = '<span class="lo">' + mHiFirst[2] + '°</span>/' + mHiFirst[1] + '°';
        return;
      }
      var mPlain = (el.textContent || '').match(/^\s*(\d+)\s*°\s*\/\s*(\d+)\s*°\s*$/);
      if (mPlain && html.indexOf('class="lo"') === -1) {
        /* assume first was day, second night when plain — swap to night/day */
        el.innerHTML = '<span class="lo">' + mPlain[2] + '°</span>/' + mPlain[1] + '°';
      }
    }
    function scan() {
      if (!document.getElementById('weatherStrip')) return;
      var nodes = document.querySelectorAll('.day-temps');
      for (var i = 0; i < nodes.length; i++) rewrite(nodes[i]);
    }
    function start() {
      scan();
      var root = document.getElementById('weatherStrip') || document.body;
      if (!root || typeof MutationObserver === 'undefined') return;
      var obs = new MutationObserver(function () { scan(); });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  } catch (e) { /* ignore */ }
})();


/* Demo/mobile: ensure bee buzz plays after a user gesture when bees+sound are on */
(function anaDemoBuzzAssist() {
  try {
    if (typeof document === 'undefined') return;
    var go = function () {
      if (!document.getElementById('beeToggle') || !document.getElementById('beeSoundToggle')) return;
      if (window.__superariBuzzAssist) return;
      window.__superariBuzzAssist = true;
      var audio = null;
      var unlocked = false;
      function ensure() {
        if (!audio) {
          audio = new Audio('assets/bees/italyan-buzz.wav');
          audio.loop = true;
          audio.preload = 'auto';
          audio.volume = 0.34;
        }
        return audio;
      }
      function beesOn() {
        var b = document.getElementById('beeToggle');
        return !!(b && b.getAttribute('aria-pressed') === 'true');
      }
      function soundOn() {
        var s = document.getElementById('beeSoundToggle');
        return !!(s && s.getAttribute('aria-pressed') === 'true');
      }
      function sync() {
        var a = ensure();
        if (unlocked && beesOn() && soundOn()) {
          var p = a.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          try { a.pause(); } catch (e) {}
        }
      }
      function unlock() {
        unlocked = true;
        var a = ensure();
        var p = a.play();
        if (p && p.then) {
          p.then(function () { if (!(beesOn() && soundOn())) { try { a.pause(); } catch (e) {} } }).catch(function () {});
        }
        sync();
      }
      document.addEventListener('pointerdown', unlock, true);
      document.addEventListener('touchstart', unlock, true);
      var bee = document.getElementById('beeToggle');
      var snd = document.getElementById('beeSoundToggle');
      if (bee) bee.addEventListener('click', function () { setTimeout(sync, 30); });
      if (snd) snd.addEventListener('click', function () { setTimeout(sync, 30); });
      setInterval(sync, 1200);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  } catch (e) { /* ignore */ }
})();


/* Ana: Demo/Canlı seçince üst yazı (Demo Modu / Konumu sabitle) hemen güncellensin */
(function anaModeLockLabelSync() {
  try {
    if (typeof document === 'undefined') return;
    var LOCK_KEY = 'superari.ana.arilikLock';
    function lockedFromLs() {
      try {
        var raw = localStorage.getItem(LOCK_KEY);
        var p = raw ? JSON.parse(raw) : null;
        return !!(p && p.locked);
      } catch (e) { return false; }
    }
    function paint() {
      var lockBtn = document.getElementById('arilikLockBtn');
      if (!lockBtn) return;
      var demo = false;
      try {
        demo = !!(window.SuperAriDevices && typeof SuperAriDevices.isDemo === 'function' && SuperAriDevices.isDemo());
      } catch (e) { demo = false; }
      if (demo) {
        lockBtn.textContent = 'Demo Modu';
        lockBtn.setAttribute('aria-pressed', lockedFromLs() ? 'true' : 'false');
        lockBtn.setAttribute('aria-label', 'Demo Modu — Ayarlar’dan Canlı’ya geçilebilir');
        lockBtn.setAttribute('title', 'Demo Modu — örnek veri; Ayarlar → Çalışma modu');
        return;
      }
      var locked = lockedFromLs() || lockBtn.getAttribute('aria-pressed') === 'true';
      lockBtn.textContent = locked ? 'Sabitlendi' : 'Konumu sabitle';
      lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
      lockBtn.setAttribute('aria-label', locked ? 'Sabitlemeyi kaldır — otomatik döngüyü sürdür' : 'Konumu sabitle — otomatik döngüyü durdur');
      lockBtn.setAttribute('title', locked
        ? 'Sabitlendi — dokununca 10sn döngü devam eder (oklar yine çalışır)'
        : 'Konumu sabitle — sadece otomatik döngüyü durdurur');
    }
    function go() {
      if (!document.getElementById('arilikLockBtn')) return;
      if (window.__superariModeLabelSync) return;
      window.__superariModeLabelSync = true;
      paint();
      window.addEventListener('superari:workMode', paint);
      window.addEventListener('pageshow', paint);
      window.addEventListener('focus', paint);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') paint();
      });
      window.addEventListener('storage', function (e) {
        if (!e) return;
        if (e.key === 'superari.workMode' || e.key === 'superari.workMode.ping' || e.key === LOCK_KEY) paint();
      });
      try {
        var bc = new BroadcastChannel('superari-workMode');
        bc.onmessage = function () { paint(); };
      } catch (e2) { /* ignore */ }
      setInterval(paint, 700);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  } catch (e) { /* ignore */ }
})();