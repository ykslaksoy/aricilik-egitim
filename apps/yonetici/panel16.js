/* koloni-267 (önizleme): Yönetici · Bal hedefi ve Tartı döşemeleri. Tek kaynak: ogul_skor_ayar.data.balHedef (sa_ayar_yayinla).
   Varsayılanlar bal-hedef.js (uygulamadaki apps/web/bal-hedef.js ile birebir). Kaynaklar yalnız burada gösterilir.
   Ani düşüş ve Nektar akımı eşikleri burada değil: Ölçüm kuralları › Ağırlık (tartı) (uyarılarla aynı kural). */
(function () {
  'use strict';
  var B = window.SuperAriBulut, D = window.SuperAriDemo, BH = window.SuperAriBalHedef, host = document.getElementById('panel');
  if (!host || !BH || document.getElementById('s-bal-hedef')) return;
  var C = D && D.colony, nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UT = '<span class="mk-ut">uzman tahmini</span>';
  var NBU = 'NBU Fact Sheet 19 «Preparing honey bee colonies for winter» — sonbaharda koloni başına ≈20 kg bal (Doeke, Frazier, Grozinger 2015, Curr Opin Insect Sci 10) — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Fact_Sheets/Fact_19_Preparing_your_hives_for_winter.pdf';
  var GENEL = [
    ['Sezon bal hedefi (kovan başı)', [['baseKg', 'Taban hedef (kg / kovan)'], ['genelKat', 'Genel katsayı'], ['sisKelime', 'Sisli bölge: arılık adında geçen kelimeler (virgülle)', 's'], ['sisPay', 'Sisli bölgede uçuşa kapalı gün payı (0–1)']]],
    ['Tartı döşemeleri', [['kisStokKg', 'Kış stoğu: net bal bunun altıysa «yetersiz» (kg)', 0, NBU], ['hasatFazlaKg', 'Hasada hazır: net bal ≥ kış stoğu + bu kadar (kg)'], ['nektarGun', 'Nektar akımı: son kaç günün tartımı (gün)']]]
  ];
  if (!document.getElementById('bh-css')) { var st = document.createElement('style'); st.id = 'bh-css'; st.textContent = '#s-bal-hedef .bh-v{width:1%}#s-bal-hedef small.bh-def{display:block!important;font-size:.72rem;color:var(--muted,#8a7358);margin-top:.15rem;max-width:7.5rem;overflow-wrap:anywhere;white-space:normal}#s-bal-hedef td small{overflow-wrap:anywhere;word-break:break-word;white-space:normal!important}#s-bal-hedef table{table-layout:fixed}#s-bal-hedef .bh-v{width:8rem}#s-bal-hedef .tbl td{vertical-align:middle}'; document.head.appendChild(st); }
  var cur = BH.get(), acik = {};
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-bal-hedef';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-bal-hedef">Bal hedefi</a>');
  function inp(k, v, t) {
    if (t === 's') return '<input type="text" style="width:7rem" data-bh-k="' + k + '" data-bh-s value="' + esc(v) + '">';
    return '<input type="number" step="any" min="0" style="width:5.5rem" data-bh-k="' + k + '" value="' + esc(v) + '">';
  }
  function bol(id, baslik, inner) { return '<details class="tr-d tr-k hz-bol" data-bh-bol="' + id + '"' + (acik[id] ? ' open' : '') + '><summary>📁 ' + esc(baslik) + '</summary><div class="tr-body">' + inner + '</div></details>'; }
  function paint() {
    var H = '<h2>Bal hedefi ve Tartı döşemeleri</h2><p class="fe-sub">Arılık sayfasındaki «Bal hedefi» ve Raporlar › Bal / verim «Hedef» sütunu: kovan başı = taban × ırk katsayısı × sis uçuş katı × genel katsayı; arılık toplamı = kovan başı × <b>aktif kovan sayısı</b>. ' +
      'Tartı sayfası döşemeleri (Kış stoğu, Hasada hazır, Nektar akımı) da buradan. <b>Ani düşüş</b> ve <b>Nektar akımı</b> günlük eşikleri: Ölçüm kuralları › Ağırlık (tartı) (uyarılarla aynı). ' +
      '<b>Kaynak:</b> kış stoğu dışındaki tüm sayılar ' + UT + ' (Yapılacaklar’da).</p>';
    GENEL.forEach(function (g, gi) {
      var t = '<table class="tbl" style="width:100%;font-size:.85rem"><tbody>';
      g[1].forEach(function (r) { var d = BH.DEF[r[0]]; t += '<tr><td>' + esc(r[1]) + ' ' + (r[3] ? '<br><small>Kaynak: ' + esc(r[3]) + '</small>' : UT) + '</td><td class="bh-v">' + inp(r[0], cur[r[0]], r[2]) + '<small class="bh-def">varsayılan ' + esc(String(d)) + '</small></td></tr>'; });
      H += bol('g' + gi, g[0] + ' · ' + g[1].length + ' ayar', t + '</tbody></table>');
    });
    var t2 = '<p class="fe-sub" style="margin:.2rem 0 .4rem">Sis yoksa «Katsayı», sisli bölgede «Sisli katsayı» kullanılır; «Sis kaybı» × uçuşa kapalı gün payı kadar düşülür. ' + UT + '</p><div style="overflow:auto"><table class="tbl" style="font-size:.82rem"><thead><tr><th>Irk</th><th>Katsayı</th><th>Sisli katsayı</th><th>Sis kaybı</th></tr></thead><tbody>';
    BH.IRK_SIRA.forEach(function (k) { var v = cur.irk[k]; t2 += '<tr><td>' + esc(k) + '</td>' + ['kat', 'katSis', 'sisKayip'].map(function (f) { return '<td>' + inp('irk.' + k + '.' + f, v[f]) + '</td>'; }).join('') + '</tr>'; });
    H += bol('irk', 'Irk katsayıları · ' + BH.IRK_SIRA.length + ' ırk', t2 + '</tbody></table></div>');
    H += '<div class="hz-row" style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-bh-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-bh-reset>Varsayılanlara dön</button></div><p class="fe-meta" data-bh-stat style="min-height:1.2em"></p>';
    s.innerHTML = H;
  }
  function stat(m) { var e = s.querySelector('[data-bh-stat]'); if (e) e.innerHTML = m; }
  s.addEventListener('toggle', function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute('data-bh-bol')) acik[d.getAttribute('data-bh-bol')] = d.open; }, true);
  function topla() {
    var o = { irk: {} }, bad = null;
    [].forEach.call(s.querySelectorAll('[data-bh-k]'), function (i) {
      var k = i.getAttribute('data-bh-k'), v;
      if (i.value === '') return;
      if (i.hasAttribute('data-bh-s')) v = i.value; else { v = Number(String(i.value).replace(',', '.')); if (!isFinite(v) || v < 0) { bad = bad || i; return; } }
      if (k.indexOf('irk.') === 0) { var p = k.split('.'), f = p.pop(), n = p.slice(1).join('.'); (o.irk[n] = o.irk[n] || {})[f] = v; } else o[k] = v;
    });
    if (bad) { var d = bad.closest('details'); if (d) d.open = true; bad.focus(); return null; }
    if (o.sisPay != null && o.sisPay > 1) { stat('<b>Sisli gün payı 0–1 arasında olmalı.</b>'); return false; }
    return BH.merge(o);
  }
  s.addEventListener('click', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-bh-reset')) { cur = BH.merge(null); paint(); stat('Varsayılanlar yüklendi (kaydedilmedi).'); return; }
    if (!t.hasAttribute('data-bh-save')) return;
    var n = topla(); if (n === null) { stat('<b>Geçersiz değer</b>: 0 veya üstü bir sayı girin.'); return; } if (n === false) return;
    if (!C || !B || !B.client) { stat('Bağlantı yok; kaydedilemedi.'); return; }
    if (!confirm('Bal hedefi ve Tartı döşemesi ayarları tüm kullanıcılar için kaydedilsin mi?')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    var o = JSON.parse(JSON.stringify(C.ogulSkor() || {})); o.balHedef = n;
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Bal hedefi ve Tartı döşemeleri' }); }).then(function (r) {
      if (r.error) throw r.error; C.ogulSkorSet(o, { at: new Date().toISOString() }); cur = BH.get(); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'balHedef' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'balHedef') { cur = BH.get(); paint(); } });
  paint();
})();
