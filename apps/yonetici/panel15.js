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
    ['puan', 'Puan eşikleri', [['esikDus', 'Bu puanın altı listelenmez'], ['esikMuhtemel', '«Muhtemel» en az puan'], ['esikEnMuhtemel', '«En muhtemel» en az puan (yalnız ilk sıra)'], ['maxAday', 'En çok aday sayısı']]],
    ['fotoip', 'Fotoğraf ipuçları', [['fotoGuclu', 'Güçlü ipucu katsayısı (işaretli belirti = 1)'], ['fotoZayif', 'Zayıf ipucu katsayısı'], ['fotoKotuKat', 'Fotoğraf kalitesi kötüyse çarpan']]],
    ['fotoes', 'Fotoğraf eşikleri', [['fotoMinPx', 'En az çözünürlük (uzun kenar, px)'], ['daginikOran', 'Dağınık yavru: boşluk oranı (0–1)'], ['daginikGuclu', 'Dağınık yavru güçlü: boşluk oranı'], ['beyazLekeMin', 'Kovan önü beyaz leke en az'], ['beyazLekeGuclu', 'Beyaz leke güçlü ipucu'], ['akarMin', 'Akar tahtası: en az nokta'], ['akarGuclu', 'Akar tahtası güçlü ipucu']]],
    ['varroa', 'Varroa sayımı (mevsim eşiği)', [['varroaEsikDurgun', 'Durgun dönem eşiği (% akar/100 arı)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikArtis', 'Nüfus artışı eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikTepe', 'Nüfus tepesi eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'], ['varroaEsikAzalma', 'Nüfus azalması eşiği (%)', 0, 'HBHC, Tools for Varroa Management 9. baskı (2026), Tablo 1 — https://honeybeehealthcoalition.org/wp-content/uploads/2026/08/Tools-for-Varroa-Management-Guide-9th-Edition.pdf'],
      ['varroaAyDurgun', 'Durgun dönem ayları (virgülle)', 's'], ['varroaAyArtis', 'Artış ayları', 's'], ['varroaAyTepe', 'Tepe ayları', 's'], ['varroaAyAzalma', 'Azalma ayları', 's'],
      ['tablaKatKis', 'Akar tahtası çarpanı Kasım–Şubat', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaKatYaz', 'Akar tahtası çarpanı Mayıs–Ağustos', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaKatAra', 'Akar tahtası çarpanı Mar–Nis, Eyl–Eki', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf'], ['tablaEsikAkar', 'Kolonide zarar eşiği (akar)', 0, 'NBU/APHA, Managing Varroa — https://www.nationalbeeunit.com/assets/PDFs/3_Resources_for_beekeepers/Advisory_leaflets/APHA_Managing_Varroa_2020_ELECTRONIC_ONLY-1.pdf (Birleşik Krallık için)'],
      ['varroaSayimGun', 'Bu kadar gün içindeki son sayım kullanılır'], ['varroaTekrarGun', 'Tedavi sonrası yeniden sayım görevi (gün) — HBHC «tedaviden sonra mutlaka yeniden sayın» der; gün sayısı']]],
    ['baglam', 'Bağlam (geçmiş kayıt)', [['gecmisPuan', 'Son N günde aynı şüphe kaydı varsa eklenen puan'], ['gecmisGun', 'Geçmiş penceresi (gün)']]],
    ['ayc', 'AYÇ alarm kuralı', [['aycZorla', 'Kibrit testi tek başına veya kapak+koku → AYÇ her zaman listede (alarm)', 'b'], ['aycZorlaPuan', 'Zorla eklenen AYÇ puanı']]],
    ['kontrol', 'Kontrol günleri', [['kontrolGunAyc', 'AYÇ şüphe kaydı kontrol günü'], ['kontrolGunDiger', 'Diğer şüphe kayıtları kontrol günü']]]
  ];
  /* Sade açıklamalar: alanın uygulamada (apps/web/hastalik-tahmin.js) gerçekte ne yaptığı. */
  var AC = {
    esikDus: 'Bir hastalığın toplam puanı bunun altındaysa sonuç listesinde hiç gösterilmez.',
    esikMuhtemel: 'Puanı bu değer veya üstündeyse hastalık «Muhtemel» yazılır; altındaysa «Olası (zayıf belirti)».',
    esikEnMuhtemel: 'Listenin ilk sırasındaki hastalığın puanı bu değer veya üstündeyse «En muhtemel» yazılır.',
    maxAday: 'Sonuç listesinde en çok bu kadar hastalık gösterilir (puanı en yüksek olanlar).',
    fotoGuclu: 'Fotoğraf incelemesi güçlü bir ipucu bulursa belirti puanı bu katsayıyla eklenir (elle işaretlenen belirti = 1).',
    fotoZayif: 'Fotoğraf incelemesi zayıf bir ipucu bulursa belirti puanı bu katsayıyla eklenir.',
    fotoKotuKat: 'Fotoğraf kalitesi kötü bulunursa fotoğraf ipucunun puanı ayrıca bu sayıyla çarpılır.',
    fotoMinPx: 'Fotoğrafın uzun kenarı bu pikselden küçükse «Çözünürlük düşük — daha büyük fotoğraf kullanın» uyarısı çıkar.',
    daginikOran: 'Petek fotoğrafında yavru alanındaki boşluk oranı bu değer veya üstündeyse «dağınık yavru olabilir» ipucu verilir (0,3 = %30).',
    daginikGuclu: 'Boşluk oranı bu değer veya üstündeyse dağınık yavru ipucu «güçlü» sayılır.',
    beyazLekeMin: 'Kovan önü fotoğrafında en az bu kadar beyaz leke seçilirse «mumyalaşmış larva olabilir» ipucu verilir.',
    beyazLekeGuclu: 'Seçilen beyaz leke bu kadar veya fazlaysa ipucu «güçlü» sayılır.',
    akarMin: 'Akar tahtası fotoğrafında en az bu kadar akar boyutunda nokta seçilirse «akar» ipucu verilir.',
    akarGuclu: 'Seçilen nokta bu kadar veya fazlaysa akar ipucu «güçlü» sayılır.',
    aycZorla: 'Açıkken: kibrit testinde uzama işaretlenirse ya da çökük kapak ile kötü koku birlikte işaretlenirse, AYÇ puanı düşük kalsa bile listeye eklenir.',
    aycZorlaPuan: 'Bu kuralla listeye eklenen AYÇ için gösterilen puan.',
    kontrolGunAyc: 'AYÇ şüphesi kaydedilince kontrol tarihi ve «şüphe sürüyor mu?» görevi bu kadar gün sonraya konur.',
    kontrolGunDiger: 'Diğer hastalık şüpheleri kaydedilince kontrol tarihi ve takip görevi bu kadar gün sonraya konur.',
    gecmisPuan: 'Kovanda son «Geçmiş penceresi» içinde aynı hastalık için şüphe veya hastalık kaydı varsa, o hastalığın puanına bu kadar eklenir (0 = kapalı).',
    gecmisGun: 'Kovanın geçmiş hastalık kayıtlarına kaç gün geriye bakılacağı.',
    varroaEsikDurgun: 'Son varroa sayımındaki bulaşma (%) bu dönemde bu değer veya üstündeyse «eşiğin üstünde: hemen mücadele planlayın» denir.',
    varroaEsikArtis: 'Aynı kural, nüfus artışı aylarında.', varroaEsikTepe: 'Aynı kural, nüfus tepesi aylarında.', varroaEsikAzalma: 'Aynı kural, nüfus azalması aylarında.',
    varroaAyDurgun: 'Bu aylar (1–12, virgülle) durgun döneme sayılır; varroa eşiği buna göre seçilir. Hiçbir listede olmayan ay «Tepe» sayılır.',
    varroaAyArtis: 'Nüfus artışı dönemine sayılan aylar.', varroaAyTepe: 'Nüfus tepesi dönemine sayılan aylar.', varroaAyAzalma: 'Nüfus azalması dönemine sayılan aylar.',
    tablaKatKis: 'Akar tahtasında günde düşen akar sayısı bu sayıyla çarpılarak kolonideki toplam akar tahmin edilir (Kasım–Şubat).',
    tablaKatYaz: 'Aynı hesap, Mayıs–Ağustos için.', tablaKatAra: 'Aynı hesap, Mart–Nisan ve Eylül–Ekim için.',
    tablaEsikAkar: 'Tahmini toplam akar bu sayı veya üstündeyse «zarar eşiğini geçmiş olabilir» denir.',
    varroaSayimGun: 'Varroa durumu için yalnız son bu kadar gündeki sayım kullanılır; yoksa «akar sayımı yapın» denir.',
    varroaTekrarGun: 'Varroa veya DWV şüphesi kaydedilince «tedaviden sonra yeniden sayım» görevi bu kadar gün sonraya konur.'
  };
  var cur = HA.get();
  var s = document.createElement('section'); s.className = 'card fe mk hz-ayar'; s.id = 's-hastalik-tahmin';
  /* Başlık sabit, içerik ayrı kapta: agac.js bölümü 📁 klasöre sardıktan sonra yeniden çizim klasörü bozmaz. */
  s.innerHTML = '<h2>Hastalık tahmini (kesin değil)</h2>'; var g = document.createElement('div'); g.className = 'hz-govde'; s.appendChild(g);
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-hastalik-tahmin">Hastalık tahmini</a>');
  function inp(k, v, b) {
    if (b === 's') return '<input type="text" style="width:7rem" data-hz-k="' + k + '" data-hz-s value="' + esc(v) + '">';
    if (b) return '<input type="checkbox" data-hz-k="' + k + '"' + (v ? ' checked' : '') + '>';
    return '<input type="number" step="any" min="0" style="width:5.5rem" data-hz-k="' + k + '" value="' + esc(v) + '">';
  }
  /* Bölümler: her başlık ▸/▾ ile ayrı açılır/kapanır, varsayılan hepsi kapalı. Açık bölümler yeniden çizimde korunur (ekran zıplamaz). */
  var acik = {};
  /* Görünüm, panelin klasör ağacıyla (agac.js .tr-d) aynı; yalnız tablo kenar boşlukları eklenir. */
  if (!document.getElementById('hz-bol-css')) {
    var st = document.createElement('style'); st.id = 'hz-bol-css';
    st.textContent = '.hz-ayar details.hz-bol>.tr-body{padding:.1rem 0 .5rem}.hz-ayar details.hz-bol>summary small b{color:#b86e00}.hz-ayar .hz-bol .tbl td{vertical-align:middle}.hz-ayar .hz-v{width:1%}.hz-ayar .ay-ac{display:block;margin-top:.2rem;font-size:.76rem;line-height:1.35;color:#5b4a33;font-weight:400}.hz-ayar .hz-bol td small{overflow-wrap:anywhere}.hz-ayar [data-hz-bol=mevsim] input{width:3.1rem!important;padding:.3rem .15rem;text-align:center}.hz-ayar [data-hz-bol=mevsim] td,.hz-ayar [data-hz-bol=mevsim] th{padding:.2rem .15rem}.hz-ayar [data-hz-bol=mevsim] table{width:100%}.hz-ayar .hz-v small{display:block;white-space:nowrap;font-size:.72rem;color:var(--muted,#8a7358);margin-top:.15rem}';
    document.head.appendChild(st);
  }
  function bolum(id, baslik, inner) {
    return '<details class="tr-d tr-k hz-bol" data-hz-bol="' + id + '"' + (acik[id] ? ' open' : '') + '><summary>📁 ' + baslik + ' <small data-hz-oz></small></summary><div class="tr-body">' + inner + '</div></details>';
  }
  function defOf(k) { var p = k.split('.'), v = HA.DEF; for (var i = 0; i < p.length && v != null; i++) v = v[p[i]]; return v; }
  /** Başlık özetleri: alan sayısı · varsayılandan farklı olanlar (ihbar: işaretli sayısı). Girdiye göre canlı güncellenir. */
  function ozet() {
    [].forEach.call(s.querySelectorAll('details.hz-bol'), function (d) {
      var oz = d.querySelector(':scope>summary>[data-hz-oz]'); if (!oz) return;
      var ins = d.querySelectorAll('[data-hz-k]'), n = ins.length, fark = 0, isaret = 0;
      [].forEach.call(ins, function (i) {
        var k = i.getAttribute('data-hz-k'), dv = defOf(k), v;
        if (i.type === 'checkbox') { v = i.checked; if (v) isaret++; }
        else if (i.hasAttribute('data-hz-s')) v = i.value === '' ? dv : String(i.value).replace(/\s/g, '');
        else v = i.value === '' ? dv : Number(String(i.value).replace(',', '.'));
        if (dv === undefined && k.indexOf('mevsimKat.') === 0) dv = 1;
        if (v !== dv && String(v) !== String(dv)) fark++;
      });
      var id = d.getAttribute('data-hz-bol'), alt = d.querySelectorAll(':scope>.tr-body>details.hz-bol').length;
      var t = id === 'ihbar' ? (isaret + ' / ' + n + ' işaretli') : ((alt ? alt + ' hastalık · ' : '') + n + ' ayar');
      oz.innerHTML = t + (fark ? ' · <b>' + fark + ' değişti</b>' : '');
    });
  }
  function dv(v) { return v === true ? 'açık' : v === false ? 'kapalı' : String(v); }
  function satirlar(rows) {
    var H = '<table class="tbl" style="width:100%;font-size:.85rem"><tbody>';
    rows.forEach(function (r) { H += '<tr><td>' + esc(r[1]) + ' ' + (r[3] ? '<br><small>Kaynak: ' + esc(r[3]) + '</small>' : UT) + (AC[r[0]] ? '<span class="ay-ac">' + esc(AC[r[0]]) + '</span>' : '') + '</td><td class="hz-v">' + inp(r[0], cur[r[0]], r[2]) + ' <small>(varsayılan ' + esc(dv(HA.DEF[r[0]])) + ')</small></td></tr>'; });
    return H + '</tbody></table>';
  }
  function paint() {
    var H = '<p class="fe-sub">Uygulamadaki «🔍 Hastalık tahmini» aracının tüm ayarları. Değerler tüm kullanıcılara uygulanır; boş bırakılan alan varsayılana döner. ' +
      '<b>Kaynak:</b> tüm sayılar ' + UT + ' (kaynak yok; Yapılacaklar’da). Kesin tanı laboratuvar / veteriner hekim / İl-İlçe Müdürlüğü ile konur. Bölümü açmak / kapatmak için başlığa dokunun.</p>';
    var AG = Object.keys(HA.DEF.agirlik), ag = AG.map(function (d) {
      return bolum('ag-' + d, esc(HAST[d] || d), '<table class="tbl" style="width:100%;font-size:.85rem"><tbody>' + Object.keys(HA.DEF.agirlik[d]).map(function (b) {
        return '<tr><td>' + esc(BEL[b] || b) + '</td><td class="hz-v">' + inp('agirlik.' + d + '.' + b, cur.agirlik[d][b]) + ' <small>(varsayılan ' + esc(String(HA.DEF.agirlik[d][b])) + ')</small></td></tr>'; }).join('') + '</tbody></table>');
    }).join('');
    H += bolum('agirlik', 'Belirti ağırlıkları', '<p class="fe-sub" style="margin:.2rem 0">Bir belirti elle işaretlenince bu sayı o hastalığın puanına eklenir; belirti fotoğraftan bulunduysa «Fotoğraf ipuçları» katsayısıyla çarpılarak eklenir. Puanlar toplanır, «Puan eşikleri» ile karşılaştırılır. ' + UT + '</p>' + ag);
    GENEL.forEach(function (g) { H += bolum(g[0], esc(g[1]), satirlar(g[2])); });
    var mv = '<p class="fe-sub" style="margin:.2rem 0">Tahmin yapılan ayın mevsiminde hastalığın toplam puanı bu sayıyla çarpılır; 1 = etkisiz. ' + UT + '</p><div style="overflow:auto"><table class="tbl" style="font-size:.82rem"><thead><tr><th>Hastalık</th><th>İlk.</th><th>Yaz</th><th>Son.</th><th>Kış</th></tr></thead><tbody>';
    AG.forEach(function (d) { var m = cur.mevsimKat[d] || {}; mv += '<tr><td>' + esc(HAST[d] || d) + '</td>' + ['ilkbahar', 'yaz', 'sonbahar', 'kis'].map(function (x) { return '<td>' + inp('mevsimKat.' + d + '.' + x, m[x] != null ? m[x] : 1) + '</td>'; }).join('') + '</tr>'; });
    H += bolum('mevsim', 'Mevsim katsayıları', mv + '</tbody></table></div>');
    var ih = '<p class="fe-sub" style="margin:.2rem 0">İşaretli hastalık sonuç listesinde çıkarsa kırmızı «ihbar» uyarısı gösterilir. Kaynak (doğrulandı): İhbarı Mecburi Hayvan Hastalıkları ve Bildirimine Dair Yönetmelik, Ek-1 — arı için yalnız Arıların Amerikan yavru çürüklüğü, Küçük kovan kurdu (Aethina tumida), Tropilaelaps akarı — https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetayIframe?MevzuatNo=14691&amp;MevzuatTertip=5&amp;MevzuatTur=7 · EYÇ, Varroa, Nosema listede yok. Laboratuvar adresleri: vetkontrol.tarimorman.gov.tr/bornova/Iletisim, arastirma.tarimorman.gov.tr/aricilik/Iletisim. Belirti metinleri: WOAH Terrestrial Manual 2023 3.2.2 (dil izi, yapışık kabuk); NBU Foulbrood 2017 (kibrit testi 10–30 mm); NBU CBPV bilgi notu (titreyen tüysüz arı; zehirlenmede sırtüstü dönen arı); Fries ve ark. 2013 COLOSS BEEBOOK, doi:10.3896/IBRA.1.52.1.14 (Nosema numunesi: en yaşlı arılar).</p><table class="tbl" style="font-size:.85rem"><tbody>';
    Object.keys(HA.DEF.ihbar).forEach(function (d) { ih += '<tr><td>' + esc(HAST[d] || d) + '</td><td>' + inp('ihbar.' + d, cur.ihbar[d], true) + '</td></tr>'; });
    H += bolum('ihbar', 'İhbar zorunlu', ih + '</tbody></table>');
    H += '<div class="hz-row" style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-hz-save>Kaydet (tüm kullanıcılar)</button><button type="button" class="btn secondary" data-hz-reset>Varsayılanlara dön</button></div><p class="fe-meta" data-hz-stat style="min-height:1.2em"></p>';
    g.innerHTML = H;
    ozet();
  }
  s.addEventListener('toggle', function (e) { var d = e.target; if (d && d.getAttribute && d.hasAttribute('data-hz-bol')) acik[d.getAttribute('data-hz-bol')] = d.open; }, true);
  s.addEventListener('input', ozet); s.addEventListener('change', ozet);
  /** Geçersiz alan kapalı bölümdeyse önce bölümleri aç, sonra odakla. */
  function goster(i) { var d = i.closest('details'); while (d) { d.open = true; acik[d.getAttribute('data-hz-bol')] = true; d = d.parentElement && d.parentElement.closest('details'); } i.focus(); }
  function stat(m) { var e = s.querySelector('[data-hz-stat]'); if (e) e.innerHTML = m; }
  function topla() {
    var o = { agirlik: {}, ihbar: {} }, bad = null;
    [].forEach.call(s.querySelectorAll('[data-hz-k]'), function (i) {
      var k = i.getAttribute('data-hz-k').split('.'), v;
      if (i.hasAttribute('data-hz-s')) { if (i.value === '') return; if (!/^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(i.value)) { bad = bad || i; return; } v = i.value; }
      else if (i.type === 'checkbox') v = i.checked; else { if (i.value === '') return; v = Number(String(i.value).replace(',', '.')); if (!isFinite(v) || v < 0) { bad = bad || i; return; } }
      if (k[0] === 'mevsimKat') { (o.mevsimKat = o.mevsimKat || {}); (o.mevsimKat[k[1]] = o.mevsimKat[k[1]] || {})[k[2]] = v; } else if (k.length === 3) { (o.agirlik[k[1]] = o.agirlik[k[1]] || {})[k[2]] = v; } else if (k.length === 2) o.ihbar[k[1]] = v; else o[k[0]] = v;
    });
    if (bad) { goster(bad); return null; }
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
