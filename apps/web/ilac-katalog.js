/**
 * SüperArı — Varroa ilaç kataloğu (yalnız ETİKET bilgisi).
 *
 * Kaynak: T.C. Tarım ve Orman Bakanlığı «Ruhsatlı Veteriner İlaçları» sorgusu (hedef tür: Arı),
 * https://hbs.tarbil.gov.tr/Receipt/SearchProduct — 27.09.2026 tarihinde sorgulandı.
 * Dozlar, ilgili ürünün Bakanlık veri tabanındaki «Ürün Özellikleri Özeti» (ÜÖÖ/KÜB) PDF'inden aynen alınmıştır.
 * ÜÖÖ bulunamayan ruhsatlı ürünlerde ve Bakanlık listesinde arı için ruhsatlı ürünü bulunamayan etken maddelerde
 * doz HESAPLANMAZ («doz doğrulanmadı»). Arayüz her zaman «Etiket dozunu kontrol edin» der.
 * İstisnalar (Bakanlık ÜÖÖ yok, etiket üretici Teknovet sayfasından aynen): Rulamit şerit dozu (dose); Rulamit-VA ve Vamitrat-VA
 * tütsü ürünleri «label» alanında, yalnız gösterim (şerit hesabı yok).
 */
(function (global) {
  'use strict';
  var DB = 'https://hbs.tarbil.gov.tr/Receipt/SearchProduct';
  var PDF = 'https://hbs.tarbil.gov.tr/Receipt/DownloadPdfFromDatabase?urunId=';
  var CHECKED = '2026-09-27';

  /* Rotasyon için etken madde grupları (aynı gruptan arka arkaya kullanım direnç riskidir). */
  var GROUPS = {
    amitraz: { label: 'Amitraz (formamidin)' },
    piretroid: { label: 'Piretroit (flumetrin / tau-fluvalinat)' },
    organofosfat: { label: 'Organofosfat (koumafos)' },
    organikAsit: { label: 'Organik asit (oksalik / formik)' },
    esansiyel: { label: 'Esansiyel yağ (timol)' }
  };

  /*
   * dose.type:
   *  'frames' → bands: [{ min, max, qty, text? }] arılı çerçeve sayısına göre şerit (etikette yazan aralıklar)
   *  'fixed'  → qty: kovan başına sabit
   *  null     → doz doğrulanmadı (hesaplanmaz)
   * preFlowDays: bal akımı / hasat başlangıcından en az kaç gün önce bitmiş olmalı (etikette varsa)
   * withdrawal: 'sifir' | 'tedaviBoyunca' | null (bilinmiyor) — bal için ilaç kalıntı arınma süresi (İKAS)
   */
  var LIST = [
    {
      id: 'beeraz', name: 'Beeraz', holder: 'Albafarma', active: 'Amitraz 500 mg / şerit', group: 'amitraz', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 5, qty: 1 }, { min: 6, max: 10, qty: 2 }],
        note: 'Etiket: 1–5 çerçeve 1 şerit, 6–10 çerçeve 2 şerit. Zayıf kolonide şerit ikiye kesilebilir; önce birkaç kovanda deneyin.' },
      placement: { byQty: { 1: '2. ile 3. çerçeve arasına', 2: '1. şerit 2.–3., 2. şerit 5.–6. çerçeve arasına' }, how: 'Şeritler çerçevelerin orta hizasında, iki çerçevenin arasında, iki yandaki arılara değecek ve birbirinden ayrı duracak şekilde, ortadaki delikten çubuk geçirilerek asılır; kovanın her tarafına eşit, arıların yoğun olduğu kısma (ÜÖÖ 4.9).' },
      durationDays: [28, 42], preFlowDays: 42, withdrawal: 'tedaviBoyunca',
      withdrawalText: 'Tedavi süresince elde edilen bal insan tüketimine sunulmaz. Bal tutumuna 6 hafta kala ve bal tutumu süresince uygulanmaz.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '92f8a415-0cc6-495f-b9dc-891faa3a7b35&dosyaAdi=%20beeraz-27-06-2019.pdf', verified: true
    },
    {
      id: 'bayvarol', name: 'Bayvarol', holder: 'Elanco', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit.' },
      placement: { how: 'Kuluçka yuvasının ortasına, iki yanında arılar yürüyebilecek şekilde petek aralarına asılır; kanatçıklar katlama çizgisinden bükülüp çerçeve üst kenarına tutturulur (ÜÖÖ).' },
      durationDays: [28, 42], preFlowDays: 30, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez (0 gün). Şeritler hasat edilecek bala temas etmemeli; tedaviden sonraki ilkbahara kadar baldan başka arı ürünü insan tüketimine sunulmaz.',
      season: 'En iyi sonuç bal hasadından sonra (geç sonbahar); ayrıca bal akımından 1–1,5 ay önce (erken ilkbahar).',
      source: PDF + '9b75cf2d-8663-4bd2-9673-c3685535ac76&dosyaAdi=%20Bayvarol-uoo-16-07-2021.pdf', verified: true
    },
    {
      id: 'beevarflu', name: 'Beevarflu', holder: 'Albafarma', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit.' },
      placement: { how: 'Şeritler çerçevelerin orta hizasında, iki çerçevenin arasında, iki yandaki arılara değecek ve birbirinden ayrı duracak şekilde, ortadaki delikten çubuk geçirilerek asılır; kovanın her tarafına eşit, arıların yoğun olduğu kısma (ÜÖÖ 4.9).' },
      durationDays: [28, 42], preFlowDays: 28, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '580dee84-dfae-4eac-b042-77d63f318783&dosyaAdi=%20Beevarflu.pdf', verified: true
    },
    {
      id: 'varodur', name: 'Varodur', holder: 'Ekofarma', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit (etiketin başka yerinde genç koloni 1–2, güçlü koloni 2–4 şerit).' },
      placement: { how: 'Şeritler çerçevelerin orta hizasında, iki çerçevenin arasında, iki yandaki arılara değecek ve birbirinden ayrı duracak şekilde, ortadaki delikten çubuk geçirilerek asılır; kovanın her tarafına eşit, arıların yoğun olduğu kısma (ÜÖÖ 4.9).' },
      durationDays: [28, 42], preFlowDays: 28, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez. Tedaviden sonra ilkbahara kadar bal dışındaki arı ürünleri (balmumu dahil) insan tüketimine sunulmaz.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '42175718-1037-404c-bdea-d95ee4c5122a&dosyaAdi=%20Varodur%20.pdf', verified: true
    },
    {
      id: 'fumbee', name: 'Fumbee', holder: 'Teknovet', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 4, max: 5, qty: 2 }, { min: 6, max: 40, qty: 4, text: '3–4' }],
        note: 'Etiket: zayıf/oğul koloni (4–5 çerçeve) 2 şerit; normal ve güçlü koloni (6+ çerçeve) 3–4 şerit. 4 çerçeveden az koloni için etikette doz yok.' },
      placement: { how: 'Şeritler çerçevelerin orta hizasında, iki çerçevenin arasında, iki yandaki arılara değecek ve birbirinden ayrı duracak şekilde, ortadaki delikten çubuk geçirilerek asılır; kovanın her tarafına eşit, arıların yoğun olduğu kısma (ÜÖÖ 4.9).' },
      durationDays: [42, 42], preFlowDays: 42, withdrawal: 'sifir',
      withdrawalText: 'Bal akımı ve polen toplama süresince kullanılmaz. Tedaviden ilkbahara kadar insan tüketimi için bal ve diğer arı ürünleri üretilmez.',
      season: 'Bal akımı dışında; 6 hafta kovanda kalır, sonra mutlaka çıkarılır.',
      source: PDF + 'fd4058a6-815f-4d96-99db-91ce24c007e0&dosyaAdi=%20Fumbee.pdf', verified: true
    },
    {
      id: 'polyvar', name: 'PolyVar Yellow 275 mg', holder: 'Elanco', active: 'Flumetrin 275 mg / şerit', group: 'piretroid', form: 'Kovan girişi şeridi',
      dose: { type: 'fixed', unit: 'serit', qty: 2, note: 'Etiket: standart kovan için 2 şerit, kovan girişine geçit olarak takılır.' },
      placement: { how: 'Kovan girişine takılır: arılar yalnız şerit deliklerinden girip çıkar; şerit kesilmez, delikler kapatılmaz (ÜÖÖ 4.9).' },
      durationDays: [63, 120], preFlowDays: null, withdrawal: 'sifir',
      withdrawalText: 'Bal için 0 gün. Bal akımı ve polen toplama süresince kullanılmaz; tedaviden ilkbahara kadar insan tüketimi için bal ve diğer arı ürünleri üretilmez.',
      season: 'Bal akımı ve bal süzümünden kısa süre sonra başlanır; en az 9 hafta, en çok 4 ay.',
      source: PDF + '57ed032d-da25-4421-b63b-662a008269dc&dosyaAdi=%20Polyvar%20Yellov.pdf', verified: true
    },
    {
      id: 'checkmite', name: 'Checkmite', holder: 'Elanco', active: 'Koumafos 1,36 g / şerit', group: 'organofosfat', form: 'Kovan içi şerit',
      dose: { type: 'fixed', unit: 'serit', qty: 2, note: 'Etiket: her kovan için 2 şerit, 42 gün; 42 günü aşmayın. Yılda en çok 2 kez.' },
      placement: { how: 'Kuluçka (arı üretim) bölgesindeki iki petek arasına asılır; 42 gün kalır, aşılmaz; şerit bir kez kullanılır (ÜÖÖ 4.9).' },
      durationDays: [42, 42], preFlowDays: 42, withdrawal: 'sifir', maxPerYear: 2,
      withdrawalText: 'Bal için 0 gün; bal hasadı döneminde uygulanmaz (hasattan en az 42 gün önce veya hasattan sonra). Koumafos balmumunda birikebilir: tedavi gören kovanın mumu insan tüketimine sunulmaz.',
      season: 'Bal hasadı başlamadan en az 42 gün önce veya hasattan sonra.',
      source: PDF + '2adb422f-a88d-4a2b-bc67-11a543cec0fb&dosyaAdi=%20Checkmite.pdf', verified: true
    },
    /* Ruhsatlı tütsü ürünü: Bakanlık ÜÖÖ yok; etiket bilgisi üretici sayfasından AYNEN (Teknovet). Şerit değildir →
       dose: null (şerit hesabına, öneriye ve alım tahminine girmez); label yalnız gösterim içindir. rulamit'ten ÖNCE durur (detect «Rulamit-VA» metnini buna eşler). */
    { id: 'rulamitva', name: 'Rulamit-VA', holder: 'Teknovet', active: 'Amitraz 265 mg / karton plaka', group: 'amitraz', form: 'Tütsü (körükte yakılan karton plaka, 20×10 cm)',
      dose: null, verified: false, source: 'https://teknovet.com.tr/tr/urunler/antiparazitler/rulamit-va', labelSource: 'Teknovet ürün sayfası (üretici etiketi)',
      label: { kind: 'tutsu', puffsPerHive: 7, puffsLog: '3–4', hivesPerMinute: 10, repeats: 3, repeatsHigh: 4, intervalDays: 3,
        text: 'Boş körük içinde bir karton plaka bir ucundan yakılır; her kovanın uçuş deliğinden 7 doz duman darbe halinde basılır, hızla diğer kovana geçilir (yaklaşık bir dakikada 10 kovan). Uçuş deliğini kapatmaya gerek yoktur. Kütük veya sepet kovanda 3–4 duman darbesi yeterlidir. İlaçlama 3 gün ara ile 3 kez; Varroa yoğunluğu çok yüksekse 3 gün ara ile 4 kez.',
        pack: 'Karton kutuda 3 alüminyum folyo poşet; her poşette 1 rulo karton plaka (20×10 cm, 265 mg amitraz).' },
      durationDays: [6, 9], /* etiketten: 3 gün ara ile 3 uygulama = 6 gün, 4 uygulama = 9 gün */
      withdrawal: null, withdrawalDays: 30, withdrawalText: 'Son ilaç uygulamasından 30 gün sonrasına kadar elde edilen ballar kullanılmaz.',
      season: 'Kışın sıcaklığın 14 °C’den yüksek olduğu iyi havalarda (yavru yokken akarlar ergin arıdadır) etkilidir. Yazın bal hasadından önce Haziran–Eylül aylarında uygulanmaz.',
      reason: 'Tütsü ürünü (körükte yakılan karton plaka): şerit dozu hesaplanmaz; etiket: kovan başına 7 duman darbesi, 3 gün ara ile 3 kez.' },
    /* Vamitrat-VA: kovan içinde YAKILAN karton şerit (tütsü) — temas şeridi değildir. Etiket Teknovet sayfasından AYNEN; dose: null → şerit hesabına girmez. */
    { id: 'vamitratva', name: 'Vamitrat-VA', holder: 'Teknovet', active: 'Amitraz 20 mg / şerit', group: 'amitraz', form: 'Tütsü (kovan içinde yakılan karton şerit)',
      dose: null, verified: false, source: 'https://teknovet.com.tr/tr/urunler/antiparazitler/vamitrat-va', labelSource: 'Teknovet ürün sayfası (üretici etiketi)',
      label: { kind: 'tutsu', perHive: 1, repeats: 3, repeatsHigh: 4, intervalDays: 3,
        text: 'Bir kovanda yalnız bir şerit yakılır: karton şerit boş bir petek çerçevesine tel ile asılır, yakılır ve duman çıkarken hemen kovan içine yerleştirilir; bu sırada uçuş deliği açık tutulur. İlaçlama 3 gün ara ile 3 kez; Varroa oranı yüksekse 3 gün ara ile 4 kez.',
        pack: 'Karton kutuda 3 alüminyum folyo poşet; her poşette 10 kovan içi şerit (20 mg amitraz).' },
      durationDays: [6, 9], /* etiketten: 3 gün ara ile 3 uygulama = 6 gün, 4 uygulama = 9 gün */
      withdrawal: null, withdrawalDays: 30, withdrawalText: 'Son ilaç uygulamasından 30 gün sonrasına kadar elde edilen ballar kullanılmaz.',
      season: 'Etikette uygulama dönemi belirtilmemiş.',
      reason: 'Tütsü ürünü (kovan içinde yakılan karton şerit): şerit dozu hesaplanmaz; etiket: kovan başına 1 şerit yakılır, 3 gün ara ile 3 kez.' },
    /* Rulamit: Bakanlık ÜÖÖ yok; doz üretici Teknovet sayfasındaki etiketten AYNEN (kovan başına 2 şerit, 10 çerçeve arılı kovan). */
    {
      id: 'rulamit', name: 'Rulamit', holder: 'Teknovet', active: 'Amitraz 500 mg / şerit', group: 'amitraz', form: 'Kovan içi şerit (3×20 cm plastik)',
      dose: { type: 'fixed', unit: 'serit', qty: 2,
        note: 'Etiket: kovan başına 2 şerit (10 çerçeve arılı her kovan için 2 × 500 mg = 1000 mg amitraz); şeritler iki çerçevenin arasına, ortada ve arıların her iki tarafa da serbestçe erişebileceği şekilde asılır (Langstroth: 3.–4. ve 6.–7. çerçeve arası; Dadant: 3.–4. ve 7.–8.; Layens: 5.–6. ve 9.–10.). Yavru yoksa 6 hafta, yavru varsa 10 hafta sonra çıkarılır.' },
      placement: { how: 'İki çerçevenin arasına, ortada, arıların iki yandan erişebileceği şekilde asılır — Langstroth: 3.–4. ve 6.–7. çerçeve arası; Dadant: 3.–4. ve 7.–8.; Layens: 5.–6. ve 9.–10. (üretici etiketi).' },
      durationDays: [42, 70], preFlowDays: 42, withdrawal: 'tedaviBoyunca',
      withdrawalText: 'Bal için 0 gün; bal (nektar) akımında kullanılmaz. Tedavi süresince elde edilen bal insan tüketimine sunulmaz; bal tutumuna 6 hafta kala ve bal tutumu süresince uygulanmaz. Kuluçkalıktaki bal kullanılmaz; tedavi sırasında bal hasat edilmez.',
      season: 'Ballık (kat) yokken: son bal hasadından sonra (yaz sonu / sonbahar) ve ilkbaharda bal akımı başlamadan önce; kuluçka pik seviyenin altındayken ve arılar kış salkımı kurmadan önce.',
      pack: 'Karton kutuda 1 ya da 5 alüminyum folyo poşet; her poşette 3×20 cm 10 kovan içi şerit.',
      source: 'https://www.teknovet.com.tr/tr/urunler/antiparazitler/rulamit', labelSource: 'Teknovet ürün sayfası (üretici etiketi)', verified: true
    },
    /* Ruhsatlı görünen fakat Bakanlık veri tabanında ÜÖÖ belgesi bulunmayan ürünler */
    { id: 'varroset', name: 'Varroset', holder: 'Albafarma', active: 'Amitraz', group: 'amitraz', form: 'Tütsü kâğıdı', dose: null, verified: false, source: DB,
      reason: 'Bakanlık listesinde ruhsatlı; ürün özellikleri belgesi bulunamadı.' },
    /* Bakanlık «Ruhsatlı Veteriner İlaçları» listesinde hedef türü Arı olan ürünü BULUNAMAYAN etken maddeler */
    { id: 'oksalik', name: 'Oksalik asit ürünleri', active: 'Oksalik asit', group: 'organikAsit', form: 'Damlatma / buharlaştırma', dose: null, verified: false, notInList: true, source: DB,
      reason: 'Bakanlık ruhsatlı veteriner ilaçları listesinde arı için oksalik asit ürünü bulunamadı. Doz hesaplanmaz; veteriner hekime danışın.' },
    { id: 'formik', name: 'Formik asit ürünleri', active: 'Formik asit', group: 'organikAsit', form: 'Buharlaştırma / şerit', dose: null, verified: false, notInList: true, source: DB,
      reason: 'Etken madde listede var; hedef türü Arı olan ruhsatlı ürün bulunamadı. Doz hesaplanmaz.' },
    { id: 'timol', name: 'Timol ürünleri', active: 'Timol', group: 'esansiyel', form: 'Jel / tablet', dose: null, verified: false, notInList: true, source: DB,
      reason: 'Etken madde listede var; hedef türü Arı olan ruhsatlı ürün bulunamadı. Doz hesaplanmaz.' },
    { id: 'taufluvalinat', name: 'Tau-fluvalinat ürünleri', active: 'Tau-fluvalinat', group: 'piretroid', form: 'Şerit', dose: null, verified: false, notInList: true, source: DB,
      reason: 'Etken madde listede var; hedef türü Arı olan ruhsatlı ürün bulunamadı. Doz hesaplanmaz.' }
  ];
  var BY_ID = {}; LIST.forEach(function (p) { BY_ID[p.id] = p; });

  /** Etiket kuralına göre kovan başına miktar. { ok, qty, text, unit, reason } */
  function doseFor(id, beeFrames) {
    var p = BY_ID[id];
    if (!p) return { ok: false, reason: 'Ürün bulunamadı' };
    if (!p.dose) return { ok: false, reason: (p.label ? 'Şerit dozu yok — ' : 'Doz doğrulanmadı — ') + (p.reason || 'etiket bilgisi yok') };
    if (p.dose.type === 'fixed') return { ok: true, qty: p.dose.qty, text: String(p.dose.qty), unit: p.dose.unit };
    var n = Math.round(Number(beeFrames));
    if (!isFinite(n) || n <= 0) return { ok: false, reason: 'Arılı çerçeve sayısı girilmemiş; önce muayene kaydı girin.' };
    var b = p.dose.bands.filter(function (x) { return n >= x.min && n <= x.max; })[0];
    if (!b) return { ok: false, reason: n + ' arılı çerçeve için etikette doz yok — veteriner hekime danışın.' };
    return { ok: true, qty: b.qty, text: b.text || String(b.qty), unit: p.dose.unit };
  }
  /** Etiketteki yerleşim metni (ÜÖÖ 4.9 / üretici etiketi). qty: etiket dozu (çerçeve aralığı bilgisi varsa). */
  function placementFor(id, qty) {
    var p = BY_ID[id]; if (!p || !p.placement) return '';
    var w = p.placement.byQty && qty != null ? p.placement.byQty[qty] : '';
    return (w ? w.charAt(0).toLocaleUpperCase('tr') + w.slice(1) + '. ' : '') + p.placement.how;
  }
  /** Tedavi kaydında yazan metinden ürün/grup tahmini (rotasyon uyarısı için). */
  function detect(text) {
    var t = String(text || '').toLocaleLowerCase('tr');
    if (!t) return null;
    var hit = /rulamit[\s-]*va/.test(t) ? BY_ID.rulamitva : (/vamitrat/.test(t) ? BY_ID.vamitratva : null);
    LIST.forEach(function (p) { if (!hit && t.indexOf(p.name.toLocaleLowerCase('tr').split(' ')[0]) >= 0) hit = p; });
    if (hit) return { id: hit.id, group: hit.group };
    if (/amitraz/.test(t)) return { id: null, group: 'amitraz' };
    if (/flumet|fluvalin|piretro/.test(t)) return { id: null, group: 'piretroid' };
    if (/koumafos|kumafos|coumaphos/.test(t)) return { id: null, group: 'organofosfat' };
    if (/oksalik|okzalik|oxalic|formik|formic/.test(t)) return { id: null, group: 'organikAsit' };
    if (/timol|thymol/.test(t)) return { id: null, group: 'esansiyel' };
    return null;
  }

  /* ---------------- Raf ömrü / açıldıktan sonra (koloni-79) ----------------
   * shelfYears: kapalı ambalaj raf ömrü (yıl); openedDays: açıldıktan sonra kullanım süresi (gün; 0 = hemen kullanılmalı; null = bilinmiyor).
   * Rulamit şerit: bilgi yok (null). Bu veriler yalnız bilgi notu içindir; doz HİÇBİR ZAMAN değiştirilmez / önerilmez. */
  var STORAGE = {
    beeraz: { shelfYears: 2, openedDays: 42 }, beevarflu: { shelfYears: 2, openedDays: 42 }, fumbee: { shelfYears: 2, openedDays: 42 }, varodur: { shelfYears: 2, openedDays: 42 },
    bayvarol: { shelfYears: 5, openedDays: 42 }, polyvar: { shelfYears: 3, openedDays: 0 }, checkmite: { shelfYears: 3, openedDays: 0 },
    rulamitva: { shelfYears: 2, openedDays: null, note: 'serin ve kuru yerde saklayın' }, vamitratva: { shelfYears: 2, openedDays: null, note: 'serin ve kuru yerde saklayın' },
    rulamit: null
  };
  function storage(id) { return Object.prototype.hasOwnProperty.call(STORAGE, id) ? STORAGE[id] : null; }
  function isoOk(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')); }
  function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function durTxt(d) { return d < 14 ? d + ' gün' : (d < 60 ? Math.floor(d / 7) + ' hafta' : Math.floor(d / 30) + ' ay'); }
  function unitTxt(u) { return u === 'serit' || !u ? 'şerit' : u; }
  function labelTxt(qty, unit) { return 'etiket dozu: ' + String(qty).replace('.', ',') + ' ' + unitTxt(unit) + '/kovan'; }
  function isAmitrazStrip(p) { return !!p && p.group === 'amitraz' && /şerit/i.test(p.form || '') && !/tütsü/i.test(p.form || ''); }
  /** Girilen kovan başı miktar ↔ etiket dozu (yalnız etiket; SKT/açılma eşiği DEĞİŞTİRMEZ).
   * level: 'none' (etiket yok / miktar yok) | 'ok' | 'note' (etiketten farklı, etiket+1 dahil) | 'warn' (≥ etiket+2 ya da >1,5× ve > etiket+1) */
  function doseCheck(entered, labelQty, unit) {
    var e = Number(String(entered == null ? '' : entered).replace(',', '.')), l = Number(labelQty);
    var out = { level: 'none', entered: e, label: l, text: '' };
    if (!(l > 0) || !(e > 0)) return out;
    if (Math.abs(e - l) < 1e-9) { out.level = 'ok'; return out; }
    if (e >= l + 2 - 1e-9 || (e > 1.5 * l && e > l + 1)) { out.level = 'warn'; out.text = 'Etiket dozunun çok üstünde: kalıntı ve arıya zarar riski. Etiket: ' + String(l).replace('.', ',') + ' ' + unitTxt(unit) + '/kovan'; return out; }
    out.level = 'note'; out.text = labelTxt(l, unit); return out;
  }
  /** Stok kalemi eski mi? SKT geçmiş ya da açıldıktan sonraki süre aşılmış → bilgi notu (doz önermez). item: { skt, opened } */
  function ageNote(pid, item, labelQty, unit, today) {
    if (!item) return '';
    var t = isoOk(today) ? today : todayIso(), p = pid ? BY_ID[pid] : null, sg = pid ? storage(pid) : null, parts = [];
    var sktOver = isoOk(item.skt) && item.skt < t ? dayDiff(item.skt, t) : 0;
    var opened = isoOk(item.opened) && item.opened <= t ? dayDiff(item.opened, t) : null;
    var openOver = sg && sg.openedDays != null && opened != null && opened > sg.openedDays;
    if (!sktOver && !openOver) return '';
    if (openOver) parts.push((sg.openedDays === 0 ? 'Açıldıktan sonra hemen kullanılmalı' : 'Açıldıktan sonra ' + durTxt(sg.openedDays) + ' önerilir') + ', ' + durTxt(opened) + ' geçmiş');
    if (sktOver) parts.push('SKT ' + durTxt(sktOver) + ' geçmiş');
    var dg = !p && item.name ? detect(item.name) : null;
    if (isAmitrazStrip(p) || (dg && dg.group === 'amitraz' && /şerit/i.test(item.name) && !/tütsü|yak/i.test(item.name))) parts.push('Araştırmaya göre (USDA 2024) eski şeritte etkinlik kaybı gözlenmedi', 'etiket dozu yeterli, fazla şerit gerekmez');
    else parts.push('bu konuda araştırma verisi yok, etkinlik garanti değil', 'yeni paket önerilir');
    if (Number(labelQty) > 0) parts.push(labelTxt(labelQty, unit));
    return parts.join(' · ');
  }
  /** Stok kalemi adından ürün (ör. «Beeraz şerit» → beeraz) */
  function productOfItem(item) { var d = item ? detect(item.name) : null; return d && d.id ? d.id : null; }
  /** Doz uyarısı onayı (eldivenle: iki büyük düğme). Promise<boolean> — true = «Yine de kaydet», false = «Düzelt». */
  function askHighDose(text, extra) {
    var doc = global.document;
    return new Promise(function (res) {
      if (!doc || !doc.body) { res(global.confirm ? global.confirm(text + '\n\nYine de kaydedilsin mi?') : false); return; }
      var ov = doc.createElement('div');
      ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Etiket dozu uyarısı'); ov.className = 'ilac-hd';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(20,12,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px;';
      ov.innerHTML = '<div style="background:#fff;border-radius:20px;max-width:520px;width:100%;padding:16px;display:grid;gap:12px;font-family:inherit;box-shadow:0 10px 40px rgba(0,0,0,.3);">' +
        '<div style="background:#fff0f0;border:3px solid #c92a2a;border-radius:14px;padding:12px;color:#8a1c1c;font-size:18px;font-weight:900;line-height:1.35;">⚠ <span data-t></span></div>' +
        (extra ? '<div data-x style="font-size:14px;font-weight:700;color:#5c4813;line-height:1.35;"></div>' : '') +
        '<button type="button" data-fix style="min-height:72px;border-radius:16px;border:0;background:#1c5fa8;color:#fff;font:inherit;font-size:22px;font-weight:900;cursor:pointer;">Düzelt</button>' +
        '<button type="button" data-yes style="min-height:64px;border-radius:16px;border:3px solid #c92a2a;background:#fff;color:#8a1c1c;font:inherit;font-size:20px;font-weight:900;cursor:pointer;">Yine de kaydet</button></div>';
      ov.querySelector('[data-t]').textContent = text;
      if (extra) ov.querySelector('[data-x]').textContent = extra;
      function done(v) { if (ov.parentNode) ov.parentNode.removeChild(ov); doc.removeEventListener('keydown', key, true); res(v); }
      function key(e) { if (e.key === 'Escape') { e.stopPropagation(); done(false); } }
      ov.addEventListener('click', function (e) { if (e.target.closest('[data-yes]')) done(true); else if (e.target.closest('[data-fix]') || e.target === ov) done(false); });
      doc.addEventListener('keydown', key, true);
      doc.body.appendChild(ov);
      var fb = ov.querySelector('[data-fix]'); if (fb) fb.focus();
    });
  }

  global.SuperAriIlac = { LIST: LIST, byId: function (id) { return BY_ID[id] || null; }, GROUPS: GROUPS, doseFor: doseFor, placementFor: placementFor, detect: detect,
    STORAGE: STORAGE, storage: storage, doseCheck: doseCheck, ageNote: ageNote, labelTxt: labelTxt, productOfItem: productOfItem, askHighDose: askHighDose, isAmitrazStrip: isAmitrazStrip,
    SOURCE_DB: DB, CHECKED: CHECKED, WARNING: 'Etiket dozunu kontrol edin. Uygulama yalnız hesap yardımcısıdır; kararı prospektüs ve veteriner hekiminiz belirler.' };
})(window);
