/* koloni-260 (+önizleme iyileştirme): Hastalık tahmini ayarları — varsayılanlar (tek tanım; apps/web ve apps/yonetici aynı dosya).
   Yönetici değeri ogul_skor_ayar.data.hastalik içinde tutulur; yoksa bu varsayılanlar kullanılır.
   Tüm sayılar uzman tahmini (kaynak yok) — kaynaklar yalnız yönetici panelinde gösterilir. */
(function (global) {
  'use strict';
  var DEF = {
    agirlik: {
      ayc: { kibrit: 5, kapak: 3, koku: 2, daginik: 1.5, dilIzi: 4 },
      eyc: { bukuk: 4, koku: 2, daginik: 2, kapak: 0.5 },
      tulumsu: { tulum: 5, kapak: 1.5, daginik: 1.5 },
      kirec: { beyazMumya: 5, siyahMumya: 3, daginik: 1 },
      varroa: { akar: 5, kanat: 2.5, daginik: 1, kapak: 1 },
      dwv: { kanat: 5, akar: 2 },
      nosema: { ishal: 5 },
      mumguvesi: { guve: 5 },
      kkk: { kkkBocek: 6, kkkBal: 3, guve: 1 },
      tropilaelaps: { tropiAkar: 6, daginik: 1, kapak: 1, kanat: 1 },
      tasyavru: { tasMumya: 5, beyazMumya: 1 },
      cbpv: { titreyen: 5, topluOlum: 1 },
      zehir: { topluOlum: 5, titreyen: 1.5 },
      aclik: { basGomulu: 5, topluOlum: 1 },
      anaSorun: { cokYumurta: 5, daginik: 1.5 }
    },
    mevsimKat: {},
    gecmisPuan: 1, gecmisGun: 60,
    varroaEsikDurgun: 1, varroaEsikArtis: 1, varroaEsikTepe: 2, varroaEsikAzalma: 2,
    varroaAyDurgun: '11,12,1,2', varroaAyArtis: '3,4,5', varroaAyTepe: '6,7,8', varroaAyAzalma: '9,10',
    tablaKatKis: 400, tablaKatYaz: 30, tablaKatAra: 100, tablaEsikAkar: 1000,
    varroaTekrarGun: 21, varroaSayimGun: 60,
    fotoGuclu: 0.5, fotoZayif: 0.35, fotoKotuKat: 0.5,
    esikDus: 1.5, esikMuhtemel: 3, esikEnMuhtemel: 5, maxAday: 3,
    aycZorla: true, aycZorlaPuan: 3,
    kontrolGunAyc: 3, kontrolGunDiger: 7,
    fotoMinPx: 700, daginikOran: 0.3, daginikGuclu: 0.42,
    beyazLekeMin: 3, beyazLekeGuclu: 8, akarMin: 5, akarGuclu: 15,
    ihbar: { ayc: true, eyc: false, tulumsu: false, kirec: false, varroa: false, dwv: false, nosema: false, mumguvesi: false, kkk: true, tropilaelaps: true, tasyavru: false, cbpv: false, zehir: false, aclik: false, anaSorun: false }
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
      } else if (k === 'mevsimKat') {
        if (!v || typeof v !== 'object') return;
        Object.keys(v).forEach(function (d) { var w = v[d]; if (!w || typeof w !== 'object') return; r.mevsimKat[d] = {};
          ['ilkbahar', 'yaz', 'sonbahar', 'kis'].forEach(function (m) { var n = Number(w[m]); if (isFinite(n) && n >= 0) r.mevsimKat[d][m] = n; }); });
      } else if (typeof DEF[k] === 'string') { if (typeof v === 'string' && /^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(v)) r[k] = v.replace(/\s/g, ''); }
      else if (typeof DEF[k] === 'boolean') { if (typeof v === 'boolean') r[k] = v; }
      else { var n = Number(v); if (v !== null && v !== '' && isFinite(n) && n >= 0) r[k] = n; }
    });
    return r;
  }
  function get() {
    var D = global.SuperAriDemo, o = null;
    try { o = (D && D.colony && D.colony.ogulSkor && (D.colony.ogulSkor() || {}).hastalik) || null; } catch (e) { o = null; }
    return merge(o);
  }
  /** Ay (1–12) → Varroa koloni evresi eşiği (%) — HBHC 2026 Tablo 1; ay eşlemesi uzman tahmini. */
  function varroaEsik(A, ay) {
    var E = [['Durgun', 'varroaAyDurgun', 'varroaEsikDurgun'], ['Artış', 'varroaAyArtis', 'varroaEsikArtis'], ['Tepe', 'varroaAyTepe', 'varroaEsikTepe'], ['Azalma', 'varroaAyAzalma', 'varroaEsikAzalma']];
    for (var i = 0; i < E.length; i++) if (String(A[E[i][1]]).split(',').map(Number).indexOf(ay) >= 0) return { evre: E[i][0], esik: A[E[i][2]] };
    return { evre: 'Tepe', esik: A.varroaEsikTepe };
  }
  function tablaKat(A, ay) { return (ay >= 11 || ay <= 2) ? A.tablaKatKis : (ay >= 5 && ay <= 8 ? A.tablaKatYaz : A.tablaKatAra); }
  function mevsim(ay) { return ay >= 3 && ay <= 5 ? 'ilkbahar' : (ay >= 6 && ay <= 8 ? 'yaz' : (ay >= 9 && ay <= 11 ? 'sonbahar' : 'kis')); }
  global.SuperAriHastalikAyar = { DEF: DEF, merge: merge, get: get, varroaEsik: varroaEsik, tablaKat: tablaKat, mevsim: mevsim };
})(typeof window !== 'undefined' ? window : globalThis);
