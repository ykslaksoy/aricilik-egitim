/* koloni-169: Yönetici · Yapılacaklar (tablo yapilacaklar; RLS yalnız admin) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DA = { acik: 'Açık', yapiliyor: 'Yapılıyor', tamam: 'Tamam' }, RENK = { acik: '#b54708', yapiliyor: '#1d4ed8', tamam: '#15803d' };
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-yapilacak';
  s.innerHTML = '<h2>Yapılacaklar</h2><p class="fe-sub">Açık işler ve kararlar. Yalnız yönetici görür.</p>' +
    '<form id="yaEkle" style="display:grid;gap:.4rem;margin:.5rem 0"><input name="b" placeholder="Başlık" required maxlength="160"><textarea name="a" rows="2" placeholder="Açıklama"></textarea><button class="btn" type="submit" style="justify-self:end">Ekle</button></form><div class="bd">Yükleniyor…</div>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-yapilacak">Yapılacaklar</a>');
  var bd = s.querySelector('.bd');
  var acikYapilan = false;
  function yukle() {
    B.client().then(function (c) { return c.from('yapilacaklar').select('id,baslik,aciklama,durum,olusturma,guncelleme').order('id'); }).then(function (r) {
      if (r.error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
      var A = r.data || [], L = A.filter(function (x) { return x.durum !== 'tamam'; }), T = A.filter(function (x) { return x.durum === 'tamam'; });
      function tr(d) { return d ? new Date(d).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'; }
      function sat(x) {
        return '<div style="border-top:1px solid #eee;padding:.5rem 0;display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:.5rem;align-items:start">' +
          '<div><b>' + x.id + '. ' + esc(x.baslik) + '</b><div style="font-size:.85rem;color:#555">' + esc(x.aciklama) + '</div><small style="color:#888">' + (x.durum === 'tamam' ? 'Tamamlandı: ' + tr(x.guncelleme || x.olusturma) : tr(x.olusturma)) + '</small></div>' +
          '<select data-ya="' + x.id + '" style="color:' + RENK[x.durum] + ';font-weight:700">' + Object.keys(DA).map(function (k) { return '<option value="' + k + '"' + (k === x.durum ? ' selected' : '') + '>' + DA[k] + '</option>'; }).join('') + '</select></div>';
      }
      T.sort(function (a, b) { return String(b.guncelleme || '').localeCompare(String(a.guncelleme || '')); });
      bd.innerHTML = '<p class="fe-sub">' + L.length + ' açık iş</p>' + (L.length ? L.map(sat).join('') : '<p class="fe-empty">Açık iş yok.</p>') +
        '<details id="yaYapilan" style="margin-top:1rem"' + (acikYapilan ? ' open' : '') + '><summary style="font-weight:700;cursor:pointer">Yapılanlar (' + T.length + ')</summary>' + (T.length ? T.map(sat).join('') : '<p class="fe-empty">Henüz yok.</p>') + '</details>';
      bd.querySelector('#yaYapilan').addEventListener('toggle', function (e) { acikYapilan = e.target.open; });
    }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  }
  s.addEventListener('change', function (e) {
    var t = e.target.closest('[data-ya]'); if (!t) return;
    B.client().then(function (c) { return c.from('yapilacaklar').update({ durum: t.value, guncelleme: new Date().toISOString() }).eq('id', +t.getAttribute('data-ya')); }).then(function (r) { if (r.error) alert('Kaydedilemedi'); yukle(); });
  });
  s.querySelector('#yaEkle').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, b = f.b.value.trim(); if (!b) return;
    B.client().then(function (c) { return c.from('yapilacaklar').insert({ baslik: b, aciklama: f.a.value.trim() }); }).then(function (r) { if (r.error) { alert('Eklenemedi'); return; } f.reset(); yukle(); });
  });
  yukle();
})();

/* k168: puansız ırk/ekotipler (ör. Efe arısı) — kaynaklar yalnız yönetici panelinde. */
(function () {
  var L = document.getElementById('ipList'), D = window.SuperAriDemo; if (!L) return;
  var list = (D && D.colony && D.colony.IRK_PUANSIZ) || [];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lnk(k) { return esc(k).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  L.innerHTML = list.length ? list.map(function (x) { return '<li><b>' + esc(x.ad) + '</b> — <i>' + esc(x.tur) + '</i><br>Genetik: <b>Veri yok</b> · Oğul ölçeği: <b>Veri yok</b> · FOB: <b>Veri yok</b><br><small>' + esc(x.ozet) + '</small><ul>' + x.kaynak.map(function (k) { return '<li><small>' + lnk(k) + '</small></li>'; }).join('') + '</ul></li>'; }).join('') : '<li>Kayıt yok.</li>';
})();
