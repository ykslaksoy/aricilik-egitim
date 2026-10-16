/* koloni-192 · Özellik bayrakları (ozellik_bayraklari; yönetici açar/kapatır, uygulama yalnız okur).
 * Karar önbellekten eşzamanlı verilir (ekran zıplamaz); arka planda tazelenir, yeni değer bir sonraki açılışta geçer.
 * Kapalı modül: giriş linki «Yakında» sayfası açar; sayfaya doğrudan gelinirse sabit katman (yerleşimi kaydırmaz). */
(function (global) {
  'use strict';
  if (global.SuperAriOzellik) return;
  var KEY = 'superari.ozellik.v1', doc = global.document;
  var VARSAYILAN = { stok: true, qr_etiket: true, foto_analiz: true, bildirim: true };
  var AD = { stok: 'Stok', qr_etiket: 'iPhone QR etiket', foto_analiz: 'Çerçeve Fotoğraf Analizi', bildirim: 'Bildirimler' };
  var KURAL = [ // [anahtar, url testi]
    ['stok', function (u) { return /(^|\/)stok\.html$/.test(u.pathname); }],
    ['qr_etiket', function (u) { return /(^|\/)qr-etiket\.html$/.test(u.pathname); }],
    ['foto_analiz', function (u) { return /(^|\/)koloni-ek\.html$/.test(u.pathname) && u.searchParams.get('ek') === 'foto'; }]
  ];
  function oku() { try { return JSON.parse(global.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function acik(k) { var c = oku(); return Object.prototype.hasOwnProperty.call(c, k) ? !!c[k] : (Object.prototype.hasOwnProperty.call(VARSAYILAN, k) ? VARSAYILAN[k] : false); }
  function kuralBul(href) { try { var u = new URL(href, global.location.href); for (var i = 0; i < KURAL.length; i++) if (KURAL[i][1](u)) return KURAL[i][0]; } catch (e) {} return null; }
  function yakinda(k) {
    if (doc.getElementById('saOzYakinda')) return;
    var d = doc.createElement('div'); d.id = 'saOzYakinda'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(30,20,8,.45);display:flex;align-items:flex-end;justify-content:center;';
    d.innerHTML = '<div style="background:#fffaf0;width:100%;max-width:430px;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font-family:inherit">' +
      '<b style="font-size:17px">' + (AD[k] || 'Bu bölüm') + '</b><p style="margin:.4rem 0 .9rem;color:#5b4a33">Bu bölüm yakında. Henüz kayıt tutulmuyor ve örnek veri gösterilmiyor.</p>' +
      '<button type="button" style="width:100%;min-height:44px;border:0;border-radius:12px;background:#7a5a32;color:#fff;font-weight:800">Tamam</button></div>';
    d.querySelector('button').onclick = function () { if (kuralBul(global.location.href) === k) { if (global.history.length > 1) global.history.back(); else global.location.href = 'ana.html'; } else d.remove(); };
    (doc.body || doc.documentElement).appendChild(d);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    var k = kuralBul(a.getAttribute('href')); if (k && !acik(k)) { e.preventDefault(); e.stopPropagation(); yakinda(k); }
  }, true);
  function sayfaKontrol() { var k = kuralBul(global.location.href); if (k && !acik(k)) yakinda(k); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', sayfaKontrol); else sayfaKontrol();
  function tazele() {
    if (!global.fetch) return;
    global.fetch('/api/supabase-config').then(function (r) { return r.json(); }).then(function (c) {
      if (!c || !c.enabled || !c.url || !c.anonKey) return null;
      return global.fetch(c.url + '/rest/v1/ozellik_bayraklari?select=anahtar,acik', { headers: { apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey } }).then(function (r) { return r.ok ? r.json() : null; });
    }).then(function (rows) {
      if (!rows || !rows.length) return; var o = {}; rows.forEach(function (r) { o[r.anahtar] = !!r.acik; });
      try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    }).catch(function () {});
  }
  global.SuperAriOzellik = { acik: acik, kuralBul: kuralBul, yakinda: yakinda, tazele: tazele, VARSAYILAN: VARSAYILAN };
  global.setTimeout(tazele, 1500);
})(window);
