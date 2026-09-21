/**
 * SüperArı — foraj radarı + yer analizi (ücretsiz kaynaklar + şeffaf tahmin).
 *
 * Data:
 *  - Open-Meteo Elevation API (gerçek rakım, ücretsiz)
 *  - Yakın 8 yön örneklemesi → eğim/yön tahmini
 *  - Heuristic habitat/nektar skoru (lat/lon + rakım) — "tahmin/demo" etiketi
 *
 * Not GIS land-cover: Overpass CORS/yavaş; bu sürümde heuristic proxy.
 */
(function (global) {
  var DEFAULT_RADIUS_KM = 3;
  var MIN_RADIUS_KM = 0.5;
  var MAX_RADIUS_KM = 10;
  var RADIUS_STEP_KM = 0.5;
  var AUTO_HINT_TR =
    'Otomatik foraj: yakın kovan yoğunluğu yüksekse daraltır; yerleşim/araç proxy (yol-kent tahmini, trafik API yok) yüksekse daraltır. Kaydırarak elle değiştirebilirsiniz (0,5–10 km).';
  var DIRS = [
    { key: 'N', label: 'kuzeye', bearing: 0 },
    { key: 'NE', label: 'kuzeydoğuya', bearing: 45 },
    { key: 'E', label: 'doğuya', bearing: 90 },
    { key: 'SE', label: 'güneydoğuya', bearing: 135 },
    { key: 'S', label: 'güneye', bearing: 180 },
    { key: 'SW', label: 'güneybatıya', bearing: 225 },
    { key: 'W', label: 'batıya', bearing: 270 },
    { key: 'NW', label: 'kuzeybatıya', bearing: 315 }
  ];

  function roundToStep(km, step) {
    step = step || RADIUS_STEP_KM;
    return Math.round(km / step) * step;
  }

  function clampRadius(km) {
    var n = Number(km);
    if (!isFinite(n)) return DEFAULT_RADIUS_KM;
    var stepped = roundToStep(n, RADIUS_STEP_KM);
    /* Avoid IEEE dust on 0.5 steps (e.g. 1.0000000002). */
    stepped = Math.round(stepped * 10) / 10;
    return Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, stepped));
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /**
   * Settlement / vehicle-density proxy 0..1 (no traffic API).
   * Mixes: deterministic local noise + proximity to known urban hubs in region.
   */
  function vehicleDensityProxy(lat, lon) {
    var hubs = [
      { lat: 39.904, lon: 41.268, w: 1 }, /* Erzurum merkez */
      { lat: 40.561, lon: 40.988, w: 0.55 }, /* Bayburt yönü */
      { lat: 39.748, lon: 39.491, w: 0.45 }, /* Erzincan yönü */
      { lat: 40.994, lon: 41.117, w: 0.4 } /* Artvin/Yusufeli corridor proxy */
    ];
    var hubScore = 0;
    for (var i = 0; i < hubs.length; i++) {
      var d = haversineKm(lat, lon, hubs[i].lat, hubs[i].lon);
      /* ~25 km falloff — closer to town ⇒ more roads/traffic proxy */
      var fall = Math.max(0, 1 - d / 25);
      hubScore += fall * hubs[i].w;
    }
    hubScore = Math.min(1, hubScore / 1.2);
    var local = 0.25 + hash01(lat, lon, 11) * 0.55; /* rural variegation */
    return Math.max(0, Math.min(1, hubScore * 0.7 + local * 0.3));
  }

  /**
   * Nearby hive competition from known apiaries (localStorage / demo).
   * Returns normalized 0..1 pressure.
   */
  function hiveDensityPressure(lat, lon, opts) {
    opts = opts || {};
    var apiaries = opts.apiaries || [];
    var excludeId = opts.excludeId != null ? String(opts.excludeId) : null;
    var ownHives = Math.max(0, Number(opts.ownHiveCount) || 0);
    var scanKm = 10;
    var nearbyHives = 0;
    var nearbySites = 0;
    for (var i = 0; i < apiaries.length; i++) {
      var a = apiaries[i];
      if (!a) continue;
      if (excludeId && String(a.id) === excludeId) continue;
      var alat = Number(a.lat);
      var alon = Number(a.lon);
      if (!isFinite(alat) || !isFinite(alon)) continue;
      var d = haversineKm(lat, lon, alat, alon);
      if (d > scanKm) continue;
      nearbySites += 1;
      /* Closer sites weigh more (inverse distance, floor 0.5 km). */
      var w = 1 / Math.max(0.5, d);
      nearbyHives += Math.max(0, Number(a.hiveCount) || 0) * w;
    }
    /* Own yard competes fully for local forage (same pin / this arılık). */
    nearbyHives += ownHives * 1.0;
    /* ~60 weighted hives ⇒ full pressure. */
    var pressure = nearbyHives / 60;
    if (nearbySites >= 2) pressure += 0.1;
    if (nearbySites >= 4) pressure += 0.1;
    return Math.max(0, Math.min(1, pressure));
  }

  /**
   * Auto forage radius from hive + vehicle proxies. Steps of 0.5 km, [0.5, 10].
   * Mid density → ~2–4 km; high competition/traffic → smaller; sparse rural → larger.
   */
  function recommendRadiusKm(lat, lon, opts) {
    lat = Number(lat);
    lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      return { km: DEFAULT_RADIUS_KM, hivePressure: 0, vehicleProxy: 0, hint: AUTO_HINT_TR };
    }
    opts = opts || {};
    var hiveP = hiveDensityPressure(lat, lon, opts);
    var vehP = vehicleDensityProxy(lat, lon);
    /* Start ~7 km; hive + settlement/vehicle proxies pull toward min.
       Mid density → ~2–4 km; sparse rural can approach 10 km. */
    var raw = 7 - hiveP * 5 - vehP * 3;
    if (hiveP > 0.8) raw -= 0.6;
    if (hiveP < 0.15 && vehP < 0.28) raw += 2.2;
    var km = clampRadius(raw);
    return {
      km: km,
      hivePressure: Math.round(hiveP * 100) / 100,
      vehicleProxy: Math.round(vehP * 100) / 100,
      hint: AUTO_HINT_TR
    };
  }

  function destination(lat, lon, bearingDeg, distKm) {
    var R = 6371;
    var br = (bearingDeg * Math.PI) / 180;
    var φ1 = (lat * Math.PI) / 180;
    var λ1 = (lon * Math.PI) / 180;
    var δ = distKm / R;
    var φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(br)
    );
    var λ2 =
      λ1 +
      Math.atan2(
        Math.sin(br) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );
    return {
      lat: (φ2 * 180) / Math.PI,
      lon: (((λ2 * 180) / Math.PI + 540) % 360) - 180
    };
  }

  function fetchElevations(points) {
    if (!points || !points.length) return Promise.resolve([]);
    var lats = points.map(function (p) { return p.lat; }).join(',');
    var lons = points.map(function (p) { return p.lon; }).join(',');
    var url =
      'https://api.open-meteo.com/v1/elevation?latitude=' +
      encodeURIComponent(lats) +
      '&longitude=' +
      encodeURIComponent(lons);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('elev_' + r.status);
        return r.json();
      })
      .then(function (j) {
        var elev = (j && j.elevation) || [];
        return points.map(function (p, i) {
          var e = Number(elev[i]);
          return {
            lat: p.lat,
            lon: p.lon,
            elev: isFinite(e) ? e : null,
            tag: p.tag || null
          };
        });
      });
  }

  /** Deterministic 0..1 noise from lat/lon (stable per spot). */
  function hash01(lat, lon, salt) {
    var x = Math.sin(lat * 12.9898 + lon * 78.233 + (salt || 0) * 37.719) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Heuristic forage suitability 0–100 for Erzurum/Doğu Anadolu–like ranges.
   * Uses real elevation when present; habitat mix is estimate.
   */
  function scoreSpot(lat, lon, elevM, radiusKm) {
    var elev = elevM != null && isFinite(elevM) ? elevM : 1500 + hash01(lat, lon, 1) * 800;
    /* Sweet band ~1200–2200 m for yayla flora in region */
    var elevScore;
    if (elev < 800) elevScore = 35;
    else if (elev < 1200) elevScore = 55 + (elev - 800) / 400 * 15;
    else if (elev <= 2200) elevScore = 85 - Math.abs(elev - 1700) / 500 * 12;
    else if (elev <= 2800) elevScore = 70 - (elev - 2200) / 600 * 25;
    else elevScore = 35;

    var floraProxy = 40 + hash01(lat, lon, 2) * 45; /* demo land-cover proxy */
    var waterProxy = 30 + hash01(lat, lon, 3) * 50;
    var windExposure = 20 + hash01(lat, lon, 4) * 60; /* higher = more exposed (worse) */
    var radiusFactor = 0.85 + (clampRadius(radiusKm) - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM) * 0.2;

    var raw =
      elevScore * 0.38 +
      floraProxy * 0.32 +
      waterProxy * 0.18 +
      (100 - windExposure) * 0.12;
    var score = Math.round(Math.max(18, Math.min(96, raw * radiusFactor)));

    var habitat;
    if (floraProxy > 70) habitat = 'Çayır / yayla otlak ağırlıklı (tahmin)';
    else if (floraProxy > 45) habitat = 'Karışık tarım–otlak (tahmin)';
    else habitat = 'Seyrek örtü / taşlık eğilim (tahmin)';

    return {
      score: score,
      elevM: Math.round(elev),
      elevSource: elevM != null && isFinite(elevM) ? 'open-meteo' : 'estimate',
      habitat: habitat,
      floraProxy: Math.round(floraProxy),
      waterProxy: Math.round(waterProxy),
      windExposure: Math.round(windExposure),
      radiusKm: clampRadius(radiusKm)
    };
  }

  function gradeLabel(score) {
    if (score >= 80) return { tr: 'Çok uygun', tone: 'good' };
    if (score >= 65) return { tr: 'Uygun', tone: 'ok' };
    if (score >= 45) return { tr: 'Orta', tone: 'mid' };
    return { tr: 'Zayıf', tone: 'bad' };
  }

  function analyze(lat, lon, radiusKm) {
    lat = Number(lat);
    lon = Number(lon);
    radiusKm = clampRadius(radiusKm);
    if (!isFinite(lat) || !isFinite(lon)) {
      return Promise.reject(new Error('invalid_coords'));
    }

    var sampleDist = Math.min(4, Math.max(0.35, radiusKm * 0.55));
    var points = [{ lat: lat, lon: lon, tag: 'center' }];
    DIRS.forEach(function (d) {
      var p = destination(lat, lon, d.bearing, sampleDist);
      points.push({ lat: p.lat, lon: p.lon, tag: d.key });
    });

    return fetchElevations(points)
      .catch(function () {
        return points.map(function (p) {
          return { lat: p.lat, lon: p.lon, elev: null, tag: p.tag };
        });
      })
      .then(function (rows) {
        var center = rows[0] || { elev: null };
        var here = scoreSpot(lat, lon, center.elev, radiusKm);

        var best = null;
        for (var i = 0; i < DIRS.length; i++) {
          var d = DIRS[i];
          var row = rows[i + 1] || {};
          var sc = scoreSpot(row.lat != null ? row.lat : lat, row.lon != null ? row.lon : lon, row.elev, radiusKm);
          if (!best || sc.score > best.score) {
            best = {
              dir: d,
              score: sc.score,
              elevM: sc.elevM,
              lat: row.lat,
              lon: row.lon,
              distKm: sampleDist
            };
          }
        }

        var tip = null;
        if (best && best.score >= here.score + 8) {
          var gain = Math.round(((best.score - here.score) / Math.max(here.score, 1)) * 100);
          gain = Math.max(10, Math.min(55, gain));
          tip = {
            text:
              'Pin’i ~' +
              best.distKm.toFixed(1).replace('.0', '') +
              ' km ' +
              best.dir.label +
              ' kaydırırsan verim tahminen ~%' +
              gain +
              ' artabilir (model tahmini).',
            dirKey: best.dir.key,
            gainPct: gain,
            targetLat: best.lat,
            targetLon: best.lon
          };
        } else {
          tip = {
            text: 'Bu nokta çevresindeki örneklemeye göre görece dengeli; büyük kaydırma şart değil (tahmin).',
            dirKey: null,
            gainPct: 0
          };
        }

        var slopeNote = null;
        var elevs = rows
          .map(function (r) { return r.elev; })
          .filter(function (e) { return e != null && isFinite(e); });
        if (elevs.length >= 3) {
          var minE = Math.min.apply(null, elevs);
          var maxE = Math.max.apply(null, elevs);
          var delta = maxE - minE;
          if (delta > 180) slopeNote = 'Çevrede belirgin rakım farkı (~' + Math.round(delta) + ' m) — rüzgâr/soğuk hava akışı riski (ölçüm).';
          else if (delta > 80) slopeNote = 'Hafif engebeli arazi (~' + Math.round(delta) + ' m fark) (ölçüm).';
          else slopeNote = 'Yakın çevrede rakım görece düzgün (ölçüm).';
        }

        var insights = [
          {
            k: 'Rakım',
            v: here.elevM + ' m',
            note: here.elevSource === 'open-meteo' ? 'Open-Meteo' : 'tahmin'
          },
          {
            k: 'Foraj yarıçapı',
            v: here.radiusKm + ' km',
            note: 'arılar bu çapta geziyor'
          },
          {
            k: 'Uygunluk',
            v: here.score + '/100 · ' + gradeLabel(here.score).tr,
            note: 'tahmin'
          },
          {
            k: 'Örtü proxy',
            v: here.habitat,
            note: 'demo'
          }
        ];
        if (slopeNote) {
          insights.push({ k: 'Arazi', v: slopeNote, note: 'ölçüm/yorum' });
        }

        return {
          lat: lat,
          lon: lon,
          radiusKm: here.radiusKm,
          score: here.score,
          grade: gradeLabel(here.score),
          elevM: here.elevM,
          elevSource: here.elevSource,
          habitat: here.habitat,
          insights: insights,
          tip: tip,
          disclaimer:
            'Yer analizi kısmen gerçek rakım (Open-Meteo), kısmen model tahmini/demo. Arazi örtüsü uydu sınıflandırması değildir.',
          demo: true
        };
      });
  }

  /** Leaflet circle helper — call with L and map instance. (Arılık sayfaları Yandex için SuperAriYandexMap.attachRadar kullanır; bu API paralel iş için korunur.) */
  function attachRadar(L, map, opts) {
    opts = opts || {};
    var radiusKm = clampRadius(opts.radiusKm != null ? opts.radiusKm : DEFAULT_RADIUS_KM);
    var circle = null;
    var label = null;

    function meters() {
      return radiusKm * 1000;
    }

    function ensure(latlng) {
      if (!map || !L || !latlng) return;
      if (!circle) {
        circle = L.circle(latlng, {
          radius: meters(),
          color: '#c9a227',
          weight: 2,
          opacity: 0.85,
          fillColor: '#f0c43a',
          fillOpacity: 0.14,
          interactive: false
        }).addTo(map);
      } else {
        circle.setLatLng(latlng);
        circle.setRadius(meters());
      }
    }

    function setCenter(lat, lon) {
      if (!isFinite(lat) || !isFinite(lon)) return;
      ensure(L.latLng(lat, lon));
    }

    function setRadiusKm(km) {
      radiusKm = clampRadius(km);
      if (circle) circle.setRadius(meters());
      return radiusKm;
    }

    function clear() {
      if (circle && map) map.removeLayer(circle);
      circle = null;
      label = null;
    }

    return {
      setCenter: setCenter,
      setRadiusKm: setRadiusKm,
      getRadiusKm: function () { return radiusKm; },
      clear: clear,
      DEFAULT_RADIUS_KM: DEFAULT_RADIUS_KM
    };
  }

  function renderPanelHtml(analysis, escapeHtml) {
    escapeHtml =
      escapeHtml ||
      function (s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    if (!analysis) {
      return (
        '<div class="forage-panel is-empty">' +
          '<p>Pin koyunca foraj çemberi ve yer analizi burada görünür.</p>' +
        '</div>'
      );
    }
    var rows = (analysis.insights || [])
      .map(function (ins) {
        return (
          '<div class="forage-row">' +
            '<div class="forage-k">' +
              escapeHtml(ins.k) +
              (ins.note ? ' <span class="forage-tag">' + escapeHtml(ins.note) + '</span>' : '') +
            '</div>' +
            '<div class="forage-v">' + escapeHtml(ins.v) + '</div>' +
          '</div>'
        );
      })
      .join('');
    var tip = analysis.tip
      ? '<p class="forage-tip">' + escapeHtml(analysis.tip.text) + '</p>'
      : '';
    return (
      '<div class="forage-panel" data-score="' +
      analysis.score +
      '">' +
      '<div class="forage-head">' +
        '<strong>Foraj &amp; yer analizi</strong>' +
        '<span class="forage-score tone-' +
        escapeHtml(analysis.grade.tone) +
        '">' +
        analysis.score +
        ' · ' +
        escapeHtml(analysis.grade.tr) +
        '</span>' +
      '</div>' +
      '<p class="forage-sub">Arılar ~' +
      analysis.radiusKm +
      ' km çapta geziyor (foraj çemberi).</p>' +
      '<div class="forage-grid">' +
      rows +
      '</div>' +
      tip +
      '<p class="forage-disc">' +
      escapeHtml(analysis.disclaimer) +
      '</p>' +
      '</div>'
    );
  }

  var css = [
    '.forage-panel{margin-top:10px;padding:12px;border-radius:14px;background:#fffaf0;border:1px solid #e0c56a;}',
    '.forage-panel.is-empty{color:#6b635a;font-size:12px;font-weight:600;}',
    '.forage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}',
    '.forage-head strong{font-size:13px;color:#2c241c;}',
    '.forage-score{font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid #e0c56a;color:#4a2f1a;white-space:nowrap;}',
    '.forage-score.tone-good{border-color:#9bb87a;color:#3d5a2a;}',
    '.forage-score.tone-ok{border-color:#e0c56a;}',
    '.forage-score.tone-mid{border-color:#d4a574;color:#6a4220;}',
    '.forage-score.tone-bad{border-color:#e0a090;color:#8a2e1c;}',
    '.forage-sub{font-size:11px;color:#6b635a;font-weight:600;margin:0 0 8px;}',
    '.forage-grid{display:grid;gap:6px;}',
    '.forage-row{display:grid;gap:2px;}',
    '.forage-k{font-size:11px;font-weight:700;color:#6b635a;}',
    '.forage-tag{font-weight:600;opacity:.75;}',
    '.forage-v{font-size:12px;font-weight:700;color:#2c241c;line-height:1.35;}',
    '.forage-tip{margin:10px 0 0;padding:10px 11px;border-radius:12px;background:#fff;border:1px dashed #c9a227;font-size:12px;font-weight:700;color:#4a2f1a;line-height:1.4;}',
    '.forage-disc{margin:8px 0 0;font-size:10px;color:#8a8278;line-height:1.35;font-weight:560;}',
    '.forage-radius{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin:8px 0 0;}',
    '.forage-radius label{font-size:11px;font-weight:700;color:#6b635a;}',
    '.forage-radius input[type=range]{width:100%;}',
    '.forage-radius .val{font-size:11px;font-weight:800;color:#4a2f1a;font-variant-numeric:tabular-nums;}',
    '.forage-auto-hint{margin:4px 0 0;font-size:10px;color:#8a8278;line-height:1.35;font-weight:560;}'
  ].join('');

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('forage-analysis-css')) return;
    var s = document.createElement('style');
    s.id = 'forage-analysis-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  injectStyles();

  global.SuperAriForage = {
    DEFAULT_RADIUS_KM: DEFAULT_RADIUS_KM,
    MIN_RADIUS_KM: MIN_RADIUS_KM,
    MAX_RADIUS_KM: MAX_RADIUS_KM,
    RADIUS_STEP_KM: RADIUS_STEP_KM,
    AUTO_HINT_TR: AUTO_HINT_TR,
    clampRadius: clampRadius,
    recommendRadiusKm: recommendRadiusKm,
    hiveDensityPressure: hiveDensityPressure,
    vehicleDensityProxy: vehicleDensityProxy,
    analyze: analyze,
    attachRadar: attachRadar,
    renderPanelHtml: renderPanelHtml,
    destination: destination,
    haversineKm: haversineKm
  };
})(window);
