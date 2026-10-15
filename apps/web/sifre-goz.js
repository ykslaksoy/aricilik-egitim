/* koloni-166: tüm şifre alanlarına göz (göster/gizle, ≥44 px) + tekrar alanlı formlarda canlı kontrol (yer ayrılmış ileti → kayma 0) */
(function () {
  'use strict';
  var GOZ = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var KAPALI = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  var st = document.createElement('style');
  st.textContent = '.sg-k{position:relative;display:block;width:100%}.sg-k>input{width:100%;box-sizing:border-box;padding-right:48px!important}' +
    '.sg-b{position:absolute;right:0;top:50%;transform:translateY(-50%);width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#7a6638;cursor:pointer;padding:0;margin:0}' +
    '.sg-m{display:block;min-height:1.3em;line-height:1.3em;font-size:.82rem;color:#b42318;margin:2px 0 0}';
  (document.head || document.documentElement).appendChild(st);
  function giydir(i) {
    if (i.__sg) return; i.__sg = 1;
    var k = document.createElement('span'); k.className = 'sg-k'; i.parentNode.insertBefore(k, i); k.appendChild(i);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sg-b'; b.setAttribute('aria-label', 'Şifreyi göster'); b.innerHTML = GOZ; k.appendChild(b);
    b.addEventListener('click', function () { var ac = i.type === 'password'; i.type = ac ? 'text' : 'password'; b.setAttribute('aria-label', ac ? 'Şifreyi gizle' : 'Şifreyi göster'); b.innerHTML = ac ? KAPALI : GOZ; });
  }
  function kontrol(f) {
    var y = f.querySelectorAll('input[autocomplete="new-password"]'); if (y.length < 2 || f.__sk) return; f.__sk = 1;
    var a = y[0], b2 = y[1], kay = f.querySelector('button[type=submit],button:not([type])') || null;
    var m = document.createElement('span'); m.className = 'sg-m'; m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
    (b2.closest('.sg-k') || b2).insertAdjacentElement('afterend', m);
    function bak() {
      var v = a.value, w = b2.value, msg = '';
      if (v && v.length < 8) msg = 'En az 8 karakter'; else if (w && v !== w) msg = 'Şifreler aynı değil';
      m.textContent = msg; var ok = v.length >= 8 && v === w; if (kay) kay.disabled = !ok; return ok;
    }
    a.addEventListener('input', bak); b2.addEventListener('input', bak); bak();
    f.addEventListener('submit', function (e) { if (!bak()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }
  function tara(kok) {
    [].forEach.call((kok || document).querySelectorAll('input[type=password]'), giydir);
    [].forEach.call((kok || document).querySelectorAll('form'), kontrol);
  }
  function bas() { tara(); try { new MutationObserver(function (ms) { ms.forEach(function (x) { [].forEach.call(x.addedNodes, function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('input[type=password]')) giydir(n); tara(n); if (n.closest) { var f = n.closest('form'); if (f) kontrol(f); } } }); }); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {} }
  window.SuperAriSifreGoz = { tara: tara };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bas); else bas();
})();
