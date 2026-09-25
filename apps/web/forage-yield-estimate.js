(function (global) {
  var FORAGE_KM = 2.5;
  if (global.__saPanels16) return;
  global.__saPanels16 = true;
  var running = false, finished = false, locOpen = false;
  var open = {};

  var D0 = global.D || global.SuperAriDemo;
  if (D0 && !D0.__saCoordCache) {
    D0.__saCoordCache = true;
    D0.isLiveCacheFresh = function (cache, lat, lon) {
      if (!cache || cache.payload == null) return false;
      var cla = Number(cache.lat), clo = Number(cache.lon);
      var la = Number(lat), lo = Number(lon);
      if (!isFinite(cla) || !isFinite(clo) || !isFinite(la) || !isFinite(lo)) return false;
      return Math.abs(cla - la) <= 1e-5 && Math.abs(clo - lo) <= 1e-5;
    };
  }

  function apiary() {
    var D = global.D || global.SuperAriDemo;
    var fallback = { name: 'Yanikdag', hiveCount: 20, waterDistanceM: 240, lat: 41.0808, lon: 40.754, id: 'a4', breed: 'Kafkas' };
    if (!D || !D.loadApiaries) return fallback;
    var list = D.loadApiaries() || [];
    var id = '';
    try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    for (var i = 0; i < list.length; i++) if (id && String(list[i].id) === String(id)) return list[i];
    return list[0] || fallback;
  }
  function locKey() {
    var a = apiary();
    var lat = Number(a && a.lat), lon = Number(a && a.lon);
    return String(a && a.id || '') + '|' + (isFinite(lat) ? lat.toFixed(4) : '') + '|' + (isFinite(lon) ? lon.toFixed(4) : '');
  }
  function cacheFresh() {
    var a = apiary();
    var D = global.D || global.SuperAriDemo;
    var lat = Number(a && a.lat), lon = Number(a && a.lon);
    if (!a || !isFinite(lat) || !isFinite(lon)) return false;
    if (D && D.isLiveCacheFresh && D.isLiveCacheFresh(a.forageCache, lat, lon)) return true;
    try { return (localStorage.getItem('saLocCoord') || '') === locKey(); } catch (e) { return false; }
  }
  function markFresh() {
    try { localStorage.setItem('saLocCoord', locKey()); } catch (e) {}
  }
  function lockForageKm() {
    var input = document.getElementById('forageRadius');
    var val = document.getElementById('forageRadiusVal');
    if (input) input.value = String(FORAGE_KM);
    if (val) val.textContent = FORAGE_KM + ' km';
  }
  function injectCss() {
    if (document.getElementById('saRowCss')) return;
    var s = document.createElement('style');
    s.id = 'saRowCss';
    s.textContent =
      '#forageHost{display:flex;flex-direction:column;gap:6px;}' +
      '#saFloraBar{margin:0;background:transparent;border:0;padding:0;}' +
      '#saFloraBar .fs-row,.sa-info-bar .fs-row,.fs-block .fs-row{display:grid;grid-template-columns:52px 1fr auto 28px;gap:8px;align-items:center;min-height:28px;}' +
      '#saFloraBar label,.fs-row label{font-size:11px;font-weight:700;color:#6b635a;}' +
      '#saFloraBar .val,.fs-row .val{font-size:11px;font-weight:800;color:#4a2f1a;}' +
      '#saFloraBar .sa-range{position:relative;height:28px;}' +
      '#saFloraBar .sa-range .track{position:absolute;left:0;right:0;top:12px;height:4px;border-radius:99px;background:#d8dde3;}' +
      '#saFloraBar .sa-range .fill{position:absolute;left:0;top:12px;height:4px;border-radius:99px;background:#0a84ff;}' +
      '#saFloraBar .sa-range .thumb{position:absolute;top:4px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.22);}' +
      '.fs-chev{width:28px;height:28px;border:1px solid #e4e0d8;border-radius:999px;background:#faf8f4;color:#6b635a;}' +
      '#saFloraBar .sa-loc-detail{display:none;margin:4px 0 2px;padding:8px 10px;border-radius:12px;background:#faf8f4;font-size:10px;color:#8a8278;line-height:1.4;}' +
      '#saFloraBar.is-open .sa-loc-detail{display:block;}' +
      '.sa-split-card:not(.is-open){display:none !important;}' +
      '.sa-split-card.is-open{margin:0 0 6px;padding:10px 12px;border-radius:16px;border:1px solid #ead9b0;background:#fbf7ee;}' +
      '.sa-mini-track{height:4px !important;border-radius:99px;background:#d8dde3;}' +
      '.sa-mini-fill{height:4px !important;border-radius:99px;}';
    document.head.appendChild(s);
  }
  function locDetail() {
    var a = apiary();
    return [
      'Koordinat · ' + (a && a.lat || 41.0808) + ', ' + (a && a.lon || 40.754),
      'Su · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Çember · ' + FORAGE_KM + ' km'
    ].map(function (t) { return '<p style="margin:0 0 3px">' + t + '</p>'; }).join('');
  }
  function tidy() {
    lockForageKm();
    var seen = {};
    document.querySelectorAll('.sa-split-card, #placeOnlyPanel, #forageOnlyPanel, #flightOnlyPanel, #yieldOnlyPanel').forEach(function (el) {
      var title = ((el.querySelector('strong') || {}).textContent || el.id || '').trim();
      if (seen[title] && !el.classList.contains('is-open')) {
        el.style.display = 'none';
        return;
      }
      seen[title] = true;
      if (!el.classList.contains('is-open')) el.style.display = 'none';
    });
    document.querySelectorAll('.fs-row .val, .season-badge, .forage-head').forEach(function (n) {
      if (/Karniyol/.test(n.textContent || '') && /yanık|yanik/i.test((apiary().name || '') + (apiary().place || ''))) {
        n.textContent = n.textContent.replace('Karniyol', 'Kafkas');
      }
    });
  }
  function paintLoc(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    el.classList.toggle('is-open', locOpen);
    var left = Math.max(8, Math.min(100, pct));
    el.innerHTML =
      '<div class="fs-row">' +
        '<label>Konum</label>' +
        '<div class="sa-range"><div class="track"></div><div class="fill" style="width:' + pct + '%"></div><div class="thumb" style="left:' + left + '%"></div></div>' +
        '<span class="val">' + pct + '%</span>' +
        '<button type="button" class="fs-chev" id="btnLocHint">›</button>' +
      '</div>' +
      '<div class="sa-loc-detail">' + locDetail() + '</div>';
    var btn = document.getElementById('btnLocHint');
    if (btn && !btn.__sa) {
      btn.__sa = true;
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        locOpen = !locOpen;
        paintLoc(pct);
      });
    }
  }
  function bindBar(btnId, cardId) {
    var btn = document.getElementById(btnId);
    var card = document.getElementById(cardId);
    if (card) card.style.display = open[cardId] ? '' : 'none';
    if (card && open[cardId]) card.classList.add('is-open');
    if (!btn || btn.__saB) return;
    btn.__saB = true;
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      open[cardId] = !open[cardId];
      if (card) {
        card.classList.toggle('is-open', open[cardId]);
        card.style.display = open[cardId] ? '' : 'none';
      }
    }, true);
  }
  function paint(pct) {
    injectCss();
    paintLoc(pct);
    bindBar('btnForageHint', 'forageOnlyPanel');
    bindBar('btnWaterHint', 'placeOnlyPanel');
    bindBar('btnFlightHint', 'flightOnlyPanel');
    bindBar('btnYieldHint', 'yieldOnlyPanel');
    tidy();
  }
  function startAnim() {
    if (running || finished || cacheFresh()) { finished = true; markFresh(); paint(100); return; }
    running = true;
    var t0 = Date.now();
    var iv = setInterval(function () {
      var ready = cacheFresh();
      var pct = ready ? 100 : Math.min(99, Math.round((Date.now() - t0) / 90));
      if (Date.now() - t0 > 18000) pct = 100;
      paint(pct);
      if (pct >= 100) {
        clearInterval(iv);
        running = false;
        finished = true;
        markFresh();
      }
    }, 120);
  }
  function ensureBar() {
    if (typeof document === 'undefined') return false;
    injectCss();
    var forage = document.getElementById('forageRadius');
    var anchor = (forage && (forage.closest('.fs-block') || forage.parentNode)) || document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return false;
    if (!document.getElementById('saFloraBar')) {
      var el = document.createElement('div');
      el.id = 'saFloraBar';
      anchor.parentNode.insertBefore(el, anchor);
    }
    return true;
  }
  function boot() {
    if (!ensureBar()) { setTimeout(boot, 400); return; }
    if (finished || cacheFresh()) { finished = true; markFresh(); paint(100); }
    else startAnim();
    setTimeout(function () { paint(100); }, 800);
  }
  boot();
})(window);
