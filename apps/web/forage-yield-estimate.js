(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var BREED_BY_ID = { a1: 'Muğla Arısı', a2: 'Karniyol', a3: 'Kafkas × Karniyol', a4: 'Kafkas', a5: 'Kafkas × Karadeniz' };
  var SEASON_DAYS_DEFAULT = 153;
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
    return /yanık|yanik|cimil|rize|çayeli|ikizdere/.test(String((a && (a.name || '')) + ' ' + (a && (a.place || '')) + ' ' + (a && (a.il || ''))).toLocaleLowerCase('tr'));
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
    return { season: Math.round(season), drizzle: Math.round(drizzle) };
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
    var f = 1;
    var month = new Date().getMonth() + 1;
    var nectar = 'kayıt yok';
    var nf = 1;
    if (rizePlace(a)) {
      nectar = (month >= 6 && month <= 7) ? 'kestane / orman gülü akımı' : 'akım dışı (Rize)';
      nf = month >= 6 && month <= 7 ? 1.06 : 0.94;
    } else if (/kayak|fethiye|muğla/i.test(String((a && a.name) || '') + (a && a.place || ''))) {
      nectar = (month >= 5 && month <= 8) ? 'kekik / çam dönemi' : 'akım dışı';
      nf = month >= 5 && month <= 8 ? 1.04 : 0.96;
    } else {
      nectar = (month >= 6 && month <= 8) ? 'yayla çiçek' : 'kısa sezon';
      nf = month >= 6 && month <= 8 ? 1.03 : 0.97;
    }
    f *= nf;
    rows.push('Nektar haftası · ' + nectar + ' · ×' + nf);

    var densF = 1;
    var densTxt = 'kayıt yok';
    var F = global.SuperAriForage;
    var D = global.D || global.SuperAriDemo;
    if (F && F.hiveDensityPressure && a && isFinite(Number(a.lat))) {
      var p = F.hiveDensityPressure(Number(a.lat), Number(a.lon), {
        apiaries: D && D.loadApiaries ? D.loadApiaries() : [],
        excludeId: a.id,
        ownHiveCount: a.hiveCount || 0
      });
      densF = Math.round((1 - p * 0.28) * 1000) / 1000;
      densTxt = 'baskı ' + Math.round(p * 100) + '% · ×' + densF;
    }
    f *= densF;
    rows.push('Kovan yoğunluğu 2–10 km · ' + densTxt);

    var hs = hivesOf(a);
    var queenF = 1, queenTxt = 'kayıt yok · ×1.00';
    var ages = hs.map(function (h) { return Number(h.queenYear || h.anaYili); }).filter(isFinite);
    if (ages.length) {
      var avgAge = new Date().getFullYear() - ages.reduce(function (s, x) { return s + x; }, 0) / ages.length;
      queenF = avgAge <= 1 ? 1.06 : avgAge <= 2 ? 1.0 : 0.9;
      queenTxt = 'ort. ' + Math.round(avgAge * 10) / 10 + ' yıl · ×' + queenF;
    }
    f *= queenF;
    rows.push('Ana yaşı / yavru · ' + queenTxt);

    var varF = 1, varTxt = 'kayıt yok · ×1.00';
    var scores = hs.map(function (h) { return Number(h.healthScore); }).filter(isFinite);
    if (scores.length) {
      var av = scores.reduce(function (s, x) { return s + x; }, 0) / scores.length;
      varF = av >= 75 ? 1.02 : av >= 55 ? 1.0 : 0.9;
      varTxt = 'sağlık ' + Math.round(av) + ' · ×' + varF;
    }
    f *= varF;
    rows.push('Varroa / sağlık · ' + varTxt);

    var stF = 1, stTxt = 'kayıt yok · ×1.00';
    var wts = hs.map(function (h) { return Number(h.weightKg); }).filter(isFinite);
    if (wts.length) {
      var aw = wts.reduce(function (s, x) { return s + x; }, 0) / wts.length;
      stF = aw >= 34 ? 1.03 : aw >= 28 ? 1.0 : 0.92;
      stTxt = 'ort. ' + kg(aw) + ' kg · ×' + stF;
    }
    f *= stF;
    rows.push('Akım öncesi stok · ' + stTxt);

    rows.push('Rüzgâr + 12 °C uçuş · iklim satırında (ayrı istasyon yok)');
    rows.push('Ballık / petek boşluğu · kayıt yok');
    rows.push('Taşıma × akım haftası · plan ekranı');
    rows.push(
      rizePlace(a)
        ? 'Deli bal · kuşakta (arıya zarar yok, satış/tadım ayrı)'
        : 'Deli bal · bu yerde beklenmez'
    );
    return { product: Math.round(f * 1000) / 1000, rows: rows };
  }
  function pinBreeds() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return;
    var byId = {};
    (D.loadApiaries() || []).forEach(function (a) {
      var b = placeBreed(a);
      if (b && D.updateApiary) try { D.updateApiary(a.id, { breed: b, defaultBreed: b }); } catch (e) {}
      byId[String(a.id)] = b;
    });
    if (!D.loadHives || !D.saveHives) return;
    var changed = false;
    var next = (D.loadHives() || []).map(function (h) {
      var want = byId[String(h.apiaryId)] || '';
      if (!want || String(h.breed || '') === want) return h;
      changed = true;
      var c = {}; for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) c[k] = h[k];
      c.breed = want; return c;
    });
    if (changed) try { D.saveHives(next); } catch (e2) {}
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
  function pickRows() {
    var a = apiary();
    var miss = missingBundle(a);
    var water = a && a.waterDistanceM != null ? a.waterDistanceM + ' m' : 'taranıyor';
    var mid = global.__saLastEst && (global.__saLastEst.kgPerHive || global.__saLastEst.midKg);
    var n = a && a.hiveCount;
    var hedef = mid != null ? mid + ' kg/kovan' + (n ? ' · ' + Math.round(mid * n) + ' kg' : '') : 'hesaplanıyor';
    var days = climateDays({}, a);
    var lines = [
      'Su kaynağı · ' + water,
      'Flora / OSM örtü · ' + (a && a.forageCache ? 'alındı' : 'taranıyor'),
      'İklim arşivi · sıcaklık, yağış, nem, ET0',
      'Uçuş / yağış · sis-çise ' + days.drizzle + '/' + days.season,
      'Mevsim / kışlama · panel',
      'Hedef bal · ' + hedef
    ].concat(miss.rows);
    var known = lines.filter(function (t) { return t.indexOf('kayıt yok') === -1 && t.indexOf('taranıyor') === -1 && t.indexOf('hesaplanıyor') === -1; }).length;
    return { pct: Math.min(100, Math.round((known / lines.length) * 100)), lines: lines };
  }
  function ensureUpdateBar() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
        '#saFloraBar .fs-row{display:flex;align-items:center;gap:8px;}' +
        '#saFloraBar .fs-row p{margin:0;flex:1;font-size:13px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .fs-chev{margin-left:auto;border:0;background:transparent;color:#8a8278;}' +
        '#saFloraBar .track{height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;margin:6px 0;}' +
        '#saFloraBar .fill{height:100%;background:#3d9a4a;}' +
        '#saFloraBar .sa-under{margin:0 0 3px;font-size:12px;font-weight:650;color:#2c4a22;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    var rows = pickRows();
    var el = document.getElementById('saFloraBar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'saFloraBar';
      anchor.parentNode.insertBefore(el, anchor);
    }
    el.innerHTML =
      '<div class="fs-row"><p>' + (rows.pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + rows.pct + '%</p><button type="button" class="fs-chev">›</button></div>' +
      '<div class="track"><div class="fill" style="width:' + rows.pct + '%"></div></div>' +
      rows.lines.map(function (t) { return '<p class="sa-under">' + t + '</p>'; }).join('');
  }
  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__miss1 || !Y.estimateYield) return;
    var raw = Y.estimateYield;
    Y.estimateYield = function (opts) {
      opts = opts || {};
      var a = opts.apiary || apiary();
      var est = raw(opts);
      if (!est || !a) return est;
      var fac = liveFactors(a, placeBreed(a), climateDays(opts, a));
      var miss = missingBundle(a);
      var p = fac.product * miss.product;
      ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
        if (est[k] != null) est[k] = kg(Number(est[k]) * p);
      });
      var mid = est.kgPerHive != null ? est.kgPerHive : est.midKg;
      if (mid != null && a.hiveCount) est.totalKg = kg(mid * a.hiveCount);
      est.why = (est.why || []).concat(miss.rows.map(function (t) { return { k: 'Ek kriter', v: t }; }));
      global.__saLastEst = est;
      return est;
    };
    Y.__miss1 = true;
  }
  function start() {
    pinBreeds();
    patchYield();
    ensureUpdateBar();
    setTimeout(ensureUpdateBar, 500);
    setTimeout(ensureUpdateBar, 1800);
  }
  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) start();
  else {
    var s = document.createElement('script');
    s.src = SRC_Y;
    s.onload = start;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(start, 800);
  }
})(window);
