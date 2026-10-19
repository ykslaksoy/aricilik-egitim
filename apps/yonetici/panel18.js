/* koloni-293/294: Yönetici · Özellik kullanımı (özellik + kullanıcı bazlı; yalnız admin RPC) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tr(d) { return d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' TSİ' : 'Veri yok'; }
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-kullanim';
  s.innerHTML = '<h2>Özellik kullanımı</h2><p class="fe-sub">Son 7 ve 30 günde özellik açılışları (yalnız sayım; içerik kaydedilmez). Kullanıcı listesi yalnız yönetici görür. Kapatma: <a href="#s-ozellik">Özellik açma/kapama</a> › Özellik kullanım takibi.</p>' +
    '<div class="bd">Yükleniyor…</div>';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-kullanim">Özellik kullanımı</a>');
  var bd = s.querySelector('.bd');
  var seciliKullanici = null;

  function cizOzellik(rows) {
    if (!rows || !rows.length) return '<p class="fe-empty">Veri yok</p>';
    var sorted = rows.slice().sort(function (a, b) {
      var d = (Number(b.acilis_30) || 0) - (Number(a.acilis_30) || 0);
      if (d) return d;
      d = (Number(b.acilis_7) || 0) - (Number(a.acilis_7) || 0);
      if (d) return d;
      return (Number(a.sira) || 0) - (Number(b.sira) || 0);
    });
    return '<details open style="margin-bottom:.75rem"><summary style="font-weight:700;cursor:pointer">Özellik bazında (' + sorted.length + ')</summary>' +
      sorted.map(function (x) {
        return '<div style="border-top:1px solid #eee;padding:.55rem 0">' +
          '<b>' + esc(x.ad || x.ozellik) + '</b>' +
          '<div style="font-size:.85rem;color:#555;margin-top:.2rem">' + esc(x.aciklama || '') + '</div>' +
          '<div style="font-size:.82rem;color:#444;margin-top:.35rem;display:grid;gap:.15rem">' +
          '<span>7 gün: <b>' + esc(x.acilis_7 == null ? 'Veri yok' : String(x.acilis_7)) + '</b> açılış · <b>' + esc(x.kullanici_7 == null ? 'Veri yok' : String(x.kullanici_7)) + '</b> farklı kullanıcı</span>' +
          '<span>30 gün: <b>' + esc(x.acilis_30 == null ? 'Veri yok' : String(x.acilis_30)) + '</b> açılış · <b>' + esc(x.kullanici_30 == null ? 'Veri yok' : String(x.kullanici_30)) + '</b> farklı kullanıcı</span>' +
          '<span>Son kullanım: ' + esc(tr(x.son_kullanim)) + '</span></div></div>';
      }).join('') + '</details>';
  }

  function detayHtml(rows, ad) {
    if (!rows || !rows.length) return '<p class="fe-empty">Veri yok</p>';
    var sorted = rows.slice().sort(function (a, b) {
      var d = (Number(b.acilis_30) || 0) - (Number(a.acilis_30) || 0);
      if (d) return d;
      return (Number(a.sira) || 0) - (Number(b.sira) || 0);
    });
    return '<div style="background:#fffaf0;border:1px solid #e8dcc8;border-radius:12px;padding:.5rem .65rem;margin:.35rem 0 .65rem">' +
      '<b>' + esc(ad) + '</b> — özellik kırılımı' +
      sorted.map(function (x) {
        return '<div style="border-top:1px dashed #e0d5c4;padding:.4rem 0;margin-top:.35rem">' +
          '<span style="font-weight:700">' + esc(x.ad || x.ozellik) + '</span>' +
          '<div style="font-size:.8rem;color:#555;margin-top:.15rem">' + esc(x.aciklama || '') + '</div>' +
          '<div style="font-size:.8rem;color:#444;margin-top:.2rem">7 gün: <b>' + esc(String(x.acilis_7 || 0)) + '</b> · 30 gün: <b>' + esc(String(x.acilis_30 || 0)) + '</b> · Son: ' + esc(tr(x.son_kullanim)) + '</div></div>';
      }).join('') + '</div>';
  }

  function cizKullanicilar(rows) {
    if (!rows || !rows.length) {
      return '<details style="margin-top:.5rem"><summary style="font-weight:700;cursor:pointer">Kullanıcı bazında</summary><p class="fe-empty">Veri yok</p></details>';
    }
    var h = '<details open style="margin-top:.5rem"><summary style="font-weight:700;cursor:pointer">Kullanıcı bazında (' + rows.length + ')</summary>' +
      '<p class="fe-sub" style="margin:.35rem 0">Son 30 günde en az bir açılış. Satıra dokunun → özellik detayı.</p>';
    rows.forEach(function (x) {
      var id = String(x.user_id);
      var acik = seciliKullanici === id;
      h += '<button type="button" data-ku="' + esc(id) + '" data-ad="' + esc(x.ad_eposta || 'Kullanıcı') + '" style="width:100%;text-align:left;border:1px solid #eee;border-radius:12px;padding:.5rem .6rem;margin:.35rem 0;background:' + (acik ? '#fff5d6' : '#fff') + ';cursor:pointer;font:inherit">' +
        '<b>' + esc(x.ad_eposta || 'Veri yok') + '</b>' +
        '<div style="font-size:.82rem;color:#444;margin-top:.25rem;display:grid;gap:.12rem">' +
        '<span>Toplam (30 gün): <b>' + esc(x.toplam_30 == null ? 'Veri yok' : String(x.toplam_30)) + '</b></span>' +
        '<span>En çok: ' + esc(x.ust_ozellikler || 'Veri yok') + '</span>' +
        '<span>Son giriş: ' + esc(tr(x.son_giris)) + ' · Son özellik: ' + esc(tr(x.son_kullanim)) + '</span></div></button>' +
        '<div id="ku-det-' + esc(id) + '">' + (acik ? '<p class="fe-sub" style="margin:.3rem 0">Yükleniyor…</p>' : '') + '</div>';
    });
    return h + '</details>';
  }

  function yukleDetay(uid, ad) {
    var box = bd.querySelector('#ku-det-' + uid);
    if (!box) return;
    box.innerHTML = '<p class="fe-sub" style="margin:.3rem 0">Yükleniyor…</p>';
    B.client().then(function (c) { return c.rpc('sa_ozellik_kullanim_kullanici_detay', { p_user_id: uid }); }).then(function (r) {
      if (r.error) { box.innerHTML = '<p class="fe-empty">Detay yüklenemedi.</p>'; return; }
      box.innerHTML = detayHtml(r.data || [], ad);
    }, function () { box.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  }

  function cizHepsi(oz, ku) {
    bd.innerHTML = cizOzellik(oz) + cizKullanicilar(ku);
    bd.querySelectorAll('[data-ku]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ku');
        var ad = btn.getAttribute('data-ad') || '';
        if (seciliKullanici === id) { seciliKullanici = null; cizHepsi(oz, ku); return; }
        seciliKullanici = id;
        cizHepsi(oz, ku);
        yukleDetay(id, ad);
      });
    });
    if (seciliKullanici) {
      var b = bd.querySelector('[data-ku="' + seciliKullanici + '"]');
      if (b) yukleDetay(seciliKullanici, b.getAttribute('data-ad') || '');
    }
  }

  B.client().then(function (c) {
    return Promise.all([
      c.rpc('sa_ozellik_kullanim_ozet'),
      c.rpc('sa_ozellik_kullanim_kullanicilar')
    ]);
  }).then(function (rs) {
    if (rs[0].error || rs[1].error) {
      bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli (k293/k294).</p>';
      return;
    }
    cizHepsi(rs[0].data || [], rs[1].data || []);
  }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
})();
