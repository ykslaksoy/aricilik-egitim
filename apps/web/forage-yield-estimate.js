(function (global) {
  var FORAGE_KM = 2.5;
  if (global.__saPanels17) return;
  global.__saPanels17 = true;
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
      '#saFloraBar{margin:0 0 6px;background:transparent;border:0;padding:0;}' +
      '#saFloraBar .fs-row{display:grid;grid-template-columns:52px 1fr auto 28px;gap:8px;align-items:center;}' +
      '#saFloraBar label{font-size:11px;font-weight:700;color:#6b635a;}' +
      '#saFloraBar .val{font-size:11px;font-weight:800;color:#4a2f1a;}' +
      '#saFloraBar .sa-range{position:relative;height:28px;}' +
      '#saFloraBar .sa-range .track{position:absolute;left:0;right:0;top:12px;height:4px;border-radius:99px;background:#d8dde3;}' +
      '#saFloraBar .sa-range .fill{position:absolute;left:0;top:12px;height:4px;border-radius:99px;background:#0a84ff;}' +
      '#saFloraBar .sa-range .thumb{position:absolute;top:4px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.22);}' +
      '.fs-chev{width:28px;height:28px;border:1px solid #e4e0d8;border-radius:999px;background:#faf8f4;color:#6b635a;transition:transform .18s ease;}' +
      '.fs-chev{display:inline-flex!important;align-items:center;justify-content:center;padding:0!important;min-width:28px;font-size:0!important;transform:none!important;}' +
      '.fs-chev[aria-expanded="true"]{transform:none!important;}' +
      '.fs-chev svg{width:14px;height:14px;display:block;transition:transform .18s ease;transform:rotate(0deg);}' +
      '.fs-chev[aria-expanded="true"] svg{transform:rotate(90deg);}' +
      '.fs-row{grid-template-columns:52px 1fr 64px 28px!important;gap:8px!important;}' +
      '.fs-row .val{justify-content:flex-end;text-align:right;}' +
      '#yieldBar .val,#seasonBar .val{display:block!important;line-height:1.15!important;text-align:right;}' +
      '.sa-mini-track{height:4px!important;background:#dfe2e6!important;min-width:0!important;}' +
      '#saFloraBar .sa-range .track{background:#dfe2e6!important;}' +
      '#saFloraBar .sa-range .fill{background:#2463a6!important;}' +
      '#forageRadius{accent-color:#3f9b3a;}' +
      '#waterRadius{accent-color:#1fb5c4;}' +
      '#flightBar .sa-mini-fill{background:#1e3a8a!important;}' +
      '#yieldBar .sa-mini-fill{background:#d9a21b!important;}' +
      '#seasonBar .sa-mini-fill{background:#7657e0!important;}' +
      
      '#saFloraBar .sa-loc-detail{display:none;margin:4px 0 2px;padding:8px 10px;border-radius:12px;background:#faf8f4;font-size:10px;color:#8a8278;}' +
      '#saFloraBar.is-open .sa-loc-detail{display:block;}' +
      '.sa-split-card:not(.is-open){display:none !important;}' +
      '.sa-split-card.is-open{display:block !important;margin:4px 0 8px;padding:10px 12px;border-radius:16px;border:1px solid #ead9b0;background:#fbf7ee;}';
    document.head.appendChild(s);
  }
  function locDetail() {
    var a = apiary() || {};
    var fc = a.forageCache || null, sc = a.seasonCache || null;
    var f = (fc && fc.payload) || {};
    var se = (sc && sc.payload) || {};
    var cs = f.climateSnapshot || {};
    var lc = f.landCover || null;
    var fr = se.frost || {}, wi = se.wind || {}, wn = se.wintering || {};
    function ok(v) { return v != null && v !== '' && !(typeof v === 'number' && !isFinite(v)); }
    function n1(v) { return Math.round(Number(v) * 10) / 10; }
    function when(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function majority() {
      var D = global.D || global.SuperAriDemo, list = [];
      try { list = (D && D.hivesForApiary) ? (D.hivesForApiary(a.id) || []) : []; } catch (e) {}
      var c = {}, best = '', nb = 0, total = 0;
      list.forEach(function (h) {
        var b = String((h && (h.breed || h.irk)) || '').trim();
        if (!b) return;
        total++; c[b] = (c[b] || 0) + 1;
        if (c[b] > nb) { best = b; nb = c[b]; }
      });
      return best ? (best + ' (' + nb + '/' + total + ' kovan)') : null;
    }
    var rows = [
      ['Koordinat', ok(a.lat) && ok(a.lon) ? (a.lat + ', ' + a.lon) : null],
      ['Rakım', ok(f.elevM) ? (f.elevM + ' m') : (ok(se.elevM) ? (se.elevM + ' m') : null)],
      ['Konum puanı', ok(f.score) ? (f.score + (f.grade && f.grade.tr ? ' · ' + f.grade.tr : '')) : null],
      ['Foraj çemberi', FORAGE_KM + ' km'],
      ['Su mesafesi', ok(a.waterDistanceM) ? (a.waterDistanceM + ' m') : null],
      ['Bal sezonu ort. sıcaklık', ok(cs.meanTempC) ? (n1(cs.meanTempC) + ' °C') : (ok(f.meanTempC) ? (n1(f.meanTempC) + ' °C') : null)],
      ['Bal sezonu toplam yağış', ok(cs.precipSumMm) ? (cs.precipSumMm + ' mm') : (ok(f.precipSumMm) ? (f.precipSumMm + ' mm') : null)],
      ['Bal sezonu yağışlı gün', ok(cs.precipDays) ? (cs.precipDays + ' gün') : null],
      ['Bal sezonu bağıl nem', ok(cs.meanRhPct) ? ('%' + Math.round(cs.meanRhPct)) : (ok(f.meanRhPct) ? ('%' + Math.round(f.meanRhPct)) : null)],
      ['Buharlaşma (ET0)', ok(cs.et0SumMm) ? (cs.et0SumMm + ' mm') : (ok(f.et0SumMm) ? (f.et0SumMm + ' mm') : null)],
      ['Yağışlı saat', ok(cs.rainHoursSum) ? (cs.rainHoursSum + ' saat') : null],
      ['Uçuşa uygun olmayan gün', ok(cs.poorFlightDays) ? (cs.poorFlightDays + ' gün') : null],
      ['Bitki örtüsü', lc ? ('iyi %' + Math.round(lc.goodPct || 0) + ' · karışık %' + Math.round(lc.mixedPct || 0) + ' · zayıf %' + Math.round(lc.poorPct || 0) + (ok(lc.featureCount) ? ' · ' + lc.featureCount + ' alan' : '')) : null],
      ['14 gün en düşük sıcaklık', ok(fr.minTempC) ? (fr.minTempC + ' °C') : null],
      ['14 gün don riski', fr.label ? (fr.label + (ok(fr.frostDays) ? ' · ' + fr.frostDays + ' don günü' : '')) : null],
      ['14 gün rüzgâr', ok(wi.maxKmh) ? ('en yüksek ' + wi.maxKmh + ' km/s' + (ok(wi.avgMaxKmh) ? ' · ort. ' + wi.avgMaxKmh + ' km/s' : '')) : null],
      ['14 gün yağış', ok(se.precipSum14Mm) ? (n1(se.precipSum14Mm) + ' mm') : null],
      ['Kışlama puanı', ok(wn.score) ? (wn.score + (wn.label ? ' · ' + wn.label : '')) : null],
      ['Arı cinsi', majority()]
    ];
    var got = rows.filter(function (r) { return ok(r[1]); });
    var miss = rows.filter(function (r) { return !ok(r[1]); });
    function li(r, isMiss) {
      return '<li style="margin:0 0 2px">' + r[0] + (isMiss ? '' : ' · <b style="color:#4a2f1a">' + r[1] + '</b>') + '</li>';
    }
    function title(t) { return '<p style="margin:8px 0 3px;font-weight:800;color:#4a2f1a">' + t + '</p>'; }
    var last = when((fc && fc.fetchedAt) || (sc && sc.fetchedAt));
    return (last ? '<p style="margin:0 0 3px">Son güncelleme · ' + last + '</p>' : '') +
      title('Güncellenenler (' + got.length + ')') +
      '<ul style="margin:0;padding-left:16px">' + got.map(function (r) { return li(r, false); }).join('') + '</ul>' +
      title('Eksik kalanlar (' + miss.length + ')') +
      (miss.length
        ? '<ul style="margin:0;padding-left:16px;color:#8a2e1c">' + miss.map(function (r) { return li(r, true); }).join('') + '</ul>'
        : '<p style="margin:0">Eksik veri yok.</p>');
  }
  function setOpen(card, btn, on) {
    if (card) {
      card.classList.toggle('is-open', on);
      card.style.display = on ? 'block' : 'none';
    }
    if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function bindBar(btnId, cardId) {
    var btn = document.getElementById(btnId);
    var card = document.getElementById(cardId);
    setOpen(card, btn, !!open[cardId]);
    if (!btn || btn.__saB17) return;
    btn.__saB17 = true;
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      open[cardId] = !open[cardId];
      setOpen(document.getElementById(cardId), btn, open[cardId]);
    }, true);
  }
  function tidyBreed() {
    return; /* Irk artık arılıktaki kovan çoğunluğundan geliyor (forage-analysis.js). */
    document.querySelectorAll('#seasonBar .val, #seasonOnlyPanel, .season-head').forEach(function (n) {
      if (n.childElementCount && n.querySelector('.val')) return;
      var t = n.textContent || '';
      if (/Karniyol/.test(t) && /yanık|yanik/i.test(String(apiary().name || ''))) {
        if (n.classList.contains('val') || (n.id === 'seasonBar')) {
          var v = n.querySelector && n.querySelector('.val');
          if (v) v.textContent = v.textContent.replace('Karniyol', 'Kafkas');
          else if (!n.children.length) n.textContent = t.replace('Karniyol', 'Kafkas');
        }
      }
    });
    var val = document.querySelector('#seasonBar .val');
    if (val && /Karniyol/.test(val.textContent || '')) val.textContent = val.textContent.replace('Karniyol', 'Kafkas');
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
        '<button type="button" class="fs-chev" id="btnLocHint" aria-expanded="' + locOpen + '"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.58a1 1 0 0 0 0-1.42L10.7 6.7a1 1 0 0 0-1.41.01z\"/></svg></button>' +
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
  function paint(pct) {
    injectCss();
    lockForageKm();
    paintLoc(pct);
    bindBar('btnForageHint', 'forageOnlyPanel');
    bindBar('btnWaterHint', 'placeOnlyPanel');
    bindBar('btnFlightHint', 'flightOnlyPanel');
    bindBar('btnYieldHint', 'saYieldCard');
    bindBar('btnSeasonHint', 'seasonOnlyPanel');
    tidyBreed();
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
    setTimeout(function () { paint(finished || cacheFresh() ? 100 : 50); }, 900);
  }
  boot();
})(window);
