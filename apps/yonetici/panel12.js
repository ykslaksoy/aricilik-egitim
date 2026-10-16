/* koloni-221: Yönetici · Değişiklik kaydı — tüm hesaplar (public.sa_degisiklik). Filtre + Geri al (onaylı; geri alma da kayda yazılır; daha yeni çakışan değişiklik varsa reddedilir). */
(function () {
  'use strict';
  var B = window.SuperAriBulut, K = window.SuperAriDegisiklik, host = document.getElementById('panel'); if (!host || !K) return;
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-degisiklik';
  s.innerHTML = '<h2>Değişiklik kaydı</h2><p class="fe-sub">Arılık, kovan, kayıtlar (muayene, tartım, tedavi, besleme, hasat…), görev, stok, ana arı, fotoğraf, ekip/rol, cihaz devre dışı ve yönetici ayarı (eşik, kural aç/kapa) değişiklikleri. Kim, rol, ne zaman (TSİ), önce → sonra, kapsam.</p>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.4rem;margin:.3rem 0 .5rem">'
    + '<select data-f="tablo"><option value="">Tüm türler</option><option value="ayar">Yönetici ayarı</option><option value="apiaries">Arılık</option><option value="hives">Kovan</option><option value="queens">Ana arı</option><option value="records">Kayıt (muayene, tartım, tedavi…)</option><option value="tasks">Görev</option><option value="stock_items">Stok</option><option value="photos">Fotoğraf</option><option value="apiary_members">Ekip / rol</option><option value="cihaz_devre_disi">Cihaz</option></select>'
    + '<select data-f="islem"><option value="">Tüm işlemler</option><option value="ekle">Eklendi</option><option value="guncelle">Değiştirildi</option><option value="sil">Silindi</option><option value="geri_al">Geri alındı</option><option value="geri_yukle">Yedekten geri yüklendi</option></select>'
    + '<input data-f="kim" type="search" placeholder="E-posta"><input data-f="kapsam" type="search" placeholder="Arılık / kovan"></div>'
    + '<div class="bd" style="min-height:14rem;max-height:70vh;overflow:auto">Yükleniyor…</div><p class="fe-meta" data-dk-stat style="min-height:1.2em"></p>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-degisiklik">Değişiklik kaydı</a>');
  var ROWS = [], ORNEK = new URLSearchParams(location.search).get('demo') === '1' || !B;
  function v(k) { return (s.querySelector('[data-f="' + k + '"]').value || '').trim().toLowerCase(); }
  function paint() {
    var t = v('tablo'), i = v('islem'), k = v('kim'), kp = v('kapsam');
    var L = ROWS.filter(function (e) { return (!t || e.tablo === t) && (!i || e.islem === i) && (!k || String(e.email || '').toLowerCase().indexOf(k) >= 0) && (!kp || ((e.arilik_ad || '') + ' ' + (e.kovan_ad || '')).toLowerCase().indexOf(kp) >= 0); });
    s.querySelector('.bd').innerHTML = K.liste(L, { geriAl: true });
  }
  function stat(t) { s.querySelector('[data-dk-stat]').textContent = t || ''; }
  function ornek() {
    var n = Date.now(), H = 3600000;
    return [
      { id: 57, at: new Date(n - .5 * H).toISOString(), email: 'yonetici@superari.app', rol: 'Yönetici', tablo: 'ayar', islem: 'guncelle', once: { kuralKapali: [] , sensor: { kuluckaAcilC: 30 } }, sonra: { kuralKapali: ['nem'], sensor: { kuluckaAcilC: 30 } } },
      { id: 56, at: new Date(n - 2 * H).toISOString(), email: 'yuksel@ornek.com', rol: 'Sahip', tablo: 'cihaz_devre_disi', islem: 'guncelle', arilik_ad: 'Kayaköy Ana Arılık', kovan_ad: 'Kovan 12', once: { devre_disi: false, cihaz_ad: 'Sıcaklık/Nem' }, sonra: { devre_disi: true, cihaz_ad: 'Sıcaklık/Nem' } },
      { id: 55, at: new Date(n - 6 * H).toISOString(), email: 'ali@ornek.com', rol: 'Arıcı', tablo: 'hives', islem: 'guncelle', arilik_ad: 'Tortum', kovan_ad: 'Kovan 3', once: { name: 'Kovan 3', data: { cerceve: 8 } }, sonra: { name: 'Kovan 3', data: { cerceve: 9 } } },
      { id: 54, at: new Date(n - 30 * H).toISOString(), email: 'yuksel@ornek.com', rol: 'Sahip', tablo: 'apiary_members', islem: 'guncelle', arilik_ad: 'Cimil', once: { role: 'arici' }, sonra: { role: 'bakici' }, geri_alan: 58 }
    ];
  }
  function load() {
    if (ORNEK) { ROWS = ornek(); paint(); stat('Demo verisi'); return; }
    return B.client().then(function (c) { return c.from('sa_degisiklik').select('*').order('id', { ascending: false }).limit(500); })
      .then(function (r) { if (r.error) throw r.error; ROWS = r.data || []; paint(); stat(''); })
      .catch(function (e) { s.querySelector('.bd').innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + ((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  s.addEventListener('input', function (e) { if (e.target.matches('[data-f]')) paint(); });
  s.addEventListener('change', function (e) { if (e.target.matches('[data-f]')) paint(); });
  s.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dk-geri]'); if (!b) return;
    var id = b.getAttribute('data-dk-geri');
    if (!confirm('#' + id + ' geri alınsın mı? Önceki değer geri yüklenir; geri alma da kayda yazılır.')) return;
    if (ORNEK) { stat('Demo: geri alma yapılmaz.'); return; }
    b.disabled = true; stat('Geri alınıyor…');
    B.client().then(function (c) { return K.geriAl(c, id); }).then(function (y) {
      stat('Geri alındı (#' + y + ').'); var C = window.SuperAriDemo && window.SuperAriDemo.colony; if (C && C.ogulSkorSync) try { C.ogulSkorSync(); } catch (er) {} load();
    }).catch(function (er) { b.disabled = false; stat('Geri alınamadı: ' + K.hataMetni(er)); });
  });
  load();
})();
