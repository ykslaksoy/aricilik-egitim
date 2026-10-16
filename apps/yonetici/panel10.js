/* koloni-196: Yönetici · Ölçüm kuralları + Cihazlar. Tek kaynak: ogul_skor_ayar.data.sensor (sa_ayar_yayinla) ve app_esikler.data.uyari (sa_esikler_kaydet).
   Aynı anahtar iki bölümde de görünür; birinde değişen ötekinde ve Oğul skorları / Eşikler bölümünde de değişir. Eşik tanımlı olmayan yerde değer uydurulmaz. */
(function () {
  'use strict';
  var B = window.SuperAriBulut, D = window.SuperAriDemo, host = document.getElementById('panel'); if (!B || !host || !D || !D.colony) return;
  var C = D.colony, nav = host.querySelector('nav.nav');
  var ESIK_DEF = { koloniGucu: { zayifMaxCerceve: 4, ortaMaxCerceve: 7 }, bolmeMinCerceve: 9, uyari: { varroaYuzde: 3, dusukPilYuzde: 20, gunlukKiloDususKg: 1, kovanIciMinC: 10, kovanIciMaxC: 38 } };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UT = '<span class="mk-ut">uzman tahmini</span>', KY = '<span class="mk-ut">kaynak yok</span>';
  var VY = '<p class="mk-vy">Veri yok – eşik tanımlı değil</p>';
  /* satır: [kademe sınıfı, kademe adı, koşul, kaynak ('s' sensor | 'e' esik | null), anahtar] */
  var OLCUM = [
    { t: 'Kuluçka sıcaklığı', kk: ['kulucka','kuluckaAcil','kirec'], src: 'Groh 2004 (34,5 °C; 35 °C) · Kleinhenz 2003 (33–36 °C) · Flores 1996 (30 °C, kireç)', not: 'Yalnız «Kuluçkalıkta» işaretli sensör. Hatırlatma kovan başına en sık 7 günde bir.', r: [
      ['ok', 'Normal', 'Hedef (°C)', 's', 'kuluckaHedefC'],
      ['w', 'Uyarı', 'Bunun altı (°C) ' + UT, 's', 'kuluckaUyariAltC'],
      ['w', 'Uyarı', 'Bu değer ve üstü (°C)', 's', 'kuluckaUyariUstC'],
      ['c', 'Kritik', 'Bunun altı (°C)', 's', 'kuluckaAltC'],
      ['c', 'Kritik', 'Bunun üstü (°C)', 's', 'kuluckaUstC'],
      ['w', 'Süre', 'Uyarı/kritik kesintisiz (saat) ' + UT, 's', 'kuluckaSaat'],
      ['a', 'ACİL', 'Bu değer ve altı (°C) · kireç riski', 's', 'kuluckaAcilC'],
      ['a', 'Süre', 'ACİL kesintisiz (saat) ' + UT, 's', 'kuluckaAcilSaat'],
      ['w', 'Oynaklık', '{s:kuluckaOynaklikSaat} saatte fark ≥ {s:kuluckaOynaklikC} °C ' + UT, 's', 'kuluckaOynaklikC'],
      ['w', 'Pencere', 'Oynaklık penceresi (saat) ' + UT, 's', 'kuluckaOynaklikSaat'],
      ['i', 'Kireç', 'Hatırlatma: bunun altı (°C)', 's', 'kirecIsiC'],
      ['i', 'Kireç', 'Kesintisiz süre (saat) ' + UT, 's', 'kirecSaat'],
      ['i', 'Dönem', 'İlk ay (1–12) ' + UT, 's', 'kuluckaAyBas'],
      ['i', 'Dönem', 'Son ay (1–12) ' + UT, 's', 'kuluckaAySon']] },
    { t: 'Nem', kk: ['nem'], src: 'Kritik, erken uyarı ve üst sınır: uzman tahmini (kullanıcı seçimi); kovan için doğrulanmış eşik yok · İlgili: Doull 1976, Apidologie 7:61, doi:10.1051/apido:19760104 (%50 altında yumurta açılmadı) · Kireç %80: Liang 2000, Ying Yong Sheng Tai Xue Bao 11:869, PubMed 11767561 (DOI yok; %80 altında spor çimlenmedi) ve Flores 1996, doi:10.1051/apido:19960401 (destekleyici) · süre uzman tahmini', not: 'Normal {s:nemNormalAlt}–{s:nemNormalUst} %. {s:nemNormalAlt} % altı erken uyarı: «Nem düşüyor, yavrularda kuruma riski var». {s:nemKritikAlt} % altı kritik: «Nem çok düşük, yavru (yumurta) açılmama riski var». {s:nemNormalUst}–{s:nemKirecUst} %: «Nem normal aralığın üstünde» (risk iddiası yok); {s:nemKirecUst} % üstü: «Nem çok yüksek, kireç hastalığı riski var». Kireç uyarısı sıcaklık kuralıyla ortak: kovan başına 7 günde en çok bir.', r: [
      ['c', 'Kritik', 'Bunun altı (%) ' + UT, 's', 'nemKritikAlt'],
      ['w', 'Erken uyarı', 'Normal alt sınır; bunun altı (%) ' + UT, 's', 'nemNormalAlt'],
      ['i', 'Nötr', 'Normal üst sınır; bunun üstü (%) ' + UT, 's', 'nemNormalUst'],
      ['w', 'Süre', 'Tüm nem kademeleri kesintisiz (saat) ' + UT, 's', 'nemDisiSaat'],
      ['c', 'Kireç riski', 'Bunun üstü (%) · Liang 2000, Flores 1996', 's', 'nemKirecUst'],
      ['i', 'Bağlı', 'Oğul skoru Sıkışıklık nem eki = normal üst sınır; kireç destek nemi = kireç eşiği', null, '']] },
    { t: 'Ağırlık (tartı)', kk: ['agirlik'], src: 'Kaynak yok · tümü uzman tahmini', r: [
      ['c', 'Ani kayıp', 'Eşik (kg) ' + UT, 's', 'aniKayipKg'],
      ['c', 'Süre', 'Bu süre içinde (saat) ' + UT, 's', 'aniKayipSaat'],
      ['w', 'Genel', 'Günlük kayıp ≥ geçmişin katı ' + UT, 's', 'genelKayipKat'],
      ['w', 'Genel', 'En az günlük kayıp (kg) ' + UT, 's', 'genelKayipMinKg'],
      ['i', 'Nektar', 'Günlük artış en az (kg)', 's', 'nektarKg']] },
    { t: 'Ses', kk: ['sesOgulAni','sesPiping','sesQuack','sesAnasiz','sesIsciOtme','sesOgulEgilim','sesSaglik','sesVarroa'], src: 'Frekans bantları: Kural kaynakları → Ses sınıfları (KİLİTLİ, burada yalnız okunur) · Oğul anı 500–600 Hz, +6 dB, 2 dk: uzman tahmini — hakemli kaynak yok (Ferrari 2008 bant kaymasını gösterir, dB/süre eşiği vermez); kaynak aranıyor, Yapılacaklar\'da', r: [
      ['a', 'Oğul anı', 'Alt (Hz) ' + UT, 'L', 'ogulAniHzMin'],
      ['a', 'Oğul anı', 'Üst (Hz) ' + UT, 'L', 'ogulAniHzMax'],
      ['a', 'Oğul anı', 'Tabana göre artış (dB) ' + UT, 'L', 'ogulAniArtisDb'],
      ['a', 'Oğul anı', 'En az süre (dk) ' + UT, 'L', 'ogulAniDk'],
      ['c', 'Piping', 'Alt (Hz)', 'L', 'pipingHzMin'],
      ['c', 'Piping', 'Üst (Hz)', 'L', 'pipingHzMax'],
      ['c', 'Quacking', 'Alt (Hz)', 'L', 'quackHzMin'],
      ['c', 'Quacking', 'Üst (Hz)', 'L', 'quackHzMax'],
      ['w', 'Anasızlık', 'Kesintisiz süre (dk)', 'L', 'anasizDk'],
      ['w', 'Sağlık', 'Taban sapması → Uyarı (dB) ' + UT, 's', 'saglikUyariDb'],
      ['c', 'Sağlık', 'Taban sapması → Kritik (dB) ' + UT, 's', 'saglikKritikDb'],
      ['i', 'Varroa', 'Bant sapması (dB) ' + UT, 's', 'varroaSapmaDb']] },
    { t: 'Uçuş havası (arı cinsi)', kk: ['ucus'], src: 'Irka özgü hakemli uçuş eşiği bulunamadı → tümü uzman tahmini · Genel A. mellifera: Burrill & Dietz 1981, Apidologie 12:319 (9 °C altında uçuş yok); Vicens & Bosch 2000, Environ. Entomol. 29:413 (etkinlik 12–14 °C); rüzgar: Karbassioon ve ark. 2023, Oecologia 201:689, doi:10.1007/s00442-023-05332-x (~9 km/sa üstü azalır); yağmurda uçuş yok: Riessberger & Crailsheim 1997, Apidologie 28:411', not: 'Hava › Uçuşa uygun günler, Bal sezonu ve Nektar listeleri bu değerleri kullanır. Arılığın cinsi kovanlarındaki en sık ırktan alınır. Melez (ör. Kafkas × Karadeniz): ebeveyn gruplarının daha ihtiyatlı değeri (yüksek sıcaklık, düşük rüzgar ve yağış). Tanınmayan ırk (Muğla, Anadolu…): Genel.', r: [
      ['ok', 'Kafkas', 'Uygun: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKafkasUygunC'],
      ['w', 'Kafkas', 'Kısmen: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKafkasKismenC'],
      ['ok', 'Kafkas', 'Uygun: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKafkasUygunRuzgar'],
      ['w', 'Kafkas', 'Kısmen: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKafkasKismenRuzgar'],
      ['c', 'Kafkas', 'Bu yağış ve üstü uygun değil (mm) ' + UT, 's', 'ucusKafkasYagisMm'],
      ['ok', 'Karniyol', 'Uygun: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKarniyolUygunC'],
      ['w', 'Karniyol', 'Kısmen: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKarniyolKismenC'],
      ['ok', 'Karniyol', 'Uygun: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKarniyolUygunRuzgar'],
      ['w', 'Karniyol', 'Kısmen: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKarniyolKismenRuzgar'],
      ['c', 'Karniyol', 'Bu yağış ve üstü uygun değil (mm) ' + UT, 's', 'ucusKarniyolYagisMm'],
      ['ok', 'Karadeniz', 'Uygun: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKaradenizUygunC'],
      ['w', 'Karadeniz', 'Kısmen: en düşük sıcaklık (°C) ' + UT, 's', 'ucusKaradenizKismenC'],
      ['ok', 'Karadeniz', 'Uygun: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKaradenizUygunRuzgar'],
      ['w', 'Karadeniz', 'Kısmen: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusKaradenizKismenRuzgar'],
      ['c', 'Karadeniz', 'Bu yağış ve üstü uygun değil (mm) ' + UT, 's', 'ucusKaradenizYagisMm'],
      ['ok', 'Genel', 'Uygun: en düşük sıcaklık (°C) ' + UT, 's', 'ucusGenelUygunC'],
      ['w', 'Genel', 'Kısmen: en düşük sıcaklık (°C) ' + UT, 's', 'ucusGenelKismenC'],
      ['ok', 'Genel', 'Uygun: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusGenelUygunRuzgar'],
      ['w', 'Genel', 'Kısmen: en yüksek rüzgar (km/sa) ' + UT, 's', 'ucusGenelKismenRuzgar'],
      ['c', 'Genel', 'Bu yağış ve üstü uygun değil (mm) ' + UT, 's', 'ucusGenelYagisMm']] },
    { t: 'Titreşim', kk: ['titresim'], src: 'Kaynak yok · uzman tahmini', not: 'Olağandışı hareket: hırsızlık / kapak açıldı alarmı için hazırlık.', r: [
      ['w', 'Olağandışı', '7 gün tabanının katı ' + UT, 's', 'titresimKat'],
      ['w', 'Süre', 'Kesintisiz (dk) ' + UT, 's', 'titresimDk']] },
    { t: 'IR (giriş sayacı)', kk: ['irOgul','irYagma','irTrafik'], src: 'Oğul: Struye 1994, Apidologie 25:384, doi:10.1051/apido:19940405 (destekleyici) · değerler uzman tahmini', not: 'Giriş/çıkış ayrı sayan sayaç gerekir; yoksa «Veri yok».', r: [
      ['a', 'Oğul', 'Net çıkış en az (arı) ' + UT, 's', 'irOgulNetCikis'],
      ['a', 'Pencere', 'Süre (dk) ' + UT, 's', 'irOgulDk'],
      ['c', 'Yağma', 'Giriş/çıkış oranı en az ' + UT, 's', 'irYagmaOran'],
      ['c', 'Süre', 'Gündüz kesintisiz (dk) ' + UT, 's', 'irYagmaDk'],
      ['w', 'Trafik', '7 gün aynı saat ortalamasının oranından az ' + UT, 's', 'irTrafikOran'],
      ['w', 'Süre', 'Üst üste gün ' + UT, 's', 'irTrafikGun'],
      ['i', 'Skor', 'Oğul skoru: tabandan artış oranı', 's', 'irSapmaOran']] },
    { t: 'Pil', kk: ['pil'], src: 'Kaynak yok · kalan gün eşikleri uzman tahmini', not: 'Aynı değerler Cihazlar → Pil düşüklüğü kartında (tek kaynak).', r: PIL() }
  ];
  function PIL() { return [['w', 'Düşük pil', 'Bu yüzde ve altı (%)', 'e', 'uyari.dusukPilYuzde'], ['w', 'Orta', 'Kalan gün ≤ ' + UT, 's', 'batOrtaGun'], ['c', 'Yüksek', 'Kalan gün ≤ ' + UT, 's', 'batYuksekGun']]; }
  var CIHAZ = [
    { t: 'Pil düşüklüğü', kk: ['pil'], src: 'Ölçüm kuralları → Pil ile aynı değerler (tek kaynak)', r: PIL(), son: 'Şu an düşük pil' },
    { t: 'Veri gelmiyor / sessiz', kk: ['cihazSessiz'], src: 'Kaynak yok · uzman tahmini', not: 'Sarı: en büyüğü (kaçırılan okuma × ölçüm aralığı, en az dakika). Bildirim cihaz başına günde en çok bir. Hiç okuma gelmemiş cihaz «Veri yok» kalır.', r: [
      ['w', 'Sarı', 'Kaçırılan okuma ' + UT, 's', 'sessizOkuma'],
      ['w', 'Sarı', 'En az (dk) ' + UT, 's', 'sessizMinDk'],
      ['c', 'Kırmızı', 'Veri yok (dk) ' + UT, 's', 'sessizKirmiziDk']], son: 'Liste' },
    { t: 'Bağlantı koptu / arızalı', kk: ['cihazKopuk','cihazAriza'], src: 'Kaynak yok · uzman tahmini', not: 'Gateway kopuksa arılık için tek uyarı. Arızalı: imkânsız değer (nem %0–100 dışı dahil), aynı değer ya da sıçrama.', r: [
      ['c', 'Koptu', 'Veri yok (saat) ' + UT, 's', 'kopukSaat'],
      ['c', 'Arızalı', 'Sıcaklık eksi şunun altı (°C; 40 = −40) ' + UT, 's', 'arizaAltEksiC'],
      ['c', 'Arızalı', 'Sıcaklık bunun üstü (°C) ' + UT, 's', 'arizaUstC'],
      ['c', 'Arızalı', 'Aynı değer kesintisiz (saat) ' + UT, 's', 'arizaAyniSaat'],
      ['c', 'Arızalı', 'İki okuma arası sıçrama (°C) ' + UT, 's', 'arizaSicramaC']], son: 'Liste' }
  ];
  var css = document.createElement('style');
  css.textContent = '.mk .mc{border:1px solid #ead9b3;border-radius:14px;padding:.6rem;margin-top:.6rem;background:#fff}.mk h3{margin:0 0 .3rem;font-size:1rem}' +
    '.mk .rw{display:grid;grid-template-columns:5.2rem 1fr 4.2rem;gap:.15rem .4rem;align-items:center;padding:.3rem 0;border-top:1px solid #f1e6cc;font-size:.82rem;min-height:2.6rem}' +
    '.mk .rw input,.mk .rw output{width:4rem;height:2rem;box-sizing:border-box;font-size:16px;padding:.2rem;border:1px solid #ead9b3;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center}.mk .rw output{background:#f6f1e6}' +
    '.mk .rw input.chg{border-color:#c48a00;background:#fff8e7}.mk .rw small{grid-column:2/4;color:#9a8f7a;font-size:.7rem;margin-top:-.2rem}' +
    '.mk .tr{font-weight:700;font-size:.72rem;padding:.15rem .3rem;border-radius:8px;text-align:center}.mk .ok{background:#e3f5e7;color:#2f9e44}.mk .w{background:#fff3d6;color:#a86b00}.mk .c{background:#ffe1d6;color:#c2410c}.mk .a{background:#d92d20;color:#fff}.mk .i{background:#eef1f5;color:#4b5563}' +
    '.mk-ut{display:inline-block;background:#fde7f0;color:#b4235b;border-radius:6px;font-size:.62rem;padding:0 .25rem;font-weight:700;white-space:nowrap}.mk .m{font-size:.76rem;margin:.35rem 0 0;color:#4b5563}.mk-vy{margin:.35rem 0 0;font-weight:700;color:#6b7280;font-size:.82rem}' +
    '.mk .kk{display:grid;grid-template-columns:1fr 5.6rem;align-items:center;gap:.4rem;min-height:2.4rem;border-top:1px solid #f1e6cc;font-size:.82rem}.mk .kk label{display:flex;align-items:center;gap:.35rem;justify-content:flex-end;height:2rem;font-weight:700}.mk .kk input{width:1.3rem;height:1.3rem;margin:0}.mk .kk .off{color:#c2410c}.mk .kk.chg{background:#fff8e7}.mk .kks{display:flex;gap:.4rem;flex-wrap:wrap;min-height:2.4rem;align-items:center}.mk .kks select{font-size:16px;height:2.2rem;max-width:100%}' +
    '.mk .acts{display:flex;gap:.5rem;align-items:center;margin-top:.6rem;min-height:2.4rem}.mk .acts .fe-meta{flex:1;min-height:1.2em}';
  document.head.appendChild(css);
  function mkSec(id, title, sub) { var s = document.createElement('section'); s.className = 'card fe mk'; s.id = id; s.innerHTML = '<h2>' + title + '</h2><p class="fe-sub">' + sub + '</p><div class="bd" style="min-height:12rem">Yükleniyor…</div><div class="acts"><button class="btn" data-mk-save>Kaydet…</button><span class="fe-meta" data-mk-stat></span></div>'; host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#' + id + '">' + title + '</a>'); return s; }
  var sO = mkSec('s-olcum', 'Ölçüm kuralları', 'Uyarılar ölçülen değere göre, cihazdan bağımsız. Eşikler ve kaynaklar yalnız burada görünür.');
  var sC = mkSec('s-cihazlar', 'Cihazlar', 'Cihaz sağlığı sorunları tek yerde. Eşikler Ölçüm kuralları, Oğul skorları ve Eşikler bölümüyle aynı kayıttan (tek kaynak).');
  var SEN = {}, ESK = null, KK = { g: [], u: {}, a: {} }, KK0 = '', KAD = {}, EPOS = [], ARIL = [], KSEC = 'g';
  (C.KURALLAR || []).forEach(function (x) { KAD[x[0]] = x[1]; });
  function kkAn(x) { return String(x == null ? '' : x).trim().toLocaleLowerCase('tr').slice(0, 120); }
  function kkList() { if (KSEC === 'g') return KK.g; var p = KSEC.split('|'), m = p[0] === 'u' ? KK.u : KK.a; return m[p.slice(1).join('|')] || []; }
  function kkSet(id, kapali) { var L = kkList().filter(function (x) { return x !== id; }); if (kapali) L.push(id); if (KSEC === 'g') KK.g = L; else { var p = KSEC.split('|'), m = p[0] === 'u' ? KK.u : KK.a, key = p.slice(1).join('|'); if (L.length) m[key] = L; else delete m[key]; } }
  function kkRow(id) { var kap = kkList().indexOf(id) >= 0, gk = KSEC !== 'g' && KK.g.indexOf(id) >= 0; return '<div class="kk" data-kkr="' + id + '"><span>' + esc(KAD[id] || id) + (gk ? ' <small class="off">(genelde kapalı)</small>' : '') + '</span><label><input type="checkbox" data-kk="' + id + '"' + (kap ? '' : ' checked') + '><span class="' + (kap ? 'off' : '') + '">' + (kap ? 'Kapalı' : 'Açık') + '</span></label></div>'; }
  function kkAdi() { if (KSEC === 'g') return 'Tüm kullanıcılar (genel)'; var p = KSEC.split('|'), k = p.slice(1).join('|'), L = p[0] === 'u' ? EPOS : ARIL; for (var i = 0; i < L.length; i++) if (kkAn(L[i]) === k) return (p[0] === 'u' ? 'Kullanıcı: ' : 'Arılık: ') + L[i]; return (p[0] === 'u' ? 'Kullanıcı: ' : 'Arılık: ') + k; }
  function kkSecH() { var o = '<option value="g">Tüm kullanıcılar (genel)</option>' + EPOS.map(function (e) { return '<option value="u|' + esc(kkAn(e)) + '">Kullanıcı: ' + esc(e) + '</option>'; }).join('') + ARIL.map(function (a) { return '<option value="a|' + esc(kkAn(a)) + '">Arılık: ' + esc(a) + '</option>'; }).join(''); return '<div class="mc"><h3>Kural aç/kapa</h3><div class="kks"><select data-kksec>' + o + '</select></div><p class="m" style="min-height:1.2em">Seçili kapsam: <b data-kkad>' + esc(kkAdi()) + '</b></p><p class="m">Kapalı kural uyarı, rozet, bildirim ve kart üretmez; eşikler silinmez, açınca aynı değerlerle çalışır. Etkin = genel açık ve seçili kullanıcı için kapalı değil ve o arılık için kapalı değil. Aşağıdaki anahtarlar seçili kapsam için.</p></div>'; }
  function getP(o, k) { return k.split('.').reduce(function (a, x) { return a == null ? a : a[x]; }, o); }
  function setP(o, k, v) { var p = k.split('.'), t = o; for (var i = 0; i < p.length - 1; i++) t = t[p[i]] = t[p[i]] || {}; t[p[p.length - 1]] = v; }
  function val(src, k) { return src === 'e' ? getP(ESK, k) : SEN[k]; }
  function fmt(v) { return v == null ? '' : String(v).replace('.', ','); }
  /* koloni-198: etikette {s:anahtar} / {e:anahtar} → ayardaki değer; kutu değişince canlı güncellenir */
  function lbl(t) { return t.replace(/\{([se]):([\w.]+)\}/g, function (_, src, k) { var v = val(src, k); return '<b data-lbl="' + src + '|' + esc(k) + '">' + (v == null ? '—' : esc(fmt(v))) + '</b>'; }); }
  function rowH(x) {
    if (x[3] == null) return '<div class="rw"><span class="tr ' + x[0] + '">' + esc(x[1]) + '</span><span style="grid-column:2/4">' + lbl(x[2]) + '</span></div>';
    var src = x[3], k = x[4], v = val(src === 'L' ? 's' : src, k), ctl;
    if (v == null) ctl = '<output>—</output>';
    else if (src === 'L') ctl = '<output title="KİLİTLİ">' + esc(fmt(v)) + '</output>';
    else ctl = '<input inputmode="decimal" data-src="' + src + '" data-k="' + esc(k) + '" value="' + esc(fmt(v)) + '">';
    return '<div class="rw"><span class="tr ' + x[0] + '">' + esc(x[1]) + '</span><span>' + lbl(x[2]) + '</span>' + ctl + '<small>' + (src === 'e' ? 'app_esikler · ' : 'ogul_skor_ayar · ') + esc(k) + (src === 'L' ? ' · kilitli' : ' · tek kaynak') + '</small></div>';
  }
  function cardH(c) {
    return '<div class="mc"><h3>' + esc(c.t) + '</h3>' + (c.kk || []).map(kkRow).join('') + c.r.map(rowH).join('') + (c.vy ? VY : '') + (c.not ? '<p class="m">' + lbl(esc(c.not)) + '</p>' : '') +
      (c.src ? '<p class="m"><b>Kaynak:</b> ' + esc(c.src) + '</p>' : '') + '<p class="m"><b>' + esc(c.son || 'Son uyarılar') + ':</b> Veri yok</p></div>';
  }
  function cihazMevcut() { return '<div class="mc"><h3>Cihaz sağlığı (mevcut)</h3><p class="m">Buluta bildirilmiş cihaz yok. Cihazlar şu an yalnız kullanıcının telefonunda kayıtlı. Ayrıntı: <a href="#s-cih">Cihaz sağlığı</a> · bildirim aboneliği: <a href="#s-bildirim">Bildirim teslimi</a>.</p></div>'; }
  function paint() {
    var sv = KSEC; sO.querySelector('.bd').innerHTML = kkSecH() + OLCUM.map(cardH).join('');
    var se = sO.querySelector('[data-kksec]'); if (se) { se.value = sv; if (se.value !== sv) { KSEC = 'g'; se.value = 'g'; } }
    sC.querySelector('.bd').innerHTML = CIHAZ.map(cardH).join('') + cihazMevcut();
  }
  function load() {
    return Promise.resolve(C.ogulSkorSync ? C.ogulSkorSync() : null).catch(function () {}).then(function () {
      var OS = C.ogulSkor() || {}; SEN = JSON.parse(JSON.stringify(OS.sensor || {}));
      KK = { g: (OS.kuralKapali || []).slice(), u: JSON.parse(JSON.stringify(OS.kuralKapaliKullanici || {})), a: JSON.parse(JSON.stringify(OS.kuralKapaliArilik || {})) }; KK0 = JSON.stringify(KK);
      B.client().then(function (c) { return Promise.all([c.rpc('sa_admin_hesaplar'), c.rpc('sa_admin_uyeler')]); }).then(function (q) { EPOS = ((q[0] && q[0].data) || []).map(function (h) { return h.email; }).filter(Boolean).sort(); var aa = {}; ((q[1] && q[1].data) || []).forEach(function (u) { if (u.apiary_ad) aa[u.apiary_ad] = 1; }); ARIL = Object.keys(aa).sort(); var se = sO.querySelector('[data-kksec]'); if (se) se.outerHTML = kkSecH().match(/<select[\s\S]*?<\/select>/)[0]; var se2 = sO.querySelector('[data-kksec]'); if (se2) se2.value = KSEC; }).catch(function () {});
      return B.client().then(function (c) { return c.from('app_esikler').select('data').eq('id', 1).maybeSingle(); });
    }).then(function (r) {
      ESK = JSON.parse(JSON.stringify(ESIK_DEF)); var d = r && !r.error && r.data && r.data.data;
      if (d) Object.keys(d).forEach(function (k) { if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ESK[k] = Object.assign(ESK[k] || {}, d[k]); else ESK[k] = d[k]; });
      paint();
    }).catch(function () { paint(); });
  }
  /* İkiz alanlar: aynı anahtar iki bölümde — yazarken eşlenir */
  host.addEventListener('input', function (e) {
    var t = e.target; if (!t.closest || !t.closest('.mk') || !t.getAttribute('data-k')) return;
    [].forEach.call(host.querySelectorAll('.mk input[data-k="' + t.getAttribute('data-k') + '"][data-src="' + t.getAttribute('data-src') + '"]'), function (i) { if (i !== t) i.value = t.value; i.classList.add('chg'); });
    t.classList.add('chg');
    [].forEach.call(host.querySelectorAll('.mk [data-lbl="' + t.getAttribute('data-src') + '|' + t.getAttribute('data-k') + '"]'), function (b) { b.textContent = t.value === '' ? '—' : t.value; });
  });
  host.addEventListener('change', function (e) {
    var t = e.target; if (!t.closest || !t.closest('.mk')) return;
    if (t.hasAttribute('data-kksec')) { KSEC = t.value; [].forEach.call(host.querySelectorAll('.mk [data-kkad]'), function (b) { b.textContent = kkAdi(); }); [].forEach.call(host.querySelectorAll('.mk [data-kkr]'), function (r) { r.outerHTML = kkRow(r.getAttribute('data-kkr')); }); return; }
    var id = t.getAttribute('data-kk'); if (!id) return; kkSet(id, !t.checked);
    [].forEach.call(host.querySelectorAll('.mk [data-kkr="' + id + '"]'), function (r) { r.outerHTML = kkRow(id); });
    [].forEach.call(host.querySelectorAll('.mk [data-kkr="' + id + '"]'), function (r) { r.classList.add('chg'); });
  });
  function stat(m) { [].forEach.call(host.querySelectorAll('.mk [data-mk-stat]'), function (s) { s.innerHTML = m; }); }
  host.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.mk [data-mk-save]')) return;
    var ch = {}, bad = null;
    [].forEach.call(host.querySelectorAll('.mk input.chg'), function (i) { var v = Number(String(i.value).replace(',', '.')); if (i.value === '' || !isFinite(v) || v < 0) bad = bad || i; ch[i.getAttribute('data-src') + '|' + i.getAttribute('data-k')] = v; });
    if (bad) { bad.focus(); stat('<b>Geçersiz değer</b>: 0 veya üstü bir sayı girin.'); return; }
    var kkD = JSON.stringify(KK) !== KK0, ks = Object.keys(ch); if (!ks.length && !kkD) { stat('Değişiklik yok.'); return; }
    var s = {}, e2 = null;
    ks.forEach(function (x) { var p = x.split('|'); if (p[0] === 'e') { e2 = e2 || JSON.parse(JSON.stringify(ESK)); setP(e2, p[1], ch[x]); } else s[p[1]] = ch[x]; });
    if (Object.keys(s).length && C.nemSiraGecerli) { var ns = Object.assign({}, (C.ogulSkor() || {}).sensor, s); if (!C.nemSiraGecerli(ns)) { stat('<b>Nem eşikleri sırası hatalı.</b> Kritik &lt; erken uyarı (normal alt) &lt; normal üst ≤ kireç olmalı ve değerler %0–100 arasında kalmalı. Kaydedilmedi.'); return; } }
    if (!confirm((kkD ? 'Kural aç/kapa değişti. ' : '') + ks.length + ' eşik tüm kullanıcılar için kaydedilsin mi?\n(Ölçüm kuralları, Cihazlar, Oğul skorları ve Eşikler aynı kayıtları kullanır.)')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    B.client().then(function (c) {
      var jobs = [];
      if (Object.keys(s).length || kkD) { var o = JSON.parse(JSON.stringify(C.ogulSkor())); o.sensor = Object.assign({}, o.sensor, s); o.kuralKapali = KK.g.slice(); o.kuralKapaliKullanici = KK.u; o.kuralKapaliArilik = KK.a;
        jobs.push(c.rpc('sa_ayar_yayinla', { p_data: o, p_not: 'Ölçüm kuralları · ' + Object.keys(s).length + ' alan' + (kkD ? ' · kural aç/kapa' : '') }).then(function (r) { if (r.error) throw r.error; C.ogulSkorSet(o, { at: new Date().toISOString() }); })); }
      if (e2) jobs.push(c.rpc('sa_esikler_kaydet', { p_data: e2 }).then(function (r) { if (r.error) throw r.error; ESK = e2; }));
      return Promise.all(jobs);
    }).then(function () {
      SEN = JSON.parse(JSON.stringify(C.ogulSkor().sensor || {})); var O2 = C.ogulSkor(); KK = { g: (O2.kuralKapali || []).slice(), u: JSON.parse(JSON.stringify(O2.kuralKapaliKullanici || {})), a: JSON.parse(JSON.stringify(O2.kuralKapaliArilik || {})) }; KK0 = JSON.stringify(KK); paint(); stat('Kaydedildi.');
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'olcum' } })); } catch (x) {}
    }).catch(function (er) { stat('Kaydedilemedi: ' + esc((er && er.message) || 'bağlantı')); });
  });
  window.addEventListener('sa-ayar-degisti', function (e) { if (!e.detail || e.detail.from !== 'olcum') load(); });
  load();
})();
