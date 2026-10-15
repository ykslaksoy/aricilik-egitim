/* SüperArı · Çiçeklenme takvimi (koloni-167).
 * Veri: TAGEM 2022 il/ilçe çiçeklenme dönemi (yalnız 6 il yerelde: cicek-veri.js) + Supabase cicek_takvimi (ilçe bazlı sorgu).
 * Kaynak bilgisi yalnız yönetici panelinde gösterilir. Eksik il → "Veri yok" + panel isteği takvim_eksik: <il>. */
(function (global) {
  'use strict';
  var CACHE = 'superari.cicek.cache.v1', ISTEK = 'superari.cicek.eksik.v1';
  function rj(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function norm(s) { return String(s || '').trim().toLocaleLowerCase('tr').replace(/\s*\(.*?\)\s*/g, '').replace(/\s+/g, ' '); }
  function rows() { var d = global.SuperAriCicekVeri; return (d && d.rows ? d.rows : []).concat(rj(CACHE, [])); }
  function iller() { var o = {}; rows().forEach(function (r) { o[norm(r.il)] = 1; }); return o; }
  function bul(il, ilce) {
    var I = norm(il), C = norm(ilce);
    return rows().filter(function (r) { return norm(r.il) === I && (!C || norm(r.ilce) === C || norm(r.ilce).indexOf(C) === 0); });
  }
  function ayIc(ay, a1, a2) { return a1 <= a2 ? ay >= a1 && ay <= a2 : ay >= a1 || ay <= a2; }
  /* Ay aralığı: satırların birleşimi (en erken başlangıç → en geç bitiş). */
  function donem(q, ay) {
    q = q || {}; ay = ay || (new Date().getMonth() + 1);
    var L = bul(q.il, q.ilce).filter(function (r) { return r.ay1 && r.ay2; });
    if (!L.length) { if (q.il && !iller()[norm(q.il)]) eksik(q.il); else if (q.il) sorgula(q.il, q.ilce); return { durum: 'veri_yok', metin: 'Veri yok' }; }
    var a1 = Math.min.apply(null, L.map(function (r) { return r.ay1; })), a2 = Math.max.apply(null, L.map(function (r) { return r.ay2; }));
    var aktif = L.some(function (r) { return ayIc(ay, r.ay1, r.ay2); });
    var bas = ((a1 - ay) + 12) % 12;
    return { durum: 'var', il: L[0].il, ilce: L[0].ilce, ay1: a1, ay2: a2, aktif: aktif, ayaKalan: aktif ? 0 : bas, dogrulandi: L.every(function (r) { return r.dogrulandi !== false; }),
      bitki: L.map(function (r) { return r.baskin_flora || r.nektar || ''; }).filter(Boolean).join(', ') };
  }
  function client() { var B = global.SuperAriBulut; try { return B && B.client ? B.client() : null; } catch (e) { return null; } }
  var bekleyen = {};
  function sorgula(il, ilce) {
    var c = client(), k = norm(il) + '|' + norm(ilce); if (!c || bekleyen[k]) return; bekleyen[k] = 1;
    var q = c.from('cicek_takvimi').select('il,ilce,ay1,ay2,nektar,polen,baskin_flora,resmi_ay_araligi,dogrulandi').eq('il', il);
    if (ilce) q = q.eq('ilce', ilce);
    q.then(function (r) { if (r && r.data && r.data.length) { var C = rj(CACHE, []).concat(r.data); wj(CACHE, C.slice(-500)); try { global.dispatchEvent(new Event('superari-cicek')); } catch (e) { /* */ } } });
  }
  function eksik(il) {
    var L = rj(ISTEK, []), k = norm(il); if (L.indexOf(k) >= 0) return; L.push(k); wj(ISTEK, L);
    var c = client(); if (c) try { c.from('takvim_eksik').insert({ il: String(il).trim(), istek: 'takvim_eksik: ' + String(il).trim() }).then(function () {}); } catch (e) { /* */ }
  }
  function adaylar(ay) {
    ay = ay || (new Date().getMonth() + 1); var o = {};
    rows().forEach(function (r) { if (r.ay1 && ayIc(ay, r.ay1, r.ay2)) o[norm(r.il) + '|' + norm(r.ilce)] = { il: r.il, ilce: r.ilce }; });
    return Object.keys(o).map(function (k) { return o[k]; });
  }
  global.SuperAriCicek = { donem: donem, bul: bul, adaylar: adaylar, eksik: eksik, eksikler: function () { return rj(ISTEK, []); }, ayIc: ayIc };
})(typeof window !== 'undefined' ? window : globalThis);
