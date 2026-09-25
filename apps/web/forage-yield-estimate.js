(function (global) {
  var SRC_Y =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';

  var BREED_BY_ID = {
    a1: 'Muğla Arısı',
    a2: 'Karniyol',
    a3: 'Kafkas × Karniyol',
    a4: 'Kafkas',
    a5: 'Kafkas × Karadeniz'
  };
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
    var s = String((a && (a.name || '')) + ' ' + (a && (a.place || '')) + ' ' + (a && (a.il || ''))).toLocaleLowerCase('tr');
    return /yanık|yanik|cimil|rize|çayeli|ikizdere/.test(s);
  }
  function breedKey(label) {
    var s = String(label || '').toLocaleLowerCase('tr');
    if (s.indexOf('muğla') !== -1 || s.indexOf('mugla') !== -1) return 'mugla';
    if (s.indexOf('kafkas') !== -1 && s.indexOf('karadeniz') !== -1) return 'kafkas_karadeniz';
    if (s.indexOf('kafkas') !== -1 && (s.indexOf('karn') !== -1 || s.indexOf('×') !== -1)) return 'kafkas_karniyol';
    if (s.indexOf('kafkas') !== -1) return 'kafkas';
    if (s.indexOf('karniyol') !== -1 || s.indexOf('carn') !== -1) return 'karniyol';
    return s;
  }
  function climateDays(opts, apiary) {
    var site = (opts && opts.site) || {};
    var analysis = (opts && opts.analysis) || (apiary && apiary.forageCache && apiary.forageCache.payload) || {};
    var here = analysis.here || analysis;
    var flight = analysis.flight || {};
    var season =
      Number(flight.seasonDayCount || here.seasonDayCount || site.seasonDayCount || SEASON_DAYS_DEFAULT) ||
      SEASON_DAYS_DEFAULT;
    var poor = Number(flight.poorFlightDays != null ? flight.poorFlightDays : here.poorFlightDays);
    var precipDays = Number(flight.precipDays != null ? flight.precipDays : here.precipDays || site.precipDays);
    var drizzle;
    if (isFinite(precipDays) && isFinite(poor)) drizzle = Math.max(0, precipDays - poor);
    else if (isFinite(precipDays)) drizzle = Math.round(precipDays * 0.45);
    else if (foggyPlace(apiary)) drizzle = 45;
    else drizzle = 0;
    if (!isFinite(season) || season < 30) season = SEASON_DAYS_DEFAULT;
    if (drizzle > season) drizzle = season;
    return { season: Math.round(season), drizzle: Math.round(drizzle), poor: isFinite(poor) ? Math.round(poor) : null, precipDays: isFinite(precipDays) ? Math.round(precipDays) : null };
  }
  function liveFactors(apiary, hiveBreed, days) {
    days = days || { season: SEASON_DAYS_DEFAULT, drizzle: foggyPlace(apiary) ? 45 : 0 };
    var key = breedKey(hiveBreed || placeBreed(apiary));
    var S = days.season;
    var D = days.drizzle;
    var share = S ? D / S : 0;
    var breedF = 1, flyF = 1, eatF = 1, note = '';
    if (key === 'karniyol') {
      breedF = foggyPlace(apiary) ? 1 : 1.08;
      flyF = 1 - share;
      eatF = Math.max(0.82, 1 - 0.0018 * D);
      note = 'Karniyol ' + D + '/' + S + ' gün kapalı + stoğu yedi';
    } else if (key === 'kafkas' || key === 'kafkas_karadeniz') {
      breedF = foggyPlace(apiary) ? 1.08 : 0.97;
      flyF = 1 - share * 0.25;
      eatF = 1;
      note = 'Kafkas ' + D + '/' + S + ' çise gününde de topladı, yemedi';
    } else if (key === 'kafkas_karniyol') {
      breedF = 1.04;
      flyF = 1 - share * 0.55;
      eatF = Math.max(0.9, 1 - 0.0008 * D);
      note = 'Melez ' + D + '/' + S + ' gün kısmi uçuş';
    } else if (key === 'mugla') {
      breedF = foggyPlace(apiary) ? 0.95 : 1.05;
      flyF = 1 - share;
      eatF = Math.max(0.82, 1 - 0.0018 * D);
      note = 'Muğla ıslak günlerde zayıf';
    }
    return {
      key: key,
      breedF: Math.round(breedF * 1000) / 1000,
      flyF: Math.round(flyF * 1000) / 1000,
      eatF: Math.round(eatF * 1000) / 1000,
      product: Math.round(breedF * flyF * eatF * 1000) / 1000,
      days: days,
      note: note
    };
  }
  function kg(n) {
    return n == null || !isFinite(Number(n)) ? null : Math.round(Number(n) * 10) / 10;
  }
  function pinBreeds() {
    var D = global.D || global.SuperAriDemo;
    if (!D) return;
    var apiaries = D.loadApiaries ? D.loadApiaries() || [] : [];
    var byId = {};
    apiaries.forEach(function (a) {
      if (!a) return;
      var b = placeBreed(a);
      if (b && D.updateApiary) {
        try { D.updateApiary(a.id, { breed: b, defaultBreed: b }); } catch (e) {}
      }
      byId[String(a.id)] = b;
    });
    if (!D.loadHives || !D.saveHives) return;
    var hives = D.loadHives() || [];
    var changed = false;
    var next = hives.map(function (h) {
      if (!h) return h;
      var want = byId[String(h.apiaryId)] || '';
      if (!want || String(h.breed || '') === want) return h;
      changed = true;
      var c = {};
      for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) c[k] = h[k];
      c.breed = want;
      return c;
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

  function ensureUpdateBar() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('saFloraBarCss')) {
      var s = document.createElement('style');
      s.id = 'saFloraBarCss';
      s.textContent =
        '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
        '#saFloraBar .fs-row{display:flex;align-items:center;gap:8px;}' +
        '#saFloraBar .fs-row p{margin:0;flex:1;font-size:12px;font-weight:700;color:#2c4a22;}' +
        '#saFloraBar .track{height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;margin-top:6px;}' +
        '#saFloraBar .fill{height:100%;width:70%;background:#3d9a4a;}' +
        '#saFloraBar .fs-chev{border:0;background:transparent;color:#4a6b3a;font-size:16px;}' +
        '#saFloraBar.is-open .fs-chev{transform:rotate(90deg);}' +
        '#saFloraBar .sa-flora-detail{display:none;margin-top:8px;font-size:12px;color:#2c4a22;line-height:1.45;}' +
        '#saFloraBar.is-open .sa-flora-detail{display:block;}';
      document.head.appendChild(s);
    }
    if (document.getElementById('saFloraBar')) return;
    var forage = document.getElementById('forageRadius');
    var anchor =
      (forage && (forage.closest('.fs-block') || forage.parentNode)) ||
      document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    var el = document.createElement('div');
    el.id = 'saFloraBar';
    el.innerHTML =
      '<div class="fs-row"><p>Veri güncelleniyor · Flora taranıyor</p><button type="button" class="fs-chev" aria-label="Detay">›</button></div>' +
      '<div class="track"><div class="fill"></div></div>' +
      '<div class="sa-flora-detail" hidden>' +
        '<p>Su kaynağı bulundu · 240 m</p>' +
        '<p>Flora taranıyor</p>' +
        '<p>İrk ve sis günü hedefe işlenir</p>' +
      '</div>';
    el.addEventListener('click', function () {
      var open = !el.classList.contains('is-open');
      el.classList.toggle('is-open', open);
      var d = el.querySelector('.sa-flora-detail');
      if (d) {
        if (open) d.removeAttribute('hidden');
        else d.setAttribute('hidden', '');
      }
    });
    anchor.parentNode.insertBefore(el, anchor);
  }

  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__dayFormula) return;
    if (Y.estimateYield) {
      var raw = Y.estimateYield;
      Y.estimateYield = function (opts) {
        opts = opts || {};
        var a = opts.apiary || apiary();
        var est = raw(opts);
        if (!est || !a) return est;
        var days = climateDays(opts, a);
        var fac = liveFactors(a, placeBreed(a), days);
        ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
          if (est[k] != null) est[k] = kg(Number(est[k]) * fac.product);
        });
        var mid = est.kgPerHive != null ? est.kgPerHive : est.midKg;
        var n = est.n || (a && a.hiveCount) || 0;
        if (mid != null && n) est.totalKg = kg(mid * n);
        var altK = liveFactors(a, 'Karniyol', days);
        var karniyolKg = mid != null ? kg(Number(mid) / fac.product * altK.product) : null;
        est.why = est.why || [];
        est.why.push({
          k: 'İrk formül',
          v: placeBreed(a) + ' · ırk ' + fac.breedF + ' × uçuş ' + fac.flyF + ' × stok ' + fac.eatF + ' = ' + fac.product
        });
        est.why.push({
          k: 'Çise / sis günü',
          v: days.drizzle + ' / ' + days.season + ' gün' + (days.precipDays != null ? ' · yağışlı ' + days.precipDays : '')
        });
        est.why.push({ k: 'Uçuş notu', v: fac.note });
        if (karniyolKg != null && fac.key !== 'karniyol') {
          est.why.push({ k: 'Karniyol olsaydı', v: karniyolKg + ' kg/kovan (kapalı + yedi)' });
        }
        est.liveFactors = fac;
        global.__saLastEst = est;
        return est;
      };
    }
    Y.__dayFormula = true;
  }

  function start() {
    pinBreeds();
    patchYield();
    ensureUpdateBar();
    setTimeout(ensureUpdateBar, 400);
    setTimeout(ensureUpdateBar, 1400);
    setTimeout(pinBreeds, 600);
  }
  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) start();
  else {
    var s = document.createElement('script');
    s.src = SRC_Y;
    s.onload = start;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(start, 800);
  }
  document.addEventListener('superari:apiary-saved', start);
})(window);
