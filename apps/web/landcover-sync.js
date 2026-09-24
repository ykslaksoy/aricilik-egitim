/**
 * SüperArı — tüm arılıklar için canlı örtü + en yakın su senkronu.
 * Su: ana dere şart değil. Sürekli (yıl boyu) en yakın temiz su yeter.
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

  function isSeasonal(tags) {
    tags = tags || {};
    return tags.intermittent === 'yes' || tags.seasonal === 'yes' || tags.waterway === 'drain' || tags.waterway === 'ditch';
  }

  function waterTypeFromTags(tags) {
    tags = tags || {};
    if (tags.natural === 'spring' || tags.amenity === 'drinking_water') return 'cesme';
    if (tags.natural === 'water' || tags.landuse === 'reservoir' || tags.water === 'pond' || tags.water === 'lake') return 'golet';
    if (isSeasonal(tags)) return 'mevsimlik_dere';
    if (tags.waterway === 'stream' || tags.waterway === 'brook') return 'dere';
    if (tags.waterway) return 'dere';
    return 'diger';
  }

  /* Düşük skor daha iyi. Ana nehir şişirilir; kaynak / küçük sürekli dere öne alınır. */
  function waterRank(tags, metres) {
    tags = tags || {};
    var score = metres;
    if (tags.natural === 'spring' || tags.amenity === 'drinking_water') score -= 80;
    else if (tags.waterway === 'stream' || tags.waterway === 'brook') score -= 40;
    else if (tags.water === 'pond' || tags.natural === 'water') score -= 10;
    else if (tags.waterway === 'river') score += 220;
    if (isSeasonal(tags)) score += 400;
    return score;
  }

  function waterLabelFromTags(tags, lat, lon) {
    tags = tags || {};
    if (tags.name) return String(tags.name);
    var t = waterTypeFromTags(tags);
    var map = { dere: 'Küçük dere', cesme: 'Kaynak', golet: 'Gölet', mevsimlik_dere: 'Mevsimlik dere', diger: 'Su' };
    return (map[t] || 'Su') + ' ' + Number(lat).toFixed(4) + ',' + Number(lon).toFixed(4);
  }

  function overpassQuery(lat, lon, radiusM) {
    var around = '(around:' + Math.round(radiusM) + ',' + lat + ',' + lon + ')';
    return (
      '[out:json][timeout:18];\n(' +
      'node["natural"="spring"]' + around + ';' +
      'node["amenity"="drinking_water"]' + around + ';' +
      'way["waterway"~"^(stream|brook)$"]' + around + ';' +
      'way["waterway"="river"]' + around + ';' +
      'way["natural"="water"]' + around + ';' +
      'node["natural"="water"]' + around + ';' +
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
    var bestPerm = null;
    var bestAny = null;
    (elements || []).forEach(function (e) {
      var c = e.center || {};
      var elat = c.lat != null ? c.lat : e.lat;
      var elon = c.lon != null ? c.lon : e.lon;
      if (!isFinite(Number(elat)) || !isFinite(Number(elon))) return;
      var tags = e.tags || {};
      var d = haversineM(lat, lon, Number(elat), Number(elon));
      var cand = {
        metres: d,
        lat: Number(elat),
        lon: Number(elon),
        tags: tags,
        rank: waterRank(tags, d),
        seasonal: isSeasonal(tags)
      };
      if (!bestAny || cand.rank < bestAny.rank) bestAny = cand;
      if (!cand.seasonal && (!bestPerm || cand.rank < bestPerm.rank)) bestPerm = cand;
    });
    return bestPerm || bestAny;
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
          if (hit && !hit.seasonal) return hit;
          if (hit && r === WATER_SCAN_M[WATER_SCAN_M.length - 1]) return hit;
          return next().then(function (later) {
            if (later && !later.seasonal) return later;
            if (later && hit) return later.rank < hit.rank ? later : hit;
            return later || hit;
          });
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
    var note =
      (hit.seasonal ? 'Mevsimlik · ' : 'Sürekli temiz su · ') +
      Math.round(hit.metres) +
      ' m · OSM otomatik';
    try {
      if (D.addWaterCatalogItem) {
        item = D.addWaterCatalogItem({
          label: label,
          typeKey: typeKey,
          lat: hit.lat,
          lon: hit.lon,
          note: note
        });
      }
    } catch (e) {}
    try {
      D.updateApiary(apiary.id, {
        waterSourceId: item && item.id ? item.id : apiary.waterSourceId,
        waterDistanceM: Math.round(hit.metres),
        waterSourceType: typeKey,
        waterSourceLabel: label,
        waterSourceNote: note
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
    if (onStep) onStep({ message: 'Sürekli temiz su aranıyor', pct: 15 });
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
    setBar(true, 2, 'Tüm arılıklar: örtü + sürekli su…');
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
        msg =
          (res.water.seasonal ? 'Mevsimlik su ' : 'Sürekli su ') +
          Math.round(res.water.metres) +
          ' m';
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
