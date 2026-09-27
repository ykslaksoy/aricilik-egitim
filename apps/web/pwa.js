/**
 * SüperArı PWA — ana ekrana ekleme, çevrimdışı açılış (service worker) ve durum bildirimi.
 * Her sayfanın sonunda yüklenir: <script src="pwa.js?v=..."></script>
 * SW adresi sayfa sürümünü taşır (sw.js?v=...): yeni yayında yeni önbellek kurulur, eskisi silinir.
 */
(function (global) {
  var doc = global.document;
  var VERSION = (function () {
    var s = doc.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || '');
    return m ? decodeURIComponent(m[1]) : 'dev';
  })();
  /* ---- Kullanım şartları / KVKK onayı (ilk kullanımda ve sürüm değişince) ---- */
  (function () {
    if (global.SuperAriSartlar) return;
    var s = doc.createElement('script');
    s.src = 'sartlar.js?v=' + encodeURIComponent(VERSION);
    (doc.head || doc.documentElement).appendChild(s);
  })();
  /* ---- Hata kaydı (kendi sunucumuz: /api/log). Kimlik / e-posta / sorgu dizesi gönderilmez; sayfa başına en çok 5, günde en çok 30. ---- */
  (function () {
    if (global.__saErrHook) return; global.__saErrHook = true;
    var sent = {}, n = 0, DAY_KEY = 'superari.hataLog.gun.v1';
    function dayOk() {
      try {
        var t = new Date().toISOString().slice(0, 10), o = JSON.parse(global.localStorage.getItem(DAY_KEY) || '{}');
        if (o.d !== t) o = { d: t, n: 0 };
        if (o.n >= 30) return false;
        o.n++; global.localStorage.setItem(DAY_KEY, JSON.stringify(o)); return true;
      } catch (e) { return true; }
    }
    function clip(v, m) { v = v == null ? '' : String(v); return v.length > m ? v.slice(0, m) : v; }
    function report(msg, src, line, col, stack, kind) {
      try {
        msg = clip(msg, 500);
        if (!msg || /^Script error\.?$/i.test(msg) || /ResizeObserver loop/i.test(msg)) return;
        if (src && !/^https?:/.test(src)) return;
        if (src && src.indexOf(global.location.origin) !== 0) return; /* eklenti / dış betik */
        if (/^(localhost|127\.|0\.0\.0\.0)/.test(global.location.hostname)) return;
        var sig = msg + '|' + src + '|' + line;
        if (sent[sig] || n >= 5 || !dayOk()) return;
        sent[sig] = 1; n++;
        var body = JSON.stringify({ v: VERSION, page: global.location.pathname.split('/').pop() || '/', kind: kind, message: msg,
          source: clip(String(src || '').replace(global.location.origin, '').split('?')[0], 200), line: line || null, col: col || null,
          stack: clip(String(stack || '').split(global.location.origin).join(''), 2000),
          mode: (function () { try { return global.localStorage.getItem('superari.workMode') || ''; } catch (e) { return ''; } })() });
        if (global.navigator.sendBeacon && global.navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }))) return;
        global.fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      } catch (e) { /* ignore */ }
    }
    global.addEventListener('error', function (e) {
      if (!e || e.target && e.target !== global) return; /* kaynak yükleme hataları değil */
      report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack, 'error');
    });
    global.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      var m = r && r.message ? r.message : (typeof r === 'string' ? r : '');
      if (!m || /Failed to fetch|NetworkError|Load failed|AbortError|aborted|network/i.test(m)) return;
      report('Promise: ' + m, global.location.href, 0, 0, r && r.stack, 'promise');
    });
    global.SuperAriHataLog = { report: report };
  })();
  var deferredPrompt = null, listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }

  /* ---- head: manifest / simgeler / tema ---- */
  function addHead(tag, attrs) {
    var sel = tag + Object.keys(attrs).filter(function (k) { return k === 'rel' || k === 'name'; }).map(function (k) { return '[' + k + '="' + attrs[k] + '"]'; }).join('');
    if (doc.head.querySelector(sel)) return;
    var el = doc.createElement(tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    doc.head.appendChild(el);
  }
  addHead('link', { rel: 'manifest', href: '/manifest.json' });
  addHead('link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' });
  addHead('meta', { name: 'theme-color', content: '#c9a227' });
  addHead('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  addHead('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  addHead('meta', { name: 'apple-mobile-web-app-title', content: 'SüperArı' });
  addHead('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });

  function isStandalone() {
    return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || global.navigator.standalone === true;
  }
  function isIOS() {
    var ua = global.navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (ua.indexOf('Macintosh') >= 0 && global.navigator.maxTouchPoints > 1);
  }

  /* ---- Service worker ---- */
  var swReady = null;
  function register() {
    if (!('serviceWorker' in global.navigator) || global.isSecureContext === false) { swReady = Promise.resolve(null); return swReady; }
    swReady = global.navigator.serviceWorker.register('/sw.js?v=' + encodeURIComponent(VERSION), { scope: '/' })
      .then(function (reg) { try { reg.update(); } catch (e) { /* ignore */ } return reg; })
      .catch(function () { return null; });
    return swReady;
  }
  function registration() {
    if (!('serviceWorker' in global.navigator)) return Promise.resolve(null);
    return (swReady || register()).then(function (reg) {
      return reg ? global.navigator.serviceWorker.ready.then(function (r) { return r; }) : null;
    });
  }

  /* ---- Ana ekrana ekle ---- */
  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  global.addEventListener('appinstalled', function () { deferredPrompt = null; toast('SüperArı ana ekrana eklendi'); emit(); });
  function canPrompt() { return !!deferredPrompt; }
  function install() {
    if (!deferredPrompt) return Promise.resolve(false);
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    return (p.userChoice || Promise.resolve({})).then(function (c) { emit(); return c && c.outcome === 'accepted'; });
  }
  function installHelpText() {
    if (isStandalone()) return 'Uygulama ana ekrandan açık. Kayıtlar internet olmadan da bu cihaza yazılır.';
    if (isIOS()) return 'iPhone / iPad: Safari\'de alttaki Paylaş (□↑) düğmesine, ardından «Ana Ekrana Ekle»ye dokunun.';
    if (canPrompt()) return 'Tek dokunuşla ana ekrana ekleyin; uygulama internet olmadan da açılır.';
    return 'Tarayıcı menüsünden «Ana ekrana ekle» / «Uygulamayı yükle» seçeneğini kullanın (Chrome, Edge, Samsung Internet).';
  }

  /* ---- Çevrimdışı durum ---- */
  function toast(msg) {
    var K = global.SuperAriKoloni;
    if (K && typeof K.toast === 'function') { K.toast(msg); return; }
    var t = doc.createElement('div');
    t.textContent = msg;
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:calc(100vw - 32px);background:#1f2933;color:#fff;padding:.55rem .9rem;border-radius:999px;font:600 .85rem system-ui,sans-serif;z-index:99999;box-shadow:0 6px 18px rgba(0,0,0,.25);text-align:center;';
    doc.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  }
  /* Küçük «Çevrimdışı» göstergesi (sayfa düzenine dokunmaz; üstte sabit küçük etiket). Hava verisi son güncelleme saatiyle. */
  function lastWeatherAt() {
    try {
      var rows = JSON.parse(global.localStorage.getItem('superari.hava.kayit.v3') || '[]'), best = '';
      (Array.isArray(rows) ? rows : (rows && rows.records) || []).forEach(function (r) { if (r && r.at && String(r.at) > best) best = String(r.at); });
      if (!best) return '';
      var d = new Date(best); if (isNaN(d)) return '';
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }
  function paintOffline() {
    var off = global.navigator.onLine === false, el = doc.getElementById('saOffline');
    if (!off) { if (el) el.remove(); return; }
    if (!doc.body) return;
    if (!el) {
      el = doc.createElement('div'); el.id = 'saOffline'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;top:calc(6px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:99998;background:#495057;color:#fff;font:700 11.5px/1.2 system-ui,sans-serif;padding:4px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.2);pointer-events:none;white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;text-overflow:ellipsis;';
      doc.body.appendChild(el);
    }
    var w = lastWeatherAt();
    el.textContent = '⚡ Çevrimdışı' + (w ? ' · son güncelleme ' + w : '');
  }
  global.addEventListener('offline', function () { paintOffline(); toast('Çevrimdışı · kayıtlar bu cihaza yazılır, internet gelince buluta gönderilir'); });
  global.addEventListener('online', function () { paintOffline(); toast('Tekrar çevrimiçi'); });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', paintOffline); else paintOffline();

  /* ---- Yerel bildirimler (sunucu yok: yalnız uygulama açıldığında / açıkken denetlenir) ---- */
  var NOTIF_KEY = 'superari.bildirim.v1', SENT_KEY = 'superari.bildirimGonderildi.v1', CHECK_EVERY_MS = 30 * 60 * 1000;
  function readJson(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function writeJson(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function notifSupported() { return 'Notification' in global; }
  function notifPermission() { return notifSupported() ? global.Notification.permission : 'unsupported'; }
  function notifEnabled() { return !!readJson(NOTIF_KEY, {}).on && notifPermission() === 'granted'; }
  function setNotif(on) { var s = readJson(NOTIF_KEY, {}); s.on = !!on; writeJson(NOTIF_KEY, s); emit(); }
  function enableNotif() {
    if (!notifSupported()) return Promise.resolve('unsupported');
    var ask = global.Notification.permission === 'granted' ? Promise.resolve('granted')
      : new Promise(function (res) {
        var p = global.Notification.requestPermission(function (x) { res(x); });
        if (p && p.then) p.then(res);
      });
    return ask.then(function (perm) {
      setNotif(perm === 'granted');
      if (perm === 'granted') checkDue(true);
      return perm;
    });
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  /** Bildirilecek görevler: tarihi gelmiş açık görevler, bekleme süresi bitişleri, ana arı yenileme. */
  function dueItems() {
    var D = global.SuperAriDemo;
    if (!D || !D.taskStore || typeof D.taskStore.open !== 'function') return null;
    var mode = 'demo';
    try { mode = global.localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { /* ignore */ }
    var today = todayIso(), out = [];
    (D.taskStore.open() || []).forEach(function (t) {
      if (!t || !t.id) return;
      if (mode === 'live' && t.demo) return;
      var isQueen = t.kind === 'ana' || /^kr-ana-yenile-/.test(t.id);
      var isWithdrawal = /^kr-bekleme-bitti-/.test(t.id);
      if (!isQueen && !(t.due && String(t.due).slice(0, 10) <= today)) return;
      out.push({
        queen: isQueen, demo: mode === 'demo' || !!t.demo, hiveName: isQueen ? String(t.title || '').replace(/^Ana arıyı yenile — /, '') : '',
        key: mode + '|' + t.id + '|' + String(t.due || t.sig || ''),
        title: (mode === 'demo' || t.demo ? 'Demo · ' : '') + (isWithdrawal ? 'Bekleme süresi bitti' : isQueen ? 'Ana arı yenileme' : 'Görev tarihi geldi'),
        body: String(t.title || 'Görev') + (t.due && !isWithdrawal ? ' · ' + fmt(t.due) : ''),
        url: isQueen ? '/gorevler.html#queenTasks' : '/gorevler.html',
        tag: 'superari-' + t.id
      });
    });
    return out;
  }
  function show(title, opts) {
    opts = opts || {};
    opts.icon = opts.icon || '/icons/icon-192.png';
    opts.badge = opts.badge || '/icons/icon-192.png';
    opts.lang = 'tr';
    return registration().then(function (reg) {
      if (reg && reg.showNotification) return reg.showNotification(title, opts).then(function () { return true; });
      if (notifSupported()) { var n = new global.Notification(title, opts); n.onclick = function () { global.focus(); if (opts.data && opts.data.url) global.location.href = opts.data.url; }; return true; }
      return false;
    }).catch(function () { return false; });
  }
  /** Tarihi gelen görevleri bildirir; her görev (ve tekrarı) bir kez bildirilir. */
  function checkDue(force) {
    if (!notifEnabled()) return Promise.resolve(0);
    var s = readJson(NOTIF_KEY, {}), now = Date.now();
    if (!force && s.lastCheck && now - s.lastCheck < 5 * 60 * 1000) return Promise.resolve(0);
    var items = dueItems();
    if (!items) return Promise.resolve(0);
    s.lastCheck = now; writeJson(NOTIF_KEY, s);
    var sent = readJson(SENT_KEY, {});
    Object.keys(sent).forEach(function (k) { if (now - sent[k] > 90 * 864e5) delete sent[k]; });
    var fresh = items.filter(function (it) { return !sent[it.key]; });
    if (!fresh.length) { writeJson(SENT_KEY, sent); return Promise.resolve(0); }
    var dated = fresh.filter(function (it) { return !it.queen; }), queens = fresh.filter(function (it) { return it.queen; });
    var pre = fresh[0].demo ? 'Demo · ' : '';
    var list = dated.length > 3 ? dated.slice(0, 2) : dated;
    var jobs = list.map(function (it) { return show(it.title, { body: it.body, tag: it.tag, data: { url: it.url } }); });
    if (dated.length > 3) {
      jobs.push(show(pre + (dated.length - 2) + ' görev daha bekliyor', { body: 'Görevler sayfasında tümünü görün.', tag: 'superari-ozet', data: { url: '/gorevler.html' } }));
    }
    if (queens.length === 1) jobs.push(show(queens[0].title, { body: queens[0].body, tag: queens[0].tag, data: { url: queens[0].url } }));
    else if (queens.length > 1) {
      jobs.push(show(pre + 'Ana arı yenileme · ' + queens.length + ' kovan', {
        body: queens.slice(0, 3).map(function (q) { return q.hiveName; }).join(', ') + (queens.length > 3 ? ' ve ' + (queens.length - 3) + ' kovan daha' : ''),
        tag: 'superari-ana-ozet', data: { url: '/gorevler.html#queenTasks' }
      }));
    }
    fresh.forEach(function (it) { sent[it.key] = now; });
    writeJson(SENT_KEY, sent);
    return Promise.all(jobs).then(function () { return fresh.length; });
  }
  function testNotif() { return show('SüperArı · Deneme', { body: 'Bildirimler çalışıyor. Tarihi gelen görevler böyle görünecek.', tag: 'superari-deneme', data: { url: '/gorevler.html' } }); }
  function notifHelpText() {
    var p = notifPermission();
    if (p === 'unsupported') return isIOS() && !isStandalone()
      ? 'iPhone / iPad\'de bildirimler yalnız uygulama ana ekrana eklendikten sonra (iOS 16.4+) ve oradan açılınca kullanılabilir.'
      : 'Bu tarayıcı bildirimleri desteklemiyor.';
    if (p === 'denied') return 'Bildirim izni engellenmiş. Tarayıcı / telefon ayarlarından bu site için izin verin.';
    if (notifEnabled()) return 'Bildirimler açık: bekleme süresi bitişi, ana arı yenileme ve tarihi gelen görevler bildirilir.';
    return 'Bekleme süresi bitişi, ana arı yenileme ve görev tarihleri için bildirim alın.';
  }
  function startNotifLoop() {
    setTimeout(function () { checkDue(false); }, 2500);
    setInterval(function () { checkDue(true); }, CHECK_EVERY_MS);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') checkDue(false); });
  }

  global.SuperAriPWA = {
    notifSupported: notifSupported,
    notifPermission: notifPermission,
    notifEnabled: notifEnabled,
    enableNotif: enableNotif,
    disableNotif: function () { setNotif(false); },
    checkDue: checkDue,
    dueItems: dueItems,
    testNotif: testNotif,
    notifHelpText: notifHelpText,
    version: VERSION,
    isStandalone: isStandalone,
    isIOS: isIOS,
    canPrompt: canPrompt,
    install: install,
    installHelpText: installHelpText,
    registration: registration,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    toast: toast
  };

  /* ---- Bulut eşitlemesi: yalnız Canlı modda ve daha önce giriş yapılmışsa yüklenir.
   * Bulut ayarı yoksa kimse giriş yapamaz → hiçbir şey yüklenmez, ağ isteği yapılmaz. ---- */
  function bulutBoot() {
    try {
      if (global.localStorage.getItem('superari.workMode') !== 'live') return;
      if (!global.localStorage.getItem('sb-superari-auth-token')) return;
    } catch (e) { return; }
    if (/\/hesap\.html$/.test(global.location.pathname)) return; /* hesap sayfası kendisi yönetir */
    function go() { if (global.SuperAriBulut) global.SuperAriBulut.autoStart(); }
    if (global.SuperAriBulut) { go(); return; }
    var s = doc.createElement('script');
    s.src = 'bulut.js?v=' + encodeURIComponent(VERSION);
    s.onload = go;
    doc.head.appendChild(s);
  }
  /* ---- Canlı sağlık skoru: modülü içermeyen sayfalarda da (kayıt eklenen her yerde) yeniden hesaplansın ---- */
  function liveHealthBoot() {
    try { if (global.localStorage.getItem('superari.workMode') !== 'live') return; } catch (e) { return; }
    if (global.SuperAriLiveHealth || !global.SuperAriDemo) return;
    var s = doc.createElement('script');
    s.src = 'saglik-canli.js?v=' + encodeURIComponent(VERSION);
    doc.head.appendChild(s);
  }
  function onLoad() { register(); startNotifLoop(); liveHealthBoot(); bulutBoot(); }
  if (doc.readyState === 'complete') onLoad();
  else global.addEventListener('load', onLoad);
})(window);
