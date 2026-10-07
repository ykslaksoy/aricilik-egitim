/**
 * k102 · Eksik sayfalara iPhone 12 kabuğu (bk-kabuk + nav.js fitIphone12Shell).
 * pwa.js sonunda yüklenir; .phone zaten varsa yalnız nav.js eksikse tamamlar.
 */
(function (global) {
  'use strict';
  if (global.__saIphone12Boot) return;
  global.__saIphone12Boot = 1;
  var doc = global.document;
  var body = doc.body;
  if (!body) return;
  var page = (global.location.pathname || '').split('/').pop() || 'index.html';
  if (/^ana-LOCKED|^master-78\.html$/i.test(page)) return;

  var v = 'koloni-104';
  try {
    var cs = doc.currentScript;
    var m = cs && /[?&]v=([^&]+)/.exec(cs.src || '');
    if (m) v = decodeURIComponent(m[1]);
  } catch (eV) { /* ignore */ }

  function hasPhone() {
    return !!doc.querySelector('.phone');
  }
  function hasBkScript() {
    return !!doc.querySelector('script[src*="bk-kabuk.js"]');
  }
  function hasNavScript() {
    return !!doc.querySelector('script[src*="nav.js"]');
  }

  function appendCss(href) {
    if (doc.querySelector('link[href*="bk-kabuk.css"]')) return;
    var l = doc.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    (doc.head || doc.documentElement).appendChild(l);
  }
  function appendScript(src, next) {
    var s = doc.createElement('script');
    s.src = src;
    s.onload = function () { if (next) next(); };
    s.onerror = function () { if (next) next(); };
    body.appendChild(s);
  }

  function ensureNav() {
    if (hasNavScript() || global.SuperAriNav) return;
    if (!hasPhone() && !global.SuperAriBkKabuk) return;
    appendScript('nav.js?v=' + encodeURIComponent(v));
  }

  function run() {
    if (hasPhone() && (global.SuperAriBkKabuk || hasBkScript())) {
      ensureNav();
      return;
    }
    if (hasPhone()) {
      ensureNav();
      return;
    }
    if (hasBkScript() || global.SuperAriBkKabuk) {
      ensureNav();
      return;
    }
    appendCss('bk-kabuk.css?v=' + encodeURIComponent(v));
    appendScript('bk-kabuk.js?v=' + encodeURIComponent(v), ensureNav);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', run);
  else run();
})(window);
