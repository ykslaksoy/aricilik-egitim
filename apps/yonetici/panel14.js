/* koloni-241: Yönetici · Sensör arşivi — arılık başına ham arşiv (sensor-ham kovası, gzip NDJSON paketleri) boyutu / paket / okuma, günlük özet günleri.
   Saklama süreleri Ölçüm kuralları › Cihazlar › «Sensör geçmişi (saklama)» kartında (uzman tahmini; tek kaynak ogul_skor_ayar.sensor). */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!host) return;
  var nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mb(b) { b = +b || 0; return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB'; }
  function gun(d) { if (!d) return '—'; var p = String(d).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : esc(d); }
  function saat(t) { if (!t) return '—'; try { return new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' TSİ'; } catch (e) { return esc(t); } }
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-sensor-arsiv';
  s.innerHTML = '<h2>Sensör arşivi</h2><p class="fe-sub">Ham sensör okumaları (tartı, ısı/nem, ses, titreşim, giriş sayacı, pil, dış hava) telefondan sıkıştırılmış paketler hâlinde gelir ve süresiz saklanır (yazılım geliştirme için). Devre dışı cihaz okumaları da arşivlenir, işaretlidir. Saklama süreleri: <a href="#s-cihazlar">Cihazlar › Sensör geçmişi</a> <span class="mk-ut">uzman tahmini</span>.</p>'
    + '<div data-sa-liste style="min-height:6rem"><p class="mk-vy">Yükleniyor…</p></div><p class="fe-meta" data-sa-stat style="min-height:1.2em"></p>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-sensor-arsiv">Sensör arşivi</a>');
  var ORNEK = new URLSearchParams(location.search).get('demo') === '1' || !B;
  function tablo(L) {
    if (!L.length) return '<p class="mk-vy">Veri yok – henüz arşivlenmiş sensör okuması yok (telefon canlı modda ve oturum açıkken gönderir).</p>';
    var tb = 0, tk = 0, tp = 0;
    var rows = L.map(function (r) { tb += +r.bayt || 0; tk += +r.okuma || 0; tp += +r.paket || 0;
      return '<tr><td>' + esc(r.email || r.owner_id || '—') + '</td><td>' + esc(r.arilik_ad || r.arilik_id || 'Arılık geneli') + '</td><td style="text-align:right">' + mb(r.bayt) + (r.ham_bayt ? ' <small>(' + mb(r.ham_bayt) + ' ham)</small>' : '') + '</td><td style="text-align:right">' + (+r.paket || 0) + '</td><td style="text-align:right">' + (+r.okuma || 0).toLocaleString('tr-TR') + (+r.devre_disi ? ' <small>(' + r.devre_disi + ' devre dışı)</small>' : '') + '</td><td>' + gun(r.ilk_gun) + ' – ' + gun(r.son_gun) + '</td><td>' + saat(r.son_yukleme) + '</td><td style="text-align:right">' + (+r.ozet_gun || 0) + '</td></tr>'; }).join('');
    return '<div style="overflow:auto"><table class="tbl" style="width:100%;font-size:.82rem"><thead><tr><th>Hesap</th><th>Arılık</th><th>Arşiv</th><th>Paket</th><th>Okuma</th><th>Günler</th><th>Son yükleme</th><th>Özet (kovan×gün)</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<p class="fe-meta">Toplam ' + mb(tb) + ' · ' + tp + ' paket · ' + tk.toLocaleString('tr-TR') + ' okuma</p>';
  }
  function load() {
    var box = s.querySelector('[data-sa-liste]');
    if (ORNEK) { var n = new Date(); box.innerHTML = tablo([{ email: 'ykslaksoy@gmail.com', arilik_ad: 'Yayla arılığı', bayt: 3.4 * 1048576, ham_bayt: 21 * 1048576, paket: 64, okuma: 182400, devre_disi: 120, ilk_gun: new Date(n - 30 * 864e5).toISOString(), son_gun: n.toISOString(), son_yukleme: n.toISOString(), ozet_gun: 900 }]) + '<p class="fe-meta">Örnek veri (demo).</p>'; return; }
    B.client().then(function (c) { return c.rpc('sa_admin_sensor_arsiv'); }).then(function (r) { if (r.error) throw r.error; box.innerHTML = tablo(r.data || []); })
      .catch(function (e) { box.innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + esc((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  load();
})();
