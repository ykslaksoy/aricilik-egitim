/* SüperArı · Sabit kritik kartlar + ekip bildirimleri (koloni-168 EK11 ek 2/3, EK12) → window.SuperAriKritik
 * Kritik ses alarmları (oğul anı, Ana Arılar Ötmesi (Piping), Vakvaklama (Quacking)) ve ALARM_ARILIK_KOSUL_01 ana uyarı panelinin en üstünde sabit.
 * Yalnız "Tamam" ile kapanır; kapatan kişi + saat kartta/geçmişte. Süre, kaydırma ya da koşulun düzelmesi kapatmaz
 * (düzelirse metin "Durum düzeldi"). Kart eklenip kalkınca ekran kaymaz. Metinlerde Hz yok.
 * EK12: listedeki uyarıların İLK oluşumu ve "[Kişi] kontrol etti, kapattı" olayı tüm ekibe (Supabase ekip_bildirim).
 * Liste yönetici panelinde (ogul_skor_ayar.data.ekipBildirim). ORS Orta: yalnız Düşük→Orta ilk geçiş, kovan başına günde en çok bir. */
(function (global) {
  'use strict';
  var KEY = 'superari.kritik.v1', GECMIS = 'superari.uyari.gecmis.v1', ORSK = 'superari.ors.orta.v1', GIDEN = 'superari.ekip.bildirim.kuyruk.v1';
  var SABIT = { kulucka_acil: 0, ogul_ani: 0, piping: 1, quacking: 2, ALARM_ARILIK_KOSUL_01: 3, cihaz_dd: 4 /* k222: ekipten cihaz devre dışı / tekrar etkin */ };
  var AD = {
    kulucka_acil: ['ACİL: Kuluçka çok soğudu', 'Kuluçka bölümü uzun süredir çok soğuk. Kireç hastalığı riski var. Kovanı hemen kontrol et, gerekirse daralt ve havalandırmayı ayarla.'],
    ogul_ani: ['Oğul Anı Sesi (Swarming)', 'Kovanda Oğul Anı Sesi (Swarming) algılandı. Hemen kovanı kontrol et.'],
    piping: ['Ana Arılar Ötmesi (Piping)', 'Çıkmış Ana Ötmesi (Tooting) ve Vakvaklama (Quacking) birlikte duyuldu. Art oğul çok yakın, kovanı hemen kontrol et.'],
    quacking: ['Vakvaklama (Quacking)', 'Yüksükte bakire ana sesi algılandı. İkinci oğul riski, kovanı kontrol et.'],
    ALARM_ARILIK_KOSUL_01: ['Arılık koşulları değişti', 'Bu arılığın koşulları değişti. Kontrol et.'],
    ogul_yuksugu: ['Muayenede oğul yüksüğü', 'Muayenede oğul yüksüğü görüldü. Oğul önlemini planla.'],
    ogul_cikmis: ['Oğul çıkmış olabilir', 'Kovandan oğul çıkmış olabilir. Kovanı kontrol et.'],
    ors_70: ['Oğul riski yüksek', 'Oğul riski yüksek. Kovanı kontrol et.'],
    isci_otme_artis: ['İşçi Arı Ötmesi (Worker Piping) arttı', 'İşçi Arı Ötmesi (Worker Piping) birden arttı. Oğul kalkışa hazırlanıyor olabilir, kontrol et.'],
    onerilen_risk: ['Önerilen arılıkta risk arttı', 'Önerdiğimiz arılıkta risk arttı. Kontrol et.'],
    batarya_7: ['Batarya azalıyor', 'Batarya bir hafta içinde bitebilir. Değiştirmeyi planla.'],
    ani_kayip: ['Ani ağırlık kaybı', 'Kovan birden ağırlık kaybetti. Yağma ya da hırsızlık olabilir, kontrol et.'],
    cihaz_dd: ['Cihaz durumu değişti', 'Ekipten biri bir cihazı devre dışı bıraktı ya da tekrar etkinleştirdi.'],
    ors_orta: ['Oğul riski orta', 'Oğul riski orta seviyeye çıktı. İzlemeye al.']
  };
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function gun(t) { var x = new Date(t || Date.now()); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function saat(iso) { try { return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(iso); } }
  function ekipListesi() { var d = global.SuperAriDemo, s = null; try { s = d.colony.ogulSkor(); } catch (e) { s = null; } return (s && Array.isArray(s.ekipBildirim)) ? s.ekipBildirim : Object.keys(AD); }
  function ekibeGider(kod) { return ekipListesi().indexOf(kod) >= 0; }
  function kim() {
    var s = null; try { s = JSON.parse(global.localStorage.getItem('superari.oturum.v1') || 'null'); } catch (e) { s = null; }
    return (s && (s.ad || s.email || (s.user && s.user.email))) || 'Bu cihaz';
  }
  function gecmis() { return rj(GECMIS, []); }
  function gecmiseYaz(o) { var G = gecmis(); G.unshift(o); if (G.length > 500) G = G.slice(0, 500); wj(GECMIS, G); }
  function degisti() { try { global.dispatchEvent(new Event('superari-kritik')); } catch (e) { /* */ } }
  /** Ekip bildirimi: kuyruğa yaz + bulut (ekip_bildirim, RLS: üye yazar/okur). Dönüş: gönderilecek kayıt ya da null. */
  function ekibeBildir(olay, v) {
    if (v.kod === 'cihaz_dd') return null;
    if (!ekibeGider(v.kod)) return null;
    var b = { kod: v.kod, olay: olay, apiary_id: v.apiaryId || null, hive_ref: v.hiveId == null ? null : String(v.hiveId), baslik: v.baslik,
      metin: olay === 'kapatildi' ? (v.kapandi.kim + ' kontrol etti, kapattı') : v.metin, kim_ad: olay === 'kapatildi' ? v.kapandi.kim : kim(), at: new Date().toISOString() };
    var Q = rj(GIDEN, []); Q.push(b); wj(GIDEN, Q.slice(-200)); gonder(); return b;
  }
  function gonder() {
    var B = global.SuperAriBulut, Q = rj(GIDEN, []); if (!Q.length || !B || !B.client || !B.session) return;
    B.session().then(function (s) { if (!s) return; return B.client().then(function (c) {
      var ok = Q.filter(function (x) { return /^[0-9a-f-]{36}$/.test(String(x.apiary_id || '')); });
      if (!ok.length) { wj(GIDEN, []); return; }
      return c.from('ekip_bildirim').insert(ok.map(function (x) { return { apiary_id: x.apiary_id, kod: x.kod, olay: x.olay, baslik: x.baslik, metin: x.metin, hive_ref: x.hive_ref, kim_ad: x.kim_ad }; }))
        .then(function (r) { if (!r.error) wj(GIDEN, []); });
    }); }).catch(function () { /* sonra */ });
  }
  /** Uyarı aç (aynı anahtarla açık varsa tekrar üretmez; ilk oluşum listede ise ekibe gider). o: { kod, anahtar?, hiveId?, apiaryId?, metin?, aksiyon?, onay? } */
  function ac(o) {
    var kod = o.kod || o.tip; if (!AD[kod] && !o.baslik) return null;
    var L = rj(KEY, []), k = kod + '|' + (o.anahtar || o.hiveId || o.apiaryId || ''), v = null;
    L.forEach(function (x) { if (x.key === k && !x.kapandi) v = x; });
    if (v) { if (v.iyilesti) { v.iyilesti = false; v.metin = o.metin || AD[kod][1]; wj(KEY, L); degisti(); } return v; }
    v = { id: 'kr' + Date.now() + Math.floor(Math.random() * 1000), key: k, kod: kod, tip: kod, sabit: SABIT[kod] != null, hiveId: o.hiveId == null ? null : o.hiveId, apiaryId: o.apiaryId || null,
      baslik: o.baslik || AD[kod][0], metin: o.metin || AD[kod][1], aksiyon: o.aksiyon || '', onay: o.onay || null, nedenler: o.nedenler || null, at: new Date().toISOString(), iyilesti: false, kapandi: null };
    L.push(v); wj(KEY, L);
    var eb = o.ekibeGitme ? null : ekibeBildir('olustu', v); /* k222: ekipten gelen bildirim geri yayınlanmaz */
    gecmiseYaz({ olay: 'acildi', id: v.id, kod: kod, baslik: v.baslik, metin: v.metin, hiveId: v.hiveId, apiaryId: v.apiaryId, at: v.at, ekibe: !!eb }); degisti(); return v;
  }
  function iyilesti(kod, anahtar) {
    var L = rj(KEY, []), k = kod + '|' + anahtar, d = false;
    L.forEach(function (x) { if (x.key === k && !x.kapandi && !x.iyilesti) { x.iyilesti = true; x.metin = 'Durum düzeldi. Kontrol ettiysen Tamam\'a bas.'; d = true; } });
    if (d) { wj(KEY, L); degisti(); } return d;
  }
  /** Tek kapatma yolu. Kapatan + saat kayda geçer; listede ise ekibe "[Kişi] kontrol etti, kapattı". */
  function tamam(id, onaylayan) {
    var L = rj(KEY, []), v = null; L.forEach(function (x) { if (x.id === id && !x.kapandi) v = x; });
    if (!v) return null; v.kapandi = { kim: onaylayan || kim(), at: new Date().toISOString() }; wj(KEY, L);
    var eb = ekibeBildir('kapatildi', v);
    gecmiseYaz({ olay: 'tamam', id: v.id, kod: v.kod, baslik: v.baslik, iyilesti: v.iyilesti, kim: v.kapandi.kim, at: v.kapandi.at, hiveId: v.hiveId, apiaryId: v.apiaryId, ekibe: !!eb }); degisti(); return v;
  }
  function kapatanMetni(v) { return v && v.kapandi ? 'Kapatan: ' + v.kapandi.kim + ', ' + saat(v.kapandi.at) : ''; }
  /** Ses kuralı sonucu → kritik kartlar. so: sensorOrs çıktısı ({ piping, quack, ogulAni, isciOtme }) */
  function sesten(hiveId, so, apiaryId) {
    if (!so) return; var h = String(hiveId);
    [['ogul_ani', so.ogulAni], ['piping', !!(so.quack && so.quackYuksek)], ['quacking', false], ['isci_otme_artis', so.isciOtme]] /* k174: sabit kritik kart yalnız Tooting+Quacking birlikte; tek başına Tooting/Quacking alt seviye uyarı */.forEach(function (p) {
      if (p[1]) ac({ kod: p[0], anahtar: h, hiveId: hiveId, apiaryId: apiaryId }); else iyilesti(p[0], h);
    });
  }
  /** ORS seviye değişimi: ≥70 → ors_70; Düşük→Orta ilk geçiş → ors_orta (kovan başına günde en çok bir). */
  function orsDegisim(hiveId, eski, yeni, puan, apiaryId) {
    if (puan != null && puan >= 70) ac({ kod: 'ors_70', anahtar: String(hiveId), hiveId: hiveId, apiaryId: apiaryId });
    if (eski === 'dusuk' && yeni === 'orta') {
      var M = rj(ORSK, {}), g = gun(); if (M[hiveId] === g) return null; M[hiveId] = g; wj(ORSK, M);
      return ac({ kod: 'ors_orta', anahtar: hiveId + '|' + g, hiveId: hiveId, apiaryId: apiaryId });
    }
    return null;
  }
  /** Ani ağırlık kaybı: okumalar [{t, kg}] — son aniKayipSaat içinde en yüksekten aniKayipKg ve üstü düşüş (uzman tahmini; panelde). */
  function aniKayip(okumalar, th) {
    var d = global.SuperAriDemo, T = th || (d && d.colony && d.colony.ORS_SENSOR) || {}, kg = T.aniKayipKg || 3, sa = T.aniKayipSaat || 6;
    var L = (okumalar || []).filter(function (x) { return x && isFinite(x.kg) && isFinite(x.t); }).sort(function (a, b) { return a.t - b.t; });
    if (L.length < 2) return null; var son = L[L.length - 1], pen = L.filter(function (x) { return son.t - x.t <= sa * 3600000; });
    var mx = Math.max.apply(null, pen.map(function (x) { return x.kg; })); return mx - son.kg >= kg;
  }
  /** EK12: ORS seviye izleme (önceki seviye cihazda) */
  var ORSS = 'superari.ors.seviye.v1';
  function orsGozle(hiveId, key, puan, apiaryId) { var M = rj(ORSS, {}), e = M[hiveId] || null; M[hiveId] = key; wj(ORSS, M); if (puan != null && puan < 70) iyilesti('ors_70', String(hiveId)); return orsDegisim(hiveId, e, key, puan, apiaryId); }
  function liste() { return rj(KEY, []).filter(function (x) { return !x.kapandi && x.sabit; }).sort(function (a, b) { return (SABIT[a.kod] - SABIT[b.kod]) || (a.at < b.at ? 1 : -1); }); }
  function tumu() { return rj(KEY, []); }
  /* k253: kapsam — tek arılık seçiliyken başka arılığın kartı gösterilmez (Tümü'nde hepsi). Arılığı olmayan kart her kapsamda görünür. */
  function kapsam() { try { var s = global.localStorage.getItem('superari.bakim.scope'); return s && s !== 'all' ? String(s) : null; } catch (e) { return null; } }
  function gorunur(x, sc) { sc = sc === undefined ? kapsam() : sc; return !sc || x.apiaryId == null || x.apiaryId === '' || String(x.apiaryId) === sc; }
  /* k253: mevsim kapalı arılıkta eski ALARM_ARILIK_KOSUL_01 kartları (artış durdu → taşınma önerisi, «Besleme planla») olağan durumdu:
     öneri ve besleme eylemi kaldırılır; geriye eylem kalmazsa kart «Sistem (mevsim dışı)» kaydıyla kapanır. */
  function mevsimTemizle() {
    var C = global.SuperAriDemo && global.SuperAriDemo.colony; if (!C || !C.ucusSezon) return 0;
    var L = rj(KEY, []), n = 0, simdi = new Date().toISOString();
    L.forEach(function (x) {
      if (x.kod !== 'ALARM_ARILIK_KOSUL_01' || x.kapandi || !x.apiaryId) return;
      var s = null; try { s = C.ucusSezon(x.apiaryId); } catch (e) { s = null; } if (!s || s.acik) return;
      var ch = false;
      if (x.onay && x.onay.tip === 'tasinma') { x.onay = null; ch = true; }
      var ak = String(x.aksiyon || '').replace(/\s*Besleme planla\.\s*/g, ' ').trim(); if (ak !== (x.aksiyon || '')) { x.aksiyon = ak; ch = true; }
      if (x.nedenler) x.nedenler = x.nedenler.filter(function (k) { return k !== 'flora'; });
      if (ch && !x.aksiyon) { x.kapandi = { kim: 'Sistem (mevsim dışı)', at: simdi }; gecmiseYaz({ olay: 'tamam', id: x.id, kod: x.kod, baslik: x.baslik, kim: x.kapandi.kim, at: simdi, apiaryId: x.apiaryId, ekibe: false }); }
      if (ch) n++;
    });
    if (n) wj(KEY, L); return n;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Sabit kartları çiz; altındaki içerik yer değiştirmesin diye kaydırma telafisi. */
  function ciz(el) {
    if (!el) return; var d = global.document, se = d.scrollingElement || d.documentElement, h0 = el.offsetHeight, kayik = se.scrollTop > 0;
    var sc = kapsam();
    el.innerHTML = liste().filter(function (x) { return gorunur(x, sc); }).map(function (x) {
      if (x.kod === 'ALARM_ARILIK_KOSUL_01' && !x.iyilesti) return kosulKart(x);
      var kr = SABIT[x.kod] < 3;
      return '<div class="kr-kart" role="alert" data-kr="' + esc(x.id) + '" style="border:2px solid ' + (x.iyilesti ? '#3c8d4a' : (kr ? '#c0392b' : '#d68910')) + ';background:' + (x.iyilesti ? '#eef8ef' : (kr ? '#fdecea' : '#fef5e7')) + ';border-radius:12px;padding:10px 12px;margin:0 0 8px;">' +
        '<div style="font-weight:800;">' + esc(x.baslik) + (x.hiveId != null ? ' · Kovan ' + esc(x.hiveId) : '') + '</div><div style="margin:4px 0;">' + esc(x.metin) + '</div>' +
        (x.aksiyon ? '<div style="font-weight:700;">' + esc(x.aksiyon) + '</div>' : '') +
        (x.onay ? '<div style="margin:6px 0;">' + esc(x.onay.soru) + ' <button type="button" class="btn secondary" data-kr-onay="' + esc(x.id) + '">Onayla</button></div>' : '') +
        '<button type="button" class="btn" data-kr-tamam="' + esc(x.id) + '" style="margin-top:4px;">Tamam</button></div>';
    }).join('');
    var dh = el.offsetHeight - h0; if (dh && kayik) global.scrollBy(0, dh);
  }
  /* koloni-254: Arılık koşulu kartı — başlıkta arılık adı, her neden tek cümle (sorun + yapılacak), taşınma önerisi tek satır; düğmeler «Taşınmayı planla» (öneri varsa) + «Kapat» */
  var KOSUL_CUMLE = { su: 'Su kaynağı uzak. Arılığa sulak koy.', flora: 'Çevrede çiçek akımı bitti. Beslemeyi planla.', alan: 'Toplama alanında ilaçlama var. Kovan girişlerini kapat.' };
  function apAd(id) { try { var a = (global.SuperAriDemo.loadApiaries() || []).filter(function (z) { return String(z.id) === String(id); })[0]; return a ? a.name : ''; } catch (e) { return ''; } }
  function kosulKart(x) {
    var N = x.nedenler && x.nedenler.length ? x.nedenler : [];
    if (!N.length) { var ak = String(x.aksiyon || ''); if (/Sulak/.test(ak)) N.push('su'); if (/Besleme/.test(ak)) N.push('flora'); if (/girişlerini/.test(ak)) N.push('alan'); }
    var ad = apAd(x.apiaryId), h = x.onay && x.onay.hedef, hedef = h ? (h.ad || ((h.ilce || '') + (h.il ? ' (' + h.il + ')' : ''))) : '';
    return '<div class="kr-kart kr-kosul" role="alert" data-kr="' + esc(x.id) + '" style="border:2px solid #d68910;background:#fef5e7;border-radius:12px;padding:10px 12px;margin:0 0 8px;">' +
      '<div style="font-weight:800;">' + esc(ad ? ad + ': koşul değişti' : x.baslik) + '</div>' +
      '<ul style="margin:4px 0 0;padding-left:18px;">' + N.map(function (k) { return '<li style="margin:2px 0;">' + esc(KOSUL_CUMLE[k] || '') + '</li>'; }).join('') + '</ul>' +
      (hedef ? '<div style="margin:6px 0 0;">Öneri: <b>' + esc(hedef) + '</b> — taşımadan önce yeri kontrol et.</div>' : '') +
      '<div style="display:grid;grid-template-columns:' + (hedef ? '1fr 1fr' : '1fr') + ';gap:8px;margin-top:8px;">' +
      (hedef ? '<button type="button" class="btn secondary" data-kr-onay="' + esc(x.id) + '">Taşınmayı planla</button>' : '') +
      '<button type="button" class="btn" data-kr-tamam="' + esc(x.id) + '">Kapat</button></div></div>';
  }
  function bagla(el) {
    if (!el || el.__kr) return; el.__kr = 1; try { mevsimTemizle(); } catch (e0) { /* */ } ciz(el); gonder();
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-kr-tamam]'); if (t) { tamam(t.getAttribute('data-kr-tamam')); return; }
      var o = e.target.closest('[data-kr-onay]'); if (o) { var v = tumu().filter(function (x) { return x.id === o.getAttribute('data-kr-onay'); })[0]; try { global.dispatchEvent(new CustomEvent('superari-tasinma-onay', { detail: v })); } catch (er) { /* */ } }
    });
    global.addEventListener('superari-kritik', function () { ciz(el); });
    global.addEventListener('superari-kapsam', function () { ciz(el); }); /* k253: arılık değişince yerinde süz */
    global.addEventListener('storage', function (e) { if (e.key === KEY) ciz(el); });
  }
  global.SuperAriKritik = { ac: ac, iyilesti: iyilesti, tamam: tamam, liste: liste, tumu: tumu, gecmis: gecmis, sesten: sesten, orsDegisim: orsDegisim, orsGozle: orsGozle, gecmisEkle: gecmiseYaz, aniKayip: aniKayip,
    kapatanMetni: kapatanMetni, ekibeGider: ekibeGider, ekipListesi: ekipListesi, ciz: ciz, bagla: bagla, gorunur: gorunur, mevsimTemizle: mevsimTemizle, AD: AD, SABIT: SABIT, _kuyruk: function () { return rj(GIDEN, []); } };
})(typeof window !== 'undefined' ? window : globalThis);
