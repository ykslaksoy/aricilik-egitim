/* koloni-291 (önizleme): Yönetici › Arı genetikleri — yönlü ikili melez düzenleyici (Muğla×Kafkas iki yön, Efe×Kafkas).
   Tek kaynak: ogul_skor_ayar.data.melezYon (sa_ayar_yayinla). Kilitli GENETIK_MELEZ tablosu değişmez. */
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
    st.textContent = '#s-melez-yon .my-box{border:1px solid #e5d9c6;border-radius:10px;padding:.55rem .65rem;margin:.45rem 0}#s-melez-yon .my-box h3{margin:0 0 .35rem;font-size:.95rem}#s-melez-yon label{display:block;font-size:.78rem;margin:.35rem 0}#s-melez-yon input,#s-melez-yon textarea{width:100%;box-sizing:border-box;font-size:16px}#s-melez-yon .my-def{font-size:.72rem;color:#8a7358;margin-top:.15rem}';
    document.head.appendChild(st);
  }
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-melez-yon';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-melez-yon">Arı genetikleri</a>');
  function eff() { return C.melezYonMerge((C.ogulSkor() || {}).melezYon); }
  function paint() {
    var E = eff(), H = '<h2>Arı genetikleri — yönlü ikili melezler</h2><p class="fe-sub">«Muğla ana × Kafkas baba», «Kafkas ana × Muğla baba» ve «Efe ana × Kafkas baba» için genetik puan (kilitli tablo basamağının üstüne yazılabilir), kullanıcıda görünen «Melez özelliği» satırı ve kaynak/notlar (yalnız burada). Boş genetik alanı = mevcut basamak (' + UT + '). Kilitli genetik tabloya anahtar eklenmez.</p>';
    (C.CROSS_YON || []).forEach(function (y) {
      var it = E.items[y.id] || {}, vg = C.melezYonVarsayilanGenetik(y.id);
      H += '<div class="my-box" data-my-id="' + esc(y.id) + '"><h3>' + esc(y.ad) + '</h3>' +
        '<label>Genetik puan (0–100, isteğe bağlı)<input type="number" min="0" max="100" step="1" data-my-g value="' + (it.genetik != null ? esc(it.genetik) : '') + '" placeholder="' + esc(vg == null ? '' : vg) + '"><span class="my-def">varsayılan basamak: <b>' + esc(vg == null ? 'Veri yok' : vg) + '</b> · ' + UT + '</span></label>' +
        '<label>Melez özelliği (kullanıcı sayfaları)<textarea rows="2" data-my-oz maxlength="500">' + esc(it.ozet || y.ozet) + '</textarea></label>' +
        '<label>Kaynaklar / notlar (yalnız yönetici)<textarea rows="4" data-my-kn maxlength="12000" placeholder="Akyol 1998; panel6 kartı ile aynı notlar…">' + esc((it.kaynak || '') + (it.not ? (it.kaynak ? '\n\n' : '') + it.not : '')) + '</textarea></label></div>';
    });
    H += '<div class="hz-row" style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-my-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-my-reset>Varsayılan metinlere dön</button></div><p class="fe-meta" data-my-stat style="min-height:1.2em"></p>';
    s.innerHTML = H;
  }
  function stat(m) { var e = s.querySelector('[data-my-stat]'); if (e) e.innerHTML = m; }
  function topla() {
    var items = {}, bad = null;
    [].forEach.call(s.querySelectorAll('[data-my-id]'), function (box) {
      var id = box.getAttribute('data-my-id'), gEl = box.querySelector('[data-my-g]'), oz = box.querySelector('[data-my-oz]').value.trim(), kn = box.querySelector('[data-my-kn]').value.trim();
      var row = { ozet: oz };
      if (gEl.value !== '') { var g = Number(gEl.value); if (!isFinite(g) || g < 0 || g > 100) { bad = bad || gEl; return; } row.genetik = g; }
      if (kn) row.kaynak = kn.slice(0, 12000);
      items[id] = row;
    });
    if (bad) { bad.focus(); return null; }
    return C.melezYonMerge({ items: items });
  }
  s.addEventListener('click', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-my-reset')) { paint(); stat('Varsayılan metinler yüklendi (kaydedilmedi).'); return; }
    if (!t.hasAttribute('data-my-save')) return;
    var n = topla(); if (n === null) { stat('<b>Geçersiz genetik puan</b>: 0–100 arası olmalı.'); return; }
    if (!B || !B.client) { stat('Bağlantı yok; kaydedilemedi.'); return; }
    if (!confirm('Yönlü melez ayarları tüm kullanıcılar için kaydedilsin mi?')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    var o = JSON.parse(JSON.stringify(C.ogulSkor() || {})); o.melezYon = n;
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Yönlü ikili melezler (Arı genetikleri)' }); }).then(function (r) {
      if (r.error) throw r.error;
      C.ogulSkorSet(o, { at: new Date().toISOString() }); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'melezYon' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'melezYon') paint(); });
  paint();
})();
