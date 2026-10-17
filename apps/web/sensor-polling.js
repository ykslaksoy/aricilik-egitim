/**
 * SüperArı — sensör ölçüm zamanlayıcısı (istemci + demo simülasyonu).
 * Canlıda gerçek cihazlar entegrasyonla push eder; zamanlayıcı aralıkta prune + demo okuma üretir.
 */
(function (global) {
  /* k146: etiketli ses olayını buluta (public.ses_olaylari) yaz — oturum yoksa yalnız yerelde kalır. */
  function sesOlayGonder(row) {
    try {
      var B = (typeof window !== 'undefined') && window.SuperAriBulut; if (!B || !B.session || !B.client || row.hiveId == null) return;
      B.session().then(function (s) { if (!s) return; return B.client().then(function (c) {
        return c.from('ses_olaylari').insert({ hive_id: String(row.hiveId), device_id: row.deviceId || null, at: new Date(row.at).toISOString(), sinif: row.sinif, guven: row.guven != null ? row.guven : null, hz_tepe: row.hz != null ? row.hz : null, sure_ms: row.sureMs != null ? row.sureMs : null, db_goreli: row.dbRel != null ? row.dbRel : null });
      }); }).catch(function () {});
    } catch (e) { /* yerel */ }
  }
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
    ir: 'superari.sensor.ir.v1',
    pil: 'superari.sensor.pil.v1'
  };

  var DEFAULT_BATTERY_LOW_PCT = 20;
  var DEFAULT_BATTERY_INTERVAL_MS = 14400000; /* 4 saat */

  /** Rakip varsayımları: BroodMinder tartı ~1 sa; TH sık; Arnia/bScale günlük/4x günlük ağırlık. */
  /* koloni-236: tartı 15 dk (Meikle 5–15), ısı/nem 30 dk — varsayılanlar ORS_SENSOR.okuma*Dk ile de okunur (uzman tahmini). */
  /* koloni-242: diğer sensörler de tek kaynaktan (ORS_SENSOR.okuma*Dk, SuperAriPilModel.okumaMs): ses/titreşim 3 dk ortalama spektrum (titreşim Ramsey 2020; ses uzman tahmini),
     IR 5 dk giren/çıkan, giriş sıcaklığı + dış hava 30 dk, pil 4 sa, kamera 24 sa, gateway 10 dk (uzman tahmini). Aşağıdaki tablo yalnız ayar okunamazsa yedektir. */
  var DEFAULT_INTERVAL_MS = {
    tarti: 900000,
    isi_nem: 1800000,
    dis_isi_nem: 1800000,
    ses: 180000,
    titresim: 180000,
    ir: 300000,
    gateway: 600000,
    kamera_arilik: 86400000,
    kamera_merkez: 86400000,
    kamera_kovan: 86400000,
    role_hub: 86400000
  };
  var DEMO_SIM_MIN_MS = { ses: 3600000, titresim: 1800000, ir: 14400000 };
  var MIN_INTERVAL_MS = 60000; /* koloni-242: 1 dk (ses/titreşim 3 dk, IR 5 dk için; eskiden 5 dk) */
  var burstUntil = {}; /* hiveId → bitiş ms — eşek arısı hızlı sıcaklık */
  var burstLast = {};

  var INTERVAL_PRESETS = [
    { ms: 180000, label: '3 dk' }, /* koloni-242: ses / titreşim ortalama spektrum */
    { ms: 300000, label: '5 dk' }, /* koloni-242: IR giren/çıkan */
    { ms: 600000, label: '10 dk' }, /* koloni-242: gateway gönderim */
    { ms: 900000, label: '15 dk' },
    { ms: 1800000, label: '30 dk' },
    { ms: 3600000, label: '1 saat' },
    { ms: 7200000, label: '2 saat' }, /* k160: batarya planlayıcı önerisi */
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
    return {
      defaults: {},
      byDevice: {},
      byApiary: {},
      lastPoll: {},
      lastPollBattery: {},
      batteryLowPct: DEFAULT_BATTERY_LOW_PCT,
      batteryLowPctByApiary: {}
    };
  }

  function getConfig() {
    var c = readJ(CONFIG_KEY, null);
    if (!c || typeof c !== 'object') return emptyConfig();
    c.defaults = c.defaults && typeof c.defaults === 'object' ? c.defaults : {};
    c.byDevice = c.byDevice && typeof c.byDevice === 'object' ? c.byDevice : {};
    c.byApiary = c.byApiary && typeof c.byApiary === 'object' ? c.byApiary : {};
    c.lastPoll = c.lastPoll && typeof c.lastPoll === 'object' ? c.lastPoll : {};
    c.lastPollBattery = c.lastPollBattery && typeof c.lastPollBattery === 'object' ? c.lastPollBattery : {};
    if (c.batteryLowPct == null || !isFinite(Number(c.batteryLowPct))) c.batteryLowPct = DEFAULT_BATTERY_LOW_PCT;
    c.batteryLowPctByApiary = c.batteryLowPctByApiary && typeof c.batteryLowPctByApiary === 'object'
      ? c.batteryLowPctByApiary : {};
    return c;
  }

  function clampBatteryPct(n) {
    var x = Number(n);
    if (!isFinite(x)) return null;
    return Math.max(0, Math.min(100, Math.round(x)));
  }

  /* koloni-225: tek kaynak — yönetici panelindeki «Düşük pil» (uyari.dusukPilYuzde, uzman tahmini). Eski arılık/telefon eşikleri yok sayılır. */
  function getBatteryLowPct() {
    try { var E = global.SuperAriEsikler && global.SuperAriEsikler.get(); if (E && E.uyari && E.uyari.dusukPilYuzde > 0) { var v = clampBatteryPct(E.uyari.dusukPilYuzde); if (v != null) return v; } } catch (e) { /* */ }
    return DEFAULT_BATTERY_LOW_PCT;
  }

  /** Eski arayüz uyumu: eşik artık yalnız yönetici panelinden değişir. */
  function setBatteryLowPct() { return false; }


  function saveConfig(c) { writeJ(CONFIG_KEY, c || emptyConfig()); }

  function storageKey(tip) { return STORAGE_BY_TIP[tip] || null; }

  function sensorTh() {
    try {
      var D = global.SuperAriDemo, c = D && D.colony;
      if (!c) return {};
      var s = c.ogulSkor ? c.ogulSkor() : null;
      return Object.assign({}, c.ORS_SENSOR || {}, s && s.sensor ? s.sensor : {});
    } catch (e) { return {}; }
  }
  /** koloni-242: tip (+ yer 'giris') → varsayılan ms; tek kaynak ORS_SENSOR.okuma*Dk (pil-model.js okumaMs). */
  function defaultIntervalMs(tip, yer) {
    var t = String(tip || '');
    var M = global.SuperAriPilModel, th = sensorTh();
    if (M && typeof M.okumaMs === 'function') {
      var ms = M.okumaMs(t, th, yer);
      if (ms != null) { var n = normalizeInterval(ms); if (n) return n; }
    } else if (t === 'tarti' || t === 'isi_nem' || t === 'dis_isi_nem') {
      var dk = t === 'tarti' ? Number(th.okumaTartiDk) : Number(t === 'dis_isi_nem' && th.okumaDisHavaDk ? th.okumaDisHavaDk : th.okumaIsiNemDk);
      if (!(isFinite(dk) && dk > 0)) dk = t === 'tarti' ? 15 : 30;
      var n2 = normalizeInterval(Math.round(dk) * 60000);
      if (n2) return n2;
    }
    if (DEFAULT_INTERVAL_MS[t] != null) return DEFAULT_INTERVAL_MS[t];
    return 3600000;
  }
  /** koloni-242: pil okuma aralığı (okumaPilDk, uzman tahmini; yedek 4 saat). */
  function batteryIntervalMs() {
    var M = global.SuperAriPilModel;
    var ms = M && M.okumaMs ? M.okumaMs('pil', sensorTh()) : null;
    return ms || DEFAULT_BATTERY_INTERVAL_MS;
  }
  /** koloni-242: kuralların gerektirdiği en seyrek aralık (ms) — sıklık bundan seyrekse kural çözünürlüğü yetmez.
   *  Olay tabanlı algılamalar (piping, tıslama, dur sinyali, ana ötmesi, darbe) aralıktan bağımsızdır: cihaz sürekli dinler, olay anında gönderir. */
  function kuralGerek(tip, yer) {
    var M = global.SuperAriPilModel;
    return M && M.kuralGerek ? M.kuralGerek(tip, sensorTh(), yer) : null;
  }
  /** ms bu tip için hangi kuralların çözünürlüğünü bozar (boş = sorun yok). */
  function kuralCozunurluk(tip, ms, yer) {
    var g = kuralGerek(tip, yer); if (!g) return [];
    return g.kurallar.filter(function (x) { return Number(ms) > x.ms; });
  }
  /** Yönetici/rapor: tüm varsayılanlar + kural kontrolü. */
  function okumaOzet() {
    var tips = [['isi_nem', null, 'Kovan içi sıcaklık/nem'], ['isi_nem', 'giris', 'Giriş sıcaklığı'], ['dis_isi_nem', null, 'Dış hava'], ['tarti', null, 'Tartı'], ['ses', null, 'Ses (mikrofon)'], ['titresim', null, 'Titreşim'], ['ir', null, 'Giriş sayacı (IR)'], ['pil', null, 'Pil'], ['kamera_kovan', null, 'Kamera'], ['gateway', null, 'Gateway gönderim']];
    return tips.map(function (x) {
      var ms = x[0] === 'pil' ? batteryIntervalMs() : defaultIntervalMs(x[0], x[1]);
      var bozuk = kuralCozunurluk(x[0], ms, x[1]);
      return { tip: x[0], yer: x[1], ad: x[2], ms: ms, etiket: intervalLabel(ms), tamam: !bozuk.length, bozuk: bozuk };
    });
  }

  function normalizeInterval(ms) {
    var n = Number(ms);
    if (!isFinite(n) || n < MIN_INTERVAL_MS) return null;
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
    return defaultIntervalMs(tip, device.yer);
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

  /* koloni-241: IndexedDB deposu varsa (sensor-ham.js) ham okumalar orada; localStorage yalnız yedek yol */
  function ham() { var H = global.SuperAriSensorHam; return H && H.aktif && H.aktif() ? H : null; }
  function readStore(tip) {
    var key = storageKey(tip);
    if (!key) return [];
    var Hm = ham(); if (Hm) return Hm.list(tip).slice();
    var arr = readJ(key, []);
    return Array.isArray(arr) ? arr : [];
  }

  function writeStore(tip, arr) {
    var key = storageKey(tip);
    if (!key) return;
    if (ham()) return; /* koloni-241: budama sensor-ham.js'te (hamSaklaGun) */
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
    n += pruneTip('pil');
    return n;
  }

  function appendReading(rec) {
    if (!rec || !rec.type || !rec.at) return null;
    if (rec.type === 'pil') {
      if (!rec.deviceId) return null;
    } else if (!rec.hiveId) return null;
    var tip = rec.type;
    var key = storageKey(tip);
    if (!key) return null;
    var list = pruneList(readStore(tip), tip);
    var dup = list.some(function (x) {
      if (x.at !== rec.at) return false;
      if (tip === 'pil') return String(x.deviceId || '') === String(rec.deviceId || '');
      return Number(x.hiveId) === Number(rec.hiveId) &&
        String(x.deviceId || '') === String(rec.deviceId || '');
    });
    if (dup) return null;
    var row = {
      deviceId: rec.deviceId != null ? String(rec.deviceId) : undefined,
      at: String(rec.at).slice(0, (tip === 'ses' || tip === 'titresim') ? 19 : 16), /* k146: ses hecelerinde saniye gerekir */
      type: tip
    };
    if (rec.hiveId != null) row.hiveId = Number(rec.hiveId);
    if (rec.apiaryId != null) row.apiaryId = String(rec.apiaryId);
    if (tip === 'tarti' && rec.kg != null) row.kg = Math.round(Number(rec.kg) * 100) / 100;
    if (tip === 'isi_nem') {
      if (rec.tempC != null) row.tempC = Math.round(Number(rec.tempC) * 10) / 10;
      if (rec.rh != null) row.rh = Math.round(Number(rec.rh));
    }
    if (tip === 'ses' && rec.level != null) row.level = Math.round(Number(rec.level) * 10) / 10;
    if ((tip === 'ses' || tip === 'titresim') && rec.hz != null && isFinite(Number(rec.hz))) row.hz = Math.round(Number(rec.hz)); /* k131: baskın frekans (piping 400–500 Hz) */
    if ((tip === 'ses' || tip === 'titresim') && rec.ritmik != null) row.ritmik = rec.ritmik === true; /* ritmik desen (piping) */
    /* k146: ses olayı etiketleri — süre (ms), kovan tabanına göre göreli dB, sınıf, güven */
    if ((tip === 'ses' || tip === 'titresim') && rec.sureMs != null && isFinite(Number(rec.sureMs))) row.sureMs = Math.round(Number(rec.sureMs));
    if ((tip === 'ses' || tip === 'titresim') && rec.dbRel != null && isFinite(Number(rec.dbRel))) row.dbRel = Math.round(Number(rec.dbRel) * 10) / 10;
    if ((tip === 'ses' || tip === 'titresim') && rec.sinif) row.sinif = String(rec.sinif).slice(0, 40);
    if ((tip === 'ses' || tip === 'titresim') && rec.guven != null && isFinite(Number(rec.guven))) row.guven = Math.max(0, Math.min(1, Number(rec.guven)));
    if (tip === 'titresim' && rec.level != null) row.level = Math.round(Number(rec.level) * 10) / 10;
    if (tip === 'ir' && rec.count != null) row.count = Math.round(Number(rec.count));
    if (tip === 'pil') {
      if (rec.batteryPct != null) row.batteryPct = clampBatteryPct(rec.batteryPct);
      if (rec.batteryV != null) row.batteryV = Math.round(Number(rec.batteryV) * 100) / 100;
    }
    if (rec.demo) row.demo = true;
    /* koloni-241: cihaz alanları atılmaz (ham veri yazılım geliştirme için saklanır) */
    ['giren', 'cikan', 'rms', 'g', 'sr', 'deger', 'enerji', 'kanal', 'yer'].forEach(function (k) { if (rec[k] != null && row[k] == null) row[k] = rec[k]; });
    if (rec.darbe != null) row.darbe = !!rec.darbe; if (rec.bant != null) row.bant = rec.bant; if (Array.isArray(rec.kanallar)) row.kanallar = rec.kanallar;
    if ((tip === 'ses' || tip === 'titresim') && row.sinif && !row.demo) sesOlayGonder(row); /* k146 */
    var Hm = ham();
    if (Hm) Hm.ekle(tip, row);
    else { list.push(row); list = pruneList(list, tip); writeStore(tip, list); }
    /* koloni-236: tıslama / titreşim artışı → sıcaklığı eşek penceresi boyunca hızlı oku (uzman tahmini; 30 dk tabanda ±0,5 °C/10 dk yakalanmaz) */
    try {
      if (row.hiveId != null && (
        (tip === 'ses' && (row.sinif === 'tislama' || (row.hz != null && Number(row.hz) >= 4500))) ||
        (tip === 'titresim' && (row.sinif === 'tislama' || (row.level != null && Number(row.level) >= 2) || (row.g != null && Number(row.g) >= 1.5)))
      )) scheduleEsekTempBurst(row.hiveId);
    } catch (eB) { /* ignore */ }
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
    if (device.status !== 'bagli' && device.status !== 'yok') return false; /* k160: kayıtlı ama henüz okuma yok → yine sorgulanır */
    var c = getConfig();
    var last = c.lastPoll[String(device.id)] || 0;
    var iv = resolveIntervalMs(device);
    /* koloni-242: demo simülasyonu telefon deposunu doldurmasın — ses/titreşim/IR demo satırı eski sıklıkta üretilir (gerçek cihaz kendi aralığıyla push eder) */
    if ((device.source === 'demo' || !isLive()) && DEMO_SIM_MIN_MS[device.tip]) iv = Math.max(iv, DEMO_SIM_MIN_MS[device.tip]);
    return !last || (nowMs - last) >= iv;
  }

  function markPolled(deviceId, nowMs) {
    var c = getConfig();
    c.lastPoll[String(deviceId)] = nowMs;
    saveConfig(c);
  }

  function markBatteryPolled(deviceId, nowMs) {
    var c = getConfig();
    c.lastPollBattery[String(deviceId)] = nowMs;
    saveConfig(c);
  }

  function deviceHasBattery(device) {
    if (!device || device.tip === 'gateway') return false;
    var Dev = global.SuperAriDevices;
    if (Dev && typeof Dev.hasBatterySensor === 'function') return Dev.hasBatterySensor(device.tip);
    return device.tip !== 'gateway';
  }

  function isBatteryDue(device, nowMs, piggyback) {
    if (!deviceHasBattery(device)) return false;
    if (device.status !== 'bagli' && device.status !== 'yok' && !piggyback) return false;
    var c = getConfig();
    var last = c.lastPollBattery[String(device.id)] || 0;
    if (piggyback) return true;
    return !last || (nowMs - last) >= batteryIntervalMs();
  }

  function simulateBattery(device) {
    if (!deviceHasBattery(device)) return null;
    var id = String(device.id || 'x');
    var seed = 0;
    for (var i = 0; i < id.length; i++) seed += id.charCodeAt(i);
    var hours = Date.now() / 3600000;
    var wave = (Math.sin(hours / 36 + seed * 0.17) + 1) / 2;
    var pct = clampBatteryPct(12 + wave * 83);
    var v = Math.round((3.25 + (pct / 100) * 0.95) * 100) / 100;
    var at = nowLocalIso();
    var row = appendReading({
      type: 'pil',
      deviceId: device.id,
      hiveId: device.hiveId,
      apiaryId: device.apiaryId,
      at: at,
      batteryPct: pct,
      batteryV: v,
      demo: device.source === 'demo' || !isLive()
    });
    var Dev = global.SuperAriDevices;
    if (Dev && typeof Dev.setDeviceBattery === 'function') {
      Dev.setDeviceBattery(device.id, { batteryPct: pct, batteryV: v, batteryAt: at }, { source: device.source });
    }
    return row;
  }

  function pollBattery(device, piggyback) {
    if (!device) return null;
    var nowMs = Date.now();
    if (!isBatteryDue(device, nowMs, !!piggyback)) return null;
    var row = null;
    if (device.source === 'demo' || !isLive()) row = simulateBattery(device);
    else {
      /* koloni-225: canlı cihazın gerçek pil okumasını sakla (aynı okuma iki kez yazılmaz) */
      var at = device.batteryAt ? String(device.batteryAt).slice(0, 16) : null, pct = device.batteryPct != null ? device.batteryPct : device.battery;
      if (at && pct != null) {
        var son = readStore('pil').filter(function (x) { return String(x.deviceId) === String(device.id); }).map(function (x) { return x.at; }).sort().pop();
        if (son !== at) row = appendReading({ type: 'pil', deviceId: device.id, hiveId: device.hiveId, at: at, batteryPct: pct, batteryV: device.batteryV });
      }
      pruneTip('pil');
    }
    markBatteryPolled(device.id, nowMs);
    return row;
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
      var gi = 20 + Math.floor(Math.random() * 10), ci = 20 + Math.floor(Math.random() * 10);
      return appendReading({ type: 'ir', hiveId: hiveId, deviceId: device.id, at: at, count: cnt + Math.floor(Math.random() * 8), giren: gi, cikan: ci, demo: true });
    }
    return null;
  }


  function scheduleEsekTempBurst(hiveId) {
    if (hiveId == null) return;
    var th = sensorTh();
    var win = (Number(th.esekEslesDk) || 10) * 60000;
    var id = String(hiveId);
    var until = Date.now() + win;
    burstUntil[id] = Math.max(burstUntil[id] || 0, until);
    pollIsiNemHive(hiveId);
    burstLast[id] = Date.now();
  }
  function pollIsiNemHive(hiveId) {
    var Dev = global.SuperAriDevices;
    if (!Dev || !Dev.listDevices) return null;
    var list = [];
    try { list = Dev.listDevices(); } catch (e) { list = []; }
    /* koloni-242: kovandaki tüm sıcaklık sensörleri (iç + giriş) hızlı okunur */
    var dvs = list.filter(function (d) {
      return d && (d.tip === 'isi_nem') && d.hiveId != null && Number(d.hiveId) === Number(hiveId)
        && (d.status === 'bagli' || d.status === 'yok' || d.source === 'demo');
    });
    if (!dvs.length) return null;
    var r0 = null;
    dvs.forEach(function (dv) { var r = pollDeviceNow(dv, { nowMs: Date.now() }); if (!r0) r0 = r; });
    return r0;
  }
  function burstTick(nowMs) {
    nowMs = nowMs != null ? nowMs : Date.now();
    var th = sensorTh();
    var fast = Math.max(60000, (Number(th.okumaEsekHizliDk) || 2) * 60000);
    Object.keys(burstUntil).forEach(function (hid) {
      if (nowMs > burstUntil[hid]) { delete burstUntil[hid]; delete burstLast[hid]; return; }
      if (!burstLast[hid] || (nowMs - burstLast[hid]) >= fast) {
        pollIsiNemHive(Number(hid));
        burstLast[hid] = nowMs;
      }
    });
  }

  function pollDevice(device) {
    if (!device) return null;
    var nowMs = Date.now();
    if (!isDue(device, nowMs)) return null;
    return pollDeviceNow(device, { nowMs: nowMs });
  }

  /** Zamanlayıcıyı beklemeden ölçüm isteği (tartı «tarttır»). Demo simüle eder; canlıda son push okuması döner. */
  function pollDeviceNow(device, opts) {
    opts = opts || {};
    if (!device) return null;
    var nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
    var row = null;
    if (device.source === 'demo' || !isLive()) row = simulateDemo(device);
    else {
      pruneTip(device.tip);
      if (device.tip === 'tarti' && device.hiveId != null) {
        var list = readStore('tarti').filter(function (x) {
          return Number(x.hiveId) === Number(device.hiveId) && Number(x.kg) > 0;
        });
        row = list.length ? list[list.length - 1] : null;
      }
    }
    markPolled(device.id, nowMs);
    pollBattery(device, true);
    return row;
  }

  function requestTartiWeigh(hiveId) {
    var Dev = global.SuperAriDevices;
    if (!Dev || !Dev.listDevices) return { ok: false, reason: 'no-devices' };
    var list = [];
    try { list = Dev.listDevices(); } catch (e) { list = []; }
    var dv = list.filter(function (d) {
      return d && d.tip === 'tarti' && d.hiveId != null && Number(d.hiveId) === Number(hiveId);
    })[0];
    if (!dv) return { ok: false, reason: 'no-scale' };
    var row = pollDeviceNow(dv, { force: true });
    if (!row || row.kg == null) return { ok: false, reason: 'no-reading', device: dv };
    return { ok: true, device: dv, row: row };
  }

  function listDueDevices() {
    var Dev = global.SuperAriDevices;
    if (!Dev || !Dev.listDevices) return [];
    var nowMs = Date.now();
    var list = [];
    try { list = Dev.listDevices(); } catch (e) { list = []; }
    return list.filter(function (d) { return isDue(d, nowMs); });
  }

  function listBatteryDueDevices() {
    var Dev = global.SuperAriDevices;
    if (!Dev || !Dev.listDevices) return [];
    var nowMs = Date.now();
    var list = [];
    try { list = Dev.listDevices(); } catch (e) { list = []; }
    return list.filter(function (d) {
      if (!isBatteryDue(d, nowMs, false)) return false;
      if (POLLABLE_TIPS.indexOf(d.tip) >= 0) return !isDue(d, nowMs);
      return true;
    });
  }

  function tick() {
    pruneAll();
    var polled = 0;
    listDueDevices().forEach(function (d) {
      if (pollDevice(d)) polled += 1;
    });
    listBatteryDueDevices().forEach(function (d) {
      if (pollBattery(d, false)) polled += 1;
    });
    burstTick(Date.now());
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
    if (tip === 'tarti') base.unshift(900000); /* 15 dk varsayılan */
    if (tip === 'isi_nem' || tip === 'dis_isi_nem') { base.unshift(1800000); base.unshift(900000); } /* 30 dk varsayılan; 15 isteğe bağlı */
    if (tip === 'titresim' || tip === 'ses') { base.unshift(1800000); base.unshift(900000); base.unshift(180000); } /* koloni-242: 3 dk ortalama spektrum */
    if (tip === 'ir') { base.unshift(1800000); base.unshift(900000); base.unshift(300000); } /* koloni-242: 5 dk giren/çıkan */
    if (tip === 'gateway') { base.unshift(900000); base.unshift(600000); } /* koloni-242: 10 dk gönderim */
    var out = INTERVAL_PRESETS.filter(function (p) { return base.indexOf(p.ms) >= 0; });
    var dv = defaultIntervalMs(tip); /* yönetici varsayılanı her zaman seçilebilir */
    if (!out.some(function (p) { return p.ms === dv; })) { out.push({ ms: dv, label: intervalLabel(dv) }); out.sort(function (a, b) { return a.ms - b.ms; }); }
    return out;
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
    sesOlayGonder: sesOlayGonder, /* koloni-241: sensorGiris gerçek cihaz olayları */
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
    pollDeviceNow: pollDeviceNow,
    requestTartiWeigh: requestTartiWeigh,
    tick: tick,
    startScheduler: startScheduler,
    selectHtml: selectHtml,
    bindPollSelects: bindPollSelects,
    presetsForTip: presetsForTip,
    batteryIntervalMs: batteryIntervalMs,
    kuralGerek: kuralGerek,
    kuralCozunurluk: kuralCozunurluk,
    okumaOzet: okumaOzet,
    MIN_INTERVAL_MS: MIN_INTERVAL_MS,
    scheduleEsekTempBurst: scheduleEsekTempBurst,
    burstUntil: function () { return burstUntil; },
    sensorTh: sensorTh,
    DEFAULT_BATTERY_INTERVAL_MS: DEFAULT_BATTERY_INTERVAL_MS,
    DEFAULT_BATTERY_LOW_PCT: DEFAULT_BATTERY_LOW_PCT,
    getBatteryLowPct: getBatteryLowPct,
    setBatteryLowPct: setBatteryLowPct,
    clampBatteryPct: clampBatteryPct,
    pollBattery: pollBattery,
    readBatteryStore: function () { return readStore('pil'); },
    lastBatteryReading: function (deviceId) {
      var list = readStore('pil').filter(function (x) {
        return String(x.deviceId || '') === String(deviceId);
      });
      return list.length ? list[list.length - 1] : null;
    }
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
