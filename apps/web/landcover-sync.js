/**
 * SüperArı — tüm arılıklar için canlı örtü + en yakın su senkronu.
 * Yeni arılık kaydında otomatik çeker; yüzde çubuğu gösterir.
 */
(function (global) {
  var BAR_ID = 'landcoverSyncBar';
  var OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  var WATER_SCAN_M = [300, 800, 1500];

  function apiaries() {
    var D = global.D || global.SuperAriDemo;
    if (!D) return [];
    try {
      if (typeof D.loadApiaries === 'function') return D.loadApiaries() || [];
      if (D.apiaries) return D.apiaries || [];
      return [];
    } catch (e) {
      return [];
    }
  }

  function haversineM(lat1, lon1, lat2, lon2) {
    var D = global.D || global.SuperAriDemo;
    if (D && D.haversineMetres) return D.haversineMetres(lat1, lon1, lat2, lon2);
    var R = 6371000;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
  }

  function ensureBar() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById(BAR_ID);
    if (el) return el;
    var host =
      document.getElementById('forageHost') ||
      document.getElementById('apiaryList') ||
      document.querySelector('.screen');
    if (!host) return null;
    el = document.createElement('div');
    el.id = BAR_ID;
    el.className = 'forage-progress';
    el.hidden = true;
    el.innerHTML =
      '<div class="forage-progress-label"><span data-lc-msg>Örtü / su güncelleniyor</span><span data-lc-pct>0%</span></div>' +
      '<div class="forage-progress-track"><div class="forage-progress-bar" data-lc-bar></div></div>';
    host.parentNode.insertBefore(el, host);
    return el;
  }

  function setBar(visible, pct, msg) {
    var el = ensureBar();
    if (!el) return;
    el.hidden = !visible;
    var p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    var bar = el.querySelector('[data-lc-bar]');
    var lab = el.querySelector('[data-lc-pct]');
    var m = el.querySelector('[data-lc-msg]');
    if (bar) bar.style.width = p + '%';
    if (lab) lab.textContent = p + '%';
    if (m && msg) m.textContent = msg;
  }

  function waterTypeFromTags(tags) {
    tags = tags || {};
    if (tags.natural === 'spring' || tags.amenity === 'drinking_water') return 'cesme';
    if (tags.natural === 'water' || tags.landuse === 'reservoir' || tags.water === 'lake' || tags.water === 'pond') return 'golet';
    if (tags.intermittent === 'yes' || tags.waterway === 'drain' || tags.waterway === 'ditch') return 'mevsimlik_dere';
    if (tags.waterway) return 'dere';
    return 'diger';
  }

  function waterLabelFromTags(tags, lat, lon) {
    tags = tags || {};
    if (tags.name) return String(tags.name);
    var t = waterTypeFromTags(tags);
    var map = { dere: 'Dere', cesme: 'Kaynak', golet: 'Gölet', mevsimlik_dere: 'Mevsimlik dere', diger: 'Su' };
    return (map[t] || 'Su') + ' ' + Number(lat).toFixed(4) + ',' + Number(lon).toFixed(4);
  }

  function overpassQuery(lat, lon, radiusM) {
    var around = '(around:' + Math.round(radiusM) + ',' + lat + ',' + lon + ')';
    return (
      '[out:json][timeout:18];\n(' +
      'way["waterway"]' + around + ';' +
      'way["natural"="water"]' + around + ';' +
      'node["natural"="spring"]' + around + ';' +
      'node["amenity"="drinking_water"]' + around + ';' +
      ');\nout tags center;'
    );
  }

  function fetchOverpass(query) {
    function attempt(i) {
      if (i >= OVERPASS.length) return Promise.reject(new Error('overpass_fail'));
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer =
        ctrl &&
        setTimeout(function () {
          try { ctrl.abort(); } catch (e) {}
        }, 16000);
      return fetch(OVERPASS[i], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) {
          if (timer) clearTimeout(timer);
          if (!r.ok) throw new Error('http_' + r.status);
          return r.json();
        })
        .catch(function () {
          if (timer) clearTimeout(timer);
          return attempt(i + 1);
        });
    }
    return attempt(0);
  }

  function nearestFromElements(lat, lon, elements) {
    var best = null;
    (elements || []).forEach(function (e) {
      var c = e.center || {};
      var elat = c.lat != null ? c.lat : e.lat;
      var elon = c.lon != null ? c.lon : e.lon;
      if (!isFinite(Number(elat)) || !isFinite(Number(elon))) return;
      var d = haversineM(lat, lon, Number(elat), Number(elon));
      if (!best || d < best.metres) {
        best = {
          metres: d,
          lat: Number(elat),
          lon: Number(elon),
          tags: e.tags || {}
        };
      }
    });
    return best;
  }

  function findNearestWater(lat, lon) {
    var i = 0;
    function next() {
      if (i >= WATER_SCAN_M.length) return Promise.resolve(null);
      var r = WATER_SCAN_M[i];
      i += 1;
      return fetchOverpass(overpassQuery(lat, lon, r))
        .then(function (j) {
          var hit = nearestFromElements(lat, lon, (j && j.elements) || []);
          if (hit) return hit;
          return next();
        })
        .catch(function () {
          return next();
        });
    }
    return next();
  }

  function saveWater(apiary, hit) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !apiary || !hit) return hit;
    if (apiary.waterSourceConfirmedAt) return hit;
    var typeKey = waterTypeFromTags(hit.tags);
    var label = waterLabelFromTags(hit.tags, hit.lat, hit.lon);
    var item = null;
    try {
      if (D.addWaterCatalogItem) {
        item = D.addWaterCatalogItem({
          label: label,
          typeKey: typeKey,
          lat: hit.lat,
          lon: hit.lon,
          note: 'OSM otomatik · ' + hit.metres + ' m'
        });
      }
    } catch (e) {}
    try {
      D.updateApiary(apiary.id, {
        waterSourceId: item && item.id ? item.id : apiary.waterSourceId,
        waterDistanceM: Math.round(hit.metres),
        waterSourceType: typeKey,
        waterSourceLabel: label,
        waterSourceNote: 'OSM otomatik · ' + Math.round(hit.metres) + ' m'
      });
    } catch (e2) {}
    return hit;
  }

  function saveForageCache(apiary, lat, lon, analysis) {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.updateApiary || !D.makeLiveCache || !apiary || !analysis) return;
    try {
      D.updateApiary(apiary.id, {
        forageCache: D.makeLiveCache(lat, lon, analysis)
      });
    } catch (e) {}
  }

  function refreshOne(apiary, onStep) {
    var F = global.SuperAriForage;
    if (!apiary) return Promise.resolve(null);
    var lat = Number(apiary.lat);
    var lon = Number(apiary.lon);
    if (!isFinite(lat) || !isFinite(lon)) return Promise.resolve(null);
    var radius =
      F && F.clampRadius ? F.clampRadius(apiary.forageRadiusKm || apiary.forageKm || 3) : 3;
    if (onStep) onStep({ message: 'En yakın su ölçülüyor', pct: 15 });
    var waterP = findNearestWater(lat, lon).then(function (hit) {
      if (hit) saveWater(apiary, hit);
      return hit;
    }).catch(function () { return null; });
    var forageP =
      F && F.analyze
        ? F.analyze(lat, lon, radius, {
            onProgress: function (ev) {
              if (onStep) onStep(ev);
            }
          }).then(function (analysis) {
            if (analysis) saveForageCache(apiary, lat, lon, analysis);
            return analysis;
          }).catch(function () { return null; })
        : Promise.resolve(null);
    return Promise.all([waterP, forageP]).then(function (pack) {
      return { water: pack[0], forage: pack[1] };
    });
  }

  function refreshAll() {
    var list = apiaries().filter(function (a) {
      return a && isFinite(Number(a.lat)) && isFinite(Number(a.lon));
    });
    if (!list.length) {
      setBar(false, 0, '');
      return Promise.resolve({ total: 0, ok: 0 });
    }
    setBar(true, 2, 'Tüm arılıklar: örtü + su…');
    var i = 0;
    var ok = 0;
    function next() {
      if (i >= list.length) {
        setBar(true, 100, 'Güncelleme tamam (' + ok + '/' + list.length + ')');
        setTimeout(function () { setBar(false, 100, ''); }, 1800);
        return { total: list.length, ok: ok };
      }
      var a = list[i];
      var base = Math.round((i / list.length) * 100);
      setBar(true, base, (a.etiket || a.name || 'Arılık') + ' (' + (i + 1) + '/' + list.length + ')');
      return refreshOne(a, function (ev) {
        var slice = Math.round(((ev && ev.pct) || 0) / list.length);
        setBar(
          true,
          Math.min(99, base + slice),
          ev && ev.message ? (a.etiket || a.name || 'Arılık') + ' · ' + ev.message : null
        );
      })
        .then(function (res) {
          if (res && (res.water || res.forage)) ok += 1;
        })
        .catch(function () {})
        .then(function () {
          i += 1;
          return next();
        });
    }
    return Promise.resolve().then(next);
  }

  function refreshNew(apiary) {
    if (!apiary) return Promise.resolve(null);
    setBar(true, 8, (apiary.etiket || apiary.name || 'Yeni arılık') + ' örtü + su…');
    return refreshOne(apiary, function (ev) {
      setBar(true, ev && ev.pct != null ? ev.pct : 30, ev && ev.message);
    }).then(function (res) {
      var msg = 'Kayıt güncellendi';
      if (res && res.water && res.water.metres != null) {
        msg = 'En yakın su ' + Math.round(res.water.metres) + ' m';
      }
      setBar(true, 100, msg);
      setTimeout(function () { setBar(false, 100, ''); }, 1600);
      return res;
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureBar();
      var page = (location.pathname || '').split('/').pop();
      if (page === 'ariliklar.html' || page === 'arilik.html') {
        setTimeout(function () { refreshAll(); }, 600);
      }
    });
    document.addEventListener('superari:apiary-saved', function (ev) {
      refreshNew(ev && ev.detail);
    });
  }

  global.SuperAriLandcoverSync = {
    refreshAll: refreshAll,
    refreshOne: refreshOne,
    refreshNew: refreshNew,
    findNearestWater: findNearestWater,
    setBar: setBar
  };
})(window);
