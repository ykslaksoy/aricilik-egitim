/* koloni-299: Yönetici · Cihaz geçmişi — cihaz→kovan/arılık atama zaman çizelgesi (salt okunur; sensör ham arşivinden ayrı). */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel');
  if (!host) return;
  var nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function saat(t) { if (!t) return '—'; try { return new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' TSİ'; } catch (e) { return esc(t); } }
  var TUR = { atama: 'Atama', tasima: 'Taşıma', sokum: 'Söküm' };
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-cihaz-gecmis';
  s.innerHTML = '<h2>Cihaz geçmişi</h2><p class="fe-sub">Cihazın kovan ve arılık ataması, taşıması ve sökümü — <a href="#s-sensor-arsiv">Sensör arşivi</a> (ham okumalar) ve <a href="#s-cihazlar">Cihazlar › Sensör geçmişi (saklama)</a> kartından farklı. Salt okunur özet; saklama süresi sensör geçmişi kartı ile uyumlu <span class="mk-ut">uzman tahmini</span>.</p>'
    + '<label style="display:block;margin:.35rem 0"><input type="checkbox" data-cg-demo> Örnek satırları da göster</label>'
    + '<div data-cg-liste style="min-height:8rem"><p class="mk-vy">Yükleniyor…</p></div><p class="fe-meta" data-cg-stat style="min-height:1.2em"></p>';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-cihaz-gecmis">Cihaz geçmişi</a>');

  var ORNEK = new URLSearchParams(location.search).get('demo') === '1' || !B;
  var DEMO = [
    { email: 'yuksel@ornek.com', tur: 'atama', cihaz_ad: 'Tartı', tip: 'tarti', device_id: 'demo-tarti-101', arilik_ad: 'Kayaköy Ana Arılık', kovan_ad: 'Kovan 101', at: '2025-04-12T10:30:00+03:00' },
    { email: 'yuksel@ornek.com', tur: 'tasima', cihaz_ad: 'Sıcaklık/Nem', tip: 'isi_nem', device_id: 'demo-isi-118', arilik_ad: 'Kayaköy Ana Arılık', kovan_ad: 'Kovan 118', once_json: { kovan_ad: 'Kovan 102', arilik_ad: 'Kayaköy Ana Arılık' }, at: '2026-02-18T09:00:00+03:00' },
    { email: 'ali@ornek.com', tur: 'sokum', cihaz_ad: 'Kovan kamerası', tip: 'kamera_kovan', device_id: 'u-cam-x', arilik_ad: 'Tortum Yayla Arılığı', kovan_ad: 'Kovan 204', at: '2026-08-10T11:05:00+03:00' }
  ];

  function ozet(r) {
    if (r.tur === 'atama') return esc(r.kovan_ad || '—') + ' · ' + esc(r.arilik_ad || '—');
    if (r.tur === 'sokum') return 'Son: ' + esc(r.kovan_ad || '—') + ' · ' + esc(r.arilik_ad || '—');
    var o = r.once_json || {};
    return esc(o.kovan_ad || o.arilik_ad || '—') + ' → ' + esc(r.kovan_ad || '—') + ' · ' + esc(r.arilik_ad || '—');
  }

  function tablo(L) {
    if (!L.length) return '<p class="mk-vy">Kayıt yok — telefon canlı modda cihaz atama/taşıma/söküm yaptığında burada görünür.</p>';
    var rows = L.map(function (r) {
      return '<tr><td>' + saat(r.at) + '</td><td>' + esc(r.email || '—') + '</td><td>' + esc(TUR[r.tur] || r.tur) + '</td><td>' + esc(r.cihaz_ad || r.device_id) + '</td><td>' + esc(r.tip || '') + '</td><td>' + ozet(r) + '</td><td><code style="font-size:.72rem">' + esc(r.device_id) + '</code></td></tr>';
    }).join('');
    return '<div style="overflow:auto"><table class="tbl" style="width:100%;font-size:.82rem"><thead><tr><th>Zaman (TSİ)</th><th>Hesap</th><th>Olay</th><th>Cihaz</th><th>Tür</th><th>Özet</th><th>ID</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function load() {
    var box = s.querySelector('[data-cg-liste]');
    var showDemo = s.querySelector('[data-cg-demo]').checked;
    if (ORNEK) {
      box.innerHTML = tablo(showDemo ? DEMO : []) + (showDemo ? '<p class="fe-meta">Örnek veri (demo).</p>' : '');
      return;
    }
    B.client().then(function (c) { return c.rpc('sa_admin_cihaz_gecmis', { p_limit: 300 }); }).then(function (r) {
      if (r.error) throw r.error;
      var L = r.data || [];
      if (showDemo) L = DEMO.concat(L);
      box.innerHTML = tablo(L);
      s.querySelector('[data-cg-stat]').textContent = L.length ? L.length + ' kayıt' : '';
    }).catch(function (e) {
      box.innerHTML = tablo(showDemo ? DEMO : []) + '<p class="fe-meta">Bulut: ' + esc((e && e.message) || 'yüklenemedi') + (showDemo ? ' · örnek satırlar gösteriliyor' : '') + '</p>';
    });
  }
  s.querySelector('[data-cg-demo]').addEventListener('change', load);
  load();
})();
