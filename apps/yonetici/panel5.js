/* k161 EK7/EK8: Yönetici · Hesaplar ve ekipler + Arılık çevresi (yalnız admin; RLS/RPC sa_is_admin) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function zt(t) { return t ? new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }
  var RA = { owner: 'Sahip', arici: 'Arıcı', bakici: 'Bakıcı' }, ISL = { INSERT: 'ekledi', UPDATE: 'güncelledi', DELETE: 'sildi' };
  var nav = host.querySelector('nav.nav');
  /* ---- Hesaplar ve ekipler ---- */
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-ekip';
  s.innerHTML = '<h2>Hesaplar ve ekipler</h2><p class="fe-sub">Tüm hesaplar, arılıklar, üyeler ve roller (Sahip, Arıcı, Bakıcı), e-posta onayı, bekleyen davetler, son giriş ve etkinlik günlüğü. Yönetici başkasının şifresini değiştiremez; yalnız sıfırlama e-postası gönderir. Her işlem onay ister.</p><div class="bd">Yükleniyor…</div>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-ekip">Hesaplar ve ekipler</a>');
  var bd = s.querySelector('.bd'), C = null;
  function yukle() {
    B.client().then(function (c) { C = c; return Promise.all([c.rpc('sa_admin_hesaplar'), c.rpc('sa_admin_uyeler'), c.from('apiary_invites').select('id,apiary_id,email,role,created_at,expires_at').is('accepted_at', null), c.from('sa_etkinlik').select('at,user_id,apiary_id,tablo,islem,tur').order('at', { ascending: false }).limit(30)]); })
      .then(function (r) {
        if (r[0].error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
        var H = r[0].data || [], U = r[1].data || [], I = (r[2] && r[2].data) || [], E = (r[3] && r[3].data) || [], ep = {}, apAd = {};
        H.forEach(function (h) { ep[h.user_id] = h.email; }); U.forEach(function (u) { apAd[u.apiary_id] = u.apiary_ad; });
        var gr = {}; U.forEach(function (u) { (gr[u.apiary_id] = gr[u.apiary_id] || []).push(u); });
        bd.innerHTML =
          '<h3 style="margin:.6rem 0 .3rem">Hesaplar (' + H.length + ')</h3><table class="tb" style="width:100%;font-size:.85rem;border-collapse:collapse"><tr><th align="left">E-posta</th><th>Onay</th><th>Son giriş</th><th></th></tr>' +
          H.map(function (h) { return '<tr style="border-top:1px solid #eee"><td>' + esc(h.email) + '</td><td align="center">' + (h.onayli ? '✅' : '⏳ Bekliyor') + '</td><td align="center">' + esc(zt(h.son_giris)) + '</td><td><button type="button" class="btn secondary" data-sifirla="' + esc(h.email) + '">Sıfırlama e-postası</button></td></tr>'; }).join('') + '</table>' +
          '<h3 style="margin:.9rem 0 .3rem">Arılıklar ve üyeler</h3>' + Object.keys(gr).map(function (a) {
            return '<details open style="margin:.3rem 0"><summary><b>' + esc(apAd[a] || a) + '</b> · ' + gr[a].length + ' üye</summary>' + gr[a].map(function (u) {
              return '<div style="display:flex;gap:.5rem;align-items:center;padding:.25rem 0 .25rem .8rem;flex-wrap:wrap"><span style="flex:1;min-width:140px">' + esc(u.email) + '</span>' +
                (u.role === 'owner' ? '<b>Sahip</b>' : '<select data-rol="' + esc(a) + '|' + esc(u.user_id) + '"><option value="arici"' + (u.role === 'arici' ? ' selected' : '') + '>Arıcı</option><option value="bakici"' + (u.role === 'bakici' ? ' selected' : '') + '>Bakıcı</option></select> <button type="button" class="btn secondary" data-cikar="' + esc(a) + '|' + esc(u.user_id) + '">Çıkar</button>') + '</div>';
            }).join('') + '</details>';
          }).join('') +
          '<h3 style="margin:.9rem 0 .3rem">Bekleyen davetler (' + I.length + ')</h3>' + (I.length ? I.map(function (d) { return '<div style="display:flex;gap:.5rem;align-items:center;padding:.2rem 0"><span style="flex:1">' + esc(d.email) + ' · ' + esc(RA[d.role] || d.role) + ' · ' + esc(apAd[d.apiary_id] || '') + '</span><button type="button" class="btn secondary" data-iptal="' + esc(d.id) + '">İptal</button></div>'; }).join('') : '<p class="fe-empty">Yok.</p>') +
          '<h3 style="margin:.9rem 0 .3rem">Etkinlik günlüğü</h3>' + (E.length ? '<ol class="fe-list">' + E.map(function (e) { return '<li>' + esc(zt(e.at)) + ' · <b>' + esc(ep[e.user_id] || 'bilinmiyor') + '</b> ' + esc(e.tur || e.tablo) + ' kaydını ' + esc(ISL[e.islem] || e.islem) + (apAd[e.apiary_id] ? ' · ' + esc(apAd[e.apiary_id]) : '') + '</li>'; }).join('') + '</ol>' : '<p class="fe-empty">Henüz kayıt yok.</p>');
      }).catch(function () { bd.innerHTML = '<p class="fe-empty">Bağlantı kurulamadı.</p>'; });
  }
  s.addEventListener('change', function (e) {
    var t = e.target.closest('[data-rol]'); if (!t) return; var p = t.getAttribute('data-rol').split('|');
    if (!confirm('Rol ' + RA[t.value] + ' olarak değiştirilsin mi?')) { yukle(); return; }
    C.rpc('sa_admin_rol', { aid: p[0], uid: p[1], yeni: t.value }).then(yukle);
  });
  s.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cikar) { var p = b.dataset.cikar.split('|'); if (confirm('Üye arılıktan çıkarılsın mı?')) C.rpc('sa_admin_rol', { aid: p[0], uid: p[1], yeni: 'cikar' }).then(yukle); }
    if (b.dataset.iptal && confirm('Davet iptal edilsin mi?')) C.rpc('sa_admin_davet_iptal', { did: b.dataset.iptal }).then(yukle);
    if (b.dataset.sifirla && confirm(b.dataset.sifirla + ' adresine şifre sıfırlama e-postası gönderilsin mi?')) B.resetPassword(b.dataset.sifirla).then(function () { b.textContent = 'Gönderildi'; }).catch(function () { b.textContent = 'Gönderilemedi'; });
  });
  yukle();
  /* ---- Arılık çevresi (EK8) ---- */
  var c2 = document.createElement('section'); c2.className = 'card fe'; c2.id = 's-cevre';
  c2.innerHTML = '<h2>Arılık çevresi</h2><p class="fe-sub">3 km içinde en yakın su kaynağı (OpenStreetMap, Overpass) ve arazi örtüsü oranları (ESA WorldCover 2021). Uygulamada yalnız kısa uyarı görünür; mesafe gösterilmez. Su eşikleri (≤500 m güvenli, 1500 m üstü çok uzak) <b>uzman tahmini</b>, Oğul skorları › sensör bölümünden ayarlanır. Yenileme betiği: <code>scripts/arilik_cevre.py</code>.</p><div class="bd">Yükleniyor…</div><button type="button" class="btn secondary" id="cvYenile">Yenile</button>';
  host.appendChild(c2); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-cevre">Arılık çevresi</a>');
  function cevre() {
    var b2 = c2.querySelector('.bd');
    B.client().then(function (c) { return c.from('arilik_cevre').select('*').order('arilik_id'); }).then(function (r) {
      var L = (r && r.data) || []; if (!L.length) { b2.innerHTML = '<p class="fe-empty">Veri yok.</p>'; return; }
      var ad = { agac: 'Ağaç', calilik: 'Çalılık', cayir: 'Çayır', tarim: 'Tarım', yerlesim: 'Yerleşim', ciplak: 'Çıplak', su: 'Su' };
      b2.innerHTML = '<table style="width:100%;font-size:.82rem;border-collapse:collapse"><tr><th align="left">Arılık</th><th>Su</th><th>Örtü</th><th>Alan</th></tr>' + L.map(function (x) {
        var o = x.ortu || {}; return '<tr style="border-top:1px solid #eee"><td>' + esc((window.__apAd && window.__apAd[x.arilik_id]) || x.arilik_id.slice(0, 8)) + '</td><td align="center">' + (x.su_kaynagi_mesafe_metre == null ? 'Veri yok' : x.su_kaynagi_mesafe_metre + ' m · ' + esc(x.su_kaynagi_turu || '')) + '</td><td>' +
          Object.keys(o).filter(function (k) { return o[k] >= 0.01; }).map(function (k) { return (ad[k] || k) + ' %' + Math.round(o[k] * 100); }).join(', ') + '</td><td align="center">' + (x.toplama_alani_guvenli == null ? 'Veri yok' : (x.toplama_alani_guvenli ? 'Güvenli' : 'Zayıf')) + '</td></tr>';
      }).join('') + '</table><p class="fe-sub">Kaynak: ' + esc(L[0].kaynak || '') + ' · Son hesap: ' + esc(zt(L[0].hesaplandi)) + '</p>';
    });
  }
  c2.querySelector('#cvYenile').addEventListener('click', cevre); cevre();
})();
