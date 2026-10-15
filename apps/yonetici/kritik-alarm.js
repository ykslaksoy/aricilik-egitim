/* SüperArı · Sabit kritik kartlar + ekip bildirimleri (koloni-168 EK11 ek 2/3, EK12) → window.SuperAriKritik
 * Kritik ses alarmları (oğul anı, ana arı ötmesi, vakvaklama) ve ALARM_ARILIK_KOSUL_01 ana uyarı panelinin en üstünde sabit.
 * Yalnız "Tamam" ile kapanır; kapatan kişi + saat kartta/geçmişte. Süre, kaydırma ya da koşulun düzelmesi kapatmaz
 * (düzelirse metin "Durum düzeldi"). Kart eklenip kalkınca ekran kaymaz. Metinlerde Hz yok.
 * EK12: listedeki uyarıların İLK oluşumu ve "[Kişi] kontrol etti, kapattı" olayı tüm ekibe (Supabase ekip_bildirim).
 * Liste yönetici panelinde (ogul_skor_ayar.data.ekipBildirim). ORS Orta: yalnız Düşük→Orta ilk geçiş, kovan başına günde en çok bir. */
(function (global) {
  'use strict';
  var KEY = 'superari.kritik.v1', GECMIS = 'superari.uyari.gecmis.v1', ORSK = 'superari.ors.orta.v1', GIDEN = 'superari.ekip.bildirim.kuyruk.v1';
  var SABIT = { ogul_ani: 0, piping: 1, quacking: 2, ALARM_ARILIK_KOSUL_01: 3 };
  var AD = {
    ogul_ani: ['Oğul anı', 'Kovanda oğul anı sesi algılandı. Hemen kovanı kontrol et.'],
    piping: ['Ana arı ötmesi', 'Ana arı ötmesi algılandı. Oğul hazırlığı olabilir, kovanı kontrol et.'],
    quacking: ['Vakvaklama', 'Yüksükte bakire ana sesi algılandı. İkinci oğul riski, kovanı kontrol et.'],
    ALARM_ARILIK_KOSUL_01: ['Arılık koşulları değişti', 'Bu arılığın koşulları değişti. Kontrol et.'],
    ogul_yuksugu: ['Muayenede oğul yüksüğü', 'Muayenede oğul yüksüğü görüldü. Oğul önlemini planla.'],
    ogul_cikmis: ['Oğul çıkmış olabilir', 'Kovandan oğul çıkmış olabilir. Kovanı kontrol et.'],
    ors_70: ['Oğul riski yüksek', 'Oğul riski yüksek. Kovanı kontrol et.'],
    isci_otme_artis: ['İşçi ötmesi arttı', 'İşçi ötmesi birden arttı. Oğul kalkışa hazırlanıyor olabilir, kontrol et.'],
    onerilen_risk: ['Önerilen arılıkta risk arttı', 'Önerdiğimiz arılıkta risk arttı. Kontrol et.'],
    batarya_7: ['Batarya azalıyor', 'Batarya bir hafta içinde bitebilir. Değiştirmeyi planla.'],
    ani_kayip: ['Ani ağırlık kaybı', 'Kovan birden ağırlık kaybetti. Yağma ya da hırsızlık olabilir, kontrol et.'],
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
      baslik: o.baslik || AD[kod][0], metin: o.metin || AD[kod][1], aksiyon: o.aksiyon || '', onay: o.onay || null, at: new Date().toISOString(), iyilesti: false, kapandi: null };
    L.push(v); wj(KEY, L);
    var eb = ekibeBildir('olustu', v);
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
    [['ogul_ani', so.ogulAni], ['piping', so.piping], ['quacking', so.quack], ['isci_otme_artis', so.isciOtme]].forEach(function (p) {
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
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Sabit kartları çiz; altındaki içerik yer değiştirmesin diye kaydırma telafisi. */
  function ciz(el) {
    if (!el) return; var d = global.document, se = d.scrollingElement || d.documentElement, h0 = el.offsetHeight, kayik = se.scrollTop > 0;
    el.innerHTML = liste().map(function (x) {
      var kr = SABIT[x.kod] < 3;
      return '<div class="kr-kart" role="alert" data-kr="' + esc(x.id) + '" style="border:2px solid ' + (x.iyilesti ? '#3c8d4a' : (kr ? '#c0392b' : '#d68910')) + ';background:' + (x.iyilesti ? '#eef8ef' : (kr ? '#fdecea' : '#fef5e7')) + ';border-radius:12px;padding:10px 12px;margin:0 0 8px;">' +
        '<div style="font-weight:800;">' + esc(x.baslik) + (x.hiveId != null ? ' · Kovan ' + esc(x.hiveId) : '') + '</div><div style="margin:4px 0;">' + esc(x.metin) + '</div>' +
        (x.aksiyon ? '<div style="font-weight:700;">' + esc(x.aksiyon) + '</div>' : '') +
        (x.onay ? '<div style="margin:6px 0;">' + esc(x.onay.soru) + ' <button type="button" class="btn secondary" data-kr-onay="' + esc(x.id) + '">Onayla</button></div>' : '') +
        '<button type="button" class="btn" data-kr-tamam="' + esc(x.id) + '" style="margin-top:4px;">Tamam</button></div>';
    }).join('');
    var dh = el.offsetHeight - h0; if (dh && kayik) global.scrollBy(0, dh);
  }
  function bagla(el) {
    if (!el || el.__kr) return; el.__kr = 1; ciz(el); gonder();
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-kr-tamam]'); if (t) { tamam(t.getAttribute('data-kr-tamam')); return; }
      var o = e.target.closest('[data-kr-onay]'); if (o) { var v = tumu().filter(function (x) { return x.id === o.getAttribute('data-kr-onay'); })[0]; try { global.dispatchEvent(new CustomEvent('superari-tasinma-onay', { detail: v })); } catch (er) { /* */ } }
    });
    global.addEventListener('superari-kritik', function () { ciz(el); });
    global.addEventListener('storage', function (e) { if (e.key === KEY) ciz(el); });
  }
  global.SuperAriKritik = { ac: ac, iyilesti: iyilesti, tamam: tamam, liste: liste, tumu: tumu, gecmis: gecmis, sesten: sesten, orsDegisim: orsDegisim, orsGozle: orsGozle, gecmisEkle: gecmiseYaz, aniKayip: aniKayip,
    kapatanMetni: kapatanMetni, ekibeGider: ekibeGider, ekipListesi: ekipListesi, ciz: ciz, bagla: bagla, AD: AD, SABIT: SABIT, _kuyruk: function () { return rj(GIDEN, []); } };
})(typeof window !== 'undefined' ? window : globalThis);
