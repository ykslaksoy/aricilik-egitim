/* koloni-188+: Yönetici · Otomatik Takip (tablo otomatik_takip + cevre_kuyruk özeti; RLS yalnız admin) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SN = { basarili: ['Başarılı', '#15803d'], hata: ['Hata', '#b42318'], bekliyor: ['Bekliyor', '#b54708'] };
  function zt(d) { return d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' TSİ' : 'Veri yok'; }
  function kuyrukOzet(K) {
    if (!K || !K.length) return null;
    var hata = K.filter(function (x) { return x.durum === 'hata'; }), bek = K.filter(function (x) { return x.durum === 'bekliyor' || x.durum === 'isleniyor'; });
    var son = K.map(function (x) { return x.bitti || null; }).filter(Boolean).sort().pop() || null;
    var acik = hata.concat(bek).map(function (x) { return x.sonraki; }).filter(Boolean).sort()[0] || null;
    return { son_deneme: son, sonuc: hata.length ? 'hata' : bek.length ? 'bekliyor' : 'basarili', sonraki_deneme: acik,
      ek: bek.length + ' bekliyor · ' + hata.length + ' hata · ' + K.filter(function (x) { return x.durum === 'tamam'; }).length + ' tamam' };
  }
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-otomatik';
  s.innerHTML = '<h2>Otomatik Takip</h2><p class="fe-sub">Belirli aralıklarla kendiliğinden çalışan işler. Bilinmeyen değer «Veri yok».</p><div class="bd">Yükleniyor…</div>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-otomatik">Otomatik Takip</a>');
  var bd = s.querySelector('.bd');
  function kaynakMi(x) { return /kaynak aran|kaynak zay/i.test((x.baslik || '') + ' ' + (x.aciklama || '')); }
  function liste(Y) {
    if (!Y) return '<div style="font-size:.85rem;color:#555">Maddeler: Veri yok</div>';
    return '<details style="margin-top:.3rem"><summary style="cursor:pointer;font-size:.85rem"><b>' + Y.length + '</b> madde kaynak bekliyor</summary><ul style="margin:.3rem 0;padding-left:1.1rem;font-size:.8rem">' +
      Y.map(function (y) { return '<li>' + y.id + '. ' + esc(y.baslik) + ' — <span style="color:#666">son arama: ' + (y.son_arama ? zt(y.son_arama) : 'Veri yok') + ' · sonuç: ' + esc(y.arama_sonuc || 'Veri yok') + '</span></li>'; }).join('') + '</ul></details>';
  }
  function ciz(T, K, Y) {
    var oz = kuyrukOzet(K);
    bd.innerHTML = T.length ? T.map(function (x) {
      var ek = '';
      if (x.id === 'cevre-kuyruk') { if (oz) { x = Object.assign({}, x, { son_deneme: oz.son_deneme, sonuc: oz.sonuc, sonraki_deneme: oz.sonraki_deneme }); ek = ' · ' + oz.ek; } else x = Object.assign({}, x, { sonuc: null }); }
      var d = SN[x.sonuc];
      return '<div class="ot-row" style="border-top:1px solid #eee;padding:.5rem 0"><div style="display:flex;justify-content:space-between;gap:.5rem"><b>' + esc(x.ad) + '</b><span style="font-weight:700;white-space:nowrap;color:' + (d ? d[1] : '#666') + '">' + (d ? d[0] : 'Veri yok') + '</span></div>' +
        '<div style="font-size:.85rem;color:#555">Son deneme: ' + zt(x.son_deneme) + ' · Sonraki: ' + zt(x.sonraki_deneme) + '</div>' +
        '<small style="color:#777">' + esc(x.zamanlama || '') + (x.zamanlama ? ' · ' : '') + esc(x.not_kisa || '') + esc(ek) + '</small>' + (x.id === 'kaynak-arastirma' ? liste(Y) : '') + '</div>';
    }).join('') : '<p class="fe-empty">Kayıt yok.</p>';
  }
  B.client().then(function (c) {
    return Promise.all([c.from('otomatik_takip').select('*').order('id'), c.from('cevre_kuyruk').select('durum,sonraki,bitti'), c.from('yapilacaklar').select('id,baslik,aciklama,durum,son_arama,arama_sonuc').neq('durum','tamam').order('id')]);
  }).then(function (r) {
    if (r[0].error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
    ciz(r[0].data || [], r[1].error ? null : r[1].data, r[2].error ? null : (r[2].data || []).filter(kaynakMi));
  }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  window.__otomatikTakipCiz = ciz;
})();
