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
  var STATUS = '<div data-bk-clock aria-live="polite">9:41</div><div class="status-icons"><span>●●●●</span><span>Wi‑Fi</span><span>▮</span></div>';
  var phone = doc.querySelector('.phone');
  if (!phone) {
    var main = doc.querySelector('main.wrap') || doc.querySelector('main');
    if (!main) return;
    phone = doc.createElement('div');
    phone.className = 'phone'; phone.id = 'phone';
    phone.innerHTML = '<div class="phone-notch"></div><div class="status-bar">' + STATUS + '</div><div class="screen bk-screen" id="bkScreen"></div>';
    main.parentNode.insertBefore(phone, main);
    phone.querySelector('.screen').appendChild(main);
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
  global.SuperAriBkKabuk = { phone: phone, screen: phone.querySelector('.screen'), nav: nav };
})(window);
