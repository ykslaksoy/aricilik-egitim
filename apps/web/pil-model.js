/* koloni-225: Pil tahmin modeli — uygulama (plan-planlayici.js) ve sunucu (sensorAnalysis / predictiveAnalysis) aynı hesabı kullanır.
 * Bütün değerler uzman tahmini (kaynak yok, cihaz üreticisine bağlı); yönetici panelinden (ORS_SENSOR) değiştirilir. */
(function (root, factory) {
  var M = factory();
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) root.SuperAriPilModel = M;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  var DAY = 86400000;
  var VARSAYILAN = { batTabanOran: 0.3, batIlkGun: 7, batIlkDusus: 2, batOrtaGun: 14, batYuksekGun: 7, gwOrtaGun: 7, gwYuksekGun: 3,
    batErkenGun: 30, batSezonArtiGun: 7, batGorevOnceGun: 2, batSarjArtis: 30, batBittiPct: 10, dusukPilYuzde: 20 };
  function ayar(th) { var o = {}; for (var k in VARSAYILAN) o[k] = th && th[k] != null && isFinite(Number(th[k])) ? Number(th[k]) : VARSAYILAN[k]; return o; }
  /** Son şarjdan sonraki okumalar (ani artış ≥ batSarjArtis puan = şarj/pil değişimi). */
  function sarjSonrasi(h, th) {
    var a = ayar(th), i0 = 0, sarj = null;
    for (var i = 1; i < h.length; i++) if (h[i].p - h[i - 1].p >= a.batSarjArtis) { i0 = i; sarj = { t: h[i].t, once: h[i - 1].p, sonra: h[i].p }; }
    return { h: h.slice(i0), sarj: sarj };
  }
  /** h: [{t (ms), p (%)}] artan zaman; ms: ölçüm aralığı. Dönüş: null (veri yok) | { hesaplaniyor } | { rate, kalanFor(ms), kalan } */
  function tahmin(h, ms, th) {
    var a = ayar(th); if (!h || !h.length) return null;
    var s = sarjSonrasi(h, th), x = s.h, first = x[0], last = x[x.length - 1], gun = (last.t - first.t) / DAY, dusus = first.p - last.p;
    if (gun < a.batIlkGun && dusus < a.batIlkDusus) return { hesaplaniyor: true, pct: last.p, sarj: s.sarj };
    var rate = gun > 0 ? Math.max(0, dusus) / gun : 0, nGun = DAY / (ms || 3600000), taban = rate * a.batTabanOran, perOlcum = nGun > 0 ? (rate - taban) / nGun : 0;
    function kalanFor(m) { var r = taban + perOlcum * (DAY / m); return r > 0 ? last.p / r : Infinity; }
    return { rate: rate, pct: last.p, lastT: last.t, kalanFor: kalanFor, kalan: kalanFor(ms || 3600000), sarj: s.sarj };
  }
  /** Sunucu kısayolu: geçmiş okumalardan kalan gün (yetersiz veride null — uygulama «Hesaplanıyor» der). */
  function kalanGun(h, ms, th) { var t = tahmin(h, ms, th); return t && !t.hesaplaniyor && isFinite(t.kalan) ? Math.floor(t.kalan) : null; }
  function seviye(kalan, gateway, th) {
    var a = ayar(th), y = gateway ? a.gwYuksekGun : a.batYuksekGun, o = gateway ? a.gwOrtaGun : a.batOrtaGun;
    return kalan == null ? null : (kalan <= y ? 'high' : (kalan <= o ? 'medium' : null));
  }
  return { VARSAYILAN: VARSAYILAN, ayar: ayar, tahmin: tahmin, kalanGun: kalanGun, seviye: seviye, sarjSonrasi: sarjSonrasi, DAY: DAY };
});
