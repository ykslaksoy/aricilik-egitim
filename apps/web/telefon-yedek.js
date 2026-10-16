/* Telefon yedeği — telefondaki tüm uygulama verisi (cihaz listesi, ayarlar, gönderilmemiş kayıtlar; SuperAriYedek.collect)
 * + fotoğraf dosyaları günde bir (ve «Şimdi eşitle ve yedekle»de) telefonda alınır, özel Storage kovasına (telefon-yedek) yüklenir.
 * Çevrimdışıysa yedek IndexedDB kuyruğunda bekler, bağlantı gelince gönderilir. Geri yükleme: önizleme (SuperAriYedek.plan) → onay →
 * önce şimdiki hâlin yedeği → uygulama → sa_telefon_geri_yukle_kaydet (değişiklik kaydı) → «Geri al» öncesi yedeği uygular. */
(function (g) {
  'use strict';
  var KOVA = 'telefon-yedek', SK = 'superari.bulut.telYedek', DB = 'superari-telyedek', OS = 'kuyruk';
  function st() { try { return JSON.parse(g.localStorage.getItem(SK)) || {}; } catch (e) { return {}; } }
  function stYaz(o) { try { g.localStorage.setItem(SK, JSON.stringify(o)); } catch (e) { /* dolu */ } try { g.dispatchEvent(new CustomEvent('superari-telefon-yedek', { detail: o })); } catch (e) { /* ignore */ } }
  function cihaz() {
    var s = st(); if (s.cihaz) return s;
    s.cihaz = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var ua = (g.navigator && g.navigator.userAgent) || '';
    s.cihazAd = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android telefon' : 'Tarayıcı';
    stYaz(s); return s;
  }
  function gunTSI(d) { return new Date((d ? new Date(d) : new Date()).getTime() + 3 * 36e5).toISOString().slice(0, 10); }
  /* ---- IndexedDB kuyruğu (çevrimdışı yedekler) ---- */
  function idb() { return new Promise(function (res, rej) { if (!g.indexedDB) return rej(new Error('IndexedDB yok')); var r = g.indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(OS, { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function tx(mode, fn) { return idb().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(OS, mode), out = fn(t.objectStore(OS)); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : true); }; t.onerror = function () { rej(t.error); }; }); }); }
  function kuyrukEkle(it) { return tx('readwrite', function (s) { s.put(it); }); }
  function kuyrukSil(id) { return tx('readwrite', function (s) { s.delete(id); }); }
  function kuyruk() { return tx('readonly', function (s) { return s.getAll(); }).then(function (x) { return Array.isArray(x) ? x : []; }).catch(function () { return []; }); }
  /* ---- toplama ---- */
  function fotoRows() { var F = g.SuperAriFoto; return F && F.allRows ? F.allRows().then(function (l) { return (l || []).filter(function (r) { return r && r.id && r.mode !== 'demo' && r.blob && typeof r.blob.size === 'number'; }); }).catch(function () { return []; }) : Promise.resolve([]); }
  function ozet(keys) {
    var o = {}, n = function (v) { return Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : (v == null ? 0 : 1)); };
    Object.keys(keys).forEach(function (k) { o[k] = n(keys[k]); }); return o;
  }
  function topla(tur) {
    var Y = g.SuperAriYedek; if (!Y) return Promise.reject(new Error('yedek.js yok'));
    var b = Y.collect(), s = cihaz();
    b.telefon = { cihaz: s.cihaz, cihazAd: s.cihazAd, tur: tur, tarih: gunTSI() };
    return fotoRows().then(function (rows) {
      b.fotoRef = rows.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== 'blob' && k !== 'thumb') o[k] = r[k]; }); o.dosya = 'foto/' + r.id + '.jpg'; return o; });
      return { yedek: b, fotolar: rows.map(function (r) { return { id: String(r.id), blob: r.blob }; }) };
    });
  }
  /* ---- gönderme ---- */
  function B() { return g.SuperAriBulut; }
  function hesap(c) { return c.rpc('sa_telefon_hesap').then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function fotoYukle(c, h, fotolar) {
    var yuk = st().fotoYuklu || {};
    return fotolar.reduce(function (p, f) {
      return p.then(function () {
        if (yuk[h + '/' + f.id]) return;
        return c.storage.from(KOVA).upload(h + '/foto/' + f.id + '.jpg', f.blob, { upsert: true, contentType: f.blob.type || 'image/jpeg', cacheControl: '31536000' }).then(function (r) {
          if (r.error && !/exist|duplicate/i.test(r.error.message || '')) throw r.error; yuk[h + '/' + f.id] = 1;
        });
      });
    }, Promise.resolve()).then(function () { var s2 = st(); s2.fotoYuklu = yuk; stYaz(s2); });
  }
  var mesgul = null, sonOncesi = null;
  function gonder(c, it) {
    return hesap(c).then(function (h) {
      var b = it.yedek, t = b.telefon, yol = h + '/' + t.cihaz + '/' + t.tarih + '-' + t.tur + (t.tur === 'oncesi' ? '-' + Date.parse(b.createdAt).toString(36) : '') + '.json';
      var blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
      return fotoYukle(c, h, it.fotolar || []).then(function () { return c.storage.from(KOVA).upload(yol, blob, { upsert: true, contentType: 'application/json' }); }).then(function (r) {
        if (r.error) throw r.error;
        return c.rpc('sa_telefon_yedek_kaydet', { p_cihaz: t.cihaz, p_cihaz_ad: t.cihazAd, p_tarih: t.tarih, p_tur: t.tur, p_yol: yol, p_boyut: blob.size + (it.fotoBoyut || 0), p_ozet: ozet(b.keys), p_fotolar: (it.fotolar || []).map(function (f) { return f.id; }), p_at: b.createdAt });
      }).then(function (r) {
        if (r.error) throw r.error;
        if (t.tur === 'oncesi') sonOncesi = b.createdAt;
        var s = st(); s.sonYukleme = new Date().toISOString(); s.sonHata = null; if (t.tur !== 'oncesi') s.sonGun = t.tarih; stYaz(s);
        return r.data;
      });
    });
  }
  function temizle(c) {
    return c.rpc('sa_telefon_silinecekler').then(function (r) {
      var L = (r && r.data) || []; if (!L.length) return 0;
      return c.storage.from(KOVA).remove(L).then(function () { return c.rpc('sa_telefon_silindi', { p_yollar: L }); }).then(function (x) { return (x && x.data) || 0; });
    }).catch(function () { return 0; });
  }
  /** Kuyruktakileri gönderir. { gonderilen, bekleyen } */
  function bosalt() {
    if (mesgul) return mesgul;
    var b = B(); if (!b || g.navigator.onLine === false) return kuyruk().then(function (q) { return { gonderilen: 0, bekleyen: q.length }; });
    var n = 0;
    mesgul = b.client().then(function (c) {
      return kuyruk().then(function (q) {
        q.sort(function (a, z) { return a.id < z.id ? -1 : 1; });
        return q.reduce(function (p, it) { return p.then(function () { return gonder(c, it).then(function () { n++; return kuyrukSil(it.id); }); }); }, Promise.resolve())
          .then(function () { return temizle(c); }).then(function () { return { gonderilen: n, bekleyen: 0 }; });
      });
    }).catch(function (e) { var s = st(); s.sonHata = (e && e.message) || 'bağlantı'; stYaz(s); return kuyruk().then(function (q) { return { gonderilen: n, bekleyen: q.length, hata: s.sonHata }; }); })
      .then(function (r) { mesgul = null; return r; });
    return mesgul;
  }
  /** Telefonda yedek al, kuyruğa koy, (çevrimiçiyse) gönder. tur: gunluk | elle | oncesi */
  function al(tur) {
    tur = tur || 'elle';
    return topla(tur).then(function (x) {
      var fb = 0; x.fotolar.forEach(function (f) { fb += f.blob.size; });
      var it = { id: new Date().toISOString() + '-' + tur, yedek: x.yedek, fotolar: x.fotolar, fotoBoyut: fb };
      return kuyrukEkle(it).catch(function () { return null; }).then(function (ok) {
        var s = st(); if (tur !== 'oncesi') s.sonAlinan = new Date().toISOString(); stYaz(s);
        if (ok === null) return B().client().then(function (c) { return gonder(c, it); }).then(function () { return { gonderilen: 1, bekleyen: 0 }; });
        return (mesgul || Promise.resolve()).then(bosalt);
      });
    });
  }
  /** Günde bir: bugün (TSİ) alınmadıysa günlük yedek; değilse bekleyenleri gönderir. */
  function otomatik() {
    try { if (g.localStorage.getItem('superari.workMode') !== 'live') return Promise.resolve(null); } catch (e) { return Promise.resolve(null); }
    var s = st(); if (s.sonGun === gunTSI() || s.alinanGun === gunTSI()) return bosalt();
    s.alinanGun = gunTSI(); stYaz(s);
    return al('gunluk').catch(function () { return null; });
  }
  /* ---- liste / indirme / geri yükleme ---- */
  function liste(c, h) { return c.rpc('sa_telefon_yedek_liste', { p_hesap: h || null }).then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
  function indir(c, row) {
    return c.storage.from(KOVA).download(row.yol).then(function (r) { if (r.error) throw r.error; return r.data.text(); }).then(function (t) {
      var v = g.SuperAriYedek.read(t), o = JSON.parse(t); if (!v.ok) throw new Error(v.error); v.backup.fotoRef = o.fotoRef || []; v.backup.telefon = o.telefon || {}; return v.backup;
    });
  }
  function fotolarIndir(c, h, b) {
    var Y = g.SuperAriYedek, out = [];
    return (b.fotoRef || []).reduce(function (p, f) {
      return p.then(function () {
        return c.storage.from(KOVA).download(h + '/' + f.dosya).then(function (r) { if (r.error || !r.data) return; return Y.toDataUrl(r.data).then(function (u) { var o = {}; Object.keys(f).forEach(function (k) { if (k !== 'dosya') o[k] = f[k]; }); o.blob = u; out.push(o); }); }).catch(function () {});
      });
    }, Promise.resolve()).then(function () { b.photos = out; return b; });
  }
  function onizle(b) {
    var p = g.SuperAriYedek.plan(b).filter(function (r) { return r.action !== 'ayni'; }), have = {};
    return fotoRows().then(function (rows) { rows.forEach(function (r) { have[r.id] = 1; }); return { satirlar: p, foto: (b.fotoRef || []).length, fotoEksik: (b.fotoRef || []).filter(function (f) { return !have[f.id]; }).length }; });
  }
  function uygula(c, row, b) {
    var Y = g.SuperAriYedek;
    return fotolarIndir(c, row.hesap_id, b).then(function () { var r = Y.apply(b, 'degistir'); return Y.applyPhotos(b, 'degistir').then(function (ph) { return { degisen: r.changed, foto: ph.added + ph.replaced }; }); });
  }
  /** Geri yükle: önce şimdiki hâl («oncesi») yedeklenip gönderilir, sonra uygulanır ve kaydedilir. */
  function geriYukle(c, row) {
    var oncesiId = null;
    return indir(c, row).then(function (b) {
      return al('oncesi').then(function (r) {
        if (r.bekleyen) throw new Error('Şimdiki hâlin yedeği buluta gönderilemedi; geri yükleme yapılmadı');
        var at = sonOncesi;
        return liste(c, row.hesap_id).then(function (L) {
          var s = st(), m = L.filter(function (x) { return x.tur === 'oncesi' && x.cihaz_id === s.cihaz; });
          var o = m.filter(function (x) { return at && Math.abs(Date.parse(x.at) - Date.parse(at)) < 2000; })[0] || m[0]; oncesiId = o ? o.id : null;
        });
      }).then(function () { return uygula(c, row, b); });
    }).then(function (u) {
      return c.rpc('sa_telefon_geri_yukle_kaydet', { p_yedek: row.id, p_oncesi: oncesiId, p_adet: u.degisen + u.foto }).then(function (r) { if (r.error) throw r.error; u.yukleme_id = r.data; u.oncesi = oncesiId; return u; });
    });
  }
  function geriAl(c, gy, rows) {
    var o = (rows || []).filter(function (x) { return gy && String(x.id) === String(gy.telefon_oncesi_id); })[0];
    if (!o) return Promise.reject(new Error('Geri yükleme öncesi yedek bulunamadı'));
    return indir(c, o).then(function (b) { return uygula(c, o, b); }).then(function (u) {
      return c.rpc('sa_telefon_geri_al_kaydet', { p_id: gy.id }).then(function (r) { if (r.error) throw r.error; return u; });
    });
  }
  /** Son yükleme uyarısı (uyarı günü uzman tahmini; yönetici değiştirir) */
  function durum(uyariGun) {
    var s = st(), lim = (uyariGun || 2) * 864e5;
    return { son: s.sonYukleme || null, sonAlinan: s.sonAlinan || null, hata: s.sonHata || null, uyari: !s.sonYukleme || (Date.now() - Date.parse(s.sonYukleme) > lim), uyariGun: uyariGun || 2 };
  }
  if (g.addEventListener) g.addEventListener('online', function () { setTimeout(function () { bosalt(); }, 3000); });
  g.SuperAriTelefonYedek = { al: al, otomatik: otomatik, bosalt: bosalt, kuyruk: kuyruk, liste: liste, indir: indir, onizle: onizle, geriYukle: geriYukle, geriAl: geriAl, durum: durum, gunTSI: gunTSI, ozet: ozet, KOVA: KOVA };
})(typeof window !== 'undefined' ? window : globalThis);
