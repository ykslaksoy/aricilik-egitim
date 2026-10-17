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
  /* koloni-242: tüm sensörlerin varsayılan okuma sıklığı — tek tablo (uygulama sensor-polling + sunucu aynı). Değer ORS_SENSOR / ogul_skor_ayar.sensor (dk), yoksa yedek dk. */
  var OKUMA = { tarti: ['okumaTartiDk', 15], isi_nem: ['okumaIsiNemDk', 30], giris_isi: ['okumaGirisSicakDk', 30, 'okumaIsiNemDk'], dis_isi_nem: ['okumaDisHavaDk', 30, 'okumaIsiNemDk'],
    ses: ['okumaSesDk', 3], titresim: ['okumaTitDk', 3], ir: ['okumaIrDk', 5], pil: ['okumaPilDk', 240], gateway: ['okumaGatewayDk', 10],
    kamera_kovan: ['okumaKameraDk', 1440], kamera_arilik: ['okumaKameraDk', 1440], kamera_merkez: ['okumaKameraDk', 1440] };
  /** tip (+ yer: 'giris') → ms; tanımsız tip null. En az 1 dk, en çok 24 saat. */
  function okumaMs(tip, th, yer) {
    var t = String(tip || ''); if (t === 'isi_nem' && yer === 'giris') t = 'giris_isi';
    var o = OKUMA[t]; if (!o) return null;
    var v = th ? Number(th[o[0]]) : NaN; if (!(isFinite(v) && v > 0) && o[2] && th) v = Number(th[o[2]]);
    if (!(isFinite(v) && v > 0)) v = o[1];
    return Math.max(60000, Math.min(86400000, Math.round(v) * 60000));
  }
  /** koloni-242: kuralların gerektirdiği en seyrek aralık (ms); olay tabanlı algılamalar (piping, tıslama, dur sinyali, ana ötmesi, darbe) aralıktan bağımsız — cihaz sürekli dinler, olay anında gönderir. */
  function kuralGerek(tip, th, yer) {
    th = th || {}; var t = String(tip || ''), L = [];
    function pad(x) { return String(x).padStart(2, '0'); }
    function n(k, d) { var v = Number(th[k]); return isFinite(v) && v > 0 ? v : d; }
    if (t === 'isi_nem' && yer === 'giris') t = 'giris_isi';
    if (t === 'titresim') {
      var gece = (n('titOgulGeceSon', 5) - (Number(th.titOgulGeceBas) || 0)) * 60;
      L.push({ kural: 'Titreşim oğul hazırlığı (gece ' + pad(Number(th.titOgulGeceBas) || 0) + '–' + pad(n('titOgulGeceSon', 5)) + ')', ms: Math.max(60000, Math.round(gece / 5) * 60000), neden: 'gece en az 5 ortalama spektrum (uzman tahmini; Ramsey 2020 3 dk)' });
    }
    if (t === 'ir') {
      L.push({ kural: 'Oğul çıktı (IR)', ms: Math.max(60000, Math.floor(n('ogulCiktiDk', 10) / 2) * 60000), neden: n('ogulCiktiDk', 10) + ' dk pencereye en az 2 dilim' });
      L.push({ kural: 'İlaçlama şüphesi', ms: Math.max(60000, Math.floor(n('ilacPencereDk', 60) / 2) * 60000), neden: n('ilacPencereDk', 60) + ' dk pencereye en az 2 dilim' });
      L.push({ kural: 'Eşek arısı (tıslamasız yedek)', ms: Math.max(60000, Math.floor(n('esekIrPencereDk', 60) / 2) * 60000), neden: n('esekIrPencereDk', 60) + ' dk pencereye en az 2 dilim' });
    }
    if (t === 'tarti') {
      L.push({ kural: 'Oğul çıktı (tartı doğrulama)', ms: Math.max(60000, Math.floor(n('ogulDonusDk', 60) / 2) * 60000), neden: n('ogulDonusDk', 60) + ' dk pencereye en az 2 dilim' });
      L.push({ kural: 'Tarlacı kaybı (sabah düşüşü)', ms: Math.max(60000, Math.floor(n('tarlaciPencereSaat', 3) * 60 / 3) * 60000), neden: n('tarlaciPencereSaat', 3) + ' saat pencereye en az 3 okuma' });
    }
    if (t === 'gateway') L.push({ kural: 'Oğul çıktı (IR) uyarısı dakikalar içinde', ms: Math.max(60000, n('ogulCiktiDk', 10) * 60000), neden: 'gönderim oğul çıktı penceresinden seyrek olmamalı; acil olaylar beklemeden gider' });
    if (!L.length) return null;
    var mn = L.reduce(function (a, x) { return Math.min(a, x.ms); }, Infinity);
    return { ms: mn, kurallar: L };
  }
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
  return { VARSAYILAN: VARSAYILAN, OKUMA: OKUMA, okumaMs: okumaMs, kuralGerek: kuralGerek, ayar: ayar, tahmin: tahmin, kalanGun: kalanGun, seviye: seviye, sarjSonrasi: sarjSonrasi, DAY: DAY };
});
