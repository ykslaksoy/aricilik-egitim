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
