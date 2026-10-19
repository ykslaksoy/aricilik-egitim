/* koloni-293/295: Yönetici · Özellik kullanımı (özellik + kullanıcı + sezon raporu; yalnız admin RPC) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tr(d) { return d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' TSİ' : 'Veri yok'; }
  function n(v) { return v == null ? 'Veri yok' : String(v); }
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-kullanim';
  s.innerHTML = '<h2>Özellik kullanımı</h2><p class="fe-sub">Özellik açılışları (yalnız sayım; içerik kaydedilmez). Sütunlar: toplam (tüm zamanlar), son 7 gün, son 30 gün. Kapatma: <a href="#s-ozellik">Özellik açma/kapama</a> › Özellik kullanım takibi.</p>' +
    '<div class="bd">Yükleniyor…</div>';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-kullanim">Özellik kullanımı</a>');
  var bd = s.querySelector('.bd');
  var seciliKullanici = null;
  var cacheOz = [];
  var cacheKu = [];
  var sezonYil = new Date().getFullYear();
  if (new Date().getMonth() <= 1) sezonYil -= 1;
  var sezonKullanici = '';

  function sayi3(top, s7, s30) {
    return '<span style="font-size:.82rem;color:#444">Toplam: <b>' + esc(n(top)) + '</b> · 7 gün: <b>' + esc(n(s7)) + '</b> · 30 gün: <b>' + esc(n(s30)) + '</b></span>';
  }

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
          '<div style="margin-top:.35rem;display:grid;gap:.15rem">' +
          sayi3(x.acilis_toplam, x.acilis_7, x.acilis_30) +
          '<span style="font-size:.82rem;color:#444">Farklı kullanıcı — Toplam: <b>' + esc(n(x.kullanici_toplam)) + '</b> · 7 gün: <b>' + esc(n(x.kullanici_7)) + '</b> · 30 gün: <b>' + esc(n(x.kullanici_30)) + '</b></span>' +
          '<span style="font-size:.82rem;color:#555">Son kullanım: ' + esc(tr(x.son_kullanim)) + '</span></div></div>';
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
          '<div style="margin-top:.2rem">' + sayi3(x.acilis_toplam, x.acilis_7, x.acilis_30) +
          ' · Son: ' + esc(tr(x.son_kullanim)) + '</div></div>';
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
        '<div style="margin-top:.25rem">' + sayi3(x.toplam, x.toplam_7, x.toplam_30) + '</div>' +
        '<div style="font-size:.82rem;color:#555;margin-top:.2rem">En çok (30 gün): ' + esc(x.ust_ozellikler || 'Veri yok') + '</div>' +
        '<div style="font-size:.82rem;color:#555;margin-top:.12rem">Son giriş: ' + esc(tr(x.son_giris)) + ' · Son özellik: ' + esc(tr(x.son_kullanim)) + '</div></button>' +
        '<div id="ku-det-' + esc(id) + '">' + (acik ? '<p class="fe-sub" style="margin:.3rem 0">Yükleniyor…</p>' : '') + '</div>';
    });
    return h + '</details>';
  }

  function sezonKullaniciOpts(rows) {
    var h = '<option value="">Tüm kullanıcılar</option>';
    (rows || []).forEach(function (x) {
      h += '<option value="' + esc(String(x.user_id)) + '">' + esc(x.ad_eposta || x.user_id) + '</option>';
    });
    return h;
  }

  function sezonYilOpts() {
    var y = new Date().getFullYear();
    if (new Date().getMonth() <= 1) y -= 1;
    var h = '';
    for (var i = 0; i < 4; i++) {
      var yy = y - i;
      h += '<option value="' + yy + '"' + (yy === sezonYil ? ' selected' : '') + '>' + yy + ' sezonu</option>';
    }
    return h;
  }

  function cizSezonShell() {
    return '<details id="kullanim-sezon" open style="margin-top:.75rem;border-top:1px solid #eee;padding-top:.65rem">' +
      '<summary style="font-weight:700;cursor:pointer">Sezon raporu</summary>' +
      '<p class="fe-sub" style="margin:.35rem 0">Seçilen sezonda arılık ve dönem (Konum / Kışlatma) bazında özellik kullanım sayıları.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin:.4rem 0">' +
      '<label style="font-size:.85rem">Sezon <select id="kullanim-sezon-yil" style="font:inherit;margin-left:.25rem">' + sezonYilOpts() + '</select></label>' +
      '<label style="font-size:.85rem">Kullanıcı <select id="kullanim-sezon-ku" style="font:inherit;margin-left:.25rem;max-width:14rem">' + sezonKullaniciOpts(cacheKu) + '</select></label>' +
      '</div><div id="kullanim-sezon-tbl">Yükleniyor…</div></details>';
  }

  function konumAdi(r) {
    var k = r && r.konum_ad != null ? String(r.konum_ad).trim() : '';
    return k || 'Adsız konum';
  }

  function donemGoster(r) {
    var kn = konumAdi(r);
    if (r.donem_tipi === 'konum' && r.donem_sira) return 'Konum ' + r.donem_sira + ' · ' + kn;
    if (r.donem_tipi === 'kislatma') return 'Kışlatma · ' + kn;
    return r.donem_etiket || 'Belirsiz';
  }

  function donemSortKey(r) {
    var t = r.donem_tipi || '';
    if (t === 'konum') return '0-' + String(r.donem_sira == null ? 0 : r.donem_sira).padStart(3, '0') + '-' + konumAdi(r);
    if (t === 'kislatma') return '1-' + konumAdi(r);
    return '2-' + donemGoster(r);
  }

  function cizSezonTablo(rows) {
    if (!rows || !rows.length) return '<p class="fe-empty">Bu sezon için kayıt yok.</p>';
    var feats = {};
    var featOrder = [];
    rows.forEach(function (r) {
      if (!feats[r.ozellik]) { feats[r.ozellik] = { ad: r.ozellik_ad || r.ozellik, sira: r.ozellik_sira || 0 }; featOrder.push(r.ozellik); }
    });
    featOrder.sort(function (a, b) {
      var da = feats[a].sira - feats[b].sira;
      if (da) return da;
      return feats[a].ad.localeCompare(feats[b].ad, 'tr');
    });
    var groups = {};
    rows.forEach(function (r) {
      var gk = (r.arilik_ad || 'Belirsiz') + '|' + (r.donem_tipi || '') + '|' + String(r.donem_sira == null ? '' : r.donem_sira) + '|' + konumAdi(r);
      if (!groups[gk]) {
        groups[gk] = {
          arilik_ad: r.arilik_ad, donem_satir: donemGoster(r),
          donem_tipi: r.donem_tipi, donem_sira: r.donem_sira, cells: {}, sort: donemSortKey(r)
        };
      }
      groups[gk].cells[r.ozellik] = (groups[gk].cells[r.ozellik] || 0) + Number(r.adet || 0);
    });
    var gkeys = Object.keys(groups).sort(function (a, b) {
      var ga = groups[a], gb = groups[b];
      var c = String(ga.arilik_ad).localeCompare(String(gb.arilik_ad), 'tr');
      if (c) return c;
      return ga.sort < gb.sort ? -1 : (ga.sort > gb.sort ? 1 : 0);
    });
    var totals = {};
    featOrder.forEach(function (f) { totals[f] = 0; });
    var th = featOrder.map(function (f) { return '<th style="text-align:right;padding:.35rem .4rem;font-size:.75rem;white-space:nowrap">' + esc(feats[f].ad) + '</th>'; }).join('');
    var body = gkeys.map(function (gk) {
      var g = groups[gk];
      var tds = featOrder.map(function (f) {
        var v = g.cells[f] || 0;
        totals[f] += v;
        return '<td style="text-align:right;padding:.35rem .4rem;font-size:.8rem">' + (v ? esc(String(v)) : '·') + '</td>';
      }).join('');
      return '<tr><td style="padding:.35rem .4rem;font-size:.8rem;vertical-align:top"><b>' + esc(g.arilik_ad) + '</b><br><span style="color:#555">' + esc(g.donem_satir) + '</span></td>' + tds + '</tr>';
    }).join('');
    var foot = featOrder.map(function (f) {
      return '<td style="text-align:right;padding:.4rem;font-weight:700">' + esc(String(totals[f])) + '</td>';
    }).join('');
    return '<div style="overflow:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;min-width:28rem">' +
      '<thead><tr><th style="text-align:left;padding:.35rem .4rem;font-size:.75rem">Arılık / dönem</th>' + th + '</tr></thead>' +
      '<tbody>' + body + '</tbody>' +
      '<tfoot><tr style="border-top:2px solid #ccc;background:#faf8f3"><td style="padding:.4rem;font-weight:700">Sezon toplamı</td>' + foot + '</tr></tfoot></table></div>';
  }

  function yukleSezon() {
    var box = bd.querySelector('#kullanim-sezon-tbl');
    if (!box) return;
    box.innerHTML = 'Yükleniyor…';
    var uid = sezonKullanici || null;
    B.client().then(function (c) {
      return c.rpc('sa_ozellik_kullanim_sezon', { p_yil: sezonYil, p_user_id: uid });
    }).then(function (r) {
      if (r.error) { box.innerHTML = '<p class="fe-empty">Sezon raporu yüklenemedi (k295).</p>'; return; }
      box.innerHTML = cizSezonTablo(r.data || []);
    }, function () { box.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  }

  function baglaSezon() {
    var ySel = bd.querySelector('#kullanim-sezon-yil');
    var kSel = bd.querySelector('#kullanim-sezon-ku');
    if (ySel) ySel.addEventListener('change', function () { sezonYil = Number(ySel.value) || sezonYil; yukleSezon(); });
    if (kSel) {
      if (sezonKullanici) kSel.value = sezonKullanici;
      kSel.addEventListener('change', function () { sezonKullanici = kSel.value || ''; yukleSezon(); });
    }
    yukleSezon();
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
    cacheOz = oz || [];
    cacheKu = ku || [];
    bd.innerHTML = cizOzellik(cacheOz) + cizKullanicilar(cacheKu) + cizSezonShell();
    bd.querySelectorAll('[data-ku]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ku');
        var ad = btn.getAttribute('data-ad') || '';
        if (seciliKullanici === id) { seciliKullanici = null; cizHepsi(cacheOz, cacheKu); return; }
        seciliKullanici = id;
        cizHepsi(cacheOz, cacheKu);
        yukleDetay(id, ad);
      });
    });
    if (seciliKullanici) {
      var b = bd.querySelector('[data-ku="' + seciliKullanici + '"]');
      if (b) yukleDetay(seciliKullanici, b.getAttribute('data-ad') || '');
    }
    baglaSezon();
  }

  B.client().then(function (c) {
    return Promise.all([
      c.rpc('sa_ozellik_kullanim_ozet'),
      c.rpc('sa_ozellik_kullanim_kullanicilar')
    ]);
  }).then(function (rs) {
    if (rs[0].error || rs[1].error) {
      bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli (k293–k295).</p>';
      return;
    }
    cizHepsi(rs[0].data || [], rs[1].data || []);
  }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
})();
