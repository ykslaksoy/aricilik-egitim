/* koloni-291/292/293 (önizleme): Yönetici › Arı genetikleri — oğul puanı + hırçınlık (ogul_skor_ayar). Kilitli GENETIK_* değişmez. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, D = window.SuperAriDemo, host = document.getElementById('panel');
  if (!host || !D || !D.colony || document.getElementById('s-melez-yon')) return;
  var C = D.colony, nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UT = '<span class="mk-ut">uzman tahmini</span>';
  if (!document.getElementById('my-css')) {
    var st = document.createElement('style');
    st.id = 'my-css';
    st.textContent = '#s-melez-yon{font-size:15px;line-height:1.45;color:#2f281f}#s-melez-yon h2{font-size:1.15rem;margin:0 0 .35rem;line-height:1.3}#s-melez-yon .fe-sub{font-size:.88rem;line-height:1.4;margin:.25rem 0 .5rem}#s-melez-yon .my-box{border:1px solid #e0d4c2;border-radius:12px;padding:.7rem .75rem;margin:.55rem 0;background:#fffdfb}#s-melez-yon .my-box h3{margin:0 0 .45rem;font-size:1.02rem;line-height:1.3;font-weight:700}#s-melez-yon .my-pair{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;align-items:start;margin:.35rem 0 .5rem}#s-melez-yon .my-field{display:flex;flex-direction:column;gap:.28rem;min-width:0}#s-melez-yon .my-lbl{font-size:.9rem;font-weight:600;line-height:1.25;color:#3d3428}#s-melez-yon .my-lbl .mk-ut{font-weight:500;margin-left:.2rem}#s-melez-yon input,#s-melez-yon textarea{width:100%;box-sizing:border-box;font-size:16px;line-height:1.35;padding:.48rem .55rem;border:1px solid #cfc3b0;border-radius:8px;background:#fff}#s-melez-yon input:disabled{background:#f3ece2;color:#6b5d4a}#s-melez-yon .my-src{font-size:.78rem;line-height:1.35;color:#8a7358;margin:.1rem 0 0}#s-melez-yon .my-src-b{margin:.35rem 0 0}#s-melez-yon .my-esik{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.35rem}#s-melez-yon .my-esik .my-field{gap:.2rem}#s-melez-yon .my-esik .my-lbl{font-size:.78rem;font-weight:600}#s-melez-yon .my-block{margin-top:.45rem}#s-melez-yon .my-block .my-lbl{display:block;margin-bottom:.25rem}#s-melez-yon details.tr-d summary{cursor:pointer;font-size:.92rem}@media(max-width:420px){#s-melez-yon .my-pair{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-melez-yon';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-melez-yon">Arı genetikleri</a>');
  function effM() { return C.melezYonMerge((C.ogulSkor() || {}).melezYon); }
  function effH() { return C.hircinlikMerge((C.ogulSkor() || {}).hircinlik); }
  function safOgul(k) {
    var sk = C.ogulSkor() || {}, s0 = sk.saf || {};
    return s0[k] != null ? s0[k] : C.GENETIK_SAF[k];
  }
  function ogulFieldHtml(opts) {
    var v = opts.value, hint = opts.hint || '';
    return '<div class="my-field"><span class="my-lbl">Oğul puanı ' + (opts.ut ? UT : '') + '</span><input type="number" min="0" max="100" step="1" ' + opts.attr + ' value="' + esc(v != null ? v : '') + '">' + (hint ? '<p class="my-src">' + hint + '</p>' : '') + '</div>';
  }
  function hircinFieldHtml(k, row) {
    var def = (C.hircinlikDefaults().irk[k] || {}), meta = C.HIRCINLIK_IRK[k] || {};
    row = row || {};
    if (row.veriYok || def.veriYok || meta.veriYok) {
      return '<div class="my-field"><span class="my-lbl">Hırçınlık</span><input type="text" value="Veri yok" disabled><p class="my-src">Kullanıcıda «Veri yok»</p></div>';
    }
    if (row.seviye || def.seviye || meta.seviye) {
      var sv = row.seviye || def.seviye || meta.seviye;
      var src = row.src || def.src || meta.src || '';
      return '<div class="my-field"><span class="my-lbl">Hırçınlık (seviye)</span><input type="text" value="' + esc(sv) + '" disabled><p class="my-src">' + esc(src.slice(0, 140)) + (src.length > 140 ? '…' : '') + '</p></div>';
    }
    var v = row.v != null ? row.v : def.v;
    var src = row.src || def.src || meta.src || '';
    return '<div class="my-field"><span class="my-lbl">Hırçınlık ' + UT + '</span><input type="number" min="0" step="0.01" data-h-v value="' + esc(v != null ? v : '') + '"><p class="my-src">60 sn · bilye · ' + esc(src.slice(0, 100)) + (src.length > 100 ? '…' : '') + '</p></div>';
  }
  function pairBox(title, pairInner, extra, attrs) {
    return '<div class="my-box" ' + (attrs || '') + '><h3>' + esc(title) + '</h3><div class="my-pair">' + pairInner + '</div>' + (extra || '') + '</div>';
  }
  function paint() {
    var E = effM(), H = effH(), es = H.esik;
    var intro = '<h2>Arı genetikleri</h2><p class="fe-sub">Oğul puanı oğul riskine girer. Kullanıcıda hırçınlık yalnız seviye etiketi; rakam ve kaynak burada.</p>';
    intro += '<details class="tr-d" open><summary><b>Hırçınlık eşikleri</b> ' + UT + '</summary><div class="tr-body my-esik">' +
      '<div class="my-field"><span class="my-lbl">&lt; → Sakin</span><input type="number" step="0.1" min="0.1" data-h-esik="orta" value="' + esc(es.orta) + '"></div>' +
      '<div class="my-field"><span class="my-lbl">&lt; → Orta</span><input type="number" step="0.1" min="0.1" data-h-esik="hircin" value="' + esc(es.hircin) + '"></div>' +
      '<div class="my-field"><span class="my-lbl">&lt; → Hırçın</span><input type="number" step="0.1" min="0.1" data-h-esik="cok" value="' + esc(es.cok) + '"></div>' +
      '</div><p class="my-src my-src-b">Üstü: Çok hırçın</p></details>';
    intro += '<p class="fe-sub" style="margin:.55rem 0 .15rem"><b>Saf hatlar</b></p>';
    ['kafkas', 'mugla', 'efe'].forEach(function (k) {
      var ad = (C.HIRCINLIK_IRK[k] || {}).ad || k, row = H.irk[k] || {};
      var og = ogulFieldHtml({ value: safOgul(k), attr: 'data-o-saf="' + esc(k) + '"', hint: 'Kilitli varsayılan: <b>' + esc(C.GENETIK_SAF[k]) + '</b>' });
      var hk = k;
      intro += pairBox(ad, og + hircinFieldHtml(hk, row), '', 'data-hk="' + esc(k) + '"');
    });
    intro += '<p class="fe-sub" style="margin:.65rem 0 .15rem"><b>Yönlü ikili melezler</b></p>';
    (C.CROSS_YON || []).forEach(function (y) {
      var it = E.items[y.id] || {}, vg = C.melezYonVarsayilanGenetik(y.id), hr = H.irk[y.id] || {};
      var og = ogulFieldHtml({
        value: it.genetik != null ? it.genetik : vg,
        attr: 'data-my-g',
        ut: true,
        hint: 'Varsayılan <b>' + esc(vg) + '</b> · yönsüz Kafkas×Muğla tabloda 35'
      });
      var extra = '<div class="my-block"><span class="my-lbl">Melez özelliği (kullanıcı)</span><textarea rows="2" data-my-oz maxlength="500">' + esc(it.ozet || y.ozet) + '</textarea></div>' +
        '<div class="my-block"><span class="my-lbl">Oğul kaynakları</span><textarea rows="2" data-my-kn maxlength="12000">' + esc(it.kaynak || '') + '</textarea></div>';
      intro += pairBox(y.ad, og + hircinFieldHtml(y.id, hr), extra, 'data-my-id="' + esc(y.id) + '"');
    });
    intro += '<div class="hz-row" style="margin-top:.65rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-my-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-my-reset>Varsayılanlara dön</button></div><p class="fe-meta" data-my-stat style="min-height:1.2em"></p>';
    s.innerHTML = intro;
  }
  function stat(m) { var e = s.querySelector('[data-my-stat]'); if (e) e.innerHTML = m; }
  function topla() {
    var items = {}, irk = {}, esik = {}, saf = {}, bad = null;
    [].forEach.call(s.querySelectorAll('[data-my-id]'), function (box) {
      var id = box.getAttribute('data-my-id'), gEl = box.querySelector('[data-my-g]'), oz = box.querySelector('[data-my-oz]').value.trim(), kn = box.querySelector('[data-my-kn]').value.trim();
      var row = { ozet: oz };
      if (gEl && gEl.value !== '') { var g = Number(gEl.value); if (!isFinite(g) || g < 0 || g > 100) { bad = bad || gEl; return; } row.genetik = g; }
      var hEl = box.querySelector('[data-h-v]');
      if (hEl && hEl.value !== '') {
        var hv = Number(hEl.value); if (!isFinite(hv) || hv < 0) { bad = bad || hEl; return; }
        irk[id] = { v: hv, src: (C.HIRCINLIK_IRK[id] || {}).src || '' };
      } else if (id === 'efe_kafkas') irk[id] = { veriYok: true };
      if (kn) row.kaynak = kn.slice(0, 12000);
      items[id] = row;
    });
    [].forEach.call(s.querySelectorAll('[data-hk]'), function (box) {
      var k = box.getAttribute('data-hk'), vEl = box.querySelector('[data-h-v]'), oEl = box.querySelector('[data-o-saf]');
      if (oEl && oEl.value !== '') {
        var og = Number(oEl.value); if (!isFinite(og) || og < 0 || og > 100) { bad = bad || oEl; return; }
        saf[k] = og;
      }
      if (C.HIRCINLIK_IRK[k] && C.HIRCINLIK_IRK[k].seviye) {
        irk[k] = { seviye: C.HIRCINLIK_IRK[k].seviye, src: C.HIRCINLIK_IRK[k].src || '' };
        return;
      }
      if (C.HIRCINLIK_IRK[k] && C.HIRCINLIK_IRK[k].veriYok) { irk[k] = { veriYok: true }; return; }
      if (vEl && vEl.value !== '') {
        var v = Number(vEl.value); if (!isFinite(v) || v < 0) { bad = bad || vEl; return; }
        irk[k] = { v: v, src: (C.HIRCINLIK_IRK[k] || {}).src || '' };
      }
    });
    [].forEach.call(s.querySelectorAll('[data-h-esik]'), function (el) { var v = Number(el.value); if (!isFinite(v) || v <= 0) { bad = bad || el; return; } esik[el.getAttribute('data-h-esik')] = v; });
    if (bad) { bad.focus(); return null; }
    return { melezYon: C.melezYonMerge({ items: items }), hircinlik: C.hircinlikMerge({ esik: esik, irk: irk }), saf: saf };
  }
  s.addEventListener('click', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-my-reset')) { paint(); stat('Varsayılanlar yüklendi (kaydedilmedi).'); return; }
    if (!t.hasAttribute('data-my-save')) return;
    var n = topla(); if (n === null) { stat('<b>Geçersiz değer</b>.'); return; }
    if (!B || !B.client) { stat('Bağlantı yok; kaydedilemedi.'); return; }
    if (!confirm('Arı genetikleri ayarları tüm kullanıcılar için kaydedilsin mi?')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    var o = JSON.parse(JSON.stringify(C.ogulSkor() || {})); o.melezYon = n.melezYon; o.hircinlik = n.hircinlik;
    if (n.saf && Object.keys(n.saf).length) { o.saf = o.saf || {}; Object.keys(n.saf).forEach(function (k) { o.saf[k] = n.saf[k]; }); }
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Arı genetikleri (oğul puanı + hırçınlık)' }); }).then(function (r) {
      if (r.error) throw r.error;
      C.ogulSkorSet(o, { at: new Date().toISOString() }); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'melezYon' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'melezYon') paint(); });
  paint();
})();

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
