/* SüperArı alt menü: Ana · Bakım · ＋ · Bugün · Ayarlar
 * ＋ Hızlı kayıt sayfasını açar (koloni.js gerekirse yüklenir). */
(function (global) {
  'use strict';
  var V = 'qk-2';
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
    'nav.tabbar.sa-fixed{position:fixed;left:0;right:0;bottom:0;z-index:900;height:72px;background:#fffdf8;border-top:1px solid #e4d6c2;display:grid;' +
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
    '@media print{nav.tabbar.sa-fixed{display:none!important;}body.sa-has-fixed-tabbar{padding-bottom:0!important;}}/* k104/k105: masaustu — 390x844 cerceve; k108: gercek telefon tam ekran */html.sa-shell-desktop,body.sa-shell-desktop,html.sa-shell-framed,body.sa-shell-framed{padding:0!important;margin:0!important;background:#1a1a1a!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;min-height:100%!important;min-height:100dvh!important;width:100%!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;}#saPhoneStage{position:relative;flex:0 0 auto;margin:0 auto;overflow:visible;min-height:1px;}#saPhoneStage>.phone{transform-origin:top left!important;margin:0!important;opacity:1!important;visibility:visible!important;}#saShellPan{position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));z-index:10050;display:grid;grid-template-columns:36px 36px 36px;grid-template-rows:36px 36px 36px;gap:4px;pointer-events:none;}#saShellPan[hidden]{display:none!important;}#saShellPan button{pointer-events:auto;width:36px;height:36px;border:0;border-radius:10px;background:rgba(28,28,28,.82);color:#fff;font-size:17px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.35);}#saShellPan button:active{transform:scale(.96);}#saShellPan [data-pan=up]{grid-column:2;grid-row:1;}#saShellPan [data-pan=left]{grid-column:1;grid-row:2;}#saShellPan [data-pan=right]{grid-column:3;grid-row:2;}#saShellPan [data-pan=down]{grid-column:2;grid-row:3;}html.sa-shell-desktop .phone,body.sa-shell-desktop .phone,html.sa-shell-framed .phone,body.sa-shell-framed .phone{width:390px!important;height:844px!important;max-width:390px!important;min-width:390px!important;min-height:844px!important;border-radius:44px!important;box-shadow:0 0 0 10px #111,0 0 0 12px #333,0 30px 80px rgba(0,0,0,.55)!important;display:flex!important;flex-direction:column!important;flex:0 0 auto!important;position:relative!important;overflow:hidden!important;transform-origin:top left!important;background:#f7f8fa!important;}.phone>.phone-notch{display:block!important;}.phone>.home-indicator{display:block!important;position:relative!important;bottom:auto!important;left:auto!important;transform:none!important;margin:4px auto 8px!important;flex:0 0 auto!important;z-index:60!important;}.phone>.status-bar{display:flex!important;flex:0 0 auto!important;height:auto!important;min-height:36px!important;padding:10px 16px 4px!important;font-size:13px!important;font-weight:600!important;color:#111!important;background:#f7f8fa!important;align-items:center!important;justify-content:space-between!important;box-sizing:border-box!important;gap:8px!important;position:relative!important;z-index:40!important;margin:0!important;overflow:visible!important;opacity:1!important;cursor:grab;touch-action:pan-y;}.phone>nav.tabbar:not(.sa-fixed),.phone>nav.tabbar{cursor:grab;touch-action:pan-y;}.phone>.phone-notch,.phone>.home-indicator{cursor:grab;touch-action:pan-y;}body.sa-shell-dragging,body.sa-shell-dragging .phone>.status-bar,body.sa-shell-dragging .phone>nav.tabbar{cursor:grabbing!important;}.phone>.status-bar .status-icons{display:flex!important;gap:7px!important;align-items:center!important;font-size:11px!important;color:#111!important;}.phone>.status-bar .status-icons svg{display:block;}.phone>.status-bar .sa-sb-batt{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:700;letter-spacing:-.02em;}.phone>.status-bar .sa-sb-batt-pct{font-variant-numeric:tabular-nums;}.phone>.screen>*{flex-shrink:0!important;}html.sa-iphone12 body .phone>.screen>#weatherStrip,html.sa-iphone12 body .phone>.screen>section.weather{flex:1 0 auto!important;flex-shrink:0!important;min-height:min-content!important;}html.sa-iphone12 body .phone>.screen>#grid{flex:0 0 auto!important;flex-shrink:0!important;}.phone>.screen>.grid{min-height:min-content!important;}html.sa-iphone12 .phone,body.sa-iphone12 .phone{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}.phone>.screen{flex:0 0 auto!important;height:auto!important;min-height:min-content!important;max-height:none!important;padding-top:2px!important;padding-bottom:8px!important;overflow:visible!important;}.phone>.status-bar,.phone>nav.tabbar{flex-shrink:0!important;position:relative!important;top:auto!important;bottom:auto!important;}.phone>nav.tabbar:not(.sa-fixed),.phone>nav.tabbar{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;flex:0 0 auto!important;height:72px!important;min-height:72px!important;padding:0 2px 10px!important;max-width:none!important;margin:0!important;z-index:5!important;background:#fffdf8!important;border-top:1px solid #e4d6c2!important;transform:none!important;}.sa-back{display:inline-flex;align-items:center;justify-content:center;gap:2px;min-height:32px;min-width:44px;padding:0 10px;border-radius:999px;border:1px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#f4e3b0);color:#4a2f1a;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;line-height:1;flex:0 0 auto;}.sa-back:active{transform:scale(.97);}.status-bar .sa-back{margin-right:8px;}.status-bar{gap:6px;}.sa-back-row{display:flex;align-items:center;gap:8px;margin:0 0 6px;min-height:32px;padding-top:2px;}.bk-top .weather-temp,.ks-end.weather-temp{margin-left:4px;flex:0 0 auto;font-size:22px;font-weight:700;color:#2c241c;line-height:1;text-decoration:none;cursor:pointer;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;}.bk-sel{max-width:42%!important;}.bk-sel .weather-loc-label{max-width:7em!important;}/* k108/k109: gercek telefon — cerceve/scale yok, tek sayfa kaydirma; UA + touch */html.sa-phone-mobile,body.sa-phone-mobile{padding:0!important;margin:0!important;background:#f7f8fa!important;display:block!important;min-height:100%!important;min-height:100dvh!important;width:100%!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;padding-top:env(safe-area-inset-top,0px)!important;padding-left:env(safe-area-inset-left,0px)!important;padding-right:env(safe-area-inset-right,0px)!important;}html.sa-phone-mobile #saPhoneStage,body.sa-phone-mobile #saPhoneStage{width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;}html.sa-phone-mobile .phone,body.sa-phone-mobile .phone{width:100%!important;max-width:none!important;min-width:0!important;height:auto!important;min-height:100dvh!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;transform:none!important;margin:0!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}html.sa-phone-mobile .phone>.phone-notch,html.sa-phone-mobile .phone>.home-indicator,html.sa-phone-mobile .phone>.status-bar,body.sa-phone-mobile .phone>.phone-notch,body.sa-phone-mobile .phone>.home-indicator,body.sa-phone-mobile .phone>.status-bar{display:none!important;}html.sa-phone-mobile .phone>.screen,body.sa-phone-mobile .phone>.screen{flex:0 0 auto!important;min-height:min-content!important;overflow:visible!important;}html.sa-phone-mobile .phone>nav.tabbar,body.sa-phone-mobile .phone>nav.tabbar{padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))!important;}@media print{.sa-back,.sa-back-row{display:none!important;}}body.shot,html.sa-shot{background:#f7f8fa!important;width:390px!important;height:844px!important;overflow:hidden!important;margin:0!important;padding:0!important;display:block!important;}body.shot .phone,html.sa-shot .phone{transform:none!important;border-radius:0!important;box-shadow:none!important;}nav.tabbar.sa-fixed{display:none!important;}';

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
    if (!global.SuperAriDemo) chain = chain.then(function () { return loadScript('demo-data.js?v=koloni-105'); });
    if (!global.SuperAriKoloni || !global.SuperAriKoloni.openQuickRecord) chain = chain.then(function () { return loadScript('koloni.js?v=koloni-105'); });
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
  function ensureData() { return global.SuperAriDemo ? Promise.resolve() : loadScript('demo-data.js?v=koloni-105').catch(function () {}); }
  function ensureKoloni() {
    return ensureData().then(function () {
      if (global.SuperAriKoloni && global.SuperAriKoloni.openRecordSheet) return null;
      return loadScript('koloni.js?v=koloni-105').catch(function () {});
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

  /* k95 · Geri — ana.html haric; bakim.html kilitli. history.back, yoksa mantiksal ust sayfa. */
  var BACK_SKIP = { 'ana.html': 1, 'bakim.html': 1, 'giris.html': 1, 'kayit.html': 1, 'onay.html': 1, 'sartlar.html': 1, 'index.html': 1, 'kurulum.html': 1 };
  var BACK_PARENT = {
    'bakim-akis.html': 'bakim.html', 'stok.html': 'bakim.html', 'gorevler.html': 'bakim.html', 'bakim-plan.html': 'bakim.html',
    'goc.html': 'bakim.html', 'ekipman.html': 'bakim.html', 'bugun.html': 'ana.html', 'ayarlar.html': 'ana.html',
    'kovan.html': 'kovanlar.html', 'kovanlar.html': 'bakim.html', 'koloni-ek.html': 'kovanlar.html?view=koloni',
    'koloni-islem.html': 'kovanlar.html?view=koloni', 'arilik.html': 'ariliklar.html', 'ariliklar.html': 'ana.html',
    'saglik.html': 'bakim.html', 'saglik-detay.html': 'saglik.html', 'uyarilar.html': 'bakim.html',
    'cihazlar.html': 'ayarlar.html', 'kamera.html': 'cihazlar.html', 'giderler.html': 'ana.html', 'satis.html': 'ana.html',
    'raporlar.html': 'ana.html', 'arici.html': 'ana.html', 'bakici.html': 'ana.html', 'hesap.html': 'ayarlar.html',
    'hava-raporu.html': 'bugun.html', 'hava-gecmis.html': 'hava-raporu.html', 'petek-tarama.html': 'ayarlar.html',
    'qr-etiket.html': 'ayarlar.html', 'logo-sec.html': 'ayarlar.html'
  };
  function backParent() {
    var p = page(), base = BACK_PARENT[p] || 'ana.html';
    if (p === 'kovanlar.html') {
      try {
        var q = new URLSearchParams(location.search), v = q.get('view');
        if (v === 'koloni' || v === 'tarti') return 'bakim.html';
      } catch (e) {}
    }
    if (p === 'koloni-ek.html' || p === 'koloni-islem.html') {
      try {
        var q2 = new URLSearchParams(location.search);
        var u = 'kovanlar.html?view=koloni';
        if (q2.get('apiary')) u += '&mode=apiary&apiary=' + encodeURIComponent(q2.get('apiary'));
        else if (q2.get('mode') === 'all') u += '&mode=all';
        return u;
      } catch (e2) {}
    }
    if (p === 'kovan.html') {
      try {
        var q3 = new URLSearchParams(location.search), a = q3.get('apiary');
        return a ? 'kovanlar.html?mode=apiary&apiary=' + encodeURIComponent(a) : 'kovanlar.html';
      } catch (e3) {}
    }
    return base;
  }
  function goBack(e) {
    if (e) e.preventDefault();
    var fallback = backParent();
    try {
      if (history.length > 1 && document.referrer) {
        var ref = document.referrer, here = location.href.split('#')[0];
        if (ref && ref !== here && ref.indexOf(location.origin) === 0) { history.back(); return; }
      }
    } catch (err) {}
    location.href = fallback;
  }
  function isShotMode() {
    try {
      if (document.body && document.body.classList.contains('shot')) return true;
      if (document.documentElement && document.documentElement.classList.contains('sa-shot')) return true;
      if (/(?:^|[?&])shot=1(?:&|$)/.test(String(location.search || ''))) return true;
    } catch (e) {}
    return false;
  }
  /** Ana sayfa — HTML duzeni kilitli; k99 iPhone12 kabugu Ana icerigini cerceve icine alir. */
  function isAnaPage() {
    try { return page() === 'ana.html'; } catch (e) { return false; }
  }
  /** k109: iPhone/iPad/Android — masaüstü önizleme çerçevesi asla (iPad “Masaüstü sitesi” dahil). */
  function isTouchMobileDevice() {
    try {
      var nav = global.navigator || {};
      var ua = String(nav.userAgent || '');
      if (nav.userAgentData && nav.userAgentData.mobile) return true;
      if (/iPhone|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
      if (/Macintosh/.test(ua) && nav.maxTouchPoints > 1) return true;
    } catch (e) {}
    return false;
  }
  function isPhoneMobile() {
    try {
      if (isShotMode()) return false; /* k97: iPhone12 kabuğu / ekran görüntüsü — çerçeve düzeni */
      if (document.body && document.body.classList.contains('sa-phone-mobile')) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (global.navigator && global.navigator.standalone) return true;
      if (isTouchMobileDevice()) return true;
      var narrow = window.matchMedia && window.matchMedia('(max-width:520px)').matches;
      var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      var touch = (global.navigator && global.navigator.maxTouchPoints > 0);
      if (narrow && (coarse || touch)) return true;
      if (touch && window.matchMedia && window.matchMedia('(hover: none)').matches
        && window.matchMedia('(max-width:932px)').matches) return true;
    } catch (e) {}
    return false;
  }
  function isDesktopShell() {
    if (isPhoneMobile() || isShotMode()) return false;
    try {
      var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
      var hover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
      var wide = window.matchMedia && window.matchMedia('(min-width:521px)').matches;
      if (wide && (fine || hover)) return true;
    } catch (e) {}
    return false;
  }
  function unwrapPhoneStage(phone) {
    var stage = document.getElementById('saPhoneStage');
    if (!stage || !phone) return;
    if (phone.parentNode === stage && stage.parentNode) stage.parentNode.insertBefore(phone, stage);
    try { stage.remove(); } catch (eR) { if (stage.parentNode) stage.parentNode.removeChild(stage); }
  }
  function layoutPhoneStage(phone, scale) {
    var stage = document.getElementById('saPhoneStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'saPhoneStage';
      stage.className = 'sa-phone-stage';
      if (phone.parentNode) phone.parentNode.insertBefore(stage, phone);
      stage.appendChild(phone);
    }
    var w = Math.round(390 * scale);
    var h = Math.round(844 * scale);
    if (w < 1) w = 390;
    if (h < 1) h = 844;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    phone.style.setProperty('width', '390px', 'important');
    phone.style.setProperty('height', '844px', 'important');
    phone.style.setProperty('transform-origin', 'top left', 'important');
    if (!isFinite(scale) || scale <= 0 || Math.abs(scale - 1) < 0.01) {
      phone.style.setProperty('transform', 'none', 'important');
      stage.style.width = '390px';
      stage.style.height = '844px';
    } else {
      phone.style.setProperty('transform', 'scale(' + scale + ')', 'important');
    }
  }
  function shellPanStep(dx, dy) {
    var el = document.scrollingElement || document.documentElement;
    if (!el) return;
    var smooth = Math.abs(dx) < 48 && Math.abs(dy) < 48;
    try {
      el.scrollBy({ left: dx, top: dy, behavior: smooth ? 'smooth' : 'auto' });
    } catch (e) {
      el.scrollLeft += dx;
      el.scrollTop += dy;
    }
  }
  function screenCanScroll(screen, dy) {
    if (!screen || screen.scrollHeight <= screen.clientHeight + 1) return false;
    if (dy < 0) return screen.scrollTop > 0;
    if (dy > 0) return screen.scrollTop + screen.clientHeight < screen.scrollHeight - 1;
    return false;
  }
  function isShellChromeTarget(t) {
    if (!t || !t.closest) return false;
    return !!t.closest('.phone > .status-bar, .phone > nav.tabbar, .phone > .phone-notch, .phone > .home-indicator, #saPhoneStage');
  }
  /** k106: tekerlek / sürükle — saat, alt menü, kenar; içerik bitince sayfa kayar */
  function ensureShellWheel() {
    if (global.__saShellWheel) return;
    global.__saShellWheel = 1;
    document.addEventListener('wheel', function (e) {
      if (isPhoneMobile() || isShotMode()) return;
      if (!document.querySelector('.phone')) return;
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      var dy = e.deltaY;
      var dx = e.deltaX;
      if (!dy && !dx) return;
      var screen = t && t.closest ? t.closest('.phone > .screen') : null;
      if (screen && screenCanScroll(screen, dy)) return;
      if (!screen && !isShellChromeTarget(t) && !(t && t.closest && t.closest('.phone'))) return;
      e.preventDefault();
      shellPanStep(dx, dy);
    }, { passive: false, capture: true });
    var drag = { on: 0, x: 0, y: 0, id: null };
    function endDrag() {
      drag.on = 0;
      drag.id = null;
      try { document.body.classList.remove('sa-shell-dragging'); } catch (eD) {}
    }
    document.addEventListener('pointerdown', function (e) {
      if (isPhoneMobile() || isShotMode() || e.button !== 0) return;
      if (!isShellChromeTarget(e.target)) return;
      if (e.target && e.target.closest && e.target.closest('a, button, [data-pan], .tab, .sa-back')) return;
      drag.on = 1;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.id = e.pointerId;
      try { document.body.classList.add('sa-shell-dragging'); } catch (eD2) {}
      try { e.target.setPointerCapture(e.pointerId); } catch (eCap) {}
    });
    document.addEventListener('pointermove', function (e) {
      if (!drag.on || e.pointerId !== drag.id) return;
      var dx = drag.x - e.clientX;
      var dy = drag.y - e.clientY;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      drag.x = e.clientX;
      drag.y = e.clientY;
      shellPanStep(dx, dy);
    });
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
  }
  function ensureShellPan() {
    var hide = isPhoneMobile() || isShotMode() || !document.querySelector('.phone');
    var pan = document.getElementById('saShellPan');
    if (hide) {
      if (pan) pan.hidden = true;
      return;
    }
    if (!pan) {
      pan = document.createElement('div');
      pan.id = 'saShellPan';
      pan.setAttribute('role', 'group');
      pan.setAttribute('aria-label', 'iPhone önizleme kaydırma');
      pan.innerHTML = '<button type="button" data-pan="up" aria-label="Yukarı">↑</button>' +
        '<button type="button" data-pan="left" aria-label="Sola">←</button>' +
        '<button type="button" data-pan="right" aria-label="Sağa">→</button>' +
        '<button type="button" data-pan="down" aria-label="Aşağı">↓</button>';
      pan.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-pan]') : null;
        if (!b) return;
        var map = { up: [0, -96], down: [0, 96], left: [-96, 0], right: [96, 0] };
        var d = map[b.getAttribute('data-pan')];
        if (d) shellPanStep(d[0], d[1]);
      });
      document.body.appendChild(pan);
    }
    pan.hidden = false;
    ensureShellWheel();
  }
  if (!global.__saShellPanKeys) {
    global.__saShellPanKeys = 1;
    global.addEventListener('keydown', function (e) {
      if (isPhoneMobile() || isShotMode()) return;
      if (!document.querySelector('.phone')) return;
      var map = { ArrowUp: [0, -80], ArrowDown: [0, 80], ArrowLeft: [-80, 0], ArrowRight: [80, 0] };
      var d = map[e.key];
      if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      shellPanStep(d[0], d[1]);
    });
  }
  var STATUS_ICONS = '<span class="sa-sb-sig" title="Sinyal"><svg viewBox="0 0 18 12" width="16" height="11"><rect x="1" y="8" width="2.2" height="3.5" rx=".4" fill="currentColor"/><rect x="5" y="5.5" width="2.2" height="6" rx=".4" fill="currentColor"/><rect x="9" y="3" width="2.2" height="8.5" rx=".4" fill="currentColor"/><rect x="13" y="0.5" width="2.2" height="11" rx=".4" fill="currentColor"/></svg></span>'
    + '<span class="sa-sb-wifi" title="Wi\u2011Fi"><svg viewBox="0 0 16 12" width="15" height="11"><path d="M8 10.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" fill="currentColor"/><path d="M3.2 7.2a6.8 6.8 0 0 1 9.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.4 9a3.7 3.7 0 0 1 5.2 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>'
    + '<span class="sa-sb-batt" title="Pil"><span class="sa-sb-batt-pct">87%</span><svg viewBox="0 0 28 13" width="26" height="12"><rect x="0.7" y="1.2" width="23" height="10.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="24.2" y="4" width="2.4" height="5" rx=".7" fill="currentColor"/><rect class="sa-sb-batt-fill" x="2.4" y="3" width="18.2" height="7" rx="1.2" fill="currentColor"/></svg></span>';
  function fmtClock() {
    var n = new Date();
    return n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
  }
  function applyBattPct(root, pct) {
    var el = root.querySelector('.sa-sb-batt-pct');
    if (el) el.textContent = Math.round(pct) + '%';
    var fill = root.querySelector('.sa-sb-batt-fill');
    if (fill) {
      var w = Math.max(1.5, Math.min(18.2, 18.2 * (pct / 100)));
      fill.setAttribute('width', String(w.toFixed(1)));
    }
  }
  function clearPhoneInlineSize(phone) {
    try {
      phone.style.removeProperty('width');
      phone.style.removeProperty('height');
      phone.style.removeProperty('max-width');
      phone.style.removeProperty('min-width');
      phone.style.removeProperty('min-height');
      phone.style.removeProperty('transform');
    } catch (eC) {
      phone.style.width = '';
      phone.style.height = '';
      phone.style.maxWidth = '';
      phone.style.minWidth = '';
      phone.style.minHeight = '';
      phone.style.transform = '';
    }
  }
  function setShellFramed(on) {
    var root = document.documentElement, b = document.body;
    if (!root || !b) return;
    if (on) {
      root.classList.add('sa-shell-framed');
      b.classList.add('sa-shell-framed');
    } else {
      root.classList.remove('sa-shell-framed');
      b.classList.remove('sa-shell-framed');
    }
  }
  function fitIphone12Shell() {
    var phone = document.querySelector('.phone');
    if (!phone || !document.body) return;
    try {
      setShellFramed(isDesktopShell());
      document.documentElement.classList.add('sa-iphone12');
      document.body.classList.add('sa-iphone12');
      if (isAnaPage()) {
        document.documentElement.classList.add('sa-page-ana');
        document.body.classList.add('sa-page-ana');
      }
    } catch (e0) {}
    if (isShotMode()) {
      unwrapPhoneStage(phone);
      clearPhoneInlineSize(phone);
      phone.style.setProperty('transform', 'none');
      ensureShellPan();
      return;
    }
    if (isPhoneMobile()) {
      try {
        document.documentElement.classList.add('sa-phone-mobile');
        document.body.classList.add('sa-phone-mobile');
        document.documentElement.classList.remove('sa-shell-desktop');
        document.documentElement.classList.remove('sa-shell-1to1');
        document.documentElement.classList.remove('sa-shell-framed');
        document.body.classList.remove('sa-shell-desktop');
        document.body.classList.remove('sa-shell-1to1');
        document.body.classList.remove('sa-shell-framed');
        setShellFramed(false);
      } catch (eMob) {}
      unwrapPhoneStage(phone);
      clearPhoneInlineSize(phone);
      ensureShellPan();
      return;
    }
    if (!isDesktopShell()) {
      try {
        document.documentElement.classList.add('sa-phone-mobile');
        document.body.classList.add('sa-phone-mobile');
        setShellFramed(false);
        document.documentElement.classList.remove('sa-shell-desktop');
        document.body.classList.remove('sa-shell-desktop');
      } catch (eAmb) {}
      unwrapPhoneStage(phone);
      clearPhoneInlineSize(phone);
      ensureShellPan();
      return;
    }
    try {
      document.documentElement.classList.add('sa-shell-desktop');
      document.documentElement.classList.remove('sa-phone-mobile');
      document.body.classList.remove('sa-phone-mobile');
      document.documentElement.classList.add('sa-shell-1to1');
      document.body.classList.add('sa-shell-1to1');
    } catch (eR) {}
    clearPhoneInlineSize(phone);
    /* k105: birebir 390×844 — viewport’a sığdırmak için küçültme yok; taşarsa sayfa kaydırılır */
    layoutPhoneStage(phone, 1);
    ensureShellPan();
  }
  /** k100: durum seridi kabukta (Ana dahil); telefonda tam ekran kabuk. */
  function ensureStatusStrip() {
    var bars = document.querySelectorAll('.phone > .status-bar, body.bk-kabuk .status-bar');
    if (!bars.length) bars = document.querySelectorAll('.status-bar');
    Array.prototype.forEach.call(bars, function (sb) {
      if (!sb) return;
      if (sb.getAttribute('data-sa-sb') === '1' && sb.querySelector('.sa-sb-batt-pct')) return;
      sb.setAttribute('data-sa-sb', '1');
      var clock = sb.querySelector('[data-bk-clock], #statusClock, .sa-sb-clock');
      if (!clock) {
        clock = document.createElement('div');
        clock.setAttribute('data-bk-clock', '');
        clock.className = 'sa-sb-clock';
        clock.setAttribute('aria-live', 'polite');
        sb.insertBefore(clock, sb.firstChild);
      } else {
        clock.setAttribute('data-bk-clock', '');
        clock.classList.add('sa-sb-clock');
      }
      clock.textContent = fmtClock();
      var icons = sb.querySelector('.status-icons');
      if (!icons) {
        icons = document.createElement('div');
        icons.className = 'status-icons';
        sb.appendChild(icons);
      }
      icons.setAttribute('aria-hidden', 'true');
      icons.innerHTML = STATUS_ICONS;
      applyBattPct(icons, 87);
    });
    if (!global.__saSbClock) {
      global.__saSbClock = setInterval(function () {
        var t = fmtClock();
        Array.prototype.forEach.call(document.querySelectorAll('[data-bk-clock], #statusClock, .sa-sb-clock'), function (e) {
          e.textContent = t;
        });
      }, 1000);
    }
  }
  function ensureBack() {
    var p = page();
    if (BACK_SKIP[p] || document.getElementById('saBack')) return;
    var btn = document.createElement('a');
    btn.id = 'saBack'; btn.className = 'sa-back'; btn.href = backParent();
    btn.setAttribute('aria-label', 'Geri'); btn.textContent = '\u2039 Geri';
    btn.addEventListener('click', goBack);
    if (isPhoneMobile() || isShotMode()) {
      var hostM = document.querySelector('.phone > .screen') || document.querySelector('main.wrap') || document.querySelector('main');
      if (hostM) {
        var rowM = document.createElement('div');
        rowM.className = 'sa-back-row'; rowM.appendChild(btn);
        hostM.insertBefore(rowM, hostM.firstChild);
        return;
      }
    }
    var sb = document.querySelector('.phone > .status-bar') || document.querySelector('body.bk-kabuk .status-bar') || document.querySelector('.status-bar');
    if (sb) { sb.insertBefore(btn, sb.firstChild); return; }
    var navTop = document.querySelector('.auth-phone > .nav') || document.querySelector('.brand-strip') || document.querySelector('.page-head');
    if (navTop) { navTop.insertBefore(btn, navTop.firstChild); return; }
    var host = document.querySelector('.phone > .screen') || document.querySelector('main.wrap') || document.querySelector('main') || document.querySelector('.auth-phone');
    if (!host) return;
    var row = document.createElement('div');
    row.className = 'sa-back-row'; row.appendChild(btn);
    host.insertBefore(row, host.firstChild);
  }
  function ensureBakimEnd() {
    if (page() !== 'bakim.html') return;
    var top = document.querySelector('#bkScope .bk-top');
    if (!top || top.querySelector('[data-ks-end], .weather-temp')) return;
    var a = document.createElement('a');
    a.className = 'ks-end weather-temp'; a.setAttribute('data-ks-end', '');
    a.href = 'hava-raporu.html'; a.title = 'Arılık hava raporu'; a.setAttribute('aria-label', 'Arılık hava raporunu aç');
    a.textContent = '—°';
    top.appendChild(a);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var ap = null; try { ap = localStorage.getItem('superari.bakim.scope'); } catch (err) {}
      location.href = 'hava-raporu.html' + (ap && ap !== 'all' ? ('?apiary=' + encodeURIComponent(ap)) : '');
    });
    try {
      var aps = (global.SuperAriDemo && SuperAriDemo.loadApiaries && SuperAriDemo.loadApiaries()) || [];
      var id = null; try { id = localStorage.getItem('superari.bakim.scope'); } catch (e2) {}
      var ap = (id && id !== 'all') ? aps.filter(function (x) { return String(x.id) === String(id); })[0] : aps[0];
      var lat = ap && ap.lat != null ? ap.lat : 36.58, lon = ap && ap.lon != null ? ap.lon : 29.09;
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m&timezone=auto')
        .then(function (r) { return r.json(); })
        .then(function (j) { var t = j && j.current && j.current.temperature_2m; var n = Math.round(Number(t)); if (isFinite(n)) a.textContent = n + '°'; })
        .catch(function () {});
    } catch (e3) {}
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
    try {
      if (isAnaPage()) {
        document.documentElement.classList.add('sa-page-ana');
        document.body.classList.add('sa-page-ana');
      }
      if (isShotMode()) {
        document.documentElement.classList.add('sa-shot');
        document.body.classList.add('shot');
        document.documentElement.classList.remove('sa-phone-mobile');
        document.body.classList.remove('sa-phone-mobile');
      }
      fitIphone12Shell();
      ensureShellPan();
    } catch (eM) {}
    try { ensureStatusStrip(); } catch (eSb) { /* ignore */ }
    try { ensureBack(); } catch (eBack) { /* ignore */ }
    try { ensureBakimEnd(); } catch (eEnd) { /* ignore */ }
    try {
      if (global.SuperAriDemo) updateBadge();
      else loadScript('demo-data.js?v=koloni-105').then(updateBadge, updateBadge);
    } catch (eB) { /* rozet sonra */ }
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
  global.SuperAriNav = { openQuick: openQuick, navHtml: navHtml, activeTab: activeTab, openActions: openActions, pickHive: pickHive, rec: rec, hiveEditor: hiveEditor, quickType: quickType, focusEl: focusEl, go: go, info: info, scopeApiary: scopeApiary, ensureKoloni: ensureKoloni, closeSheet: closeSheet, emitSaved: emitSaved, goBack: goBack, backParent: backParent, V: V, setQuickHandler: function (fn) { global.SuperAriQuickHandler = typeof fn === 'function' ? fn : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  /* Geç gelen DOM (kapsam / kabuk) için bir kez daha */
  if (!global.__saIphone12Resize) {
    global.__saIphone12Resize = 1;
    var fitRaf = 0;
    var onFit = function () {
      if (fitRaf) return;
      fitRaf = global.requestAnimationFrame ? global.requestAnimationFrame(function () {
        fitRaf = 0;
        try { fitIphone12Shell(); } catch (eR) {}
      }) : (setTimeout(function () { fitRaf = 0; try { fitIphone12Shell(); } catch (eR2) {} }, 16), 1);
    };
    global.addEventListener('resize', onFit);
    global.addEventListener('orientationchange', onFit);
    global.addEventListener('pageshow', onFit);
    if (global.visualViewport) global.visualViewport.addEventListener('resize', onFit);
  }
  function refitShell() {
    try { fitIphone12Shell(); ensureShellPan(); ensureStatusStrip(); ensureBack(); ensureBakimEnd(); } catch (eRf) { /* ignore */ }
  }
  global.addEventListener('superari-shell-ready', function () { setTimeout(refitShell, 0); });
  setTimeout(refitShell, 0);
  setTimeout(refitShell, 400);
  setTimeout(refitShell, 1200);
})(window);
