/* koloni-260: Yönetici · Hastalık tahmini ayarları. Tek kaynak: ogul_skor_ayar.data.hastalik (sa_ayar_yayinla).
   Varsayılanlar hastalik-ayar.js (uygulamadaki hastalik-tahmin.js ile birebir). Kaynaklar yalnız burada gösterilir. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, D = window.SuperAriDemo, HA = window.SuperAriHastalikAyar, host = document.getElementById('panel');
  if (!host || !HA) return;
  var C = D && D.colony, nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UT = '<span class="mk-ut">uzman tahmini</span>';
  var HAST = { ayc: 'Amerikan yavru çürüğü (AYÇ)', eyc: 'Avrupa yavru çürüğü (EYÇ)', tulumsu: 'Tulumsu yavru', kirec: 'Kireç hastalığı', varroa: 'Varroa', dwv: 'Kanat deformasyonu virüsü (DWV)', nosema: 'Nosema', mumguvesi: 'Mum güvesi', kkk: 'Küçük kovan kurdu (Aethina)', tropilaelaps: 'Tropilaelaps akarı', tasyavru: 'Taşlaşmış yavru', cbpv: 'Kronik arı felci (CBPV)', zehir: 'Pestisit zehirlenmesi', aclik: 'Açlık', anaSorun: 'Ana sorunu' };
  var BEL = { kapak: 'Çökmüş / delikli kapak', kibrit: 'Kibrit çöpü testinde uzama', koku: 'Kötü koku', beyazMumya: 'Beyaz mumya', siyahMumya: 'Siyah / gri mumya', daginik: 'Dağınık yavru', bukuk: 'Bükülmüş sarı-kahve larva', kanat: 'Bozuk kanat', ishal: 'İshal lekesi', tulum: 'Tulum şeklinde larva', guve: 'Güve tüneli', akar: 'Akar görülmesi', dilIzi: 'Dil izi / yapışık kabuk', tasMumya: 'Taş gibi mumya', titreyen: 'Titreyen tüysüz arı', topluOlum: 'Ani toplu ölüm', basGomulu: 'Başı gömülü ölü arı', cokYumurta: 'Çok yumurta / kambur yavru', kkkBocek: 'Böcek / larva (KKK)', kkkBal: 'Mayalanmış bal', tropiAkar: 'Küçük koşan akar' };
  var GENEL = [
    ['Puanlama', [['esikDus', 'Bu puanın altı listelenmez'], ['esikMuhtemel', '«Muhtemel» en az puan'], ['esikEnMuhtemel', '«En muhtemel» en az puan (yalnız ilk sıra)'], ['maxAday', 'En çok aday sayısı']]],
    ['Fotoğraf ipucu', [['fotoGuclu', 'Güçlü ipucu katsayısı (işaretli belirti = 1)'], ['fotoZayif', 'Zayıf ipucu katsayısı'], ['fotoKotuKat', 'Fotoğraf kalitesi kötüyse çarpan'], ['fotoMinPx', 'En az çözünürlük (uzun kenar, px)'], ['daginikOran', 'Dağınık yavru: boşluk oranı (0–1)'], ['daginikGuclu', 'Dağınık yavru güçlü: boşluk oranı'], ['beyazLekeMin', 'Kovan önü beyaz leke en az'], ['beyazLekeGuclu', 'Beyaz leke güçlü ipucu'], ['akarMin', 'Akar tahtası: en az nokta'], ['akarGuclu', 'Akar tahtası güçlü ipucu']]],
    ['Varroa sayımı (mevsim eşiği)', [['varroaEsikDurgun', 'Durgun dönem eşiği (% akar/100 arı)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikArtis', 'Nüfus artışı eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikTepe', 'Nüfus tepesi eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikAzalma', 'Nüfus azalması eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'],
      ['varroaAyDurgun', 'Durgun dönem ayları (virgülle)', 's'], ['varroaAyArtis', 'Artış ayları', 's'], ['varroaAyTepe', 'Tepe ayları', 's'], ['varroaAyAzalma', 'Azalma ayları', 's'],
      ['tablaKatKis', 'Akar tahtası çarpanı Kasım–Şubat', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaKatYaz', 'Akar tahtası çarpanı Mayıs–Ağustos', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaKatAra', 'Akar tahtası çarpanı Mar–Nis, Eyl–Eki', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaEsikAkar', 'Kolonide zarar eşiği (akar)', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf (Birleşik Krallık için)'],
      ['varroaSayimGun', 'Bu kadar gün içindeki son sayım kullanılır'], ['varroaTekrarGun', 'Tedavi sonrası yeniden sayım görevi (gün) — HBHC «tedaviden sonra mutlaka yeniden sayın» der; gün sayısı']]],
    ['Bağlam', [['gecmisPuan', 'Son N günde aynı şüphe kaydı varsa eklenen puan'], ['gecmisGun', 'Geçmiş penceresi (gün)']]],
    ['AYÇ ve takip', [['aycZorla', 'Kibrit testi tek başına veya kapak+koku → AYÇ her zaman listede (alarm)', 'b'], ['aycZorlaPuan', 'Zorla eklenen AYÇ puanı'], ['kontrolGunAyc', 'AYÇ şüphe kaydı kontrol günü'], ['kontrolGunDiger', 'Diğer şüphe kayıtları kontrol günü']]]
  ];
  var cur = HA.get();
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-hastalik-tahmin';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-hastalik-tahmin">Hastalık tahmini</a>');
  function inp(k, v, b) {
    if (b === 's') return '<input type="text" style="width:7rem" data-hz-k="' + k + '" data-hz-s value="' + esc(v) + '">';
    if (b) return '<input type="checkbox" data-hz-k="' + k + '"' + (v ? ' checked' : '') + '>';
    return '<input type="number" step="any" min="0" style="width:5.5rem" data-hz-k="' + k + '" value="' + esc(v) + '">';
  }
  function paint() {
    var H = '<h2>Hastalık tahmini (kesin değil)</h2><p class="fe-sub">Uygulamadaki «🔍 Hastalık tahmini» aracının tüm ayarları. Değerler tüm kullanıcılara uygulanır; boş bırakılan alan varsayılana döner. ' +
      '<b>Kaynak:</b> tüm sayılar ' + UT + ' (kaynak yok; Yapılacaklar’da). Kesin tanı laboratuvar / veteriner hekim / İl-İlçe Müdürlüğü ile konur.</p>';
    GENEL.forEach(function (g) {
      H += '<h3 style="margin:.8rem 0 .3rem;font-size:.95rem">' + esc(g[0]) + '</h3><table class="tbl" style="width:100%;font-size:.85rem"><tbody>';
      g[1].forEach(function (r) { H += '<tr><td>' + esc(r[1]) + ' ' + (r[3] ? '<br><small>Kaynak: ' + esc(r[3]) + '</small>' : UT) + '</td><td style="white-space:nowrap">' + inp(r[0], cur[r[0]], r[2]) + ' <small>(varsayılan ' + esc(String(HA.DEF[r[0]])) + ')</small></td></tr>'; });
      H += '</tbody></table>';
    });
    H += '<h3 style="margin:.8rem 0 .3rem;font-size:.95rem">Belirti ağırlıkları (hastalık başına) ' + UT + '</h3><div style="overflow:auto"><table class="tbl" style="width:100%;font-size:.82rem"><thead><tr><th>Hastalık</th><th>Belirti → ağırlık</th></tr></thead><tbody>';
    Object.keys(HA.DEF.agirlik).forEach(function (d) {
      H += '<tr><td>' + esc(HAST[d] || d) + '</td><td>' + Object.keys(HA.DEF.agirlik[d]).map(function (b) {
        return '<label style="display:inline-block;margin:2px 8px 2px 0">' + esc(BEL[b] || b) + ' ' + inp('agirlik.' + d + '.' + b, cur.agirlik[d][b]) + '</label>'; }).join('') + '</td></tr>';
    });
    H += '</tbody></table></div>';
    H += '<h3 style="margin:.8rem 0 .3rem;font-size:.95rem">Mevsim katsayıları (puan çarpanı; 1 = etkisiz) ' + UT + '</h3><div style="overflow:auto"><table class="tbl" style="font-size:.82rem"><thead><tr><th>Hastalık</th><th>İlkbahar</th><th>Yaz</th><th>Sonbahar</th><th>Kış</th></tr></thead><tbody>';
    Object.keys(HA.DEF.agirlik).forEach(function (d) { var m = cur.mevsimKat[d] || {}; H += '<tr><td>' + esc(HAST[d] || d) + '</td>' + ['ilkbahar', 'yaz', 'sonbahar', 'kis'].map(function (x) { return '<td>' + inp('mevsimKat.' + d + '.' + x, m[x] != null ? m[x] : 1) + '</td>'; }).join('') + '</tr>'; });
    H += '</tbody></table></div>';
    H += '<h3 style="margin:.8rem 0 .3rem;font-size:.95rem">İhbarı zorunlu (şüphede kırmızı «ihbar» uyarısı)</h3><p class="fe-sub">Kaynak (doğrulandı): İhbarı Mecburi Hayvan Hastalıkları ve Bildirimine Dair Yönetmelik, Ek-1 — arı için yalnız Arıların Amerikan yavru çürüklüğü, Küçük kovan kurdu (Aethina tumida), Tropilaelaps akarı — https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetayIframe?MevzuatNo=14691&amp;MevzuatTertip=5&amp;MevzuatTur=7 · EYÇ, Varroa, Nosema listede yok. Laboratuvar adresleri: vetkontrol.tarimorman.gov.tr/bornova/Iletisim, arastirma.tarimorman.gov.tr/aricilik/Iletisim. Belirti metinleri: WOAH Terrestrial Manual 2023 3.2.2 (dil izi, yapışık kabuk); NBU Foulbrood 2017 (kibrit testi 10–30 mm); NBU CBPV bilgi notu (titreyen tüysüz arı; zehirlenmede sırtüstü dönen arı); Fries ve ark. 2013 COLOSS BEEBOOK, doi:10.3896/IBRA.1.52.1.14 (Nosema numunesi: en yaşlı arılar).</p><table class="tbl" style="font-size:.85rem"><tbody>';
    Object.keys(HA.DEF.ihbar).forEach(function (d) { H += '<tr><td>' + esc(HAST[d] || d) + '</td><td>' + inp('ihbar.' + d, cur.ihbar[d], true) + '</td></tr>'; });
    H += '</tbody></table><div class="hz-row" style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-hz-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-hz-reset>Varsayılanlara dön</button></div><p class="fe-meta" data-hz-stat style="min-height:1.2em"></p>';
    s.innerHTML = H;
  }
  function stat(m) { var e = s.querySelector('[data-hz-stat]'); if (e) e.innerHTML = m; }
  function topla() {
    var o = { agirlik: {}, ihbar: {} }, bad = null;
    [].forEach.call(s.querySelectorAll('[data-hz-k]'), function (i) {
      var k = i.getAttribute('data-hz-k').split('.'), v;
      if (i.hasAttribute('data-hz-s')) { if (i.value === '') return; if (!/^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(i.value)) { bad = bad || i; return; } v = i.value; }
      else if (i.type === 'checkbox') v = i.checked; else { if (i.value === '') return; v = Number(String(i.value).replace(',', '.')); if (!isFinite(v) || v < 0) { bad = bad || i; return; } }
      if (k[0] === 'mevsimKat') { (o.mevsimKat = o.mevsimKat || {}); (o.mevsimKat[k[1]] = o.mevsimKat[k[1]] || {})[k[2]] = v; } else if (k.length === 3) { (o.agirlik[k[1]] = o.agirlik[k[1]] || {})[k[2]] = v; } else if (k.length === 2) o.ihbar[k[1]] = v; else o[k[0]] = v;
    });
    if (bad) { bad.focus(); return null; }
    if (o.esikMuhtemel > o.esikEnMuhtemel) { stat('<b>«Muhtemel» eşiği «En muhtemel» eşiğinden büyük olamaz.</b>'); return false; }
    return HA.merge(o);
  }
  s.addEventListener('click', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-hz-reset')) { cur = HA.merge(null); paint(); stat('Varsayılanlar yüklendi (kaydedilmedi).'); return; }
    if (!t.hasAttribute('data-hz-save')) return;
    var n = topla(); if (n === null) { stat('<b>Geçersiz değer</b>: 0 veya üstü bir sayı girin.'); return; } if (n === false) return;
    if (!C || !B || !B.client) { stat('Bağlantı yok; kaydedilemedi.'); return; }
    if (!confirm('Hastalık tahmini ayarları tüm kullanıcılar için kaydedilsin mi?')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    var o = JSON.parse(JSON.stringify(C.ogulSkor() || {})); o.hastalik = n;
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Hastalık tahmini ayarları' }); }).then(function (r) {
      if (r.error) throw r.error; C.ogulSkorSet(o, { at: new Date().toISOString() }); cur = HA.get(); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'hastalik' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'hastalik') { cur = HA.get(); paint(); } });
  paint();
})();
