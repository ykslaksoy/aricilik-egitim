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
  global.addEventListener('offline', function () { toast('Çevrimdışı · kayıtlar bu cihaza yazılmaya devam eder'); });
  global.addEventListener('online', function () { toast('Tekrar çevrimiçi'); });

  global.SuperAriPWA = {
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

  if (doc.readyState === 'complete') register();
  else global.addEventListener('load', register);
})(window);
