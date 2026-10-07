/* k94 · Bakım kabuğu — saha sayfalarını bakim.html ile aynı telefon çerçevesine alır (ortak bileşen).
 * </main>'den hemen sonra, sayfa betiklerinden ve nav.js'ten önce yüklenir:
 *   main.wrap → .phone > (.phone-notch, .status-bar, .screen > main.wrap, nav.tabbar, .home-indicator)
 * Telefon çerçeveli sayfalarda (.phone zaten var) durum çubuğu bakim.html ile eşitlenir, alt menü yoksa eklenir.
 * Alt menünün içeriği, etkin sekme (Bakım / Bugün), ＋ Kayıt ve rozetler nav.js'ten gelir (bakim.html ile aynı). */
(function (global) {
  'use strict';
  var doc = global.document, body = doc.body;
  if (!body) return;
  body.classList.add('bk-kabuk');
  doc.documentElement.classList.add('bk-kabuk-html');
  body.removeAttribute('data-tabbar');
  /* k97: ince durum şeridi — saat · sinyal · Wi‑Fi · pil % (çentik/çerçeve yok) */
  var STATUS = '<div data-bk-clock class="sa-sb-clock" aria-live="polite">9:41</div>'
    + '<div class="status-icons" aria-hidden="true">'
    + '<span class="sa-sb-sig" title="Sinyal"><svg viewBox="0 0 18 12" width="16" height="11"><rect x="1" y="8" width="2.2" height="3.5" rx=".4" fill="currentColor"/><rect x="5" y="5.5" width="2.2" height="6" rx=".4" fill="currentColor"/><rect x="9" y="3" width="2.2" height="8.5" rx=".4" fill="currentColor"/><rect x="13" y="0.5" width="2.2" height="11" rx=".4" fill="currentColor"/></svg></span>'
    + '<span class="sa-sb-wifi" title="Wi‑Fi"><svg viewBox="0 0 16 12" width="15" height="11"><path d="M8 10.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" fill="currentColor"/><path d="M3.2 7.2a6.8 6.8 0 0 1 9.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.4 9a3.7 3.7 0 0 1 5.2 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>'
    + '<span class="sa-sb-batt" title="Pil"><span class="sa-sb-batt-pct">87%</span><svg viewBox="0 0 28 13" width="26" height="12"><rect x="0.7" y="1.2" width="23" height="10.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="24.2" y="4" width="2.4" height="5" rx=".7" fill="currentColor"/><rect class="sa-sb-batt-fill" x="2.4" y="3" width="18.2" height="7" rx="1.2" fill="currentColor"/></svg></span>'
    + '</div>';
  function makePhoneShell() {
    var el = doc.createElement('div');
    el.className = 'phone';
    el.id = 'phone';
    el.innerHTML = '<div class="phone-notch"></div><div class="status-bar">' + STATUS + '</div><div class="screen bk-screen" id="bkScreen"></div>';
    return el;
  }
  function collectPageMain() {
    var main = doc.querySelector('main.wrap') || doc.querySelector('main');
    if (main && !doc.querySelector('body > header')) {
      if (!main.classList.contains('wrap')) main.classList.add('wrap');
      return main;
    }
    var shell = doc.createElement('main');
    shell.className = 'wrap sa-auto-wrap';
    var moved = false;
    Array.prototype.forEach.call(body.childNodes, function (n) {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'SCRIPT') return;
      shell.appendChild(n);
      moved = true;
    });
    if (!moved) return null;
    var firstScript = body.querySelector('script');
    if (firstScript) body.insertBefore(shell, firstScript);
    else body.appendChild(shell);
    return shell;
  }
  var phone = doc.querySelector('.phone');
  if (!phone) {
    var auth = doc.querySelector('.auth-phone');
    if (auth) {
      body.classList.add('bk-auth-shell');
      phone = makePhoneShell();
      auth.parentNode.insertBefore(phone, auth);
      phone.querySelector('.screen').appendChild(auth);
    } else {
      var main = collectPageMain();
      if (!main) return;
      phone = makePhoneShell();
      main.parentNode.insertBefore(phone, main);
      phone.querySelector('.screen').appendChild(main);
    }
  } else {
    var sb = phone.querySelector('.status-bar');
    if (sb) sb.innerHTML = STATUS;
    var sc = phone.querySelector('.screen');
    if (sc) { sc.classList.add('bk-screen'); if (!sc.id) sc.id = 'bkScreen'; }
  }
  var nav = phone.querySelector('nav.tabbar');
  if (!nav) {
    nav = doc.createElement('nav');
    nav.className = 'tabbar'; nav.setAttribute('aria-label', 'Alt menü');
    phone.appendChild(nav);
  }
  if (!phone.querySelector('.home-indicator')) {
    var hi = doc.createElement('div'); hi.className = 'home-indicator'; phone.appendChild(hi);
  } else phone.appendChild(phone.querySelector('.home-indicator'));
  /* Eski sabit alt menü (nav.js sa-fixed) kaldıysa kaldır */
  Array.prototype.forEach.call(doc.querySelectorAll('nav.tabbar.sa-fixed'), function (n) { n.remove(); });
  body.classList.remove('sa-has-fixed-tabbar');
  if (/(?:^|[?&])shot=1(?:&|$)/.test(global.location.search)) body.classList.add('shot');
  function tick() {
    var n = new Date(), t = n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes();
    Array.prototype.forEach.call(doc.querySelectorAll('[data-bk-clock]'), function (e) { e.textContent = t; });
  }
  tick(); global.setInterval(tick, 1000);
  try {
    if (!body.classList.contains('shot') && global.matchMedia
      && !global.matchMedia('(max-width:520px)').matches
      && !global.matchMedia('(display-mode: standalone)').matches) {
      doc.documentElement.classList.add('sa-shell-framed');
      body.classList.add('sa-shell-framed');
    }
  } catch (eFr) { /* ignore */ }
  global.SuperAriBkKabuk = { phone: phone, screen: phone.querySelector('.screen'), nav: nav };
  try { global.dispatchEvent(new Event('superari-shell-ready')); } catch (eEv) { /* ignore */ }
})(window);
