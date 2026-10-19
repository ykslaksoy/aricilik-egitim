/* koloni-293/295 · Özellik kullanım takibi — hafif olay (özellik, zaman, user_id, arılık/dönem). İçerik / PII yok. Çevrimdışı kuyruk. */
(function (global) {
  'use strict';
  if (global.SuperAriKullanim) return;
  var KUYRUK = 'superari.ozellikKullanim.kuyruk.v1';
  var SEL_ARILIK = 'superari.ana.selectedApiary';
  var MAX_KUYRUK = 200;
  var FLUSH_MS = 8000;
  var flushTimer = null;
  var flushing = false;
  var sesleSarildi = false;

  function okuKuyruk() {
    try { var a = JSON.parse(global.localStorage.getItem(KUYRUK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function yazKuyruk(a) {
    try { global.localStorage.setItem(KUYRUK, JSON.stringify(a.slice(-MAX_KUYRUK))); } catch (e) { /* ignore */ }
  }

  function takipAcik() {
    var O = global.SuperAriOzellik;
    return O && typeof O.acik === 'function' ? O.acik('kullanim_takip') : true;
  }

  function seasonOfDate(date) {
    var m = /^(\d{4})-(\d{2})/.exec(String(date || '').slice(0, 10));
    if (!m) return new Date().getFullYear();
    var y = Number(m[1]);
    return Number(m[2]) <= 2 ? y - 1 : y;
  }

  var ADSIZ_KONUM = 'Adsız konum';

  function placeLabel(ap) {
    if (!ap) return '';
    var p = String(ap.place || '').trim();
    return p && p !== '—' ? p : String(ap.name || '');
  }

  function normalizeKonumAd(s) {
    var t = String(s == null ? '' : s).trim();
    return t && t !== '—' ? t : ADSIZ_KONUM;
  }

  function gocKayitYeri(g, taraf) {
    if (!g) return '';
    if (taraf === 'from') return g.fromName || (g.from && g.from.place) || '';
    return g.toName || (g.to && g.to.place) || '';
  }

  function donemEtiketKisa(tipi, sira) {
    if (tipi === 'konum' && sira) return 'Konum ' + sira;
    if (tipi === 'kislatma') return 'Kışlatma';
    return 'Belirsiz';
  }

  function konumAdiArilikte(ap, apId, d, D) {
    var cur = placeLabel(ap);
    if (!D || !D.goc || typeof D.goc.locHistory !== 'function') return normalizeKonumAd(cur);
    var hist = D.goc.locHistory(apId);
    if (!hist.length) return normalizeKonumAd(cur);
    var found = cur;
    for (var i = hist.length - 1; i >= 0; i--) {
      var h = hist[i];
      if (h && h.until && String(h.until) > d && h.place) { found = h.place; break; }
    }
    return normalizeKonumAd(found);
  }

  function konumAdiKonumda(apId, ap, list, tasi, d, D) {
    if (tasi.length) return normalizeKonumAd(gocKayitYeri(tasi[tasi.length - 1], 'to'));
    var tumTasi = list.filter(function (g) {
      return g.kind === 'tasi' && String(g.apiaryId) === apId && g.reason !== 'kislak';
    });
    for (var i = 0; i < tumTasi.length; i++) {
      if (tumTasi[i].date > d) return normalizeKonumAd(gocKayitYeri(tumTasi[i], 'from') || placeLabel(ap));
    }
    return konumAdiArilikte(ap, apId, d, D);
  }

  function apiaryById(D, id) {
    var apId = String(id || '');
    if (!apId || !D || !D.apiaries) return null;
    var aps = D.apiaries;
    for (var i = 0; i < aps.length; i++) if (String(aps[i].id) === apId) return aps[i];
    return null;
  }

  function selectedApiaryId() {
    try {
      var raw = global.localStorage.getItem(SEL_ARILIK);
      if (!raw) return null;
      if (raw.charAt(0) === '{') {
        var o = JSON.parse(raw);
        if (o && o.id != null) return String(o.id);
      }
      if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw;
    } catch (e) { /* ignore */ }
    return null;
  }

  function gocAffectsApiary(g, apId) {
    if (!g || !apId) return false;
    apId = String(apId);
    if (g.kind === 'tasi' && String(g.apiaryId) === apId) return true;
    if (String(g.fromApiaryId) === apId || String(g.toApiaryId) === apId) return true;
    return false;
  }

  /** Olay anındaki arılık ve sezon dönemi (göç / kışlatma kayıtlarından). */
  function donemBaglam(ts) {
    var iso = ts || new Date().toISOString();
    var d = iso.slice(0, 10);
    var sezonYili = seasonOfDate(d);
    var apId = selectedApiaryId();
    var D = global.SuperAriDemo;
    var ap = apId ? apiaryById(D, apId) : null;
    var arilikAd = ap ? String(ap.name || '') : null;
    var belirsiz = {
      arilik_id: apId, arilik_ad: arilikAd, sezon_yili: sezonYili,
      donem_tipi: 'belirsiz', donem_sira: null, donem_etiket: 'Belirsiz', konum_ad: ADSIZ_KONUM
    };
    if (!apId || !D || !D.goc || typeof D.goc.list !== 'function' || !ap) return belirsiz;

    var list = D.goc.list().filter(function (g) {
      return g && g.date && seasonOfDate(g.date) === sezonYili && g.date <= d && gocAffectsApiary(g, apId);
    }).sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });

    var kislak = null;
    for (var k = list.length - 1; k >= 0; k--) {
      if (list[k].reason === 'kislak') { kislak = list[k]; break; }
    }
    if (kislak) {
      var afterK = list.some(function (g) {
        return g.date > kislak.date && g.date <= d && g.kind === 'tasi' && String(g.apiaryId) === apId && g.reason !== 'kislak';
      });
      if (!afterK) {
        var kisYer = normalizeKonumAd(gocKayitYeri(kislak, 'to') || gocKayitYeri(kislak, 'from') || placeLabel(ap));
        return {
          arilik_id: apId, arilik_ad: arilikAd, sezon_yili: sezonYili,
          donem_tipi: 'kislatma', donem_sira: null,
          donem_etiket: donemEtiketKisa('kislatma', null),
          konum_ad: kisYer
        };
      }
    }

    var tasi = list.filter(function (g) {
      return g.kind === 'tasi' && String(g.apiaryId) === apId && g.reason !== 'kislak';
    });
    var idx = 1 + tasi.length;
    var yerAd = konumAdiKonumda(apId, ap, list, tasi, d, D);
    return {
      arilik_id: apId, arilik_ad: arilikAd, sezon_yili: sezonYili,
      donem_tipi: 'konum', donem_sira: idx,
      donem_etiket: donemEtiketKisa('konum', idx),
      konum_ad: yerAd
    };
  }

  function sayfaOzellik() {
    try {
      var u = new URL(global.location.href);
      var path = (u.pathname.split('/').pop() || '').toLowerCase();
      var view = (u.searchParams.get('view') || '').toLowerCase();
      if (path === 'kovanlar.html') {
        if (view === 'tarti' || u.searchParams.has('tarti')) return 'tarti';
        if (view === 'koloni') return 'koloni';
        return 'kovanlar';
      }
      if (path === 'uyarilar.html' && view === 'ogul') return 'ogul';
      if (path === 'kovan.html') return 'kovanlar';
      if (path.indexOf('rapor') === 0) return 'raporlar';
      if (path === 'hava.html' || path === 'hava-gecmis.html' || path === 'hava-raporu.html') return 'hava';
      if (path === 'goc.html') return 'tasinma_plani';
      var MAP = {
        'bakim.html': 'muayene', 'bakim-yap.html': 'muayene', 'bakim-akis.html': 'muayene', 'bakim-plan.html': 'muayene',
        'cihazlar.html': 'cihazlar', 'kamera.html': 'kamera', 'ayarlar.html': 'ayarlar', 'raporlar.html': 'raporlar'
      };
      return MAP[path] || null;
    } catch (e) { return null; }
  }

  function kuyruga(ozellik, ts) {
    if (!ozellik || !takipAcik()) return;
    var when = ts || new Date().toISOString();
    var ctx = donemBaglam(when);
    var q = okuKuyruk();
    q.push({
      ozellik: ozellik,
      olusturma: when,
      arilik_id: ctx.arilik_id,
      arilik_ad: ctx.arilik_ad,
      sezon_yili: ctx.sezon_yili,
      donem_tipi: ctx.donem_tipi,
      donem_sira: ctx.donem_sira,
      donem_etiket: ctx.donem_etiket,
      konum_ad: ctx.konum_ad
    });
    yazKuyruk(q);
    planFlush();
  }

  function planFlush() {
    if (flushTimer) return;
    flushTimer = global.setTimeout(function () { flushTimer = null; flush(); }, FLUSH_MS);
  }

  function flush() {
    if (flushing || !takipAcik()) return;
    var q = okuKuyruk();
    if (!q.length) return;
    var B = global.SuperAriBulut;
    if (!B || !B.client || global.navigator.onLine === false) return;
    flushing = true;
    B.client().then(function (c) {
      return c.auth.getUser().then(function (u) {
        var us = u && u.data && u.data.user;
        if (!us || !us.id) { flushing = false; return; }
        var batch = q.slice(0, 40).map(function (x) {
          return {
            user_id: us.id,
            ozellik: x.ozellik,
            olusturma: x.olusturma,
            arilik_id: x.arilik_id,
            arilik_ad: x.arilik_ad,
            sezon_yili: x.sezon_yili,
            donem_tipi: x.donem_tipi,
            donem_sira: x.donem_sira,
            donem_etiket: x.donem_etiket,
            konum_ad: x.konum_ad
          };
        });
        return c.from('ozellik_kullanim_olay').insert(batch).then(function (r) {
          if (r.error) return;
          yazKuyruk(q.slice(batch.length));
          if (okuKuyruk().length) planFlush();
        });
      });
    }).catch(function () { /* ignore */ }).then(function () { flushing = false; });
  }

  function sarSesle() {
    if (sesleSarildi) return;
    var S = global.SuperAriSesle;
    if (!S || typeof S.start !== 'function') return;
    sesleSarildi = true;
    var orig = S.start;
    S.start = function () {
      kuyruga('sesli_muayene');
      return orig.apply(this, arguments);
    };
  }

  function sayfaAcilis() {
    var oz = sayfaOzellik();
    if (oz) kuyruga(oz);
    sarSesle();
  }

  global.addEventListener('online', function () { planFlush(); });
  global.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState === 'hidden') flush();
  });

  function boot() {
    sayfaAcilis();
    planFlush();
    global.setInterval(flush, 60000);
    global.setInterval(sarSesle, 3000);
  }

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
  else global.setTimeout(boot, 0);

  global.SuperAriKullanim = { log: kuyruga, flush: flush, sayfaOzellik: sayfaOzellik, donemBaglam: donemBaglam, seasonOfDate: seasonOfDate };
})(typeof window !== 'undefined' ? window : globalThis);
