/**
 * SüperArı — örtü + su senkronu. Kısa çubuk metni.
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
  var running = false;
  var logLines = [];
  var barOpen = false;
  var insightOpen = false;
  var lastInsights = [];

  function injectCss() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('landcover-sync-css')) return;
    var s = document.createElement('style');
    s.id = 'landcover-sync-css';
    s.textContent =
      '.forage-progress,.forage-insight{margin:0 0 8px;padding:8px 10px;border-radius:12px;background:#faf8f4;border:1px solid #e4e0d8;-webkit-tap-highlight-color:transparent;}' +
      '.forage-progress,.forage-insight{cursor:pointer;}' +
      '.forage-progress-label,.forage-insight-label{display:flex;justify-content:space-between;gap:8px;font-size:11px;font-weight:700;color:#6b635a;margin-bottom:6px;}' +
      '.forage-progress-label [data-lc-pct],.forage-insight-grade{color:#4a2f1a;font-weight:800;}' +
      '.forage-progress-now,.forage-insight-sum{font-size:12px;font-weight:650;color:#2c241c;margin:0 0 6px;line-height:1.4;}' +
      '.forage-progress-track{height:8px;border-radius:999px;background:#efe6c8;overflow:hidden;}' +
      '.forage-progress-bar{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#f0c43a,#b8860b);transition:width .25s ease;}' +
      '.forage-progress-hint,.forage-insight-hint{margin:6px 0 0;font-size:10px;font-weight:600;color:#8a8278;}' +
      '.forage-progress-detail,.forage-insight-detail{display:none;margin:8px 0 0;padding:8px;max-height:180px;overflow:auto;border-radius:10px;background:#fff;border:1px solid #e4e0d8;font-size:12px;line-height:1.45;color:#4a2f1a;}' +
      '.forage-progress.is-open .forage-progress-detail,.forage-insight.is-open .forage-insight-detail{display:block;}' +
      '.forage-progress-detail div{padding:3px 0;border-bottom:1px solid #f3ead0;}' +
      '.forage-insight.tone-good{border-color:#b7d4a8;background:#f4faef;}' +
      '.forage-insight.tone-mid{border-color:#e0c56a;background:#fff8df;}' +
      '.forage-insight.tone-bad{border-color:#e0b4a8;background:#fff4f0;}';
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
    if (logLines.length && logLines[logLines.length - 1] === line) return;
    logLines.push(line);
    if (logLines.length > 16) logLines = logLines.slice(-16);
    var box = document.querySelector('#' + BAR_ID + ' [data-lc-detail]');
    if (box) {
      box.innerHTML = logLines.map(function (x) { return '<div>' + x.replace(/</g, '&lt;') + '</div>'; }).join('');
    }
  }
  function interpretOne(apiary, waterHit, analysis) {
    var metres = waterHit && waterHit.metres != null ? Math.round(waterHit.metres) : (apiary && apiary.waterDistanceM != null ? Number(apiary.waterDistanceM) : null);
    var lc = analysis && (analysis.landCover || (analysis.payload && analysis.payload.landCover));
    var waterLine = metres != null && isFinite(metres) ? ('Su kaynağı bulundu · ' + metres + ' m') : 'Su kaynağı bulunamadı';
    var coverLine = lc && (lc.summaryTr || lc.goodPct != null) ? 'Flora bulundu' : 'Flora bulunamadı';
    var tone = metres != null && metres <= 300 && coverLine === 'Flora bulundu' ? 'good' : (metres != null ? 'mid' : 'bad');
    return {
      name: (apiary && (apiary.name || apiary.etiket)) || 'Arılık',
      tone: tone,
      grade: tone === 'good' ? 'Uygun' : tone === 'mid' ? 'Orta' : 'Zayıf',
      summary: waterLine + ' · ' + coverLine,
      details: [waterLine, coverLine],
      metres: metres
    };
  }
  function ensureInsight() {
    injectCss();
    var el = document.getElementById(INSIGHT_ID);
    var bar = document.getElementById(BAR_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = INSIGHT_ID;
      el.className = 'forage-insight tone-mid';
      el.innerHTML = '<div class="forage-insight-label"><span>Yorum</span><span class="forage-insight-grade" data-ins-grade>—</span></div><p class="forage-insight-sum" data-ins-sum></p><p class="forage-insight-hint">Detay için dokun</p><div class="forage-insight-detail" data-ins-detail></div>';
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        insightOpen = !insightOpen;
        el.classList.toggle('is-open', insightOpen);
      });
    }
    if (bar && bar.parentNode) bar.parentNode.insertBefore(el, bar.nextSibling);
    return el;
  }
  function paintInsights() {
    var el = ensureInsight();
    if (!lastInsights.length) return;
    var first = lastInsights[0];
    el.className = 'forage-insight tone-' + first.tone + (insightOpen ? ' is-open' : '');
    var g = el.querySelector('[data-ins-grade]');
    var s = el.querySelector('[data-ins-sum]');
    var d = el.querySelector('[data-ins-detail]');
    if (g) g.textContent = first.grade;
    if (s) s.textContent = first.summary;
    if (d) d.innerHTML = lastInsights.map(function (x) {
      return '<div>' + x.details.join(' · ').replace(/</g, '&lt;') + '</div>';
    }).join('');
  }
  function ensureBar() {
    if (typeof document === 'undefined') return null;
    injectCss();
    var el = document.getElementById(BAR_ID);
    var anchor = forageAnchor();
    if (el) { ensureInsight(); return el; }
    el = document.createElement('div');
    el.id = BAR_ID;
    el.className = 'forage-progress';
    el.innerHTML = '<div class="forage-progress-label"><span>Güncelleme</span><span data-lc-pct>0%</span></div><p class="forage-progress-now" data-lc-now>Su kaynağı taranıyor</p><div class="forage-progress-track"><div class="forage-progress-bar" data-lc-bar></div></div><p class="forage-progress-hint">Detay için dokun</p><div class="forage-progress-detail" data-lc-detail></div>';
    el.addEventListener('click', function () { barOpen = !barOpen; el.classList.toggle('is-open', barOpen); });
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
    else {
      var host = document.getElementById('forageHost') || document.getElementById('apiaryList');
      if (host && host.parentNode) host.parentNode.insertBefore(el, host);
    }
    ensureInsight();
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
    if (tags.natural === 'spring' || tags.amenity === 'drinking_water') return 'cesme';
    if (tags.natural === 'water') return 'golet';
    if (isSeasonal(tags)) return 'mevsimlik_dere';
    if (tags.waterway) return 'dere';
    return 'diger';
  }
  function waterRank(tags, metres) {
    var score = metres;
    tags = tags || {};
    if (tags.natural === 'spring' || tags.amenity === 'drinking_water') score -= 80;
    else if (tags.waterway === 'stream' || tags.waterway === 'brook') score -= 40;
    else if (tags.waterway === 'river') score += 220;
    if (isSeasonal(tags)) score += 400;
    return score;
  }
  function waterLabelFromTags(tags, lat, lon) {
    if (tags && tags.name) return String(tags.name);
    return 'Su ' + Number(lat).toFixed(4) + ',' + Number(lon).toFixed(4);
  }
  function overpassQuery(lat, lon, radiusM) {
    var around = '(around:' + Math.round(radiusM) + ',' + lat + ',' + lon + ')';
    return '[out:json][timeout:18];(node["natural"="spring"]' + around + ';node["amenity"="drinking_water"]' + around + ';way["waterway"~"^(stream|brook)$"]' + around + ';way["waterway"="river"]' + around + ';way["natural"="water"]' + around + ';);out tags center;';
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
  function saveWater(apiary, hit) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !apiary || !hit || apiary.waterSourceConfirmedAt) return hit;
    var typeKey = waterTypeFromTags(hit.tags);
    var label = waterLabelFromTags(hit.tags, hit.lat, hit.lon);
    var item = null;
    try { if (D.addWaterCatalogItem) item = D.addWaterCatalogItem({ label: label, typeKey: typeKey, lat: hit.lat, lon: hit.lon, note: Math.round(hit.metres) + ' m' }); } catch (e) {}
    try {
      D.updateApiary(apiary.id, {
        waterSourceId: item && item.id ? item.id : apiary.waterSourceId,
        waterDistanceM: Math.round(hit.metres),
        waterSourceType: typeKey,
        waterSourceLabel: label
      });
    } catch (e2) {}
    return hit;
  }
  function saveForageCache(apiary, lat, lon, analysis) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !D.makeLiveCache || !apiary || !analysis) return;
    try { D.updateApiary(apiary.id, { forageCache: D.makeLiveCache(lat, lon, analysis) }); } catch (e) {}
  }
  function refreshOne(apiary, onStep) {
    var F = global.SuperAriForage;
    if (!apiary) return Promise.resolve(null);
    var lat = Number(apiary.lat), lon = Number(apiary.lon);
    if (!isFinite(lat) || !isFinite(lon)) return Promise.resolve(null);
    var radius = F && F.clampRadius ? F.clampRadius(apiary.forageRadiusKm || apiary.forageKm || 3) : 3;
    if (onStep) onStep({ message: 'Su kaynağı taranıyor', pct: 12 });
    return findNearestWater(lat, lon).then(function (hit) {
      if (hit) {
        saveWater(apiary, hit);
        if (onStep) onStep({ message: 'Su kaynağı bulundu · ' + Math.round(hit.metres) + ' m', pct: 45 });
      } else if (onStep) onStep({ message: 'Su kaynağı bulunamadı', pct: 45 });
      if (onStep) onStep({ message: 'Flora taranıyor', pct: 58 });
      var forageP = F && F.analyze ? F.analyze(lat, lon, radius).then(function (analysis) {
        if (analysis) {
          saveForageCache(apiary, lat, lon, analysis);
          if (onStep) onStep({ message: 'Flora bulundu', pct: 92 });
        } else if (onStep) onStep({ message: 'Flora bulunamadı', pct: 92 });
        return analysis;
      }).catch(function () { if (onStep) onStep({ message: 'Flora bulunamadı', pct: 92 }); return null; }) : Promise.resolve(null);
      return forageP.then(function (analysis) {
        var insight = interpretOne(apiary, hit, analysis);
        lastInsights = lastInsights.filter(function (x) { return x.name !== insight.name; }).concat([insight]);
        paintInsights();
        return { water: hit, forage: analysis, insight: insight };
      });
    });
  }
  function refreshAll() {
    if (running) return Promise.resolve({ skipped: true });
    running = true;
    logLines = [];
    lastInsights = [];
    var list = apiaries().filter(function (a) { return a && isFinite(Number(a.lat)) && isFinite(Number(a.lon)); });
    setBar(true, 3, 'Tarama', 'Su kaynağı taranıyor');
    var i = 0, ok = 0;
    function next() {
      if (i >= list.length) {
        setBar(true, 100, 'Tamam', 'Tarama bitti');
        running = false;
        return { total: list.length, ok: ok };
      }
      var a = list[i];
      var base = Math.round((i / Math.max(1, list.length)) * 100);
      return refreshOne(a, function (ev) {
        setBar(true, Math.min(99, base + Math.round(((ev && ev.pct) || 0) / Math.max(1, list.length))), 'Tarama', ev && ev.message);
      }).then(function (res) {
        if (res && (res.water || res.forage)) ok += 1;
        i += 1;
        return next();
      }).catch(function () { i += 1; return next(); });
    }
    return Promise.resolve().then(next).catch(function () { running = false; });
  }
  function refreshNew(apiary) {
    setBar(true, 8, 'Tarama', 'Su kaynağı taranıyor');
    return refreshOne(apiary, function (ev) {
      setBar(true, ev && ev.pct != null ? ev.pct : 30, 'Tarama', ev && ev.message);
    }).then(function (res) {
      var now = 'Tarama bitti';
      if (res && res.water && res.water.metres != null) now = 'Su kaynağı bulundu · ' + Math.round(res.water.metres) + ' m';
      setBar(true, 100, now, now);
      return res;
    });
  }
  function start() {
    ensureBar();
    setBar(true, 1, 'Tarama', 'Su kaynağı taranıyor');
    setTimeout(function () { refreshAll(); }, 300);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    document.addEventListener('superari:apiary-saved', function (ev) { refreshNew(ev && ev.detail); });
  }
  global.SuperAriLandcoverSync = { refreshAll: refreshAll, refreshOne: refreshOne, refreshNew: refreshNew, findNearestWater: findNearestWater, setBar: setBar };
})(window);
