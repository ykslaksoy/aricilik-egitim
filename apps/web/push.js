/**
 * SüperArı — arka plan bildirimleri (Web Push; ücretsiz, standart).
 * Uygulama kapalıyken de görev / ilaç bekleme / yumurta kontrolü / ana yenileme / oğul riski / sağlık uyarısı gelir.
 * Yalnız Canlı modda ve bulut girişiyle; abonelik sunucuda kullanıcının kendi satırı olarak saklanır (push_subscriptions).
 * Yerel bildirimler (pwa.js) yedek olarak çalışmaya devam eder.
 */
(function (global) {
  'use strict';
  var nav = global.navigator;
  function isIOS() { return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1); }
  function standalone() { return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true; }
  function supported() { return 'serviceWorker' in nav && 'PushManager' in global && 'Notification' in global; }
  function live() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function b64ToU8(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4), b = (s + pad).replace(/-/g, '+').replace(/_/g, '/'), raw = global.atob(b), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function reg() {
    if (!('serviceWorker' in nav)) return Promise.resolve(null);
    return nav.serviceWorker.getRegistration().then(function (r) { return r || nav.serviceWorker.register('/sw.js?v=' + ((global.SuperAriBulut && global.SuperAriBulut.version) || 'dev'), { scope: '/' }); })
      .then(function () { return nav.serviceWorker.ready; });
  }
  var cfgP = null;
  function config() {
    if (!cfgP) cfgP = global.fetch('/api/push-subscribe', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { enabled: false }; }).catch(function () { cfgP = null; return { enabled: false, offline: true }; });
    return cfgP;
  }
  function token() {
    var B = global.SuperAriBulut;
    if (!B) return Promise.resolve(null);
    return B.session().then(function (s) { return s && s.access_token; });
  }
  function api(body) {
    return token().then(function (t) {
      if (!t) throw new Error('Önce bulut hesabına giriş yapın');
      return global.fetch('/api/push-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
  }
  /** Durum: { supported, ios, standalone, permission, subscribed, serverEnabled, live, hint } */
  function status() {
    var st = { supported: supported(), ios: isIOS(), standalone: standalone(), permission: 'Notification' in global ? global.Notification.permission : 'unsupported', subscribed: false, live: live() };
    if (st.ios && !st.standalone) st.hint = 'iPhone/iPad’de arka plan bildirimi yalnız ana ekrana eklenmiş uygulamada çalışır (iOS 16.4+): Safari’de Paylaş → «Ana Ekrana Ekle», sonra SüperArı’yı ana ekrandan açıp buradan bildirimleri açın.';
    else if (!st.supported) st.hint = 'Bu tarayıcı arka plan bildirimini desteklemiyor. Uygulama açıkken yerel hatırlatmalar yine çalışır.';
    return config().then(function (c) {
      st.serverEnabled = !!c.enabled;
      if (!st.supported) return st;
      return reg().then(function (r) { return r && r.pushManager.getSubscription(); }).then(function (s) { st.subscribed = !!s; return st; }, function () { return st; });
    });
  }
  function askPermission() {
    if (global.Notification.permission === 'granted') return Promise.resolve('granted');
    return new Promise(function (res) { var p = global.Notification.requestPermission(function (x) { res(x); }); if (p && p.then) p.then(res); });
  }
  /** Bildirimleri aç: izin + abonelik + sunucuya kaydet. */
  function enable() {
    if (!supported()) return Promise.reject(new Error(isIOS() && !standalone() ? 'iPhone’da önce uygulamayı ana ekrana ekleyin, sonra ana ekrandan açın.' : 'Bu tarayıcı arka plan bildirimini desteklemiyor.'));
    if (!live()) return Promise.reject(new Error('Arka plan bildirimleri yalnız Canlı modda çalışır (demo veriler için bildirim gönderilmez).'));
    return token().then(function (t) {
      if (!t) throw new Error('Önce bulut hesabına giriş yapın');
      return config();
    }).then(function (c) {
      if (!c.enabled || !c.publicKey) throw new Error(c.offline ? 'İnternet bağlantısı yok.' : 'Bildirim sunucusu henüz hazır değil.');
      return askPermission().then(function (perm) {
        if (perm !== 'granted') throw new Error('Bildirim izni verilmedi. Tarayıcı / telefon ayarlarından SüperArı için bildirimlere izin verin.');
        return reg();
      }).then(function (r) {
        return r.pushManager.getSubscription().then(function (s) {
          if (s) {
            /* anahtar değiştiyse yeniden abone ol */
            var cur = s.options && s.options.applicationServerKey;
            if (cur && global.btoa(String.fromCharCode.apply(null, new Uint8Array(cur))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== c.publicKey) return s.unsubscribe().then(function () { return null; });
          }
          return s;
        }).then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(c.publicKey) }); });
      });
    }).then(function (sub) {
      return api({ action: 'subscribe', subscription: sub.toJSON() });
    }).then(function () {
      try { global.localStorage.setItem('superari.push.v1', JSON.stringify({ on: true, at: new Date().toISOString() })); } catch (e) { /* ignore */ }
      return true;
    });
  }
  function disable() {
    return reg().then(function (r) { return r && r.pushManager.getSubscription(); }).then(function (s) {
      if (!s) return true;
      var ep = s.endpoint;
      return s.unsubscribe().then(function () { return api({ action: 'unsubscribe', endpoint: ep }).catch(function () { return null; }); });
    }).then(function () { try { global.localStorage.removeItem('superari.push.v1'); } catch (e) { /* ignore */ } return true; });
  }
  function test() { return api({ action: 'test' }); }
  /* Giriş sonrası abonelik sunucuda yoksa sessizce yenile (günde en çok bir kez). */
  function refresh() {
    var s = null; try { s = JSON.parse(global.localStorage.getItem('superari.push.v1') || 'null'); } catch (e) { s = null; }
    if (!s || !s.on || !supported() || !live() || global.Notification.permission !== 'granted') return Promise.resolve(false);
    if (s.at && Date.now() - new Date(s.at).getTime() < 20 * 3600 * 1000) return Promise.resolve(false);
    return enable().catch(function () { return false; });
  }
  global.SuperAriPush = { supported: supported, status: status, enable: enable, disable: disable, test: test, refresh: refresh, isIOS: isIOS, standalone: standalone };
})(window);
