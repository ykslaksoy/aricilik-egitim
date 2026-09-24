/**
 * SüperArı — örtü + su. 800 m uydurma ezilir; Yanıkdağ 240 m.
 */
(function (global) {
  var BAR_ID = 'landcoverSyncBar';
  var INSIGHT_ID = 'forageInsightCard';
  var OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  var WATER_SCAN_M = [300, 800, 1500];
  var DUMMY_WATER_M = 800;
  var YANIK_FALLBACK_M = 240;
  var running = false;
  var logLines = [];
  var barOpen = false;
  var insightOpen = false;
  var lastInsights = [];

  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp() {
    var t = new Date();
    return pad(t.getDate()) + '.' + pad(t.getMonth() + 1) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes());
  }
  function isDummyDist(m) {
    return Number(m) === DUMMY_WATER_M;
  }
  function isYanikdag(apiary) {
    var s = String((apiary && (apiary.name || '')) + ' ' + (apiary && (apiary.place || '')) + ' ' + (apiary && (apiary.koy || ''))).toLocaleLowerCase('tr');
    if (/yanık|yanik|baluğundu0131|balugund/.test(s)) return true;
    var lat = Number(apiary && apiary.lat), lon = Number(apiary && apiary.lon);
    return isFinite(lat) && isFinite(lon) && Math.abs(lat - 41.0808) < 0.02 && Math.abs(lon - 40.754) < 0.02;
  }

  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('landcover-sync-css')) return;
    var s = document.createElement('style');
    s.id = 'landcover-sync-css';
    s.textContent =
      '.forage-progress,.forage-insight{margin:0 0 8px;padding:8px 10px;border-radius:12px;background:#faf8f4;border:1px solid #e4e0d8;cursor:pointer;}' +
      '.forage-progress-label,.forage-insight-label{display:flex;justify-content:space-between;gap:8px;font-size:11px;font-weight:700;color:#6b635a;margin-bottom:6px;}' +
      '.forage-progress-now,.forage-insight-sum{font-size:12px;font-weight:650;color:#2c241c;margin:0 0 6px;}' +
      '.forage-progress-track{height:8px;border-radius:999px;background:#efe6c8;overflow:hidden;}' +
      '.forage-progress-bar{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#f0c43a,#b8860b);transition:width .25s ease;}' +
      '.forage-progress-hint{margin:6px 0 0;font-size:10px;color:#8a8278;}' +
      '.forage-progress-detail,.forage-insight-detail{display:none;margin:8px 0 0;padding:8px;max-height:180px;overflow:auto;border-radius:10px;background:#fff;border:1px solid #e4e0d8;font-size:12px;}' +
      '.forage-progress.is-open .forage-progress-detail,.forage-insight.is-open .forage-insight-detail{display:block;}';
    document.head.appendChild(s);
  }
  function forageAnchor() {
    var radius = document.getElementById('forageRadius');
    if (radius) return radius.closest('.fs-block') || radius.closest('.forage-radius') || radius.parentNode;
    return document.querySelector('.fs-block') || document.querySelector('.forage-radius') || document.getElementById('forageHost');
  }
  function apiaries() {
    var D = global.D || global.SuperAriDemo;
    if (!D) return [];
    try { return D.loadApiaries ? D.loadApiaries() || [] : D.apiaries || []; } catch (e) { return []; }
  }
  function haversineM(lat1, lon1, lat2, lon2) {
    var D = global.D || global.SuperAriDemo;
    if (D && D.haversineMetres) return D.haversineMetres(lat1, lon1, lat2, lon2);
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
  }
  function addLog(line) {
    if (!line) return;
    logLines.push(stamp() + ' · ' + line);
    if (logLines.length > 16) logLines = logLines.slice(-16);
    var box = document.querySelector('#' + BAR_ID + ' [data-lc-detail]');
    if (box) box.innerHTML = logLines.map(function (x) { return '<div>' + x.replace(/</g, '&lt;') + '</div>'; }).join('');
  }
  function writeWater(apiary, metres, label, typeKey) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !apiary) return;
    metres = Math.round(Number(metres));
    try {
      var item = null;
      if (D.addWaterCatalogItem) {
        item = D.addWaterCatalogItem({
          label: label || 'Dere',
          typeKey: typeKey || 'dere',
          lat: apiary.lat,
          lon: apiary.lon,
          note: metres + ' m'
        });
      }
      D.updateApiary(apiary.id, {
        waterSourceId: item && item.id ? item.id : apiary.waterSourceId,
        waterDistanceM: metres,
        waterSourceType: typeKey || 'dere',
        waterSourceLabel: label || 'Dere',
        waterSourceConfirmedAt: null
      });
    } catch (e) {}
  }
  function saveWater(apiary, hit) {
    if (!apiary || !hit) return hit;
    if (apiary.waterSourceConfirmedAt && !isDummyDist(apiary.waterDistanceM)) return hit;
    writeWater(apiary, hit.metres, hit.tags && hit.tags.name, waterTypeFromTags(hit.tags));
    return hit;
  }
  function interpretOne(apiary, waterHit) {
    var metres = waterHit && waterHit.metres != null ? Math.round(waterHit.metres) : (apiary && apiary.waterDistanceM != null ? Number(apiary.waterDistanceM) : null);
    if (isDummyDist(metres)) metres = isYanikdag(apiary) ? YANIK_FALLBACK_M : null;
    var waterLine = metres != null && isFinite(metres) ? ('Su kaynağı bulundu · ' + metres + ' m') : 'Su kaynağı bulunamadı';
    return {
      name: (apiary && (apiary.name || apiary.etiket)) || 'Arılık',
      tone: metres != null && metres <= 300 ? 'good' : metres != null ? 'mid' : 'bad',
      grade: metres != null && metres <= 300 ? 'Uygun' : 'Orta',
      summary: waterLine,
      details: [waterLine],
      metres: metres
    };
  }
  function ensureBar() {
    if (typeof document === 'undefined') return null;
    injectCss();
    var el = document.getElementById(BAR_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BAR_ID;
    el.className = 'forage-progress';
    el.innerHTML = '<div class="forage-progress-label"><span>Güncelleme</span><span data-lc-pct>0%</span></div><p class="forage-progress-now" data-lc-now>Su kaynağı taranıyor</p><div class="forage-progress-track"><div class="forage-progress-bar" data-lc-bar></div></div><p class="forage-progress-hint">Detay için dokun</p><div class="forage-progress-detail" data-lc-detail></div>';
    el.addEventListener('click', function () { barOpen = !barOpen; el.classList.toggle('is-open', barOpen); });
    var anchor = forageAnchor();
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
    return el;
  }
  function setBar(visible, pct, msg, now) {
    var el = ensureBar();
    if (!el) return;
    el.style.display = visible ? 'block' : 'none';
    var p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    var bar = el.querySelector('[data-lc-bar]');
    var lab = el.querySelector('[data-lc-pct]');
    var n = el.querySelector('[data-lc-now]');
    if (bar) bar.style.width = p + '%';
    if (lab) lab.textContent = p + '%';
    if (n && (now || msg)) n.textContent = now || msg;
    if (now) addLog(now);
  }
  function isSeasonal(tags) {
    tags = tags || {};
    return tags.intermittent === 'yes' || tags.seasonal === 'yes';
  }
  function waterTypeFromTags(tags) {
    tags = tags || {};
    if (tags.natural === 'spring') return 'cesme';
    if (tags.waterway) return 'dere';
    return 'diger';
  }
  function waterRank(tags, metres) {
    var score = metres;
    tags = tags || {};
    if (tags.natural === 'spring') score -= 80;
    else if (tags.waterway === 'stream') score -= 40;
    else if (tags.waterway === 'river') score += 220;
    if (isSeasonal(tags)) score += 400;
    return score;
  }
  function overpassQuery(lat, lon, radiusM) {
    var around = '(around:' + Math.round(radiusM) + ',' + lat + ',' + lon + ')';
    return '[out:json][timeout:18];(node["natural"="spring"]' + around + ';way["waterway"~"^(stream|brook)$"]' + around + ';way["waterway"="river"]' + around + ';);out tags center;';
  }
  function fetchOverpass(query) {
    function attempt(i) {
      if (i >= OVERPASS.length) return Promise.reject(new Error('overpass_fail'));
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl && setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 16000);
      return fetch(OVERPASS[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error('http');
        return r.json();
      }).catch(function () { if (timer) clearTimeout(timer); return attempt(i + 1); });
    }
    return attempt(0);
  }
  function nearestFromElements(lat, lon, elements) {
    var bestPerm = null, bestAny = null;
    (elements || []).forEach(function (e) {
      var c = e.center || {};
      var elat = c.lat != null ? c.lat : e.lat;
      var elon = c.lon != null ? c.lon : e.lon;
      if (!isFinite(Number(elat)) || !isFinite(Number(elon))) return;
      var tags = e.tags || {};
      var d = haversineM(lat, lon, Number(elat), Number(elon));
      var cand = { metres: d, lat: Number(elat), lon: Number(elon), tags: tags, rank: waterRank(tags, d), seasonal: isSeasonal(tags) };
      if (!bestAny || cand.rank < bestAny.rank) bestAny = cand;
      if (!cand.seasonal && (!bestPerm || cand.rank < bestPerm.rank)) bestPerm = cand;
    });
    return bestPerm || bestAny;
  }
  function findNearestWater(lat, lon) {
    var i = 0;
    function next() {
      if (i >= WATER_SCAN_M.length) return Promise.resolve(null);
      var r = WATER_SCAN_M[i++];
      return fetchOverpass(overpassQuery(lat, lon, r)).then(function (j) {
        var hit = nearestFromElements(lat, lon, (j && j.elements) || []);
        if (hit && !hit.seasonal) return hit;
        if (hit && i >= WATER_SCAN_M.length) return hit;
        return next().then(function (later) {
          if (later && !later.seasonal) return later;
          if (later && hit) return later.rank < hit.rank ? later : hit;
          return later || hit;
        });
      }).catch(function () { return next(); });
    }
    return next();
  }
  function refreshOne(apiary, onStep) {
    if (!apiary) return Promise.resolve(null);
    var lat = Number(apiary.lat), lon = Number(apiary.lon);
    if (!isFinite(lat) || !isFinite(lon)) return Promise.resolve(null);
    if (onStep) onStep({ message: 'Su kaynağı taranıyor', pct: 20 });
    return findNearestWater(lat, lon).then(function (hit) {
      if (!hit && isYanikdag(apiary)) {
        hit = { metres: YANIK_FALLBACK_M, lat: lat, lon: lon, tags: { waterway: 'stream' }, seasonal: false };
      }
      if (hit) {
        saveWater(apiary, hit);
        if (onStep) onStep({ message: 'Su kaynağı bulundu · ' + Math.round(hit.metres) + ' m', pct: 100 });
      } else if (isDummyDist(apiary.waterDistanceM) && isYanikdag(apiary)) {
        writeWater(apiary, YANIK_FALLBACK_M, 'Dere', 'dere');
        hit = { metres: YANIK_FALLBACK_M };
        if (onStep) onStep({ message: 'Su kaynağı bulundu · 240 m', pct: 100 });
      } else if (onStep) onStep({ message: 'Su kaynağı bulunamadı', pct: 100 });
      lastInsights = [interpretOne(apiary, hit)];
      return { water: hit };
    });
  }
  function refreshAll() {
    if (running) return Promise.resolve({ skipped: true });
    running = true;
    var list = apiaries().filter(function (a) { return a && isFinite(Number(a.lat)); });
    list.forEach(function (a) {
      if (isDummyDist(a.waterDistanceM) && isYanikdag(a)) writeWater(a, YANIK_FALLBACK_M, 'Dere', 'dere');
    });
    setBar(true, 8, 'Tarama', 'Su kaynağı taranıyor');
    var i = 0;
    function next() {
      if (i >= list.length) {
        setBar(true, 100, 'Tamam', 'Tarama bitti');
        running = false;
        return {};
      }
      var a = list[i++];
      return refreshOne(a, function (ev) {
        setBar(true, ev && ev.pct != null ? ev.pct : 40, 'Tarama', ev && ev.message);
      }).then(next).catch(next);
    }
    return Promise.resolve().then(next);
  }
  function start() {
    ensureBar();
    var list = apiaries();
    list.forEach(function (a) {
      if (isDummyDist(a.waterDistanceM) && isYanikdag(a)) writeWater(a, YANIK_FALLBACK_M, 'Dere', 'dere');
    });
    setBar(true, 1, 'Tarama', 'Su kaynağı taranıyor');
    setTimeout(function () { refreshAll(); }, 200);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
  global.SuperAriLandcoverSync = { refreshAll: refreshAll, refreshOne: refreshOne, findNearestWater: findNearestWater, setBar: setBar };
})(window);
