/* koloni-223: Yönetici · Yedekler ve geri alma — tüm hesaplar. Saklama süresi (uzman tahmini; düzenlenir), hesap seç → tarihli yedekler → önizle → tüm hesap / bölüm / tek kayıt geri yükle (onaylı, kayda yazılır, geri alınabilir). */
(function () {
  'use strict';
  var B = window.SuperAriBulut, Y = window.SuperAriYedekBulut, host = document.getElementById('panel'); if (!host || !Y) return;
  var nav = host.querySelector('nav.nav'), esc = Y.esc;
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-yedek';
  s.innerHTML = '<h2>Yedekler ve geri alma</h2><p class="fe-sub">Her hesabın günlük yedeği (03:00 TSİ). Seçilen tarihe tüm hesap, bir bölüm ya da tek kayıt döndürülür; önce fark gösterilir, şimdiki hâl ayrıca yedeklenir, işlem değişiklik kaydına yazılır ve geri alınabilir.</p>'
    + '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:end;margin:.2rem 0 .6rem"><label>Günlük yedek (gün)<br><input type="number" min="7" max="3650" data-y-gun style="width:7rem"></label><label>Aylık yedek (ay)<br><input type="number" min="0" max="240" data-y-ay style="width:7rem"></label><label>Telefon yedeği uyarısı (gün)<br><input type="number" min="1" max="60" data-y-uyari style="width:7rem"></label><label>Telefon yedeği boyut eşiği (KB)<br><input type="number" min="10" max="51200" data-y-boyut style="width:7rem"></label><label>Boyut yedekleri arası en az (dk)<br><input type="number" min="5" max="1440" data-y-aralik style="width:7rem"></label><button class="btn" data-y-kaydet style="width:auto;padding:.4rem 1.2rem">Kaydet</button><small class="fe-meta">Uzman tahmini (bilimsel kaynak yok); ayın 1\'indeki yedek aylık sayılır. Saklama telefon yedeklerine de uygulanır; telefon bu kadar gün buluta yedek göndermezse uyarı verir. Günlük yedeğe ek olarak, son gönderimden beri gönderilmemiş değişiklik boyut eşiğine ulaşınca telefon ayrıca yedek alıp gönderir (en az belirtilen dakika arayla; aynı gündekiler ayrı saklanır).</small></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.6rem"><div><select data-y-hesap style="width:100%;margin:0 0 .3rem"><option value="">Tüm hesaplar</option></select><div class="bd" data-y-liste style="min-height:12rem;max-height:60vh;overflow:auto">Yükleniyor…</div></div>'
    + '<div><b data-y-bas>Önizleme</b><div data-y-onz style="min-height:12rem;max-height:60vh;overflow:auto"><p class="mk-vy">Bir yedekte «Önizle»ye bas.</p></div><button class="btn" data-y-tum hidden style="margin-top:.4rem">Tüm hesabı bu tarihe döndür</button></div></div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Telefon yedekleri</h3><p class="fe-meta" style="margin:0 0 .3rem">Telefonda alınıp buluta gönderilen yedekler (cihaz listesi, ayarlar, gönderilmemiş kayıtlar, fotoğraf dosyaları). Geri yükleme telefonda, Ayarlar › Yedekler ve geri alma\'dan yapılır.</p><div class="bd" data-y-tel style="max-height:40vh;overflow:auto">Yükleniyor…</div>'
    + '<h3 style="margin:.8rem 0 .3rem;font-size:1rem">Geri yüklemeler</h3><div data-y-yk style="min-height:3rem">—</div><p class="fe-meta" data-y-stat style="min-height:1.2em"></p>'
    + '<style>.yd-d{display:inline-block;font-size:.72rem;border-radius:8px;padding:1px 7px;margin-right:4px}.yd-eklenecek{background:#e3f4e1;color:#1f5d1a}.yd-degisecek{background:#fdf0cf;color:#7a5300}.yd-silinecek{background:#fbe1dd;color:#8a2416}</style>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-yedek">Yedekler</a>');
  var q = function (a) { return s.querySelector('[' + a + ']'); };
  var ORNEK = new URLSearchParams(location.search).get('demo') === '1' || !B, ROWS = [], SEC = null, FARK = [], CL = null;
  function stat(t) { q('data-y-stat').textContent = t || ''; }
  function ornek() {
    var n = Date.now(), D = 864e5, iso = function (k) { return new Date(n - k * D).toISOString(); };
    var a = { apiaries: 5, hives: 145, queens: 145, records: 24, tasks: 18 }, b = { apiaries: 3, hives: 42, queens: 40, records: 318, tasks: 12, stock_items: 9, photos: 27 };
    return [{ id: 12, hesap_id: 'a', email: 'ykslaksoy@gmail.com', tarih: iso(0).slice(0, 10), tur: 'gunluk', at: iso(0), ozet: a }, { id: 11, hesap_id: 'b', email: 'ali@ornek.com', tarih: iso(0).slice(0, 10), tur: 'gunluk', at: iso(0), ozet: b },
      { id: 10, hesap_id: 'a', email: 'ykslaksoy@gmail.com', tarih: iso(1).slice(0, 10), tur: 'oncesi', at: iso(1), ozet: a }, { id: 9, hesap_id: 'b', email: 'ali@ornek.com', tarih: iso(1).slice(0, 10), tur: 'gunluk', at: iso(1), ozet: b }];
  }
  var TEL = [];
  function paint() {
    var h = q('data-y-hesap').value, L = ROWS.filter(function (y) { return !h || y.hesap_id === h; });
    q('data-y-liste').innerHTML = Y.yedekListe(L, { email: true });
    var T = TEL.filter(function (y) { return !h || y.hesap_id === h; }), top = 0; T.forEach(function (y) { top += +y.boyut || 0; });
    q('data-y-tel').innerHTML = Y.telefonListe(T, { email: true, sec: false }) + (T.length ? '<p class="fe-meta">' + T.length + ' telefon yedeği · toplam ' + (top / 1048576).toFixed(1) + ' MB (fotoğraflar yedekler arasında paylaşılır, bir kez saklanır)</p>' : '');
  }
  function hesaplar() {
    var m = {}; ROWS.concat(TEL).forEach(function (y) { m[y.hesap_id] = y.email || y.hesap_id; }); var sel = q('data-y-hesap'), v = sel.value;
    sel.innerHTML = '<option value="">Tüm hesaplar (' + Object.keys(m).length + ')</option>' + Object.keys(m).map(function (k) { return '<option value="' + esc(k) + '">' + esc(m[k]) + '</option>'; }).join(''); sel.value = v;
  }
  function yk() {
    if (ORNEK) { q('data-y-yk').innerHTML = Y.yuklemeListe([{ id: 4, yedek_tarih: ROWS[2].tarih, at: new Date(Date.now() - 5e6).toISOString(), email: 'ykslaksoy@gmail.com', kapsam: 'records', adet: 3 }], true); return; }
    Y.yuklemeler(CL, q('data-y-hesap').value || null).then(function (g) { q('data-y-yk').innerHTML = Y.yuklemeListe(g, true); }).catch(function () {});
  }
  function load() {
    if (ORNEK) { q('data-y-gun').value = 90; q('data-y-ay').value = 24; q('data-y-uyari').value = 2; q('data-y-boyut').value = 200; q('data-y-aralik').value = 240; TEL = [{ id: 5, hesap_id: 'a', email: 'ykslaksoy@gmail.com', tarih: new Date().toISOString().slice(0, 10), tur: 'gunluk', at: new Date().toISOString(), cihaz_ad: 'iPhone', boyut: 1450000, fotolar: ['a', 'b', 'c'] }, { id: 4, hesap_id: 'b', email: 'ali@ornek.com', tarih: new Date().toISOString().slice(0, 10), tur: 'elle', at: new Date(Date.now() - 4e6).toISOString(), cihaz_ad: 'Android telefon', boyut: 380000, fotolar: [] }]; ROWS = ornek(); hesaplar(); paint(); yk(); stat('Demo verisi'); return; }
    return B.client().then(function (c) { CL = c; return Promise.all([Y.liste(c, null), c.from('sa_yedek_ayar').select('*').eq('id', 1).maybeSingle(), c.rpc('sa_telefon_yedek_liste', { p_hesap: null }).then(function (t) { return (t && t.data) || []; }, function () { return []; })]); })
      .then(function (r) { ROWS = r[0]; var a = (r[1] && r[1].data) || { gunluk_gun: 90, aylik_ay: 24 }; q('data-y-gun').value = a.gunluk_gun; q('data-y-ay').value = a.aylik_ay; q('data-y-uyari').value = a.telefon_uyari_gun || 2; q('data-y-boyut').value = a.telefon_boyut_kb || 200; q('data-y-aralik').value = a.telefon_aralik_dk || 240; TEL = r[2]; hesaplar(); paint(); yk(); })
      .catch(function (e) { q('data-y-liste').innerHTML = '<p class="mk-vy">Veri yok – yüklenemedi (' + esc((e && e.message) || 'bağlantı') + ')</p>'; });
  }
  function onizle(id) {
    SEC = id; var y = ROWS.filter(function (r) { return String(r.id) === String(id); })[0];
    q('data-y-bas').textContent = 'Önizleme · ' + (y ? (y.email || '') + ' · ' + Y.gun(y.tarih) : '#' + id); q('data-y-onz').innerHTML = '<p class="mk-vy">Fark hesaplanıyor…</p>'; q('data-y-tum').hidden = true;
    (ORNEK ? Promise.resolve([{ tablo: 'hives', key: 'h1', durum: 'eklenecek', yedekte: { name: 'Kovan 124' } }, { tablo: 'records', key: 'r1', durum: 'degisecek', simdi: { kind: 'strength', record_date: '2026-10-15' }, yedekte: { kind: 'strength', record_date: '2026-10-15' } }, { tablo: 'tasks', key: 't', durum: 'silinecek', simdi: { due: '2026-10-19', data: { title: 'Varroa kontrolü' } } }]) : Y.fark(CL, id))
      .then(function (rows) { FARK = rows; q('data-y-onz').innerHTML = Y.onizleme(rows, { geri: true }); q('data-y-tum').hidden = !rows.length; })
      .catch(function (e) { q('data-y-onz').innerHTML = '<p class="mk-vy">Önizleme yapılamadı (' + esc((e && e.message) || '') + ')</p>'; });
  }
  function geri(t, k) {
    if (SEC == null) return;
    if (!confirm(q('data-y-bas').textContent.replace('Önizleme · ', '') + ' yedeği — ' + Y.kapsamMetni(t, k, FARK) + ' bu tarihe döndürülsün mü?\nŞimdiki hâl önce yedeklenir; işlem kayda yazılır ve geri alınabilir.')) return;
    if (ORNEK) { stat('Demo: geri yükleme yapılmaz.'); return; }
    stat('Geri yükleniyor…');
    Y.geriYukle(CL, SEC, t, k).then(function (r) { stat('Tamam: ' + r.adet + ' değişiklik geri yüklendi (#' + r.yukleme_id + '). Kullanıcının telefonu bir sonraki eşitlemede güncellenir.'); onizle(SEC); load(); })
      .catch(function (e) { stat('Geri yüklenemedi: ' + ((e && e.message) || 'bağlantı')); });
  }
  s.addEventListener('change', function (e) { if (e.target.matches('[data-y-hesap]')) { paint(); yk(); } });
  s.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-yd]'))) return onizle(b.getAttribute('data-yd'));
    if ((b = e.target.closest('[data-yd-tablo]'))) { e.preventDefault(); return geri(b.getAttribute('data-yd-tablo'), b.getAttribute('data-yd-key')); }
    if (e.target.closest('[data-y-tum]')) return geri(null, null);
    if ((b = e.target.closest('[data-yk-geri]'))) {
      var id = b.getAttribute('data-yk-geri'); if (!confirm('#' + id + ' geri yüklemesi geri alınsın mı?')) return;
      if (ORNEK) return stat('Demo: geri alma yapılmaz.');
      return Y.yuklemeGeriAl(CL, id).then(function (n) { stat('Geri alındı: ' + n + ' değişiklik.'); load(); }).catch(function (er) { stat('Geri alınamadı: ' + ((er && er.message) || '')); });
    }
    if (e.target.closest('[data-y-kaydet]')) {
      var g = +q('data-y-gun').value, a = +q('data-y-ay').value, u = +q('data-y-uyari').value, bk = +q('data-y-boyut').value, ad = +q('data-y-aralik').value;
      if (!(g >= 7 && g <= 3650 && a >= 0 && a <= 240 && u >= 1 && u <= 60 && bk >= 10 && bk <= 51200 && ad >= 5 && ad <= 1440)) return stat('Günlük 7–3650 gün, aylık 0–240 ay, telefon uyarısı 1–60 gün, boyut eşiği 10–51200 KB, aralık 5–1440 dk olmalı.');
      if (ORNEK) return stat('Demo: kaydedilmez.');
      CL.rpc('sa_yedek_ayar_kaydet', { p_gunluk: g, p_aylik: a, p_uyari: u, p_boyut_kb: bk, p_aralik_dk: ad }).then(function (r) { if (r.error) throw r.error; stat('Saklama süresi kaydedildi (değişiklik kaydına yazıldı).'); })
        .catch(function (er) { stat('Kaydedilemedi: ' + ((er && er.message) || '')); });
    }
  });
  load();
})();
