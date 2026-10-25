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
    { t: 'Günlük endeks (önizleme)', kk: ['endeks'], src: 'Kaynak yok · tümü uzman tahmini', not: 'Arılık özet kartı ve günlük tarlacı / nektar akışı endeksi (0–100). Tartı «Nektar akımı» döşemesi ve oğul skoru nektar bayrağından ayrı; hava sayfası «Nektar akımı» hava tahmini değil.', r: [
      ['i', 'Tarlacı', 'Tam puan günlük çıkış (arı) ' + UT, 's', 'endeksIrTam'],
      ['i', 'Nektar', 'Tam puan günlük net artış (kg) ' + UT, 's', 'endeksNektarTamKg'],
      ['i', 'Taban', 'Giriş sayacı taban (gün) ' + UT, 's', 'endeksIrTabanGun'],
      ['i', 'Hava', 'Uçuş uygun değilse çarpan (0–1) ' + UT, 's', 'endeksHavaCarpan'],
      ['i', 'Birleşik', 'Ağırlık tarlacı (%) ' + UT, 's', 'endeksAgirlikTar'],
      ['i', 'Birleşik', 'Ağırlık nektar (%) ' + UT, 's', 'endeksAgirlikNektar']] },
    { t: 'Okuma sıklığı (varsayılan)', kk: [], cz: 1, src: 'Tartı: Meikle W.G. ve ark. 5–15 dk (ör. 2008 Apidologie 39:694; 2014 Apidologie 46:10) · Titreşim: Ramsey M-T. ve ark. 2020 Sci Rep 10:9798 (sürekli kayıt, 3 dk ortalama spektrum; gece 00–05) · diğerleri uzman tahmini · pil planı bu tabanı kullanır; seyreltme yalnız «Onayla» ile', not: 'Cihaz ölçüm sıklığının varsayılanı. Pil düşükken önerilen seyreltme bu değerlerden başlar; kullanıcı Onayla demeden değişmez. Eşek arısı ±0,5 °C / {s:esekEslesDk} dk için 30 dk taban yetmez → tıslama veya titreşim artınca iç ve giriş sıcaklığı {s:okumaEsekHizliDk} dk’da bir okunur (uzman tahmini). Ses ve titreşimde cihaz sürekli dinler; aralık yalnız ortalama spektrumun kaydedilme sıklığıdır. Piping, tıslama, dur sinyali, ana ötmesi ve darbe olay anında gönderilir, aralığa bağlı değildir. Oğul çıktı (IR) {s:ogulCiktiDk} dk pencereye bakar: giriş sayacı en çok yarısı kadar, gateway en çok o kadar seyrek olmalı.', r: [
      ['i', 'İç sıcaklık/nem', 'Kovan içi (dk) ' + UT, 's', 'okumaIsiNemDk'],
      ['i', 'Giriş sıcaklığı', 'Giriş sensörü (dk) ' + UT, 's', 'okumaGirisSicakDk'],
      ['i', 'Dış hava', 'Cihazlı dış sıcaklık + nem (dk) ' + UT, 's', 'okumaDisHavaDk'],
      ['i', 'Tartı', 'Ağırlık (dk) · Meikle 5–15; seçim 15 ' + UT, 's', 'okumaTartiDk'],
      ['i', 'Ses', 'Mikrofon ortalama spektrum (dk) ' + UT, 's', 'okumaSesDk'],
      ['i', 'Titreşim', 'İvmeölçer ortalama spektrum (dk) · Ramsey 2020 (3 dk)', 's', 'okumaTitDk'],
      ['i', 'Giriş sayacı', 'IR giren / çıkan toplama (dk) ' + UT, 's', 'okumaIrDk'],
      ['i', 'Pil', 'Pil okuma (dk) ' + UT, 's', 'okumaPilDk'],
      ['i', 'Kamera', 'Fotoğraf (dk; 1440 = günde 1) ' + UT, 's', 'okumaKameraDk'],
      ['i', 'Gateway', 'Buluta gönderim (dk) ' + UT, 's', 'okumaGatewayDk'],
      ['i', 'Eşek hızlı', 'Tıslama/titreşim tetiklenince sıcaklık (dk) ' + UT, 's', 'okumaEsekHizliDk']] },
    { t: 'Ses', kk: ['sesOgulAni','sesPiping','sesQuack','sesAnasiz','sesIsciOtme','sesOgulEgilim','sesSaglik','sesVarroa'], src: 'Frekans bantları: Kural kaynakları → Ses sınıfları (KİLİTLİ, burada yalnız okunur) · Oğul anı 500–600 Hz, +6 dB, 2 dk: uzman tahmini — hakemli kaynak bulunamadı (Ferrari 2008 bant kaymasını gösterir, dB/süre eşiği vermez → aşağıdaki «Oğul öncesi» kuralı); Yapılacaklar\'da', r: [
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
    { t: 'Ses: Oğul öncesi (ses + sıcaklık)', kk: ['sesOgulOnce'], src: 'Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Comput. Electron. Agric. 64:72–77, doi:10.1016/j.compag.2008.05.010 · ~110 Hz güç artışı, baskın frekans ~300 Hz\'e kayar, sıcaklık 33→35 °C, oğul sonrası ~32 °C · dB, bant genişliği ve süre kaynakta yok → uzman tahmini (Yapılacaklar\'da)', not: 'Mevcut oğul kurallarıyla ortak kontrol: oğul anı / eğilim / işçi ötmesiyle birlikte görülürse seviye yükselir; oğul sesinden sonra sıcaklık düşerse «oğul çıkmış olabilir».', r: [
      ['w', '110 Hz', 'Bant alt (Hz) ' + UT, 's', 'ogulOn110HzMin'],
      ['w', '110 Hz', 'Bant üst (Hz) ' + UT, 's', 'ogulOn110HzMax'],
      ['w', '110 Hz', 'Güç artışı (dB) ' + UT, 's', 'ogulOn110ArtisDb'],
      ['w', 'Baskın', 'Hedef frekans (Hz) · Ferrari 2008', 's', 'ogulOnBaskinHz'],
      ['w', 'Baskın', 'Tolerans (Hz) ' + UT, 's', 'ogulOnBaskinTolHz'],
      ['w', 'Sıcaklık', 'Başlangıç (°C) · Ferrari 2008', 's', 'ogulOnSicakAltC'],
      ['w', 'Sıcaklık', 'Yükselen (°C) · Ferrari 2008', 's', 'ogulOnSicakUstC'],
      ['i', 'Sıcaklık', 'Oğul sonrası düşüş (°C) · Ferrari 2008', 's', 'ogulOnSicakDusC'],
      ['w', 'Süre', 'Karşılaştırma penceresi (saat) ' + UT, 's', 'ogulOnSaat']] },
    { t: 'Ses: Ana arı ötme sırası', kk: ['sesOtmeSira'], src: 'Ramsey M.-T., Bencsik M., Newton M.I., Reyes M., Pioz M., Crauser D., Delso N.S., Le Conte Y. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Sci. Rep. 10:9798, doi:10.1038/s41598-020-66115-5 · tooting her zaman quacking\'den önce; ilk oğuldan sonra 4–7 gün ötme olmaması normal', not: 'Öncesinde tooting yoksa quacking uyarısı verilmez (yanlış sınıflama). Oğuldan sonra bu süre içinde ötme yoksa ses kaynaklı anasızlık uyarısı susturulur.', r: [
      ['i', 'Ötmesiz', 'Normal süre alt (gün) · Ramsey 2020', 's', 'otmeSessizGunMin'],
      ['i', 'Ötmesiz', 'Normal süre üst (gün) · Ramsey 2020', 's', 'otmeSessizGunMax'],
      ['w', 'Sıra', 'Quacking öncesi tooting arama penceresi (saat) ' + UT, 's', 'otmeSiraSaat']] },
    { t: 'Ses: Rahatsız edilme (gece/gündüz)', kk: ['sesRahatsiz'], src: 'Ramsey M., Bencsik M., Newton M.I. (2017). Long-term trends in the honeybee \'whooping signal\' revealed by automated detection. PLoS One 12(2):e0171162, doi:10.1371/journal.pone.0171162 · dur sinyali darbeleri en çok gece; darbe/sarsıntı sonrası ani artış · Hz ve eşikler uzman tahmini (Yapılacaklar\'da)', not: 'Taban kovanın kendi gece/gündüz düzeninden (aynı dilim, önceki 24 saat) hesaplanır.', r: [
      ['w', 'Dur sinyali', 'Alt (Hz) ' + UT, 's', 'dursunHzMin'],
      ['w', 'Dur sinyali', 'Üst (Hz) ' + UT, 's', 'dursunHzMax'],
      ['w', 'Dur sinyali', 'En kısa darbe (ms) ' + UT, 's', 'dursunMinMs'],
      ['w', 'Dur sinyali', 'En uzun darbe (ms) ' + UT, 's', 'dursunMaxMs'],
      ['w', 'Pencere', 'Darbe sonrası (dk) ' + UT, 's', 'dursunPencereDk'],
      ['w', 'Artış', 'Tabanın katı ' + UT, 's', 'dursunKat'],
      ['w', 'Artış', 'En az sinyal sayısı ' + UT, 's', 'dursunMinSay']] },
    { t: 'Ses: Eşek arısı tıslaması', kk: ['sesEsekArisi'], src: 'Papachristoforou A., Sueur J., Rortais A., Angelopoulos S., Thrasyvoulou A., Arnold G. (2008). High frequency sounds produced by Cyprian honeybees Apis mellifera cypria when confronting their predator, the Oriental hornet Vespa orientalis. Apidologie 39:468–474, doi:10.1051/apido:2008027 · temel ~499±67 Hz, baskın ~5,9±1,4 kHz, tıslama ~0,62 sn', not: 'Kaynaktaki arı alt türü: A. m. cypria (Kıbrıs) — Türkiye ırklarında doğrulanmadı. Mikrofon örneklemesi en düşük değerin altındaysa kullanıcıya «Veri yok / mikrofon desteklemiyor» gösterilir.', r: [
      ['c', 'Tıslama', 'Baskın alt (Hz) · Papachristoforou 2008', 's', 'esekHzMin'],
      ['c', 'Tıslama', 'Baskın üst (Hz) · Papachristoforou 2008', 's', 'esekHzMax'],
      ['i', 'Tıslama', 'Temel frekans (Hz, bilgi) · Papachristoforou 2008', 's', 'esekTemelHz'],
      ['c', 'Tıslama', 'Süre (ms) · Papachristoforou 2008', 's', 'esekSureMs'],
      ['c', 'Tıslama', 'Süre toleransı (ms) ' + UT, 's', 'esekSureTolMs'],
      ['c', 'Tıslama', 'Pencerede en az ' + UT, 's', 'esekMinSay'],
      ['c', 'Tıslama', 'Pencere (dk) ' + UT, 's', 'esekPencereDk'],
      ['i', 'Mikrofon', 'En düşük örnekleme (Hz)', 's', 'esekMinOrneklemeHz']] },
    { t: 'Koloni sönmüş olabilir', kk: ['koloniSonuk'], src: 'Meikle W.G., Weiss M., Maes P.W., Fitz W., Snyder L.A., Sheehan T., Mott B.M., Anderson K.E. (2017). Internal hive temperature as a means of monitoring honey bee colony health in a migratory beekeeping operation before and during winter. Apidologie 48:666–680, doi:10.1007/s13592-017-0512-8 · kavram: ölü/sönmüş kolonide iç sıcaklık dış havayı izler', not: 'Eşikler kaynakta yok → uzman tahmini. Sıcaklık tek başına yetmez; IR ya da tartı da doğrulamalı. Kullanıcıya: «Koloni sönmüş olabilir» (sayı yok).', r: [
      ['c', 'Sıcaklık', 'İç salınım ≥ dış salınımın oranı ' + UT, 's', 'sonukSalinimOran'],
      ['c', 'Sıcaklık', 'Dış günlük salınım en az (°C) ' + UT, 's', 'sonukDisMinC'],
      ['c', 'Süre', 'Art arda gün ' + UT, 's', 'sonukGun'],
      ['c', 'IR', 'Günlük trafik en çok (arı) ' + UT, 's', 'sonukIrGunMax'],
      ['c', 'Tartı', 'Günlük oynama en çok (kg) ' + UT, 's', 'sonukAgirlikKg']] },
    { t: 'Yavrusuz / anasız (sıcaklık salınımı)', kk: ['yavrusuzSicak'], src: 'Kleinhenz M., Bujok B., Fuchs S., Tautz J. (2003). J. Insect Physiol. 49:1135 · Groh C., Tautz J., Rössler W. (2004). PNAS 101:4268 (yavru alanı ~34,5 °C sabit) · Meikle W.G. ve ark. (2017). Apidologie 48:666, doi:10.1007/s13592-017-0512-8', not: 'Yalnız sensör kuluçkalıktaysa ve kuluçka döneminde. Anasızlık uyarısıyla tek uyarı (kanıt sayısını artırır); tetiklenince genel «kuluçka oynaklığı» görevi çıkmaz. Kullanıcıya: «Yavru kalmamış olabilir».', r: [
      ['w', 'Salınım', 'Günlük salınım ≥ (°C) ' + UT, 's', 'yavrusuzSalinimC'],
      ['w', 'Süre', 'Art arda gün ' + UT, 's', 'yavrusuzGun']] },
    { t: 'Tarlacı arı kaybı (tartı)', kk: ['tarlaciKayip'], src: 'Meikle W.G., Rector B.G., Mercadier G., Holst N. (2008). Within-day variation in continuous hive weight data as a measure of honey bee colony activity. Apidologie 39:694–707, doi:10.1051/apido:2008055 · Meikle W.G., Holst N. (2014). Apidologie 46:10–22, doi:10.1007/s13592-014-0298-x · Meikle W.G. ve ark. (2018). PLoS One 13(5):e0197589, doi:10.1371/journal.pone.0197589', not: 'Sabah tarlacı çıkışıyla ağırlık düşer (kaynak); eşikler kaynakta yok → uzman tahmini. Yalnız uygun uçuş günleri (Uçuş havası Genel eşikleri), kovanın kendi tabanına göre.', r: [
      ['w', 'Pencere', 'Başlangıç saati ' + UT, 's', 'tarlaciSaatBas'],
      ['w', 'Pencere', 'Uzunluk (saat) ' + UT, 's', 'tarlaciPencereSaat'],
      ['w', 'Taban', 'Önceki uygun gün sayısı ' + UT, 's', 'tarlaciTabanGun'],
      ['w', 'Taban', 'En az sabah düşüşü (kg) ' + UT, 's', 'tarlaciMinKg'],
      ['w', 'Düşüş', 'Tabanın bu oranının altı ' + UT, 's', 'tarlaciOran'],
      ['w', 'Süre', 'Art arda uygun gün ' + UT, 's', 'tarlaciGun']] },
    { t: 'Eşek arısı: sıcaklık + tıslama + titreşim', kk: ['esekGiris'], src: 'Yol A (tıslama): kovan sensörüyle yayımlanmış çalışma yok → uzman tahmini · bağlam Ono 1995 doi:10.1038/377334a0 · Käfer 2012 doi:10.1016/j.jinsphys.2012.01.015 · Papachristoforou 2007 doi:10.1016/j.cub.2007.07.033 · Yol B (tıslamasız IR yedek, uzman tahmini): Requier F. ve ark. (2019). J. Pest Sci. 92:71–83, doi:10.1007/s10340-018-1063-0 (foraging paralysis) · Monceau K. ve ark. (2013). PLoS ONE 8:e66492, doi:10.1371/journal.pone.0066492 · sezon Tem–Eki', not: 'Yol A (tıslama ölçülürse): sıcaklık değişimi + tıslama + titreşim aynı pencerede. Yol B (mikrofon yok / Mikrofon desteklemiyor): sıcaklık + titreşim + IR çıkan düşüşü; yalnız Tem–Eki ve uygun uçuş günü; IR yoksa uyarı yok («tıslama ölçülemiyor, giriş sayacı yok»). Giriş sıcaklığı > eşik → kritik. Kovan sayfasında «Eşek arısı yolu: …» hangi yolun kullanıldığını gösterir. Tıslamasız yol tümü uzman tahmini.', r: [
      ['c', 'Sıcaklık', 'Değişim ≥ (°C) ' + UT, 's', 'esekSicakDegisimC'],
      ['c', 'Pencere', 'Üçü aynı pencerede (dk) ' + UT, 's', 'esekEslesDk'],
      ['c', 'Titreşim', 'Tabanın katı ' + UT, 's', 'esekTitresimKat'],
      ['c', 'Titreşim', 'Taban penceresi (dk) ' + UT, 's', 'esekTitTabanDk'],
      ['c', 'Giriş (ek)', 'Giriş sıcaklığı > (°C) · Ono 1995 / Käfer 2012 top sıcaklığı', 's', 'esekGirisYuksekC'],
      ['w', 'IR yedek', 'Çıkan ≤ tabanın oranı ' + UT, 's', 'esekIrOran'],
      ['w', 'IR yedek', 'Çıkan penceresi (dk) ' + UT, 's', 'esekIrPencereDk'],
      ['w', 'IR yedek', 'Çıkan taban penceresi (dk) ' + UT, 's', 'esekIrTabanDk'],
      ['w', 'IR yedek', 'Sezon başlangıç ayı ' + UT, 's', 'esekIrAyBas'],
      ['w', 'IR yedek', 'Sezon bitiş ayı ' + UT, 's', 'esekIrAySon']] },
    { t: 'Havalandırma yetersiz (CO₂ sensörsüz)', kk: ['havalandirma'], src: 'Doğrulanmış eşik kaynağı yok → tümü uzman tahmini · bağlam: Human H., Nicolson S.W., Dietemann V. (2006). Do honeybees, Apis mellifera scutellata, regulate humidity in their nest? Naturwissenschaften 93:397–401, doi:10.1007/s00114-006-0117-y', not: 'Kuluçka hem sıcak hem nemli (nem normal üst sınırı üstü) kesintisiz süre ya da soğuk dönemde yüksek nem + büyük iç−dış fark (yoğuşma riski). Yelpazeleme sesi varsa seviye yükselir. Nem «normalin üstünde» görevi bu uyarıya katılır; kireç riski varsa kireç görevi kalır ve bu uyarı çıkmaz.', r: [
      ['w', 'Süre', 'Kesintisiz (saat) ' + UT, 's', 'havaSaat'],
      ['w', 'Sıcak', 'Kuluçka sıcaklığı üstü (°C) ' + UT, 's', 'havaSicakC'],
      ['w', 'Yoğuşma', 'Nem ≥ (%) ' + UT, 's', 'havaYogusmaRh'],
      ['w', 'Yoğuşma', 'İç−dış fark ≥ (°C) ' + UT, 's', 'havaYogusmaFarkC'],
      ['w', 'Yoğuşma', 'Soğuk dönem başlangıç ayı ' + UT, 's', 'havaYogusmaAyBas'],
      ['w', 'Yoğuşma', 'Soğuk dönem bitiş ayı ' + UT, 's', 'havaYogusmaAySon']] },
    { t: 'IR: İlaçlama şüphesi', kk: ['irIlac'], src: 'Struye M.H., Mortier H.J., Arnold G., Miniggio C., Borneck R. (1994). Microprocessor-controlled monitoring of honeybee flight activity at the hive entrance. Apidologie 25(4):384–395, doi:10.1051/apido:19940405 · gündüz ani giren artışı + çıkan düşüşü; normal koşullarda görülmez', not: 'Kaynak sayısal eşik vermez → eşikler uzman tahmini. Aynı saat dilimi önceki günlerin medyanına göre. Kullanıcıya: «İlaçlama şüphesi» (sayı yok).', r: [
      ['c', 'Pencere', 'Süre (dk) ' + UT, 's', 'ilacPencereDk'],
      ['c', 'Taban', 'Önceki gün ' + UT, 's', 'ilacTabanGun'],
      ['c', 'Taban', 'En az giren (arı) ' + UT, 's', 'ilacMinTaban'],
      ['c', 'Giren', 'Tabanın katı ≥ ' + UT, 's', 'ilacGirisKat'],
      ['c', 'Çıkan', 'Tabanın oranı ≤ ' + UT, 's', 'ilacCikisOran']] },
    { t: 'IR: Dönmeyen tarlacı', kk: ['irDonmeyen'], src: 'Henry M., Béguin M., Requier F., Rollin O., Odoux J.-F., Aupinel P., Aptel J., Tchamitchian S., Decourtye A. (2012). A common pesticide decreases foraging success and survival in honey bees. Science 336:348–350, doi:10.1126/science.1215039 · dönüş oranı (homing)', not: 'Günlük (giren−çıkan)/çıkan, son günlerin ortalaması kovanın kendi taban medyanıyla karşılaştırılır. Eşikler uzman tahmini. Tartı «Tarlacı kaybı» ile tek uyarı (ikisi birlikte → yüksek). Kullanıcıya: «Tarlacı arı kaybı olabilir».', r: [
      ['w', 'Süre', 'Yumuşatma (gün) ' + UT, 's', 'donmeYumusakGun'],
      ['w', 'Taban', 'Taban (gün) ' + UT, 's', 'donmeTabanGun'],
      ['w', 'Düşüş', 'Tabanın altı (oran farkı) ' + UT, 's', 'donmeFark'],
      ['w', 'Veri', 'Günlük en az çıkış (arı) ' + UT, 's', 'donmeMinCikis']] },
    { t: 'IR: Beklenenden düşük aktivite', kk: ['irDusukAktivite'], src: 'Clarke D., Robert D. (2018). Predictive modelling of honey bee foraging activity using local weather conditions. Apidologie 49:386–396, doi:10.1007/s13592-018-0565-3 · sıcaklık + güneş ışınımı uçuştaki farkın ~%78\'ini açıklar', not: 'Güneş ışınımı verisi yok → yalnız gündüz ortalama sıcaklık. Kovana özgü doğrusal model, yalnız uçuşa uygun günler (Uçuş havası Genel eşikleri). Eşikler uzman tahmini. «Trafik düşüşü» görevi buna katılır. Kullanıcıya: «Uçuş beklenenden az».', r: [
      ['w', 'Öğrenme', 'Uygun gün ' + UT, 's', 'aktiviteTabanGun'],
      ['w', 'Öğrenme', 'En az gün ' + UT, 's', 'aktiviteMinGun'],
      ['w', 'Süre', 'Art arda uygun gün ' + UT, 's', 'aktiviteGun'],
      ['w', 'Düşüş', 'Beklenenin oranı altı ' + UT, 's', 'aktiviteOran']] },
    { t: 'IR: Sayaç arızası', kk: ['irSayac'], src: 'Odemer R. (2021). Approaches, challenges and recent advances in automated bee counting devices: A review. Annals of Applied Biology 180(1):73–89, doi:10.1111/aab.12727 · kanal tıkanması (propolis, çöp)', not: 'Bir kanal sıfır, diğerleri sayıyorsa ya da günlük giren/çıkan dengesizse. Arıza varken diğer IR kuralları çalışmaz. Eşikler uzman tahmini. Kullanıcıya: «Kanal tıkalı olabilir».', r: [
      ['i', 'Kanal', 'Sıfır süresi (saat) ' + UT, 's', 'sayacSaat'],
      ['i', 'Kanal', 'Diğer kanallar en az (arı) ' + UT, 's', 'sayacMinDiger'],
      ['i', 'Denge', 'Giren/çıkan sapma oranı ' + UT, 's', 'sayacDengeOran'],
      ['i', 'Denge', 'Dengesiz gün ' + UT, 's', 'sayacGun']] },
    { t: 'IR: Oğul çıktı', kk: ['irOgulCikti'], src: 'Struye M.H. ve ark. (1994). Apidologie 25(4):384–395, doi:10.1051/apido:19940405 · oğulda toplu çıkış, dönüş yok (yalnız tarif, sayı yok)', not: 'Tümü uzman tahmini. Ses «Oğul anı» uyarısıyla tek uyarı; tartı düşüşü varsa kritik. «IR: Oğul» görevi buna katılır. Kullanıcıya: «Oğul çıkmış olabilir».', r: [
      ['c', 'Pencere', 'Süre (dk) ' + UT, 's', 'ogulCiktiDk'],
      ['c', 'Çıkış', 'Net çıkış en az (arı) ' + UT, 's', 'ogulCiktiNet'],
      ['c', 'Dönüş', 'Pencere (dk) ' + UT, 's', 'ogulDonusDk'],
      ['c', 'Dönüş', 'Dönen oran en çok ' + UT, 's', 'ogulDonusOran'],
      ['c', 'Tartı', 'Doğrulama düşüşü (kg) ' + UT, 's', 'ogulKgDusus']] },
    { t: 'Uçuş havası (arı cinsi)', kk: ['ucus'], src: 'Irka özgü hakemli uçuş eşiği bulunamadı → tümü uzman tahmini · Genel A. mellifera: Burrill & Dietz 1981, Apidologie 12:319 (9 °C altında uçuş yok); Vicens & Bosch 2000, Environ. Entomol. 29:413 (etkinlik 12–14 °C); rüzgar: Karbassioon ve ark. 2023, Oecologia 201:689, doi:10.1007/s00442-023-05332-x (~9 km/sa üstü azalır); yağmurda uçuş yok: Riessberger & Crailsheim 1997, Apidologie 28:411 · güneş: Vicens & Bosch 2000 (A. mellifera ~300 W/m² ışınımda etkin), Clarke & Robert 2018, Apidologie 49:386, doi:10.1007/s13592-018-0565-3 (sıcaklık + ışınım etkinlik değişiminin %78 kadarı) · temizlik uçuşu: Burrill & Dietz 1981 (9 °C), kışın 9,3 °C üstü uçuş: J. Apiculture 2024, doi:10.17519/apiculture.2024.11.39.4.317 · mevsim: Erzurum (Tortum dahil) çiçeklenme Haziran–Ağustos, Arıcılık Araştırma Enstitüsü 2022 «Türkiye İl-İlçe Ballı ve Polenli Bitkiler ile Çiçeklenme Dönemleri»; Tortum WMO 1991–2020 normali Ekim ort. en yüksek 18,8 °C / en düşük 3,7 °C · bölge mevsim tarihleri bakım takvimi profillerinden (uzman tahmini) · çam balı bölgesi mevsim sonu (kaynaklı): MAYBİR, maybir.org.tr/mugla-cam-bali (Muğla çam balı yoğun dönemi Ağustos–Kasım); Küre Ansiklopedi «Çam balı» (15 Ağustos–30 Kasım); Günbey B., Arıcılık Araştırma Enstitüsü (Marchalina hellenica yayılışı: Muğla, Aydın, İzmir, Balıkesir, Çanakkale, Antalya)', not: 'Gün etiketi saat saat: gündüz (is_day), kuru (yağış 0 ve olasılık <%60) saatlerden en az {s:ucusSaatMin} «uygun saat» (sıcaklık ≥ uygun, rüzgar ≤ uygun, ışınım ≥ {s:ucusIsinimW} W/m²) → Uçuş uygun; en az bir «kısmen» saati → Kısmen. Günlük yağış ≥ eşik → Uygun değil. Mevsim dışında (bölge profili ya da Oğul skorları › Arılık uçuş mevsimi): kuru ve en az bir gündüz saati ≥ {s:ucusTemizlikC} °C → «Temizlik uçuşu olabilir», değilse «Uçuş yok»; toplama sayılmaz. Hava › Uçuşa uygun günler, Bal sezonu ve Nektar listeleri bu değerleri kullanır. Arılığın cinsi kovanlarındaki en sık ırktan alınır. Melez (ör. Kafkas × Karadeniz): ebeveyn gruplarının daha ihtiyatlı değeri (yüksek sıcaklık, düşük rüzgar ve yağış). Tanınmayan ırk (Muğla, Anadolu…): Genel.', r: [
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
      ['c', 'Genel', 'Bu yağış ve üstü uygun değil (mm) ' + UT, 's', 'ucusGenelYagisMm'],
      ['ok', 'Güneş', 'Uygun saat: en az ışınım (W/m²) · Vicens & Bosch 2000', 's', 'ucusIsinimW'],
      ['ok', 'Süre', 'Uygun gün: en az uygun gündüz saati ' + UT, 's', 'ucusSaatMin'],
      ['i', 'Temizlik', 'Mevsim dışı: en düşük sıcaklık (°C) · Burrill & Dietz 1981', 's', 'ucusTemizlikC'],
      ['i', 'Mevsim', 'Sıcak bölge: başlangıç (AAGG, ör. 201 = 1 Şub) ' + UT, 's', 'ucusSezonSicakBas'],
      ['i', 'Mevsim', 'Sıcak bölge: bitiş (AAGG) ' + UT, 's', 'ucusSezonSicakSon'],
      ['i', 'Mevsim', 'Çam balı bölgesi mevsim sonu (AAGG, ör. 1130 = 30 Kas) — sıcak bölgede Muğla, Aydın, İzmir, Balıkesir, Çanakkale, Antalya kıyıları; diğer sıcak bölgeler yukarıdaki bitişte kalır <span class="mk-ky">kaynaklı</span> MAYBİR (Ağustos–Kasım) · Küre Ansiklopedi (15 Ağu–30 Kas) · Günbey / Arıcılık Araştırma Enstitüsü', 's', 'ucusSezonCamSon'],
      ['i', 'Mevsim', 'Ilıman: başlangıç (AAGG) ' + UT, 's', 'ucusSezonIlimanBas'],
      ['i', 'Mevsim', 'Ilıman: bitiş (AAGG) ' + UT, 's', 'ucusSezonIlimanSon'],
      ['i', 'Mevsim', 'Yayla (≈1100–1800 m): başlangıç (AAGG) ' + UT, 's', 'ucusSezonYaylaBas'],
      ['i', 'Mevsim', 'Yayla: bitiş (AAGG, ör. 920 = 20 Eyl) ' + UT, 's', 'ucusSezonYaylaSon'],
      ['i', 'Mevsim', 'Yüksek yayla (≥1800 m): başlangıç (AAGG) ' + UT, 's', 'ucusSezonYuksekBas'],
      ['i', 'Mevsim', 'Yüksek yayla: bitiş (AAGG) ' + UT, 's', 'ucusSezonYuksekSon']] },
    { t: 'Titreşim', kk: ['titresim'], src: 'Kaynak yok · uzman tahmini', not: 'Olağandışı hareket: hırsızlık / kapak açıldı alarmı için hazırlık.', r: [
      ['w', 'Olağandışı', '7 gün tabanının katı ' + UT, 's', 'titresimKat'],
      ['w', 'Süre', 'Kesintisiz (dk) ' + UT, 's', 'titresimDk']] },
    { t: 'Titreşim: Oğul hazırlığı (gece)', kk: ['titOgul'], src: 'Bencsik M., Bencsik J., Baxter M., Lucian A., Romieu J., Millet M. (2011). Identification of the honey bee swarming process by analysing the time course of hive vibrations. Comput. Electron. Agric. 76:44–50, doi:10.1016/j.compag.2011.01.004 (25–800 Hz; oğuldan ~10 gün önce değişim) · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Sci. Rep. 10:9798, doi:10.1038/s41598-020-66115-5 (en güçlü işaret gece 00–05, ~20–24 Hz)', not: 'Not: oğul öncesi 400–500 Hz artışı kaynaklarda yok; işaret gece düşük bantta. Kaynaklar öğrenen model kullanır, sabit eşik vermez → oran ve gece sayısı uzman tahmini. «Ses: Oğul öncesi» ile tek uyarı (hangisi tetiklerse). Kullanıcıya: «Erken Uyarı: Oğul Hazırlığı» (sayı yok). Titreşim sensörü yoksa «Veri yok».', r: [
      ['i', 'Gece', 'Başlangıç saati · Ramsey 2020', 's', 'titOgulGeceBas'],
      ['i', 'Gece', 'Bitiş saati · Ramsey 2020', 's', 'titOgulGeceSon'],
      ['i', 'Bant', 'Alt (Hz) · Ramsey 2020 (~20–24 Hz dahil)', 's', 'titOgulHzMin'],
      ['i', 'Bant', 'Üst (Hz) · Bencsik 2011', 's', 'titOgulHzMax'],
      ['i', 'Süre', 'Bakılan gün · Bencsik 2011 (~10)', 's', 'titOgulGun'],
      ['w', 'Taban', 'Kendi taban (gün) ' + UT, 's', 'titOgulTabanGun'],
      ['w', 'Artış', 'Tabanın katı ' + UT, 's', 'titOgulArtisOran'],
      ['w', 'Artış', 'Art arda artan gece ' + UT, 's', 'titOgulArtisGece']] },
    { t: 'Titreşim: Ana ötmesi', kk: ['titOtme'], src: 'Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). Sci. Rep. 10:9798, doi:10.1038/s41598-020-66115-5 · tooting 200–550 Hz (~400 Hz), quacking ~300–350 Hz; tooting her zaman quacking’den önce', not: 'Tooting sonra quacking → «Bakire ana çıktı, ikincil oğul riski». «Ses: Ana arı ötme sırası» ile tek uyarı. Pencere uzman tahmini.', r: [
      ['i', 'Tooting', 'Alt (Hz) · Ramsey 2020', 's', 'titTootHzMin'],
      ['i', 'Tooting', 'Üst (Hz) · Ramsey 2020', 's', 'titTootHzMax'],
      ['i', 'Quacking', 'Alt (Hz) · Ramsey 2020', 's', 'titQuackHzMin'],
      ['i', 'Quacking', 'Üst (Hz) · Ramsey 2020', 's', 'titQuackHzMax'],
      ['w', 'Sıra', 'Tooting→quacking penceresi (saat) ' + UT, 's', 'titOtmeSiraSaat']] },
    { t: 'Titreşim: Rahatsız edilme / darbe', kk: ['titDarbe'], src: 'Ramsey M., Bencsik M., Newton M.I. (2017). Long-term trends in the honeybee \'whooping signal\' revealed by automated detection. PLoS One 12(2):e0171162, doi:10.1371/journal.pone.0171162 · 200–400 Hz kısa sinyaller (0,05–0,2 sn)', not: 'Kısa sinyaller kendi tabanının çok üstünde ya da tek büyük ivme sıçraması (hırsız/hayvan). «Ses: Rahatsız edilme» ile tek uyarı. Kat, pencere, sayı ve g eşiği uzman tahmini.', r: [
      ['i', 'Sinyal', 'Alt (Hz) · Ramsey 2017', 's', 'titDarbeHzMin'],
      ['i', 'Sinyal', 'Üst (Hz) · Ramsey 2017', 's', 'titDarbeHzMax'],
      ['i', 'Sinyal', 'En kısa (ms) · Ramsey 2017', 's', 'titDarbeMinMs'],
      ['i', 'Sinyal', 'En uzun (ms) · Ramsey 2017', 's', 'titDarbeMaxMs'],
      ['w', 'Pencere', 'Süre (dk) ' + UT, 's', 'titDarbePencereDk'],
      ['w', 'Pencere', 'En az sinyal ' + UT, 's', 'titDarbeMinSay'],
      ['w', 'Taban', 'Tabanın katı ' + UT, 's', 'titDarbeKat'],
      ['c', 'Darbe', 'Tek ivme sıçraması ≥ (g) ' + UT, 's', 'titSpikeG']] },
    { t: 'Titreşim: Kış hareketsizliği', kk: ['titKis'], src: 'Bencsik M. ve ark. (2024). Sci. Rep., doi:10.1038/s41598-024-54107-8 (kışın titreşim sıfıra yakın → koloni kaybı)', not: '«Koloni sönmüş olabilir» ile tek uyarı; yalnız titreşimse kullanıcıya «Koloni ölümü şüphesi». Tüm eşikler uzman tahmini.', r: [
      ['w', 'Dönem', 'Başlangıç ayı ' + UT, 's', 'titKisAyBas'],
      ['w', 'Dönem', 'Bitiş ayı ' + UT, 's', 'titKisAySon'],
      ['w', 'Taban', 'Kendi taban (gün) ' + UT, 's', 'titKisTabanGun'],
      ['w', 'Süre', 'Kesintisiz (saat) ' + UT, 's', 'titKisSaat'],
      ['c', 'Düşüş', 'Tabanın bu oranının altı ' + UT, 's', 'titKisOran']] },
    { t: 'IR (giriş sayacı)', kk: ['irOgul','irYagma','irTrafik'], src: 'Oğul: Struye 1994, Apidologie 25:384, doi:10.1051/apido:19940405 (destekleyici) · değerler uzman tahmini', not: 'Giriş/çıkış ayrı sayan sayaç gerekir; yoksa «Veri yok».', r: [
      ['a', 'Oğul', 'Net çıkış en az (arı) ' + UT, 's', 'irOgulNetCikis'],
      ['a', 'Pencere', 'Süre (dk) ' + UT, 's', 'irOgulDk'],
      ['c', 'Yağma', 'Giriş/çıkış oranı en az ' + UT, 's', 'irYagmaOran'],
      ['c', 'Süre', 'Gündüz kesintisiz (dk) ' + UT, 's', 'irYagmaDk'],
      ['w', 'Trafik', '7 gün aynı saat ortalamasının oranından az ' + UT, 's', 'irTrafikOran'],
      ['w', 'Süre', 'Üst üste gün ' + UT, 's', 'irTrafikGun'],
      ['i', 'Skor', 'Oğul skoru: tabandan artış oranı', 's', 'irSapmaOran']] },
    { t: 'Pil', kk: ['pil'], src: 'Kaynak yok · bütün pil değerleri uzman tahmini (cihaz üreticisine bağlı)', not: 'Aynı değerler Cihazlar → Pil düşüklüğü kartında (tek kaynak). Sıklık yalnız kullanıcı «Onayla» deyince değişir.', r: PIL() },
    /* koloni-247: oğul riski — «Yer darlığı olabilir (bal katı verilmemiş)»: kaynak yok, uzman tahmini (aç/kapa) */
    /* koloni-258: ana memesi yeri «Bilinmiyor» — skoru artırmaz, yalnız «yerine bakın» notu (uzman tahmini, aç/kapa) */
    /* k262: ana arı yaşı — oğul puanı, ırk başına değişim yaşı ve 3. yaş riski (tek kaynak ogul_skor_ayar.sensor) */
    { t: 'Ana arı yaşı ve değişim', src: 'Değişim yaşı: T.C. Tarım ve Orman Bak., Arıcılık Araştırma Enstitüsü (2022) «Ana Arı» kitapçığı — «ana arıların iki yılda bir değiştirilmesi gereklidir (Güler, 2017)» (genel öneri, ırka özgü değil) · Anadolu: Akyol E., Yeninar H., Korkmaz A., Çakmak İ. (2008) Ital. J. Anim. Sci. 7:19–25, doi:10.4081/ijas.2008.19 (0/1/2/3 yaş: kışlama %84/88/47/27, yaşama %100/100/60/40) · Kostarelou-Damianidou ve ark. (1995) J. Apic. Res., doi:10.1080/00218839.1995.11100880 (2–3 yılda değişim yeterli) · Oğul puanı yönü: Simpson 1957, J. Agric. Sci. 49:387, doi:10.1017/s0021859600038375; Simpson 1960, J. Agric. Sci. 54:195, doi:10.1017/S002185960002236X · Puanlar ve Anadolu dışı 3. yaş riskleri uzman tahmini (Yapılacaklar).', not: 'Yaş tek başına uyarıyı en çok «orta» yapar. Yüksek yalnız son yavru muayenesinde belirti varsa: erkek yumurtası / kambur yavru, dağınık yavru, sessiz değiştirme memesi, anasızlık. 3. yaş metni: «Ana 3 yaşında: değişim zamanı geçti — ilkbahar–yaz başında değiştirmeyi planlayın.»', r: [
      ['i', 'Oğul puanı', 'Ana yaşı puanı: bu yılın anası (0–100) ' + UT, 's', 'anaYasPuan0'],
      ['i', 'Oğul puanı', 'Ana yaşı puanı: 1 yaş (0–100) ' + UT, 's', 'anaYasPuan1'],
      ['w', 'Oğul puanı', 'Ana yaşı puanı: 2 yaş ve üstü (0–100) ' + UT, 's', 'anaYasPuan2'],
      ['ok', 'Kafkas', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKafkas'],
      ['w', 'Kafkas', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Kafkas'],
      ['ok', 'Anadolu', 'Değişim yaşı (yıl) · Akyol 2008 + AAE 2022', 's', 'anaDegAnadolu'],
      ['w', 'Anadolu', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) · Akyol 2008 (3 yaşta yaşama %40)', 's', 'anaRisk3Anadolu'],
      ['ok', 'Kafkas × Karadeniz', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKafkasKaradeniz'],
      ['w', 'Kafkas × Karadeniz', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3KafkasKaradeniz'],
      ['ok', 'Karadeniz', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKaradeniz'],
      ['w', 'Karadeniz', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Karadeniz'],
      ['ok', 'Kafkas × Karniyol', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKafkasKarniyol'],
      ['w', 'Kafkas × Karniyol', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3KafkasKarniyol'],
      ['ok', 'Karniyol × Muğla', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKarniyolMugla'],
      ['w', 'Karniyol × Muğla', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3KarniyolMugla'],
      ['ok', 'Karniyol', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegKarniyol'],
      ['w', 'Karniyol', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Karniyol'],
      ['ok', 'İtalyan', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegItalyan'],
      ['w', 'İtalyan', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Italyan'],
      ['ok', 'Buckfast', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegBuckfast'],
      ['w', 'Buckfast', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Buckfast'],
      ['ok', 'Diğer / bilinmeyen', 'Değişim yaşı (yıl) · AAE 2022 (genel)', 's', 'anaDegVarsayilan'],
      ['w', 'Diğer / bilinmeyen', '3. yaş riski / rengi (1 düşük-yeşil · 2 orta-sarı · 3 yüksek-kırmızı · 4 çok yüksek-kırmızı) ' + UT + '', 's', 'anaRisk3Varsayilan']] },
    { t: 'Oğul: Ana memesi yeri bilinmiyor (tahmin)', kk: ['ogulMemeYerBilinmiyor'], src: 'Kaynak yok · uzman tahmini (Yapılacaklar: kaynak aranacak). Yer anlamları: Winston 1987; Fell & Morse 1984.', not: 'Uzman tahmini. Muayenede meme var ama yeri «Bilinmiyor» → oğul skoru 100\'e çıkmaz (yalnız alt kenar oğul memesi çıkarır); kullanıcıya «Ana memesi var, yeri bilinmiyor — alt kenardaysa oğul hazırlığıdır, yerine bakın» notu. Kapatılırsa not gösterilmez. Sayısal eşik yok; yalnız aç/kapa.', r: [] },
    { t: 'Oğul: Yer darlığı olabilir (tahmin)', kk: ['ogulYerTahmin'], src: 'Kaynak yok · uzman tahmini (Yapılacaklar: kaynak aranacak)', not: 'Uzman tahmini. Güçlü / Çok güçlü / Bölünmesi Gerekiyor koloni + bal katı verilmemiş + muayenede arılı çerçeve sayısı yok → kullanıcıya «Yer darlığı olabilir (bal katı verilmemiş)». Oğul skorunu değiştirmez. Sayısal eşik yok; yalnız aç/kapa (genel, kullanıcı, arılık). Kat at / Boş çerçeve önerileri güçlü koloni için bu nedenden bağımsız çıkar.', r: [] },
  ];
  function PIL() { return [['w', 'Düşük pil', 'Bu yüzde ve altı (%)', 'e', 'uyari.dusukPilYuzde'], ['w', 'Orta', 'Kalan gün ≤ ' + UT, 's', 'batOrtaGun'], ['c', 'Yüksek', 'Kalan gün ≤ ' + UT, 's', 'batYuksekGun'],
    ['w', 'Gateway orta', 'Gateway pili kalan gün ≤ ' + UT, 's', 'gwOrtaGun'], ['c', 'Gateway yüksek', 'Gateway pili kalan gün ≤ ' + UT, 's', 'gwYuksekGun'],
    ['i', 'Sıklık önerisi', 'Tarih yoksa kalan gün < ' + UT, 's', 'batErkenGun'], ['i', 'Hedef', 'Ayrılış yoksa bal sezonu sonu + gün ' + UT, 's', 'batSezonArtiGun'],
    ['i', 'Görev', '«Pili değiştir» tahmini bitişten gün önce ' + UT, 's', 'batGorevOnceGun'], ['i', 'Şarj', 'Şarj sayılan artış (puan) ' + UT, 's', 'batSarjArtis'],
    ['w', 'Pil bitmiş olabilir', 'Sessiz cihazda son okuma ≤ % ' + UT, 's', 'batBittiPct'],
    ['i', 'Taban tüketim', 'Ölçümden bağımsız pay (0–1) ' + UT, 's', 'batTabanOran'], ['i', 'İlk hesap', 'Gün ' + UT, 's', 'batIlkGun'], ['i', 'İlk hesap', 'En az düşüş (puan) ' + UT, 's', 'batIlkDusus']]; }
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
      ['c', 'Arızalı', 'İki okuma arası sıçrama (°C) ' + UT, 's', 'arizaSicramaC']], son: 'Liste' },
    /* koloni-241: sensör geçmişi saklama (tek kaynak ogul_skor_ayar.sensor; telefon sensor-ham.js okur) */
    { t: 'Sensör geçmişi (saklama)', src: 'Kaynak yok · süreler uzman tahmini', not: 'Ham okumalar telefonda IndexedDB’de tutulur; buluta gönderilmemiş okuma silinmez (en çok +60 gün). Ham okumaların hepsi sıkıştırılıp sunucuya (sensor-ham kovası, arılık/gün paketleri) gönderilir ve orada süresiz saklanır — yazılım geliştirme için. Günlük özetler (kovan × gün) sunucuda da süresiz; yeni telefonda geri okunur. Uzun taban isteyen kurallar (titreşim oğul 17 gece, kış 14 gün, IR aktivite 14 gün, dönmeyen tarlacı 10 gün, tarlacı kaybı 9 gün) ham olmayan günlerde özetleri okur; geçmiş kısayken kovan sayfasında «Taban oluşuyor (x/17 gece)» yazar. Arşiv boyutu: Sensör arşivi bölümü.', r: [
      ['i', 'Telefon', 'Ham okuma saklama (gün) ' + UT, 's', 'hamSaklaGun'],
      ['i', 'Kurallar', 'Kuralların baktığı ham pencere (gün) ' + UT, 's', 'hiveSensGun'],
      ['i', 'Telefon', 'Günlük özet saklama (gün) ' + UT, 's', 'ozetSaklaGun'],
      ['i', 'Sunucu', 'Ham arşiv ve günlük özetler: süresiz', null, '']], son: 'Arşiv' }
  ];
  var css = document.createElement('style');
  css.textContent = '.mk .mc{border:1px solid #ead9b3;border-radius:14px;padding:.6rem;margin-top:.6rem;background:#fff}.mk h3{margin:0 0 .3rem;font-size:1rem}' +
    '.mk .rw{display:grid;grid-template-columns:5.2rem 1fr 4.2rem;gap:.15rem .4rem;align-items:center;padding:.3rem 0;border-top:1px solid #f1e6cc;font-size:.82rem;min-height:2.6rem}' +
    '.mk .rw input,.mk .rw output{width:4rem;height:2rem;box-sizing:border-box;font-size:16px;padding:.2rem;border:1px solid #ead9b3;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center}.mk .rw output{background:#f6f1e6}' +
    '.mk .rw input.chg{border-color:#c48a00;background:#fff8e7}.mk .rw small{grid-column:2/4;color:#9a8f7a;font-size:.7rem;margin-top:-.2rem}' +
    '.mk .tr{font-weight:700;font-size:.72rem;padding:.15rem .3rem;border-radius:8px;text-align:center}.mk .ok{background:#e3f5e7;color:#2f9e44}.mk .w{background:#fff3d6;color:#a86b00}.mk .c{background:#ffe1d6;color:#c2410c}.mk .a{background:#d92d20;color:#fff}.mk .i{background:#eef1f5;color:#4b5563}' +
    '.mk-ut{display:inline-block;background:#fde7f0;color:#b4235b;border-radius:6px;font-size:.62rem;padding:0 .25rem;font-weight:700;white-space:nowrap}.mk-ky{display:inline-block;background:#e3f4e8;color:#1f7a3d;border-radius:6px;font-size:.62rem;padding:0 .25rem;font-weight:700;white-space:nowrap}.mk .m{font-size:.76rem;margin:.35rem 0 0;color:#4b5563}.mk-vy{margin:.35rem 0 0;font-weight:700;color:#6b7280;font-size:.82rem}' +
    '.mk .kk{display:grid;grid-template-columns:1fr 5.6rem;align-items:center;gap:.4rem;min-height:2.4rem;border-top:1px solid #f1e6cc;font-size:.82rem}.mk .kk label{display:flex;align-items:center;gap:.35rem;justify-content:flex-end;height:2rem;font-weight:700}.mk .kk input{width:1.3rem;height:1.3rem;margin:0}.mk .kk .off{color:#c2410c}.mk .kk.chg{background:#fff8e7}.mk .kks{display:flex;gap:.4rem;flex-wrap:wrap;min-height:2.4rem;align-items:center}.mk .kkb{display:flex;gap:.3rem;justify-content:flex-end}.mk .kkb .btn,.mk .kks .btn{min-height:2rem;font-size:.78rem;padding:.2rem .5rem}.mk .kkg{grid-template-columns:1fr 7.4rem}.mk .kks select{font-size:16px;height:2.2rem;max-width:100%}' +
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
  /* koloni-220: toplu aç/kapa — grup ve tümü, seçili kapsam için */
  var KG = [['Sıcaklık', ['kulucka', 'kuluckaAcil', 'kirec']], ['Nem', ['nem']], ['Ağırlık', ['agirlik']], ['Ses', ['sesOgulAni', 'sesPiping', 'sesQuack', 'sesAnasiz', 'sesIsciOtme', 'sesOgulEgilim', 'sesSaglik', 'sesVarroa', 'sesOgulOnce', 'sesOtmeSira', 'sesRahatsiz', 'sesEsekArisi']], ['Titreşim', ['titresim', 'titOgul', 'titOtme', 'titDarbe', 'titKis']], ['IR', ['irOgul', 'irYagma', 'irTrafik', 'irIlac', 'irDonmeyen', 'irDusukAktivite', 'irSayac', 'irOgulCikti']], ['Cihazlar', ['pil', 'cihazSessiz', 'cihazKopuk', 'cihazAriza']], ['Uçuş', ['ucus']], ['Koloni durumu', ['koloniSonuk', 'yavrusuzSicak', 'tarlaciKayip', 'esekGiris', 'havalandirma']], ['Oğul riski', ['ogulYerTahmin', 'ogulMemeYerBilinmiyor']]];
  function kkTum() { return KG.reduce(function (a, g) { return a.concat(g[1]); }, []); }
  function kkGrpRow(i) { var g = KG[i], L = kkList(), ac = g[1].filter(function (x) { return L.indexOf(x) < 0; }).length; return '<div class="kk kkg" data-kkg="' + i + '"><span><b>' + esc(g[0]) + '</b> <small class="' + (ac < g[1].length ? 'off' : '') + '">' + ac + '/' + g[1].length + ' açık</small></span><span class="kkb"><button type="button" class="btn" data-kkga="' + i + '|1">Aç</button><button type="button" class="btn" data-kkga="' + i + '|0">Kapat</button></span></div>'; }
  function kkTop() { return '<div class="kks"><button type="button" class="btn" data-kkall="1">Tümünü aç</button><button type="button" class="btn" data-kkall="0">Tümünü kapat</button></div>' + KG.map(function (_, i) { return kkGrpRow(i); }).join(''); }
  function kkRefresh(ids) { [].forEach.call(host.querySelectorAll('.mk [data-kkr]'), function (r) { var id = r.getAttribute('data-kkr'); r.outerHTML = kkRow(id); }); if (ids) ids.forEach(function (id) { [].forEach.call(host.querySelectorAll('.mk [data-kkr="' + id + '"]'), function (r) { r.classList.add('chg'); }); }); [].forEach.call(host.querySelectorAll('.mk [data-kkg]'), function (r) { r.outerHTML = kkGrpRow(+r.getAttribute('data-kkg')); }); }
  function kkAdi() { if (KSEC === 'g') return 'Tüm kullanıcılar (genel)'; var p = KSEC.split('|'), k = p.slice(1).join('|'), L = p[0] === 'u' ? EPOS : ARIL; for (var i = 0; i < L.length; i++) if (kkAn(L[i]) === k) return (p[0] === 'u' ? 'Kullanıcı: ' : 'Arılık: ') + L[i]; return (p[0] === 'u' ? 'Kullanıcı: ' : 'Arılık: ') + k; }
  function kkSecH() { var o = '<option value="g">Tüm kullanıcılar (genel)</option>' + EPOS.map(function (e) { return '<option value="u|' + esc(kkAn(e)) + '">Kullanıcı: ' + esc(e) + '</option>'; }).join('') + ARIL.map(function (a) { return '<option value="a|' + esc(kkAn(a)) + '">Arılık: ' + esc(a) + '</option>'; }).join(''); return '<div class="mc"><h3>Kural aç/kapa</h3><div class="kks"><select data-kksec>' + o + '</select></div><p class="m" style="min-height:1.2em">Seçili kapsam: <b data-kkad>' + esc(kkAdi()) + '</b></p><p class="m">Kapalı kural uyarı, rozet, bildirim ve kart üretmez; eşikler silinmez, açınca aynı değerlerle çalışır. Etkin = genel açık ve seçili kullanıcı için kapalı değil ve o arılık için kapalı değil. Aşağıdaki anahtarlar seçili kapsam için.</p>' + kkTop() + '</div>'; }
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
  /* koloni-242: okuma sıklığı kartında kural çözünürlüğü kontrolü (kaydedilmiş + ekrandaki değerlerle) */
  function czH() {
    var M = window.SuperAriPilModel; if (!M || !M.kuralGerek || !M.okumaMs) return '';
    var th = Object.assign({}, C.ORS_SENSOR || {}, SEN || {});
    var L = [['titresim', null, 'Titreşim'], ['ir', null, 'Giriş sayacı'], ['tarti', null, 'Tartı'], ['gateway', null, 'Gateway']], o = [];
    L.forEach(function (x) {
      var g = M.kuralGerek(x[0], th, x[1]); if (!g) return;
      var ms = M.okumaMs(x[0], th, x[1]); if (!ms) return;
      g.kurallar.forEach(function (k) { var ok = ms <= k.ms; o.push('<li class="' + (ok ? 'cz-ok' : 'cz-no') + '">' + (ok ? '✓ ' : '✗ ') + esc(x[2]) + ' ' + Math.round(ms / 60000) + ' dk → ' + esc(k.kural) + ': en çok ' + Math.round(k.ms / 60000) + ' dk (' + esc(k.neden) + ')</li>'); });
    });
    o.push('<li class="cz-ok">✓ Ses / titreşim olayları (piping, tıslama, dur sinyali, ana ötmesi, darbe): olay anında, aralıktan bağımsız</li>');
    return '<div class="cz" data-cz><p class="m"><b>Kural çözünürlüğü</b></p><ul class="m" style="margin:.2rem 0 .4rem;padding-left:1.1rem">' + o.join('') + '</ul></div>';
  }
  function cardH(c) {
    return '<div class="mc"><h3>' + esc(c.t) + '</h3>' + (c.kk || []).map(kkRow).join('') + c.r.map(rowH).join('') + (c.vy ? VY : '') + (c.cz ? czH() : '') + (c.not ? '<p class="m">' + lbl(esc(c.not)) + '</p>' : '') +
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
    if (t.hasAttribute('data-kksec')) { KSEC = t.value; [].forEach.call(host.querySelectorAll('.mk [data-kkad]'), function (b) { b.textContent = kkAdi(); }); [].forEach.call(host.querySelectorAll('.mk [data-kkr]'), function (r) { r.outerHTML = kkRow(r.getAttribute('data-kkr')); }); kkRefresh(); return; }
    var id = t.getAttribute('data-kk'); if (!id) return; kkSet(id, !t.checked);
    [].forEach.call(host.querySelectorAll('.mk [data-kkr="' + id + '"]'), function (r) { r.outerHTML = kkRow(id); });
    [].forEach.call(host.querySelectorAll('.mk [data-kkr="' + id + '"]'), function (r) { r.classList.add('chg'); });
    [].forEach.call(host.querySelectorAll('.mk [data-kkg]'), function (r) { r.outerHTML = kkGrpRow(+r.getAttribute('data-kkg')); });
  });
  host.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.mk [data-kkall],.mk [data-kkga]'); if (!b) return; e.preventDefault();
    var ids, ac, ad;
    if (b.hasAttribute('data-kkall')) { ids = kkTum(); ac = b.getAttribute('data-kkall') === '1'; ad = 'Tüm ' + ids.length + ' kural'; }
    else { var p = b.getAttribute('data-kkga').split('|'), g = KG[+p[0]]; ids = g[1]; ac = p[1] === '1'; ad = g[0] + ' (' + ids.length + ' kural)'; }
    if (!ac && !confirm(ad + ' «' + kkAdi() + '» için kapatılsın mı?\nKapalı kural uyarı, bildirim ve görev üretmez. Kalıcı olması için sonra Kaydet… gerekir.')) return;
    var y = window.scrollY; ids.forEach(function (id) { kkSet(id, !ac); }); kkRefresh(ids); window.scrollTo(0, y);
    stat(ad + (ac ? ' açıldı' : ' kapatıldı') + ' (kaydedilmedi).');
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
