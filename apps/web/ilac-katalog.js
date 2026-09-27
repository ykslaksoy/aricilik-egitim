/**
 * SüperArı — Varroa ilaç kataloğu (yalnız ETİKET bilgisi).
 *
 * Kaynak: T.C. Tarım ve Orman Bakanlığı «Ruhsatlı Veteriner İlaçları» sorgusu (hedef tür: Arı),
 * https://hbs.tarbil.gov.tr/Receipt/SearchProduct — 27.09.2026 tarihinde sorgulandı.
 * Dozlar, ilgili ürünün Bakanlık veri tabanındaki «Ürün Özellikleri Özeti» (ÜÖÖ/KÜB) PDF'inden aynen alınmıştır.
 * ÜÖÖ bulunamayan ruhsatlı ürünlerde ve Bakanlık listesinde arı için ruhsatlı ürünü bulunamayan etken maddelerde
 * doz HESAPLANMAZ («doz doğrulanmadı»). Arayüz her zaman «Etiket dozunu kontrol edin» der.
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
      durationDays: [28, 42], preFlowDays: 42, withdrawal: 'tedaviBoyunca',
      withdrawalText: 'Tedavi süresince elde edilen bal insan tüketimine sunulmaz. Bal tutumuna 6 hafta kala ve bal tutumu süresince uygulanmaz.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '92f8a415-0cc6-495f-b9dc-891faa3a7b35&dosyaAdi=%20beeraz-27-06-2019.pdf', verified: true
    },
    {
      id: 'bayvarol', name: 'Bayvarol', holder: 'Elanco', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit.' },
      durationDays: [28, 42], preFlowDays: 30, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez (0 gün). Şeritler hasat edilecek bala temas etmemeli; tedaviden sonraki ilkbahara kadar baldan başka arı ürünü insan tüketimine sunulmaz.',
      season: 'En iyi sonuç bal hasadından sonra (geç sonbahar); ayrıca bal akımından 1–1,5 ay önce (erken ilkbahar).',
      source: PDF + '9b75cf2d-8663-4bd2-9673-c3685535ac76&dosyaAdi=%20Bayvarol-uoo-16-07-2021.pdf', verified: true
    },
    {
      id: 'beevarflu', name: 'Beevarflu', holder: 'Albafarma', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit.' },
      durationDays: [28, 42], preFlowDays: 28, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '580dee84-dfae-4eac-b042-77d63f318783&dosyaAdi=%20Beevarflu.pdf', verified: true
    },
    {
      id: 'varodur', name: 'Varodur', holder: 'Ekofarma', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 1, max: 8, qty: 2 }, { min: 9, max: 40, qty: 4 }],
        note: 'Etiket: 7–8 dolu çerçeveli genç/küçük koloni 2 şerit; büyük koloni 4 şerit (etiketin başka yerinde genç koloni 1–2, güçlü koloni 2–4 şerit).' },
      durationDays: [28, 42], preFlowDays: 28, withdrawal: 'sifir',
      withdrawalText: 'Bal için arınma süresi gerekmez. Tedaviden sonra ilkbahara kadar bal dışındaki arı ürünleri (balmumu dahil) insan tüketimine sunulmaz.',
      season: 'Bal hasadından sonra (geç sonbahar) ve bal akımından 4–6 hafta önce (erken ilkbahar).',
      source: PDF + '42175718-1037-404c-bdea-d95ee4c5122a&dosyaAdi=%20Varodur%20.pdf', verified: true
    },
    {
      id: 'fumbee', name: 'Fumbee', holder: 'Teknovet', active: 'Flumetrin 3,6 mg / şerit', group: 'piretroid', form: 'Kovan içi şerit',
      dose: { type: 'frames', unit: 'serit', bands: [{ min: 4, max: 5, qty: 2 }, { min: 6, max: 40, qty: 4, text: '3–4' }],
        note: 'Etiket: zayıf/oğul koloni (4–5 çerçeve) 2 şerit; normal ve güçlü koloni (6+ çerçeve) 3–4 şerit. 4 çerçeveden az koloni için etikette doz yok.' },
      durationDays: [42, 42], preFlowDays: 42, withdrawal: 'sifir',
      withdrawalText: 'Bal akımı ve polen toplama süresince kullanılmaz. Tedaviden ilkbahara kadar insan tüketimi için bal ve diğer arı ürünleri üretilmez.',
      season: 'Bal akımı dışında; 6 hafta kovanda kalır, sonra mutlaka çıkarılır.',
      source: PDF + 'fd4058a6-815f-4d96-99db-91ce24c007e0&dosyaAdi=%20Fumbee.pdf', verified: true
    },
    {
      id: 'polyvar', name: 'PolyVar Yellow 275 mg', holder: 'Elanco', active: 'Flumetrin 275 mg / şerit', group: 'piretroid', form: 'Kovan girişi şeridi',
      dose: { type: 'fixed', unit: 'serit', qty: 2, note: 'Etiket: standart kovan için 2 şerit, kovan girişine geçit olarak takılır.' },
      durationDays: [63, 120], preFlowDays: null, withdrawal: 'sifir',
      withdrawalText: 'Bal için 0 gün. Bal akımı ve polen toplama süresince kullanılmaz; tedaviden ilkbahara kadar insan tüketimi için bal ve diğer arı ürünleri üretilmez.',
      season: 'Bal akımı ve bal süzümünden kısa süre sonra başlanır; en az 9 hafta, en çok 4 ay.',
      source: PDF + '57ed032d-da25-4421-b63b-662a008269dc&dosyaAdi=%20Polyvar%20Yellov.pdf', verified: true
    },
    {
      id: 'checkmite', name: 'Checkmite', holder: 'Elanco', active: 'Koumafos 1,36 g / şerit', group: 'organofosfat', form: 'Kovan içi şerit',
      dose: { type: 'fixed', unit: 'serit', qty: 2, note: 'Etiket: her kovan için 2 şerit, 42 gün; 42 günü aşmayın. Yılda en çok 2 kez.' },
      durationDays: [42, 42], preFlowDays: 42, withdrawal: 'sifir', maxPerYear: 2,
      withdrawalText: 'Bal için 0 gün; bal hasadı döneminde uygulanmaz (hasattan en az 42 gün önce veya hasattan sonra). Koumafos balmumunda birikebilir: tedavi gören kovanın mumu insan tüketimine sunulmaz.',
      season: 'Bal hasadı başlamadan en az 42 gün önce veya hasattan sonra.',
      source: PDF + '2adb422f-a88d-4a2b-bc67-11a543cec0fb&dosyaAdi=%20Checkmite.pdf', verified: true
    },
    /* Ruhsatlı görünen fakat Bakanlık veri tabanında ÜÖÖ belgesi bulunmayan ürünler */
    { id: 'rulamit', name: 'Rulamit', holder: 'Teknovet', active: 'Amitraz', group: 'amitraz', form: 'Kovan içi şerit', dose: null, verified: false, source: DB,
      reason: 'Bakanlık listesinde ruhsatlı; ürün özellikleri belgesi bulunamadı.' },
    { id: 'rulamitva', name: 'Rulamit-Va', holder: 'Teknovet', active: 'Amitraz', group: 'amitraz', form: 'Kovan içi şerit', dose: null, verified: false, source: DB,
      reason: 'Bakanlık listesinde ruhsatlı; ürün özellikleri belgesi bulunamadı.' },
    { id: 'vamitratva', name: 'Vamitrat-Va', holder: 'Teknovet', active: 'Amitraz', group: 'amitraz', form: 'Kovan içi şerit', dose: null, verified: false, source: DB,
      reason: 'Bakanlık listesinde ruhsatlı; ürün özellikleri belgesi bulunamadı.' },
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
    if (!p.dose) return { ok: false, reason: 'Doz doğrulanmadı — ' + (p.reason || 'etiket bilgisi yok') };
    if (p.dose.type === 'fixed') return { ok: true, qty: p.dose.qty, text: String(p.dose.qty), unit: p.dose.unit };
    var n = Math.round(Number(beeFrames));
    if (!isFinite(n) || n <= 0) return { ok: false, reason: 'Arılı çerçeve sayısı girilmemiş; önce muayene kaydı girin.' };
    var b = p.dose.bands.filter(function (x) { return n >= x.min && n <= x.max; })[0];
    if (!b) return { ok: false, reason: n + ' arılı çerçeve için etikette doz yok — veteriner hekime danışın.' };
    return { ok: true, qty: b.qty, text: b.text || String(b.qty), unit: p.dose.unit };
  }
  /** Tedavi kaydında yazan metinden ürün/grup tahmini (rotasyon uyarısı için). */
  function detect(text) {
    var t = String(text || '').toLocaleLowerCase('tr');
    if (!t) return null;
    var hit = null;
    LIST.forEach(function (p) { if (!hit && t.indexOf(p.name.toLocaleLowerCase('tr').split(' ')[0]) >= 0) hit = p; });
    if (hit) return { id: hit.id, group: hit.group };
    if (/amitraz/.test(t)) return { id: null, group: 'amitraz' };
    if (/flumet|fluvalin|piretro/.test(t)) return { id: null, group: 'piretroid' };
    if (/koumafos|kumafos|coumaphos/.test(t)) return { id: null, group: 'organofosfat' };
    if (/oksalik|okzalik|oxalic|formik|formic/.test(t)) return { id: null, group: 'organikAsit' };
    if (/timol|thymol/.test(t)) return { id: null, group: 'esansiyel' };
    return null;
  }

  global.SuperAriIlac = { LIST: LIST, byId: function (id) { return BY_ID[id] || null; }, GROUPS: GROUPS, doseFor: doseFor, detect: detect,
    SOURCE_DB: DB, CHECKED: CHECKED, WARNING: 'Etiket dozunu kontrol edin. Uygulama yalnız hesap yardımcısıdır; kararı prospektüs ve veteriner hekiminiz belirler.' };
})(window);
