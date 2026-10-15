/* SüperArı · Sağlık takvimi (koloni-164, EK9) → window.SuperAriSaglikTakvimi
 * Sıkışıklık ve ORS'den bağımsız Varroa uyarıları + varroa sayım kaydı + ilaçlama ajandası (yalnız not; alarmları etkilemez)
 * + sezon verisi biriktirme (arka planda; arayüzde gösterilmez). Eşikler ORS_SENSOR (panel, uzman tahmini). */
(function (global) {
  'use strict';
  var SAYIM = 'superari.varroa.sayim.v1', AJANDA = 'superari.ajanda.ilaclama.v1', GOSTER = 'superari.varroa.gosterildi.v1', SEZON = 'superari.sezon.veri.v1';
  var AKSIYON = 'Kovanı muayene et, Varroa bulaşıklık seviyesini ölç ve resmi mücadele protokolünü uygula.';
  var A01 = { kod: 'ALARM_SAGLIK_VARROA_01', baslik: '🩺 Sağlık Takvimi: Varroa Mücadelesi', icerik: 'Bölgenizde nektar akımı sönümlendi. Kovan sağlığını korumak için Varroa sayımını ve dönemlik mücadelesini başlat.', aksiyon: AKSIYON };
  var A02 = { kod: 'ALARM_SAGLIK_VARROA_02', baslik: '🩺 Sağlık Takvimi: Kuluçka Başladı', icerik: 'Kuluçka dönemi başladı. Varroa sayımını başlat.', aksiyon: AKSIYON };
  var A03 = { kod: 'ALARM_SAGLIK_VARROA_03', baslik: '🩺 Sağlık Takvimi: Varroa Sayımı', icerik: 'Varroa sayım ve mücadele zamanı, kovanları kontrol et.', aksiyon: AKSIYON };
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function D() { return global.SuperAriDemo; }
  function T() { var d = D(), b = (d && d.colony && d.colony.ORS_SENSOR) || {}, s = null; try { s = d.colony.ogulSkor ? d.colony.ogulSkor() : null; } catch (e) { /* */ } return Object.assign({}, b, (s && s.sensor) || {}); }
  function iso(t) { var x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }

  /* Varroa sayım kaydı: yöntem (alkol yıkama / pudra şekeri / yapışkan tabla / göz) + sonuç (100 arıda akar veya günlük düşen) */
  var YONTEM = { alkol: 'Alkol yıkama', seker: 'Pudra şekeri', tabla: 'Yapışkan tabla', goz: 'Gözle kontrol' };
  function sayimEkle(r) {
    if (!r || !r.apiaryId || !YONTEM[r.yontem] || !isFinite(Number(r.sonuc))) throw new Error('Yöntem ve sonuç gir.');
    var L = rj(SAYIM, []), o = { id: 'vs' + Date.now(), apiaryId: String(r.apiaryId), hiveId: r.hiveId == null ? null : Number(r.hiveId), tarih: String(r.tarih || iso(Date.now())).slice(0, 10), yontem: r.yontem, sonuc: Number(r.sonuc), not: r.not || '', girenId: r.girenId || null };
    L.push(o); wj(SAYIM, L); return o;
  }
  function sayimlar(apiaryId) { return rj(SAYIM, []).filter(function (x) { return !apiaryId || String(x.apiaryId) === String(apiaryId); }).sort(function (a, b) { return a.tarih < b.tarih ? 1 : -1; }); }

  /* İlaçlama ajandası: arıcının elle notu; alarmları ETKİLEMEZ (yalnız toplama alanı güvenli hesabında "aktif ilaçlama notu" olarak okunur) */
  function ajandaEkle(n) { var L = rj(AJANDA, []), o = { id: 'aj' + Date.now(), apiaryId: String(n.apiaryId || ''), bas: String(n.bas || iso(Date.now())).slice(0, 10), bit: n.bit ? String(n.bit).slice(0, 10) : null, not: String(n.not || '').slice(0, 500) }; L.push(o); wj(AJANDA, L); return o; }
  function ajanda(apiaryId) { return rj(AJANDA, []).filter(function (x) { return !apiaryId || String(x.apiaryId) === String(apiaryId); }); }
  function aktifIlaclama(apiaryId, gun) { var t = gun || iso(Date.now()); return ajanda(apiaryId).some(function (x) { return x.bas <= t && (!x.bit || x.bit >= t); }); }

  /* Kuluçka başlangıç ayı (rakıma göre; uzman tahmini — panelde) */
  function kuluckaAyi(rakim, th) { th = th || T(); if (rakim == null || !isFinite(rakim)) return null; return rakim < (th.kulucka0Rakim || 500) ? 2 : (rakim > (th.kulucka1Rakim || 1200) ? 4 : 3); }

  function donemKey(kod, apId, yil, alt) { return kod + '|' + apId + '|' + yil + (alt ? '|' + alt : ''); }
  /**
   * varroaTakvimi(apiaryId, opts) → { durum: 'veri_yok'|'tamam', uyarilar: [...] }
   * opts: { now, rakim, artisBitti:{bitti,yontem,hafta}|null, donem:{durum,ay1,ay2}|null, sayimlar, hasatlar, isaretle }
   * 01: hasat sonrası — tartı varsa artışın durduğu hafta; yoksa TAGEM döneminin bittiği ay (ay2'den sonraki ay). Hasat kaydı da tetikler.
   * 02: ilkbahar kuluçka başlangıcı (rakıma göre ay). 03: son sayımdan bu yana varroaSayimGun geçti (sezon içinde).
   * Aynı dönemde tekrar etmez (yıl + tetik anahtarı).
   */
  function varroaTakvimi(apiaryId, opts) {
    opts = opts || {}; var th = T(), now = opts.now ? new Date(opts.now) : new Date(), ay = now.getMonth() + 1, yil = now.getFullYear(), out = [], gos = rj(GOSTER, {});
    var R = global.SuperAriRota, Ck = global.SuperAriCicek, d = D();
    var ap = null; try { ap = d && d.apiaryById ? d.apiaryById(apiaryId) : null; } catch (e) { ap = null; }
    var ab = opts.artisBitti !== undefined ? opts.artisBitti : (R && ap ? R.artisBitti(ap) : null);
    var dn = opts.donem !== undefined ? opts.donem : (Ck && ap ? Ck.donem({ il: ap.il, ilce: ap.ilce }, ay) : null);
    if (dn && dn.durum !== 'var') dn = null;
    var hs = opts.hasatlar !== undefined ? opts.hasatlar : (function () { try { return d.harvests.list({ apiaryId: apiaryId }); } catch (e) { return []; } })();
    var rk = opts.rakim !== undefined ? opts.rakim : (R && ap ? R.rakimHazir(ap) : null);
    var veri = !!(ab || dn || (hs && hs.length) || rk != null);
    function ekle(a, key) { if (gos[key]) return; out.push(Object.assign({ key: key, apiaryId: apiaryId }, a)); }
    /* 01 */
    var hasatYeni = (hs || []).some(function (h) { return String(h.date || '').slice(0, 4) === String(yil) && (now - Date.parse(h.date)) / 864e5 <= 14; });
    if (ab && ab.bitti && ab.yontem === 'tarti') ekle(A01, donemKey(A01.kod, apiaryId, yil, 'tarti'));
    else if (dn && !dn.aktif && ay === (dn.ay2 % 12) + 1) ekle(A01, donemKey(A01.kod, apiaryId, yil, 'ay'));
    else if (hasatYeni) ekle(A01, donemKey(A01.kod, apiaryId, yil, 'hasat'));
    /* 02 */
    var ka = kuluckaAyi(rk, th); if (ka && ay === ka) ekle(A02, donemKey(A02.kod, apiaryId, yil));
    /* 03 — sezon içinde (kuluçka ayı → Kasım) */
    var L = opts.sayimlar !== undefined ? opts.sayimlar : sayimlar(apiaryId), son = L[0];
    var sezon = ka ? ay >= ka && ay <= 11 : ay >= 3 && ay <= 11;
    if (sezon && L.length) { var gun = (now - Date.parse(son.tarih + 'T12:00:00')) / 864e5; if (gun >= (th.varroaSayimGun || 30)) ekle(A03, donemKey(A03.kod, apiaryId, yil, son.tarih)); }
    if (opts.isaretle) { out.forEach(function (u) { gos[u.key] = iso(now); }); wj(GOSTER, gos); }
    return { durum: veri || L.length ? 'tamam' : 'veri_yok', metin: veri || L.length ? '' : 'Veri yok', uyarilar: out };
  }

  /* Sezon tahmini için arka planda günlük özet biriktir (gösterilmez) */
  function sezonBiriktir() {
    try {
      var d = D(); if (!d || !d.loadApiaries) return; var gun = iso(Date.now()), S = rj(SEZON, {}); if (S._son === gun) return;
      var P2 = global.SuperAriPlan2;
      d.loadApiaries().forEach(function (a) { var s = P2 && P2.netArtis ? P2.netArtis(a.id, 1) : []; (S[a.id] = S[a.id] || []).push({ g: gun, kg: s.length ? s[s.length - 1].kg : null, ay: new Date().getMonth() + 1 }); if (S[a.id].length > 800) S[a.id] = S[a.id].slice(-800); });
      S._son = gun; wj(SEZON, S);
    } catch (e) { /* sessiz */ }
  }
  if (global.setTimeout) global.setTimeout(sezonBiriktir, 3000);
  global.SuperAriSaglikTakvimi = { varroaTakvimi: varroaTakvimi, sayimEkle: sayimEkle, sayimlar: sayimlar, YONTEM: YONTEM, ajandaEkle: ajandaEkle, ajanda: ajanda, aktifIlaclama: aktifIlaclama, kuluckaAyi: kuluckaAyi, A01: A01, A02: A02, A03: A03, _sezon: sezonBiriktir };
})(typeof window !== 'undefined' ? window : globalThis);
