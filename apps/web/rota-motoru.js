/* SüperArı · Taşınma / rota motoru (koloni-162) → window.SuperAriRota
 * Taşınma planının ana motoru. Sabit puan yok:
 *  rota_puan(ilçe) = 100 × [wH·(H/Hmax) + wT·(T/Tmax)] / (wH+wT varolanlar)
 *   H = o ilçedeki arılıkların kovan başına yıllık ortalama hasatı, T = günlük net tartı artışının kayan ortalamasının (rotaPencere gün) en iyi değeri.
 *   Hmax/Tmax: kullanıcının kayıtlı tüm ilçeleri arasındaki en yüksek değer. Geçmiş yoksa puan yok → "Henüz kayıt yok".
 *  Gün eşikleri (kaç gün üst üste, hangi artış eşiği) kayıtlı tartı serisinden kayan pencereyle öğrenilir; kayıt < rotaMinGun ise yalnız ay aralığı kullanılır.
 *  Rakım: arılık koordinatından Open-Meteo elevation (önbellekli). */
(function (global) {
  'use strict';
  var RAKIM = 'superari.rakim.v1';
  function D() { return global.SuperAriDemo; }
  function P2() { return global.SuperAriPlan2; }
  function C() { return global.SuperAriCicek; }
  function T() { var d = D(), b = (d && d.colony && d.colony.ORS_SENSOR) || {}, s = null; try { s = d.colony.ogulSkor ? d.colony.ogulSkor() : null; } catch (e) { /* */ } return Object.assign({}, b, (s && s.sensor) || {}); }
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function n(s) { return String(s || '').trim().toLocaleLowerCase('tr'); }
  function aps() { var d = D(); try { return (d && d.loadApiaries ? d.loadApiaries() : []) || []; } catch (e) { return []; } }

  function rakim(ap) {
    if (!ap || !isFinite(ap.lat) || !isFinite(ap.lon)) return Promise.resolve(null);
    var k = Number(ap.lat).toFixed(4) + ',' + Number(ap.lon).toFixed(4), c = rj(RAKIM, {});
    if (c[k] != null) return Promise.resolve(c[k]);
    if (typeof global.fetch !== 'function') return Promise.resolve(null);
    return global.fetch('https://api.open-meteo.com/v1/elevation?latitude=' + ap.lat + '&longitude=' + ap.lon)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var e = j && j.elevation && j.elevation[0]; if (!isFinite(e)) return null; c = rj(RAKIM, {}); c[k] = Math.round(e); wj(RAKIM, c); return c[k]; })
      .catch(function () { return null; });
  }
  function rakimHazir(ap) { if (!ap) return null; var c = rj(RAKIM, {}); return c[Number(ap.lat).toFixed(4) + ',' + Number(ap.lon).toFixed(4)]; }

  function seri(apId) { var p = P2(); return p && p.netArtis ? p.netArtis(apId, 100000) : []; }
  function kayan(s, w) { var o = []; for (var i = w - 1; i < s.length; i++) { var t = 0; for (var j = i - w + 1; j <= i; j++) t += s[j].kg; o.push(t / w); } return o; }

  /* Eşik öğrenme: pozitif kayan ortalamaların 20. yüzdeliği → "artış bitti" eşiği; ≤eşik serilerinin medyan uzunluğu → gün eşiği (2–7). */
  function esikOgren(apId) {
    var th = T(), s = seri(apId); if (s.length < (th.rotaMinGun || 14)) return null;
    var w = Math.max(2, Math.min(th.rotaPencere || 7, Math.floor(s.length / 2))), ma = kayan(s, w).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var esik = ma.length ? ma[Math.floor(ma.length * 0.2)] * 0.25 : 0;
    var runs = [], r = 0; s.forEach(function (x) { if (x.kg <= esik) r++; else { if (r) runs.push(r); r = 0; } }); if (r) runs.push(r);
    runs.sort(function (a, b) { return a - b; });
    var gun = runs.length ? Math.max(2, Math.min(7, runs[Math.floor(runs.length / 2)])) : (th.tasNegGun || 3);
    return { esikKg: Math.round(esik * 100) / 100, gun: gun, pencere: w, kayitGun: s.length };
  }

  function ilceVeri(il, ilce) {
    var th = T(), d = D(), H = [], best = null;
    aps().filter(function (a) { return n(a.il) === n(il) && n(a.ilce) === n(ilce); }).forEach(function (a) {
      var hv = 0; try { hv = d.loadHives().filter(function (h) { return String(h.apiaryId) === String(a.id); }).length; } catch (e) { /* */ }
      var by = {}; try { (d.harvests ? d.harvests.list({ apiaryId: a.id }) : []).forEach(function (h) { var y = String(h.date || '').slice(0, 4); if (y && Number(h.honeyKg) > 0) by[y] = (by[y] || 0) + Number(h.honeyKg); }); } catch (e) { /* */ }
      Object.keys(by).forEach(function (y) { H.push(by[y] / Math.max(1, hv || a.hiveCount || 1)); });
      var s = seri(a.id), w = th.rotaPencere || 7;
      if (s.length >= w) { var m = Math.max.apply(null, kayan(s, w)); if (best == null || m > best) best = m; }
    });
    return { H: H.length ? H.reduce(function (x, y) { return x + y; }, 0) / H.length : null, T: best };
  }
  function tumIlceler() { var o = {}; aps().forEach(function (a) { if (a.il && a.ilce) o[n(a.il) + '|' + n(a.ilce)] = { il: a.il, ilce: a.ilce }; }); return Object.keys(o).map(function (k) { return o[k]; }); }
  function rotaPuan(il, ilce) {
    var th = T(), v = ilceVeri(il, ilce); if (v.H == null && v.T == null) return { puan: null, metin: 'Henüz kayıt yok' };
    var Hm = 0, Tm = 0; tumIlceler().forEach(function (x) { var q = ilceVeri(x.il, x.ilce); if (q.H > Hm) Hm = q.H; if (q.T > Tm) Tm = q.T; });
    var wH = th.rotaHasatAg == null ? 0.5 : th.rotaHasatAg, wT = th.rotaTartiAg == null ? 0.5 : th.rotaTartiAg, top = 0, ag = 0;
    if (v.H != null && Hm > 0) { top += wH * v.H / Hm; ag += wH; }
    if (v.T != null && Tm > 0) { top += wT * Math.max(0, v.T) / Tm; ag += wT; }
    if (!ag) return { puan: null, metin: 'Henüz kayıt yok' };
    return { puan: Math.round(100 * top / ag), metin: '' };
  }

  /* Artış bitti mi? Öğrenilmiş eşik varsa tartı serisi; yoksa yalnız ay aralığı. null = karar verilemez. */
  function artisBitti(ap) {
    var e = esikOgren(ap.id), s = seri(ap.id);
    if (e) { var son = s.slice(-e.gun); return { bitti: son.length >= e.gun && son.every(function (x) { return x.kg <= e.esikKg; }), yontem: 'tarti', esik: e }; }
    var dn = C() ? C().donem({ il: ap.il, ilce: ap.ilce }) : null;
    if (dn && dn.durum === 'var') return { bitti: !dn.aktif, yontem: 'ay' };
    return null;
  }
  function yonlendir(apId, ay) {
    var all = aps(), ap = all.filter(function (a) { return String(a.id) === String(apId); })[0]; if (!ap) return { durum: 'veri_yok', metin: 'Veri yok' };
    var b = artisBitti(ap); if (!b) return { durum: 'veri_yok', metin: 'Veri yok' };
    if (!b.bitti) return { durum: 'devam', metin: '' };
    ay = ay || (new Date().getMonth() + 1);
    var kayitli = all.filter(function (a) { return String(a.id) !== String(apId); }).map(function (a) {
      var x = artisBitti(a), dn = C() ? C().donem({ il: a.il, ilce: a.ilce }, ay) : null;
      var uygun = x ? !x.bitti : !!(dn && dn.aktif); return uygun ? { ap: a, p: rotaPuan(a.il, a.ilce) } : null;
    }).filter(Boolean).sort(function (x, y) { return (y.p.puan == null ? -1 : y.p.puan) - (x.p.puan == null ? -1 : x.p.puan); });
    if (kayitli.length) { var k = kayitli[0]; return { durum: 'kayitli', hedef: { apiaryId: k.ap.id, ad: k.ap.name, il: k.ap.il, ilce: k.ap.ilce }, puan: k.p.puan, puanMetin: k.p.metin,
      metin: ap.name + ': artış durdu. ' + k.ap.name + ' yerini kontrol et, taşınmayı planla.' }; }
    var mevcut = {}; all.forEach(function (a) { mevcut[n(a.il) + '|' + n(a.ilce)] = 1; });
    var dis = (C() ? C().adaylar(ay) : []).filter(function (x) { return !mevcut[n(x.il) + '|' + n(x.ilce)]; })
      .map(function (x) { return { x: x, p: rotaPuan(x.il, x.ilce), r: C().bul(x.il, x.ilce) }; })
      .filter(function (o) { return o.r.some(function (r) { return r.dogrulandi !== false; }); });
    if (!dis.length) return { durum: 'veri_yok', metin: 'Veri yok' };
    /* EK9: resmi bal ormanı (bal_ormanlari) — su ve alan uygun olanlar öne; doluluk bilinmez, "boş/uygun" denmez */
    var BO = (global.SuperAriCevre && global.SuperAriCevre.balOrmanlari) ? global.SuperAriCevre.balOrmanlari() : [];
    var adayBO = filtreRota(dis.map(function (o) { var b = BO.filter(function (z) { return n(z.il) === n(o.x.il) && n(z.ilce) === n(o.x.ilce); })[0];
      return { il: o.x.il, ilce: o.x.ilce, bo: b || null, guven: b ? 0.8 : 0.6, su_m: b ? b.su_kaynagi_mesafe_metre : null, alan: b ? b.toplama_alani_guvenli : null }; }));
    if (!adayBO.length) return { durum: 'veri_yok', metin: 'Veri yok' };
    var hd = adayBO[0], ad = hd.bo ? hd.ilce + ' – ' + hd.bo.ad + (hd.bo.kovan_kapasitesi ? ', kapasite ' + hd.bo.kovan_kapasitesi + ' kovan' : '') : hd.ilce + ' (' + hd.il + ')';
    return { durum: 'harici', hedef: { il: hd.il, ilce: hd.ilce, balOrmani: hd.bo ? hd.bo.ad : null }, puan: null, puanMetin: 'Henüz kayıt yok', guven: hd.guven, notlar: hd.notlar,
      metin: ap.name + ': artış durdu. Kayıtlı arılıklarında uygun yer yok; ' + ad + ' şu an çiçeklenme döneminde. Yeri kontrol et, taşınmayı planla.' + (hd.notlar && hd.notlar.length ? ' ' + hd.notlar.filter(function (t) { return !/Veri yok/.test(t); }).join('. ') : '') };
  }

  /* ---- k161 EK9: su riski + toplama alanı + rota filtresi (saf fonksiyonlar) ---- */
  /** Kademeli su riski: ≤suGuvenliM → 0; arası doğrusal; >suRiskliM → 1. Mesafe yoksa null. */
  function suRiski(m, th) {
    th = th || T(); var a = th.suGuvenliM || 500, b = th.suRiskliM || 1500;
    if (m == null || !isFinite(m)) return { risk: null, metin: 'Veri yok' };
    var r = m <= a ? 0 : (m >= b ? 1 : (m - a) / (b - a));
    return { risk: Math.round(r * 100) / 100, metin: m <= a ? '' : (m > b ? 'Su kaynağı çok uzak, sulak koymadan taşıma' : 'Su kaynağı uzak, sulak koy') };
  }
  /** Üç durumlu: oran yoksa null; doğal örtü ≥ eşik ve aktif ilaçlama notu yoksa true, değilse false. */
  function toplamaAlaniGuvenli(oranlar, aktifIlaclama, th) {
    th = th || T();
    if (!oranlar || typeof oranlar !== 'object') return null;
    var o = ['agac', 'calilik', 'cayir'].map(function (k) { return Number(oranlar[k]); });
    if (o.some(function (x) { return !isFinite(x); })) return null;
    if (aktifIlaclama) return false;
    return o[0] + o[1] + o[2] >= (th.alanDogalOran == null ? 0.5 : th.alanDogalOran);
  }
  /** adaylar: [{ il, ilce, ad?, guven(0–1), su_m, alan(true|false|null) }] → uygunlar güvene göre sıralı. alan=false düşer. */
  function filtreRota(adaylar, th) {
    th = th || T(); var w = th.suRiskAgirlik == null ? 0.6 : th.suRiskAgirlik, vy = th.veriYokCarpan == null ? 0.8 : th.veriYokCarpan;
    var uzak = th.suUzakMod === 'cikar' ? 'cikar' : 'alta', bM = th.suRiskliM || 1500;
    return (adaylar || []).filter(function (x) { return x && x.alan !== false && !(uzak === 'cikar' && x.su_m != null && x.su_m > bM); }).map(function (x) {
      var sr = suRiski(x.su_m, th), g = x.guven == null ? 0.5 : x.guven, notlar = [];
      if (sr.risk == null) { g *= vy; notlar.push('Su: Veri yok'); } else { g *= (1 - w * sr.risk); if (sr.metin) notlar.push(sr.metin); }
      if (x.alan == null) { g *= vy; notlar.push('Toplama alanı: Veri yok'); }
      return Object.assign({}, x, { guven: Math.round(g * 100) / 100, suRisk: sr.risk, notlar: notlar, altta: x.su_m != null && x.su_m > bM });
    }).sort(function (a, b) { return (a.altta - b.altta) || (b.guven - a.guven); });
  }

  /* ---- k161 EK11: arılık koşulları yeniden değerlendirme → ALARM_ARILIK_KOSUL_01 (sessiz kural uygulanmaz) ---- */
  var KOSUL = 'superari.arilik.kosul.v1';
  /** kosul: { su_m, alan(true|false|null), floraAktif(true|false|null), ilaclama(bool) }. Döner: { durum, acik:[nedenler], uyari|null, kapanan:[...] } */
  function kosulDegerlendir(apId, kosul, th) {
    th = th || T(); kosul = kosul || {};
    var su = suRiski(kosul.su_m, th), neden = {};
    if (su.risk != null && su.risk > 0) neden.su = su.risk > 0.999 ? 'cok_uzak' : 'uzak';
    if (kosul.floraAktif === false) neden.flora = 1;
    if (kosul.alan === false && kosul.ilaclama) neden.alan = 1;
    var veriYok = su.risk == null && kosul.floraAktif == null && kosul.alan == null;
    var all = rj(KOSUL, {}), eski = all[apId] || { acik: {} }, yeniAcik = {}, uyNeden = [];
    Object.keys(neden).forEach(function (k) { var v = String(neden[k]); yeniAcik[k] = v; if (eski.acik[k] !== v) uyNeden.push(k); });
    var kapanan = Object.keys(eski.acik).filter(function (k) { return !yeniAcik[k]; });
    all[apId] = { acik: yeniAcik, at: new Date().toISOString() }; wj(KOSUL, all);
    if (veriYok) return { durum: 'veri_yok', metin: 'Veri yok', acik: [], uyari: null, kapanan: kapanan };
    var uy = null;
    if (uyNeden.length) {
      var aks = [];
      if (uyNeden.indexOf('su') >= 0) aks.push('Sulak koy.');
      if (uyNeden.indexOf('flora') >= 0) aks.push('Besleme planla.');
      if (uyNeden.indexOf('alan') >= 0) aks.push('Kovan girişlerini kapat, taşınmayı planla.');
      var oneri = null;
      if (uyNeden.indexOf('flora') >= 0 || uyNeden.indexOf('alan') >= 0) { try { oneri = yonlendir(apId); } catch (e) { oneri = null; } if (oneri && !oneri.hedef) oneri = null; }
      uy = { kod: 'ALARM_ARILIK_KOSUL_01', apiaryId: apId, baslik: 'Arılık koşulları değişti', metin: 'Bu arılığın koşulları değişti. Kontrol et.', aksiyon: aks.join(' '), nedenler: uyNeden,
        onay: oneri ? { soru: oneri.metin + ' Onaylıyor musun?', hedef: oneri.hedef, tip: 'tasinma' } : null };
    }
    var K = global.SuperAriKritik; if (K) { if (uy) K.ac({ kod: uy.kod, anahtar: apId, apiaryId: apId, aksiyon: uy.aksiyon, onay: uy.onay }); else if (kapanan.length && !Object.keys(yeniAcik).length) K.iyilesti('ALARM_ARILIK_KOSUL_01', apId); }
    return { durum: 'tamam', acik: Object.keys(yeniAcik), uyari: uy, kapanan: kapanan };
  }
  global.SuperAriRota = { rakim: rakim, rakimHazir: rakimHazir, esikOgren: esikOgren, rotaPuan: rotaPuan, artisBitti: artisBitti, yonlendir: yonlendir, _kayan: kayan, suRiski: suRiski, toplamaAlaniGuvenli: toplamaAlaniGuvenli, filtreRota: filtreRota, kosulDegerlendir: kosulDegerlendir };
})(typeof window !== 'undefined' ? window : globalThis);
