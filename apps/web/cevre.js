/* SüperArı · Arılık çevresi (koloni-166 EK8) → window.SuperAriCevre
 * Yalnız Supabase arilik_cevre tablosundan okur (admin yazar; OSM + ESA WorldCover betiği). Uygulamada yalnız kısa uyarı: mesafe/kaynak gösterilmez. */
(function (global) {
  'use strict';
  var CACHE = 'superari.cevre.v1';
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function anahtar(ap) { return ap ? String(ap.cloudId || ap.id) : ''; }
  function satir(ap) { var c = rj(CACHE, {}); return c[anahtar(ap)] || c[String(ap && ap.id)] || null; }
  var bek = false;
  function cek() {
    var B = global.SuperAriBulut; if (bek || !B || !B.client) return Promise.resolve(false); bek = true;
    return B.client().then(function (c) { return c.from('arilik_cevre').select('arilik_id,rakim_m,su_kaynagi_mesafe_metre,su_kaynagi_turu,ortu,toplama_alani_guvenli,hesaplandi'); })
      .then(function (r) { bek = false; if (!r || r.error || !r.data) return false; var o = {}; r.data.forEach(function (x) { o[x.arilik_id] = x; }); wj(CACHE, o); try { global.dispatchEvent(new Event('superari-cevre')); } catch (e) { /* */ } return true; })
      .catch(function () { bek = false; return false; });
  }
  /** Kısa uyarılar: [{ k:'su'|'alan', metin }] ya da { veriYok:true } */
  function uyarilar(ap) {
    var s = satir(ap), R = global.SuperAriRota, S = global.SuperAriSaglikTakvimi;
    if (!s) return { veriYok: true, metin: 'Veri yok', liste: [] };
    var L = [], sr = R && R.suRiski ? R.suRiski(s.su_kaynagi_mesafe_metre) : null;
    if (sr && sr.metin && sr.risk != null && sr.risk > 0) L.push({ k: 'su', metin: sr.metin });
    var ilac = S && S.aktifIlaclama ? S.aktifIlaclama(ap.id) : false;
    var g = R && R.toplamaAlaniGuvenli ? R.toplamaAlaniGuvenli(s.ortu, ilac) : s.toplama_alani_guvenli;
    if (g === false) L.push({ k: 'alan', metin: ilac ? 'Yakında ilaçlama var, kovan girişlerini kapat' : 'Toplama alanı zayıf, besleme planla' });
    return { veriYok: false, liste: L, su_m: s.su_kaynagi_mesafe_metre, alan: g == null ? null : g };
  }
  var BO_KEY = 'superari.balorman.v1';
  function balOrmanlari() { return rj(BO_KEY, []); }
  /* k166: üst sınır yok — 1000'lik sayfalarla tablo ne içeriyorsa hepsi */
  function cekBO() { var B = global.SuperAriBulut; if (!B || !B.client) return Promise.resolve(true); var tum = [], SY = 1000;
    return B.client().then(function (c) { function sayfa(i) { return c.from('bal_ormanlari').select('id,ad,il,ilce,lat,lon,kovan_kapasitesi,su_kaynagi_mesafe_metre,toplama_alani_guvenli').order('id').range(i, i + SY - 1).then(function (r) {
      if (!r || r.error || !r.data) return false; tum = tum.concat(r.data); if (r.data.length === SY) return sayfa(i + SY); wj(BO_KEY, tum); return true; }); } return sayfa(0); }); }
  /* k166: kayıtlı sonucu oku; hata/zaman aşımında 'Veri yok' kalır, arka planda üstel bekleme (5 sn → 10 → 20 … en çok 10 dk) ile yeniden dene. Uygulama beklemez. */
  function zamanli(p, ms) { return Promise.race([p, new Promise(function (_, rej) { global.setTimeout(function () { rej(new Error('zaman aşımı')); }, ms); })]); }
  function yeniden(fn, ad) { var n = 0; (function dene() { zamanli(Promise.resolve().then(fn), 15000).then(function (ok) { if (ok === false) throw new Error('yok'); }).catch(function () { n++; var b = Math.min(600000, 5000 * Math.pow(2, n - 1)); global['__saGeri_' + ad] = b; global.setTimeout(dene, b); }); })(); }
  if (global.setTimeout) global.setTimeout(function () { yeniden(cek, 'cevre'); yeniden(cekBO, 'bo'); }, 2000);
  global.SuperAriCevre = { cek: cek, satir: satir, uyarilar: uyarilar, balOrmanlari: balOrmanlari };
})(typeof window !== 'undefined' ? window : globalThis);
