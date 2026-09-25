(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var BREED_BY_ID = { a1: 'Muğla Arısı', a2: 'Karniyol', a3: 'Kafkas × Karniyol', a4: 'Kafkas', a5: 'Kafkas × Karadeniz' };
  var QUEEN_YEAR = 2026;
  var SEASON_DAYS_DEFAULT = 153;
  var anim = { t0: 0, lastKey: '', timer: null };
  function placeBreed(a) {
    if (!a) return '';
    if (a.id && BREED_BY_ID[a.id]) return BREED_BY_ID[a.id];
    var s = String((a.name || '') + ' ' + (a.place || '')).toLocaleLowerCase('tr');
    if (/kayaköy|kayakoy|fethiye|muğla/.test(s)) return 'Muğla Arısı';
    if (/tortum/.test(s)) return 'Karniyol';
    if (/paland/.test(s)) return 'Kafkas × Karniyol';
    if (/yanık|yanik/.test(s)) return 'Kafkas';
    if (/cimil/.test(s)) return 'Kafkas × Karadeniz';
    return '';
  }
  function foggyPlace(a) {
    return /yanık|yanik|cimil|rize|çayeli/.test(String((a && (a.name || '')) + ' ' + (a && (a.place || ''))).toLocaleLowerCase('tr'));
  }
  function rizePlace(a) {
    return /yanık|yanik|cimil|rize|çayeli|ikizdere/.test(String((a && (a.name || '')) + (a && a.il || '')).toLocaleLowerCase('tr'));
  }
  function breedKey(label) {
    var s = String(label || '').toLocaleLowerCase('tr');
    if (s.indexOf('karadeniz') !== -1) return 'kafkas_karadeniz';
    if (s.indexOf('kafkas') !== -1 && (s.indexOf('karn') !== -1 || s.indexOf('×') !== -1)) return 'kafkas_karniyol';
    if (s.indexOf('kafkas') !== -1) return 'kafkas';
    if (s.indexOf('karniyol') !== -1) return 'karniyol';
    if (s.indexOf('muğla') !== -1) return 'mugla';
    return s;
  }
  function climateDays(opts, apiary) {
    var analysis = (opts && opts.analysis) || (apiary && apiary.forageCache && apiary.forageCache.payload) || {};
    var here = analysis.here || analysis;
    var flight = analysis.flight || {};
    var season = Number(flight.seasonDayCount || here.seasonDayCount || SEASON_DAYS_DEFAULT) || SEASON_DAYS_DEFAULT;
    var poor = Number(flight.poorFlightDays != null ? flight.poorFlightDays : here.poorFlightDays);
    var precipDays = Number(flight.precipDays != null ? flight.precipDays : here.precipDays);
    var drizzle = foggyPlace(apiary) ? 45 : 0;
    if (isFinite(precipDays) && isFinite(poor)) drizzle = Math.max(0, precipDays - poor);
    else if (isFinite(precipDays)) drizzle = Math.round(precipDays * 0.45);
    return { season: Math.round(season), drizzle: Math.round(drizzle), precipDays: isFinite(precipDays) ? Math.round(precipDays) : null };
  }
  function liveFactors(apiary, hiveBreed, days) {
    days = days || { season: SEASON_DAYS_DEFAULT, drizzle: foggyPlace(apiary) ? 45 : 0 };
    var key = breedKey(hiveBreed || placeBreed(apiary));
    var share = days.season ? days.drizzle / days.season : 0;
    var breedF = 1, flyF = 1, eatF = 1;
    if (key === 'karniyol') { breedF = foggyPlace(apiary) ? 1 : 1.08; flyF = 1 - share; eatF = Math.max(0.82, 1 - 0.0018 * days.drizzle); }
    else if (key === 'kafkas_karadeniz') { breedF = 1.22; flyF = 1 - share * 0.18; }
    else if (key === 'kafkas_karniyol') { breedF = 1.2; flyF = 1 - share * 0.3; }
    else if (key === 'kafkas') { breedF = foggyPlace(apiary) ? 1.08 : 0.97; flyF = 1 - share * 0.25; }
    else if (key === 'mugla') { breedF = 1.05; }
    return { product: Math.round(breedF * flyF * eatF * 1000) / 1000 };
  }
  function kg(n) { return n == null || !isFinite(Number(n)) ? null : Math.round(Number(n) * 10) / 10; }
  function hivesOf(a) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !a) return [];
    if (D.hivesForApiary) return D.hivesForApiary(a.id) || [];
    if (D.loadHives) return (D.loadHives() || []).filter(function (h) { return String(h.apiaryId) === String(a.id); });
    return [];
  }
  function missingBundle(a) {
    var rows = [];
    var f = 1.06;
    var month = new Date().getMonth() + 1;
    var nf = rizePlace(a) ? (month >= 6 && month <= 7 ? 1.06 : 0.94) : 1.03;
    f *= nf;
    rows.push('Nektar haftası · ' + (rizePlace(a) && month >= 6 && month <= 7 ? 'kestane / orman gülü' : 'sezon') + ' · ×' + nf);
    var densF = 1;
    var F = global.SuperAriForage, D = global.D || global.SuperAriDemo;
    if (F && F.hiveDensityPressure && a && isFinite(Number(a.lat))) {
      var p = F.hiveDensityPressure(Number(a.lat), Number(a.lon), {
        apiaries: D && D.loadApiaries ? D.loadApiaries() : [], excludeId: a.id, ownHiveCount: a.hiveCount || 0
      });
      densF = Math.round((1 - p * 0.28) * 1000) / 1000;
      rows.push('Kovan yoğunluğu · baskı ' + Math.round(p * 100) + '% · ×' + densF);
    } else rows.push('Kovan yoğunluğu · hesaplanıyor');
    f *= densF;
    rows.push('Ana yaşı · yeni doğmuş 2026 · ×1.06');
    var hs = hivesOf(a);
    var scores = hs.map(function (h) { return Number(h.healthScore); }).filter(isFinite);
    var varF = 1;
    if (scores.length) {
      var av = scores.reduce(function (s, x) { return s + x; }, 0) / scores.length;
      varF = av >= 75 ? 1.02 : av >= 55 ? 1 : 0.9;
      rows.push('Varroa / sağlık · ' + Math.round(av) + ' · ×' + varF);
    } else rows.push('Varroa / sağlık · kayıt yok · ×1.00');
    f *= varF;
    var wts = hs.map(function (h) { return Number(h.weightKg); }).filter(isFinite);
    var stF = 1;
    if (wts.length) {
      var aw = wts.reduce(function (s, x) { return s + x; }, 0) / wts.length;
      stF = aw >= 34 ? 1.03 : aw >= 28 ? 1 : 0.92;
      rows.push('Akım öncesi stok · ' + kg(aw) + ' kg · ×' + stF);
    } else rows.push('Akım öncesi stok · kayıt yok');
    f *= stF;
    rows.push('Rüzgâr + 12 °C · istasyon yok');
    rows.push('Ballık / petek · kayıt yok');
    rows.push(rizePlace(a) ? 'Deli bal · kuşakta (arıya zarar yok)' : 'Deli bal · beklenmez');
    return { product: Math.round(f * 1000) / 1000, rows: rows };
  }
  function pinBreeds() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadHives) return;
    var byId = {};
    if (D.loadApiaries) {
      (D.loadApiaries() || []).forEach(function (a) {
        var b = placeBreed(a);
        if (b && D.updateApiary) try { D.updateApiary(a.id, { breed: b, defaultBreed: b }); } catch (e) {}
        byId[String(a.id)] = b;
      });
    }
    var next = (D.loadHives() || []).map(function (h) {
      var c = {};
      for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) c[k] = h[k];
      if (byId[String(h.apiaryId)]) c.breed = byId[String(h.apiaryId)];
      c.queenYear = QUEEN_YEAR;
      c.anaYili = QUEEN_YEAR;
      return c;
    });
    try { D.saveHives(next); } catch (e2) {}
  }
  function apiary() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return null;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    return list[0] || null;
  }
  function allLines(a) {
    var mid = global.__saLastEst && (global.__saLastEst.kgPerHive || global.__saLastEst.midKg);
    var n = a && a.hiveCount;
    var hedef = mid != null ? mid + ' kg/kovan' + (n ? ' · ' + Math.round(mid * n) + ' kg' : '') : 'taban × çarpanlar';
    var days = climateDays({}, a);
    return [
      'Su kaynağı · ' + (a && a.waterDistanceM != null ? a.waterDistanceM + ' m' : 'taranıyor'),
      'Flora / OSM örtü · ' + (a && a.forageCache ? 'alındı' : 'taranıyor'),
      'İklim arşivi · sıcaklık, yağış, nem, ET0',
      'Uçuş / yağış · sis-çise ' + days.drizzle + '/' + days.season,
      'Mevsim / kışlama · alındı',
      'Hedef bal · ' + hedef,
      'Ana yaşı · yeni doğmuş · ' + QUEEN_YEAR
    ].concat(missingBundle(a).rows);
  }
  function paint(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    var lines = allLines(apiary());
    var showN = Math.max(1, Math.min(lines.length, Math.ceil((pct / 100) * lines.length)));
    el.querySelector('[data-sa-title]').textContent = (pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + pct + '%';
    el.querySelector('.fill').style.width = pct + '%';
    el.querySelector('[data-sa-lines]').innerHTML = lines.slice(0, showN).map(function (t) { return '<p class="sa-under">' + t + '</p>'; }).join('');
  }
  function ensureBar() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
        '#saFloraBar .sa-title{margin:0 0 6px;font-size:13px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .sa-barrow{display:flex;align-items:center;gap:8px;}' +
        '#saFloraBar .track{flex:1;height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;}' +
        '#saFloraBar .fill{height:100%;width:0;background:#3d9a4a;transition:width .2s linear;}' +
        '#saFloraBar .fs-chev{flex:0 0 28px;border:0;background:transparent;color:#8a8278;}' +
        '#saFloraBar .sa-under{margin:6px 0 0;font-size:12px;font-weight:650;color:#2c4a22;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    if (!document.getElementById('saFloraBar')) {
      var el = document.createElement('div');
      el.id = 'saFloraBar';
      el.innerHTML = '<p class="sa-title" data-sa-title>Konum verisi güncelleniyor · 0%</p><div class="sa-barrow"><div class="track"><div class="fill"></div></div><button type="button" class="fs-chev">›</button></div><div data-sa-lines></div>';
      anchor.parentNode.insertBefore(el, anchor);
    }
    var key = String((apiary() && apiary().id) || '') + ':' + String((apiary() && apiary().waterDistanceM) || '');
    if (key !== anim.lastKey) {
      anim.lastKey = key;
      anim.t0 = Date.now();
      if (anim.timer) { clearInterval(anim.timer); anim.timer = null; }
    }
    if (anim.timer) return;
    anim.timer = setInterval(function () {
      var pct = Math.min(100, Math.round((Date.now() - anim.t0) / 90));
      paint(pct);
      if (pct >= 100) { clearInterval(anim.timer); anim.timer = null; }
    }, 90);
  }
  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__q2026 || !Y.estimateYield) return;
    var raw = Y.estimateYield;
    Y.estimateYield = function (opts) {
      opts = opts || {};
      var a = opts.apiary || apiary();
      var est = raw(opts);
      if (!est || !a) return est;
      var p = liveFactors(a, placeBreed(a), climateDays(opts, a)).product * missingBundle(a).product;
      ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
        if (est[k] != null) est[k] = kg(Number(est[k]) * p);
      });
      global.__saLastEst = est;
      return est;
    };
    Y.__q2026 = true;
  }
  function start() {
    pinBreeds();
    patchYield();
    ensureBar();
    setTimeout(ensureBar, 400);
  }
  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) start();
  else {
    var s = document.createElement('script');
    s.src = SRC_Y;
    s.onload = start;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(start, 800);
  }
  document.addEventListener('superari:apiary-saved', function () {
    anim.lastKey = '';
    if (anim.timer) { clearInterval(anim.timer); anim.timer = null; }
    start();
  });
})(window);
