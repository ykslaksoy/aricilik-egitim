/* koloni-267 (önizleme): Bal hedefi + Tartı döşemeleri ayarları — varsayılanlar (tek tanım; apps/web ve apps/yonetici aynı dosya).
   Yönetici değeri ogul_skor_ayar.data.balHedef içinde tutulur; yoksa bu varsayılanlar kullanılır.
   Kaynaksız sayılar uzman tahmini (Yapılacaklar’da); kaynaklar yalnız yönetici panelinde gösterilir. */
(function (global) {
  'use strict';
  var DEF = {
    /* Sezon bal hedefi = baseKg × ırk katsayısı × sis uçuş katı × genelKat (kovan başı); toplam = × aktif kovan sayısı */
    baseKg: 13.8, genelKat: 1.06,
    irk: {
      'Karadeniz': { kat: 1.22, katSis: 1.22, sisKayip: 0.18 },
      'Kafkas × Karniyol': { kat: 1.2, katSis: 1.2, sisKayip: 0.3 },
      'Kafkas': { kat: 0.97, katSis: 1.08, sisKayip: 0.25 },
      'Muğla': { kat: 1.05, katSis: 0.95, sisKayip: 1 },
      'Karniyol': { kat: 1.08, katSis: 1, sisKayip: 1 },
      'Diğer': { kat: 1, katSis: 1, sisKayip: 0 }
    },
    sisKelime: 'yanık,yanik,cimil,rize', sisPay: 0.294,
    /* Tartı döşemeleri */
    kisStokKg: 20, hasatFazlaKg: 10, nektarGun: 7
  };
  var IRK_SIRA = ['Karadeniz', 'Kafkas × Karniyol', 'Kafkas', 'Muğla', 'Karniyol', 'Diğer'];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v, min, max) { var n = Number(v); return v !== null && v !== '' && isFinite(n) && n >= min && n <= max ? n : null; }
  function merge(o) {
    var r = clone(DEF); if (!o || typeof o !== 'object') return r;
    [['baseKg', 0, 200], ['genelKat', 0, 5], ['sisPay', 0, 1], ['kisStokKg', 0, 200], ['hasatFazlaKg', 0, 200], ['nektarGun', 1, 60]].forEach(function (x) { var n = num(o[x[0]], x[1], x[2]); if (n != null) r[x[0]] = n; });
    if (typeof o.sisKelime === 'string') r.sisKelime = o.sisKelime.slice(0, 200);
    if (o.irk && typeof o.irk === 'object') Object.keys(DEF.irk).forEach(function (k) {
      var v = o.irk[k]; if (!v || typeof v !== 'object') return;
      ['kat', 'katSis', 'sisKayip'].forEach(function (f) { var n = num(v[f], 0, 5); if (n != null) r.irk[k][f] = n; });
    });
    return r;
  }
  function get() {
    var D = global.SuperAriDemo, o = null;
    try { o = (D && D.colony && D.colony.ogulSkor && (D.colony.ogulSkor() || {}).balHedef) || null; } catch (e) { o = null; }
    return merge(o);
  }
  /** Irk adı → katsayı anahtarı (ilk eşleşen; melez «Kafkas × Karniyol» önce). */
  function irkKey(name) {
    var s = String(name || '');
    if (/Karadeniz/.test(s)) return 'Karadeniz';
    if (/Kafkas × Karniyol/.test(s)) return 'Kafkas × Karniyol';
    if (/Kafkas/.test(s)) return 'Kafkas';
    if (/Muğla/.test(s)) return 'Muğla';
    if (/Karniyol/.test(s)) return 'Karniyol';
    return 'Diğer';
  }
  function sisli(A, apiary) {
    var t = String(((apiary && apiary.name) || '') + ' ' + ((apiary && apiary.place) || '')).toLocaleLowerCase('tr');
    return String(A.sisKelime || '').split(',').map(function (w) { return w.trim().toLocaleLowerCase('tr'); }).filter(Boolean).some(function (w) { return t.indexOf(w) >= 0; });
  }
  /** Irk katsayısı × sis uçuş katı (önceki forage-analysis.js breedYieldFactor ile aynı formül). */
  function irkKat(A, breed, fog) {
    var k = A.irk[irkKey(breed)] || A.irk['Diğer'];
    var share = fog ? A.sisPay : 0;
    return (fog ? k.katSis : k.kat) * (1 - share * k.sisKayip);
  }
  /** Arılığın aktif kovanları (sönük koloniler hariç). */
  function aktifKovanlar(apiaryId) {
    var D = global.SuperAriDemo; if (!D || !D.loadHives) return [];
    return (D.loadHives() || []).filter(function (h) { return h && String(h.apiaryId) === String(apiaryId) && h.colonyState !== 'sonuk'; });
  }
  /** Arılık hedefi: { perHiveKg, totalKg, n (aktif kovan), fog, breedLabel }. Irk kovan başına ağırlıklı; kovan ırkı yoksa arılık ırkı. */
  function arilikHedef(apiary, opts) {
    var A = (opts && opts.ayar) || get(), D = global.SuperAriDemo;
    if (!apiary) return null;
    var hs = aktifKovanlar(apiary.id), fog = sisli(A, apiary), sum = 0, cnt = 0, mix = {};
    var apBreed = '';
    try { apBreed = (D && D.colony && D.colony.apiaryBreed) ? (D.colony.apiaryBreed(apiary.id) || '') : ''; } catch (e) { apBreed = ''; }
    if (!apBreed) apBreed = apiary.breed || '';
    hs.forEach(function (h) { var b = h.breed || apBreed; sum += irkKat(A, b, fog); cnt++; var kk = irkKey(b); mix[kk] = (mix[kk] || 0) + 1; });
    var f = cnt ? sum / cnt : irkKat(A, apBreed, fog);
    var per = Math.round(A.baseKg * f * A.genelKat * 10) / 10;
    var top = Object.keys(mix).sort(function (a, b) { return mix[b] - mix[a]; })[0] || irkKey(apBreed);
    return { perHiveKg: per, totalKg: Math.round(per * hs.length), n: hs.length, fog: fog, breedLabel: top };
  }
  /** koloni-274: arılığın bal (uçuş) sezonu bugün açık mı — tek tanım demo-data.js › colony.ucusSezon
      (bölge profili, sıcak bölge çam balı illerinde ucusSezonCamSon, yönetici › arılık başına elle dönem).
      Sezonu kapanmış arılıkta kovandaki bal hasat edilmez → «Kovanda kalan (kış stoğu)». Hesaplanamazsa açık sayılır. */
  function hasatSezonu(apiaryId, date) {
    var D = global.SuperAriDemo, C = D && D.colony;
    if (!C || !C.ucusSezon) return { acik: true, bilinmiyor: true };
    try { var s = C.ucusSezon(apiaryId, date); return { acik: !!(s && s.acik), window: s && s.window, to: s && s.to, custom: !!(s && s.custom) }; } catch (e) { return { acik: true, bilinmiyor: true }; }
  }
  global.SuperAriBalHedef = { DEF: DEF, IRK_SIRA: IRK_SIRA, merge: merge, get: get, irkKey: irkKey, irkKat: irkKat, sisli: sisli, arilikHedef: arilikHedef, aktifKovanlar: aktifKovanlar, hasatSezonu: hasatSezonu };
})(typeof window !== 'undefined' ? window : globalThis);
