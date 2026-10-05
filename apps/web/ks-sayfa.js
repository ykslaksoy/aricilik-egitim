/* Saha sayfalarını Bakım düzenine geçirir: Kapsam kartı (Bakım ile ortak arılık kapsamı + özet + not) en üstte,
   eski «SüperArı» başlığı gizlenir, düğme / seçim / giriş alanları eldiven boyuna (≥64 px) çıkar (kapsam.css .ks-glove).
   Kullanım: sayfa betiğinden ÖNCE SuperAriKsSayfa.ensureScope({ mode: true }) (URL'ye ?apiary= yazar),
   sayfa çizildikten sonra SuperAriKsSayfa.init({ title, icon, stats(hs, scope, sum), note(hs, scope, sum), tools: [{ t, href | id, cls }] }). */
(function (global) {
  'use strict';
  var KEY = 'superari.bakim.scope';
  function D() { return global.SuperAriDemo; }
  function saved() { try { return global.localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function apOk(id) { try { return (D().loadApiaries() || []).some(function (a) { return String(a.id) === String(id); }); } catch (e) { return false; } }
  function scopeNow() { var a = new URLSearchParams(global.location.search).get('apiary') || ''; return a && apOk(a) ? a : 'all'; }
  /** URL'de kapsam yoksa ortak kapsamı URL'ye yazar (sayfa betiği okumadan önce). Döner: 'all' | arılık id. */
  function ensureScope(o) {
    o = o || {};
    try {
      var u = new URLSearchParams(global.location.search), ap = u.get('apiary') || '';
      if (ap && !apOk(ap)) ap = '';
      if (!ap && u.get('mode') !== 'all' && !o.noSaved) { var s = saved(); if (s && s !== 'all' && apOk(s)) ap = s; }
      if (o.mode) u.set('mode', ap ? 'apiary' : 'all');
      if (ap) u.set('apiary', ap); else u.delete('apiary');
      var qs = u.toString();
      global.history.replaceState(null, '', global.location.pathname.split('/').pop() + (qs ? '?' + qs : '') + global.location.hash);
      return ap || 'all';
    } catch (e) { return 'all'; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function init(o) {
    o = o || {};
    var KS = global.SuperAriKapsam; if (!KS || !global.document.body) return null;
    var doc = global.document;
    doc.body.classList.add('ks-body', 'ks-page', 'ks-glove');
    /* k94: bk-kabuk.js main.wrap'i telefon çerçevesine alır — o sayfalarda kart yine main'in başına girer */
    var mainEl = doc.querySelector('main.wrap');
    var phone = mainEl ? null : doc.querySelector('.phone .screen');
    if (phone) doc.body.classList.add('ks-phone');
    (o.hide || []).concat(['.brand', '.brand-strip', '.page-head h1', '.page-head #pageSub', '.page-head > div:first-child > p']).forEach(function (sel) {
      doc.querySelectorAll(sel).forEach(function (e) { e.hidden = true; e.style.display = 'none'; });
    });
    var host = doc.createElement('section'); host.id = 'ksScope';
    var after = o.after ? doc.querySelector(o.after) : (phone ? phone.querySelector('.page-head') : doc.querySelector('main .nav'));
    if (after && after.parentNode) after.parentNode.insertBefore(host, after.nextSibling);
    else { var box = phone || mainEl || doc.querySelector('main') || doc.body; box.insertBefore(host, box.firstChild); }
    var tools = null;
    if (o.tools && o.tools.length) {
      tools = doc.createElement('div'); tools.className = 'ks-tools'; tools.id = 'ksTools';
      tools.innerHTML = o.tools.map(function (t) {
        return t.href ? '<a class="ks-btn ' + (t.cls || '') + '" href="' + esc(t.href) + '"' + (t.id ? ' id="' + esc(t.id) + '"' : '') + '>' + esc(t.t) + '</a>'
          : '<button type="button" class="ks-btn ' + (t.cls || '') + '"' + (t.id ? ' id="' + esc(t.id) + '"' : '') + '>' + esc(t.t) + '</button>';
      }).join('');
      host.parentNode.insertBefore(tools, host.nextSibling);
    }
    var init0 = o.initial || scopeNow();
    var ctl = KS.mount(host, {
      title: o.title, icon: o.icon || KS.ICON_KOVAN, page: o.page || global.location.pathname.split('/').pop(), initial: init0,
      stats: o.stats, note: o.note, noAll: !!o.noAll, topEnd: o.topEnd, topExtra: o.topExtra,
      onChange: function (scope, hs, sum) {
        /* kapsam değişti → sayfa o arılıkla yeniden açılır (sayfanın kendi süzgeci ?apiary= ile çalışır) */
        if (scope !== init0 && o.reload !== false) { global.location.reload(); return; }
        if (o.onChange) o.onChange(scope, hs, sum);
      }
    });
    return ctl;
  }
  global.SuperAriKsSayfa = { ensureScope: ensureScope, init: init, scope: scopeNow, esc: esc };
})(window);
