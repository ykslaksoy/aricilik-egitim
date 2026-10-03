/* SüperArı — canlı referans fiyat yardımcısı (Stok «Talep oluştur»).
 * window.SuperAriFiyatLive.refresh(opts?) → Promise<priceFile>
 *   priceFile: data/fiyat-ref.json ile aynı biçim ({ updated, currency, method, items:[{ key, name, unit, ref, min, max, n, sources, note? }] }).
 *   Sıra: 1) GET /api/fiyat (kaynak sayfalar sunucuda yeniden okunur; updated = ISO saatli, kaynakta live/fetchedAt, kalemde liveCount)
 *         2) olmazsa data/fiyat-ref.json (no-store + ?t=)
 *         3) olmazsa localStorage «superari.stok.fiyatcache.v1» ({ at, data })
 *   Dönen nesnede ek alan: source = 'live' | 'file' | 'cache' (cache için cachedAt). Hiçbiri yoksa Promise reddedilir.
 *   Yalnız canlı başarıda önbelleğe { at: ISO, data } yazılır (opts.writeCache === false ile kapatılır).
 *   opts.timeoutMs: /api/fiyat için bekleme (varsayılan 15000).
 * /api/fiyat hiçbir zaman service worker tarafından önbelleğe alınmaz (sw.js /api/ isteklerine karışmaz). */
(function (global) {
  'use strict';
  var CACHE_KEY = 'superari.stok.fiyatcache.v1';
  var ENDPOINT = '/api/fiyat';
  var FILE = 'data/fiyat-ref.json';
  var inflight = null;

  function valid(j) { return !!(j && typeof j === 'object' && Array.isArray(j.items)); }
  function fetchJson(url, ms) {
    if (!global.fetch) return Promise.reject(new Error('fetch yok'));
    var ctl = global.AbortController ? new global.AbortController() : null;
    var timer = ctl && ms ? setTimeout(function () { ctl.abort(); }, ms) : null;
    function done() { if (timer) clearTimeout(timer); }
    return global.fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        if (!/json/i.test(r.headers.get('content-type') || '')) throw new Error('JSON değil');
        return r.json();
      })
      .then(function (j) { done(); if (!valid(j)) throw new Error('geçersiz fiyat dosyası'); return j; }, function (e) { done(); throw e; });
  }
  function readCache() {
    try { var c = JSON.parse(global.localStorage.getItem(CACHE_KEY) || 'null'); return c && valid(c.data) ? c : null; } catch (e) { return null; }
  }
  function writeCache(j) {
    try { global.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: new Date().toISOString(), data: j })); } catch (e) { /* kota / gizli mod */ }
  }

  function refresh(opts) {
    opts = opts || {};
    if (inflight) return inflight; /* çift dokunuşta tek istek */
    var offline = global.navigator && global.navigator.onLine === false;
    var errors = [];
    var p = (offline ? Promise.reject(new Error('çevrimdışı')) : fetchJson(ENDPOINT + '?t=' + Date.now(), opts.timeoutMs || 15000))
      .then(function (j) {
        j.source = 'live';
        if (opts.writeCache !== false) writeCache(j);
        return j;
      })
      .catch(function (e) {
        errors.push('api: ' + ((e && e.message) || e));
        if (offline) throw e;
        return fetchJson(FILE + '?t=' + Date.now(), 8000).then(function (j) { j.source = 'file'; return j; });
      })
      .catch(function (e) {
        if (errors.length < 2) errors.push('file: ' + ((e && e.message) || e));
        var c = readCache();
        if (!c) { var err = new Error('Fiyat alınamadı (' + errors.join('; ') + ')'); err.errors = errors; throw err; }
        c.data.source = 'cache'; c.data.cachedAt = c.at || '';
        return c.data;
      })
      .then(function (j) { api.last = j; api.errors = errors; inflight = null; return j; }, function (e) { api.errors = errors; inflight = null; throw e; });
    inflight = p;
    return p;
  }

  var api = { refresh: refresh, CACHE_KEY: CACHE_KEY, ENDPOINT: ENDPOINT, last: null, errors: [] };
  global.SuperAriFiyatLive = api;
})(typeof window !== 'undefined' ? window : globalThis);
