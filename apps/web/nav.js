/* SüperArı alt menü: Ana · Bakım · ＋ · Bugün · Ayarlar
 * ＋ Hızlı kayıt sayfasını açar (koloni.js gerekirse yüklenir). */
(function (global) {

  /* k157: Sabit ekran — tıklama/yeniden çizim/yeniden yüklemede kaydırma konumu korunur (iPhone Safari'de scroll anchoring yok) */
  (function () {
    if (global.SuperAriScroll) return;
    var KEY = 'superari.scroll.keep.v1', touched = false, pad = null;
    function sc() {
      var s = document.querySelector('.phone > .screen');
      if (s && s.scrollHeight > s.clientHeight + 2) { var o = getComputedStyle(s).overflowY; if (o === 'auto' || o === 'scroll') return s; }
      return document.scrollingElement || document.documentElement;
    }
    function isDoc(s) { return s === document.scrollingElement || s === document.documentElement; }
    function getY() { var s = sc(); return isDoc(s) ? (global.scrollY || s.scrollTop || 0) : s.scrollTop; }
    function setY(y) { var s = sc(); if (isDoc(s)) global.scrollTo(0, y); else s.scrollTop = y; }
    function height() { var s = sc(); return s.scrollHeight - (pad ? pad.offsetHeight : 0); }
    /* İçerik kısalınca sayfa yukarı «zıplamasın»: eksik yükseklik kadar alt boşluk (kullanıcı yukarı çıkınca kalkar) */
    function holdHeight(h) {
      var s = sc(), host = isDoc(s) ? document.body : s;
      if (!host) return;
      if (!pad) { pad = document.createElement('div'); pad.id = 'saScrollPad'; pad.setAttribute('aria-hidden', 'true'); pad.style.cssText = 'height:0;pointer-events:none;'; }
      if (pad.parentNode !== host) host.appendChild(pad);
      pad.style.height = '0px';
      var need = Math.max(0, Math.round(h - s.scrollHeight));
      pad.style.height = need + 'px';
    }
    function settle(y, h, ms) {
      touched = false; var t0 = Date.now();
      (function tick() {
        if (touched) return;
        if (h) holdHeight(h);
        if (Math.abs(getY() - y) > 1) setY(y);
        if (Date.now() - t0 < (ms || 400)) (global.requestAnimationFrame || setTimeout)(tick, 16);
      })();
    }
    /** Yerinde yeniden çizim: fn() öncesi konum/yükseklik saklanır, sonra geri yüklenir. */
    var kept = null;
    /* k167: tutulacak yükseklik en az (konum + ekran) — yeni içerik kısa olsa da iOS kaydırmayı sıkıştırmaz */
    function keep(fn) { var y = getY(), h = Math.max(height(), y + (global.innerHeight || 0)), prev = kept; kept = { y: y, h: h }; try { return fn(); } finally { kept = prev; settle(y, h, 400); izle(y, h); } }
    /* k167: geç gelen (async) çizimler içeriği sonradan kısaltsa da kullanıcı dokunana kadar yükseklik + konum korunur */
    var ro = null;
    function izle(y, h) {
      if (!global.ResizeObserver) return; if (ro) ro.disconnect();
      var host = document.querySelector('.phone') || document.body; if (!host) return;
      var bitti = Date.now() + 8000;
      ro = new global.ResizeObserver(function () { if (touched || Date.now() > bitti) { ro.disconnect(); return; } holdHeight(h); if (Math.abs(getY() - y) > 1) setY(y); });
      ro.observe(host);
    }
    /** Yeniden yükleme: konum saklanır, yeni sayfa açılınca geri yüklenir. */
    function reload() {
      try { /* k160: yeniden çizim içerikten önce boşaltıp sayfayı kısalttıysa konum 0'a düşmüş olur — keep() öncesi değer esas */
      global.sessionStorage.setItem(KEY, JSON.stringify({ p: location.pathname, y: kept ? kept.y : getY(), h: kept ? kept.h : height(), at: Date.now() })); } catch (e) { /* ignore */ }
      global.location.reload();
    }
    function restore() {
      var r = null; try { r = JSON.parse(global.sessionStorage.getItem(KEY) || 'null'); global.sessionStorage.removeItem(KEY); } catch (e) { r = null; }
      if (!r || r.p !== location.pathname || Date.now() - r.at > 15000) return;
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
      /* k160: yeni sayfa içerik dolmadan kısa kalırsa kaydırma sıkışır — yükseklik önce sabitlenir, konum hemen verilir */
      try { document.documentElement.style.minHeight = (r.h || 0) + 'px'; } catch (e) { /* ignore */ }
      setY(r.y); settle(r.y, r.h, 1500);
      setTimeout(function () { document.documentElement.style.minHeight = ''; }, 1600);
    }
    ['touchstart', 'wheel', 'keydown'].forEach(function (ev) { global.addEventListener(ev, function () { touched = true; }, { passive: true, capture: true }); });
    global.addEventListener('scroll', function () { if (pad && touched && getY() < 40) pad.style.height = '0px'; }, { passive: true, capture: true });
    /* Arılık etiketleri sabit genişlik: ad uzayıp kısalınca ‹ › okları kaymaz */
    function fixLabels() {
      var l = document.querySelectorAll('.arilik-loc-controls .weather-loc-label, [data-ks-label]');
      for (var i = 0; i < l.length; i++) {
        var e = l[i]; if (e.getAttribute('data-w-fixed')) continue;
        var mw = parseFloat(getComputedStyle(e).maxWidth);
        if (mw > 0 && e.offsetParent) { e.style.display = 'inline-block'; e.style.width = mw + 'px'; e.style.textAlign = 'center'; e.setAttribute('data-w-fixed', '1'); }
      }
    }
    /* Arılık okları, sekme ve süzgeç düğmeleri: tıklamada sayfa konumu korunur (yeniden çizim / içerik kısalması zıplatmaz) */
    var GUARD = '.arilik-nav, [data-ks-prev], [data-ks-next], [data-ks-label], [role="tab"], [data-tab], [data-filter], .seg button, .ks-chip, [aria-pressed]';
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest(GUARD) : null;
      if (!t || t.hasAttribute('data-scroll-ok')) return;
      if (t.tagName === 'A' && /^#./.test(t.getAttribute('href') || '')) return;
      var y = getY(), h = Math.max(height(), y + (global.innerHeight || 0)); /* k167: içerik kısalsa da konum sıkışmaz */
      setTimeout(function () { settle(y, h, 500); izle(y, h); }, 0);
    }, true);
    function boot() { restore(); fixLabels(); setTimeout(fixLabels, 800); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    global.SuperAriScroll = { fixLabels: fixLabels, keep: keep, reload: reload, getY: getY, setY: setY };
  })();
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
    '@media print{nav.tabbar.sa-fixed{display:none!important;}body.sa-has-fixed-tabbar{padding-bottom:0!important;}}/* k104/k105: masaustu — 390x844 cerceve; k108: gercek telefon tam ekran */html.sa-shell-desktop,body.sa-shell-desktop,html.sa-shell-framed,body.sa-shell-framed{padding:0!important;margin:0!important;background:#1a1a1a!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;min-height:100%!important;min-height:100dvh!important;width:100%!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;}#saPhoneStage{position:relative;flex:0 0 auto;margin:0 auto;overflow:visible;min-height:1px;}#saPhoneStage>.phone{transform-origin:top left!important;margin:0!important;opacity:1!important;visibility:visible!important;}#saShellPan{position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));z-index:10050;display:grid;grid-template-columns:36px 36px 36px;grid-template-rows:36px 36px 36px;gap:4px;pointer-events:none;}#saShellPan[hidden]{display:none!important;}#saShellPan button{pointer-events:auto;width:36px;height:36px;border:0;border-radius:10px;background:rgba(28,28,28,.82);color:#fff;font-size:17px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.35);}#saShellPan button:active{transform:scale(.96);}#saShellPan [data-pan=up]{grid-column:2;grid-row:1;}#saShellPan [data-pan=left]{grid-column:1;grid-row:2;}#saShellPan [data-pan=right]{grid-column:3;grid-row:2;}#saShellPan [data-pan=down]{grid-column:2;grid-row:3;}html.sa-shell-desktop .phone,body.sa-shell-desktop .phone,html.sa-shell-framed .phone,body.sa-shell-framed .phone{width:390px!important;height:844px!important;max-width:390px!important;min-width:390px!important;min-height:844px!important;border-radius:44px!important;box-shadow:0 0 0 10px #111,0 0 0 12px #333,0 30px 80px rgba(0,0,0,.55)!important;display:flex!important;flex-direction:column!important;flex:0 0 auto!important;position:relative!important;overflow:hidden!important;transform-origin:top left!important;background:#f7f8fa!important;}.phone>.phone-notch{display:block!important;}.phone>.home-indicator{display:block!important;position:relative!important;bottom:auto!important;left:auto!important;transform:none!important;margin:4px auto 8px!important;flex:0 0 auto!important;z-index:60!important;}.phone>.status-bar{display:flex!important;flex:0 0 auto!important;height:auto!important;min-height:36px!important;padding:10px 16px 4px!important;font-size:13px!important;font-weight:600!important;color:#111!important;background:#f7f8fa!important;align-items:center!important;justify-content:space-between!important;box-sizing:border-box!important;gap:8px!important;position:relative!important;z-index:40!important;margin:0!important;overflow:visible!important;opacity:1!important;cursor:grab;touch-action:pan-y;}.phone>nav.tabbar:not(.sa-fixed),.phone>nav.tabbar{cursor:grab;touch-action:pan-y;}.phone>.phone-notch,.phone>.home-indicator{cursor:grab;touch-action:pan-y;}body.sa-shell-dragging,body.sa-shell-dragging .phone>.status-bar,body.sa-shell-dragging .phone>nav.tabbar{cursor:grabbing!important;}.phone>.status-bar .status-icons{display:flex!important;gap:7px!important;align-items:center!important;font-size:11px!important;color:#111!important;}.phone>.status-bar .status-icons svg{display:block;}.phone>.status-bar .sa-sb-batt{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:700;letter-spacing:-.02em;}.phone>.status-bar .sa-sb-batt-pct{font-variant-numeric:tabular-nums;}.phone>.screen>*{flex-shrink:0!important;}html.sa-iphone12 body .phone>.screen>#weatherStrip,html.sa-iphone12 body .phone>.screen>section.weather{flex:1 0 auto!important;flex-shrink:0!important;min-height:min-content!important;}html.sa-iphone12 body .phone>.screen>#grid{flex:0 0 auto!important;flex-shrink:0!important;}.phone>.screen>.grid{min-height:min-content!important;}html.sa-iphone12 .phone,body.sa-iphone12 .phone{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}.phone>.screen{flex:0 0 auto!important;height:auto!important;min-height:min-content!important;max-height:none!important;padding-top:2px!important;padding-bottom:8px!important;overflow:visible!important;}.phone>.status-bar,.phone>nav.tabbar{flex-shrink:0!important;position:relative!important;top:auto!important;bottom:auto!important;}.phone>nav.tabbar:not(.sa-fixed),.phone>nav.tabbar{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;flex:0 0 auto!important;height:72px!important;min-height:72px!important;padding:0 2px 10px!important;max-width:none!important;margin:0!important;z-index:5!important;background:#fffdf8!important;border-top:1px solid #e4d6c2!important;transform:none!important;}.sa-back{display:inline-flex;align-items:center;justify-content:center;gap:2px;min-height:32px;min-width:44px;padding:0 10px;border-radius:999px;border:1px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#f4e3b0);color:#4a2f1a;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;line-height:1;flex:0 0 auto;}.sa-back:active{transform:scale(.97);}.status-bar .sa-back{margin-right:8px;}.status-bar{gap:6px;}.sa-back-row{display:flex;align-items:center;gap:8px;margin:0 0 6px;min-height:32px;padding-top:2px;}.bk-top .weather-temp,.ks-end.weather-temp{margin-left:4px;flex:0 0 auto;font-size:22px;font-weight:700;color:#2c241c;line-height:1;text-decoration:none;cursor:pointer;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;}.bk-sel{max-width:42%!important;}.bk-sel .weather-loc-label{max-width:7em!important;}/* k108/k109: gercek telefon — cerceve/scale yok, tek sayfa kaydirma; UA + touch */html.sa-phone-mobile,body.sa-phone-mobile{padding:0!important;margin:0!important;background:#f7f8fa!important;display:block!important;min-height:100%!important;min-height:100dvh!important;width:100%!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;padding-top:env(safe-area-inset-top,0px)!important;padding-left:env(safe-area-inset-left,0px)!important;padding-right:env(safe-area-inset-right,0px)!important;}html.sa-phone-mobile #saPhoneStage,body.sa-phone-mobile #saPhoneStage{width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;}html.sa-phone-mobile .phone,body.sa-phone-mobile .phone{width:100%!important;max-width:none!important;min-width:0!important;height:auto!important;min-height:100dvh!important;max-height:none!important;border-radius:0!important;box-shadow:none!important;transform:none!important;margin:0!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}html.sa-phone-mobile .phone>.phone-notch,html.sa-phone-mobile .phone>.home-indicator,html.sa-phone-mobile .phone>.status-bar,body.sa-phone-mobile .phone>.phone-notch,body.sa-phone-mobile .phone>.home-indicator,body.sa-phone-mobile .phone>.status-bar{display:none!important;}html.sa-phone-mobile .phone>.screen,body.sa-phone-mobile .phone>.screen{flex:0 0 auto!important;min-height:min-content!important;overflow:visible!important;}html.sa-phone-mobile .phone>nav.tabbar,body.sa-phone-mobile .phone>nav.tabbar{padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))!important;}/* k110: Ana — üst (saat şeridi + Hardal + hava) kaydırırken sabit; alt menü altta */html.sa-page-ana .phone{display:flex!important;flex-direction:column!important;min-height:100dvh!important;}html.sa-page-ana .phone>.screen{flex:1 1 auto!important;min-height:min-content!important;}html.sa-page-ana .phone>nav.tabbar{flex:0 0 auto!important;margin-top:auto!important;}html.sa-page-ana .phone>.status-bar{position:-webkit-sticky;position:sticky;top:0;z-index:60;flex-shrink:0!important;background:#f7f8fa!important;}html.sa-page-ana .brand-strip{position:-webkit-sticky;position:sticky;top:var(--sa-ana-brand-top,0px);z-index:55;}html.sa-page-ana #weatherStrip{position:-webkit-sticky;position:sticky;top:var(--sa-ana-weather-top,44px);z-index:54;}html.sa-page-ana.sa-phone-mobile .phone>.status-bar,html.sa-phone-mobile.sa-page-ana .phone>.status-bar{display:flex!important;min-height:36px!important;padding-top:max(6px,env(safe-area-inset-top,0px))!important;padding-bottom:4px!important;}html.sa-page-ana.sa-phone-mobile .phone>.phone-notch,html.sa-phone-mobile.sa-page-ana .phone>.phone-notch{display:none!important;}@media print{.sa-back,.sa-back-row{display:none!important;}}/* k117: kart ici Geri yok - sol ust .sa-back gizlenmez */body.shot,html.sa-shot{background:#f7f8fa!important;width:390px!important;height:844px!important;overflow:hidden!important;margin:0!important;padding:0!important;display:block!important;}body.shot .phone,html.sa-shot .phone{transform:none!important;border-radius:0!important;box-shadow:none!important;}nav.tabbar.sa-fixed{display:none!important;}/* k113: alt menu her sayfada sabit dipte - cerceve sabit, yalniz .screen kayar; durum seridi her sayfada */html.sa-iphone12 body.sa-iphone12 .phone{display:flex!important;flex-direction:column!important;overflow:hidden!important;}html.sa-phone-mobile,html.sa-phone-mobile body{height:100%!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important;}html.sa-phone-mobile body.sa-phone-mobile .phone{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;}html.sa-iphone12 body.sa-iphone12 .phone>.screen{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-bottom:12px!important;}html.sa-iphone12 body.sa-iphone12 .phone>.screen>*{flex-shrink:0!important;}html.sa-iphone12 body.sa-iphone12 .phone>.screen>#weatherStrip{flex:1 0 auto!important;min-height:min-content!important;}html.sa-iphone12 body.sa-iphone12 .phone>.screen>#grid{flex:0 0 auto!important;}html.sa-iphone12 body.sa-iphone12 .phone>.status-bar{display:flex!important;position:relative!important;top:auto!important;flex:0 0 auto!important;min-height:36px!important;}html.sa-phone-mobile body.sa-phone-mobile .phone>.status-bar{padding-top:max(6px,env(safe-area-inset-top,0px))!important;padding-bottom:4px!important;}html.sa-iphone12 body.sa-iphone12 .phone>nav.tabbar{position:relative!important;top:auto!important;bottom:auto!important;flex:0 0 auto!important;margin-top:0!important;}html.sa-phone-mobile body.sa-phone-mobile .phone>.home-indicator,html.sa-phone-mobile body.sa-phone-mobile .phone>.phone-notch{display:none!important;}html.sa-iphone12.sa-page-ana body.sa-iphone12 .brand-strip{top:0!important;}html.sa-iphone12.sa-page-ana body.sa-iphone12 #weatherStrip{top:var(--sa-ana-weather-top,44px)!important;}.bk-scope-head{display:flex;flex-direction:column;gap:6px;min-width:0;}.bk-scope-title-row{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:8px;min-width:0;}.bk-scope-title-row>.bk-scope-title-main{flex:1 1 0!important;min-width:0!important;display:flex;flex-wrap:nowrap!important;align-items:baseline;gap:4px 8px;}.bk-scope-title-row>.bee-sound-toggle,.bk-scope-title-row>.bk-top-end,.bk-scope-title-row>.ks-end{flex:0 0 auto!important;margin-left:auto!important;}.bk-scope-geri-row--left{display:flex!important;justify-content:flex-start!important;gap:6px;}/* k114: Kapsam basligi tek satir (Muayene): simge + baslik + Demo + secici + tek sag cip */.bk-scope-title-row>.bk-scope-title-main{flex:0 1 auto!important;}.bk-scope-title-row .bk-scope-page-title{font-size:18px!important;}.bk-scope-title-row>.bk-scope-sel-inline{flex:1 1 auto!important;min-width:0!important;display:flex!important;justify-content:center!important;margin:0!important;}.bk-scope-sel-inline .bk-sel,.bk-scope-sel-inline .ks-sel{max-width:100%!important;margin:0!important;display:inline-flex!important;align-items:center!important;min-width:0!important;}.bk-scope-sel-inline .weather-loc-label,.bk-scope-sel-inline .ks-label{max-width:6.5em!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:13px!important;}.bk-scope-sel-inline .arilik-nav,.bk-scope-sel-inline .ks-nav{min-width:22px!important;padding:2px!important;}.bk-scope-title-row .bk-mode,.bk-scope-title-row .ks-mode{flex:0 0 auto;}.bk-scope-title-row .weather-temp,.bk-scope-title-row .ks-end-chip{white-space:nowrap;}.bk-scope-title-row>.bk-top-end,.bk-scope-title-row>.ks-end,.bk-scope-title-row>.bee-sound-toggle{align-self:center!important;padding-top:0!important;}/* k115: Ana - Hardal seridi + hava karti icerikle kayar (Bakim gibi); yalniz durum seridi ve alt menu sabit */html.sa-iphone12.sa-page-ana body.sa-iphone12 .brand-strip,html.sa-page-ana .brand-strip{position:relative!important;top:auto!important;}html.sa-iphone12.sa-page-ana body.sa-iphone12 #weatherStrip,html.sa-page-ana #weatherStrip{position:relative!important;top:auto!important;}/* k116: ustte hicbir sey sabit degil - durum seridi, Geri ve icerik .phone icinde birlikte kayar; alt menu .phone dibinde sticky (bottom 0 + safe-area) */html.sa-iphone12 body.sa-iphone12 .phone{display:flex!important;flex-direction:column!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}html.sa-iphone12 body.sa-iphone12 .phone>.status-bar{position:relative!important;top:auto!important;flex:0 0 auto!important;}html.sa-iphone12 body.sa-iphone12 .phone>.screen{flex:1 0 auto!important;min-height:auto!important;height:auto!important;max-height:none!important;overflow:visible!important;padding-bottom:12px!important;}html.sa-iphone12 body.sa-iphone12 .phone>nav.tabbar{position:-webkit-sticky!important;position:sticky!important;bottom:0!important;top:auto!important;flex:0 0 auto!important;z-index:70!important;}html.sa-iphone12 body.sa-iphone12 .phone>.home-indicator{position:-webkit-sticky!important;position:sticky!important;bottom:0!important;}/* k118: gercek telefonda da iPhone 12 cercevesi - siyah bezel, yuvarlak koseler; ekran cercevenin icinde, alt menu cerceve dibinde */html.sa-phone-mobile,html.sa-phone-mobile body.sa-phone-mobile{background:#000!important;}html.sa-phone-mobile body.sa-phone-mobile .phone{top:max(6px,env(safe-area-inset-top,0px))!important;left:6px!important;right:6px!important;bottom:max(6px,env(safe-area-inset-bottom,0px))!important;border-radius:38px!important;box-shadow:0 0 0 6px #1b1b1d,0 0 0 7px #3a3a3e!important;padding-bottom:0!important;background:#f7f8fa!important;clip-path:inset(0 round 38px);}html.sa-phone-mobile body.sa-phone-mobile .phone>.status-bar{padding-top:8px!important;padding-left:22px!important;padding-right:22px!important;}html.sa-phone-mobile body.sa-phone-mobile .phone>nav.tabbar{padding-bottom:14px!important;}/* k123: Muayene deseni eylem satiri */.sa-act-row{display:grid;grid-template-columns:calc((100% - 10px) / 3) 1fr;column-gap:5px;width:100%;box-sizing:border-box;margin-top:2px;}body.sa-has-act-row .weather.bk-scope,body.sa-has-act-row #ksScope,body.sa-has-act-row #bkScope{height:auto!important;flex-basis:auto!important;flex-grow:0!important;min-height:0!important;justify-content:flex-start!important;gap:8px!important;}.sa-act-row>.sa-act-btn,.sa-act-row>.ak-start{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;min-height:56px!important;height:auto!important;width:100%!important;margin:0!important;padding:6px 10px!important;box-sizing:border-box!important;border-radius:14px!important;border:1px solid #e0c56a!important;background:linear-gradient(180deg,#fff6df 0%,#f4e3b0 55%,#ebd9a0 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.65)!important;color:#4a2f1a!important;font:inherit;font-weight:800!important;text-decoration:none!important;position:static!important;-webkit-tap-highlight-color:transparent;cursor:pointer;min-width:0!important;}.sa-act-row>.sa-act-btn:active,.sa-act-row>.ak-start:active{transform:scale(.99);}.sa-act-row .sa-act-tri{font-size:17px;line-height:1;color:#4a2f1a;flex:0 0 auto;}.sa-act-row .sa-act-t{font-size:16px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;line-height:1.15;}.sa-act-row>.ak-start .t{min-width:0;overflow:hidden;}.sa-act-row>.ak-start .t b,.sa-act-row>.ak-start small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}/* k123: Safari - cerceve gorunen alani doldurur (URL cubugu alti -> alt arac cubugu), ince 4px bezel; safe-area yalniz ana ekran uygulamasinda */html.sa-phone-mobile.sa-phone-mobile,html.sa-phone-mobile body.sa-phone-mobile.sa-phone-mobile,html.sa-phone-mobile.bk-kabuk-html,html.sa-phone-mobile body.bk-kabuk.sa-phone-mobile{background:#000!important;background-color:#000!important;}html.sa-phone-mobile body.sa-phone-mobile .phone.phone{top:4px!important;left:4px!important;right:4px!important;bottom:4px!important;height:auto!important;max-height:none!important;border-radius:34px!important;box-shadow:0 0 0 4px #1b1b1d,0 0 0 5px #3a3a3e!important;clip-path:inset(0 round 34px);}@media (display-mode: standalone){html.sa-phone-mobile body.sa-phone-mobile .phone.phone{top:max(4px,env(safe-area-inset-top,0px))!important;bottom:max(4px,env(safe-area-inset-bottom,0px))!important;}}/* k124: ◀ ve ▶ ayni boy, ayni dikey merkez - yazi glifi yerine CSS ucgen (iOS emoji/font farki yok) */.sa-act-row .sa-act-tri,.sa-act-row>.ak-start>span[aria-hidden]{display:block!important;flex:0 0 auto!important;width:0!important;height:0!important;font-size:0!important;line-height:0!important;color:transparent!important;overflow:hidden!important;border-top:9px solid transparent!important;border-bottom:9px solid transparent!important;margin:0!important;padding:0!important;align-self:center!important;}.sa-act-row>:first-child .sa-act-tri{border-right:14px solid #4a2f1a!important;border-left:0!important;}.sa-act-row>:last-child .sa-act-tri,.sa-act-row>.ak-start>span[aria-hidden]{border-left:14px solid #4a2f1a!important;border-right:0!important;}/* k188: Geri hep sola bakar (tek basina da) */.sa-act-row>#saBack .sa-act-tri{border-right:14px solid #4a2f1a!important;border-left:0!important;}';

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
    if (!global.SuperAriDemo) chain = chain.then(function () { return loadScript('demo-data.js?v=koloni-213'); });
    if (!global.SuperAriKoloni || !global.SuperAriKoloni.openQuickRecord) chain = chain.then(function () { return loadScript('koloni.js?v=koloni-213'); });
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
  function ensureData() { return global.SuperAriDemo ? Promise.resolve() : loadScript('demo-data.js?v=koloni-213').catch(function () {}); }
  function ensureKoloni() {
    return ensureData().then(function () {
      if (global.SuperAriKoloni && global.SuperAriKoloni.openRecordSheet) return null;
      return loadScript('koloni.js?v=koloni-213').catch(function () {});
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
  var BACK_SKIP = { 'ana.html': 1, 'giris.html': 1, 'kayit.html': 1, 'onay.html': 1, 'sartlar.html': 1, 'index.html': 1, 'kurulum.html': 1 };
  var BACK_PARENT = {
    'bakim-akis.html': 'bakim.html', 'stok.html': 'bakim.html', 'gorevler.html': 'bakim.html', 'bakim-plan.html': 'bakim.html',
    'goc.html': 'bakim.html', 'ekipman.html': 'bakim.html', 'bugun.html': 'ana.html', 'ayarlar.html': 'ana.html', 'hava.html': 'ana.html',
    'kovan.html': 'kovanlar.html', 'kovanlar.html': 'bakim.html', 'koloni-ek.html': 'kovanlar.html?view=koloni',
    'koloni-islem.html': 'kovanlar.html?view=koloni', 'arilik.html': 'ariliklar.html', 'ariliklar.html': 'ana.html',
    'saglik.html': 'bakim.html', 'saglik-detay.html': 'saglik.html', 'uyarilar.html': 'bakim.html',
    'cihazlar.html': 'ayarlar.html', 'kamera.html': 'cihazlar.html', 'giderler.html': 'ana.html', 'satis.html': 'ana.html',
    'raporlar.html': 'ana.html', 'arici.html': 'ana.html', 'bakici.html': 'ana.html', 'hesap.html': 'ayarlar.html',
    'hava-raporu.html': 'hava.html', 'hava-gecmis.html': 'hava.html', 'petek-tarama.html': 'ayarlar.html',
    'qr-etiket.html': 'ayarlar.html', 'logo-sec.html': 'ayarlar.html'
  };
  function backParent() {
    var p = page(), base = BACK_PARENT[p] || 'ana.html';
    if (p === 'kovanlar.html') {
      try {
        var q = new URLSearchParams(location.search), v = q.get('view'), from = String(q.get('from') || '').toLowerCase();
        if (from === 'ana') return 'ana.html';
        if (from === 'bakim') return 'bakim.html';
        if (from === 'kovan') {
          var hid = q.get('hiveId') || q.get('fromHive');
          if (hid) return 'kovan.html?id=' + encodeURIComponent(hid);
        }
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
    var h = n.getHours();
    var m = n.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  var CLOCK_SEL = '[data-bk-clock], #statusClock, .sa-sb-clock, .status-bar #clock, .status-bar > span#clock';
  function paintStatusClocks() {
    var t = fmtClock();
    try {
      Array.prototype.forEach.call(document.querySelectorAll(CLOCK_SEL), function (el) {
        if (el) el.textContent = t;
      });
    } catch (eP) { /* ignore */ }
  }
  function ensureStatusClock() {
    paintStatusClocks();
    if (global.__saSbClock) return;
    global.__saSbClock = setInterval(paintStatusClocks, 1000);
    if (!global.__saSbClockVis) {
      global.__saSbClockVis = 1;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') paintStatusClocks();
      });
      global.addEventListener('pageshow', paintStatusClocks);
    }
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
  function ensureAnaStickyTop() {
    if (!isAnaPage()) return;
    try {
      var phone = document.querySelector('.phone');
      var brand = document.getElementById('brand-strip');
      var wx = document.getElementById('weatherStrip');
      if (!phone || !brand) return;
      var sb = phone.querySelector(':scope > .status-bar') || phone.querySelector('.status-bar');
      var sbVis = sb && window.getComputedStyle(sb).display !== 'none' && sb.offsetHeight > 0;
      var sbH = sbVis ? sb.offsetHeight : 0;
      var brandTop = '0px';
      if (isPhoneMobile()) {
        brandTop = sbVis ? ('calc(env(safe-area-inset-top,0px) + ' + sbH + 'px)') : 'env(safe-area-inset-top,0px)';
      } else if (sbH) brandTop = sbH + 'px';
      var bH = Math.max(36, Math.round(brand.getBoundingClientRect().height)) + 4;
      /* k113: kaydirici artik .screen — ust offset 0, hava karti Hardal seridinin altinda */
      brandTop = '0px';
      var weatherTop = brandTop.indexOf('calc') >= 0
        ? brandTop.replace(/\)$/, ' + ' + bH + 'px)')
        : ('calc(' + brandTop + ' + ' + bH + 'px)');
      document.documentElement.style.setProperty('--sa-ana-brand-top', brandTop);
      document.documentElement.style.setProperty('--sa-ana-weather-top', weatherTop);
    } catch (eAna) { /* ignore */ }
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
      if (sb.getAttribute('data-sa-sb') === '1' && sb.querySelector('.sa-sb-batt-pct')) {
        paintStatusClocks();
        return;
      }
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
      paintStatusClocks();
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
    ensureStatusClock();
  }
  function scopeGeriInCard() {
    var b = document.body;
    if (b && b.classList.contains('ks-scope-nav-in-card')) return true;
    return !!(document.querySelector('#ksScope .bk-geri-pill, #ksScope [data-sa-scope-geri]'));
  }
  var CARD_SEL = '.phone .screen #ksScope, .phone .screen #akScope, .phone .screen #bkScope, .phone .screen .weather.bk-scope, .phone .screen .ks-card';
  var pendingBack = null;
  function backFallback() {
    if (!pendingBack || pendingBack.parentNode) return;
    var b = pendingBack; pendingBack = null;
    var rr = document.querySelector('[data-sa-act-res]'); if (rr && !rr.children.length && rr.parentNode) rr.parentNode.removeChild(rr);
    var host = document.querySelector('.phone > .screen') || document.querySelector('main.wrap') || document.querySelector('main');
    if (!host) return;
    var row = document.createElement('div'); row.className = 'sa-back-row'; row.appendChild(b);
    host.insertBefore(row, host.firstChild);
  }
  function ensureBack() {
    var p = page();
    if (BACK_SKIP[p] || document.getElementById('saBack')) return;
    /* k116: kart ici Geri yok — her sayfada sol ustte kompakt .sa-back */
    /* Saha kapsam sayfaları dışında sol üstte kompakt .sa-back */
    var btn = document.createElement('a');
    btn.id = 'saBack'; btn.className = 'sa-back'; btn.href = backParent();
    btn.setAttribute('aria-label', 'Geri'); btn.textContent = '\u2039 Geri';
    btn.addEventListener('click', goBack);
    /* k189: Kapsam kartı varsa Geri doğrudan kartın içine çizilir — üstte bir an görünüp içeri geçmez */
    if (document.querySelector(CARD_SEL) || document.querySelector('[data-sa-act-res]')) { pendingBack = btn; return; }
    if (document.querySelector('.phone > .screen') || isPhoneMobile() || isShotMode()) {
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

  /* k123: Kapsam kartinda [◀ Geri (1 kutucuk)][ana eylem (2 kutucuk)] — Muayene deseni; ayri Geri satiri yok. ana/bakim kilitli: config yok. */
  var ACT_ROWS = {
    'bakim-akis.html': { el: '#akStart' },
    'kovanlar.html?tarti': { t: 'Elle tartım gir', quick: 'Tartım kaydı', click: '#ksElleTart' },
    'kovanlar.html?koloni': { t: 'Güç dağılımı', click: '#ksScope .ks-end-chip[aria-label^="Koloni gücü"], .ks-end-chip[aria-label^="Koloni gücü"]' },
    'kovanlar.html': { t: 'Kovan ekle', fn: 'SuperAriKovanEkle' },
    'gorevler.html': { t: 'Görev ekle', click: '#ksGorevEkle' },
    'saglik.html': { t: 'Sağlık muayenesi başlat', href: 'bakim-akis.html' },
    'uyarilar.html?ogul': { t: 'Oğul kaydı', quick: 'Oğul durumu kaydı' },
    'uyarilar.html': { t: 'Açık uyarıları gör', scroll: '#filterChips' },
    'cihazlar.html': { t: 'Cihaz ekle', quick: 'Cihaz ekle' },
    'stok.html': { t: 'Alım', click: '.ks-end-chip[href="#stAps"]', scroll: '#stAps' },
    'bakim-plan.html': { t: 'Plan oluştur', click: '#bpReset' }
  };
  function actRowCfg() {
    var p = page(), v = '';
    try { v = new URLSearchParams(location.search).get('view') || ''; } catch (e) {}
    return ACT_ROWS[p + '?' + v] || ACT_ROWS[p] || null;
  }
  function runAct(cfg) {
    var apQ = ''; try { var ap = localStorage.getItem('superari.bakim.scope'); if (ap && ap !== 'all') apQ = '?apiary=' + encodeURIComponent(ap); } catch (e) {}
    if (cfg.fn && typeof window[cfg.fn] === 'function') { window[cfg.fn](); return; }
    if (cfg.quick) { var q = pageActions().filter(function (x) { return x.t === cfg.quick; })[0]; if (q) { q.run(); return; } }
    if (cfg.click) { var c = document.querySelector(cfg.click); if (c) { c.click(); return; } }
    if (cfg.scroll) { var s = document.querySelector(cfg.scroll); if (s) { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } }
    if (cfg.href) location.href = cfg.href + apQ;
  }
  function alignActRow(row, card) {
    var t0 = document.querySelector('.phone .screen .tile');
    var g = t0 ? t0.parentNode : null, tiles = g ? g.querySelectorAll(':scope > .tile') : [];
    var gap = 8;
    if (tiles.length >= 3 && !card.contains(t0)) {
      var a = tiles[0].getBoundingClientRect(), b = tiles[1].getBoundingClientRect(), c = tiles[2].getBoundingClientRect();
      gap = Math.max(0, Math.round(b.left - a.right));
      card.style.setProperty('box-sizing', 'border-box', 'important');
      card.style.setProperty('margin-left', '0px', 'important');
      card.style.setProperty('margin-right', '0px', 'important');
      var cr = card.getBoundingClientRect();
      if (a.width > 40) {
        card.style.setProperty('margin-left', Math.round(a.left - cr.left) + 'px', 'important');
        card.style.setProperty('width', Math.round(c.right - a.left) + 'px', 'important');
        card.style.setProperty('max-width', 'none', 'important');
      }
    }
    row.style.columnGap = gap + 'px';
    row.style.gridTemplateColumns = 'calc((100% - ' + (2 * gap) + 'px) / 3) 1fr';
  }
  function ensureActRow() {
    var cfg = actRowCfg();
    if (BACK_SKIP[page()]) { var rr = document.querySelector('[data-sa-act-res]'); if (rr && !rr.children.length && rr.parentNode) rr.parentNode.removeChild(rr); return true; }
    var card = document.querySelector(CARD_SEL);
    var back = document.getElementById('saBack') || pendingBack;
    /* k188: eylemi olmayan Kapsam kartlı sayfalar (Bakım vb.) — Geri, Tartı gibi kartın içinde 1/3 kutucuk; ayrı üst Geri hapı yok */
    if (!cfg) { if (!card || !back) return false; cfg = { backOnly: true }; }
    if (!card || !back) return false;
    var btn = cfg.backOnly ? null : cfg.el ? document.querySelector(cfg.el) : document.getElementById('saActBtn');
    /* k189: eylem düğmesi henüz hazır değilse Geri yine de kartın içinde yerinde durur; eylem sonra eklenir */
    var actReady = !(cfg.el && !btn) && !(cfg.click && !cfg.quick && !document.querySelector(cfg.click) && !cfg.scroll && !cfg.href);
    if (!actReady) { btn = null; }
    var row = document.getElementById('saActRow');
    if (row && !card.contains(row)) row = null;
    if (!row) {
      row = document.createElement('div'); row.id = 'saActRow'; row.className = 'sa-act-row';
      if (cfg.el && btn && btn.parentNode === card) card.insertBefore(row, btn); else card.appendChild(row);
    }
    row.style.removeProperty('min-height');
    if (!btn && !cfg.backOnly && actReady) {
      btn = document.createElement('button'); btn.type = 'button'; btn.id = 'saActBtn'; btn.className = 'sa-act-btn';
      btn.innerHTML = '<span class="sa-act-tri" aria-hidden="true">\u25B6</span><span class="sa-act-t">' + qesc(cfg.t) + '</span>';
      btn.addEventListener('click', function (e) { e.preventDefault(); runAct(cfg); });
    }
    var oldRow = back.parentNode && back.parentNode.classList && back.parentNode.classList.contains('sa-back-row') ? back.parentNode : null;
    if (back.parentNode !== row) row.insertBefore(back, row.firstChild);
    if (back === pendingBack) pendingBack = null;
    if (btn && btn.parentNode !== row) row.appendChild(btn);
    if (oldRow && !oldRow.children.length && oldRow.parentNode) oldRow.parentNode.removeChild(oldRow);
    if (!back.querySelector('.sa-act-tri')) back.innerHTML = '<span class="sa-act-tri" aria-hidden="true">\u25C0</span><span class="sa-act-t">Geri</span>';
    back.classList.add('sa-act-btn');
    document.body.classList.add('sa-has-act-row');
    alignActRow(row, card);
    var sub = document.getElementById('akStartSub');
    if (sub && sub.scrollWidth > sub.clientWidth + 1) {
      var m = /Kovan\s+(\S+)\s*·\s*(\d+)/.exec(sub.textContent || '');
      if (m) sub.textContent = 'Kovan ' + m[1] + ' · ' + m[2] + ' sırada';
    }
    if (!actReady) return false;
    return !!document.querySelector('.phone .screen .tile') || !/kovanlar|bakim-akis/.test(page());
  }
  function scheduleActRow() {
    var n = 0;
    (function loop() { var done = false; try { done = ensureActRow(); } catch (e) {} if (!done && ++n < 120) setTimeout(loop, 100); else if (!done) backFallback(); })();
    try { var mo = new MutationObserver(function () { try { ensureActRow(); } catch (e) {} }); mo.observe(document.body, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 6000); } catch (eM) {}
    global.addEventListener('resize', function () { requestAnimationFrame(function () { try { ensureActRow(); } catch (e) {} }); });
  }
  function ensureBakimEnd() {
    if (page() !== 'bakim.html') return;
    var top = document.querySelector('#bkScope .bk-top');
    if (!top || top.querySelector('[data-ks-end], .weather-temp')) return;
    var a = document.createElement('a');
    a.className = 'ks-end weather-temp'; a.setAttribute('data-ks-end', '');
    a.href = 'hava.html'; a.title = 'Hava'; a.setAttribute('aria-label', 'Hava sayfasını aç');
    a.textContent = '—°';
    top.appendChild(a);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var ap = null; try { ap = localStorage.getItem('superari.bakim.scope'); } catch (err) {}
      location.href = 'hava.html' + (ap && ap !== 'all' ? ('?apiary=' + encodeURIComponent(ap)) : '');
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
      ensureAnaStickyTop();
    } catch (eM) {}
    try { ensureStatusStrip(); } catch (eSb) { /* ignore */ }
    try { ensureStatusClock(); } catch (eClk) { /* ignore */ }
    try { ensureAnaStickyTop(); } catch (eAna2) { /* ignore */ }
    try { ensureBack(); } catch (eBack) { /* ignore */ }
    try { scheduleActRow(); } catch (eAct) { /* ignore */ }
    try { ensureBakimEnd(); } catch (eEnd) { /* ignore */ }
    try {
      if (global.SuperAriDemo) updateBadge();
      else loadScript('demo-data.js?v=koloni-213').then(updateBadge, updateBadge);
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

  /* k133: Ana «Konumu sabitle» ↔ tüm sayfa arılık kapsamı (superari.bakim.scope) */
  var PIN_LOCK_KEY = 'superari.ana.arilikLock';
  var PIN_SCOPE_KEY = 'superari.bakim.scope';
  function pinRead() {
    try {
      var raw = localStorage.getItem(PIN_LOCK_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || !p.locked || !p.id) return null;
      return { id: String(p.id), idx: p.idx };
    } catch (e) { return null; }
  }
  function pinWrite(id, idx) {
    if (!id || id === 'all') { pinClear(); return; }
    try {
      localStorage.setItem(PIN_LOCK_KEY, JSON.stringify({ locked: true, id: String(id), idx: typeof idx === 'number' ? idx : 0 }));
      localStorage.setItem(PIN_SCOPE_KEY, String(id));
    } catch (e) { /* ignore */ }
    try { global.dispatchEvent(new CustomEvent('superari:scope-pin', { detail: { locked: true, id: String(id) } })); } catch (e2) {}
  }
  function pinClear() {
    try { localStorage.removeItem(PIN_LOCK_KEY); } catch (e) {}
    try { localStorage.setItem(PIN_SCOPE_KEY, 'all'); } catch (e2) {}
    try { global.dispatchEvent(new CustomEvent('superari:scope-pin', { detail: { locked: false, id: null } })); } catch (e3) {}
  }
  function pinSyncScope() {
    var p = pinRead();
    if (!p) return null;
    try { localStorage.setItem(PIN_SCOPE_KEY, p.id); } catch (e) {}
    return p.id;
  }
  global.SuperAriPin = { read: pinRead, write: pinWrite, clear: pinClear, syncScope: pinSyncScope, LOCK_KEY: PIN_LOCK_KEY, SCOPE_KEY: PIN_SCOPE_KEY };

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
    try { fitIphone12Shell(); ensureShellPan(); ensureStatusStrip(); ensureStatusClock(); ensureAnaStickyTop(); ensureBack(); ensureBakimEnd(); } catch (eRf) { /* ignore */ }
  }
  global.addEventListener('superari-shell-ready', function () { setTimeout(refitShell, 0); });
  setTimeout(refitShell, 0);
  setTimeout(refitShell, 400);
  setTimeout(refitShell, 1200);
})(window);
/* k137: iPhone Safari — çerçevenin alt kenarı görünür alanın (araç çubuğunun hemen üstü) en altına iner.
   Yükseklik innerHeight'tan (--sa-vvh); yoksa 100dvh. Çerçeve dışı arka plan koyu (beyaz boşluk kalmaz). */
(function (g) {
  if (g.__saVvh) return; g.__saVvh = 1;
  var d = document, st = d.createElement('style');
  st.textContent = 'html.sa-phone-mobile,html.sa-phone-mobile body.sa-phone-mobile{background:#1b1b1d!important;height:100%;}' +
    'html.sa-phone-mobile body.sa-phone-mobile .phone.phone{bottom:auto!important;height:calc(var(--sa-vvh,100dvh) - var(--sa-top,4px) - 5px)!important;}' +
    '@supports not (height:100dvh){html.sa-phone-mobile body.sa-phone-mobile .phone.phone{height:calc(var(--sa-vvh,100vh) - var(--sa-top,4px) - 5px)!important;}}';
  (d.head || d.documentElement).appendChild(st);
  var raf = 0;
  function set() {
    raf = 0;
    var h = g.innerHeight; /* iOS: araç çubuğu hariç görünür alan; klavye/yakınlaştırmada değişmez */
    if (h > 0) d.documentElement.style.setProperty('--sa-vvh', Math.round(h) + 'px');
    var ph = d.querySelector('.phone'); if (ph) { var t = parseFloat(getComputedStyle(ph).top); if (isFinite(t)) d.documentElement.style.setProperty('--sa-top', t + 'px'); }
  }
  function q() { if (!raf) raf = (g.requestAnimationFrame || setTimeout)(set); }
  set();
  g.addEventListener('resize', q); g.addEventListener('orientationchange', function () { setTimeout(set, 250); }); g.addEventListener('pageshow', q);
  d.addEventListener('DOMContentLoaded', set); setTimeout(set, 400);
})(window);

/* k137: çerçeve içi ince kaydırma imleci — kaydırmada/dokunmada görünür, ~1,5 sn sonra solar; sürüklenince içerik kayar (iOS dahil). */
(function (g) {
  if (g.__saScrollThumb) return; g.__saScrollThumb = 1;
  var d = document, bar, thumb, el = null, hideT = 0, drag = null;
  function scroller() {
    var c = [d.querySelector('.phone > .screen'), d.querySelector('.phone'), d.querySelector('.ana-phone'), d.scrollingElement || d.documentElement];
    for (var i = 0; i < c.length; i++) { var x = c[i]; if (!x) continue; var cs = getComputedStyle(x); if (x.scrollHeight - x.clientHeight > 4 && (x === (d.scrollingElement || d.documentElement) || /auto|scroll/.test(cs.overflowY))) return x; }
    return null;
  }
  function frame() { var f = d.querySelector('.phone') || d.querySelector('.ana-phone'); return f ? f.getBoundingClientRect() : { top: 0, bottom: g.innerHeight, right: g.innerWidth }; }
  function build() {
    if (bar) return;
    var st = d.createElement('style');
    st.textContent = '#saThumbBar{position:fixed;width:14px;z-index:2147483000;pointer-events:none;opacity:0;transition:opacity .35s;touch-action:none}' +
      '#saThumbBar.on{opacity:1}#saThumbBar>i{position:absolute;right:3px;width:4px;border-radius:4px;background:rgba(60,40,20,.45);pointer-events:auto;touch-action:none;transition:width .15s}' +
      '#saThumbBar.drag>i,#saThumbBar>i:active{width:7px;background:rgba(60,40,20,.65)}' +
      '#saThumbBar>i:before{content:"";position:absolute;left:-14px;right:-6px;top:-10px;bottom:-10px}';
    d.head.appendChild(st);
    bar = d.createElement('div'); bar.id = 'saThumbBar'; bar.setAttribute('aria-hidden', 'true'); thumb = d.createElement('i'); bar.appendChild(thumb); d.body.appendChild(bar);
    thumb.addEventListener('pointerdown', function (e) { if (!el) return; e.preventDefault(); e.stopPropagation(); drag = { y: e.clientY, top: el.scrollTop }; bar.classList.add('drag'); try { thumb.setPointerCapture(e.pointerId); } catch (x) {} show(); });
    thumb.addEventListener('pointermove', function (e) { if (!drag || !el) return; e.preventDefault(); var r = metrics(); if (!r) return; el.scrollTop = drag.top + (e.clientY - drag.y) * (el.scrollHeight - el.clientHeight) / Math.max(1, r.track - r.th); });
    function end() { drag = null; bar.classList.remove('drag'); later(); }
    thumb.addEventListener('pointerup', end); thumb.addEventListener('pointercancel', end);
    thumb.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  }
  function metrics() {
    if (!el) return null; var f = frame(), isDoc = el === (d.scrollingElement || d.documentElement);
    var r = isDoc ? { top: Math.max(0, f.top), bottom: Math.min(g.innerHeight, f.bottom) } : el.getBoundingClientRect();
    var top = Math.max(r.top, f.top) + 8, bot = Math.min(r.bottom, f.bottom, g.innerHeight) - 8; var track = bot - top; if (track < 40) return null;
    var th = Math.max(36, track * el.clientHeight / el.scrollHeight), max = el.scrollHeight - el.clientHeight;
    return { top: top, track: track, th: th, y: top + (max > 0 ? (track - th) * el.scrollTop / max : 0), right: Math.min(f.right, g.innerWidth) };
  }
  function paint() { var m = metrics(); if (!m) { bar.classList.remove('on'); return false; } bar.style.top = m.top + 'px'; bar.style.height = m.track + 'px'; bar.style.left = (m.right - 14) + 'px'; thumb.style.top = (m.y - m.top) + 'px'; thumb.style.height = m.th + 'px'; return true; }
  function later() { clearTimeout(hideT); hideT = setTimeout(function () { if (!drag) bar.classList.remove('on'); }, 1500); }
  function show() { build(); el = scroller(); if (!el) return; if (paint()) { bar.classList.add('on'); later(); } }
  d.addEventListener('scroll', function () { show(); }, true);
  d.addEventListener('touchstart', function () { show(); }, { passive: true, capture: true });
  d.addEventListener('wheel', function () { show(); }, { passive: true, capture: true });
  g.addEventListener('resize', function () { if (bar && bar.classList.contains('on')) paint(); });
})(window);
/* k137: Tarayıcıda iPhone 12 çerçevesi = yüklü uygulama (PWA) simülasyonu: üstte iOS durum çubuğu, altta nav + home indicator.
   Gerçek yüklü açılışta (standalone) çerçeve yok: tam ekran, sistem durum çubuğu ve home indicator iOS'un. */
(function (g) {
  if (g.__saPwaSim) return; g.__saPwaSim = 1;
  var d = document, sa = (g.matchMedia && g.matchMedia('(display-mode: standalone)').matches) || g.navigator.standalone === true;
  if (sa) d.documentElement.classList.add('sa-standalone');
  var F = 'html.sa-phone-mobile:not(.sa-standalone) body.sa-phone-mobile .phone';
  var S = 'html.sa-phone-mobile.sa-standalone body.sa-phone-mobile .phone';
  var st = d.createElement('style');
  st.textContent =
    F + '>.status-bar{display:flex!important;position:sticky!important;top:0!important;z-index:80!important;min-height:36px!important;padding-top:8px!important;padding-bottom:4px!important;background:inherit}' +
    F + '>nav.tabbar{padding-bottom:26px!important}' +
    F + '>nav.tabbar:after{content:"";position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#111;opacity:.85;pointer-events:none}' +
    F + '>.home-indicator{display:none!important}' +
    S + '.phone{top:0!important;left:0!important;right:0!important;bottom:0!important;height:100%!important;border-radius:0!important;box-shadow:none!important;clip-path:none!important}' +
    S + '>.status-bar,' + S + '>.phone-notch,' + S + '>.home-indicator{display:none!important}' +
    S + '>.screen{padding-top:env(safe-area-inset-top,0px)!important}' +
    S + '>nav.tabbar{padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}' +
    S + '>nav.tabbar:after{display:none!important}' +
    'html.sa-phone-mobile.sa-standalone,html.sa-phone-mobile.sa-standalone body{background:#f7f8fa!important}';
  (d.head || d.documentElement).appendChild(st);
})(window);

/* koloni-168: telefon maketi sayfayla birlikte kayar; ekran içi sabit (durum çubuğu altında başlar) */
(function(){
  if (typeof document === 'undefined') return;
  var F = 'html.sa-phone-mobile:not(.sa-standalone) body.sa-phone-mobile';
  var css = 'html.sa-phone-mobile:not(.sa-standalone),' + F + '{height:auto!important;min-height:calc(100vh + 45vh)!important;min-height:calc(100svh + 45svh)!important;background:#1b1b1d!important;overflow-y:auto!important;}' +
    F + ' .phone.phone{position:relative!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;margin:16px 5px 45vh!important;margin-bottom:45svh!important;height:calc(100vh - 21px)!important;height:calc(100svh - 21px)!important;height:var(--sa-fixh,calc(100svh - 21px))!important;min-height:var(--sa-fixh,0px)!important;max-height:var(--sa-fixh,none)!important;flex:0 0 auto!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;}' +
    F + ' .phone>.status-bar{position:relative!important;top:auto!important;flex:0 0 auto!important;}' +
    F + ' .phone>.screen{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;overscroll-behavior-y:auto!important;}' +
    F + ' .phone>.tabbar,' + F + ' .phone>.home-indicator{position:relative!important;bottom:auto!important;flex:0 0 auto!important;}';
  /* k142: çerçeve yüksekliği bir kez sabitlenir (Safari araç çubuğu/dvh değişimiyle oynamaz); yalnız genişlik (yön) değişince yeniden */
  (function fixH() {
    var w0 = 0;
    function calc(force) {
      var w = window.innerWidth;
      if (!force && w === w0) return;
      w0 = w;
      var t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:0;height:100svh;width:0;visibility:hidden;pointer-events:none';
      (document.body || document.documentElement).appendChild(t);
      var sv = t.getBoundingClientRect().height || window.innerHeight; t.remove();
      var h = Math.round(Math.min(sv, window.innerHeight || sv) - 21);
      var asp = Math.round((w - 10) * 844 / 390); /* iPhone 12 oranı üst sınır */
      if (asp > 0) h = Math.min(h, asp);
      if (h > 200) document.documentElement.style.setProperty('--sa-fixh', h + 'px');
    }
    if (document.body) calc(true); else document.addEventListener('DOMContentLoaded', function () { calc(true); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { calc(true); }, 300); });
    window.addEventListener('resize', function () { calc(false); });
  })();
  var st = document.createElement('style'); st.id = 'saK138'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();

/* koloni-168: iPhone 12 ekranı — alt kestirme çubuğu ekranın dibinde sabit (home indicator üstünde); yalnız .screen kayar, çubuk kaydırmada oynamaz */
(function(){
  if (typeof document === 'undefined') return;
  var P = 'html.sa-iphone12 body.sa-iphone12 .phone.phone';
  var css = P + '{overflow:hidden!important;display:flex!important;flex-direction:column!important;}' +
    P + '>.screen{flex:1 1 auto!important;min-height:0!important;height:auto!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;}' +
    P + '>.status-bar{flex:0 0 auto!important;}' +
    P + '>nav.tabbar{position:relative!important;bottom:auto!important;top:auto!important;flex:0 0 auto!important;margin-top:0!important;}' +
    P + '>.home-indicator{position:relative!important;bottom:auto!important;flex:0 0 auto!important;}';
  var st = document.createElement('style'); st.id = 'saK144'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();

/* koloni-168: telefonda (Safari) çerçeve içi kaydırma yok — ekran içerik boyunca uzar, yalnız sayfa kayar, tüm telefon onunla hareket eder;
   alt kestirme çubuğu sayfaya göre sticky: görünür alanın dibinde kalır, en sonda çerçevenin altına oturur (araç çubuğu değişse de kaybolmaz) */
(function(){
  if (typeof document === 'undefined') return;
  var H = 'html.sa-phone-mobile.sa-iphone12:not(.sa-standalone)', B = H + ' body.sa-phone-mobile.sa-iphone12', P = B + ' .phone.phone';
  var css = H + ',' + B + '{height:auto!important;min-height:0!important;overflow:visible!important;overflow-x:clip!important;overscroll-behavior:auto!important;}' +
    P + '{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;min-height:var(--sa-fixh,calc(100svh - 21px))!important;margin:16px 5px 24px!important;overflow:visible!important;display:flex!important;flex-direction:column!important;}' +
    P + '>.screen{flex:1 0 auto!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;}' +
    P + '>.status-bar{position:relative!important;top:auto!important;}' +
    P + '>nav.tabbar{position:-webkit-sticky!important;position:sticky!important;bottom:0!important;top:auto!important;z-index:70!important;flex:0 0 auto!important;border-radius:0 0 34px 34px!important;}' +
    '#saThumbBar{display:none!important;}';
  var st = document.createElement('style'); st.id = 'saK145'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();
/* k161 EK11/12: kritik kartlar + yeniden hesap modülleri her sayfada (yoksa yükle) */
(function () {
  if (typeof document === 'undefined') return;
  function yukle(src, var_) { if (window[var_] || document.querySelector('script[src^="' + src + '"]')) return; var s = document.createElement('script'); s.src = src + '?v=koloni-213'; s.async = false; document.head.appendChild(s); }
  function go() { yukle('yetki.js', 'SuperAriYetki'); yukle('kritik-alarm.js', 'SuperAriKritik'); yukle('cevre.js', 'SuperAriCevre'); yukle('yeniden-hesap.js', 'SuperAriYenidenHesap'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
