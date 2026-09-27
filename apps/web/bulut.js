/**
 * SüperArı bulut eşitlemesi (Supabase) — çevrimdışı öncelikli.
 *
 * - Cihaz (localStorage / IndexedDB) ANA kaynaktır; bulut yedek + ekip paylaşımıdır.
 * - Ayar /api/supabase-config (Vercel ortam değişkenleri) veya bulut-config.json'dan okunur.
 *   Ayar yoksa hiçbir şey yüklenmez / gönderilmez; uygulama bugünkü gibi yalnız cihazda çalışır.
 * - Yalnız CANLI modda çalışır; demo=true satırlar ve demo depoları asla gönderilmez.
 * - Değişiklik algılama: son eşitlenen hâlin özeti (snap) ile karşılaştırma → kuyruk (queue) → çevrimiçiyken gönderme.
 * - Çakışma: son yazan kazanır (updated_at). Sunucu da daha eski güncellemeyi yok sayar (bkz. supabase/migrations).
 * - İlk girişte cihazdaki veriler, kullanıcı seçtiği arılıklar için bir kez yüklenir.
 */
(function (global) {
  'use strict';
  var doc = global.document;
  var VERSION = (function () {
    var s = doc.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || '');
    return m ? m[1] : 'dev';
  })();
  var CFG_KEY = 'superari.bulut.config.v1';
  var STATE_KEY = 'superari.bulut.state.v1';
  var AUTH_KEY = 'sb-superari-auth-token';
  var LS = {
    apiaries: 'superari.ariliklar.v1', hives: 'superari.kovanlar.v1', queens: 'superari.anaArilar.v1',
    records: 'superari.koloniKayit.v1', harvest: 'superari.hasat.v2', ops: 'superari.koloniIslem.v1',
    tasks: 'superari.gorevler.v1', done: 'superari.gorevTamam.v1', stock: 'superari.stok.v1',
    tarti: 'superari.tartiElle.v1', /* Elle tartım: records (kind colony_event, data.type 'elle_tarti') */
    plan: 'superari.bakimPlan.v1' /* Bakım planı: arılık profili / çam balı (apiaries.data._plan), bal katı (hives.data._superSince) */
  };
  var SENSOR_FIELDS = ['weightKg', 'deltaKg', 'health', 'healthScore', 'colonyScore', 'swarmRisk'];
  var HIVE_REF = ['hiveId', 'fromHiveId', 'toHiveId', 'otherHiveId', 'mergedInto', 'splitFrom', 'sourceHiveId', 'targetHiveId'];
  var REC_KINDS = ['strength', 'brood', 'disease', 'feed', 'winter'];
  var TABLES = ['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos'];
  var COLS = {
    apiaries: ['id', 'local_id', 'name', 'data'],
    hives: ['key', 'apiary_id', 'local_id', 'name', 'data'],
    queens: ['key', 'apiary_id', 'local_id', 'hive_key', 'data'],
    records: ['key', 'apiary_id', 'local_id', 'hive_key', 'kind', 'record_date', 'data'],
    tasks: ['key', 'apiary_id', 'local_id', 'kind', 'due', 'data'],
    stock_items: ['key', 'apiary_id', 'local_id', 'name', 'category', 'qty', 'unit', 'data'],
    photos: ['key', 'apiary_id', 'local_id', 'record_ids', 'storage_path', 'data']
  };

  /* ---------------- yardımcılar ---------------- */
  function readJ(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function writeJ(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function isLive() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function hasSessionToken() { try { return !!global.localStorage.getItem(AUTH_KEY); } catch (e) { return false; } }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function omit(o, keys) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (keys.indexOf(k) < 0) r[k] = o[k]; }); return r; }
  function hashStr(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; }
  function isoDate(v) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || '')); return m ? m[1] : null; }
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    var b = new Uint8Array(16); global.crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function normName(s) { return String(s || '').trim().toLocaleLowerCase('tr'); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = doc.createElement('script');
      s.src = src; s.onload = function () { res(); }; s.onerror = function () { rej(new Error('yüklenemedi: ' + src)); };
      doc.head.appendChild(s);
    });
  }
  function fetchJson(u) {
    return global.fetch(u, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) return null;
      return r.json();
    }).catch(function () { return null; });
  }
  function toast(msg) { var P = global.SuperAriPWA; if (P && P.toast) P.toast(msg); }

  /* ---------------- ayar ---------------- */
  /** { enabled, url, anonKey, source } — enabled=false ise bulut kapalıdır. */
  function loadConfig(force) {
    var c = readJ(CFG_KEY, null);
    if (!force && c && Date.now() - (c.at || 0) < 10 * 60 * 1000) return Promise.resolve(c);
    if (global.navigator.onLine === false && c) return Promise.resolve(c);
    return fetchJson('/api/supabase-config').then(function (j) {
      if (j && j.enabled && j.url && j.anonKey) return { enabled: true, url: j.url, anonKey: j.anonKey, source: 'vercel' };
      return fetchJson('bulut-config.json').then(function (s) {
        if (s && typeof s.url === 'string' && /^https:\/\//.test(s.url) && typeof s.anonKey === 'string' && s.anonKey.length > 20) {
          return { enabled: true, url: s.url.replace(/\/+$/, ''), anonKey: s.anonKey, source: 'dosya' };
        }
        return { enabled: false, source: j ? 'vercel' : 'yok', hasUrl: !!(j && j.hasUrl), hasKey: !!(j && j.hasKey) };
      });
    }).then(function (res) { res.at = Date.now(); writeJ(CFG_KEY, res); return res; })
      .catch(function () { return c || { enabled: false, source: 'hata' }; });
  }

  /* ---------------- istemci + oturum ---------------- */
  var clientP = null;
  function client() {
    if (clientP) return clientP;
    clientP = loadConfig().then(function (cfg) {
      if (!cfg.enabled) throw new Error('bulut-kapali');
      return (global.supabase && global.supabase.createClient ? Promise.resolve() : loadScript('vendor/supabase.js?v=' + VERSION)).then(function () {
        return global.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: AUTH_KEY }
        });
      });
    });
    clientP.catch(function () { clientP = null; });
    return clientP;
  }
  function session() {
    return client().then(function (c) { return c.auth.getSession(); }).then(function (r) { return (r && r.data && r.data.session) || null; }).catch(function () { return null; });
  }
  function redirectUrl() { return global.location.origin + '/hesap.html'; }
  /* E-posta bağlantısından dönüş: #access_token (implicit), ?code= (PKCE), ?token_hash=&type= (özel şablon), #error_description.
     Adres, istemci (detectSessionInUrl) onu temizlemeden önce yükleme anında yakalanır. */
  var BOOT = { search: String(global.location.search || ''), hash: String(global.location.hash || '') };
  function parseAuthParams(search, hash) {
    var q = new URLSearchParams(String(search || '').replace(/^\?/, '')), h = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    return {
      error: h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error'),
      errorCode: h.get('error_code') || q.get('error_code'),
      code: q.get('code'), tokenHash: q.get('token_hash') || q.get('token'), type: q.get('type') || h.get('type'),
      access: h.get('access_token'), refresh: h.get('refresh_token')
    };
  }
  function cleanUrl() {
    try { global.history.replaceState(null, '', global.location.pathname); } catch (e) { /* ignore */ }
  }
  function otpType(t) { return ({ magiclink: 'magiclink', signup: 'signup', invite: 'invite', recovery: 'recovery', email_change: 'email_change' })[t] || 'email'; }
  function completeAuth(pr) {
    return client().then(function (c) {
      if (pr.error) return { error: { message: pr.errorCode === 'otp_expired' ? 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bağlantı isteyin.' : pr.error } };
      if (pr.access && pr.refresh) {
        return c.auth.getSession().then(function (r) {
          if (r && r.data && r.data.session) return r;
          return c.auth.setSession({ access_token: pr.access, refresh_token: pr.refresh });
        });
      }
      if (pr.tokenHash) return c.auth.verifyOtp({ token_hash: pr.tokenHash, type: otpType(pr.type) });
      if (pr.code) {
        return c.auth.exchangeCodeForSession(pr.code).then(function (r) {
          if (r && r.error) return { error: { message: 'Bağlantı başka bir tarayıcıda/uygulamada istenmiş. Bağlantıyı giriş istediğiniz tarayıcıda açın ya da e-postadaki bağlantıyı kopyalayıp «Bağlantıyla giriş yap» alanına yapıştırın.' } };
          return r;
        });
      }
      return { data: null };
    }).then(function (r) { if (r && r.error) throw r.error; return true; });
  }
  /** Sayfa açılışında: adres bir giriş dönüşüyse oturumu tamamlar. { none } | { ok } | hata fırlatır. */
  function handleRedirect() {
    var pr = parseAuthParams(BOOT.search, BOOT.hash);
    BOOT = { search: '', hash: '' };
    if (!pr.error && !pr.code && !pr.tokenHash && !pr.access) return Promise.resolve({ none: true });
    return completeAuth(pr).then(function () { cleanUrl(); return { ok: true }; }, function (e) { cleanUrl(); throw e; });
  }
  /** Yüklü uygulama (PWA) için: e-postadaki bağlantı kopyalanıp yapıştırılır, uygulama içinde oturum açılır. */
  function signInWithLink(text) {
    var m = /https?:\/\/\S+/.exec(String(text || ''));
    if (!m) return Promise.reject(new Error('Geçerli bir bağlantı yapıştırın'));
    var u; try { u = new URL(m[0].replace(/[)>\].,]+$/, '')); } catch (e) { return Promise.reject(new Error('Geçerli bir bağlantı yapıştırın')); }
    var pr = parseAuthParams(u.search, u.hash);
    if (!pr.error && !pr.code && !pr.tokenHash && !pr.access) return Promise.reject(new Error('Bu bağlantıda giriş bilgisi yok'));
    if (pr.tokenHash && /^pkce_/.test(pr.tokenHash)) return Promise.reject(new Error('Bu bağlantı yalnız istendiği tarayıcıda açılabilir'));
    return completeAuth(pr);
  }
  function signInEmail(email) {
    return client().then(function (c) {
      return c.auth.signInWithOtp({ email: String(email || '').trim().toLowerCase(), options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true } });
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }
  function verifyCode(email, code) {
    return client().then(function (c) {
      return c.auth.verifyOtp({ email: String(email || '').trim().toLowerCase(), token: String(code || '').trim(), type: 'email' });
    }).then(function (r) { if (r.error) throw r.error; return r.data && r.data.session; });
  }
  function signInGoogle() {
    return client().then(function (c) { return c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } }); })
      .then(function (r) { if (r.error) throw r.error; return true; });
  }
  function signOut() {
    return client().then(function (c) { return c.auth.signOut(); }).then(function () { return true; });
  }

  /* ---------------- durum ---------------- */
  function freshState(uid) {
    return { userId: uid, links: {}, keys: {}, snap: {}, queue: {}, cursors: {}, uploaded: {}, orphans: [], initialDone: false, lastSync: null, lastError: null, accepted: 0 };
  }
  function loadState(uid) {
    var s = readJ(STATE_KEY, null);
    if (!s || s.userId !== uid) s = freshState(uid);
    ['links', 'keys', 'snap', 'queue', 'cursors', 'uploaded', 'localOnly'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    if (!Array.isArray(s.orphans)) s.orphans = [];
    return s;
  }
  function saveState(s) { writeJ(STATE_KEY, s); }

  /* ---------------- yerel → satır ---------------- */
  function raw(name, d) { var v = readJ(LS[name], d); return v == null ? d : v; }
  function ctx(st) {
    var hives = raw('hives', []); if (!Array.isArray(hives)) hives = [];
    var hiveAp = {}; hives.forEach(function (h) { if (h && h.id != null) hiveAp[String(Number(h.id))] = String(h.apiaryId); });
    var revLink = {}; Object.keys(st.links).forEach(function (l) { revLink[st.links[l]] = l; });
    var revHive = {}; Object.keys(st.keys).forEach(function (k) { if (k.indexOf('hives:') === 0) revHive[st.keys[k]] = Number(k.slice(6)); });
    var c = {
      hives: hives,
      apUuid: function (localAp) { return localAp == null || localAp === '' ? null : (st.links[String(localAp)] || null); },
      apLocal: function (u) { return u ? (revLink[u] || null) : null; },
      hiveKey: function (hid) {
        if (hid == null || hid === '' || !isFinite(Number(hid))) return null;
        var n = Number(hid), k = st.keys['hives:' + n];
        if (k && st.localOnly && st.localOnly[k]) return null;
        if (k) return k;
        var u = c.apUuid(hiveAp[String(n)]);
        return u ? u + ':' + n : null;
      },
      hiveOfKey: function (k) {
        if (!k) return null;
        if (revHive[k] != null) return revHive[k];
        var n = Number(String(k).split(':')[1]);
        return isFinite(n) ? n : null;
      },
      hiveAp: hiveAp,
      revHive: revHive
    };
    return c;
  }
  function mapRefs(obj, fn) {
    if (Array.isArray(obj)) return obj.map(function (x) { return mapRefs(x, fn); });
    if (obj && typeof obj === 'object') {
      var o = {};
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        var sc = v != null && v !== '' && typeof v !== 'object';
        o[k] = (sc && HIVE_REF.indexOf(k) >= 0) ? fn(v) : (sc && k === 'apiaryId') ? fn(v, 'ap') : mapRefs(v, fn);
      });
      return o;
    }
    return obj;
  }
  function keyFor(st, ns, lid, scope) {
    var kk = ns + ':' + lid;
    if (!st.keys[kk]) st.keys[kk] = scope ? scope + ':' + lid : 'u:' + st.userId + ':' + lid;
    return st.keys[kk];
  }
  /* jsonb anahtar sırasını değiştirir; özetler sıralı anahtarla alınır */
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(function (x) { return x === undefined ? 'null' : canon(x); }).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; })
        .map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    }
    var s = JSON.stringify(v); return s === undefined ? 'null' : s;
  }
  function entry(table, key, row) {
    var h = hashStr(canon([row.apiary_id || row.id || null, row.hive_key || null, row.record_ids || null, row.data]));
    return { table: table, key: key, row: row, hash: h };
  }
  /** Canlı depolardan eşitlenecek satırlar: { key: entry } */
  function collect(st) {
    var out = {}, X = ctx(st);
    /* cihaza özgü kimlikler (kovan no, arılık id) bulutta anahtarla taşınır */
    function toCloud(v, t) {
      if (t === 'ap') { var au = X.apUuid(v); return au ? 'ap:' + au : v; }
      var hk = X.hiveKey(v); return hk ? 'hk:' + hk : v;
    }
    function add(e) { if (!st.localOnly[e.key]) out[e.key] = e; }
    var plan = raw('plan', {}); if (!plan || typeof plan !== 'object') plan = {};
    var pProf = plan.profiles || {}, pCam = plan.camBali || {}, pSup = plan.supers || {};
    var aps = raw('apiaries', []); if (!Array.isArray(aps)) aps = [];
    aps.forEach(function (a) {
      if (!a || a.id == null) return;
      var u = st.links[String(a.id)]; if (!u) return;
      var ad = omit(a, ['id']), k0 = String(a.id);
      if (pProf[k0] || pCam[k0] != null) { ad._plan = {}; if (pProf[k0]) ad._plan.profile = pProf[k0]; if (pCam[k0] != null) ad._plan.camBali = !!pCam[k0]; }
      add(entry('apiaries', u, { id: u, local_id: String(a.id), name: String(a.name || ''), data: ad }));
    });
    X.hives.forEach(function (h) {
      if (!h || h.id == null) return;
      var u = X.apUuid(h.apiaryId); if (!u) return;
      var n = Number(h.id), k = st.keys['hives:' + n] || (st.keys['hives:' + n] = u + ':' + n);
      var hd = mapRefs(omit(h, SENSOR_FIELDS.concat(['id'])), toCloud);
      if (pSup[String(n)]) hd._superSince = String(pSup[String(n)]);
      add(entry('hives', k, { key: k, apiary_id: u, local_id: String(n), name: String(h.name || ''), data: hd }));
    });
    var qs = raw('queens', []); if (!Array.isArray(qs)) qs = [];
    qs.forEach(function (q) {
      if (!q || !q.id || q.demo) return;
      var pl = Array.isArray(q.placements) ? q.placements : [];
      var first = pl[0], open = pl.filter(function (p) { return p && !p.to; })[0] || pl[pl.length - 1];
      var u = first ? X.apUuid(X.hiveAp[String(Number(first.hiveId))]) : null;
      if (!u && open) u = X.apUuid(X.hiveAp[String(Number(open.hiveId))]);
      if (!u) return;
      var k = keyFor(st, 'queens', q.id, u);
      add(entry('queens', k, { key: k, apiary_id: X.apUuid(X.hiveAp[String(Number(open && open.hiveId))]) || u, local_id: String(q.id), hive_key: open && !open.to ? X.hiveKey(open.hiveId) : null, data: mapRefs(q, toCloud) }));
    });
    var recs = raw('records', {}); if (!recs || typeof recs !== 'object') recs = {};
    Object.keys(recs).forEach(function (hid) {
      var byKind = recs[hid] || {};
      var hk = X.hiveKey(hid); if (!hk) return;
      var u = hk.split(':')[0];
      REC_KINDS.forEach(function (kind) {
        (Array.isArray(byKind[kind]) ? byKind[kind] : []).forEach(function (r) {
          if (!r || !r.id || r.demo) return;
          var k = keyFor(st, 'records', r.id, u);
          add(entry('records', k, { key: k, apiary_id: u, local_id: String(r.id), hive_key: hk, kind: kind, record_date: isoDate(r.date), data: mapRefs(r, toCloud) }));
        });
      });
    });
    var hv = raw('harvest', []); if (!Array.isArray(hv)) hv = [];
    hv.forEach(function (x) {
      if (!x || !x.id || x.demo) return;
      var hk = x.hiveId != null ? X.hiveKey(x.hiveId) : null;
      var u = X.apUuid(x.apiaryId) || (hk ? hk.split(':')[0] : null);
      if (!u) return;
      var k = keyFor(st, 'harvest', x.id, u);
      add(entry('records', k, { key: k, apiary_id: u, local_id: String(x.id), hive_key: hk, kind: 'harvest', record_date: isoDate(x.date), data: mapRefs(x, toCloud) }));
    });
    var ops = raw('ops', {}); if (!ops || typeof ops !== 'object') ops = {};
    function opsRow(list, ns, kind) {
      (Array.isArray(list) ? list : []).forEach(function (ev) {
        if (!ev || !ev.id || ev.demo) return;
        var refs = HIVE_REF.map(function (f) { return ev[f]; }).filter(function (v) { return v != null && v !== ''; });
        var u = null, blocked = false;
        refs.forEach(function (v) { var hk = X.hiveKey(v); if (hk) { if (!u) u = hk.split(':')[0]; } else if (X.hiveAp[String(Number(v))]) blocked = true; });
        if (blocked && !u) return; /* seçilmeyen arılığın kovanı: gönderme */
        var k = keyFor(st, ns, ev.id, u);
        add(entry('records', k, { key: k, apiary_id: u, local_id: String(ev.id), hive_key: null, kind: kind, record_date: isoDate(ev.date), data: mapRefs(ev, toCloud) }));
      });
    }
    opsRow(ops.events, 'opsev', 'colony_event');
    var tw = raw('tarti', []); if (!Array.isArray(tw)) tw = [];
    tw.forEach(function (x) {
      if (!x || !x.id || x.demo) return;
      var hk = X.hiveKey(x.hiveId); if (!hk) return;
      var u = hk.split(':')[0], k = keyFor(st, 'tarti', x.id, u), dd = mapRefs(x, toCloud); dd.type = 'elle_tarti';
      add(entry('records', k, { key: k, apiary_id: u, local_id: String(x.id), hive_key: hk, kind: 'colony_event', record_date: isoDate(x.date || x.at), data: dd }));
    });
    opsRow(ops.batches, 'opsb', 'graft_batch');
    function scopeOf(o) {
      if (o.apiaryId != null && o.apiaryId !== '') return { u: X.apUuid(o.apiaryId), ref: true };
      if (o.hiveId != null && o.hiveId !== '') { var hk = X.hiveKey(o.hiveId); return { u: hk ? hk.split(':')[0] : null, ref: !!X.hiveAp[String(Number(o.hiveId))] }; }
      return { u: null, ref: false };
    }
    var ts = raw('tasks', []); if (!Array.isArray(ts)) ts = [];
    ts.forEach(function (t) {
      if (!t || !t.id || t.demo) return;
      var sc = scopeOf(t); if (sc.ref && !sc.u) return;
      var k = keyFor(st, 'tasks', t.id, null);
      add(entry('tasks', k, { key: k, apiary_id: sc.u, local_id: String(t.id), kind: 'gorev', due: isoDate(t.due), data: mapRefs(t, toCloud) }));
    });
    var dn = raw('done', {}); if (!dn || typeof dn !== 'object') dn = {};
    Object.keys(dn).forEach(function (id) {
      var c = dn[id]; if (!c || c.demo) return;
      var sc = scopeOf(c); if (sc.ref && !sc.u) return;
      var k = keyFor(st, 'done', id, null);
      var d = clone(c); d.id = id;
      add(entry('tasks', k, { key: k, apiary_id: sc.u, local_id: 'done:' + id, kind: 'tamamlama', due: isoDate(c.date), data: mapRefs(d, toCloud) }));
    });
    var sk = raw('stock', []); if (!Array.isArray(sk)) sk = [];
    sk.forEach(function (x) {
      if (!x || !x.id || x.demo) return;
      var k = keyFor(st, 'stock', x.id, null);
      add(entry('stock_items', k, { key: k, apiary_id: X.apUuid(x.apiaryId), local_id: String(x.id), name: String(x.name || ''), category: x.category || null, qty: isFinite(Number(x.qty)) ? Number(x.qty) : null, unit: x.unit || null, data: mapRefs(x, toCloud) }));
    });
    return out;
  }
  function collectPhotos(st, out, F) {
    if (!F || !F.allRows) return Promise.resolve(out);
    return F.allRows().then(function (rows) {
      rows.forEach(function (p) {
        if (!p || !p.id || p.mode !== 'live') return;
        var u = null;
        (p.recordIds || []).forEach(function (rid) {
          var k = st.keys['records:' + rid] || st.keys['harvest:' + rid];
          if (!u && k && k.indexOf('u:') !== 0) u = k.split(':')[0];
        });
        if (!u) return;
        var k = keyFor(st, 'photos', p.id, u);
        var path = u + '/' + p.id + '.jpg';
        add2(out, entry('photos', k, { key: k, apiary_id: u, local_id: String(p.id), record_ids: (p.recordIds || []).map(String), storage_path: path, data: { id: p.id, createdAt: p.createdAt || null, w: p.w || null, h: p.h || null, recordIds: (p.recordIds || []).map(String) } }));
      });
      return out;
    });
  }
  function add2(out, e) { out[e.key] = e; }

  /* ---------------- değişiklik algılama ---------------- */
  function skeleton(e) {
    var s = {}; COLS[e.table].forEach(function (c) { if (c !== 'data') s[c] = e.row[c] === undefined ? null : e.row[c]; });
    return s;
  }
  function detect(st, entries) {
    var now = new Date().toISOString(), seen = {}, perTable = {}, snapPer = {};
    Object.keys(entries).forEach(function (k) {
      var e = entries[k]; seen[k] = 1; perTable[e.table] = (perTable[e.table] || 0) + 1;
      var sn = st.snap[k];
      if (sn && sn.h === e.hash) { if (st.queue[k] && !st.queue[k].del) delete st.queue[k]; return; }
      if (!st.queue[k] || st.queue[k].hash !== e.hash || st.queue[k].del) st.queue[k] = { t: e.table, at: now, hash: e.hash, fresh: !sn };
    });
    Object.keys(st.snap).forEach(function (k) { var t = st.snap[k].t; snapPer[t] = (snapPer[t] || 0) + 1; });
    Object.keys(st.snap).forEach(function (k) {
      if (seen[k]) return;
      var sn = st.snap[k];
      if (sn.t === 'apiaries') return; /* arılık silme buluta gönderilmez (ekibi etkiler) */
      if (!perTable[sn.t] && snapPer[sn.t] > 20) return; /* güvenlik: depo toptan boşaldıysa silme gönderme */
      if (!st.queue[k] || !st.queue[k].del) st.queue[k] = { t: sn.t, at: now, del: true };
    });
  }

  /* ---------------- çekme ---------------- */
  function pullTable(c, st, table) {
    var cur = st.cursors[table] || '1970-01-01T00:00:00.000Z';
    var since = new Date(Date.parse(cur) - 5000).toISOString();
    var all = [];
    function page(from) {
      return c.from(table).select('*').gt('server_updated_at', since).order('server_updated_at', { ascending: true }).range(from, from + 999)
        .then(function (r) {
          if (r.error) throw r.error;
          var rows = r.data || [];
          all = all.concat(rows);
          return rows.length === 1000 ? page(from + 1000) : all;
        });
    }
    return page(0).then(function (rows) {
      rows.forEach(function (x) { if (x.server_updated_at && x.server_updated_at > (st.cursors[table] || '')) st.cursors[table] = x.server_updated_at; });
      return rows;
    });
  }
  function remoteHash(table, r) {
    return entry(table, r.key || r.id, { id: table === 'apiaries' ? r.id : null, apiary_id: r.apiary_id, hive_key: r.hive_key, record_ids: r.record_ids, data: r.data }).hash;
  }
  function upsertBy(list, id, obj) {
    var i = -1; list.forEach(function (x, j) { if (x && String(x.id) === String(id)) i = j; });
    if (obj == null) { if (i >= 0) list.splice(i, 1); return; }
    if (i >= 0) list[i] = obj; else list.push(obj);
  }
  /** Uzak satırları yerel depolara uygular. { count, applied:[key], photos:[row] } */
  function applyRemote(st, rowsBy, cur) {
    cur = cur || {};
    var L = {
      apiaries: raw('apiaries', []), hives: raw('hives', []), queens: raw('queens', []), records: raw('records', {}),
      harvest: raw('harvest', []), ops: raw('ops', { events: [], batches: [] }), tasks: raw('tasks', []), done: raw('done', {}), stock: raw('stock', []),
      plan: raw('plan', {}), tarti: raw('tarti', [])
    };
    if (!Array.isArray(L.tarti)) L.tarti = [];
    if (!L.plan || typeof L.plan !== 'object' || Array.isArray(L.plan)) L.plan = {};
    ['profiles', 'camBali', 'supers'].forEach(function (k) { if (!L.plan[k] || typeof L.plan[k] !== 'object') L.plan[k] = {}; });
    ['apiaries', 'hives', 'queens', 'harvest', 'tasks', 'stock'].forEach(function (k) { if (!Array.isArray(L[k])) L[k] = []; });
    if (!L.records || typeof L.records !== 'object' || Array.isArray(L.records)) L.records = {};
    if (!L.done || typeof L.done !== 'object' || Array.isArray(L.done)) L.done = {};
    if (!L.ops || typeof L.ops !== 'object') L.ops = {};
    if (!Array.isArray(L.ops.events)) L.ops.events = [];
    if (!Array.isArray(L.ops.batches)) L.ops.batches = [];
    var dirty = {}, applied = [], orphans = [];
    var X = ctx(st);
    function fromCloud(v) {
      if (typeof v === 'string' && v.indexOf('ap:') === 0) { var al = X.apLocal(v.slice(3)); return al != null ? al : v; }
      return (typeof v === 'string' && v.indexOf('hk:') === 0) ? X.hiveOfKey(v.slice(3)) : v;
    }
    function skip(table, r) {
      var q = st.queue[r.key || r.id];
      if (q && !q.fresh && Date.parse(q.at) > Date.parse(r.updated_at)) return true; /* yerel daha yeni */
      var sn = st.snap[r.key || r.id];
      if (r.deleted && !sn) return true; /* burada zaten yok */
      var le = cur[r.key || r.id];
      if (le && !r.deleted && le.hash === remoteHash(table, r)) { st.snap[r.key || r.id] = { h: le.hash, t: le.table, s: skeleton(le) }; return true; }
      return !!(sn && !r.deleted && sn.h === remoteHash(table, r));
    }
    function done(r, ns, lid) { if (ns) st.keys[ns + ':' + lid] = r.key; applied.push(r.key || r.id); }
    var rows = { apiaries: [], hives: [], queens: [], records: [], tasks: [], stock_items: [] };
    (st.orphans || []).forEach(function (o) { if (rows[o.t]) rows[o.t].push(o.r); });
    st.orphans = [];
    Object.keys(rows).forEach(function (t) { rows[t] = rows[t].concat(rowsBy[t] || []); });

    rows.apiaries.forEach(function (r) {
      if (skip('apiaries', r)) return;
      var lid = X.apLocal(r.id);
      if (!lid) {
        var cand = L.apiaries.filter(function (a) { return a && String(a.id) === String(r.local_id); })[0];
        var linkedIds = {}; Object.keys(st.links).forEach(function (l) { linkedIds[l] = 1; });
        if (!cand) lid = String(r.local_id);
        else if (!linkedIds[String(cand.id)] && normName(cand.name) === normName(r.name)) lid = String(cand.id);
        else lid = 'b' + String(r.id).replace(/-/g, '').slice(0, 8);
        st.links[lid] = r.id;
        X = ctx(st);
      }
      if (r.deleted) { upsertBy(L.apiaries, lid, null); delete st.links[lid]; X = ctx(st); }
      else {
        var a = clone(r.data) || {}; a.id = lid;
        var pl = a._plan || {}; delete a._plan;
        if (pl.profile) L.plan.profiles[lid] = pl.profile; else delete L.plan.profiles[lid];
        if (pl.camBali != null) L.plan.camBali[lid] = !!pl.camBali; else delete L.plan.camBali[lid];
        dirty.plan = 1;
        upsertBy(L.apiaries, lid, a);
      }
      dirty.apiaries = 1; done(r);
    });
    rows.hives.forEach(function (r) {
      if (skip('hives', r)) return;
      var apL = X.apLocal(r.apiary_id);
      if (!apL) { orphans.push({ t: 'hives', r: r }); return; }
      var lid = X.revHive[r.key];
      if (lid == null) {
        var n = Number(r.local_id);
        var ex = L.hives.filter(function (h) { return h && Number(h.id) === n; })[0];
        var owner = st.keys['hives:' + n];
        if (!ex && !owner) lid = n;
        else if (owner === r.key) lid = n;
        else if (ex && !owner && String(ex.apiaryId) === String(apL)) lid = n;
        else { var mx = 0; L.hives.forEach(function (h) { mx = Math.max(mx, Number(h && h.id) || 0); }); lid = mx + 1; }
        st.keys['hives:' + lid] = r.key;
        X = ctx(st);
      }
      if (r.deleted) { upsertBy(L.hives, lid, null); if (L.plan.supers[String(lid)]) { delete L.plan.supers[String(lid)]; dirty.plan = 1; } }
      else {
        var cur = L.hives.filter(function (h) { return h && Number(h.id) === lid; })[0];
        var d = mapRefs(clone(r.data) || {}, fromCloud);
        var ss = d._superSince; delete d._superSince;
        if (ss) L.plan.supers[String(lid)] = String(ss); else delete L.plan.supers[String(lid)];
        dirty.plan = 1;
        var obj = {};
        if (cur) SENSOR_FIELDS.forEach(function (f) { if (cur[f] != null) obj[f] = cur[f]; });
        Object.keys(d).forEach(function (k) { obj[k] = d[k]; });
        obj.id = lid; obj.apiaryId = apL;
        upsertBy(L.hives, lid, obj);
      }
      dirty.hives = 1; done(r, 'hives', lid);
    });
    rows.queens.forEach(function (r) {
      if (skip('queens', r)) return;
      var lid = String(r.local_id);
      upsertBy(L.queens, lid, r.deleted ? null : mapRefs(clone(r.data) || {}, fromCloud));
      dirty.queens = 1; done(r, 'queens', lid);
    });
    rows.records.forEach(function (r) {
      if (skip('records', r)) return;
      var lid = String(r.local_id), d = r.deleted ? null : mapRefs(clone(r.data) || {}, fromCloud);
      if (d) d.id = lid;
      if (r.kind === 'harvest') {
        if (d) { var al = X.apLocal(r.apiary_id); if (al) d.apiaryId = al; delete d.demo; }
        upsertBy(L.harvest, lid, d); dirty.harvest = 1; done(r, 'harvest', lid); return;
      }
      if (r.kind === 'colony_event' && ((d && d.type === 'elle_tarti') || String(r.local_id).indexOf('tw') === 0)) {
        if (d) { delete d.type; delete d.demo; if (r.hive_key) { var th = X.hiveOfKey(r.hive_key); if (th != null) d.hiveId = th; } }
        upsertBy(L.tarti, lid, d); dirty.tarti = 1; done(r, 'tarti', lid); return;
      }
      if (r.kind === 'colony_event' || r.kind === 'graft_batch') {
        upsertBy(r.kind === 'colony_event' ? L.ops.events : L.ops.batches, lid, d);
        dirty.ops = 1; done(r, r.kind === 'colony_event' ? 'opsev' : 'opsb', lid); return;
      }
      if (REC_KINDS.indexOf(r.kind) < 0) return;
      Object.keys(L.records).forEach(function (h) {
        var lst = L.records[h] && L.records[h][r.kind];
        if (Array.isArray(lst)) L.records[h][r.kind] = lst.filter(function (x) { return !x || String(x.id) !== lid; });
      });
      if (d) {
        var hid = X.hiveOfKey(r.hive_key);
        if (hid == null || !L.hives.some(function (h) { return h && Number(h.id) === hid; })) { orphans.push({ t: 'records', r: r }); return; }
        delete d.demo;
        if (!L.records[String(hid)]) L.records[String(hid)] = {};
        if (!Array.isArray(L.records[String(hid)][r.kind])) L.records[String(hid)][r.kind] = [];
        L.records[String(hid)][r.kind].push(d);
      }
      dirty.records = 1; done(r, 'records', lid);
    });
    rows.tasks.forEach(function (r) {
      if (skip('tasks', r)) return;
      var d = r.deleted ? null : mapRefs(clone(r.data) || {}, fromCloud);
      if (d) { delete d.demo; var al = X.apLocal(r.apiary_id); if (al && d.apiaryId != null) d.apiaryId = al; }
      if (r.kind === 'tamamlama') {
        var id = String(r.local_id).replace(/^done:/, '');
        if (d) { delete d.id; L.done[id] = d; } else delete L.done[id];
        dirty.done = 1; done(r, 'done', id); return;
      }
      upsertBy(L.tasks, String(r.local_id), d);
      dirty.tasks = 1; done(r, 'tasks', String(r.local_id));
    });
    rows.stock_items.forEach(function (r) {
      if (skip('stock_items', r)) return;
      var d = r.deleted ? null : mapRefs(clone(r.data) || {}, fromCloud);
      if (d) delete d.demo;
      upsertBy(L.stock, String(r.local_id), d);
      dirty.stock = 1; done(r, 'stock', String(r.local_id));
    });
    st.orphans = orphans.slice(0, 500);
    suppress++;
    try { Object.keys(dirty).forEach(function (k) { writeJ(LS[k], L[k]); }); } finally { suppress--; }
    return { count: applied.length, applied: applied };
  }
  function applyPhotos(c, st, rows, F) {
    if (!F || !rows || !rows.length) return Promise.resolve([]);
    var applied = [];
    return rows.reduce(function (p, r) {
      return p.then(function () {
        if (skip2(st, r)) return;
        var id = String(r.local_id);
        return F.getRow(id).then(function (cur) {
          if (r.deleted) { st.keys['photos:' + id] = r.key; applied.push(r.key); return cur ? F.deleteRow(id) : null; }
          var ids = (r.record_ids || []).map(String);
          if (cur) {
            cur.recordIds = ids; st.keys['photos:' + id] = r.key; st.uploaded[id] = true; applied.push(r.key);
            return F.putRow(cur);
          }
          return c.storage.from('photos').download(r.storage_path).then(function (res) {
            if (res.error || !res.data) return;
            return F.compress(res.data).then(function (cp) {
              st.keys['photos:' + id] = r.key; st.uploaded[id] = true; applied.push(r.key);
              return F.putRow({ id: id, recordIds: ids, mode: 'live', createdAt: (r.data && r.data.createdAt) || r.created_at, blob: cp.blob, thumb: cp.thumb, w: cp.w, h: cp.h });
            });
          });
        }).catch(function () { /* sonraki eşitlemede yeniden denenir */ });
      });
    }, Promise.resolve()).then(function () { return applied; });
  }
  function skip2(st, r) {
    var q = st.queue[r.key];
    if (q && !q.fresh && Date.parse(q.at) > Date.parse(r.updated_at)) return true;
    var sn = st.snap[r.key];
    return !!(sn && !r.deleted && sn.h === remoteHash('photos', r));
  }

  /* ---------------- gönderme ---------------- */
  function push(c, st, entries, F) {
    var byTable = {};
    Object.keys(st.queue).forEach(function (k) {
      var q = st.queue[k], e = entries[k], row;
      if (q.del) {
        var sn = st.snap[k];
        if (!sn || !sn.s) { delete st.queue[k]; return; }
        row = clone(sn.s); row.data = {}; row.deleted = true;
      } else {
        if (!e) { delete st.queue[k]; return; }
        row = {}; COLS[e.table].forEach(function (col) { row[col] = e.row[col] === undefined ? null : e.row[col]; });
        row.deleted = false;
      }
      row.updated_at = q.at;
      (byTable[q.t] = byTable[q.t] || []).push({ k: k, row: row, e: e, del: !!q.del });
    });
    var pushed = 0;
    function uploadBlobs(items) {
      if (!F) return Promise.resolve(items.filter(function (it) { return it.del; }));
      return items.reduce(function (p, it) {
        return p.then(function (ok) {
          if (it.del || st.uploaded[it.row.local_id]) { ok.push(it); return ok; }
          return F.getRow(it.row.local_id).then(function (pr) {
            if (!pr || !pr.blob) return ok;
            return c.storage.from('photos').upload(it.row.storage_path, pr.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' }).then(function (res) {
              if (!res.error) { st.uploaded[it.row.local_id] = true; ok.push(it); }
              return ok;
            });
          });
        });
      }, Promise.resolve([]));
    }
    return TABLES.reduce(function (p, t) {
      return p.then(function () {
        var items = byTable[t] || [];
        if (!items.length) return;
        return (t === 'photos' ? uploadBlobs(items) : Promise.resolve(items)).then(function (ready) {
          var chunks = [];
          for (var i = 0; i < ready.length; i += 400) chunks.push(ready.slice(i, i + 400));
          return chunks.reduce(function (pp, ch) {
            return pp.then(function () {
              return c.from(t).upsert(ch.map(function (x) { return x.row; }), { onConflict: t === 'apiaries' ? 'id' : 'key' }).then(function (r) {
                if (r.error) throw r.error;
                ch.forEach(function (x) {
                  if (x.del) delete st.snap[x.k];
                  else st.snap[x.k] = { h: x.e.hash, t: t, s: skeleton(x.e) };
                  delete st.queue[x.k];
                  pushed++;
                });
              });
            });
          }, Promise.resolve());
        });
      });
    }, Promise.resolve()).then(function () { return pushed; });
  }


  /* ---------------- giden kutusu (outbox) ---------------- */
  /* Her yerel yazma (izlenen localStorage anahtarları + fotoğraf eklendi/silindi) ağsız çalışır:
     değişiklik sıraya (st.queue, kalıcı) alınır; çevrimiçi ve girişliyken gönderilir. */
  var suppress = 0, syncBusy = false, WATCH = {};
  Object.keys(LS).forEach(function (k) { WATCH[LS[k]] = 1; });
  function storedState() { var s = readJ(STATE_KEY, null); return s && s.userId ? loadState(s.userId) : null; }
  function markPending() {
    if (!isLive()) return Promise.resolve(0);
    var st = storedState(); if (!st || !st.initialDone) return Promise.resolve(st ? Object.keys(st.queue).length : 0);
    var entries = collect(st);
    return ensureFoto().then(function (F) { return collectPhotos(st, entries, F); }).then(function () {
      var fresh = storedState(); if (!fresh || fresh.userId !== st.userId) return 0;
      /* eşitleme sırasında yazılmış olabilir: yalnız sıra/anahtarları güncelle */
      fresh.keys = st.keys; detect(fresh, entries); saveState(fresh);
      emitStatus();
      var n = Object.keys(fresh.queue).length;
      if (n && global.navigator.onLine === false) bgSync();
      return n;
    }).catch(function () { return 0; });
  }
  /* Background Sync (Chrome/Android): bağlantı gelince SW açık sayfaya «outbox'ı gönder» der; ayrıca online olayı + açılış/odak/3 dk çekme. */
  function bgSync() {
    try {
      var sw = global.navigator.serviceWorker; if (!sw) return;
      sw.ready.then(function (r) { if (r && r.sync) return r.sync.register('superari-outbox'); }).catch(function () { /* desteklenmiyor */ });
    } catch (e) { /* ignore */ }
  }
  function localStatus() {
    var st = storedState();
    return {
      live: isLive(), online: global.navigator.onLine !== false, signedIn: hasSessionToken(), busy: syncBusy,
      pending: st ? Object.keys(st.queue).length : 0, lastSync: st ? st.lastSync : null, lastError: st ? st.lastError : null,
      initialDone: !!(st && st.initialDone)
    };
  }
  function emitStatus() {
    try { global.dispatchEvent(new CustomEvent('superari-cloud-status', { detail: localStatus() })); } catch (e) { /* ignore */ }
  }
  var hooked = false;
  function hookWrites(onChange) {
    if (hooked) return; hooked = true;
    try {
      var S = global.Storage && global.Storage.prototype; if (!S) return;
      var oSet = S.setItem, oRem = S.removeItem;
      S.setItem = function (k, v) { var r = oSet.apply(this, arguments); if (!suppress && WATCH[k] && this === global.localStorage) onChange(); return r; };
      S.removeItem = function (k) { var r = oRem.apply(this, arguments); if (!suppress && WATCH[k] && this === global.localStorage) onChange(); return r; };
    } catch (e) { /* ignore */ }
    global.addEventListener('superari-photos-changed', onChange);
  }
  /* Küçük durum göstergesi: alt menüdeki Ayarlar sekmesinde nokta (yeşil eşit · turuncu bekliyor · kırmızı hata · gri çevrimdışı). */
  function paintIndicator(s) {
    s = s || localStatus();
    var tab = doc.querySelector('nav.tabbar a[href="ayarlar.html"]');
    if (!tab) return;
    var dot = tab.querySelector('.sa-cloud-dot');
    if (!s.live || !s.signedIn) { if (dot) dot.remove(); return; }
    if (!doc.getElementById('sa-cloud-css')) {
      var cs = doc.createElement('style'); cs.id = 'sa-cloud-css';
      cs.textContent = 'nav.tabbar a{position:relative}.sa-cloud-dot{position:absolute;top:3px;right:calc(50% - 16px);width:9px;height:9px;border-radius:50%;border:1.5px solid #fff;background:#2f9e44;pointer-events:none}' +
        '.sa-cloud-dot.p{background:#f08c00}.sa-cloud-dot.e{background:#e03131}.sa-cloud-dot.o{background:#adb5bd}.sa-cloud-dot.b{background:#1c7ed6;animation:saCloud 1s ease-in-out infinite alternate}@keyframes saCloud{to{opacity:.35}}';
      doc.head.appendChild(cs);
    }
    if (!dot) { dot = doc.createElement('span'); dot.className = 'sa-cloud-dot'; dot.setAttribute('aria-hidden', 'true'); tab.appendChild(dot); }
    var cls = s.busy ? 'b' : (!s.online ? 'o' : (s.lastError ? 'e' : (s.pending ? 'p' : '')));
    dot.className = 'sa-cloud-dot' + (cls ? ' ' + cls : '');
    tab.title = s.busy ? 'Bulut: eşitleniyor' : (!s.online ? 'Bulut: çevrimdışı · ' + s.pending + ' bekleyen' : (s.lastError ? 'Bulut: eşitleme hatası' : (s.pending ? 'Bulut: ' + s.pending + ' değişiklik bekliyor' : 'Bulut: eşit')));
  }

  /* ---------------- eşitleme ---------------- */
  var syncing = null;
  function ensureFoto() {
    if (global.SuperAriFoto) return Promise.resolve(global.SuperAriFoto);
    return loadScript('foto.js?v=' + VERSION).then(function () { return global.SuperAriFoto || null; }).catch(function () { return null; });
  }
  function sync(opts) {
    opts = opts || {};
    if (syncing) return syncing;
    syncBusy = true; emitStatus();
    syncing = (function () {
      if (!isLive()) return Promise.resolve({ skipped: 'demo' });
      if (global.navigator.onLine === false) return markPending().then(function (n) { return { skipped: 'offline', pending: n }; });
      var c, st, F, entries, pulled = 0, firstUpload = false;
      return client().then(function (cc) { c = cc; return c.auth.getSession(); }).then(function (r) {
        var ses = r && r.data && r.data.session;
        if (!ses) return { skipped: 'login' };
        st = loadState(ses.user.id);
        var acc = Date.now() - (st.accepted || 0) > 6 * 3600 * 1000 || opts.force
          ? c.rpc('sa_accept_invites').then(function (x) { if (!x.error) st.accepted = Date.now(); }, function () {})
          : Promise.resolve();
        return acc.then(ensureFoto).then(function (f) {
          F = f;
          entries = collect(st);
          return collectPhotos(st, entries, F);
        }).then(function () {
          detect(st, entries); saveState(st);
          var rowsBy = {};
          return TABLES.reduce(function (p, t) { return p.then(function () { return pullTable(c, st, t).then(function (rows) { rowsBy[t] = rows; }); }); }, Promise.resolve())
            .then(function () {
              var res = applyRemote(st, rowsBy, entries);
              return applyPhotos(c, st, rowsBy.photos, F).then(function (ph) { return res.applied.concat(ph); });
            });
        }).then(function (applied) {
          pulled = applied.length;
          if (!pulled) return;
          entries = collect(st);
          return collectPhotos(st, entries, F).then(function () {
            applied.forEach(function (k) {
              if (entries[k]) st.snap[k] = { h: entries[k].hash, t: entries[k].table, s: skeleton(entries[k]) };
              else delete st.snap[k];
              delete st.queue[k];
            });
          });
        }).then(function () {
          /* İlk giriş: Canlı moddaki tüm arılıklar otomatik bağlanır ve her şey yüklenir (idempotent: sabit anahtar + upsert). */
          if (st.initialDone || opts.noAuto) return;
          var aps = raw('apiaries', []); if (!Array.isArray(aps)) aps = [];
          aps.forEach(function (a) { if (a && a.id != null && !st.links[String(a.id)]) st.links[String(a.id)] = uuid(); });
          st.initialDone = true; st.autoInitAt = new Date().toISOString(); firstUpload = true;
          entries = collect(st);
          return collectPhotos(st, entries, F).then(function () { detect(st, entries); saveState(st); });
        }).then(function () {
          if (st.baseline) {
            var bl = {}; st.baseline.forEach(function (u) { bl[u] = 1; });
            if (!entries || pulled) entries = entries || collect(st);
            Object.keys(entries).forEach(function (k) {
              var e = entries[k];
              if (!st.snap[k] && bl[e.row.apiary_id]) { st.localOnly[k] = 1; delete st.queue[k]; delete entries[k]; }
            });
            delete st.baseline;
          }
          saveState(st);
          return st.initialDone ? push(c, st, entries, F) : 0;
        }).then(function (pushed) {
          st.lastSync = new Date().toISOString(); st.lastError = null; st.lastPushed = pushed; st.lastPulled = pulled; saveState(st);
          if (pulled) { try { global.dispatchEvent(new CustomEvent('superari-cloud-pulled', { detail: { count: pulled } })); } catch (e) { /* ignore */ } }
          return { pulled: pulled, pushed: pushed, pending: Object.keys(st.queue).length, firstUpload: firstUpload };
        });
      }).catch(function (err) {
        if (st) { st.lastError = String((err && (err.message || err.error_description)) || err).slice(0, 200); saveState(st); }
        return { error: String((err && err.message) || err) };
      });
    })().then(function (r) { syncing = null; syncBusy = false; emitStatus(); return r; }, function (e) { syncing = null; syncBusy = false; emitStatus(); throw e; });
    return syncing;
  }

  /* ---------------- ilk yükleme / arılık bağlama ---------------- */
  function currentState() {
    return session().then(function (s) { return s ? loadState(s.user.id) : null; });
  }
  /** Seçilen yerel arılıkları buluta bağlar ve ilk yüklemeyi yapar. */
  function linkApiaries(localIds) {
    return currentState().then(function (st) {
      if (!st) throw new Error('Önce giriş yapın');
      if (!isLive()) throw new Error('Yalnız Canlı modda yüklenebilir');
      var chosen = {};
      (localIds || []).forEach(function (id) { chosen[String(id)] = 1; if (!st.links[String(id)]) st.links[String(id)] = uuid(); });
      /* buluttan eşleşen ama yükleme için seçilmeyen arılıklarda yerel kayıtlar yalnız bu cihazda kalır */
      st.baseline = Object.keys(st.links).filter(function (l) { return !chosen[l]; }).map(function (l) { return st.links[l]; });
      st.initialDone = true;
      saveState(st);
      return sync({ force: true });
    });
  }
  function status() {
    return loadConfig().then(function (cfg) {
      var base = { enabled: !!cfg.enabled, source: cfg.source, live: isLive(), online: global.navigator.onLine !== false };
      if (!cfg.enabled) return base;
      return session().then(function (s) {
        base.loggedIn = !!s;
        if (!s) return base;
        var st = loadState(s.user.id);
        base.email = s.user.email; base.userId = s.user.id;
        base.lastSync = st.lastSync; base.lastError = st.lastError; base.pending = Object.keys(st.queue).length;
        base.initialDone = !!st.initialDone; base.links = clone(st.links);
        return base;
      });
    });
  }

  /** Buluttaki (bu hesabın erişebildiği) tüm satırları okur: indirme / paylaşma için JSON. */
  function exportCloud() {
    var c, out = { app: 'SüperArı', exportedAt: new Date().toISOString(), tables: {} };
    return client().then(function (cc) { c = cc; return c.auth.getSession(); }).then(function (r) {
      var ses = r && r.data && r.data.session; if (!ses) throw new Error('Önce giriş yapın');
      out.email = ses.user.email;
      return TABLES.reduce(function (p, t) {
        return p.then(function () {
          var all = [];
          function page(from) {
            return c.from(t).select('*').eq('deleted', false).order(t === 'apiaries' ? 'id' : 'key').range(from, from + 999).then(function (x) {
              if (x.error) throw x.error;
              all = all.concat(x.data || []);
              return (x.data || []).length === 1000 ? page(from + 1000) : all;
            });
          }
          return page(0).then(function (rows) { out.tables[t] = rows; });
        });
      }, Promise.resolve());
    }).then(function () { return out; });
  }

  /* ---------------- ekip ---------------- */
  function apUuidOf(localId) {
    return currentState().then(function (st) { var u = st && st.links[String(localId)]; if (!u) throw new Error('Arılık buluta bağlı değil'); return u; });
  }
  function team(localApiaryId) {
    var u;
    return apUuidOf(localApiaryId).then(function (x) { u = x; return client(); }).then(function (c) {
      return Promise.all([
        c.rpc('sa_apiary_team', { aid: u }),
        c.from('apiary_invites').select('id,email,role,created_at').eq('apiary_id', u).is('accepted_at', null).order('created_at')
      ]);
    }).then(function (r) {
      if (r[0].error) throw r[0].error;
      return { members: r[0].data || [], invites: (r[1] && !r[1].error && r[1].data) || [] };
    });
  }
  function invite(localApiaryId, email) {
    var em = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return Promise.reject(new Error('Geçerli bir e-posta yazın'));
    var u;
    return sync({ force: true }).then(function () { return apUuidOf(localApiaryId); }).then(function (x) { u = x; return client(); }).then(function (c) {
      return c.from('apiary_invites').upsert({ apiary_id: u, email: em, role: 'uye' }, { onConflict: 'apiary_id,email' });
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }
  function cancelInvite(id) {
    return client().then(function (c) { return c.from('apiary_invites').delete().eq('id', id); }).then(function (r) { if (r.error) throw r.error; return true; });
  }
  function removeMember(localApiaryId, userId) {
    return apUuidOf(localApiaryId).then(function (u) {
      return client().then(function (c) { return c.from('apiary_members').delete().eq('apiary_id', u).eq('user_id', userId); });
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  /* ---------------- arka plan ---------------- */
  var started = false;
  function autoStart() {
    if (started) return;
    started = true;
    var timer = null;
    function soon(ms) { clearTimeout(timer); timer = setTimeout(function () { sync(); }, ms); }
    soon(1500);
    var mt = null;
    hookWrites(function () {
      clearTimeout(mt);
      mt = setTimeout(function () { markPending().then(function () { if (global.navigator.onLine !== false) soon(2500); }); }, 700);
    });
    global.addEventListener('superari-cloud-status', function (e) { paintIndicator(e.detail); });
    global.addEventListener('offline', function () { emitStatus(); });
    setTimeout(function () { paintIndicator(); }, 300);
    global.addEventListener('online', function () { soon(1000); });
    try { if (global.navigator.serviceWorker) global.navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'sync-outbox') soon(300); }); } catch (e) { /* ignore */ }
    global.addEventListener('superari-records-changed', function () { soon(4000); });
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') soon(1500); });
    var lastFocus = 0;
    global.addEventListener('focus', function () { if (Date.now() - lastFocus > 20000) { lastFocus = Date.now(); soon(1500); } });
    global.addEventListener('pageshow', function (e) { if (e.persisted) soon(1500); });
    setInterval(function () { if (doc.visibilityState === 'visible') sync(); }, 3 * 60 * 1000);
    global.addEventListener('superari-cloud-pulled', function (e) {
      if (/hesap\.html/.test(global.location.pathname)) return;
      toast('Buluttan ' + ((e.detail && e.detail.count) || 0) + ' değişiklik alındı · görmek için sayfayı yenileyin');
    });
  }

  global.SuperAriBulut = {
    version: VERSION,
    loadConfig: loadConfig,
    client: client,
    session: session,
    hasSessionToken: hasSessionToken,
    signInEmail: signInEmail,
    verifyCode: verifyCode,
    signInGoogle: signInGoogle,
    signOut: signOut,
    handleRedirect: handleRedirect,
    signInWithLink: signInWithLink,
    status: status,
    sync: sync,
    linkApiaries: linkApiaries,
    team: team,
    invite: invite,
    cancelInvite: cancelInvite,
    removeMember: removeMember,
    autoStart: autoStart,
    markPending: markPending,
    localStatus: localStatus,
    exportCloud: exportCloud,
    _collect: function (st) { return collect(st); },
    _applyRemote: applyRemote,
    _loadState: loadState
  };
})(window);
