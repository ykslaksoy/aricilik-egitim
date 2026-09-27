/**
 * SüperArı — Çevrimdışı harita (bölgeyi telefona indir).
 *
 * Neden ayrı katman: Yandex Haritalar ücretsiz kullanım koşulları harita verisini/karoları saklamayı ve
 * çevrimdışı kullanımı yasaklar (yalnız ≤30 gün performans önbelleği). Bu yüzden çevrimiçiyken Yandex kalır,
 * internet yokken aynı harita alanında önbelleğe alınabilir açık kaynaklar gösterilir:
 *  • Yol / yerleşim haritası: OpenFreeMap vektör karoları (OpenMapTiles şeması, © OpenStreetMap katkıcıları; ücretsiz, ticari kullanım serbest)
 *  • Uydu: EOX Sentinel-2 cloudless 2016 (CC BY 4.0 — ticari kullanım ve saklama serbest; 10 m çözünürlük)
 * Çizim MapLibre GL JS (BSD-3) ile; yandex-map.js offline iken bu modülün ymaps uyumlu «shim»ini kullanır, böylece
 * arılık / su / öneri / taşıma pinleri ve yarıçap halkaları aynen çalışır.
 *
 * Bölge: arılığın çevresi (Küçük ~10 km · Orta ~30 km · Geniş ~60 km) veya tüm arılıkları kapsayan kutu.
 * Geniş zoomlar bölgenin tamamında, yakın zoomlar yalnız arılıkların çevresinde indirilir.
 * Karolar Cache Storage «superari-maps» deposuna yazılır; sw.js oradan sunar. İndirme kaldığı yerden devam eder.
 */
(function (global) {
  'use strict';
  var MAPS = 'superari-maps', LS = 'superari.haritaIndir.v1', ASK = 'superari.haritaSor.v1';
  var TJ = 'https://tiles.openfreemap.org/planet';
  var SAT = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
  var SPRITE = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm';
  var GLYPH = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
  var FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];
  var RANGES = ['0-255', '256-511', '512-767', '7680-7935', '8192-8447'];
  var LIB = ['/vendor/harita/maplibre-gl.js', '/vendor/harita/maplibre-gl.css', '/vendor/harita/stil.json'];
  var SIZES = {
    kucuk: { label: 'Küçük', km: 10, desc: '~10 km çevre' },
    orta: { label: 'Orta', km: 30, desc: '~30 km çevre (ilçe)' },
    genis: { label: 'Geniş', km: 60, desc: '~60 km çevre (bölge)' },
    hepsi: { label: 'Tüm arılıklarım', km: null, desc: 'tüm arılıkları kapsayan bölge' }
  };
  var NEAR_KM = 5, MID_KM = 15, WIDE_NEAR_KM = 30, BBOX_MARGIN_KM = 10;
  /* karo başına tahmini bayt (ölçümle: Türkiye kırsal/kent örnekleri, önbellekte açılmış hâli) */
  var EST_V = { 6: 90000, 7: 90000, 8: 80000, 9: 75000, 10: 70000, 11: 35000, 12: 20000, 13: 10000, 14: 5000 };
  var EST_S = { 8: 18000, 9: 18000, 10: 18000, 11: 17000, 12: 16000, 13: 13000, 14: 7000, 15: 5000 };

  function D() { return global.SuperAriDemo; }
  function readJ(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function writeJ(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function online() { return global.navigator.onLine !== false; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mb(bytes) { var m = (bytes || 0) / 1048576; return m < 0.1 ? '<0,1 MB' : (m < 10 ? m.toFixed(1).replace('.', ',') : String(Math.round(m))) + ' MB'; }
  function fmtDate(iso) { if (!iso) return ''; var d = new Date(iso); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }

  /* ---------- geometri ---------- */
  function lon2x(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
  function lat2y(lat, z) { var r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z)); }
  function x2lon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
  function y2lat(y, z) { var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  function distKm(a, b, c, d) {
    var R = 6371, dLat = (c - a) * Math.PI / 180, dLon = (d - b) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function rectDist(p, r) { /* noktadan karo dikdörtgenine en kısa mesafe */
    var la = Math.max(r.s, Math.min(r.n, p.lat)), lo = Math.max(r.w, Math.min(r.e, p.lon));
    return distKm(p.lat, p.lon, la, lo);
  }
  function kmBox(lat, lon, km) { var dl = km / 111.2, dn = km / (111.2 * Math.max(0.2, Math.cos(lat * Math.PI / 180))); return { s: lat - dl, n: lat + dl, w: lon - dn, e: lon + dn }; }

  /* ---------- arılıklar ve bölgeler ---------- */
  function apiaries() {
    var list = []; try { list = D() && D().loadApiaries ? D().loadApiaries() : []; } catch (e) { list = []; }
    return list.filter(function (a) { return a && isFinite(Number(a.lat)) && isFinite(Number(a.lon)) && a.lat !== null && a.lon !== null; })
      .map(function (a) { return { id: String(a.id), name: a.name || a.place || 'Arılık', place: a.place || '', lat: Number(a.lat), lon: Number(a.lon) }; });
  }
  function regions() { var r = readJ(LS, {}); return r && typeof r === 'object' ? r : {}; }
  function saveRegions(r) { writeJ(LS, r); }
  function getRegion(id) { return regions()[id] || null; }
  function putRegion(reg) { var r = regions(); r[reg.id] = reg; saveRegions(r); }

  function buildRegion(apiary, size) {
    var all = apiaries(), reg;
    if (size === 'hepsi' || !apiary) {
      if (!all.length) return null;
      var s = 90, n = -90, w = 180, e = -180;
      all.forEach(function (a) { s = Math.min(s, a.lat); n = Math.max(n, a.lat); w = Math.min(w, a.lon); e = Math.max(e, a.lon); });
      var m = kmBox((s + n) / 2, (w + e) / 2, BBOX_MARGIN_KM), dl = (m.n - m.s) / 2, dn = (m.e - m.w) / 2;
      reg = { id: 'hepsi', kind: 'bbox', size: 'hepsi', name: 'Tüm arılıklarım', box: { s: s - dl, n: n + dl, w: w - dn, e: e + dn },
        points: all.map(function (a) { return { lat: a.lat, lon: a.lon }; }) };
    } else {
      var km = (SIZES[size] || SIZES.orta).km;
      reg = { id: 'a:' + apiary.id, kind: 'circle', size: size, apiaryId: apiary.id, name: apiary.name, lat: apiary.lat, lon: apiary.lon, km: km,
        points: all.filter(function (a) { return distKm(apiary.lat, apiary.lon, a.lat, a.lon) <= km; }).map(function (a) { return { lat: a.lat, lon: a.lon }; }) };
      if (!reg.points.length) reg.points = [{ lat: apiary.lat, lon: apiary.lon }];
    }
    return reg;
  }
  function bboxOf(reg) { return reg.kind === 'bbox' ? reg.box : kmBox(reg.lat, reg.lon, reg.km); }
  function inArea(reg, rect) {
    if (reg.kind === 'bbox') { var b = reg.box; return !(rect.e < b.w || rect.w > b.e || rect.n < b.s || rect.s > b.n); }
    return rectDist({ lat: reg.lat, lon: reg.lon }, rect) <= reg.km;
  }
  function nearPts(reg, rect, km) { for (var i = 0; i < reg.points.length; i++) if (rectDist(reg.points[i], rect) <= km) return true; return false; }
  /** İndirme planı: [tür, zoom, kural]. Geniş zoomlar tüm bölge; yakın zoomlar yalnız arılık çevresi. */
  function plan(reg) {
    var circle = reg.kind === 'circle', R = circle ? reg.km : 999, out = [], z;
    /* çember: tüm bölge z≤14; «tüm arılıklar» kutusu çok geniş olabilir → z≥11 yalnız arılıkların ~30 km çevresi */
    for (z = 6; z <= 14; z++) out.push(['v', z, circle || z <= 10 ? 'all' : WIDE_NEAR_KM]);
    for (z = 8; z <= 13; z++) out.push(['s', z, circle || z <= 10 ? 'all' : WIDE_NEAR_KM]);
    out.push(['s', 14, Math.min(R, MID_KM)]);
    out.push(['s', 15, NEAR_KM]);
    return out;
  }
  function eachTile(reg, fn) {
    var b = bboxOf(reg);
    plan(reg).forEach(function (p) {
      var k = p[0], z = p[1], rule = p[2];
      var x0 = lon2x(b.w, z), x1 = lon2x(b.e, z), y0 = lat2y(b.n, z), y1 = lat2y(b.s, z);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
        var rect = { w: x2lon(x, z), e: x2lon(x + 1, z), n: y2lat(y, z), s: y2lat(y + 1, z) };
        if (!inArea(reg, rect)) continue;
        if (rule !== 'all' && !nearPts(reg, rect, rule)) continue;
        fn(k, z, x, y);
      }
    });
  }
  function tileList(reg) { var l = []; eachTile(reg, function (k, z, x, y) { l.push([k, z, x, y]); }); return l; }
  function estimate(reg) {
    var n = 0, bytes = 250000; /* ortak dosyalar (stil, yazı tipi, simgeler) — MapLibre ayrıca ~1,1 MB */
    eachTile(reg, function (k, z) { n++; bytes += (k === 'v' ? EST_V[z] : EST_S[z]) || 10000; });
    if (!libCached) bytes += 1150000;
    return { tiles: n, bytes: bytes };
  }
  var libCached = false;
  function keyOf(t) { return t[0] === 'v' ? 'https://tiles.openfreemap.org/__ofm/' + t[1] + '/' + t[2] + '/' + t[3] + '.pbf' : SAT.replace('{z}', t[1]).replace('{y}', t[3]).replace('{x}', t[2]); }
  function covering(lat, lon, onlyDone) {
    var r = regions(), best = null;
    Object.keys(r).forEach(function (id) {
      var g = r[id]; if (!g || (onlyDone && g.status !== 'done') || (!onlyDone && g.status === 'none')) return;
      var inside = g.kind === 'bbox' ? (lat >= g.box.s && lat <= g.box.n && lon >= g.box.w && lon <= g.box.e) : distKm(g.lat, g.lon, lat, lon) <= g.km;
      if (inside && (!best || g.status === 'done')) best = g;
    });
    return best;
  }
  function hasAny() { var r = regions(); return Object.keys(r).some(function (k) { return r[k] && (r[k].status === 'done' || r[k].done > 0); }); }

  /* ---------- indirme ---------- */
  var active = null;
  function emit(reg) { try { global.dispatchEvent(new CustomEvent('superari-harita', { detail: reg })); } catch (e) { /* ignore */ } renderPill(reg); }
  function fetchRetry(url, tries) {
    return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (res) {
      if (res.status === 429 || res.status >= 500) throw new Error('http ' + res.status);
      return res;
    }).catch(function (err) {
      if (tries > 0 && online()) return new Promise(function (r) { setTimeout(r, 800); }).then(function () { return fetchRetry(url, tries - 1); });
      throw err;
    });
  }
  function putResp(cache, key, res, type) {
    if (res.status === 204 || res.status === 404) return cache.put(key, new Response(new Uint8Array(0), { headers: { 'Content-Type': type } })).then(function () { return 0; });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.arrayBuffer().then(function (buf) {
      return cache.put(key, new Response(buf, { headers: { 'Content-Type': res.headers.get('Content-Type') || type } })).then(function () { return buf.byteLength; });
    });
  }
  function ensureCommon(cache, force) {
    var urls = LIB.slice().concat([TJ, SPRITE + '.json', SPRITE + '.png', SPRITE + '@2x.json', SPRITE + '@2x.png']);
    FONTS.forEach(function (f) { RANGES.forEach(function (r) { urls.push(GLYPH.replace('{fontstack}', encodeURIComponent(f).replace(/%20/g, '%20')).replace('{range}', r)); }); });
    var bytes = 0;
    return urls.reduce(function (p, u) {
      return p.then(function () {
        return (force && u === TJ ? Promise.resolve(null) : cache.match(u)).then(function (hit) {
          if (hit) return null;
          return fetchRetry(u, 2).then(function (res) { return putResp(cache, u, res, 'application/octet-stream'); }).then(function (n) { bytes += n || 0; });
        });
      });
    }, Promise.resolve()).then(function () {
      return cache.match(TJ).then(function (r) { return r.json(); }).then(function (tj) { libCached = true; return { tpl: tj.tiles[0], bytes: bytes }; });
    });
  }
  function quotaOk(need) {
    var S = global.navigator.storage;
    if (!S || !S.estimate) return Promise.resolve({ ok: true });
    var p = S.persist ? S.persist().catch(function () { return false; }) : Promise.resolve(false);
    return p.then(function (persisted) {
      return S.estimate().then(function (e) { var free = (e.quota || 0) - (e.usage || 0); return { ok: !e.quota || free > need * 1.3, free: free, persisted: persisted }; });
    });
  }
  /** Bölgeyi indir (veya kaldığı yerden sürdür). opts.force → her şeyi yeniden indir (güncelle). */
  function download(reg, opts) {
    opts = opts || {};
    if (active) return Promise.reject(new Error('Şu an başka bir harita iniyor.'));
    if (!online()) return Promise.reject(new Error('İndirmek için internet gerekir.'));
    if (!global.caches) return Promise.reject(new Error('Bu tarayıcı çevrimdışı haritayı desteklemiyor.'));
    var old = getRegion(reg.id);
    if (old && !opts.force && !opts.fresh && old.size === reg.size) { reg = Object.assign({}, old, { points: reg.points }); }
    var est = estimate(reg), list = tileList(reg);
    reg.total = list.length; reg.est = est.bytes;
    if (opts.force || !old || old.size !== reg.size) { reg.done = 0; reg.bytes = 0; }
    reg.status = 'downloading'; reg.error = null; reg.startedAt = new Date().toISOString();
    var job = active = { id: reg.id, stop: false };
    putRegion(reg); emit(reg);
    return quotaOk(est.bytes - (reg.bytes || 0)).then(function (q) {
      if (!q.ok) throw new Error('Telefonda yeterli yer yok (gerekli ~' + mb(est.bytes) + ', boş ~' + mb(q.free) + ').');
      return caches.open(MAPS);
    }).then(function (cache) {
      return ensureCommon(cache, opts.force).then(function (c) {
        reg.bytes = (reg.bytes || 0) + c.bytes;
        var tpl = c.tpl, i = 0, done = 0, fail = 0, lastSave = 0;
        function urlOf(t) { return t[0] === 'v' ? tpl.replace('{z}', t[1]).replace('{x}', t[2]).replace('{y}', t[3]) : keyOf(t); }
        function worker() {
          if (job.stop) return Promise.resolve();
          if (i >= list.length) return Promise.resolve();
          var t = list[i++], key = keyOf(t);
          return (opts.force ? Promise.resolve(null) : cache.match(key)).then(function (hit) {
            if (hit) return 0;
            return fetchRetry(urlOf(t), 2).then(function (res) { return putResp(cache, key, res, t[0] === 'v' ? 'application/x-protobuf' : 'image/jpeg'); })
              .catch(function () { fail++; return 0; });
          }).then(function (n) {
            done++; reg.bytes += n || 0; reg.done = done;
            if (done - lastSave >= 20 || done === list.length) { lastSave = done; putRegion(reg); emit(reg); }
            return worker();
          });
        }
        var ws = []; for (var w = 0; w < 6; w++) ws.push(worker());
        return Promise.all(ws).then(function () {
          active = null;
          if (job.stop) { reg.status = 'paused'; putRegion(reg); emit(reg); return reg; }
          if (fail > Math.max(3, list.length * 0.02)) { reg.status = 'paused'; reg.error = fail + ' parça inemedi — «Devam et» ile tekrar deneyin.'; }
          else { reg.status = 'done'; reg.updatedAt = new Date().toISOString(); }
          reg.failed = fail;
          putRegion(reg); emit(reg);
          return reg;
        });
      });
    }).catch(function (err) {
      active = null;
      reg.status = (reg.done || 0) > 0 ? 'paused' : 'error'; reg.error = String(err && err.message || err);
      putRegion(reg); emit(reg);
      throw err;
    });
  }
  function stop() { if (active) active.stop = true; }
  /** Bölgeyi sil (başka indirilmiş bölgelerin de kullandığı karolar korunur). */
  function remove(id) {
    if (active && active.id === id) active.stop = true;
    var all = regions(), reg = all[id]; if (!reg) return Promise.resolve();
    delete all[id]; saveRegions(all);
    if (!global.caches) return Promise.resolve();
    var keep = {};
    Object.keys(all).forEach(function (k) { eachTile(all[k], function (a, z, x, y) { keep[keyOf([a, z, x, y])] = 1; }); });
    return caches.open(MAPS).then(function (cache) {
      var dels = [];
      eachTile(reg, function (a, z, x, y) { var key = keyOf([a, z, x, y]); if (!keep[key]) dels.push(key); });
      if (!Object.keys(all).length) { libCached = false; return caches.delete(MAPS); }
      return dels.reduce(function (p, k, i) { return p.then(function () { return cache.delete(k); }); }, Promise.resolve());
    }).then(function () { emit({ id: id, status: 'none' }); });
  }
  /* sayfa kapanınca yarıda kalan indirme «yarım kaldı» olur */
  (function fixStale() {
    var r = regions(), ch = false;
    Object.keys(r).forEach(function (k) { if (r[k] && r[k].status === 'downloading') { r[k].status = 'paused'; ch = true; } });
    if (ch) saveRegions(r);
    if (global.caches) caches.open(MAPS).then(function (c) { return c.match(LIB[0]); }).then(function (h) { libCached = !!h; }).catch(function () {});
  })();

  /* ---------- arayüz: stil ---------- */
  var CSS =
    '.hof-pill{position:fixed;left:50%;transform:translateX(-50%);width:max-content;white-space:nowrap;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9000;max-width:calc(100vw - 24px);box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:8px 10px 8px 12px;border-radius:999px;background:#2c241c;color:#fff;font:600 12px/1.3 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)}' +
    '.hof-pill .bar{flex:0 0 60px;height:6px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden}.hof-pill .bar i{display:block;height:100%;background:#f0c43a}' +
    '.hof-pill button{border:0;border-radius:999px;background:#fff;color:#2c241c;font:700 11px system-ui;padding:4px 9px;cursor:pointer}' +
    '.hof-sheet-bg{position:fixed;inset:0;z-index:9500;background:rgba(20,16,10,.45);display:flex;align-items:flex-end;justify-content:center}' +
    '.hof-sheet{width:100%;max-width:480px;box-sizing:border-box;background:#fffdf6;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));font:14px/1.4 system-ui,sans-serif;color:#2c241c;max-height:88vh;overflow:auto}' +
    '.hof-sheet h3{margin:0 0 4px;font-size:16px}.hof-sheet .sub{margin:0 0 10px;font-size:12.5px;color:#6b635a}' +
    '.hof-opt{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5ddd0;border-radius:12px;margin-bottom:8px;background:#fff;cursor:pointer}' +
    '.hof-opt input{margin:0;flex:0 0 auto;accent-color:#c9a227}.hof-opt b{display:block;font-size:14px}.hof-opt span{display:block;font-size:12px;color:#6b635a}.hof-opt em{margin-left:auto;font-style:normal;font-weight:800;font-size:12.5px;white-space:nowrap}' +
    '.hof-opt.is-on{border-color:#c9a227;background:#fff8df}' +
    '.hof-btns{display:flex;gap:8px;margin-top:6px}.hof-btns button{flex:1;min-height:44px;border-radius:12px;font:800 14px system-ui;cursor:pointer;border:1px solid #c9a227}' +
    '.hof-btns .yes{background:#f0c43a;color:#2c241c}.hof-btns .no{background:#fff;color:#2c241c;border-color:#d8d0c6}' +
    '.hof-note{font-size:11.5px;color:#6b635a;margin:8px 0 0}' +
    '.hof-ovl-note{position:absolute;left:8px;right:8px;bottom:8px;z-index:5;padding:7px 10px;border-radius:10px;background:rgba(44,36,28,.86);color:#fff;font:600 12px/1.35 system-ui,sans-serif;pointer-events:none;text-align:center}' +
    '.hof-ovl-note.ok{background:rgba(46,125,50,.85)}' +
    '.hof-layer{position:absolute;top:10px;right:10px;z-index:6;border:1px solid #d8d0c6;border-radius:10px;background:#fff;color:#2c241c;font:800 12px system-ui;padding:8px 10px;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer}' +
    '.hof-pin{display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-2px)}' +
    '.hof-pin .lbl{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 8px;border-radius:8px;color:#fff;font:800 11.5px system-ui;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
    '.hof-pin .dot{width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}' +
    '.hof-pin .tip{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid}' +
    '.hof-row{display:grid;gap:6px;padding:10px 0;border-top:1px solid #efe6d6;min-width:0}.hof-row:first-child{border-top:0}' +
    '.hof-row .t{display:flex;justify-content:space-between;gap:8px;align-items:baseline;min-width:0}.hof-row .t b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hof-row .st{font-size:12px;color:#6b635a;white-space:nowrap}' +
    '.hof-row .st.ok{color:#2e7d32;font-weight:700}.hof-row .st.warn{color:#b26a00;font-weight:700}' +
    '.hof-row .acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.hof-row select{min-height:36px;border-radius:10px;border:1px solid #d8d0c6;background:#fff;font:600 13px system-ui;padding:0 6px;max-width:100%}' +
    '.hof-row .acts button{min-height:36px;border-radius:10px;border:1px solid #c9a227;background:#f0c43a;color:#2c241c;font:800 12.5px system-ui;padding:0 12px;cursor:pointer}' +
    '.hof-row .acts button.sec{background:#fff;border-color:#d8d0c6}.hof-row .acts button:disabled{opacity:.45}' +
    '.hof-row .bar{height:6px;border-radius:3px;background:#efe6d6;overflow:hidden}.hof-row .bar i{display:block;height:100%;background:#c9a227}';
  function injectCss() { if (document.getElementById('hof-css')) return; var s = document.createElement('style'); s.id = 'hof-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- ilerleme hapı ---------- */
  function renderPill(reg) {
    if (!document.body) return;
    var el = document.getElementById('hofPill');
    if (!reg || reg.status !== 'downloading') { if (el) { if (reg && reg.status === 'done') { el.innerHTML = '✓ Harita telefona indirildi · ' + esc(mb(reg.bytes)); setTimeout(function () { el.remove(); }, 3500); } else el.remove(); } return; }
    injectCss();
    if (!el) { el = document.createElement('div'); el.id = 'hofPill'; el.className = 'hof-pill'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    var pct = reg.total ? Math.floor(100 * (reg.done || 0) / reg.total) : 0;
    el.innerHTML = '<span>🗺 Harita iniyor %' + pct + ' · ' + esc(mb(reg.bytes)) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><button type="button">Durdur</button>';
    el.querySelector('button').onclick = function () { stop(); };
  }

  /* ---------- «indirilsin mi?» sorusu ---------- */
  function sizeOptions(apiary) {
    var opts = [];
    ['kucuk', 'orta', 'genis'].forEach(function (k) { var r = buildRegion(apiary, k); opts.push({ key: k, reg: r, est: estimate(r) }); });
    if (apiaries().length >= 2) { var h = buildRegion(null, 'hepsi'); if (h) opts.push({ key: 'hepsi', reg: h, est: estimate(h) }); }
    return opts;
  }
  function snoozed(id) { var a = readJ(ASK, {}); return a[id] && a[id] > Date.now(); }
  function snooze(id, days) { var a = readJ(ASK, {}); a[id] = Date.now() + days * 86400000; writeJ(ASK, a); }
  /** Online iken, arılık indirilmiş bir bölgede değilse sorar. opts.force → erteleme yok sayılır. */
  function ask(apiary, opts) {
    opts = opts || {};
    if (!apiary || !isFinite(Number(apiary.lat)) || !isFinite(Number(apiary.lon))) return false;
    apiary = { id: String(apiary.id), name: apiary.name || apiary.place || 'Arılık', lat: Number(apiary.lat), lon: Number(apiary.lon) };
    if (!global.caches || !online() || active) return false;
    if (!opts.force && (covering(apiary.lat, apiary.lon, false) || snoozed(apiary.id))) return false;
    if (document.getElementById('hofSheet')) return false;
    injectCss();
    var list = sizeOptions(apiary), pick = 'orta';
    var bg = document.createElement('div'); bg.className = 'hof-sheet-bg'; bg.id = 'hofSheet';
    bg.innerHTML = '<div class="hof-sheet" role="dialog" aria-modal="true" aria-labelledby="hofT">' +
      '<h3 id="hofT">Bu bölgenin haritası telefona indirilsin mi?</h3>' +
      '<p class="sub">' + esc(apiary.name) + ' çevresi · uydu + yol haritası · indirince <b>internetsiz çalışır</b>.</p>' +
      list.map(function (o) {
        var S = SIZES[o.key];
        return '<label class="hof-opt' + (o.key === pick ? ' is-on' : '') + '"><input type="radio" name="hofSize" value="' + o.key + '"' + (o.key === pick ? ' checked' : '') + '>' +
          '<div><b>' + esc(S.label) + '</b><span>' + esc(S.desc) + '</span></div><em>~' + esc(mb(o.est.bytes)) + '</em></label>';
      }).join('') +
      '<div class="hof-btns"><button type="button" class="no">Sonra</button><button type="button" class="yes">Evet, indir</button></div>' +
      '<p class="hof-note">Wi-Fi önerilir. İndirme bu sayfa açıkken sürer; yarıda kalırsa Ayarlar › Haritaları telefona indir › «Devam et». Yakın zoom yalnız arılıkların çevresinde indirilir.</p></div>';
    document.body.appendChild(bg);
    bg.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'hofSize') { pick = e.target.value; Array.prototype.forEach.call(bg.querySelectorAll('.hof-opt'), function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); }); }
    });
    function close() { bg.remove(); }
    bg.querySelector('.no').onclick = function () { snooze(apiary.id, 14); close(); };
    bg.addEventListener('click', function (e) { if (e.target === bg) { snooze(apiary.id, 14); close(); } });
    bg.querySelector('.yes').onclick = function () {
      var o = list.filter(function (x) { return x.key === pick; })[0]; close();
      download(o.reg).catch(function (err) { alert('Harita indirilemedi: ' + (err && err.message || err)); });
    };
    return true;
  }

  /* ---------- Ayarlar › Haritaları telefona indir ---------- */
  function statusHtml(g) {
    if (!g) return '<span class="st">İndirilmedi</span>';
    var pct = g.total ? Math.floor(100 * (g.done || 0) / g.total) : 0;
    if (g.status === 'downloading') return '<span class="st warn">İniyor %' + pct + '</span>';
    if (g.status === 'paused') return '<span class="st warn">Yarım kaldı %' + pct + '</span>';
    if (g.status === 'error') return '<span class="st warn">Hata</span>';
    return '<span class="st ok">✓ İndirildi · ' + esc(mb(g.bytes)) + '</span>';
  }
  function renderSettings(host) {
    if (!host) return;
    injectCss();
    var el = host;
    function draw() {
      var all = apiaries(), R = regions(), on = online();
      var rows = all.map(function (a) {
        var g = R['a:' + a.id], cov = !g ? covering(a.lat, a.lon, true) : null;
        var sel = g ? g.size : 'orta';
        var ests = {}; ['kucuk', 'orta', 'genis'].forEach(function (k) { ests[k] = estimate(buildRegion(a, k)); });
        var h = '<div class="hof-row" data-id="a:' + esc(a.id) + '" data-ap="' + esc(a.id) + '"><div class="t"><b>' + esc(a.name) + '</b>' + (cov && cov.id !== 'a:' + a.id ? '<span class="st ok">✓ ' + esc(cov.name) + ' bölgesinde</span>' : statusHtml(g)) + '</div>';
        if (g && (g.status === 'downloading' || g.status === 'paused')) h += '<div class="bar"><i style="width:' + (g.total ? Math.floor(100 * g.done / g.total) : 0) + '%"></i></div>';
        if (g && g.error) h += '<div class="st warn" style="white-space:normal">' + esc(g.error) + '</div>';
        if (g && g.status === 'done') h += '<div class="st">' + esc(SIZES[g.size].label + ' (' + SIZES[g.size].desc + ')') + ' · ' + esc(fmtDate(g.updatedAt)) + '</div>';
        h += '<div class="acts">';
        if (!g || g.status === 'error') {
          h += '<select data-size aria-label="Bölge büyüklüğü">' + ['kucuk', 'orta', 'genis'].map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + SIZES[k].label + ' · ~' + mb(ests[k].bytes) + '</option>'; }).join('') + '</select>' +
            '<button type="button" data-act="get"' + (on ? '' : ' disabled') + '>İndir</button>';
        } else if (g.status === 'downloading') h += '<button type="button" class="sec" data-act="stop">Durdur</button>';
        else if (g.status === 'paused') h += '<button type="button" data-act="resume"' + (on ? '' : ' disabled') + '>Devam et</button><button type="button" class="sec" data-act="del">Sil</button>';
        else h += '<button type="button" class="sec" data-act="upd"' + (on ? '' : ' disabled') + '>Güncelle</button><button type="button" class="sec" data-act="del">Sil</button>';
        return h + '</div></div>';
      });
      if (all.length >= 2) {
        var hg = R.hepsi, he = estimate(buildRegion(null, 'hepsi'));
        var hh = '<div class="hof-row" data-id="hepsi"><div class="t"><b>Tüm arılıklarımı kapsayan bölge</b>' + statusHtml(hg) + '</div>';
        if (hg && (hg.status === 'downloading' || hg.status === 'paused')) hh += '<div class="bar"><i style="width:' + (hg.total ? Math.floor(100 * hg.done / hg.total) : 0) + '%"></i></div>';
        hh += '<div class="acts">';
        if (!hg || hg.status === 'error') hh += '<span class="st">~' + esc(mb(he.bytes)) + '</span><button type="button" data-act="get"' + (on ? '' : ' disabled') + '>İndir</button>';
        else if (hg.status === 'downloading') hh += '<button type="button" class="sec" data-act="stop">Durdur</button>';
        else if (hg.status === 'paused') hh += '<button type="button" data-act="resume"' + (on ? '' : ' disabled') + '>Devam et</button><button type="button" class="sec" data-act="del">Sil</button>';
        else hh += '<button type="button" class="sec" data-act="upd"' + (on ? '' : ' disabled') + '>Güncelle</button><button type="button" class="sec" data-act="del">Sil</button>';
        rows.push(hh + '</div></div>');
      }
      el.innerHTML = '<p class="muted" id="hofUse" style="margin:0;font-size:.82rem"></p>' +
        (on ? '' : '<p class="muted" style="margin:0;font-size:.82rem;color:#b26a00">İnternet yok — indirilen haritalar kullanılabilir; yeni indirme için internet gerekir.</p>') +
        (rows.length ? '<div>' + rows.join('') + '</div>' : '<p class="muted" style="margin:0;font-size:.85rem">Konumu seçilmiş arılık yok. Arılık eklerken haritadan konum seçin.</p>') +
        '<p class="muted" style="margin:0;font-size:.74rem;line-height:1.4">İnternetsiz harita: yol/yerleşim © OpenFreeMap · OpenMapTiles · OpenStreetMap katkıcıları; uydu: Sentinel-2 cloudless 2016, EOX (CC BY 4.0, 10 m çözünürlük — yakın zoomda bulanık). İnternet varken arılık haritası her zamanki gibi Yandex uydu görüntüsünü kullanır.</p>';
      var S = global.navigator.storage;
      if (S && S.estimate) S.estimate().then(function (e) {
        var u = document.getElementById('hofUse'); if (!u) return;
        var tot = 0; Object.keys(R).forEach(function (k) { tot += (R[k] && R[k].bytes) || 0; });
        u.textContent = 'Haritalar: ' + mb(tot) + ' · telefonda boş yer: ~' + mb((e.quota || 0) - (e.usage || 0)).replace(' MB', '') + ' MB';
      });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-act]'); if (!b) return;
      var row = b.closest('.hof-row'), id = row.getAttribute('data-id'), act = b.getAttribute('data-act');
      var ap = row.getAttribute('data-ap'), a = ap ? apiaries().filter(function (x) { return x.id === ap; })[0] : null;
      var err = function (x) { alert('Harita: ' + (x && x.message || x)); draw(); };
      if (act === 'stop') { stop(); return; }
      if (act === 'del') { if (!confirm('Bu bölgenin haritası telefondan silinsin mi?')) return; remove(id).then(draw); return; }
      if (act === 'get') { var sz = id === 'hepsi' ? 'hepsi' : row.querySelector('[data-size]').value; download(buildRegion(a, sz), { fresh: true }).catch(err); return; }
      var g = getRegion(id); if (!g) return;
      var reg = id === 'hepsi' ? buildRegion(null, 'hepsi') : buildRegion(a || { id: g.apiaryId, name: g.name, lat: g.lat, lon: g.lon }, g.size);
      download(reg, { force: act === 'upd' }).catch(err);
    });
    global.addEventListener('superari-harita', function () { if (!el.__t) el.__t = setTimeout(function () { el.__t = null; draw(); }, 400); });
    global.addEventListener('online', draw); global.addEventListener('offline', draw);
    draw();
  }

  /* ---------- çevrimdışı harita (ymaps uyumlu shim, MapLibre) ---------- */
  var libP = null;
  function loadLib() {
    if (global.maplibregl) return Promise.resolve(global.maplibregl);
    if (libP) return libP;
    libP = new Promise(function (resolve, reject) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LIB[1]; document.head.appendChild(l);
      var s = document.createElement('script'); s.src = LIB[0];
      s.onload = function () { global.maplibregl ? resolve(global.maplibregl) : reject(new Error('maplibre yok')); };
      s.onerror = function () { libP = null; reject(new Error('Çevrimdışı harita dosyaları telefonda yok — önce bir bölge indirin.')); };
      document.head.appendChild(s);
    });
    return libP;
  }
  var styleP = null;
  function loadStyle() {
    if (!styleP) styleP = fetch(LIB[2]).then(function (r) { if (!r.ok) throw new Error('stil'); return r.json(); }).catch(function (e) { styleP = null; throw e; });
    return styleP.then(function (s) { return JSON.parse(JSON.stringify(s)); });
  }
  var COLORS = { red: '#e53935', blue: '#1e88e5', darkOrange: '#e65100', orange: '#fb8c00', lightBlue: '#29b6f6', darkGreen: '#2e7d32', green: '#43a047', violet: '#8e24aa', black: '#333', gray: '#757575', yellow: '#f9a825', brown: '#795548', darkBlue: '#1a237e', pink: '#d81b60', olive: '#827717', night: '#0d47a1' };
  function presetColor(opts) {
    if (opts.iconColor) return opts.iconColor;
    var m = /islands#([a-zA-Z]+?)(Stretchy|Dot|Circle)?Icon/.exec(opts.preset || '');
    return (m && COLORS[m[1]]) || '#e53935';
  }
  function Events() {
    var h = {};
    return { add: function (n, f) { (Array.isArray(n) ? n : [n]).forEach(function (k) { (h[k] = h[k] || []).push(f); }); return this; },
      remove: function (n, f) { if (h[n]) h[n] = h[n].filter(function (x) { return x !== f; }); return this; },
      fire: function (n, ev) { (h[n] || []).slice().forEach(function (f) { try { f(ev); } catch (e) { /* ignore */ } }); } };
  }
  function evObj(data) { return { get: function (k) { return data[k]; }, preventDefault: function () {}, stopPropagation: function () {} }; }
  function buildShim(ML) {
    function Placemark(coords, props, opts) {
      var self = this; props = props || {}; opts = opts || {};
      var c = [Number(coords[0]), Number(coords[1])], marker = null, ml = null, el = document.createElement('div');
      el.className = 'hof-pin';
      function draw() {
        var col = presetColor(opts), txt = props.iconContent;
        el.innerHTML = (txt != null && txt !== '' ? '<div class="lbl" style="background:' + col + '">' + esc(txt) + '</div><div class="tip" style="border-top-color:' + col + '"></div>' : '<div class="dot" style="background:' + col + '"></div>');
        el.title = props.hintContent || '';
        if (marker) marker.setDraggable(!!opts.draggable);
      }
      draw();
      this.events = Events();
      this.geometry = { getCoordinates: function () { return c.slice(); }, setCoordinates: function (n) { c = [Number(n[0]), Number(n[1])]; if (marker) marker.setLngLat([c[1], c[0]]); } };
      this.properties = { set: function (k, v) { props[k] = v; draw(); }, get: function (k) { return props[k]; } };
      this.options = { set: function (k, v) { opts[k] = v; draw(); }, get: function (k) { return opts[k]; } };
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        self.events.fire('click', evObj({ target: self, coords: c.slice() }));
        if (props.balloonContent && ml) new ML.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setLngLat([c[1], c[0]]).setHTML(String(props.balloonContent)).addTo(ml);
      });
      this._add = function (map) {
        ml = map;
        marker = new ML.Marker({ element: el, draggable: !!opts.draggable, anchor: 'bottom' }).setLngLat([c[1], c[0]]).addTo(map);
        marker.on('drag', function () { var p = marker.getLngLat(); c = [p.lat, p.lng]; self.events.fire('drag', evObj({ target: self })); });
        marker.on('dragend', function () { var p = marker.getLngLat(); c = [p.lat, p.lng]; self.events.fire('dragend', evObj({ target: self })); });
      };
      this._remove = function () { if (marker) marker.remove(); marker = null; };
    }
    var circleN = 0;
    function Circle(geom, props, opts) {
      opts = opts || {};
      var c = [Number(geom[0][0]), Number(geom[0][1])], r = Number(geom[1]) || 1000, ml = null, id = 'hofc' + (++circleN);
      function poly() {
        var pts = [], dLat = r / 111320, dLon = r / (111320 * Math.cos(c[0] * Math.PI / 180));
        for (var i = 0; i <= 64; i++) { var a = i / 64 * 2 * Math.PI; pts.push([c[1] + dLon * Math.cos(a), c[0] + dLat * Math.sin(a)]); }
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] }, properties: {} };
      }
      function col(v, d) { v = String(v || d); var m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v); return m ? { c: '#' + m[1], a: m[2] ? parseInt(m[2], 16) / 255 : 1 } : { c: v, a: 1 }; }
      function upd() { if (ml && ml.getSource(id)) ml.getSource(id).setData(poly()); }
      this.geometry = { setCoordinates: function (n) { c = [Number(n[0]), Number(n[1])]; upd(); }, setRadius: function (m) { r = Number(m) || r; upd(); }, getCoordinates: function () { return c.slice(); }, getRadius: function () { return r; } };
      this.options = { set: function () {} }; this.properties = { set: function () {} }; this.events = Events();
      this._add = function (map) {
        ml = map;
        function go() {
          if (map.getSource(id)) return;
          var f = col(opts.fillColor, '#f0c43a24'), s = col(opts.strokeColor, '#c9a227');
          map.addSource(id, { type: 'geojson', data: poly() });
          map.addLayer({ id: id + 'f', type: 'fill', source: id, paint: { 'fill-color': f.c, 'fill-opacity': f.a * (opts.opacity != null ? opts.opacity : 1) } });
          map.addLayer({ id: id + 'l', type: 'line', source: id, paint: { 'line-color': s.c, 'line-width': Number(opts.strokeWidth) || 2 } });
        }
        if (map.isStyleLoaded()) go(); else map.once('load', go);
      };
      this._remove = function () { if (!ml) return; try { ml.removeLayer(id + 'f'); ml.removeLayer(id + 'l'); ml.removeSource(id); } catch (e) { /* ignore */ } ml = null; };
    }
    function YMap(node, state) {
      var self = this;
      node = typeof node === 'string' ? document.getElementById(node) : node;
      var c = state.center || [39.92, 41.27];
      var ml = new ML.Map({ container: node, style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eae6dc' } }] },
        center: [c[1], c[0]], zoom: state.zoom != null ? state.zoom : 12, minZoom: 5, maxZoom: 18, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
      ml.touchZoomRotate.disableRotation();
      ml.addControl(new ML.NavigationControl({ showCompass: false }), 'bottom-right');
      ml.on('error', function () { /* indirilmemiş karo: sessiz */ });
      /* kaynak bilgisi (OSM / EOX) küçük «i» düğmesinde kapalı başlasın — haritayı örtmesin */
      ml.once('idle', function () { var a = node.querySelector('.maplibregl-ctrl-attrib'); if (a) { a.classList.remove('maplibregl-compact-show'); a.removeAttribute('open'); } });
      var sat = true;
      loadStyle().then(function (st) { ml.setStyle(st); }).catch(function () { /* stil yoksa düz zemin + pinler */ });
      this._ml = ml; node.__hofMap = ml;
      this.events = Events();
      ml.on('click', function (e) { self.events.fire('click', evObj({ coords: [e.lngLat.lat, e.lngLat.lng] })); });
      this.geoObjects = { add: function (o) { if (o && o._add) o._add(ml); return this; }, remove: function (o) { if (o && o._remove) o._remove(); return this; } };
      this.setCenter = function (cc, z) { ml.jumpTo({ center: [cc[1], cc[0]], zoom: z != null ? z : ml.getZoom() }); return Promise.resolve(); };
      this.getCenter = function () { var p = ml.getCenter(); return [p.lat, p.lng]; };
      this.getZoom = function () { return ml.getZoom(); };
      this.setZoom = function (z) { ml.setZoom(z); return Promise.resolve(); };
      this.setBounds = function (b, o) { ml.fitBounds([[b[0][1], b[0][0]], [b[1][1], b[1][0]]], { padding: (o && o.zoomMargin) || 40, duration: 0, maxZoom: 16 }); return Promise.resolve(); };
      this.container = { fitToViewport: function () { ml.resize(); }, getElement: function () { return node; } };
      this.destroy = function () { try { ml.remove(); } catch (e) { /* ignore */ } };
      this.controls = { add: function () {}, remove: function () {} };
      this.behaviors = { enable: function () {}, disable: function () {} };
      /* katman düğmesi + kapsama notu */
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hof-layer'; btn.textContent = '🗺 Harita'; btn.setAttribute('aria-label', 'Katman: uydu / yol haritası');
      btn.onclick = function (e) {
        e.stopPropagation(); sat = !sat;
        try { ml.setLayoutProperty('uydu', 'visibility', sat ? 'visible' : 'none'); ml.setLayoutProperty('building', 'visibility', sat ? 'none' : 'visible'); } catch (x) { /* ignore */ }
        btn.textContent = sat ? '🗺 Harita' : '🛰 Uydu';
      };
      ml.on('styledata', function () { try { if (ml.getLayer('building')) ml.setLayoutProperty('building', 'visibility', sat ? 'none' : 'visible'); } catch (x) { /* ignore */ } });
      node.appendChild(btn);
      var note = document.createElement('div'); note.className = 'hof-ovl-note'; node.appendChild(note);
      function upNote() {
        var p = ml.getCenter(), g = covering(p.lat, p.lng, false);
        if (g && g.status === 'done') { note.className = 'hof-ovl-note ok'; note.textContent = '📴 İnternetsiz harita · ' + g.name + ' bölgesi'; setTimeout(function () { if (note.className.indexOf('ok') >= 0) note.style.display = 'none'; }, 4000); note.style.display = ''; }
        else if (g) { note.className = 'hof-ovl-note'; note.style.display = ''; note.textContent = '📴 Bu bölgenin haritası yarım indi — internet olunca Ayarlar › Haritaları telefona indir › Devam et'; }
        else { note.className = 'hof-ovl-note'; note.style.display = ''; note.textContent = '📴 İnternet yok · bu bölgenin haritası telefona indirilmedi (Ayarlar › Haritaları telefona indir). Pinler yine gösterilir.'; }
      }
      ml.on('moveend', upNote); upNote();
    }
    return {
      __offline: true,
      Map: YMap, Placemark: Placemark, Circle: Circle,
      util: { bounds: { fromPoints: function (pts) { var s = 90, n = -90, w = 180, e = -180; pts.forEach(function (p) { s = Math.min(s, p[0]); n = Math.max(n, p[0]); w = Math.min(w, p[1]); e = Math.max(e, p[1]); }); return [[s, w], [n, e]]; } } },
      geocode: function () { return Promise.reject(new Error('offline')); },
      suggest: function () { return Promise.resolve([]); },
      ready: function (f) { if (f) f(); return Promise.resolve(); }
    };
  }
  var shimP = null;
  function ymapsShim() { if (!shimP) shimP = loadLib().then(function (ML) { injectCss(); return buildShim(ML); }).catch(function (e) { shimP = null; throw e; }); return shimP; }
  function shouldUseOffline() { return !online(); }

  global.SuperAriOfflineMap = {
    SIZES: SIZES, regions: regions, getRegion: getRegion, buildRegion: buildRegion, estimate: estimate, tileList: tileList,
    download: download, stop: stop, remove: remove, covering: covering, hasAny: hasAny, ask: ask, renderSettings: renderSettings,
    ymaps: ymapsShim, shouldUseOffline: shouldUseOffline, apiaries: apiaries, mb: mb, keyOf: keyOf
  };
  if (document.readyState !== 'loading') renderPill(null);
})(window);
