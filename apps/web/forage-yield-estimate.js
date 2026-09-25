(function (global) {
  var FORAGE_KM = 2.5;
  if (global.__saPanels14) return;
  global.__saPanels14 = true;
  var running = false, finished = false, locOpen = false;

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
      '.sa-split-card .sa-forage-detail,.sa-split-card .sa-place-detail,.sa-split-card .sa-flight-detail,#saFloraBar .sa-loc-detail{display:none;}' +
      '.sa-split-card.is-open .sa-forage-detail,.sa-split-card.is-open .sa-place-detail,.sa-split-card.is-open .sa-flight-detail,#saFloraBar.is-open .sa-loc-detail{display:block;}' +
      '.sa-split-card .forage-head,#saFloraBar .forage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;}' +
      '.sa-split-chev,.fs-chev{width:28px;height:28px;min-width:28px;border:1px solid #e4e0d8;border-radius:999px;background:#faf8f4;color:#6b635a;}' +
      '.sa-split-card.is-open .sa-split-chev,#saFloraBar.is-open .sa-split-chev{transform:rotate(90deg);}' +
      '#saFloraBar{margin:0 0 10px;padding:12px 14px;border-radius:18px;border:1px solid #e4d3a8;background:#fbf6ea;}' +
      '#saFloraBar .forage-head strong{font-size:15px;font-weight:800;color:#1c1916;}' +
      '#saFloraBar .sa-badge{border:1px solid #c4a574;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:800;color:#6b4a28;background:#fff;}' +
      '#saFloraBar .sa-loc-detail{margin-top:8px;font-size:10px;font-weight:560;color:#8a8278;line-height:1.35;}' +
      '#saFloraBar .track,.sa-mini-track{height:6px;border-radius:99px;background:#e8e0d2;overflow:hidden;margin-top:8px;}' +
      '#saFloraBar .fill,.sa-mini-fill{height:100%;background:#3d9a4a;}' +
      '.fs-row input[type=range]{height:28px;}';
    document.head.appendChild(s);
  }
  function locDetail() {
    var a = apiary();
    return [
      'Koordinat · ' + (a && a.lat || 41.0808) + ', ' + (a && a.lon || 40.754),
      'Su · ' + ((a && a.waterDistanceM) || 240) + ' m',
      'Çember · ' + FORAGE_KM + ' km'
    ].map(function (t) { return '<p style="margin:0 0 4px">' + t + '</p>'; }).join('');
  }
  function restyleLocBar(pct) {
    var el = document.getElementById('saFloraBar');
    if (!el) return;
    el.classList.toggle('is-open', locOpen);
    var done = pct >= 100;
    el.innerHTML =
      '<div class="forage-head">' +
        '<strong>Konum</strong>' +
        '<span class="sa-badge">' + (done ? '100 · Güncel' : pct + ' · Tarama') + '</span>' +
        '<button type="button" class="sa-split-chev" aria-label="Detay">›</button>' +
      '</div>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%"></div></div>' +
      '<div class="sa-loc-detail">' + locDetail() + '</div>';
    var head = el.querySelector('.forage-head');
    if (head && !head.__saLoc) {
      head.__saLoc = true;
      head.addEventListener('click', function (ev) {
        ev.preventDefault();
        locOpen = !locOpen;
        el.classList.toggle('is-open', locOpen);
      });
    }
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
      var n = document.getElementById(id);
      if (n) { n.hidden = true; n.style.display = 'none'; }
    });
  }
  function paint(pct) {
    restyleLocBar(pct);
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
  }
  boot();
})(window);
