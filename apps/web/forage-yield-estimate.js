(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';
  var BREED_BY_ID = { a1: 'Muğla Arısı', a2: 'Karniyol', a3: 'Kafkas × Karniyol', a4: 'Kafkas', a5: 'Kafkas × Karadeniz' };
  var SEASON_DAYS_DEFAULT = 153;
  var LIVE_STEPS = ['Su kaynağı', 'Flora / OSM örtü', 'İklim arşivi'];
  var NEW_STEPS = [
    'Su kaynağı',
    'Flora / OSM örtü',
    'İklim arşivi (sıcaklık, yağış, nem, ET0)',
    'Uçuş / yağış özeti · sis-çise',
    'Mevsim / kışlama',
    'İrk ve hedef bal',
    'Yer skoru ve foraj yarıçapı'
  ];
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
  function isNewApiary(a) {
    if (!a) return false;
    return !a.forageCache && a.waterDistanceM == null;
  }
  function livePct(a) {
    var n = 0;
    if (a && a.waterDistanceM != null) n += 1;
    if (a && a.forageCache) n += 1;
    if (document.querySelector('#forageHost .forage-k, .forage-flight, .forage-water')) n += 1;
    return Math.round((n / 3) * 100);
  }
  function chevronSvg() {
    return '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.58a1 1 0 0 0 0-1.42L10.7 6.7a1 1 0 0 0-1.41.01z"/></svg>';
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
        '#saFloraBar .fs-chev{flex:0 0 28px;margin-left:auto;border:0;background:transparent;color:#8a8278;}' +
        '#saFloraBar.is-open .fs-chev{transform:rotate(90deg);}' +
        '#saFloraBar .track{height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;margin:6px 0;}' +
        '#saFloraBar .fill{height:100%;background:#3d9a4a;transition:width .3s;}' +
        '#saFloraBar .sa-under{margin:0;font-size:12px;font-weight:650;color:#2c4a22;line-height:1.4;}' +
        '#saFloraBar .sa-flora-detail{display:none;margin-top:8px;font-size:12px;color:#2c4a22;}' +
        '#saFloraBar.is-open .sa-flora-detail{display:block;}' +
        '#saFloraBar .sa-flora-detail p{margin:0 0 4px;}';
      document.head.appendChild(s);
    }
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    var a = apiary();
    var pct = livePct(a);
    var wd = a && a.waterDistanceM != null ? a.waterDistanceM + ' m' : 'taranıyor';
    var title = (pct >= 100 ? 'Konum verisi güncel' : 'Konum verisi güncelleniyor') + ' · ' + pct + '%';
    var neu = isNewApiary(a);
    var el = document.getElementById('saFloraBar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'saFloraBar';
      anchor.parentNode.insertBefore(el, anchor);
      el.addEventListener('click', function () {
        el.classList.toggle('is-open');
        var d = el.querySelector('.sa-flora-detail');
        if (d) {
          if (el.classList.contains('is-open')) d.removeAttribute('hidden');
          else d.setAttribute('hidden', '');
        }
      });
    }
    var open = el.classList.contains('is-open');
    el.innerHTML =
      '<div class="fs-row"><p>' + title + '</p><button type="button" class="fs-chev">' + chevronSvg() + '</button></div>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%"></div></div>' +
      '<p class="sa-under">Su ' + wd + '</p>' +
      '<p class="sa-under">Flora ' + (a && a.forageCache ? 'alındı' : 'taranıyor') + '</p>' +
      '<p class="sa-under">İklim ' + (document.querySelector('#forageHost .forage-k') ? 'alındı' : 'taranıyor') + '</p>' +
      '<div class="sa-flora-detail"' + (open ? '' : ' hidden') + '>' +
        '<p style="font-weight:800">Canlı konum</p>' +
        LIVE_STEPS.map(function (t) { return '<p>• ' + t + '</p>'; }).join('') +
        (neu ? '<p style="font-weight:800;margin-top:8px">Yeni konumda gelecekler</p>' + NEW_STEPS.map(function (t) { return '<p>• ' + t + '</p>'; }).join('') : '') +
      '</div>';
    if (open) el.classList.add('is-open');
  }
  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__hetero2 || !Y.estimateYield) return;
    var raw = Y.estimateYield;
    Y.estimateYield = function (opts) {
      opts = opts || {};
      var a = opts.apiary || apiary();
      var est = raw(opts);
      if (!est || !a) return est;
      var fac = liveFactors(a, placeBreed(a), climateDays(opts, a));
      ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
        if (est[k] != null) est[k] = kg(Number(est[k]) * fac.product);
      });
      return est;
    };
    Y.__hetero2 = true;
  }
  function start() {
    pinBreeds();
    patchYield();
    ensureUpdateBar();
    setTimeout(ensureUpdateBar, 500);
    setTimeout(ensureUpdateBar, 1600);
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
