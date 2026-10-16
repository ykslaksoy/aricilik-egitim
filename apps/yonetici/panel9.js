/* koloni-193: Yönetici · Bildirim teslimi (push_teslim; RLS yalnız admin hepsini görür). Gönderildi = push servisi kabul etti; Teslim edildi = telefon gösterdi; Başarısız = hata. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function zt(d) { return d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' TSİ' : '—'; }
  var DN = { gonderildi: ['Gönderildi', '#b54708'], teslim_edildi: ['Teslim edildi', '#15803d'], basarisiz: ['Başarısız', '#b42318'] };
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-bildirim';
  s.innerHTML = '<h2>Bildirim teslimi</h2><p class="fe-sub">Son 7 gün. «Gönderildi»: bildirim servisi kabul etti, telefon henüz onaylamadı. «Teslim edildi»: telefon bildirimi gösterdi.</p><div class="bd" style="min-height:6rem">Yükleniyor…</div>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-bildirim">Bildirim teslimi</a>');
  var bd = s.querySelector('.bd');
  function ciz(L, oz) {
    var n = { gonderildi: 0, teslim_edildi: 0, basarisiz: 0 }; L.forEach(function (x) { if (n[x.durum] != null) n[x.durum]++; });
    var ust = '<div class="bt-ozet" style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:.9rem;margin-bottom:.4rem">' + Object.keys(n).map(function (k) { return '<span><b style="color:' + DN[k][1] + '">' + n[k] + '</b> ' + DN[k][0] + '</span>'; }).join('') +
      '<span style="color:#666">Kayıtlı cihaz: ' + (oz ? oz.abonelik + ' (' + oz.kullanici + ' kullanıcı)' : 'Veri yok') + '</span></div>';
    bd.innerHTML = ust + (L.length ? L.slice(0, 25).map(function (x) {
      var d = DN[x.durum] || [x.durum, '#666'];
      return '<div class="bt-row" style="border-top:1px solid #eee;padding:.4rem 0;font-size:.85rem"><div style="display:flex;justify-content:space-between;gap:.5rem"><b>' + esc(x.baslik || '—') + '</b><span style="font-weight:700;white-space:nowrap;color:' + d[1] + '">' + d[0] + '</span></div>' +
        '<small style="color:#666">' + zt(x.created_at) + ' · ' + esc(x.kategori || '—') + ' · ' + esc(x.cihaz || 'cihaz yok') + (x.teslim_at ? ' · teslim ' + zt(x.teslim_at) : '') + (x.hata ? ' · ' + esc(x.hata) : '') + '</small></div>';
    }).join('') : '<p class="fe-empty">Son 7 günde gönderim yok.</p>');
  }
  B.client().then(function (c) {
    var since = new Date(Date.now() - 7 * 864e5).toISOString();
    return Promise.all([c.from('push_teslim').select('baslik,kategori,cihaz,durum,hata,created_at,teslim_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500), c.rpc('sa_push_ozet')]);
  }).then(function (r) {
    if (r[0].error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
    ciz(r[0].data || [], r[1].error ? null : (r[1].data || [])[0]);
  }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  window.__bildirimTeslimCiz = ciz;
})();
