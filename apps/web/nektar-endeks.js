/* koloni-299 (önizleme): Günlük tarlacı aktivitesi + nektar akışı endeksi (0–100).
   Tartı «Nektar akımı» döşemesi ve oğul skoru nektar bayrağından ayrı; hava sayfası «Nektar akımı» hava tahmini değil.
   Eşikler: yönetici › Ölçüm kuralları › Günlük endeks (ORS_SENSOR); kaynaksız → uzman tahmini. */
(function (global) {
  'use strict';
  if (global.SuperAriNektarEndeks) return;

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function gunBas(key) {
    var p = String(key || todayKey()).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d == null ? null : d); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function md(a) {
    a = (a || []).filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; });
    return a.length ? a[Math.floor(a.length / 2)] : null;
  }
  function thresholds() {
    var D = global.SuperAriDemo, C = D && D.colony, T = {};
    try { T = Object.assign({}, (C && C.ORS_SENSOR) || {}, ((C && C.ogulSkor && C.ogulSkor()) || {}).sensor || {}); } catch (e) { T = {}; }
    return {
      irTam: num(T.endeksIrTam, 600) || 600,
      nektarTamKg: num(T.endeksNektarTamKg, 1.5) || 1.5,
      tabanGun: Math.max(1, Math.round(num(T.endeksIrTabanGun, 7) || 7)),
      havaCarpan: clamp(num(T.endeksHavaCarpan, 0.35) || 0.35, 0, 1),
      wTar: num(T.endeksAgirlikTar, 50) || 50,
      wNek: num(T.endeksAgirlikNektar, 50) || 50
    };
  }
  function scorePct(val, tam) {
    if (val == null || !isFinite(val) || !isFinite(tam) || tam <= 0) return null;
    return Math.round(clamp(val / tam * 100, 0, 100));
  }
  function ozetGun(S, gun, C, T) {
    if (!S || !C) return null;
    var oz = null;
    try {
      if (S.gunluk && S.gunluk[gun]) oz = S.gunluk[gun];
      else if (C.ozGun) oz = C.ozGun(S, gunBas(gun) + 12 * 3600000);
    } catch (e) { oz = null; }
    if (oz) return oz;
    try {
      if (C.gunlukOzetHesapla && S) {
        var R = { tarti: S.tarti || [], ir: S.ir || [], dis_isi_nem: S.dis || S.dis_isi_nem || [], isi_nem: S.isi_nem || [], titresim: S.titresim || [], ses: S.ses || [] };
        return C.gunlukOzetHesapla(R, gunBas(gun), T);
      }
    } catch (e2) { /* */ }
    return null;
  }
  function irTaban(S, gun, T, C) {
    var tab = [], i;
    for (i = 1; i <= T.tabanGun; i++) {
      var k = new Date(gunBas(gun) - i * 86400000);
      var gk = k.getFullYear() + '-' + String(k.getMonth() + 1).padStart(2, '0') + '-' + String(k.getDate()).padStart(2, '0');
      var oz = ozetGun(S, gk, C, T);
      if (oz && oz.irCikan != null && isFinite(oz.irCikan)) tab.push(Number(oz.irCikan));
    }
    return md(tab);
  }
  function tartiGunlukKg(h, S, oz, live, TE) {
    if (oz && oz.kgNet != null && isFinite(oz.kgNet)) return Number(oz.kgNet);
    if (live && TE && TE.series) {
      var se = TE.series(h.id, 2) || [];
      if (se.length >= 2) {
        var a = se[se.length - 2], b = se[se.length - 1];
        var days = (Date.parse(String(b.at).length <= 16 ? b.at + ':00' : b.at) - Date.parse(String(a.at).length <= 16 ? a.at + ':00' : a.at)) / 86400000;
        if (days >= 0.4) return (Number(b.net) - Number(a.net)) / days;
      }
    }
    if (!live && h && isFinite(Number(h.deltaKg))) return Number(h.deltaKg);
    return null;
  }
  function hiveDay(h, opts) {
    opts = opts || {};
    var gun = opts.gun || todayKey();
    var D = global.SuperAriDemo, C = D && D.colony, TE = global.SuperAriTarti;
    var live = false;
    try { live = global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { live = false; }
    var T = thresholds(), now = opts.now || Date.now();
    var out = { hiveId: h.id, gun: gun, tarlaci: null, nektar: null, birlesik: null, havaUygun: null, kaynak: [], demo: !live };
    var S = null;
    try { S = C && C.hiveSens ? C.hiveSens(h.id, now) : null; } catch (eS) { S = null; }
    var oz = ozetGun(S, gun, C, Object.assign({}, (C && C.ORS_SENSOR) || {}, ((C && C.ogulSkor && C.ogulSkor()) || {}).sensor || {}));
    if (oz && oz.sabahUygun != null) out.havaUygun = !!oz.sabahUygun;
    var irOut = oz && oz.irCikan != null ? Number(oz.irCikan) : null;
    if (irOut == null && !live && h) irOut = clamp((Number(h.deltaKg) || 0) * 180 + 120, 0, 2000);
    if (irOut != null) {
      var tab = irTaban(S, gun, T, C);
      var ref = tab != null && tab > 0 ? tab : T.irTam;
      out.tarlaci = scorePct(irOut, ref);
      out.kaynak.push(tab != null ? 'giriş sayacı (tabana göre)' : 'giriş sayacı');
      out.irCikan = irOut;
    }
    var kg = tartiGunlukKg(h, S, oz, live, TE);
    if (kg != null) {
      out.nektar = scorePct(Math.max(0, kg), T.nektarTamKg);
      out.kaynak.push(live ? 'tartı' : (isFinite(Number(h.deltaKg)) ? 'örnek tartı' : 'tartı'));
      out.kgGun = kg;
    }
    var hava = out.havaUygun;
    if (hava === false) {
      if (out.tarlaci != null) out.tarlaci = Math.round(out.tarlaci * T.havaCarpan);
      if (out.nektar != null) out.nektar = Math.round(out.nektar * T.havaCarpan);
      out.kaynak.push('dış hava düzeltmesi');
    }
    var wT = out.tarlaci != null ? T.wTar : 0, wN = out.nektar != null ? T.wNek : 0, wSum = wT + wN;
    if (wSum > 0) out.birlesik = Math.round((wT * (out.tarlaci || 0) + wN * (out.nektar || 0)) / wSum);
    return out;
  }
  function etiket(p) {
    if (p == null) return '—';
    if (p >= 70) return 'yüksek';
    if (p >= 40) return 'orta';
    return 'düşük';
  }
  function apiarySummary(apiaryId, opts) {
    var D = global.SuperAriDemo;
    if (!D) return { gun: todayKey(), n: 0, tarlaci: null, nektar: null, birlesik: null, veri: 0, hives: [] };
    var hs = (D.hivesForApiary && D.hivesForApiary(apiaryId)) || (D.loadHives && D.loadHives().filter(function (h) { return String(h.apiaryId) === String(apiaryId); })) || [];
    var rows = hs.map(function (h) { return hiveDay(h, opts); });
    function ort(f) {
      var v = rows.map(f).filter(function (x) { return x != null && isFinite(x); });
      return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null;
    }
    return {
      gun: (opts && opts.gun) || todayKey(),
      apiaryId: apiaryId,
      n: hs.length,
      veri: rows.filter(function (r) { return r.tarlaci != null || r.nektar != null; }).length,
      tarlaci: ort(function (r) { return r.tarlaci; }),
      nektar: ort(function (r) { return r.nektar; }),
      birlesik: ort(function (r) { return r.birlesik; }),
      havaUygun: rows.some(function (r) { return r.havaUygun === true; }) ? true : (rows.some(function (r) { return r.havaUygun === false; }) ? false : null),
      hives: rows
    };
  }
  function cardHtml(summary, opts) {
    opts = opts || {};
    if (!summary || !summary.n) {
      return '<section class="nektar-endeks-card" aria-labelledby="nektarEndeksH"><h2 id="nektarEndeksH">🐝 Günlük aktivite ve nektar endeksi</h2><p class="nektar-endeks-sub">Bu arılıkta kovan yok.</p></section>';
    }
    var s = summary, tone = function (p) { return p == null ? '' : (p >= 70 ? ' hi' : (p >= 40 ? ' mid' : ' lo')); };
    var notHava = s.havaUygun === false ? '<p class="nektar-endeks-note">Uçuş için zayıf hava — endeks düşürüldü (uzman tahmini).</p>' : '';
    var veri = s.veri ? (s.veri + '/' + s.n + ' kovan sensör/örnek verisi') : 'Sensör verisi yok — tartı ve giriş sayacı ekleyin';
    return '<section class="nektar-endeks-card" aria-labelledby="nektarEndeksH">' +
      '<div class="nektar-endeks-head"><h2 id="nektarEndeksH">🐝 Günlük aktivite ve nektar endeksi</h2><span class="nektar-endeks-gun">' + esc(s.gun) + '</span></div>' +
      '<p class="nektar-endeks-sub">Tarlacı (giriş sayacı) ve nektar akışı (tartı günlük değişim). Hava «Nektar akımı» tahmini değil · Tartı «Nektar akımı» döşemesi ayrı.</p>' +
      '<div class="nektar-endeks-grid">' +
      '<div class="nektar-endeks-stat' + tone(s.tarlaci) + '"><div class="k">Tarlacı aktivitesi</div><div class="v">' + (s.tarlaci != null ? s.tarlaci : '—') + '</div><div class="t">' + esc(etiket(s.tarlaci)) + '</div></div>' +
      '<div class="nektar-endeks-stat' + tone(s.nektar) + '"><div class="k">Nektar akışı</div><div class="v">' + (s.nektar != null ? s.nektar : '—') + '</div><div class="t">' + esc(etiket(s.nektar)) + '</div></div>' +
      '<div class="nektar-endeks-stat birlesik' + tone(s.birlesik) + '"><div class="k">Birleşik endeks</div><div class="v">' + (s.birlesik != null ? s.birlesik : '—') + '</div><div class="t">' + esc(etiket(s.birlesik)) + '</div></div>' +
      '</div>' + notHava +
      '<p class="nektar-endeks-meta">' + esc(veri) + ' · Eşikler: yönetici › Ölçüm kuralları › Günlük endeks <span class="muted">(uzman tahmini)</span></p>' +
      (opts.compact ? '' : '') +
      '</section>';
  }

  global.SuperAriNektarEndeks = {
    todayKey: todayKey,
    thresholds: thresholds,
    hiveDay: hiveDay,
    apiarySummary: apiarySummary,
    cardHtml: cardHtml,
    etiket: etiket
  };
})(typeof window !== 'undefined' ? window : global);
