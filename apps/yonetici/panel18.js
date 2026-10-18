/* koloni-291/292 (önizleme): Yönetici › Arı genetikleri — yönlü melez + hırçınlık (ogul_skor_ayar). Kilitli GENETIK_MELEZ değişmez. */
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
    st.textContent = '#s-melez-yon .my-box{border:1px solid #e5d9c6;border-radius:10px;padding:.55rem .65rem;margin:.45rem 0}#s-melez-yon .my-box h3{margin:0 0 .35rem;font-size:.95rem}#s-melez-yon label{display:block;font-size:.78rem;margin:.35rem 0}#s-melez-yon input,#s-melez-yon textarea{width:100%;box-sizing:border-box;font-size:16px}#s-melez-yon .my-def{font-size:.72rem;color:#8a7358;margin-top:.15rem}#s-melez-yon .my-esik{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem}#s-melez-yon .my-esik label{font-size:.72rem}';
    document.head.appendChild(st);
  }
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-melez-yon';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-melez-yon">Arı genetikleri</a>');
  function effM() { return C.melezYonMerge((C.ogulSkor() || {}).melezYon); }
  function effH() { return C.hircinlikMerge((C.ogulSkor() || {}).hircinlik); }
  function hRow(k, row, ad) {
    var def = C.hircinlikDefaults().irk[k] || {}, v = row.v != null ? row.v : def.v, src = row.src || def.src || '';
    if (row.veriYok || def.veriYok) return '<div class="my-box" data-hk="' + esc(k) + '"><h3>' + esc(ad) + '</h3><p class="fe-sub">Hırçınlık: <b>Veri yok</b></p></div>';
    if (row.seviye || def.seviye) return '<div class="my-box" data-hk="' + esc(k) + '"><h3>' + esc(ad) + '</h3><p class="fe-sub">Kullanıcıda: <b>' + esc(row.seviye || def.seviye) + '</b> (sabit metin)</p><label>Kaynak<textarea rows="2" data-h-src maxlength="12000">' + esc(src) + '</textarea></label></div>';
    return '<div class="my-box" data-hk="' + esc(k) + '"><h3>' + esc(ad) + '</h3><label>Hırçınlık — sokma sayısı (60 sn, bilye)<input type="number" min="0" step="0.01" data-h-v value="' + esc(v != null ? v : '') + '"></label><label>Kaynak<textarea rows="2" data-h-src maxlength="12000">' + esc(src) + '</textarea></label></div>';
  }
  function paint() {
    var E = effM(), H = effH(), es = H.esik;
    var intro = '<h2>Arı genetikleri</h2><p class="fe-sub">Yönlü ikili melezler: onaylı oğul genetik puanları (' + UT + ', kilitli tablodan bağımsız). Hırçınlık: kullanıcıda yalnız Sakin / Orta / Hırçın / Çok hırçın veya Veri yok; rakam ve kaynak yalnız burada.</p>';
    intro += '<details class="tr-d" open><summary><b>Hırçınlık eşikleri</b> (' + UT + ')</summary><div class="tr-body my-esik"><label>&lt; bu → Sakin<input type="number" step="0.1" min="0.1" data-h-esik="orta" value="' + esc(es.orta) + '"></label><label>&lt; bu → Orta<input type="number" step="0.1" min="0.1" data-h-esik="hircin" value="' + esc(es.hircin) + '"></label><label>&lt; bu → Hırçın (üstü Çok hırçın)<input type="number" step="0.1" min="0.1" data-h-esik="cok" value="' + esc(es.cok) + '"></label></div></details>';
    intro += '<p class="fe-sub" style="margin:.4rem 0 .2rem"><b>Saf hatlar</b></p>';
    ['kafkas', 'mugla', 'efe'].forEach(function (k) { intro += hRow(k, H.irk[k] || {}, (C.HIRCINLIK_IRK[k] || {}).ad || k); });
    intro += '<p class="fe-sub" style="margin:.6rem 0 .2rem"><b>Yönlü ikili melezler</b></p>';
    (C.CROSS_YON || []).forEach(function (y) {
      var it = E.items[y.id] || {}, vg = C.melezYonVarsayilanGenetik(y.id), hr = H.irk[y.id] || {};
      intro += '<div class="my-box" data-my-id="' + esc(y.id) + '"><h3>' + esc(y.ad) + '</h3>' +
        '<label>Genetik puan (0–100)<input type="number" min="0" max="100" step="1" data-my-g value="' + esc(it.genetik != null ? it.genetik : vg) + '"><span class="my-def">onaylı varsayılan: <b>' + esc(vg) + '</b> · ' + UT + ' · yönsüz Kafkas×Muğla kilitli tabloda 35 kalır</span></label>' +
        (hr.veriYok ? '<p class="fe-sub">Hırçınlık: <b>Veri yok</b> (kullanıcıda)</p>' : '<label>Hırçınlık — sokma (60 sn)<input type="number" min="0" step="0.01" data-my-h value="' + esc(hr.v != null ? hr.v : '') + '"><span class="my-def">kaynak: ' + esc((hr.src || C.HIRCINLIK_IRK[y.id].src || '').slice(0, 120)) + '…</span></label>') +
        '<label>Melez özelliği (kullanıcı)<textarea rows="2" data-my-oz maxlength="500">' + esc(it.ozet || y.ozet) + '</textarea></label>' +
        '<label>Oğul / genetik kaynakları<textarea rows="3" data-my-kn maxlength="12000">' + esc(it.kaynak || '') + '</textarea></label></div>';
    });
    intro += '<div class="hz-row" style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-my-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-my-reset>Varsayılanlara dön</button></div><p class="fe-meta" data-my-stat style="min-height:1.2em"></p>';
    s.innerHTML = intro;
  }
  function stat(m) { var e = s.querySelector('[data-my-stat]'); if (e) e.innerHTML = m; }
  function topla() {
    var items = {}, irk = {}, esik = {}, bad = null;
    [].forEach.call(s.querySelectorAll('[data-my-id]'), function (box) {
      var id = box.getAttribute('data-my-id'), gEl = box.querySelector('[data-my-g]'), oz = box.querySelector('[data-my-oz]').value.trim(), kn = box.querySelector('[data-my-kn]').value.trim();
      var row = { ozet: oz };
      if (gEl && gEl.value !== '') { var g = Number(gEl.value); if (!isFinite(g) || g < 0 || g > 100) { bad = bad || gEl; return; } row.genetik = g; }
      var hEl = box.querySelector('[data-my-h]');
      if (hEl && hEl.value !== '') {
        var hv = Number(hEl.value); if (!isFinite(hv) || hv < 0) { bad = bad || hEl; return; }
        irk[id] = { v: hv, src: (C.HIRCINLIK_IRK[id] || {}).src || '' };
      } else if (id === 'efe_kafkas') irk[id] = { veriYok: true };
      if (kn) row.kaynak = kn.slice(0, 12000);
      items[id] = row;
    });
    [].forEach.call(s.querySelectorAll('[data-hk]'), function (box) {
      var k = box.getAttribute('data-hk'), vEl = box.querySelector('[data-h-v]'), srcEl = box.querySelector('[data-h-src]');
      if (C.HIRCINLIK_IRK[k] && C.HIRCINLIK_IRK[k].seviye) { irk[k] = { seviye: C.HIRCINLIK_IRK[k].seviye, src: srcEl ? srcEl.value.trim().slice(0, 12000) : '' }; return; }
      if (C.HIRCINLIK_IRK[k] && C.HIRCINLIK_IRK[k].veriYok) { irk[k] = { veriYok: true }; return; }
      if (vEl && vEl.value !== '') { var v = Number(vEl.value); if (!isFinite(v) || v < 0) { bad = bad || vEl; return; } irk[k] = { v: v, src: srcEl ? srcEl.value.trim().slice(0, 12000) : '' }; }
    });
    [].forEach.call(s.querySelectorAll('[data-h-esik]'), function (el) { var v = Number(el.value); if (!isFinite(v) || v <= 0) { bad = bad || el; return; } esik[el.getAttribute('data-h-esik')] = v; });
    if (bad) { bad.focus(); return null; }
    return { melezYon: C.melezYonMerge({ items: items }), hircinlik: C.hircinlikMerge({ esik: esik, irk: irk }) };
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
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Arı genetikleri (yönlü melez + hırçınlık)' }); }).then(function (r) {
      if (r.error) throw r.error;
      C.ogulSkorSet(o, { at: new Date().toISOString() }); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'melezYon' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'melezYon') paint(); });
  paint();
})();
