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
  /* Sis/çise: Kafkas toplar (ceza yok, hafif artı). Karniyol kapalı kalır + stoğu yer. */
  function liveFactors(apiary, hiveBreed) {
    var fog = foggyPlace(apiary);
    var key = breedKey(hiveBreed || placeBreed(apiary));
    var breedF = 1;
    var fogF = 1;
    var eatF = 1;
    if (key === 'karniyol') {
      breedF = fog ? 0.88 : 1.08;
      if (fog) {
        fogF = 0.9;
        eatF = 0.92;
      }
    } else if (key === 'kafkas' || key === 'kafkas_karadeniz') {
      breedF = fog ? 1.14 : 0.97;
      fogF = 1;
      eatF = 1;
    } else if (key === 'kafkas_karniyol') {
      breedF = fog ? 1.02 : 1.06;
      if (fog) fogF = 0.97;
    } else if (key === 'mugla') {
      breedF = fog ? 0.86 : 1.05;
      if (fog) {
        fogF = 0.9;
        eatF = 0.92;
      }
    }
    var product = Math.round(breedF * fogF * eatF * 1000) / 1000;
    return { fog: fog, key: key, breedF: breedF, fogF: fogF, eatF: eatF, product: product };
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
      c.irk = want;
      return c;
    });
    if (changed) {
      try { D.saveHives(next); } catch (e2) {}
    }
  }

  function apiary() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return null;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) {
      if (id && String(list[i].id) === String(id)) return list[i];
    }
    return list[0] || null;
  }

  function patchYield() {
    var Y = global.SuperAriForageYield;
    if (!Y || Y.__liveBreed2) return;
    if (Y.estimateYield) {
      var raw = Y.estimateYield;
      Y.estimateYield = function (opts) {
        opts = opts || {};
        var a = opts.apiary || apiary();
        var est = raw(opts);
        if (!est || !a) return est;
        var fac = liveFactors(a, placeBreed(a));
        ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
          if (est[k] != null) est[k] = kg(Number(est[k]) * fac.product);
        });
        var mid = est.kgPerHive != null ? est.kgPerHive : est.midKg;
        var n = est.n || (a && a.hiveCount) || 0;
        if (mid != null && n) est.totalKg = kg(mid * n);
        var karniyolIf = mid != null ? kg(Number(mid) / fac.product * liveFactors(a, 'Karniyol').product) : null;
        est.why = est.why || [];
        est.why.push({ k: 'İrk', v: placeBreed(a) + ' · çarpan ' + fac.breedF + ' (canlı)' });
        if (fac.key === 'kafkas' || fac.key === 'kafkas_karadeniz') {
          est.why.push({
            k: 'Sis · çiseleme',
            v: 'Kafkas uçtu, nektar aldı · yemedi · ceza yok'
          });
        } else if (fac.fog && fac.key === 'karniyol') {
          est.why.push({
            k: 'Sis · çiseleme',
            v: 'Karniyol kovanda kaldı + stoğu yedi · çarpan ' + kg(fac.fogF * fac.eatF)
          });
        }
        if (karniyolIf != null && fac.key !== 'karniyol') {
          est.why.push({ k: 'Karniyol olsaydı', v: karniyolIf + ' kg/kovan (kapalı + yedi)' });
        }
        global.__saLastEst = est;
        return est;
      };
    }
    if (Y.findMismatchedHives) {
      var rawM = Y.findMismatchedHives;
      Y.findMismatchedHives = function (opts) {
        var pack = rawM(opts) || { items: [] };
        var a = (opts && opts.apiary) || apiary();
        var fac = liveFactors(a, placeBreed(a));
        if (fac.key === 'kafkas' || fac.key === 'kafkas_karadeniz' || fac.key === 'mugla') {
          pack.items = (pack.items || []).filter(function (it) {
            return !(it.reasonTr && /Karniyol/.test(it.reasonTr));
          });
          pack.tipTr = placeBreed(a) + ' bu iklime uygun.';
        }
        return pack;
      };
    }
    Y.__liveBreed2 = true;
  }

  function start() {
    pinBreeds();
    patchYield();
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
