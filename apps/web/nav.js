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
    'nav.tabbar .nav-badge[hidden]{display:none;}' +
    '@media print{nav.tabbar.sa-fixed{display:none!important;}body.sa-has-fixed-tabbar{padding-bottom:0!important;}}';

  function page() {
    var p = (location.pathname.split('/').pop() || 'ana.html').toLowerCase();
    return p || 'ana.html';
  }
  /* k94: Bakım'a bağlı sayfalarda Bakım sekmesi, Bugün sayfasında Bugün sekmesi etkin; diğer saha sayfalarında hiçbiri.
   * Sayfa <body data-tab="bakim|bugun|ana|ayarlar|"> ile açıkça belirtebilir. */
  var BAKIM_PAGES = { 'bakim.html': 1, 'bakim-akis.html': 1, 'stok.html': 1, 'gorevler.html': 1, 'bakim-plan.html': 1, 'goc.html': 1, 'ekipman.html': 1 };
  function activeTab(p) {
    var b = document.body;
    if (b && b.hasAttribute('data-tab')) return b.getAttribute('data-tab') || '';
    if (p === 'ana.html') return 'ana';
    if (BAKIM_PAGES[p]) return 'bakim';
    if (p === 'bugun.html') return 'bugun';
    if (p === 'ayarlar.html') return 'ayarlar';
    return '';
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
    if (!global.SuperAriDemo) chain = chain.then(function () { return loadScript('demo-data.js?v=koloni-94'); });
    if (!global.SuperAriKoloni || !global.SuperAriKoloni.openQuickRecord) chain = chain.then(function () { return loadScript('koloni.js?v=koloni-94'); });
    chain.then(go, go);
  }
  /* k94 · Bağlama duyarlı ＋ Kayıt. Sayfa window.SuperAriQuickActions = [{ ic, t, d, run }] (ya da bunu döndüren işlev)
   * tanımlarsa ＋ önce O SAYFANIN kayıt işlemlerini (mevcut form / sayfaları) gösteren alt sayfayı açar; en altta küçük
   * «Tüm kayıtlar» = eski Hızlı kayıt. Tanım yoksa (Ana, Bakım …) davranış değişmez: doğrudan Hızlı kayıt.
   * stok.html'in kendi işleyicisi (SuperAriQuickHandler / setQuickHandler) önceliklidir. */
  var QA_CSS = '.sa-qa-back{position:fixed;inset:0;z-index:9500;background:rgba(30,20,10,.45);display:flex;align-items:flex-end;justify-content:center;}' +
    '.sa-qa{width:100%;max-width:430px;max-height:86vh;overflow:auto;background:#fffdf8;border-radius:20px 20px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.18);' +
      'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#2c241c;box-sizing:border-box;}' +
    '.sa-qa *{box-sizing:border-box;}' +
    '.sa-qa-h{display:flex;align-items:center;gap:8px;margin:0 0 10px;}.sa-qa-h b{flex:1;font-size:16px;font-weight:800;}' +
    '.sa-qa-x{width:44px;height:44px;border:0;border-radius:12px;background:#f4f5f7;font-size:18px;color:#5c3a1f;cursor:pointer;}' +
    '.sa-qa-list{display:grid;gap:8px;}' +
    '.sa-qa-btn{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:8px 12px;border-radius:14px;border:1px solid #e0c56a;background:linear-gradient(180deg,#fff6df 0%,#f4e3b0 55%,#ebd9a0 100%);' +
      'color:#4a2f1a;font:inherit;text-align:left;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;}' +
    '.sa-qa-btn:active{transform:scale(.99);}' +
    '.sa-qa-btn .i{font-size:24px;flex:0 0 32px;text-align:center;line-height:1;}.sa-qa-btn .t{display:flex;flex-direction:column;min-width:0;}' +
    '.sa-qa-btn .t b{font-size:15px;font-weight:800;}.sa-qa-btn .t small{font-size:12px;font-weight:600;color:#6b635a;margin-top:2px;}' +
    '.sa-qa-all{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:44px;margin-top:10px;border:1px solid #e4e6ea;border-radius:12px;background:#f4f5f7;color:#5c3a1f;font:inherit;font-size:13px;font-weight:700;cursor:pointer;}' +
    '.sa-qa-sub{margin:-4px 0 10px;font-size:12.5px;color:#6b635a;font-weight:600;}' +
    '.sa-qa-hives{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}' +
    '.sa-qa-hv{min-height:52px;border-radius:12px;border:1px solid #e4e6ea;background:#f4f5f7;font:inherit;font-size:14px;font-weight:800;color:#5c3a1f;cursor:pointer;padding:4px;}' +
    '.sa-qa-empty{padding:14px;border-radius:12px;background:#fff;border:1px dashed #d0c4b0;color:#6b635a;font-weight:650;text-align:center;}';
  function qesc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emitSaved() { try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ } }
  function ensureData() { return global.SuperAriDemo ? Promise.resolve() : loadScript('demo-data.js?v=koloni-94').catch(function () {}); }
  function ensureKoloni() {
    return ensureData().then(function () {
      if (global.SuperAriKoloni && global.SuperAriKoloni.openRecordSheet) return null;
      return loadScript('koloni.js?v=koloni-94').catch(function () {});
    });
  }
  function closeSheet() { var o = document.getElementById('saQuickSheet'); if (o && o.parentNode) o.parentNode.removeChild(o); }
  function sheet(title, sub, html, onClick) {
    closeSheet();
    if (!document.getElementById('saQaCss')) { var st = document.createElement('style'); st.id = 'saQaCss'; st.textContent = QA_CSS; document.head.appendChild(st); }
    var back = document.createElement('div');
    back.className = 'sa-qa-back'; back.id = 'saQuickSheet';
    back.innerHTML = '<div class="sa-qa" role="dialog" aria-modal="true" aria-label="' + qesc(title) + '"><div class="sa-qa-h"><b>' + qesc(title) + '</b>' +
      '<button type="button" class="sa-qa-x" data-qa-x aria-label="Kapat">✕</button></div>' + (sub ? '<p class="sa-qa-sub">' + qesc(sub) + '</p>' : '') + html + '</div>';
    back.addEventListener('click', function (e) {
      if (e.target === back || (e.target.closest && e.target.closest('[data-qa-x]'))) { closeSheet(); return; }
      if (onClick) onClick(e);
    });
    document.body.appendChild(back);
    var f = back.querySelector('.sa-qa-btn, .sa-qa-hv'); if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    return back;
  }
  function pageActions() {
    var a = global.SuperAriQuickActions;
    if (typeof a === 'function') { try { a = a(); } catch (e) { a = null; } }
    return Array.isArray(a) ? a.filter(function (x) { return x && x.t && typeof x.run === 'function'; }) : [];
  }
  function openActions(list) {
    var title = global.SuperAriQuickTitle || ('Kayıt · ' + String(document.title || '').split('·')[0].trim());
    var html = '<div class="sa-qa-list">' + list.map(function (x, i) {
      return '<button type="button" class="sa-qa-btn" data-qa="' + i + '"><span class="i" aria-hidden="true">' + qesc(x.ic || '＋') + '</span><span class="t"><b>' + qesc(x.t) + '</b>' + (x.d ? '<small>' + qesc(x.d) + '</small>' : '') + '</span></button>';
    }).join('') + '</div><button type="button" class="sa-qa-all" data-qa-all>☰ Tüm kayıtlar</button>';
    sheet(title, '', html, function (e) {
      var b = e.target.closest && e.target.closest('[data-qa]');
      if (b) { var x = list[Number(b.getAttribute('data-qa'))]; closeSheet(); try { x.run(); } catch (er) { openQuick(); } return; }
      if (e.target.closest && e.target.closest('[data-qa-all]')) { closeSheet(); openQuick(); }
    });
  }
  function scopeApiary() {
    var D = global.SuperAriDemo, ap = '';
    try { ap = new URLSearchParams(location.search).get('apiary') || ''; } catch (e) { ap = ''; }
    if (!ap && page() === 'arilik.html') { try { ap = new URLSearchParams(location.search).get('id') || ''; } catch (e) { ap = ''; } }
    if (!ap) { try { ap = localStorage.getItem('superari.bakim.scope') || ''; } catch (e) { ap = ''; } }
    if (ap === 'all') ap = '';
    if (ap && D && D.apiaryById && !D.apiaryById(ap)) ap = '';
    return ap;
  }
  /** Kovan seçici (kapsamdaki etkin kovanlar) → cb(hiveId). Tek kovan varsa doğrudan geçer. */
  function pickHive(title, cb) {
    ensureData().then(function () {
      var D = global.SuperAriDemo; if (!D) return;
      var ap = scopeApiary(), a = ap && D.apiaryById ? D.apiaryById(ap) : null;
      var hs = (D.loadHives() || []).filter(function (h) { return h && h.colonyState !== 'sonuk' && h.colonyState !== 'birlestirildi' && (!ap || String(h.apiaryId) === String(ap)); });
      var num = function (h) { var m = /(\d+)\s*$/.exec(String(h.name || '')); return m ? Number(m[1]) : 1e9; };
      hs.sort(function (x, y) { return (num(x) - num(y)) || String(x.name).localeCompare(String(y.name), 'tr'); });
      if (hs.length === 1) { cb(String(hs[0].id)); return; }
      var html = hs.length ? '<div class="sa-qa-hives">' + hs.map(function (h) { return '<button type="button" class="sa-qa-hv" data-hv="' + qesc(h.id) + '">' + qesc(h.name) + '</button>'; }).join('') + '</div>'
        : '<p class="sa-qa-empty">Bu kapsamda kovan yok.</p>';
      sheet(title, 'Kovan seçin · ' + (a ? a.name : 'tüm arılıklar') + ' (' + hs.length + ')', html, function (e) {
        var b = e.target.closest && e.target.closest('[data-hv]');
        if (b) { closeSheet(); cb(b.getAttribute('data-hv')); }
      });
    });
  }
  /** Mevcut konu kayıt formu (koloni.js openRecordSheet) — önce kovan seçilir. then(back) form açıldıktan sonra. */
  function rec(topic, label, then) {
    return function () {
      ensureKoloni().then(function () {
        var K = global.SuperAriKoloni; if (!K || !K.openRecordSheet) { openQuick(); return; }
        pickHive(label || (K.TOPIC_LABEL && K.TOPIC_LABEL[topic]) || 'Kayıt', function (hid) {
          K.openRecordSheet(topic, hid, emitSaved);
          if (then) { try { then(document.getElementById('koloniRecord')); } catch (e) { /* ignore */ } }
        });
      });
    };
  }
  /** Kovan / ana arı düzenleyicisi (koloni.js openEditor: ırk, hat, ana arı yılı / kaynağı) — önce kovan seçilir. */
  function hiveEditor(label, onSaved) {
    return function () {
      ensureKoloni().then(function () {
        var K = global.SuperAriKoloni; if (!K || !K.openEditor) { openQuick(); return; }
        pickHive(label || 'Ana arı bilgisi', function (hid) { K.openEditor(hid, function () { emitSaved(); if (onSaved) onSaved(); }); });
      });
    };
  }
  /** Hızlı kayıt formu belirli türle (çoklu kovan seçilebilir). */
  function quickType(type) {
    return function () {
      ensureKoloni().then(function () {
        var K = global.SuperAriKoloni; if (!K || !K.openQuickRecord) { openQuick(); return; }
        K.openQuickRecord({ type: type, apiaryId: scopeApiary() || undefined, onSaved: emitSaved });
      });
    };
  }
  /** Sayfadaki bir forma / bölüme kaydır ve ilk alana odaklan. */
  function focusEl(sel) {
    return function () {
      var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return;
      if (el.hidden) el.hidden = false;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
      var f = el.matches && el.matches('input,select,textarea') ? el : el.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea');
      if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 350);
    };
  }
  /** Bilgi alt sayfası (metin + isteğe bağlı bağlantı düğmeleri [{ ic, t, d, href }]). */
  function info(title, text, links) {
    return function () {
      sheet(title, '', '<p style="margin:0 0 10px;font-size:14px;line-height:1.4;font-weight:600;color:#4a2f1a;">' + qesc(text) + '</p>' +
        ((links || []).length ? '<div class="sa-qa-list">' + links.map(function (x) {
          return '<a class="sa-qa-btn" href="' + qesc(x.href) + '"><span class="i" aria-hidden="true">' + qesc(x.ic || '›') + '</span><span class="t"><b>' + qesc(x.t) + '</b>' + (x.d ? '<small>' + qesc(x.d) + '</small>' : '') + '</span></a>';
        }).join('') + '</div>' : ''));
    };
  }
  function go(href) { return function () { location.href = href; }; }
  function onPlus() {
    var h = global.SuperAriQuickHandler;
    if (typeof h === 'function') { try { if (h() !== false) return; } catch (err) { /* varsayılana düş */ } }
    var list = pageActions();
    if (list.length) { openActions(list); return; }
    openQuick();
  }
  function init() {
    if (!document.getElementById('saNavCss')) {
      var st = document.createElement('style'); st.id = 'saNavCss'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var p = page();
    var active = activeTab(p);
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
        if (e.target.closest && e.target.closest('[data-quick-record]')) { e.preventDefault(); onPlus(); }
      });
    });
    if (global.SuperAriDemo) updateBadge();
    else loadScript('demo-data.js?v=koloni-94').then(updateBadge, updateBadge);
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
  global.SuperAriNav = { openQuick: openQuick, navHtml: navHtml, activeTab: activeTab, openActions: openActions, pickHive: pickHive, rec: rec, hiveEditor: hiveEditor, quickType: quickType, focusEl: focusEl, go: go, info: info, scopeApiary: scopeApiary, ensureKoloni: ensureKoloni, closeSheet: closeSheet, emitSaved: emitSaved, V: V, setQuickHandler: function (fn) { global.SuperAriQuickHandler = typeof fn === 'function' ? fn : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
