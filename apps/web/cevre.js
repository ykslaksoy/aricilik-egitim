/* SüperArı · Arılık çevresi (koloni-161 EK8) → window.SuperAriCevre
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
    return B.client().then(function (c) { return c.from('arilik_cevre').select('arilik_id,su_kaynagi_mesafe_metre,su_kaynagi_turu,ortu,toplama_alani_guvenli,hesaplandi'); })
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
  function cekBO() { var B = global.SuperAriBulut; if (!B || !B.client) return; B.client().then(function (c) { return c.from('bal_ormanlari').select('id,ad,il,ilce,lat,lon,kovan_kapasitesi,su_kaynagi_mesafe_metre,toplama_alani_guvenli'); }).then(function (r) { if (r && !r.error && r.data) wj(BO_KEY, r.data); }).catch(function () {}); }
  if (global.setTimeout) global.setTimeout(function () { cek(); cekBO(); }, 2000);
  global.SuperAriCevre = { cek: cek, satir: satir, uyarilar: uyarilar, balOrmanlari: balOrmanlari };
})(typeof window !== 'undefined' ? window : globalThis);
