/* koloni-286: Yönetici › Bilgi arşivi. Konu klasörleri (bilgi_klasorleri) ve kayıtlar (bilgi_kayitlari) doğrudan Supabase'ten (RLS: yalnız yönetici).
   Akordeon klasörler, kayıt başına kaynaklar, arama, yeni kayıt ekleme. Kullanıcı sayfalarında gösterilmez. Yeni API fonksiyonu yok. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel');
  if (!host || document.getElementById('s-bilgi-arsivi')) return;
  var nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t) { return esc(t).replace(/uzman tahmini/g, '<span class="mk-ut">uzman tahmini</span>').replace(/Veri yok/g, '<b class="ba-vy">Veri yok</b>').replace(/\n/g, '<br>'); }
  function rozet(d) { return d === 'kaynaklı' ? '<span class="ba-rz ba-ok">kaynaklı</span>' : d === 'karışık' ? '<span class="ba-rz ba-mx">kaynaklı + uzman tahmini</span>' : '<span class="mk-ut">uzman tahmini</span>'; }
  if (!document.getElementById('ba-css')) { var st = document.createElement('style'); st.id = 'ba-css'; st.textContent = '#s-bilgi-arsivi .ba-q{width:100%;box-sizing:border-box;font-size:16px;padding:.5rem .6rem;border:1px solid #e5d9c6;border-radius:10px;margin:.3rem 0 .5rem}#s-bilgi-arsivi .ba-k{border-top:1px solid #f0e6d6;padding:.45rem 0}#s-bilgi-arsivi .ba-k h4{margin:0 0 .25rem;font-size:.9rem}#s-bilgi-arsivi .ba-t{font-size:.82rem;line-height:1.45;overflow-wrap:anywhere}#s-bilgi-arsivi .ba-s{margin:.35rem 0 0;padding-left:1.1rem;font-size:.74rem}#s-bilgi-arsivi .ba-s a{overflow-wrap:anywhere}#s-bilgi-arsivi .ba-rz{display:inline-block;border-radius:6px;font-size:.62rem;padding:0 .25rem;font-weight:700}#s-bilgi-arsivi .ba-ok{background:#e3f4e8;color:#1f7a3d}#s-bilgi-arsivi .ba-mx{background:#fff3d6;color:#8a5a00}#s-bilgi-arsivi .ba-vy{color:#6b7280}#s-bilgi-arsivi .ba-n{color:#8a7358;font-weight:400;font-size:.78rem;margin-left:auto}#s-bilgi-arsivi .ba-f label{display:block;font-size:.78rem;margin:.3rem 0}#s-bilgi-arsivi .ba-f input,#s-bilgi-arsivi .ba-f textarea,#s-bilgi-arsivi .ba-f select{width:100%;box-sizing:border-box;font-size:16px}'; document.head.appendChild(st); }
  var s = document.createElement('section'); s.className = 'card fe mk'; s.id = 's-bilgi-arsivi';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-bilgi-arsivi">Bilgi arşivi</a>');
  var K = [], R = [], acik = {}, q = '', durumMsg = 'Yükleniyor…';
  function eslesir(r, k) { if (!q) return true; var h = (r.baslik + ' ' + r.icerik + ' ' + k.ad + ' ' + (r.kaynaklar || []).map(function (x) { return x.ad; }).join(' ')).toLocaleLowerCase('tr'); return q.toLocaleLowerCase('tr').split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; }); }
  function kayit(r) {
    var ks = (r.kaynaklar || []).filter(function (x) { return x && (x.ad || x.url); });
    return '<div class="ba-k"><h4>' + esc(r.baslik) + ' ' + rozet(r.durum) + '</h4><div class="ba-t">' + fmt(r.icerik) + '</div>' +
      (ks.length ? '<ol class="ba-s">' + ks.map(function (x) { return '<li>' + esc(x.ad || '') + (x.url ? ' — <a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(String(x.url).replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)) + '</a>' : '') + '</li>'; }).join('') + '</ol>' : '<p class="ba-t" style="margin:.3rem 0 0"><b class="ba-vy">Kaynak: Veri yok</b></p>') + '</div>';
  }
  function paint() {
    var H = '<h2>Bilgi arşivi</h2><p class="fe-sub">Araştırma notları konu klasörlerinde; kaynaklar yalnız burada. Kaynaksız yargılar <span class="mk-ut">uzman tahmini</span>, veri olmayan yerler «Veri yok».</p>' +
      '<input type="search" class="ba-q" data-ba-q placeholder="Arşivde ara (ör. Kafkas, varroa, NTC)" value="' + esc(q) + '">';
    if (!K.length) H += '<p class="fe-meta">' + esc(durumMsg) + '</p>';
    var top = 0;
    K.forEach(function (k) {
      var rs = R.filter(function (r) { return r.klasor_id === k.id && eslesir(r, k); });
      if (q && !rs.length) return; top += rs.length;
      var all = R.filter(function (r) { return r.klasor_id === k.id; }).length;
      H += '<details class="tr-d tr-k" data-ba-k="' + esc(k.id) + '"' + (acik[k.id] || (q && rs.length) ? ' open' : '') + '><summary>📁 ' + esc(k.ad) + '<span class="ba-n">' + (q ? rs.length + '/' : '') + all + ' kayıt</span></summary><div class="tr-body">' +
        (k.aciklama ? '<p class="fe-sub" style="margin:.1rem 0 .3rem">' + fmt(k.aciklama) + '</p>' : '') + (rs.length ? rs.map(kayit).join('') : '<p class="ba-t"><b class="ba-vy">Veri yok</b></p>') + '</div></details>';
    });
    if (q && K.length && !top) H += '<p class="fe-meta">Eşleşen kayıt yok.</p>';
    if (K.length) H += '<details class="tr-d" data-ba-k="__yeni"' + (acik.__yeni ? ' open' : '') + '><summary>＋ Yeni kayıt / klasör</summary><div class="tr-body ba-f">' +
      '<label>Klasör<select data-ba-f="klasor">' + K.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.ad) + '</option>'; }).join('') + '<option value="__yeni">Yeni klasör…</option></select></label>' +
      '<label>Yeni klasör adı (yalnız «Yeni klasör» seçiliyse)<input data-ba-f="kad"></label>' +
      '<label>Başlık<input data-ba-f="baslik"></label><label>İçerik<textarea rows="5" data-ba-f="icerik"></textarea></label>' +
      '<label>Kaynaklar (her satır: başlık | bağlantı)<textarea rows="3" data-ba-f="kaynak"></textarea></label>' +
      '<label>Durum<select data-ba-f="durum"><option>uzman tahmini</option><option>kaynaklı</option><option>karışık</option></select></label>' +
      '<button type="button" class="btn" data-ba-save>Kaydet</button><p class="fe-meta" data-ba-stat></p></div></details>';
    s.innerHTML = H;
  }
  function slug(t) { return String(t).toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Date.now().toString(36); }
  function yukle() {
    if (!B || !B.client) { durumMsg = 'Bağlantı yok: Veri yok.'; paint(); return; }
    B.client().then(function (c) {
      return Promise.all([c.from('bilgi_klasorleri').select('*').order('sira'), c.from('bilgi_kayitlari').select('*').order('sira')]);
    }).then(function (rr) {
      if (rr[0].error) throw rr[0].error; if (rr[1].error) throw rr[1].error;
      K = rr[0].data || []; R = rr[1].data || []; durumMsg = K.length ? '' : 'Arşiv boş: Veri yok.'; paint();
    }).catch(function (e) { durumMsg = 'Yüklenemedi: ' + ((e && e.message) || 'bağlantı'); paint(); });
  }
  s.addEventListener('toggle', function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute('data-ba-k') && !q) acik[d.getAttribute('data-ba-k')] = d.open; }, true);
  s.addEventListener('input', function (e) { if (!e.target.hasAttribute('data-ba-q')) return; q = e.target.value.trim(); var pos = e.target.selectionStart; paint(); var i = s.querySelector('[data-ba-q]'); i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} });
  s.addEventListener('click', function (e) {
    if (!e.target.hasAttribute('data-ba-save')) return;
    function v(n) { var el = s.querySelector('[data-ba-f="' + n + '"]'); return el ? el.value.trim() : ''; }
    var st = s.querySelector('[data-ba-stat]'), kid = v('klasor'), kad = v('kad'), bas = v('baslik');
    if (!bas || (kid === '__yeni' && !kad)) { st.textContent = 'Başlık (ve yeni klasör adı) gerekli.'; return; }
    var ks = v('kaynak').split('\n').map(function (l) { var p = l.split('|'); return { ad: (p[0] || '').trim(), url: (p[1] || '').trim() }; }).filter(function (x) { return x.ad || x.url; });
    st.textContent = 'Kaydediliyor…';
    B.client().then(function (c) {
      var p = Promise.resolve();
      if (kid === '__yeni') { kid = slug(kad); p = c.from('bilgi_klasorleri').insert({ id: kid, ad: kad, sira: (K.length + 1) * 10 }).then(function (r) { if (r.error) throw r.error; }); }
      return p.then(function () { return c.from('bilgi_kayitlari').insert({ id: slug(bas), klasor_id: kid, baslik: bas, icerik: v('icerik'), durum: v('durum') || 'uzman tahmini', kaynaklar: ks, sira: 1000 }); });
    }).then(function (r) { if (r && r.error) throw r.error; acik[kid] = true; yukle(); }).catch(function (er) { st.textContent = 'Kaydedilemedi: ' + ((er && er.message) || 'bağlantı'); });
  });
  paint(); yukle();
})();
