/* koloni-140: Yönetici eşikleri (Supabase public.app_esikler, herkese okunur). Son değer cihazda önbelleğe alınır; çevrimdışı önbellek, o da yoksa varsayılan. */
(function (g) {
  var KEY = 'superari.esikler.v1';
  var DEF = { koloniGucu: { zayifMaxCerceve: 4, ortaMaxCerceve: 7 }, bolmeMinCerceve: 9, uyari: { varroaYuzde: 3, dusukPilYuzde: 20, gunlukKiloDususKg: 1, kovanIciMinC: 10, kovanIciMaxC: 38, nemMaxYuzde: 80 } };
  function merge(a, b) { var o = JSON.parse(JSON.stringify(a)); Object.keys(b || {}).forEach(function (k) { o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? merge(o[k] || {}, b[k]) : b[k]; }); return o; }
  function cached() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function get() { var c = cached(); return merge(DEF, c && c.data); }
  function sync() {
    var B = g.SuperAriBulut; if (!B || g.navigator.onLine === false) return Promise.resolve(false);
    return B.loadConfig().then(function (cfg) { if (!cfg || !cfg.enabled) return false;
      return B.client().then(function (c) { return c.from('app_esikler').select('data,updated_at').eq('id', 1).maybeSingle(); }).then(function (r) {
        if (r.error || !r.data) return false; var c = cached(); if (c && c.at === r.data.updated_at) return false;
        try { localStorage.setItem(KEY, JSON.stringify({ at: r.data.updated_at, data: r.data.data })); } catch (e) {}
        try { g.dispatchEvent(new CustomEvent('superari-esikler')); } catch (e) {} return true; });
    }).catch(function () { return false; });
  }
  g.SuperAriEsikler = { DEFAULTS: DEF, get: get, sync: sync, KEY: KEY };
  setTimeout(sync, 3000);
})(window);
