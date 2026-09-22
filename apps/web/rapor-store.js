/**
 * Report demo store: harvest, income, inspections, alert/task history.
 * Seeds localStorage once; pages stay filled without API.
 */
(function (global) {
  var HARVEST_KEY = 'superari.rapor.hasat.v1';
  var INCOME_KEY = 'superari.rapor.gelir.v1';
  var INSPECTION_KEY = 'superari.rapor.muayene.v1';
  var ALERT_HIST_KEY = 'superari.rapor.uyari.gecmis.v1';
  var TASK_HIST_KEY = 'superari.rapor.gorev.gecmis.v1';
  var SEEDED_FLAG = 'superari.rapor.seeded.v1';

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
        if (!readJson(HARVEST_KEY)) writeJson(HARVEST_KEY, SEED_HARVESTS);
        if (!readJson(INCOME_KEY)) writeJson(INCOME_KEY, SEED_INCOMES);
        if (!readJson(INSPECTION_KEY)) writeJson(INSPECTION_KEY, SEED_INSPECTIONS);
        if (!readJson(ALERT_HIST_KEY)) writeJson(ALERT_HIST_KEY, SEED_ALERT_HIST);
        if (!readJson(TASK_HIST_KEY)) writeJson(TASK_HIST_KEY, SEED_TASK_HIST);
        return;
      }
    } catch (e) { /* ignore */ }
    writeJson(HARVEST_KEY, SEED_HARVESTS);
    writeJson(INCOME_KEY, SEED_INCOMES);
    writeJson(INSPECTION_KEY, SEED_INSPECTIONS);
    writeJson(ALERT_HIST_KEY, SEED_ALERT_HIST);
    writeJson(TASK_HIST_KEY, SEED_TASK_HIST);
    try { localStorage.setItem(SEEDED_FLAG, '1'); } catch (e2) { /* ignore */ }
  }

  function loadHarvests() {
    ensureSeeded();
    return readJson(HARVEST_KEY) || SEED_HARVESTS.slice();
  }

  function loadIncomes() {
    ensureSeeded();
    return readJson(INCOME_KEY) || SEED_INCOMES.slice();
  }

  function loadInspections() {
    ensureSeeded();
    return readJson(INSPECTION_KEY) || SEED_INSPECTIONS.slice();
  }

  function loadAlertHistory() {
    ensureSeeded();
    return readJson(ALERT_HIST_KEY) || SEED_ALERT_HIST.slice();
  }

  function loadTaskHistory() {
    ensureSeeded();
    return readJson(TASK_HIST_KEY) || SEED_TASK_HIST.slice();
  }

  function addHarvest(entry) {
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
    if (!row.apiaryId) throw new Error('apiaryId gerekli');
    if (!row.date) throw new Error('tarih gerekli');
    if (!(row.honeyKg > 0)) throw new Error('kg gerekli');
    list.push(row);
    writeJson(HARVEST_KEY, list);
    return row;
  }

  function removeHarvest(id) {
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
    return { year: y, totalKg: totalKg, totalFrames: totalFrames, rows: rows, byApiary: list };
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

  function expenseTotalForSeason(year) {
    var y = Number(year) || currentSeasonYear();
    var G = global.SuperAriGider;
    if (!G || typeof G.loadExpenses !== 'function') return 0;
    var rows = G.loadExpenses() || [];
    var sum = 0;
    rows.forEach(function (e) {
      if (seasonYearOf(e.date) === y) sum += Number(e.amount) || 0;
    });
    return sum;
  }

  function expensesByApiarySeason(year) {
    var y = Number(year) || currentSeasonYear();
    var G = global.SuperAriGider;
    var map = {};
    if (!G || typeof G.loadExpenses !== 'function') return map;
    (G.loadExpenses() || []).forEach(function (e) {
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

  function healthSummary() {
    var D = global.SuperAriDemo;
    var hives = (D && typeof D.loadHives === 'function') ? D.loadHives() : [];
    var apiaries = (D && typeof D.loadApiaries === 'function') ? D.loadApiaries() : [];
    var nameById = {};
    apiaries.forEach(function (a) { nameById[a.id] = a.name || a.place || a.id; });

    var buckets = { iyi: 0, dikkat: 0, kritik: 0 };
    var swarm = { dusuk: 0, orta: 0, yuksek: 0 };
    var sumHealth = 0;
    var sumWeight = 0;
    var sumDelta = 0;
    var byApiary = {};

    hives.forEach(function (h) {
      var hs = Number(h.healthScore) || 0;
      sumHealth += hs;
      sumWeight += Number(h.weightKg) || 0;
      sumDelta += Number(h.deltaKg) || 0;
      var label = String(h.health || '').toLocaleLowerCase('tr');
      if (label.indexOf('kritik') !== -1) buckets.kritik += 1;
      else if (label.indexOf('dikkat') !== -1) buckets.dikkat += 1;
      else buckets.iyi += 1;
      var sw = String(h.swarmRisk || '').toLocaleLowerCase('tr');
      if (sw.indexOf('yüksek') !== -1 || sw.indexOf('yuksek') !== -1) swarm.yuksek += 1;
      else if (sw.indexOf('orta') !== -1) swarm.orta += 1;
      else swarm.dusuk += 1;

      var aid = String(h.apiaryId || 'none');
      if (!byApiary[aid]) {
        byApiary[aid] = {
          apiaryId: aid,
          apiaryName: nameById[aid] || aid,
          count: 0,
          healthSum: 0,
          weightSum: 0,
          deltaSum: 0,
          kritik: 0,
          ogulYuksek: 0
        };
      }
      var b = byApiary[aid];
      b.count += 1;
      b.healthSum += hs;
      b.weightSum += Number(h.weightKg) || 0;
      b.deltaSum += Number(h.deltaKg) || 0;
      if (label.indexOf('kritik') !== -1) b.kritik += 1;
      if (sw.indexOf('yüksek') !== -1 || sw.indexOf('yuksek') !== -1) b.ogulYuksek += 1;
    });

    var n = hives.length || 1;
    var list = Object.keys(byApiary).map(function (k) {
      var b = byApiary[k];
      return {
        apiaryId: b.apiaryId,
        apiaryName: b.apiaryName,
        count: b.count,
        avgHealth: Math.round(b.healthSum / (b.count || 1)),
        avgWeight: Math.round((b.weightSum / (b.count || 1)) * 10) / 10,
        deltaSum: Math.round(b.deltaSum * 10) / 10,
        kritik: b.kritik,
        ogulYuksek: b.ogulYuksek
      };
    }).sort(function (a, b) { return a.avgHealth - b.avgHealth; });

    return {
      hiveCount: hives.length,
      avgHealth: Math.round(sumHealth / n),
      avgWeight: Math.round((sumWeight / n) * 10) / 10,
      deltaSum: Math.round(sumDelta * 10) / 10,
      buckets: buckets,
      swarm: swarm,
      byApiary: list,
      topRisk: hives.slice().sort(function (a, b) {
        return (Number(a.healthScore) || 0) - (Number(b.healthScore) || 0);
      }).slice(0, 8)
    };
  }

  function periodCompare() {
    var cur = currentSeasonYear();
    var prev = cur - 1;
    var hCur = harvestSummary(cur);
    var hPrev = harvestSummary(prev);
    var iCur = incomeSummary(cur);
    var iPrev = incomeSummary(prev);
    var eCur = expenseTotalForSeason(cur);
    var ePrev = expenseTotalForSeason(prev);
    function pct(a, b) {
      if (!b) return a ? 100 : 0;
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
    return {
      alerts: alerts,
      tasks: tasks,
      openAlerts: openA.length,
      resolvedAlerts: resolvedA.length,
      openTasks: openT.length,
      doneTasks: doneT.length,
      byType: byType,
      recentAlerts: alerts.slice().sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      }),
      recentTasks: tasks.slice().sort(function (a, b) {
        return String(b.createdAt || b.doneAt || '').localeCompare(String(a.createdAt || a.doneAt || ''));
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

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(headers, rows) {
    var lines = [headers.map(csvEscape).join(',')];
    rows.forEach(function (row) {
      lines.push(row.map(csvEscape).join(','));
    });
    return lines.join('\n');
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

  function exportBundle(kind, year) {
    var y = Number(year) || currentSeasonYear();
    kind = String(kind || 'ozet');
    if (kind === 'hasat') {
      var hs = harvestSummary(y);
      return {
        filename: 'superari-hasat-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Bal (kg)', 'Çerçeve', 'Not'],
        rows: hs.rows.map(function (r) {
          return [r.date, r.apiaryName, r.honeyKg, r.frames, r.note || ''];
        })
      };
    }
    if (kind === 'gelir') {
      var inc = incomeSummary(y);
      return {
        filename: 'superari-gelir-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Kaynak', 'Tutar', 'Not'],
        rows: inc.rows.map(function (r) {
          return [r.date, r.apiaryName, r.source, r.amount, r.note || ''];
        })
      };
    }
    if (kind === 'gider') {
      var G = global.SuperAriGider;
      var exps = (G && G.loadExpenses) ? G.loadExpenses() : [];
      var filtered = exps.filter(function (e) { return seasonYearOf(e.date) === y; });
      return {
        filename: 'superari-gider-' + y + '.csv',
        headers: ['Tarih', 'Arılık', 'Kalem', 'Kategori', 'Tutar', 'Not'],
        rows: filtered.map(function (e) {
          return [e.date, e.apiaryName || '', e.title || '', e.category || '', e.amount, e.note || ''];
        })
      };
    }
    if (kind === 'muayene') {
      var ins = filterBySeason(loadInspections(), y);
      return {
        filename: 'superari-muayene-' + y + '.csv',
        headers: ['Tarih', 'Tip', 'Kovan', 'Arılık', 'Skor', 'Yavru', 'Bal', 'Ana', 'Varroa', 'Not'],
        rows: ins.map(function (m) {
          return [m.date, m.type, m.hiveId, m.apiaryId, m.score, m.brood, m.honey, m.queen, m.varroa, m.note || ''];
        })
      };
    }
    if (kind === 'uyari') {
      var al = loadAlertHistory();
      return {
        filename: 'superari-uyari-gecmis.csv',
        headers: ['Oluşturma', 'Başlık', 'Tip', 'Kovan', 'Şiddet', 'Durum', 'Kapanış'],
        rows: al.map(function (a) {
          return [a.createdAt, a.title, a.type, a.hiveId, a.severity, a.status, a.resolvedAt || ''];
        })
      };
    }
    if (kind === 'gorev') {
      var ts = loadTaskHistory();
      return {
        filename: 'superari-gorev-gecmis.csv',
        headers: ['Oluşturma', 'Başlık', 'Kovan', 'Öncelik', 'Durum', 'Tamamlanma'],
        rows: ts.map(function (t) {
          return [t.createdAt, t.title, t.hiveId, t.priority, t.status, t.doneAt || ''];
        })
      };
    }
    if (kind === 'karzarar') {
      var pl = profitLoss(y);
      return {
        filename: 'superari-kar-zarar-' + y + '.csv',
        headers: ['Arılık', 'Gelir', 'Gider', 'Kâr/Zarar'],
        rows: pl.rows.map(function (r) {
          return [r.apiaryName, r.income, r.expense, r.profit];
        }).concat([['TOPLAM', pl.income, pl.expense, pl.profit]])
      };
    }
    /* ozet */
    var h = harvestSummary(y);
    var i = incomeSummary(y);
    var e = expenseTotalForSeason(y);
    return {
      filename: 'superari-ozet-' + y + '.csv',
      headers: ['Metrik', 'Değer'],
      rows: [
        ['Sezon', y],
        ['Toplam bal (kg)', h.totalKg],
        ['Toplam gelir (₺)', i.total],
        ['Toplam gider (₺)', e],
        ['Kâr/Zarar (₺)', i.total - e],
        ['Hasat kaydı', h.rows.length],
        ['Gelir kaydı', i.rows.length]
      ]
    };
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
