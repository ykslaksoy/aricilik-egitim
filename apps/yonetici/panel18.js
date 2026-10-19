/* koloni-293: Yönetici · Özellik kullanımı (sa_ozellik_kullanim_ozet RPC) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tr(d) { return d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' TSİ' : 'Veri yok'; }
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-kullanim';
  s.innerHTML = '<h2>Özellik kullanımı</h2><p class="fe-sub">Son 7 ve 30 günde özellik açılışları (yalnız sayım; içerik kaydedilmez). Kapatma: <a href="#s-ozellik">Özellik açma/kapama</a> › Özellik kullanım takibi.</p><div class="bd">Yükleniyor…</div>';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-kullanim">Özellik kullanımı</a>');
  var bd = s.querySelector('.bd');

  function ciz(rows) {
    if (!rows || !rows.length) {
      bd.innerHTML = '<p class="fe-empty">Veri yok</p>';
      return;
    }
    var sorted = rows.slice().sort(function (a, b) {
      var d = (Number(b.acilis_30) || 0) - (Number(a.acilis_30) || 0);
      if (d) return d;
      d = (Number(b.acilis_7) || 0) - (Number(a.acilis_7) || 0);
      if (d) return d;
      return (Number(a.sira) || 0) - (Number(b.sira) || 0);
    });
    bd.innerHTML = '<p class="fe-sub">' + sorted.length + ' özellik · en çok kullanılan üstte</p>' + sorted.map(function (x) {
      var s7 = x.acilis_7 == null ? 'Veri yok' : String(x.acilis_7);
      var s30 = x.acilis_30 == null ? 'Veri yok' : String(x.acilis_30);
      var u7 = x.kullanici_7 == null ? 'Veri yok' : String(x.kullanici_7);
      var u30 = x.kullanici_30 == null ? 'Veri yok' : String(x.kullanici_30);
      return '<div style="border-top:1px solid #eee;padding:.55rem 0">' +
        '<b>' + esc(x.ad || x.ozellik) + '</b>' +
        '<div style="font-size:.85rem;color:#555;margin-top:.2rem">' + esc(x.aciklama || '') + '</div>' +
        '<div style="font-size:.82rem;color:#444;margin-top:.35rem;display:grid;gap:.15rem">' +
        '<span>7 gün: <b>' + esc(s7) + '</b> açılış · <b>' + esc(u7) + '</b> farklı kullanıcı</span>' +
        '<span>30 gün: <b>' + esc(s30) + '</b> açılış · <b>' + esc(u30) + '</b> farklı kullanıcı</span>' +
        '<span>Son kullanım: ' + esc(tr(x.son_kullanim)) + '</span></div></div>';
    }).join('');
  }

  B.client().then(function (c) {
    return c.rpc('sa_ozellik_kullanim_ozet');
  }).then(function (r) {
    if (r.error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
    ciz(r.data || []);
  }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
})();
