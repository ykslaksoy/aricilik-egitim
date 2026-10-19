/* koloni-189: Yönetici · Kuyruğu temizle (cevre_kuyruk; RPC yalnız admin, sayı onayı) + Özellik açma/kapama (ozellik_bayraklari) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var nav = host.querySelector('nav.nav');
  var ISLEM = [
    ['hata_sil', 'Hatalı işleri sil', 'Hata durumundaki işler kuyruktan silinir.'],
    ['takili_sil', 'Takılı işleri sil', '30 dakikadan uzun «işleniyor»da kalan işler silinir.'],
    ['yeniden_dene', 'Denemeyi sıfırla', 'Hatalı ve takılı işler deneme 0 ile hemen yeniden sıraya girer.']
  ];
  var q = document.createElement('section'); q.className = 'card fe'; q.id = 's-kuyruk';
  q.innerHTML = '<h2>Kuyruğu temizle</h2><p class="fe-sub">Çevre/su kuyruğu. Her işlemden önce kaç işin etkileneceği sorulur.</p>' +
    ISLEM.map(function (x) { return '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;border-top:1px solid #eee;padding:.45rem 0"><div><b>' + x[1] + '</b><br><small style="color:#666">' + x[2] + '</small></div><button type="button" class="btn" data-islem="' + x[0] + '" style="min-height:40px;white-space:nowrap">' + x[1].split(' ')[0] + '…</button></div>'; }).join('') +
    '<p class="kq-msg" style="font-size:.85rem;min-height:1.3em;margin:.3rem 0 0" aria-live="polite"></p>';
  var f = document.createElement('section'); f.className = 'card fe'; f.id = 's-ozellik';
  f.innerHTML = '<h2>Özellik açma/kapama</h2><p class="fe-sub">Kapalı modül uygulamada «Yakında» ekranı gösterir. Değişiklik uygulamada bir sonraki açılışta geçer.</p><div class="bd">Yükleniyor…</div>';
  host.appendChild(q); host.appendChild(f);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-kuyruk">Kuyruk</a><a class="chip" href="#s-ozellik">Özellikler</a>');
  var msg = q.querySelector('.kq-msg');
  q.addEventListener('click', function (e) {
    var b = e.target.closest('[data-islem]'); if (!b) return;
    var islem = b.getAttribute('data-islem'), ad = ISLEM.filter(function (x) { return x[0] === islem; })[0][1];
    b.disabled = true; msg.textContent = 'Sayılıyor…';
    B.client().then(function (c) {
      return c.rpc('sa_kuyruk_say', { islem: islem }).then(function (r) {
        if (r.error) throw r.error; var n = r.data | 0;
        if (!n) { msg.textContent = ad + ': etkilenecek iş yok.'; return; }
        if (!window.confirm(ad + ' — ' + n + ' iş etkilenecek. Emin misin?')) { msg.textContent = 'Vazgeçildi.'; return; }
        return c.rpc('sa_kuyruk_temizle', { islem: islem, beklenen: n }).then(function (r2) { if (r2.error) throw r2.error; msg.textContent = ad + ': ' + r2.data + ' iş tamam.'; });
      });
    }).catch(function (err) { msg.textContent = 'Olmadı: ' + ((err && err.message) || 'bağlantı yok'); }).then(function () { b.disabled = false; });
  });
  var bd = f.querySelector('.bd');
  var HAZIR_DEGIL = { paylasim_baglanti: true };
  var ROZET_HAZIR_DEGIL = '<span class="fe-badge" style="display:inline-block;margin-left:.35rem;padding:1px 7px;border-radius:8px;font-size:.72rem;font-weight:700;background:#fde68a;color:#78350f;vertical-align:middle">hazır değil</span>';
  function ciz(R) {
    bd.innerHTML = R.length ? R.map(function (x) {
      return '<label style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;border-top:1px solid #eee;padding:.5rem 0;min-height:44px"><span><b>' + esc(x.ad) + '</b>' + (HAZIR_DEGIL[x.anahtar] ? ROZET_HAZIR_DEGIL : '') + '<br><small style="color:#777">' + esc(x.aciklama || '') + '</small></span>' +
        '<input type="checkbox" role="switch" data-k="' + esc(x.anahtar) + '"' + (x.acik ? ' checked' : '') + ' style="width:44px;height:26px;flex:none"></label>';
    }).join('') : '<p class="fe-empty">Kayıt yok.</p>';
  }
  bd.addEventListener('change', function (e) {
    var i = e.target.closest('[data-k]'); if (!i) return; var v = i.checked; i.disabled = true;
    B.client().then(function (c) { return c.from('ozellik_bayraklari').update({ acik: v, guncellendi: new Date().toISOString() }).eq('anahtar', i.getAttribute('data-k')).select('anahtar'); })
      .then(function (r) { if (r.error || !r.data || !r.data.length) { i.checked = !v; window.alert('Kaydedilemedi (yetki?)'); } }, function () { i.checked = !v; })
      .then(function () { i.disabled = false; });
  });
  B.client().then(function (c) { return c.from('ozellik_bayraklari').select('*').order('anahtar'); })
    .then(function (r) { if (r.error) bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; else ciz(r.data || []); }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  window.__ozellikCiz = ciz;
})();
