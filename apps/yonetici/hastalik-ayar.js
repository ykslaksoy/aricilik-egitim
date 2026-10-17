/* koloni-260: Hastalık tahmini ayarları — varsayılanlar (tek tanım; apps/web ve apps/yonetici aynı dosya).
   Yönetici değeri ogul_skor_ayar.data.hastalik içinde tutulur; yoksa bu varsayılanlar kullanılır.
   Tüm sayılar uzman tahmini (kaynak yok) — kaynaklar yalnız yönetici panelinde gösterilir. */
(function (global) {
  'use strict';
  var DEF = {
    agirlik: {
      ayc: { kibrit: 5, kapak: 3, koku: 2, daginik: 1.5 },
      eyc: { bukuk: 4, koku: 2, daginik: 2, kapak: 0.5 },
      tulumsu: { tulum: 5, kapak: 1.5, daginik: 1.5 },
      kirec: { beyazMumya: 5, siyahMumya: 3, daginik: 1 },
      varroa: { akar: 5, kanat: 2.5, daginik: 1, kapak: 1 },
      dwv: { kanat: 5, akar: 2 },
      nosema: { ishal: 5 },
      mumguvesi: { guve: 5 }
    },
    fotoGuclu: 0.5, fotoZayif: 0.35, fotoKotuKat: 0.5,
    esikDus: 1.5, esikMuhtemel: 3, esikEnMuhtemel: 5, maxAday: 3,
    aycZorla: true, aycZorlaPuan: 3,
    kontrolGunAyc: 3, kontrolGunDiger: 7,
    fotoMinPx: 700, daginikOran: 0.3, daginikGuclu: 0.42,
    beyazLekeMin: 3, beyazLekeGuclu: 8, akarMin: 5, akarGuclu: 15,
    ihbar: { ayc: true, eyc: false, tulumsu: false, kirec: false, varroa: false, dwv: false, nosema: false, mumguvesi: false }
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /** Yönetici değerini (o) varsayılanların üstüne güvenli biçimde bindirir. */
  function merge(o) {
    var r = clone(DEF); if (!o || typeof o !== 'object') return r;
    Object.keys(DEF).forEach(function (k) {
      var v = o[k];
      if (k === 'agirlik' || k === 'ihbar') {
        if (!v || typeof v !== 'object') return;
        Object.keys(DEF[k]).forEach(function (d) {
          if (k === 'ihbar') { if (typeof v[d] === 'boolean') r.ihbar[d] = v[d]; return; }
          var w = v[d]; if (!w || typeof w !== 'object') return;
          Object.keys(w).forEach(function (s) { var n = Number(w[s]); if (isFinite(n) && n >= 0) r.agirlik[d][s] = n; });
        });
      } else if (typeof DEF[k] === 'boolean') { if (typeof v === 'boolean') r[k] = v; }
      else { var n = Number(v); if (v !== null && v !== '' && isFinite(n) && n >= 0) r[k] = n; }
    });
    return r;
  }
  function get() {
    var D = global.SuperAriDemo, o = null;
    try { o = (D && D.colony && D.colony.ogulSkor && (D.colony.ogulSkor() || {}).hastalik) || null; } catch (e) { o = null; }
    return merge(o);
  }
  global.SuperAriHastalikAyar = { DEF: DEF, merge: merge, get: get };
})(typeof window !== 'undefined' ? window : globalThis);
