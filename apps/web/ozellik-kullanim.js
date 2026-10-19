/* koloni-293 · Özellik kullanım takibi — hafif olay (özellik, zaman, user_id). İçerik / PII yok. Çevrimdışı kuyruk. */
(function (global) {
  'use strict';
  if (global.SuperAriKullanim) return;
  var KUYRUK = 'superari.ozellikKullanim.kuyruk.v1';
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
    var q = okuKuyruk();
    q.push({ ozellik: ozellik, olusturma: ts || new Date().toISOString() });
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
          return { user_id: us.id, ozellik: x.ozellik, olusturma: x.olusturma };
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

  global.SuperAriKullanim = { log: kuyruga, flush: flush, sayfaOzellik: sayfaOzellik };
})(typeof window !== 'undefined' ? window : globalThis);
