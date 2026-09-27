/* SüperArı alt menü: Ana · Bakım · ＋ · Bugün · Ayarlar
 * ＋ Hızlı kayıt sayfasını açar (koloni.js gerekirse yüklenir). */
(function (global) {
  'use strict';
  var V = 'qk-1';
  var ICONS = {
    ana: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-6v-5H10v5H4z"/></svg>',
    bakim: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="15.5" rx="2"/><path d="M9.5 4.5V3.6h5v.9"/><path d="M9 11l2 2 4-4.2M9 16.5h6"/></svg>',
    bugun: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6" width="15" height="13.5" rx="2"/><path d="M4.5 10h15M9 4v3.5M15 4v3.5"/><circle cx="12" cy="14.6" r="1.8"/></svg>',
    ayarlar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 4.5v2.2M12 17.3V19.5M4.5 12h2.2M17.3 12H19.5M7 7l1.6 1.6M15.4 15.4 17 17M17 7l-1.6 1.6M8.6 15.4 7 17"/></svg>'
  };
  var CSS = '' +
    'nav.tabbar{overflow:visible!important;}' +
    'nav.tabbar .tab svg{width:20px!important;height:20px!important;display:block;fill:none!important;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}' +
    'nav.tabbar .tab{min-width:0;}' +
    '.tabbar .tab-plus{border:0;background:transparent;font:inherit;cursor:pointer;position:relative;padding:0 2px 4px;color:#8a7764;overflow:visible!important;}' +
    '.tabbar .tab-plus .plus-c{display:flex;align-items:center;justify-content:center;width:52px;height:52px;margin-top:-22px;border-radius:50%;' +
      'background:linear-gradient(145deg,#ffd666,#f0a202);color:#3b2400;font-size:32px;font-weight:500;line-height:1;' +
      'box-shadow:0 4px 12px rgba(160,100,0,.35),0 0 0 4px #fffdf8;}' +
    '.tabbar .tab-plus:active .plus-c{transform:scale(.96);}' +
    '.tabbar .tab-plus .plus-l{font-size:10px;font-weight:600;margin-top:2px;}' +
    'nav.tabbar.sa-fixed{position:fixed;left:0;right:0;bottom:0;z-index:800;height:72px;background:#fffdf8;border-top:1px solid #e4d6c2;display:grid;' +
      'grid-template-columns:repeat(5,1fr);align-items:center;padding:0 2px calc(10px + env(safe-area-inset-bottom));max-width:520px;margin:0 auto;box-sizing:content-box;}' +
    'nav.tabbar.sa-fixed .tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:48px;padding:4px 2px;border-radius:10px;' +
      'color:#8a7764;font-size:10px;font-weight:600;text-decoration:none;-webkit-tap-highlight-color:transparent;}' +
    'nav.tabbar.sa-fixed .tab.active{color:#e56f1c;}' +
    'nav.tabbar.sa-fixed .tab svg{width:20px;height:20px;display:block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}' +
    'body.sa-has-fixed-tabbar{padding-bottom:96px;}' +
    'nav.tabbar .tab-bugun{position:relative;overflow:visible!important;}' +
    'nav.tabbar .nav-badge{position:absolute;top:0;left:calc(50% + 4px);min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#e03131;color:#fff;' +
      'font-size:10px;font-weight:800;line-height:17px;text-align:center;box-shadow:0 0 0 2px #fffdf8;box-sizing:border-box;}' +
    'nav.tabbar .nav-badge[hidden]{display:none;}';

  function page() {
    var p = (location.pathname.split('/').pop() || 'ana.html').toLowerCase();
    return p || 'ana.html';
  }
  function navHtml(active) {
    function a(key, href, label) {
      return '<a class="tab' + (active === key ? ' active' : '') + '" href="' + href + '"' + (active === key ? ' aria-current="page"' : '') + '>' + ICONS[key] + label + '</a>';
    }
    return a('ana', 'ana.html', 'Ana') + a('bakim', 'bakim.html', 'Bakım') +
      '<button type="button" class="tab tab-plus" data-quick-record aria-label="Hızlı kayıt"><span class="plus-c" aria-hidden="true">＋</span><span class="plus-l">Kayıt</span></button>' +
      a('bugun', 'bugun.html', 'Bugün').replace('class="tab', 'class="tab tab-bugun').replace('</svg>', '</svg><span class="nav-badge" hidden aria-hidden="true"></span>') +
      a('ayarlar', 'ayarlar.html', 'Ayarlar');
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function openQuick() {
    function go() {
      var K = global.SuperAriKoloni;
      if (K && K.openQuickRecord) {
        var hid = null;
        try { var q = new URLSearchParams(location.search); if (page() === 'kovan.html') hid = q.get('id') || q.get('hiveId'); } catch (e) { hid = null; }
        K.openQuickRecord({ hiveId: hid, onSaved: function () { try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) {} } });
      } else {
        alert('Hızlı kayıt yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
      }
    }
    var chain = Promise.resolve();
    if (!global.SuperAriDemo) chain = chain.then(function () { return loadScript('demo-data.js?v=koloni-31'); });
    if (!global.SuperAriKoloni || !global.SuperAriKoloni.openQuickRecord) chain = chain.then(function () { return loadScript('koloni.js?v=koloni-31'); });
    chain.then(go, go);
  }
  function init() {
    if (!document.getElementById('saNavCss')) {
      var st = document.createElement('style'); st.id = 'saNavCss'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var p = page();
    var active = p === 'ana.html' ? 'ana' : (p === 'bakim.html' ? 'bakim' : (p === 'bugun.html' ? 'bugun' : (p === 'ayarlar.html' ? 'ayarlar' : '')));
    var navs = document.querySelectorAll('nav.tabbar');
    if (!navs.length && document.body && document.body.getAttribute('data-tabbar') === 'fixed') {
      var n = document.createElement('nav');
      n.className = 'tabbar sa-fixed';
      n.setAttribute('aria-label', 'Alt menü');
      document.body.appendChild(n);
      document.body.classList.add('sa-has-fixed-tabbar');
      navs = [n];
    }
    Array.prototype.forEach.call(navs, function (n) {
      n.innerHTML = navHtml(active);
      n.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-quick-record]')) { e.preventDefault(); openQuick(); }
      });
    });
    if (global.SuperAriDemo) updateBadge();
    else loadScript('demo-data.js?v=koloni-31').then(updateBadge, updateBadge);
  }
  /* Bugün sekmesi: etkin uyarı + bugün/geciken açık görev sayısı (0 ise gizli). */
  function updateBadge() {
    var n = 0, na = 0, nt = 0;
    try {
      var D = global.SuperAriDemo;
      na = D && D.alerts ? D.alerts.length : 0;
      if (D && D.taskStore && D.records) {
        var today = D.records.todayLocal();
        nt = D.taskStore.open().filter(function (t) { return t.due && t.due <= today; }).length;
      }
    } catch (e) { na = 0; nt = 0; }
    n = na + nt;
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabbar .tab-bugun'), function (t) {
      var b = t.querySelector('.nav-badge');
      if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; t.appendChild(b); }
      b.textContent = n > 99 ? '99+' : String(n);
      b.hidden = !n;
      t.setAttribute('aria-label', 'Bugün' + (na ? ', ' + na + ' etkin uyarı' : '') + (nt ? ', ' + nt + ' bugün veya geciken görev' : ''));
    });
  }
  global.addEventListener('superari-records-changed', function () { setTimeout(updateBadge, 0); });
  global.SuperAriNav = { openQuick: openQuick, navHtml: navHtml, V: V };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
