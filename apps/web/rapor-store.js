/**
 * Report store: harvest, income, inspections, alert/task history.
 * Demo mod: örnek veriler (demo:true, «Demo» etiketi).
 * Canlı mod: yalnız kullanıcının kayıtları — gelir ayrı anahtarda, muayene koloni
 * kayıtlarından, uyarılar ve görevler canlı uyarı/görev deposundan okunur.
 */
(function (global) {
  var HARVEST_KEY = 'superari.rapor.hasat.v1';
  var INCOME_KEY = 'superari.rapor.gelir.v1';
  var INSPECTION_KEY = 'superari.rapor.muayene.v1';
  var ALERT_HIST_KEY = 'superari.rapor.uyari.gecmis.v1';
  var TASK_HIST_KEY = 'superari.rapor.gorev.gecmis.v1';
  var SEEDED_FLAG = 'superari.rapor.seeded.v1';
  var INCOME_LIVE_KEY = 'superari.rapor.gelir.live.v1';
  var INCOME_SOURCES = { bal: 'Bal', balmumu: 'Balmumu', polen: 'Polen', propolis: 'Propolis', ogul: 'Oğul / paket arı', ana: 'Ana arı', diger: 'Diğer' };

  function isLive() {
    try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; }
  }
  function tagDemo(list) {
    return (list || []).map(function (x) {
      var o = {}; Object.keys(x).forEach(function (k) { o[k] = x[k]; });
      o.demo = true;
      return o;
    });
  }

  var SEED_HARVESTS = [
    { id: 'h1', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-08-18', honeyKg: 420, frames: 86, note: 'Ana hasat' },
    { id: 'h2', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-09-05', honeyKg: 95, frames: 22, note: 'İkinci sıyırma' },
    { id: 'h3', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2026-08-22', honeyKg: 310, frames: 64, note: 'Yayla hasadı' },
    { id: 'h4', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2026-08-25', honeyKg: 180, frames: 38, note: 'Çiçek balı' },
    { id: 'h5', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2026-08-28', honeyKg: 145, frames: 30, note: 'Baluğundüzü' },
    { id: 'h6', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2026-08-30', honeyKg: 165, frames: 34, note: 'Cimil' },
    { id: 'h7', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2025-08-20', honeyKg: 380, frames: 78, note: 'Geçen sezon ana' },
    { id: 'h8', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2025-08-24', honeyKg: 275, frames: 56, note: 'Geçen sezon yayla' },
    { id: 'h9', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2025-08-27', honeyKg: 155, frames: 32, note: 'Geçen sezon' },
    { id: 'h10', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2025-08-29', honeyKg: 120, frames: 26, note: 'Geçen sezon' },
    { id: 'h11', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2025-09-01', honeyKg: 140, frames: 28, note: 'Geçen sezon' }
  ];

  var SEED_INCOMES = [
    { id: 'i1', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-08-25', amount: 126000, source: 'bal', note: '420 kg × 300 ₺' },
    { id: 'i2', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-09-08', amount: 28500, source: 'bal', note: '95 kg satış' },
    { id: 'i3', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2026-08-28', amount: 93000, source: 'bal', note: 'Yayla balı' },
    { id: 'i4', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2026-08-30', amount: 54000, source: 'bal', note: '' },
    { id: 'i5', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2026-09-02', amount: 43500, source: 'bal', note: '' },
    { id: 'i6', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2026-09-04', amount: 49500, source: 'bal', note: '' },
    { id: 'i7', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-07-12', amount: 4800, source: 'balmumu', note: 'Balmumu' },
    { id: 'i8', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2026-06-18', amount: 3200, source: 'diger', note: 'Oğul satışı' },
    { id: 'i9', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2025-08-28', amount: 110200, source: 'bal', note: 'Geçen sezon' },
    { id: 'i10', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2025-08-30', amount: 79750, source: 'bal', note: 'Geçen sezon' },
    { id: 'i11', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2025-09-02', amount: 44950, source: 'bal', note: 'Geçen sezon' },
    { id: 'i12', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2025-09-05', amount: 34800, source: 'bal', note: 'Geçen sezon' },
    { id: 'i13', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2025-09-08', amount: 40600, source: 'bal', note: 'Geçen sezon' }
  ];

  var SEED_INSPECTIONS = [
    { id: 'm1', hiveId: 101, apiaryId: 'a1', date: '2026-09-10', type: 'muayene', frames: 10, brood: 'iyi', honey: 'orta', queen: 'var', varroa: 'düşük', score: 86, note: 'Sağlıklı koloni' },
    { id: 'm2', hiveId: 118, apiaryId: 'a1', date: '2026-09-10', type: 'muayene', frames: 8, brood: 'zayıf', honey: 'az', queen: 'var', varroa: 'orta', score: 58, note: 'Besleme önerildi' },
    { id: 'm3', hiveId: 211, apiaryId: 'a2', date: '2026-09-08', type: 'muayene', frames: 7, brood: 'yoğun', honey: 'iyi', queen: 'var', varroa: 'yüksek', score: 42, note: 'Oğul riski' },
    { id: 'm4', hiveId: 118, apiaryId: 'a1', date: '2026-09-12', type: 'petek', frames: 6, brood: '—', honey: '—', queen: '—', varroa: '—', score: 71, note: 'Petek tarama · 2 boş hücre uyarısı' },
    { id: 'm5', hiveId: 204, apiaryId: 'a2', date: '2026-09-06', type: 'muayene', frames: 9, brood: 'iyi', honey: 'iyi', queen: 'var', varroa: 'düşük', score: 90, note: '' },
    { id: 'm6', hiveId: 305, apiaryId: 'a3', date: '2026-09-04', type: 'muayene', frames: 9, brood: 'iyi', honey: 'orta', queen: 'var', varroa: 'düşük', score: 84, note: '' },
    { id: 'm7', hiveId: 102, apiaryId: 'a1', date: '2026-08-28', type: 'petek', frames: 8, brood: '—', honey: '—', queen: '—', varroa: '—', score: 88, note: 'Kalibrasyon tamam' },
    { id: 'm8', hiveId: 211, apiaryId: 'a2', date: '2026-08-15', type: 'petek', frames: 5, brood: '—', honey: '—', queen: '—', varroa: '—', score: 45, note: 'Yeniden tarama gerekli' },
    { id: 'm9', hiveId: 101, apiaryId: 'a1', date: '2025-09-14', type: 'muayene', frames: 10, brood: 'iyi', honey: 'iyi', queen: 'var', varroa: 'düşük', score: 88, note: 'Geçen sezon' },
    { id: 'm10', hiveId: 204, apiaryId: 'a2', date: '2025-09-12', type: 'muayene', frames: 9, brood: 'iyi', honey: 'orta', queen: 'var', varroa: 'orta', score: 78, note: 'Geçen sezon' }
  ];

  var SEED_ALERT_HIST = [
    { id: 'ah1', title: 'Oğul riski yükseldi', type: 'ogul', hiveId: 211, severity: 'high', status: 'open', createdAt: '2026-09-18T08:20:00+03:00' },
    { id: 'ah2', title: 'Sağlık skoru düştü', type: 'saglik', hiveId: 118, severity: 'medium', status: 'open', createdAt: '2026-09-17T14:05:00+03:00' },
    { id: 'ah3', title: 'Tartı ani değişim', type: 'tarti', hiveId: 101, severity: 'low', status: 'resolved', createdAt: '2026-09-12T09:40:00+03:00', resolvedAt: '2026-09-13T11:00:00+03:00' },
    { id: 'ah4', title: 'Oğul: acil müdahale', type: 'ogul', hiveId: 211, severity: 'high', status: 'open', createdAt: '2026-09-19T07:15:00+03:00' },
    { id: 'ah5', title: 'Sıcaklık eşiği aşıldı', type: 'hava', hiveId: 305, severity: 'medium', status: 'resolved', createdAt: '2026-08-22T16:30:00+03:00', resolvedAt: '2026-08-23T08:00:00+03:00' },
    { id: 'ah6', title: 'Düşük kovan ağırlığı', type: 'tarti', hiveId: 211, severity: 'medium', status: 'resolved', createdAt: '2026-08-10T10:00:00+03:00', resolvedAt: '2026-08-12T18:20:00+03:00' },
    { id: 'ah7', title: 'Varroa eşik uyarısı', type: 'saglik', hiveId: 118, severity: 'high', status: 'resolved', createdAt: '2026-07-28T12:00:00+03:00', resolvedAt: '2026-08-02T09:30:00+03:00' },
    { id: 'ah8', title: 'Petek tarama hatırlatması', type: 'petek', hiveId: 102, severity: 'low', status: 'resolved', createdAt: '2026-07-15T08:00:00+03:00', resolvedAt: '2026-07-16T17:00:00+03:00' }
  ];

  var SEED_TASK_HIST = [
    { id: 'th1', title: 'Kovan 211 oğul kontrolü', hiveId: 211, priority: 1, status: 'open', createdAt: '2026-09-18T09:00:00+03:00' },
    { id: 'th2', title: 'Kuzey tartı kalibrasyonu', hiveId: 101, priority: 2, status: 'open', createdAt: '2026-09-16T11:20:00+03:00' },
    { id: 'th3', title: 'Petek tarama — 118', hiveId: 118, priority: 2, status: 'done', createdAt: '2026-09-10T08:00:00+03:00', doneAt: '2026-09-12T15:40:00+03:00' },
    { id: 'th4', title: 'Yayla besleme kontrolü', hiveId: 305, priority: 3, status: 'open', createdAt: '2026-09-14T10:00:00+03:00' },
    { id: 'th5', title: 'Güney çerçeve değişimi', hiveId: 204, priority: 3, status: 'done', createdAt: '2026-09-01T09:00:00+03:00', doneAt: '2026-09-03T16:00:00+03:00' },
    { id: 'th6', title: 'Şurup beslemesi — Kayaköy', hiveId: 118, priority: 2, status: 'done', createdAt: '2026-08-20T07:30:00+03:00', doneAt: '2026-08-21T18:00:00+03:00' },
    { id: 'th7', title: 'Varroa tedavisi — 211', hiveId: 211, priority: 1, status: 'done', createdAt: '2026-08-05T08:00:00+03:00', doneAt: '2026-08-08T12:00:00+03:00' },
    { id: 'th8', title: 'Hasat hazırlığı — Tortum', hiveId: 204, priority: 2, status: 'done', createdAt: '2026-08-15T09:00:00+03:00', doneAt: '2026-08-22T14:00:00+03:00' }
  ];

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* ignore */ }
  }

  function ensureSeeded() {
    try {
      if (localStorage.getItem(SEEDED_FLAG) === '1') {
        if (!unifiedHarvests() && !readJson(HARVEST_KEY)) writeJson(HARVEST_KEY, SEED_HARVESTS);
        if (!readJson(INCOME_KEY)) writeJson(INCOME_KEY, SEED_INCOMES);
        if (!readJson(INSPECTION_KEY)) writeJson(INSPECTION_KEY, SEED_INSPECTIONS);
        if (!readJson(ALERT_HIST_KEY)) writeJson(ALERT_HIST_KEY, SEED_ALERT_HIST);
        if (!readJson(TASK_HIST_KEY)) writeJson(TASK_HIST_KEY, SEED_TASK_HIST);
        return;
      }
    } catch (e) { /* ignore */ }
    if (!unifiedHarvests()) writeJson(HARVEST_KEY, SEED_HARVESTS);
    writeJson(INCOME_KEY, SEED_INCOMES);
    writeJson(INSPECTION_KEY, SEED_INSPECTIONS);
    writeJson(ALERT_HIST_KEY, SEED_ALERT_HIST);
    writeJson(TASK_HIST_KEY, SEED_TASK_HIST);
    try { localStorage.setItem(SEEDED_FLAG, '1'); } catch (e2) { /* ignore */ }
  }

  /* Tek hasat deposu (demo-data.js › SuperAriDemo.harvests): Hızlı kayıt ve kovan kayıtlarıyla ortak. */
  function unifiedHarvests() {
    var D = global.SuperAriDemo;
    return D && D.harvests && typeof D.harvests.list === 'function' ? D.harvests : null;
  }
  function hiveNameMap() {
    var D = global.SuperAriDemo, m = {};
    try { (D && D.hives || []).forEach(function (h) { m[String(h.id)] = h.name || ('Kovan ' + h.id); }); } catch (e) { /* ignore */ }
    return m;
  }

  function loadHarvests() {
    var U = unifiedHarvests();
    if (U) {
      var names = hiveNameMap();
      return U.list().map(function (h) {
        var o = {}; Object.keys(h).forEach(function (k) { o[k] = h[k]; });
        o.frames = h.frames || 0;
        if (h.hiveId != null) o.hiveName = names[String(h.hiveId)] || ('Kovan ' + h.hiveId);
        return o;
      });
    }
    ensureSeeded();
    return readJson(HARVEST_KEY) || SEED_HARVESTS.slice();
  }

  function loadIncomes() {
    if (isLive()) return readJson(INCOME_LIVE_KEY) || [];
    ensureSeeded();
    return tagDemo(readJson(INCOME_KEY) || SEED_INCOMES.slice());
  }

  function apiaryNameOf(id) {
    var D = global.SuperAriDemo;
    try {
      var a = D && D.apiaryById ? D.apiaryById(id) : null;
      return a ? (a.name || a.place || String(id)) : '';
    } catch (e) { return ''; }
  }

  /** Gelir ekle (Canlı: kullanıcı deposu; Demo: demo deposu). */
  function addIncome(entry) {
    var e = entry || {};
    var rawAmt = String(e.amount == null ? '' : e.amount).replace(/[\s₺]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(rawAmt)) rawAmt = rawAmt.replace(/\./g, '');
    var amount = Number(rawAmt.replace(',', '.'));
    if (!(amount > 0)) throw new Error('Tutar girin');
    var date = String(e.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tarih girin');
    var aid = String(e.apiaryId || '');
    var row = {
      id: 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      apiaryId: aid || 'none',
      apiaryName: aid ? (apiaryNameOf(aid) || aid) : 'Arılık belirtilmedi',
      date: date,
      amount: Math.round(amount * 100) / 100,
      source: INCOME_SOURCES[e.source] ? e.source : 'diger',
      note: String(e.note || '').trim().slice(0, 200)
    };
    var key = isLive() ? INCOME_LIVE_KEY : INCOME_KEY;
    if (!isLive()) ensureSeeded();
    var list = readJson(key) || [];
    list.push(row);
    writeJson(key, list);
    return row;
  }

  function removeIncome(id) {
    var key = isLive() ? INCOME_LIVE_KEY : INCOME_KEY;
    var sid = String(id || '');
    var list = (readJson(key) || []).filter(function (r) { return String(r.id) !== sid; });
    writeJson(key, list);
    return list;
  }

  var LEVEL_TR = { az: 'az', cok: 'çok' };
  /** Canlı muayeneler: koloni kayıtlarından (güç / yavru / hastalık), aynı gün + kovan tek satır. */
  function liveInspections() {
    var D = global.SuperAriDemo;
    var KR = D && D.records;
    if (!KR || typeof KR.loadAll !== 'function') return [];
    var all = KR.loadAll() || {};
    var hives = {};
    try { (D.hives || []).forEach(function (h) { hives[String(h.id)] = h; }); } catch (e) { /* ignore */ }
    var byKey = {};
    Object.keys(all).forEach(function (hid) {
      var recs = KR.recordsFor(hid, all);
      var hv = hives[String(hid)];
      function row(date) {
        var k = hid + '|' + date;
        if (!byKey[k]) {
          byKey[k] = {
            id: 'live-' + k, hiveId: Number(hid), hiveName: hv ? hv.name : ('Kovan ' + hid),
            apiaryId: hv ? hv.apiaryId : '', apiaryName: hv ? apiaryNameOf(hv.apiaryId) : '',
            date: date, type: 'muayene', parts: [], strength: '', beeFrames: null, broodFrames: null, honeyFrames: null,
            eggs: null, queenless: false, queenCell: '', varroa: '', disease: [], note: ''
          };
        }
        return byKey[k];
      }
      (recs.strength || []).forEach(function (r) {
        var o = row(r.date);
        o.beeFrames = r.beeFrames; o.broodFrames = r.broodFrames; o.honeyFrames = r.honeyFrames;
        o.strength = KR.strengthClass ? KR.strengthClass(r) || '' : '';
        if (r.varroaSeen) o.varroa = 'gözle ' + (LEVEL_TR[r.varroaSeen] || r.varroaSeen);
        if (r.diseaseSign) o.disease.push('hastalık belirtisi');
        if (r.note && !o.note) o.note = r.note;
      });
      (recs.brood || []).forEach(function (r) {
        var o = row(r.date);
        o.eggs = r.eggs; o.queenless = !!r.queenless;
        if (r.queenCell && r.queenCell !== 'yok') o.queenCell = r.queenCell;
        if (r.varroaSeen && !o.varroa) o.varroa = 'gözle ' + (LEVEL_TR[r.varroaSeen] || r.varroaSeen);
        if (r.diseaseSign && o.disease.indexOf('hastalık belirtisi') === -1) o.disease.push('hastalık belirtisi');
        if (r.note && !o.note) o.note = r.note;
      });
      (recs.disease || []).forEach(function (r) {
        var o = row(r.date);
        var lab = (KR.DISEASE_LABEL && KR.DISEASE_LABEL[r.disease]) || r.disease;
        if (r.disease === 'varroa') {
          if (r.infestation != null) o.varroa = '%' + String(r.infestation).replace('.', ',');
          else if (r.count != null) o.varroa = r.count + ' akar';
        } else {
          var st = r.status || r.severity || '';
          var stl = (KR.SEVERITY_LABEL && KR.SEVERITY_LABEL[st]) || (KR.NOSEMA_LABEL && KR.NOSEMA_LABEL[st]) || (KR.AYC_LABEL && KR.AYC_LABEL[st]) || st;
          if (st && st !== 'yok' && st !== 'temiz') o.disease.push(lab + ' ' + String(stl).toLocaleLowerCase('tr'));
        }
        if (r.treatment) o.disease.push('tedavi: ' + r.treatment);
        if (r.note && !o.note) o.note = r.note;
      });
    });
    return Object.keys(byKey).map(function (k) {
      var o = byKey[k];
      var bits = [];
      if (o.strength) bits.push(o.strength + ' koloni');
      if (o.beeFrames != null) bits.push(o.beeFrames + ' arılı · ' + o.broodFrames + ' yavrulu · ' + o.honeyFrames + ' ballı çerçeve');
      if (o.eggs === true) bits.push('yumurta var');
      else if (o.eggs === false) bits.push('yumurta yok');
      if (o.queenless) bits.push('anasız');
      if (o.queenCell) bits.push('ana memesi');
      if (o.varroa) bits.push('varroa ' + o.varroa);
      o.disease.forEach(function (d) { bits.push(d); });
      o.detail = bits.join(' · ') || 'Kayıt';
      return o;
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function loadInspections() {
    if (isLive()) return liveInspections();
    ensureSeeded();
    var D = global.SuperAriDemo;
    return tagDemo(readJson(INSPECTION_KEY) || SEED_INSPECTIONS.slice()).map(function (m) {
      var h = null;
      try { h = D && D.hiveById ? D.hiveById(m.hiveId) : null; } catch (e) { h = null; }
      m.hiveName = h ? h.name : ('Kovan ' + m.hiveId);
      m.apiaryName = apiaryNameOf(m.apiaryId) || m.apiaryId;
      m.detail = m.type === 'petek' ? (m.note || 'Petek tarama')
        : ('Yavru ' + m.brood + ' · bal ' + m.honey + ' · ana ' + m.queen + ' · varroa ' + m.varroa);
      return m;
    });
  }

  function loadAlertHistory() {
    if (isLive()) {
      /* Canlı: kayıtlardan/stoktan/oğul riskinden üretilen güncel uyarılar (geçmiş kapanış kaydı tutulmaz). */
      var D = global.SuperAriDemo, list = [];
      try { list = (D && D.alerts) || []; } catch (e) { list = []; }
      return list.filter(function (a) { return a && !a.demo; }).map(function (a) {
        return { id: a.id, title: a.title, type: a.type || 'diger', hiveId: a.hiveId, severity: a.severity || 'medium', status: 'open', createdAt: a.createdAt || '', auto: !!a.auto };
      });
    }
    ensureSeeded();
    return tagDemo(readJson(ALERT_HIST_KEY) || SEED_ALERT_HIST.slice());
  }

  function loadTaskHistory() {
    if (isLive()) {
      var TS = global.SuperAriDemo && global.SuperAriDemo.taskStore;
      if (!TS) return [];
      var out = [];
      try {
        TS.open().forEach(function (t) {
          if (t.demo) return;
          out.push({ id: t.id, title: t.title, hiveId: t.hiveId, priority: t.priority || 3, status: 'open', createdAt: t.auto ? '' : (t.createdAt || ''), due: t.due || '', auto: !!t.auto });
        });
        TS.done().forEach(function (t) {
          if (t.demo) return;
          out.push({ id: t.id, title: t.title, hiveId: t.hiveId, priority: t.priority || 3, status: 'done', createdAt: t.auto ? '' : (t.createdAt || ''), doneAt: t.doneAt || '', auto: !!t.auto });
        });
      } catch (e) { /* ignore */ }
      return out;
    }
    ensureSeeded();
    return tagDemo(readJson(TASK_HIST_KEY) || SEED_TASK_HIST.slice());
  }

  function addHarvest(entry) {
    var U = unifiedHarvests();
    if (U) {
      var e = entry || {};
      if (!e.apiaryId && e.hiveId == null) throw new Error('Arılık seçin');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) throw new Error('Tarih girin');
      if (!(Number(String(e.honeyKg).replace(',', '.')) > 0)) throw new Error('Bal miktarını (kg) girin');
      return U.add({
        apiaryId: e.apiaryId, apiaryName: e.apiaryName, hiveId: (e.hiveId === '' ? null : e.hiveId),
        date: e.date, honeyKg: e.honeyKg, frames: e.frames, honeyType: e.honeyType, note: e.note, source: 'rapor'
      });
    }
    var list = loadHarvests().slice();
    var id = 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    var row = {
      id: id,
      apiaryId: String((entry && entry.apiaryId) || ''),
      apiaryName: String((entry && entry.apiaryName) || (entry && entry.apiaryId) || ''),
      date: String((entry && entry.date) || '').slice(0, 10),
      honeyKg: Number(entry && entry.honeyKg) || 0,
      frames: Math.max(0, Math.round(Number(entry && entry.frames) || 0)),
      note: String((entry && entry.note) || '').trim()
    };
    if (!row.apiaryId) throw new Error('Arılık seçin');
    if (!row.date) throw new Error('Tarih girin');
    if (!(row.honeyKg > 0)) throw new Error('Bal miktarını (kg) girin');
    list.push(row);
    writeJson(HARVEST_KEY, list);
    return row;
  }

  function removeHarvest(id) {
    var U = unifiedHarvests();
    if (U) { U.remove(id); return loadHarvests(); }
    var sid = String(id || '');
    var list = loadHarvests().filter(function (h) { return String(h.id) !== sid; });
    writeJson(HARVEST_KEY, list);
    return list;
  }

  /** Honey season year: May–Oct belong to that calendar year. */
  function seasonYearOf(isoDate) {
    var d = String(isoDate || '').slice(0, 10);
    var y = Number(d.slice(0, 4));
    var m = Number(d.slice(5, 7));
    if (!y) return new Date().getFullYear();
    if (m >= 1 && m <= 4) return y - 1;
    return y;
  }

  function currentSeasonYear() {
    return seasonYearOf(new Date().toISOString().slice(0, 10));
  }

  function filterBySeason(rows, year, dateKey) {
    var y = Number(year) || currentSeasonYear();
    var key = dateKey || 'date';
    return (rows || []).filter(function (r) {
      return seasonYearOf(r[key]) === y;
    });
  }

  function harvestSummary(year, apiaryId) {
    var y = Number(year) || currentSeasonYear();
    var rows = filterBySeason(loadHarvests(), y);
    if (apiaryId) {
      var aid = String(apiaryId);
      rows = rows.filter(function (h) { return String(h.apiaryId || '') === aid; });
    }
    var byApiary = {};
    var totalKg = 0;
    var totalFrames = 0;
    rows.forEach(function (h) {
      var id = String(h.apiaryId || 'none');
      if (!byApiary[id]) {
        byApiary[id] = {
          apiaryId: id,
          apiaryName: h.apiaryName || id,
          honeyKg: 0,
          frames: 0,
          count: 0
        };
      }
      byApiary[id].honeyKg += Number(h.honeyKg) || 0;
      byApiary[id].frames += Number(h.frames) || 0;
      byApiary[id].count += 1;
      if (h.apiaryName) byApiary[id].apiaryName = h.apiaryName;
      totalKg += Number(h.honeyKg) || 0;
      totalFrames += Number(h.frames) || 0;
    });
    var list = Object.keys(byApiary).map(function (k) { return byApiary[k]; })
      .sort(function (a, b) { return b.honeyKg - a.honeyKg; });
    /* Kovan bazında (yalnız kovanı belirtilmiş hasatlar); arılık geneli kayıtlar ayrı toplanır. */
    var byHiveMap = {}, apiaryLevelKg = 0, apiaryLevelCount = 0;
    rows.forEach(function (h) {
      if (h.hiveId == null) { apiaryLevelKg += Number(h.honeyKg) || 0; apiaryLevelCount += 1; return; }
      var k = String(h.hiveId);
      if (!byHiveMap[k]) byHiveMap[k] = { hiveId: h.hiveId, hiveName: h.hiveName || ('Kovan ' + h.hiveId), apiaryId: h.apiaryId, apiaryName: h.apiaryName, honeyKg: 0, frames: 0, count: 0 };
      byHiveMap[k].honeyKg += Number(h.honeyKg) || 0;
      byHiveMap[k].frames += Number(h.frames) || 0;
      byHiveMap[k].count += 1;
    });
    var byHive = Object.keys(byHiveMap).map(function (k) { return byHiveMap[k]; })
      .sort(function (a, b) { return b.honeyKg - a.honeyKg; });
    return { year: y, totalKg: totalKg, totalFrames: totalFrames, rows: rows, byApiary: list, byHive: byHive, apiaryLevelKg: apiaryLevelKg, apiaryLevelCount: apiaryLevelCount };
  }

  function incomeSummary(year) {
    var y = Number(year) || currentSeasonYear();
    var rows = filterBySeason(loadIncomes(), y);
    var total = 0;
    var byApiary = {};
    rows.forEach(function (r) {
      total += Number(r.amount) || 0;
      var id = String(r.apiaryId || 'none');
      if (!byApiary[id]) {
        byApiary[id] = { apiaryId: id, apiaryName: r.apiaryName || id, amount: 0, count: 0 };
      }
      byApiary[id].amount += Number(r.amount) || 0;
      byApiary[id].count += 1;
      if (r.apiaryName) byApiary[id].apiaryName = r.apiaryName;
    });
    return {
      year: y,
      total: total,
      rows: rows,
      byApiary: Object.keys(byApiary).map(function (k) { return byApiary[k]; })
        .sort(function (a, b) { return b.amount - a.amount; })
    };
  }

  /* Giderler sayfasıyla aynı kalem seti: standart arılık kalemleri bir kez uzlaştırılır (Giderler açılmadan da tutarlı toplam). */
  var giderReconciled = false;
  function loadExpensesReconciled() {
    var G = global.SuperAriGider, D = global.SuperAriDemo;
    if (!G || typeof G.loadExpenses !== 'function') return [];
    if (!giderReconciled) {
      giderReconciled = true;
      try {
        if (G.reconcileAllApiaries && D && D.loadApiaries) {
          G.reconcileAllApiaries(D.loadApiaries().map(function (a) {
            return { id: a.id, name: a.name, place: a.place, hiveCount: G.hiveCountOf ? G.hiveCountOf(a) : (Number(a.hiveCount) || 0) };
          }));
        }
      } catch (e) { /* ignore */ }
    }
    return G.loadExpenses() || [];
  }

  function expenseTotalForSeason(year) {
    var y = Number(year) || currentSeasonYear();
    var rows = loadExpensesReconciled();
    var sum = 0;
    rows.forEach(function (e) {
      if (seasonYearOf(e.date) === y) sum += Number(e.amount) || 0;
    });
    return sum;
  }

  function expensesByApiarySeason(year) {
    var y = Number(year) || currentSeasonYear();
    var map = {};
    loadExpensesReconciled().forEach(function (e) {
      if (seasonYearOf(e.date) !== y) return;
      var id = (!e.apiaryId || e.deletedApiary) ? 'none' : String(e.apiaryId);
      if (!map[id]) {
        map[id] = {
          apiaryId: id,
          apiaryName: id === 'none' ? 'Atanmamış' : (e.apiaryName || id),
          amount: 0
        };
      }
      map[id].amount += Number(e.amount) || 0;
      if (e.apiaryName && id !== 'none') map[id].apiaryName = e.apiaryName;
    });
    return map;
  }

  /** Sağlık özeti: SuperAriSensorHealth (Canlı modda canlı skor; veri yoksa skor null = «Veri az»). */
  function healthSummary() {
    var H = global.SuperAriSensorHealth, D = global.SuperAriDemo;
    if (!H || typeof H.evaluateAll !== 'function') return null;
    var hives = (D && typeof D.loadHives === 'function') ? D.loadHives() : [];
    return H.evaluateAll(hives);
  }

  function periodCompare(year) {
    var cur = Number(year) || currentSeasonYear();
    var prev = cur - 1;
    var hCur = harvestSummary(cur);
    var hPrev = harvestSummary(prev);
    var iCur = incomeSummary(cur);
    var iPrev = incomeSummary(prev);
    var eCur = expenseTotalForSeason(cur);
    var ePrev = expenseTotalForSeason(prev);
    function pct(a, b) {
      if (!b) return null; /* önceki dönem 0: yüzde anlamsız */
      return Math.round(((a - b) / Math.abs(b)) * 1000) / 10;
    }
    return {
      currentYear: cur,
      previousYear: prev,
      harvest: { current: hCur.totalKg, previous: hPrev.totalKg, deltaPct: pct(hCur.totalKg, hPrev.totalKg) },
      income: { current: iCur.total, previous: iPrev.total, deltaPct: pct(iCur.total, iPrev.total) },
      expense: { current: eCur, previous: ePrev, deltaPct: pct(eCur, ePrev) },
      profit: {
        current: iCur.total - eCur,
        previous: iPrev.total - ePrev,
        deltaPct: pct(iCur.total - eCur, iPrev.total - ePrev)
      },
      byApiary: mergeApiaryCompare(hCur, hPrev, iCur, iPrev, cur)
    };
  }

  function mergeApiaryCompare(hCur, hPrev, iCur, iPrev, year) {
    var expMap = expensesByApiarySeason(year);
    var ids = {};
    hCur.byApiary.forEach(function (a) { ids[a.apiaryId] = a.apiaryName; });
    hPrev.byApiary.forEach(function (a) { ids[a.apiaryId] = a.apiaryName; });
    iCur.byApiary.forEach(function (a) { ids[a.apiaryId] = a.apiaryName; });
    Object.keys(expMap).forEach(function (k) { ids[k] = expMap[k].apiaryName; });
    function find(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].apiaryId === id) return list[i];
      return null;
    }
    return Object.keys(ids).map(function (id) {
      var hc = find(hCur.byApiary, id);
      var hp = find(hPrev.byApiary, id);
      var ic = find(iCur.byApiary, id);
      var exp = expMap[id] ? expMap[id].amount : 0;
      return {
        apiaryId: id,
        apiaryName: ids[id],
        honeyCurrent: hc ? hc.honeyKg : 0,
        honeyPrevious: hp ? hp.honeyKg : 0,
        income: ic ? ic.amount : 0,
        expense: exp,
        profit: (ic ? ic.amount : 0) - exp
      };
    }).sort(function (a, b) { return b.honeyCurrent - a.honeyCurrent; });
  }

  function profitLoss(year) {
    var y = Number(year) || currentSeasonYear();
    var inc = incomeSummary(y);
    var expMap = expensesByApiarySeason(y);
    var expTotal = expenseTotalForSeason(y);
    var ids = {};
    inc.byApiary.forEach(function (a) { ids[a.apiaryId] = a.apiaryName; });
    Object.keys(expMap).forEach(function (k) { ids[k] = expMap[k].apiaryName; });
    var rows = Object.keys(ids).map(function (id) {
      var income = 0;
      for (var i = 0; i < inc.byApiary.length; i++) {
        if (inc.byApiary[i].apiaryId === id) { income = inc.byApiary[i].amount; break; }
      }
      var expense = expMap[id] ? expMap[id].amount : 0;
      return {
        apiaryId: id,
        apiaryName: ids[id],
        income: income,
        expense: expense,
        profit: income - expense
      };
    }).sort(function (a, b) { return b.profit - a.profit; });
    return {
      year: y,
      income: inc.total,
      expense: expTotal,
      profit: inc.total - expTotal,
      rows: rows
    };
  }

  function alertTaskSummary() {
    var alerts = loadAlertHistory();
    var tasks = loadTaskHistory();
    var openA = alerts.filter(function (a) { return a.status !== 'resolved'; });
    var resolvedA = alerts.filter(function (a) { return a.status === 'resolved'; });
    var openT = tasks.filter(function (t) { return t.status !== 'done'; });
    var doneT = tasks.filter(function (t) { return t.status === 'done'; });
    var byType = {};
    alerts.forEach(function (a) {
      var t = a.type || 'diger';
      byType[t] = (byType[t] || 0) + 1;
    });
    var live = isLive();
    return {
      live: live,
      alerts: alerts,
      tasks: tasks,
      openAlerts: openA.length,
      resolvedAlerts: live ? null : resolvedA.length,
      openTasks: openT.length,
      doneTasks: doneT.length,
      byType: byType,
      recentAlerts: alerts.slice().sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      }),
      recentTasks: tasks.slice().sort(function (a, b) {
        return String(b.doneAt || b.createdAt || '').localeCompare(String(a.doneAt || a.createdAt || ''));
      })
    };
  }

  function fmtMoney(n) {
    var v = Math.round(Number(n) || 0);
    return v.toLocaleString('tr-TR') + ' ₺';
  }

  function fmtKg(n) {
    return (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('tr-TR') + ' kg';
  }

  /* Türkçe Excel: ayırıcı «;», ondalık «,». */
  function csvEscape(v) {
    var s = (typeof v === 'number' && isFinite(v)) ? String(v).replace('.', ',') : String(v == null ? '' : v);
    if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(headers, rows) {
    var lines = [headers.map(csvEscape).join(';')];
    rows.forEach(function (row) {
      lines.push(row.map(csvEscape).join(';'));
    });
    return lines.join('\r\n');
  }

  function downloadBlob(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  function downloadCsv(filename, headers, rows) {
    var bom = '\uFEFF';
    downloadBlob(filename, bom + toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function trDate(iso) {
    var str = String(iso || '');
    if (/T\d{2}:\d{2}/.test(str) && /(Z|[+-]\d{2}:?\d{2})$/.test(str)) {
      var dt = new Date(str);
      if (!isNaN(dt)) {
        var p2 = function (n) { return String(n).padStart(2, '0'); };
        return p2(dt.getDate()) + '.' + p2(dt.getMonth() + 1) + '.' + dt.getFullYear() + ' ' + p2(dt.getHours()) + ':' + p2(dt.getMinutes());
      }
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(iso || ''));
    if (!m) return '';
    return m[3] + '.' + m[2] + '.' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
  }
  var TYPE_TR = { muayene: 'Muayene', petek: 'Petek tarama' };
  var SEV_TR = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
  function hiveLabel(id) {
    if (id == null || id === '') return '';
    var D = global.SuperAriDemo, h = null;
    try { h = D && D.hiveById ? D.hiveById(id) : null; } catch (e) { h = null; }
    return h ? h.name : ('Kovan ' + id);
  }
  function hiveApiary(id) {
    var D = global.SuperAriDemo, h = null;
    try { h = D && D.hiveById ? D.hiveById(id) : null; } catch (e) { h = null; }
    return h ? apiaryNameOf(h.apiaryId) : '';
  }
  function demoCol(r) { return r && r.demo ? 'Demo' : ''; }

  function exportBundle(kind, year) {
    var y = Number(year) || currentSeasonYear();
    kind = String(kind || 'ozet');
    var live = isLive();
    var title = 'SüperArı';
    var out;
    if (kind === 'hasat') {
      var hs = harvestSummary(y);
      out = {
        title: 'Hasat — ' + y + ' sezonu',
        filename: 'superari-hasat-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Kovan', 'Bal (kg)', 'Çerçeve', 'Bal türü', 'Not'],
        rows: hs.rows.map(function (r) {
          return [trDate(r.date), r.apiaryName || apiaryNameOf(r.apiaryId), r.hiveName || '', Number(r.honeyKg) || 0, Number(r.frames) || 0, r.honeyType || '', r.note || ''];
        }),
        total: ['TOPLAM', '', '', hs.totalKg, hs.totalFrames, '', '']
      };
    } else if (kind === 'gelir') {
      var inc = incomeSummary(y);
      out = {
        title: 'Gelir — ' + y + ' sezonu',
        filename: 'superari-gelir-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Kaynak', 'Tutar (₺)', 'Not'],
        rows: inc.rows.map(function (r) {
          return [trDate(r.date), r.apiaryName, INCOME_SOURCES[r.source] || r.source || '', Number(r.amount) || 0, r.note || ''];
        }),
        total: ['TOPLAM', '', '', inc.total, '']
      };
    } else if (kind === 'gider') {
      var G = global.SuperAriGider;
      var exps = loadExpensesReconciled();
      var filtered = exps.filter(function (e) { return seasonYearOf(e.date) === y; });
      var cat = function (id) { try { var c = G.catById(id); return c ? (c.label || c.name || id) : id; } catch (e) { return id; } };
      var gsum = 0; filtered.forEach(function (e) { gsum += Number(e.amount) || 0; });
      out = {
        title: 'Gider — ' + y + ' sezonu',
        filename: 'superari-gider-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Kalem', 'Kategori', 'Tutar (₺)', 'Not'],
        rows: filtered.map(function (e) {
          return [trDate(e.date), e.apiaryName || '', e.title || '', cat(e.category || ''), Number(e.amount) || 0, e.note || ''];
        }),
        total: ['TOPLAM', '', '', '', gsum, '']
      };
    } else if (kind === 'muayene') {
      var ins = filterBySeason(loadInspections(), y);
      out = {
        title: 'Muayene / petek — ' + y + ' sezonu',
        filename: 'superari-muayene-' + y + '.csv',
        headers: live ? ['Tarih', 'Kovan', 'Arılık', 'Koloni', 'Bulgular', 'Not']
          : ['Tarih', 'Tip', 'Kovan', 'Arılık', 'Skor', 'Bulgular', 'Not', 'Kaynak'],
        rows: ins.map(function (m) {
          return live ? [trDate(m.date), m.hiveName, m.apiaryName, m.strength || '', m.detail, m.note || '']
            : [trDate(m.date), TYPE_TR[m.type] || m.type, m.hiveName, m.apiaryName, m.score, m.type === 'petek' ? '' : m.detail, m.note || '', demoCol(m)];
        })
      };
    } else if (kind === 'uyari') {
      var al = loadAlertHistory();
      out = {
        title: live ? 'Güncel uyarılar' : 'Uyarı geçmişi',
        filename: 'superari-uyari-gecmis.csv',
        headers: ['Oluşturma', 'Başlık', 'Tip', 'Kovan', 'Arılık', 'Önem', 'Durum', 'Kapanış'],
        rows: al.map(function (a) {
          return [trDate(a.createdAt), a.title, a.type || '', hiveLabel(a.hiveId), hiveApiary(a.hiveId), SEV_TR[a.severity] || a.severity || '', a.status === 'resolved' ? 'Çözüldü' : 'Açık', trDate(a.resolvedAt)];
        })
      };
    } else if (kind === 'gorev') {
      var ts = loadTaskHistory();
      out = {
        title: 'Görev geçmişi',
        filename: 'superari-gorev-gecmis.csv',
        headers: ['Oluşturma', 'Başlık', 'Kovan', 'Arılık', 'Öncelik', 'Durum', 'Tamamlanma'],
        rows: ts.map(function (t) {
          return [trDate(t.createdAt), t.title, hiveLabel(t.hiveId), hiveApiary(t.hiveId), t.priority, t.status === 'done' ? 'Tamamlandı' : 'Açık', trDate(t.doneAt)];
        })
      };
    } else if (kind === 'karzarar') {
      var pl = profitLoss(y);
      out = {
        title: 'Kâr-zarar — ' + y + ' sezonu',
        filename: 'superari-kar-zarar-' + y + '.csv',
        headers: ['Arılık', 'Gelir (₺)', 'Gider (₺)', 'Kâr/Zarar (₺)'],
        rows: pl.rows.map(function (r) {
          return [r.apiaryName, r.income, r.expense, r.profit];
        }),
        total: ['TOPLAM', pl.income, pl.expense, pl.profit]
      };
    } else if (kind === 'saglik') {
      var hsum = healthSummary();
      var rowsH = [];
      if (hsum) {
        hsum.hives.forEach(function (x) { rowsH.push([x.name, hiveApiary(x.hiveId), x.score, x.band ? x.band.label : '']); });
        (hsum.unscored || []).forEach(function (x) { rowsH.push([x.name, hiveApiary(x.hiveId), '', 'Veri az']); });
      }
      out = {
        title: 'Koloni sağlık',
        filename: 'superari-saglik.csv',
        headers: ['Kovan', 'Arılık', 'Sağlık skoru', 'Durum'],
        rows: rowsH
      };
    } else {
      var h = harvestSummary(y);
      var i = incomeSummary(y);
      var e = expenseTotalForSeason(y);
      out = {
        title: 'Sezon özeti — ' + y,
        filename: 'superari-ozet-' + y + '.csv',
        headers: ['Metrik', 'Değer'],
        rows: [
          ['Sezon', String(y)],
          ['Toplam bal (kg)', h.totalKg],
          ['Toplam gelir (₺)', i.total],
          ['Toplam gider (₺)', e],
          ['Kâr/Zarar (₺)', i.total - e],
          ['Hasat kaydı', h.rows.length],
          ['Gelir kaydı', i.rows.length]
        ]
      };
    }
    out.mode = live ? 'Canlı' : 'Demo';
    out.title = title + ' · ' + out.title;
    if (out.total && out.rows.length) out.rows = out.rows.concat([out.total]);
    delete out.total;
    return out;
  }

  ensureSeeded();

  Object.defineProperty(global, 'SuperAriRapor', {
    configurable: true,
    enumerable: true,
    value: {
      HARVEST_KEY: HARVEST_KEY,
      INCOME_KEY: INCOME_KEY,
      INSPECTION_KEY: INSPECTION_KEY,
      ensureSeeded: ensureSeeded,
      loadHarvests: loadHarvests,
      addHarvest: addHarvest,
      removeHarvest: removeHarvest,
      loadIncomes: loadIncomes,
      addIncome: addIncome,
      removeIncome: removeIncome,
      INCOME_SOURCES: INCOME_SOURCES,
      isLive: isLive,
      trDate: trDate,
      loadInspections: loadInspections,
      loadAlertHistory: loadAlertHistory,
      loadTaskHistory: loadTaskHistory,
      seasonYearOf: seasonYearOf,
      currentSeasonYear: currentSeasonYear,
      filterBySeason: filterBySeason,
      harvestSummary: harvestSummary,
      incomeSummary: incomeSummary,
      healthSummary: healthSummary,
      periodCompare: periodCompare,
      profitLoss: profitLoss,
      alertTaskSummary: alertTaskSummary,
      expenseTotalForSeason: expenseTotalForSeason,
      fmtMoney: fmtMoney,
      fmtKg: fmtKg,
      toCsv: toCsv,
      downloadCsv: downloadCsv,
      downloadBlob: downloadBlob,
      exportBundle: exportBundle
    }
  });
})(window);
