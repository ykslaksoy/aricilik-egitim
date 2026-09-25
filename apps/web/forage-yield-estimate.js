(function (global) {
  var FORAGE_KM = 2.5;
  if (global.__saPanels13) return;
  global.__saPanels13 = true;
  var running = false, finished = false;

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
    if (document.getElementById('saSplitCss')) return;
    var s = document.createElement('style');
    s.id = 'saSplitCss';
    s.textContent =
      '.sa-split-card .sa-forage-detail,.sa-split-card .sa-place-detail,.sa-split-card .sa-flight-detail{display:none;}' +
      '.sa-split-card.is-open .sa-forage-detail,.sa-split-card.is-open .sa-place-detail,.sa-split-card.is-open .sa-flight-detail{display:block;}' +
      '.sa-split-card .forage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;}' +
      '.sa-split-chev{flex:0 0 28px;height:28px;border:0;border-radius:999px;background:#f3eee6;color:#8a8278;font-size:16px;}' +
      '.sa-split-card.is-open .sa-split-chev{transform:rotate(90deg);}' +
      '#saFloraBar{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #b7d4a8;background:#f4faef;}' +
      '#saFloraBar .sa-title{margin:0 0 6px;font-size:13px;font-weight:700;color:#2c4a22;}' +
      '#saFloraBar .sa-barrow{display:flex;align-items:center;gap:8px;}' +
      '#saFloraBar .track{flex:1;height:8px;border-radius:99px;background:#d7ead0;overflow:hidden;}' +
      '#saFloraBar .fill{height:100%;background:#3d9a4a;}';
    document.head.appendChild(s);
  }
  function wireCard(card) {
    if (!card || card.__saOpen) return;
    card.__saOpen = true;
    var head = card.querySelector('.forage-head, .season-head');
    if (!head) return;
    if (!head.querySelector('.sa-split-chev')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sa-split-chev';
      b.textContent = '\u203a';
      head.appendChild(b);
    }
    head.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      card.classList.toggle('is-open');
    });
  }
  function wireAll() {
    injectCss();
    lockForageKm();
    ['forageOnlyPanel', 'placeOnlyPanel', 'flightOnlyPanel'].forEach(function (id) {
      wireCard(document.getElementById(id));
    });
    document.querySelectorAll('.sa-split-card').forEach(wireCard);
    ['saForagePanel', 'saWaterPanel'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.hidden = true; el.style.display = 'none'; }
    });
  }
  function paint(pct) {
    var el = document.getElementById('saFloraBar');
    if (el) {
      var title = el.querySelector('[data-sa-title]');
      var fill = el.querySelector('.fill');
      if (title) title.textContent = (pct >= 100 ? 'Konum verisi guncel' : 'Konum verisi guncelleniyor') + ' · ' + pct + '%';
      if (fill) fill.style.width = pct + '%';
    }
    if (pct >= 70) wireAll();
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
        wireAll();
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
      el.innerHTML = '<p class="sa-title" data-sa-title>Konum verisi guncelleniyor · 0%</p><div class="sa-barrow"><div class="track"><div class="fill"></div></div></div>';
      anchor.parentNode.insertBefore(el, anchor);
    }
    return true;
  }
  function boot() {
    if (!ensureBar()) { setTimeout(boot, 400); return; }
    lockForageKm();
    if (finished || cacheFresh()) { finished = true; markFresh(); paint(100); }
    else startAnim();
    setTimeout(wireAll, 700);
    setTimeout(wireAll, 1800);
  }
  boot();
})(window);
