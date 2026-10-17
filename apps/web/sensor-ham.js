/* koloni-241: Sensör geçmişi — ham okumalar telefonda IndexedDB'de (kovan / tür / zaman), sunucuda süresiz arşiv.
 * - Telefon: ham okumalar hamSaklaGun (varsayılan 30, uzman tahmini; yönetici panelinden) gün tutulur; buluta gönderilmemiş okuma silinmez
 *   (en çok hamSaklaGun + 60 gün). Kurallar için bellekte yalnız hiveSensGun (varsayılan 21) günlük pencere.
 * - Eski localStorage anahtarları (superari.sensor.<tür>.v1) bir kez taşınır, sonra silinir (Safari ~5 MB sınırı).
 * - Sunucu: gönderilmemiş okumalar arılık + gün başına gzip NDJSON paketleri olarak özel «sensor-ham» kovasına,
 *   dizin satırı sensor_ham_arsiv tablosuna. Çevrimdışıysa kuyrukta bekler, artan aralıkla yeniden denenir. Devre dışı cihaz okumaları
 *   da arşivlenir ama işaretlenir (dd: 1). Demo okumaları gönderilmez.
 * - Günlük özetler (kovan × gün) hem telefonda (ozetSaklaGun, varsayılan 400) hem sunucuda (sensor_gunluk, süresiz) — yeni telefonda geri okunur.
 * IndexedDB yoksa (eski tarayıcı / test) aktif() false döner ve çağıranlar eski localStorage yolunu kullanır. */
(function (g) {
  'use strict';
  var TIPLER = ['tarti', 'isi_nem', 'ses', 'titresim', 'ir', 'pil', 'dis_isi_nem'];
  var DBAD = 'superari-sensor', DBSURUM = 1, TASINDI = 'superari.sensor.ham.tasindi.v1', DURUM = 'superari.sensor.ham.durum.v1', KOVA = 'sensor-ham';
  var D = 864e5, VARS = { hamSaklaGun: 30, hiveSensGun: 21, ozetSaklaGun: 400 };
  function eskiAnahtar(tip) { return 'superari.sensor.' + tip + '.v1'; }
  function ls() { try { return g.localStorage || null; } catch (e) { return null; } }
  function rj(k, d) { try { var v = JSON.parse(ls().getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function wj(k, v) { try { ls().setItem(k, JSON.stringify(v)); } catch (e) { /* kota */ } }
  /** Saklama ayarları: ogul_skor_ayar.sensor (yönetici paneli) → yoksa varsayılan (uzman tahmini). */
  function ayar() {
    var s = {}; try { var C = g.SuperAriDemo && g.SuperAriDemo.colony; s = (C && C.ogulSkor && C.ogulSkor() && C.ogulSkor().sensor) || {}; } catch (e) { s = {}; }
    var o = {}; Object.keys(VARS).forEach(function (k) { var v = Number(s[k]); o[k] = isFinite(v) && v > 0 ? v : VARS[k]; });
    o.pencereGun = Math.max(o.hiveSensGun, 8); return o;
  }
  function zaman(x) { var a = String(x && x.at || ''); var t = Date.parse(a.length <= 16 && a.length > 10 ? a + ':00' : a); return isFinite(t) ? t : (x && isFinite(x.t) ? x.t : NaN); }
  /** Yerel gün anahtarı (YYYY-MM-DD, telefon saatine göre — gece 00–05 kuralı da yerel saat kullanır) */
  function gunKey(t) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function gunBas(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }

  var idbVar = !!(g.indexedDB && g.IDBKeyRange) && !g.SA_SENSOR_HAM_LS;
  var MEM = {}, SIRALI = {}, OZET = {}, surum = 0, hazir = !idbVar, dbP = null, YAZ = [], yazZ = null, yukZ = null, ozetZ = null, KIRLI = {};
  TIPLER.forEach(function (t) { MEM[t] = []; SIRALI[t] = true; });
  function bump() { surum++; }
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      var r; try { r = g.indexedDB.open(DBAD, DBSURUM); } catch (e) { return rej(e); }
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('ham')) { var s = d.createObjectStore('ham', { keyPath: 'id', autoIncrement: true }); s.createIndex('t', 't'); s.createIndex('y', 'y'); s.createIndex('kovan_tip_t', ['k', 'tip', 't']); }
        if (!d.objectStoreNames.contains('gunluk')) { var o = d.createObjectStore('gunluk', { keyPath: 'k' }); o.createIndex('gun', 'gun'); o.createIndex('y', 'y'); }
      };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error || new Error('IndexedDB açılamadı')); };
      r.onblocked = function () { rej(new Error('IndexedDB meşgul')); };
    });
    return dbP;
  }
  function islem(stores, mode, fn) {
    return db().then(function (d) { return new Promise(function (res, rej) { var tx = d.transaction(stores, mode), out = fn(tx); tx.oncomplete = function () { res(out && out.__sonuc !== undefined ? out.__sonuc : out); }; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error('iptal')); }; }); });
  }
  function hepsi(req, out) { req.onsuccess = function () { out.__sonuc = req.result || []; }; return out; }
  function kayit(tip, r, demoMu) {
    var t = zaman(r), k = r.hiveId != null && isFinite(Number(r.hiveId)) ? String(Number(r.hiveId)) : (tip === 'pil' ? 'c:' + String(r.deviceId || '') : '-1'), dd = 0;
    try { var DV = g.SuperAriDevices; if (DV && DV.okumaKapali && r.hiveId != null && DV.okumaKapali(r.hiveId, tip)) dd = 1; } catch (e) { dd = 0; }
    var a = r.apiaryId != null ? String(r.apiaryId) : null;
    if (a == null && r.hiveId != null) { try { var f = g.SuperAriSensorHamArilik; a = f ? f(r.hiveId) : null; } catch (e2) { a = null; } }
    return { t: t, tip: tip, k: k, a: a, y: demoMu || r.demo ? 2 : 0, dd: dd, r: r };
  }
  function bellekEkle(tip, r) {
    var L = MEM[tip] || (MEM[tip] = []); if (L.length && zaman(L[L.length - 1]) > zaman(r)) SIRALI[tip] = false; L.push(r);
  }
  function bellekBuda() {
    var cut = Date.now() - ayar().pencereGun * D;
    TIPLER.forEach(function (tip) { var L = MEM[tip]; if (L.length && zaman(L[0]) < cut) MEM[tip] = L.filter(function (x) { return zaman(x) >= cut; }); });
  }
  /** Bellekteki okumalar (eski satır biçimi: { hiveId, at, ... }), zamana göre sıralı. IndexedDB yokken eski localStorage anahtarı. */
  function list(tip) {
    if (!idbVar || (!hazir && !rj(TASINDI, null))) { var l = rj(eskiAnahtar(tip), []); return Array.isArray(l) ? l : []; }
    if (!SIRALI[tip]) { MEM[tip].sort(function (a, b) { return zaman(a) - zaman(b); }); SIRALI[tip] = true; }
    return MEM[tip] || [];
  }
  /** Yeni okuma. Dönen true: depoya alındı (IndexedDB yolu); false: çağıran eski yolu kullanmalı. */
  function ekle(tip, r) {
    if (!idbVar || !r || TIPLER.indexOf(tip) < 0) return false;
    var t = zaman(r); if (!isFinite(t)) return true;
    if (t >= Date.now() - ayar().pencereGun * D) bellekEkle(tip, r);
    YAZ.push(kayit(tip, r)); bump();
    if (r.hiveId != null) KIRLI[String(Number(r.hiveId)) + '|' + gunKey(t)] = 1;
    if (!yazZ) yazZ = setTimeout(yazBosalt, 400);
    zamanla(120000); ozetZamanla(30000);
    return true;
  }
  function yazBosalt() {
    yazZ = null; var b = YAZ.splice(0, YAZ.length); if (!b.length) return Promise.resolve(0);
    return islem(['ham'], 'readwrite', function (tx) { var s = tx.objectStore('ham'); b.forEach(function (x) { s.add(x); }); }).then(function () { return b.length; }, function () { YAZ = b.concat(YAZ); return 0; });
  }
  /* ---- taşıma: eski localStorage anahtarları → IndexedDB (bir kez), sonra silinir ---- */
  function tasi() {
    /* taşındıktan sonra eski (önbellekteki) bir sayfa yine localStorage'a yazdıysa o anahtarlar da taşınır */
    var hepsiK = [], anahtar = [];
    TIPLER.forEach(function (tip) { var l = rj(eskiAnahtar(tip), null); if (!Array.isArray(l)) return; anahtar.push(eskiAnahtar(tip)); l.forEach(function (r) { if (r && isFinite(zaman(r))) hepsiK.push(kayit(tip, r)); }); });
    if (!anahtar.length) { if (!rj(TASINDI, null)) wj(TASINDI, { at: new Date().toISOString(), adet: 0 }); return Promise.resolve(0); }
    return islem(['ham'], 'readwrite', function (tx) { var s = tx.objectStore('ham'); hepsiK.forEach(function (x) { s.add(x); }); }).then(function () {
      var once = rj(TASINDI, null); wj(TASINDI, { at: (once && once.at) || new Date().toISOString(), adet: ((once && once.adet) || 0) + hepsiK.length, son: new Date().toISOString() });
      anahtar.forEach(function (k) { try { ls().removeItem(k); } catch (e) { /* */ } });
      return hepsiK.length;
    });
  }
  function yukleBellek() {
    var a = ayar(), cut = Date.now() - a.pencereGun * D;
    return islem(['ham', 'gunluk'], 'readonly', function (tx) {
      var out = { ham: null, oz: null };
      var r1 = tx.objectStore('ham').index('t').getAll(g.IDBKeyRange.lowerBound(cut)); r1.onsuccess = function () { out.ham = r1.result || []; };
      var r2 = tx.objectStore('gunluk').getAll(); r2.onsuccess = function () { out.oz = r2.result || []; };
      return { get __sonuc() { return out; } };
    }).then(function (o) {
      TIPLER.forEach(function (t) { MEM[t] = []; SIRALI[t] = false; });
      (o.ham || []).forEach(function (x) { if (x && x.r && MEM[x.tip]) MEM[x.tip].push(x.r); });
      YAZ.forEach(function (x) { if (x.t >= cut && MEM[x.tip]) MEM[x.tip].push(x.r); });
      OZET = {}; (o.oz || []).forEach(function (x) { (OZET[x.hiveId] || (OZET[x.hiveId] = {}))[x.gun] = x; });
      return true;
    });
  }
  /** Telefondaki budama: gönderilmiş (ya da demo) ham okumalar hamSaklaGun'den eskiyse silinir; gönderilmemişler en çok +60 gün bekler. Özetler ozetSaklaGun. */
  function buda() {
    var a = ayar(), now = Date.now(), c1 = now - a.hamSaklaGun * D, c2 = now - (a.hamSaklaGun + 60) * D, oc = gunKey(now - a.ozetSaklaGun * D), n = 0;
    return islem(['ham', 'gunluk'], 'readwrite', function (tx) {
      var cur = tx.objectStore('ham').index('t').openCursor(g.IDBKeyRange.upperBound(c1, true));
      cur.onsuccess = function () { var c = cur.result; if (!c) return; var v = c.value; if (v.y !== 0 || v.t < c2) { c.delete(); n++; } c.continue(); };
      var c3 = tx.objectStore('gunluk').index('gun').openCursor(g.IDBKeyRange.upperBound(oc, true));
      c3.onsuccess = function () { var c = c3.result; if (!c) return; c.delete(); c.continue(); };
      return { get __sonuc() { return n; } };
    }).catch(function () { return 0; });
  }
  /* ---- günlük özetler ---- */
  function ozetZamanla(ms) { if (!idbVar || ozetZ || typeof setTimeout !== 'function') return; ozetZ = setTimeout(function () { ozetZ = null; ozetGuncelle(); }, ms); }
  /** Bellekteki okumalardan kovan × gün özeti (kirli günler + eksik geçmiş günler). Hesap demo-data.js › gunlukOzetHesapla (kural ayarlarıyla aynı). */
  function ozetGuncelle(hepsiMi) {
    var C = g.SuperAriDemo && g.SuperAriDemo.colony; if (!C || !C.gunlukOzetHesapla) return Promise.resolve(0);
    var by = {}, bugun = gunKey(Date.now());
    TIPLER.forEach(function (tip) { list(tip).forEach(function (r) { if (r.hiveId == null) return; var t = zaman(r); if (!isFinite(t)) return; var k = String(Number(r.hiveId)) + '|' + gunKey(t); var o = by[k] || (by[k] = {}); (o[tip] || (o[tip] = [])).push(Object.assign({ t: t }, r)); }); });
    var yaz = [];
    Object.keys(by).forEach(function (k) {
      var p = k.split('|'), var0 = OZET[p[0]] && OZET[p[0]][p[1]];
      if (!hepsiMi && var0 && !KIRLI[k] && p[1] !== bugun && var0.tam) return;
      var oz = C.gunlukOzetHesapla(by[k], gunBas(p[1]));
      var ap = null; ['isi_nem', 'tarti', 'ir', 'ses', 'titresim'].some(function (tp) { var L = by[k][tp]; if (L && L.length && L[0].apiaryId != null) { ap = String(L[0].apiaryId); return true; } return false; });
      if (ap == null) { try { var f = g.SuperAriSensorHamArilik; ap = f ? f(p[0]) : null; } catch (e) { ap = null; } }
      var demo = Object.keys(by[k]).every(function (tp) { return by[k][tp].every(function (x) { return x.demo; }); });
      var rec = { k: k, hiveId: p[0], gun: p[1], apiaryId: ap, ozet: oz, guncel: Date.now(), tam: p[1] < bugun, y: demo ? 2 : 0, kaynak: 'telefon' };
      yaz.push(rec); (OZET[p[0]] || (OZET[p[0]] = {}))[p[1]] = rec;
    });
    KIRLI = {};
    if (!yaz.length) return Promise.resolve(0);
    bump();
    return islem(['gunluk'], 'readwrite', function (tx) { var s = tx.objectStore('gunluk'); yaz.forEach(function (x) { s.put(x); }); }).then(function () { zamanla(60000); return yaz.length; }, function () { return 0; });
  }
  /** Kovanın günlük özetleri: { 'YYYY-MM-DD': ozet } */
  function ozetler(hid) { var M = OZET[String(Number(hid))] || {}, o = {}; Object.keys(M).forEach(function (k) { o[k] = M[k].ozet || {}; }); return o; }
  /* ---- sunucu: gzip NDJSON arşivi + özet eşitleme ---- */
  function gzip(text) {
    if (g.CompressionStream && g.Response && g.Blob) {
      try { var st = new g.Blob([text]).stream().pipeThrough(new g.CompressionStream('gzip')); return new g.Response(st).blob().then(function (b) { return { blob: new g.Blob([b], { type: 'application/gzip' }), sik: 'gzip', uzanti: '.ndjson.gz' }; }); } catch (e) { /* düz */ }
    }
    return Promise.resolve({ blob: new g.Blob([text], { type: 'application/x-ndjson' }), sik: 'yok', uzanti: '.ndjson' });
  }
  function gunTSI(t) { return new Date(t + 3 * 36e5).toISOString().slice(0, 10); }
  /** Gönderilmemiş okumaları arılık + gün paketleri hâlinde yükler. { gonderilen, paket, bekleyen, hata } */
  var mesgul = null, deneme = 0;
  function zamanla(ms) {
    if (!idbVar || typeof setTimeout !== 'function') return; if (yukZ) return;
    yukZ = setTimeout(function () { yukZ = null; yukle().then(function (r) { if (r && r.hata) { deneme = Math.min(deneme + 1, 6); zamanla(Math.min(36e5, 60000 * Math.pow(2, deneme))); } else if (r && r.bekleyen) { deneme = 0; zamanla(5000); } else deneme = 0; }); }, ms);
  }
  function canliMi() { try { return ls().getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function durumYaz(p) { var s = rj(DURUM, {}) || {}; Object.keys(p).forEach(function (k) { s[k] = p[k]; }); wj(DURUM, s); try { g.dispatchEvent(new CustomEvent('superari:sensor-ham-durum', { detail: s })); } catch (e) { /* */ } return s; }
  function yukle() {
    if (!idbVar) return Promise.resolve({ gonderilen: 0, bekleyen: 0, neden: 'IndexedDB yok' });
    if (mesgul) return mesgul;
    var B = g.SuperAriBulut;
    if (!B || !B.client || !B.session || !canliMi() || (g.navigator && g.navigator.onLine === false)) return bekleyenSay().then(function (n) { durumYaz({ bekleyen: n }); return { gonderilen: 0, bekleyen: n, neden: 'çevrimdışı / oturum yok' }; });
    var top = 0, paket = 0;
    mesgul = yazBosalt().then(function () { return B.session(); }).then(function (ses) {
      if (!ses) return { gonderilen: 0, bekleyen: null, neden: 'oturum yok' };
      return B.client().then(function (c) {
        return c.rpc('sa_telefon_hesap').then(function (h) {
          if (h.error || !h.data) throw (h.error || new Error('hesap'));
          var hesap = String(h.data);
          return islem(['ham'], 'readonly', function (tx) { return hepsi(tx.objectStore('ham').index('y').getAll(g.IDBKeyRange.only(0), 4000), {}); }).then(function (L) {
            var G = {}; (L || []).forEach(function (x) { var k = (x.a || 'genel') + '|' + gunTSI(x.t); (G[k] || (G[k] = [])).push(x); });
            return Object.keys(G).reduce(function (p, k) {
              return p.then(function () {
                var R = G[k].sort(function (a, b) { return a.t - b.t; }), parca = k.split('|'), ar = parca[0], gun = parca[1];
                var text = R.map(function (x) { var o = Object.assign({ tip: x.tip }, x.r); if (x.dd) o.dd = 1; return JSON.stringify(o); }).join('\n') + '\n';
                return gzip(text).then(function (z) {
                  var yol = hesap + '/' + ar.replace(/[^A-Za-z0-9_.-]/g, '_') + '/' + gun + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + z.uzanti;
                  return c.storage.from(KOVA).upload(yol, z.blob, { upsert: false, contentType: z.blob.type, cacheControl: '31536000' }).then(function (u) {
                    if (u && u.error) throw u.error;
                    var tip = {}, kv = {}, dd = 0; R.forEach(function (x) { tip[x.tip] = 1; if (x.k && x.k !== '-1') kv[x.k] = 1; if (x.dd) dd++; });
                    return c.rpc('sa_sensor_ham_kaydet', { p_yol: yol, p_arilik: ar === 'genel' ? null : ar, p_gun: gun, p_okuma: R.length, p_bayt: z.blob.size, p_ham_bayt: text.length, p_tipler: Object.keys(tip), p_kovanlar: Object.keys(kv), p_devre_disi: dd, p_bas: new Date(R[0].t).toISOString(), p_bit: new Date(R[R.length - 1].t).toISOString(), p_sikistirma: z.sik });
                  }).then(function (r) {
                    if (r && r.error) throw r.error;
                    return islem(['ham'], 'readwrite', function (tx) { var s = tx.objectStore('ham'); R.forEach(function (x) { x.y = 1; s.put(x); }); });
                  }).then(function () { top += R.length; paket++; });
                });
              });
            }, Promise.resolve()).then(function () { return ozetGonder(c); }).then(function () { return bekleyenSay(); }).then(function (n) {
              var s = durumYaz({ sonYukleme: new Date().toISOString(), sonHata: null, bekleyen: n, sonPaket: paket, sonOkuma: top });
              return { gonderilen: top, paket: paket, bekleyen: n, durum: s };
            });
          });
        });
      });
    }).catch(function (e) {
      var m = (e && e.message) || 'bağlantı';
      return bekleyenSay().then(function (n) { durumYaz({ sonHata: m, sonDeneme: new Date().toISOString(), bekleyen: n }); return { gonderilen: top, paket: paket, bekleyen: n, hata: m }; });
    }).then(function (r) { mesgul = null; return r; });
    return mesgul;
  }
  function bekleyenSay() { if (!idbVar) return Promise.resolve(0); return islem(['ham'], 'readonly', function (tx) { var r = tx.objectStore('ham').index('y').count(g.IDBKeyRange.only(0)), o = {}; r.onsuccess = function () { o.__sonuc = r.result; }; return o; }).catch(function () { return 0; }); }
  /** Özetleri sunucuya yaz (sa_sensor_gunluk_yaz, 200'lük paket). */
  function ozetGonder(c) {
    return islem(['gunluk'], 'readonly', function (tx) { return hepsi(tx.objectStore('gunluk').index('y').getAll(g.IDBKeyRange.only(0), 2000), {}); }).then(function (L) {
      var parca = []; for (var i = 0; i < (L || []).length; i += 200) parca.push(L.slice(i, i + 200));
      return parca.reduce(function (p, P) {
        return p.then(function () {
          return c.rpc('sa_sensor_gunluk_yaz', { p_satirlar: P.map(function (x) { return { kovan_id: x.hiveId, arilik_id: x.apiaryId, gun: x.gun, ozet: x.ozet, tam: !!x.tam }; }) }).then(function (r) {
            if (r && r.error) throw r.error;
            return islem(['gunluk'], 'readwrite', function (tx) { var s = tx.objectStore('gunluk'); P.forEach(function (x) { x.y = 1; s.put(x); }); });
          });
        });
      }, Promise.resolve());
    });
  }
  /** Yeni telefon / yeniden kurulum: sunucudaki özetleri geri oku (telefonda olmayan ya da daha eski olan günler). Günde bir kez. */
  function ozetGeriOku(zorla) {
    var B = g.SuperAriBulut, s = rj(DURUM, {}) || {}, bugun = gunKey(Date.now());
    if (!idbVar || !B || !B.client || !B.session || !canliMi()) return Promise.resolve(0);
    if (!zorla && s.geriOkuGun === bugun) return Promise.resolve(0);
    var a = ayar(), bas = gunKey(Date.now() - a.ozetSaklaGun * D), gelen = [];
    return B.session().then(function (ses) {
      if (!ses) return 0;
      return B.client().then(function (c) {
        function sayfa(from) {
          return c.from('sensor_gunluk').select('kovan_id,arilik_id,gun,ozet,tam,updated_at').gte('gun', bas).order('gun', { ascending: true }).range(from, from + 999).then(function (r) {
            if (r.error) throw r.error; var L = r.data || []; gelen = gelen.concat(L); return L.length === 1000 && from < 50000 ? sayfa(from + 1000) : null;
          });
        }
        return sayfa(0).then(function () {
          var yaz = [];
          gelen.forEach(function (x) {
            var hid = String(x.kovan_id), cur = OZET[hid] && OZET[hid][x.gun], ts = Date.parse(x.updated_at) || 0;
            if (cur && (cur.guncel || 0) >= ts) return;
            var rec = { k: hid + '|' + x.gun, hiveId: hid, gun: x.gun, apiaryId: x.arilik_id, ozet: x.ozet || {}, guncel: ts, tam: !!x.tam, y: 1, kaynak: 'sunucu' };
            yaz.push(rec); (OZET[hid] || (OZET[hid] = {}))[x.gun] = rec;
          });
          durumYaz({ geriOkuGun: bugun, geriOkunan: yaz.length });
          if (!yaz.length) return 0;
          bump(); olay('ozet');
          return islem(['gunluk'], 'readwrite', function (tx) { var st = tx.objectStore('gunluk'); yaz.forEach(function (x) { st.put(x); }); }).then(function () { return yaz.length; });
        });
      });
    }).catch(function () { return 0; });
  }
  function olay(neden) { try { g.dispatchEvent(new CustomEvent('superari:sensor-ham-hazir', { detail: { neden: neden, surum: surum } })); } catch (e) { /* */ } }
  /** Durum (ekranda / yönetici): bellek, bekleyen, son yükleme, taşıma */
  function durum() {
    var s = rj(DURUM, {}) || {}, n = 0; TIPLER.forEach(function (t) { n += (MEM[t] || []).length; });
    var oz = 0; Object.keys(OZET).forEach(function (h) { oz += Object.keys(OZET[h]).length; });
    return { aktif: idbVar, hazir: hazir, bellek: n, ozet: oz, bekleyen: s.bekleyen != null ? s.bekleyen : null, sonYukleme: s.sonYukleme || null, sonHata: s.sonHata || null, tasindi: rj(TASINDI, null), ayar: ayar() };
  }
  function baslat() {
    if (!idbVar) return Promise.resolve(false);
    return tasi().catch(function () { return 0; }).then(yukleBellek).then(function () {
      hazir = true; bump(); olay('acilis');
      setTimeout(function () { ozetGuncelle().then(function () { return buda(); }).then(function () { bellekBuda(); }); }, 1500);
      setTimeout(function () { ozetGeriOku(); zamanla(1000); }, 6000);
      return true;
    }).catch(function () {
      /* IndexedDB açılamadı (özel mod vb.) → eski localStorage yolu */
      idbVar = false; hazir = true; bump(); olay('ls'); return false;
    });
  }
  if (idbVar && typeof setTimeout === 'function') {
    baslat();
    if (g.addEventListener) {
      g.addEventListener('online', function () { zamanla(3000); });
      g.addEventListener('pagehide', function () { yazBosalt(); });
    }
    if (g.document && g.document.addEventListener) g.document.addEventListener('visibilitychange', function () { if (g.document.visibilityState === 'hidden') yazBosalt(); else zamanla(5000); });
  }
  g.SuperAriSensorHam = {
    TIPLER: TIPLER, VARS: VARS, aktif: function () { return idbVar; }, hazir: function () { return hazir; }, surum: function () { return surum; },
    list: list, ekle: ekle, ozetler: ozetler, ozetGuncelle: ozetGuncelle, yukle: yukle, ozetGeriOku: ozetGeriOku, buda: buda, durum: durum, ayar: ayar,
    gunKey: gunKey, gunBas: gunBas, gunTSI: gunTSI, eskiAnahtar: eskiAnahtar, baslat: baslat, yazBosalt: yazBosalt, bekleyenSay: bekleyenSay
  };
})(typeof window !== 'undefined' ? window : globalThis);
