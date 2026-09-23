/**
 * SüperArı — foraj radarı + yer analizi (Open-Meteo ölçümleri).
 *
 * Data (ücretsiz, anahtarsız):
 *  - Open-Meteo Elevation API — merkez + 8 yön gerçek rakım
 *  - Open-Meteo Archive — bal mevsimi (Mayıs–Eylül) ortalama sıcaklık + yağış toplamı
 *    + bağıl nem + ET0 (su/nem / kuraklık yorumu)
 *
 * Skor yalnızca ölçülebilir faktörler: rakım bandı, sezon yağış, sezon sıcaklık, yerel eğim.
 * Su/nem paneli ölçülen nem + yağış/ET0 dengesinden; sahte floraProxy / verim % yok.
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

  /* Transparent weights — must sum to 1 when climate present. */
  var W_ELEV = 0.35;
  var W_PRECIP = 0.25;
  var W_TEMP = 0.25;
  var W_RELIEF = 0.15;

  function roundToStep(km, step) {
    step = step || RADIUS_STEP_KM;
    return Math.round(km / step) * step;
  }

  function clampRadius(km) {
    var n = Number(km);
    if (!isFinite(n)) return DEFAULT_RADIUS_KM;
    var stepped = roundToStep(n, RADIUS_STEP_KM);
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

  /** Deterministic 0..1 noise — only for vehicle/settlement radius proxy, not forage score. */
  function hash01(lat, lon, salt) {
    var x = Math.sin(lat * 12.9898 + lon * 78.233 + (salt || 0) * 37.719) * 43758.5453;
    return x - Math.floor(x);
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
      var fall = Math.max(0, 1 - d / 25);
      hubScore += fall * hubs[i].w;
    }
    hubScore = Math.min(1, hubScore / 1.2);
    var local = 0.25 + hash01(lat, lon, 11) * 0.55;
    return Math.max(0, Math.min(1, hubScore * 0.7 + local * 0.3));
  }

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
      var w = 1 / Math.max(0.5, d);
      nearbyHives += Math.max(0, Number(a.hiveCount) || 0) * w;
    }
    nearbyHives += ownHives * 1.0;
    var pressure = nearbyHives / 60;
    if (nearbySites >= 2) pressure += 0.1;
    if (nearbySites >= 4) pressure += 0.1;
    return Math.max(0, Math.min(1, pressure));
  }

  function recommendRadiusKm(lat, lon, opts) {
    lat = Number(lat);
    lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      return { km: DEFAULT_RADIUS_KM, hivePressure: 0, vehicleProxy: 0, hint: AUTO_HINT_TR };
    }
    opts = opts || {};
    var hiveP = hiveDensityPressure(lat, lon, opts);
    var vehP = vehicleDensityProxy(lat, lon);
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

  /** Last completed bal season (May–Sep). If Oct+, current year; else previous. */
  function balSeasonWindow() {
    var now = new Date();
    var y = now.getUTCFullYear();
    var m = now.getUTCMonth() + 1;
    var seasonYear = m >= 10 ? y : y - 1;
    return {
      year: seasonYear,
      start: seasonYear + '-05-01',
      end: seasonYear + '-09-30',
      label: 'May–Eyl ' + seasonYear
    };
  }

  function mean(arr) {
    if (!arr || !arr.length) return null;
    var s = 0;
    var n = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = Number(arr[i]);
      if (!isFinite(v)) continue;
      s += v;
      n += 1;
    }
    return n ? s / n : null;
  }

  function sum(arr) {
    if (!arr || !arr.length) return null;
    var s = 0;
    var n = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = Number(arr[i]);
      if (!isFinite(v)) continue;
      s += v;
      n += 1;
    }
    return n ? s : null;
  }

  function precipDays(arr, thresh) {
    thresh = thresh != null ? thresh : 0.1;
    if (!arr || !arr.length) return null;
    var c = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = Number(arr[i]);
      if (isFinite(v) && v > thresh) c += 1;
    }
    return c;
  }

  function climateFromDaily(daily) {
    if (!daily) return null;
    var meanT = mean(daily.temperature_2m_mean);
    var precipSum = sum(daily.precipitation_sum);
    if (meanT == null || precipSum == null) return null;
    var meanRh = mean(daily.relative_humidity_2m_mean);
    var et0Sum = sum(daily.et0_fao_evapotranspiration);
    return {
      meanTempC: Math.round(meanT * 10) / 10,
      precipSumMm: Math.round(precipSum * 10) / 10,
      precipDays: precipDays(daily.precipitation_sum),
      meanRhPct: meanRh != null ? Math.round(meanRh * 10) / 10 : null,
      et0SumMm: et0Sum != null ? Math.round(et0Sum * 10) / 10 : null
    };
  }

  /**
   * Open-Meteo Archive for each sample point (batch).
   * Returns array aligned with points, or null entries on partial failure.
   */
  function fetchClimateArchive(points, season) {
    if (!points || !points.length) return Promise.resolve([]);
    var lats = points.map(function (p) { return p.lat; }).join(',');
    var lons = points.map(function (p) { return p.lon; }).join(',');
    var url =
      'https://archive-api.open-meteo.com/v1/archive?latitude=' +
      encodeURIComponent(lats) +
      '&longitude=' +
      encodeURIComponent(lons) +
      '&start_date=' +
      encodeURIComponent(season.start) +
      '&end_date=' +
      encodeURIComponent(season.end) +
      '&daily=temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean,et0_fao_evapotranspiration&timezone=auto';
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('archive_' + r.status);
        return r.json();
      })
      .then(function (j) {
        var rows = Array.isArray(j) ? j : [j];
        return points.map(function (p, i) {
          var row = rows[i] || rows[0];
          var clim = climateFromDaily(row && row.daily);
          return clim
            ? {
                lat: p.lat,
                lon: p.lon,
                tag: p.tag || null,
                meanTempC: clim.meanTempC,
                precipSumMm: clim.precipSumMm,
                precipDays: clim.precipDays,
                meanRhPct: clim.meanRhPct,
                et0SumMm: clim.et0SumMm,
                seasonLabel: season.label
              }
            : null;
        });
      });
  }

  /** Highland / yayla elev band suitability 0–100 from measured elev (m). */
  function elevBandScore(elev) {
    if (elev < 800) return 35;
    if (elev < 1200) return 55 + ((elev - 800) / 400) * 15;
    if (elev <= 2200) return 85 - (Math.abs(elev - 1700) / 500) * 12;
    if (elev <= 2800) return 70 - ((elev - 2200) / 600) * 25;
    return 35;
  }

  /** Bal-season precip suitability (mm sum May–Sep). Ideal ~120–350 mm highland. */
  function precipScore(mm) {
    if (mm == null || !isFinite(mm)) return null;
    if (mm < 40) return 25;
    if (mm < 120) return 25 + ((mm - 40) / 80) * 40;
    if (mm <= 350) return 80 - (Math.abs(mm - 220) / 130) * 12;
    if (mm <= 550) return 68 - ((mm - 350) / 200) * 25;
    return 35;
  }


  /**
   * Su / nem yorumu — Open-Meteo bağıl nem + yağış/ET0 dengesi.
   * Skora dahil değil; panelde ayrı Satır/insight.
   */
  function waterAnalysis(climate) {
    if (!climate) return null;
    var rh = climate.meanRhPct;
    var precip = climate.precipSumMm;
    var et0 = climate.et0SumMm;
    var precipDaysN = climate.precipDays;
    var balance = precip != null && et0 != null ? Math.round((precip - et0) * 10) / 10 : null;
    var ratio = precip != null && et0 != null && et0 > 0 ? precip / et0 : null;

    var rhNote = null;
    if (rh != null && isFinite(rh)) {
      if (rh < 40) rhNote = 'kuru hava — arılar daha çok su arar';
      else if (rh < 55) rhNote = 'orta-düşük nem';
      else if (rh <= 75) rhNote = 'arıcılık için dengeli nem';
      else rhNote = 'yüksek nem — küf/fermantasyon riski artabilir';
    }

    var droughtTone = 'mid';
    var droughtLabel = 'Bilinmiyor';
    var droughtNote = 'ET0/yağış eksik';
    if (ratio != null && isFinite(ratio)) {
      if (ratio < 0.35) {
        droughtTone = 'bad';
        droughtLabel = 'Yüksek kuraklık riski';
        droughtNote = 'yağış ≪ buharlaşma — flora ve arı suyu sıkışabilir';
      } else if (ratio < 0.7) {
        droughtTone = 'mid';
        droughtLabel = 'Orta su stresi';
        droughtNote = 'yağış buharlaşmanın altında — su kaynağı önemli';
      } else if (ratio <= 1.2) {
        droughtTone = 'ok';
        droughtLabel = 'Dengeli su';
        droughtNote = 'yağış ≈ ET0 — su mevcudiyeti makul';
      } else {
        droughtTone = 'good';
        droughtLabel = 'Bol nem / su';
        droughtNote = 'yağış > buharlaşma — kuraklık düşük';
      }
    }

    var summaryParts = [];
    if (rhNote) summaryParts.push(rhNote);
    if (droughtNote && droughtLabel !== 'Bilinmiyor') summaryParts.push(droughtLabel + ': ' + droughtNote);
    var summary = summaryParts.length
      ? summaryParts.join(' · ')
      : 'Su/nem ölçümü kısmi — yalnızca mevcut alanlar gösteriliyor.';

    return {
      meanRhPct: rh != null && isFinite(rh) ? rh : null,
      et0SumMm: et0 != null && isFinite(et0) ? et0 : null,
      waterBalanceMm: balance,
      precipEt0Ratio: ratio != null && isFinite(ratio) ? Math.round(ratio * 100) / 100 : null,
      precipDays: precipDaysN != null ? precipDaysN : null,
      rhNote: rhNote,
      droughtTone: droughtTone,
      droughtLabel: droughtLabel,
      droughtNote: droughtNote,
      summary: summary
    };
  }

  /** Season mean temp suitability (°C). Ideal ~14–20 °C for highland bees. */
  function tempScore(c) {
    if (c == null || !isFinite(c)) return null;
    if (c < 6) return 20;
    if (c < 12) return 20 + ((c - 6) / 6) * 40;
    if (c <= 20) return 85 - (Math.abs(c - 16) / 4) * 10;
    if (c <= 26) return 70 - ((c - 20) / 6) * 30;
    return 30;
  }

  /**
   * Local relief / slope proxy from elev delta (m).
   * Gentle–moderate relief preferred; extreme delta → rüzgâr/soğuk hava riski.
   */
  function reliefScore(deltaM) {
    if (deltaM == null || !isFinite(deltaM)) return 55;
    var d = Math.abs(deltaM);
    if (d <= 40) return 72;
    if (d <= 100) return 88;
    if (d <= 180) return 75;
    if (d <= 300) return 55;
    return 38;
  }

  /**
   * Suitability 0–100 from measured elev + optional climate + relief.
   * No hash flora / fake habitat / fake yield %.
   */
  function scoreSpot(lat, lon, elevM, radiusKm, climate, reliefDeltaM) {
    var hasElev = elevM != null && isFinite(elevM);
    var elev = hasElev ? elevM : null;
    var eScore = hasElev ? elevBandScore(elev) : 50;
    var pScore = climate ? precipScore(climate.precipSumMm) : null;
    var tScore = climate ? tempScore(climate.meanTempC) : null;
    var rScore = reliefScore(reliefDeltaM);
    var hasClimate = pScore != null && tScore != null;

    var raw;
    if (hasClimate) {
      raw =
        eScore * W_ELEV +
        pScore * W_PRECIP +
        tScore * W_TEMP +
        rScore * W_RELIEF;
    } else {
      /* Elevation-only fallback: elev 70% + relief 30%. */
      raw = eScore * 0.7 + rScore * 0.3;
    }

    var radiusFactor =
      0.92 +
      ((clampRadius(radiusKm) - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 0.1;
    var score = Math.round(Math.max(18, Math.min(96, raw * radiusFactor)));

    return {
      score: score,
      elevM: hasElev ? Math.round(elev) : null,
      elevSource: hasElev ? 'open-meteo' : 'missing',
      elevScore: Math.round(eScore),
      precipScore: pScore != null ? Math.round(pScore) : null,
      tempScore: tScore != null ? Math.round(tScore) : null,
      reliefScore: Math.round(rScore),
      reliefDeltaM: reliefDeltaM != null && isFinite(reliefDeltaM) ? Math.round(reliefDeltaM) : null,
      meanTempC: climate ? climate.meanTempC : null,
      precipSumMm: climate ? climate.precipSumMm : null,
      precipDays: climate ? climate.precipDays : null,
      meanRhPct: climate ? climate.meanRhPct : null,
      et0SumMm: climate ? climate.et0SumMm : null,
      seasonLabel: climate ? climate.seasonLabel : null,
      hasClimate: hasClimate,
      radiusKm: clampRadius(radiusKm)
    };
  }

  function gradeLabel(score) {
    if (score >= 80) return { tr: 'Çok uygun', tone: 'good' };
    if (score >= 65) return { tr: 'Uygun', tone: 'ok' };
    if (score >= 45) return { tr: 'Orta', tone: 'mid' };
    return { tr: 'Zayıf', tone: 'bad' };
  }

  function fmtSigned(n, unit, digits) {
    if (n == null || !isFinite(n)) return null;
    digits = digits != null ? digits : 0;
    var v = Number(n);
    var s = (v > 0 ? '+' : '') + (digits ? v.toFixed(digits) : String(Math.round(v)));
    return s + (unit || '');
  }

  /**
   * Build tip with WHY bullets: measured deltas (rakım, sıcaklık, yağış, eğim/skor).
   */
  function buildTip(here, best, sampleDist) {
    if (!best || best.score < here.score + 6) {
      return {
        text:
          'Bu nokta çevresindeki örneklemeye göre görece dengeli; büyük kaydırma şart değil (hava modeli verisi).',
        dirKey: null,
        why: [],
        targetLat: null,
        targetLon: null
      };
    }

    var distStr = sampleDist.toFixed(1).replace(/\.0$/, '');
    var lines = [];
    lines.push(
      'Önerilen konum: ~' +
        distStr +
        ' km ' +
        best.dir.label +
        ' — rakım/iklim uygunluğu daha yüksek (hava modeli). «Haritada göster» ile mevcut ve öneri birlikte açılır.'
    );

    var why = [];
    if (here.elevM != null && best.elevM != null) {
      var dElev = best.elevM - here.elevM;
      why.push({
        k: 'Rakım',
        v:
          best.elevM +
          ' m' +
          (dElev !== 0 ? ' (' + fmtSigned(dElev, ' m') + ')' : '')
      });
    }
    if (here.meanTempC != null && best.meanTempC != null) {
      var dT = Math.round((best.meanTempC - here.meanTempC) * 10) / 10;
      why.push({
        k: 'Sezon sıcaklık',
        v:
          best.meanTempC +
          ' °C' +
          (dT !== 0 ? ' (' + fmtSigned(dT, ' °C', 1) + ')' : '')
      });
    }
    if (here.precipSumMm != null && best.precipSumMm != null) {
      var dP = Math.round((best.precipSumMm - here.precipSumMm) * 10) / 10;
      why.push({
        k: 'Sezon yağış',
        v:
          best.precipSumMm +
          ' mm' +
          (dP !== 0 ? ' (' + fmtSigned(dP, ' mm', 1) + ')' : '')
      });
    }
    if (here.reliefDeltaM != null && best.reliefDeltaM != null) {
      var dR = best.reliefDeltaM - here.reliefDeltaM;
      why.push({
        k: 'Eğim (Δ rakım)',
        v:
          '~' +
          best.reliefDeltaM +
          ' m' +
          (dR !== 0 ? ' (' + fmtSigned(dR, ' m') + ')' : '')
      });
    }
    why.push({
      k: 'Uygunluk skoru',
      v:
        best.score +
        '/100' +
        (best.score !== here.score
          ? ' (' + fmtSigned(best.score - here.score, '') + ')'
          : '')
    });

    return {
      text: lines[0],
      why: why,
      dirKey: best.dir.key,
      targetLat: best.lat,
      targetLon: best.lon,
      scoreHere: here.score,
      scoreBest: best.score
    };
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

    var season = balSeasonWindow();

    return fetchElevations(points)
      .catch(function () {
        return points.map(function (p) {
          return { lat: p.lat, lon: p.lon, elev: null, tag: p.tag };
        });
      })
      .then(function (rows) {
        return fetchClimateArchive(points, season)
          .then(function (climates) {
            return { rows: rows, climates: climates, climateOk: true };
          })
          .catch(function () {
            return {
              rows: rows,
              climates: points.map(function () { return null; }),
              climateOk: false
            };
          });
      })
      .then(function (pack) {
        var rows = pack.rows;
        var climates = pack.climates || [];
        var climateOk = !!pack.climateOk && climates.some(function (c) { return !!c; });

        var elevs = rows
          .map(function (r) { return r.elev; })
          .filter(function (e) { return e != null && isFinite(e); });
        var minE = elevs.length ? Math.min.apply(null, elevs) : null;
        var maxE = elevs.length ? Math.max.apply(null, elevs) : null;
        var ringDelta = minE != null && maxE != null ? maxE - minE : null;
        var centerElev = rows[0] && rows[0].elev != null ? rows[0].elev : null;

        function reliefFor(i, elev) {
          if (i === 0) return ringDelta;
          if (centerElev != null && elev != null && isFinite(elev)) {
            return Math.abs(elev - centerElev);
          }
          return ringDelta;
        }

        var here = scoreSpot(
          lat,
          lon,
          centerElev,
          radiusKm,
          climates[0] || null,
          reliefFor(0, centerElev)
        );

        var best = null;
        for (var i = 0; i < DIRS.length; i++) {
          var d = DIRS[i];
          var row = rows[i + 1] || {};
          var rlat = row.lat != null ? row.lat : lat;
          var rlon = row.lon != null ? row.lon : lon;
          var sc = scoreSpot(
            rlat,
            rlon,
            row.elev,
            radiusKm,
            climates[i + 1] || null,
            reliefFor(i + 1, row.elev)
          );
          if (!best || sc.score > best.score) {
            best = {
              dir: d,
              score: sc.score,
              elevM: sc.elevM,
              meanTempC: sc.meanTempC,
              precipSumMm: sc.precipSumMm,
              reliefDeltaM: sc.reliefDeltaM,
              lat: rlat,
              lon: rlon,
              distKm: sampleDist
            };
          }
        }

        var tip = buildTip(here, best, sampleDist);

        var slopeNote = null;
        if (ringDelta != null) {
          if (ringDelta > 180) {
            slopeNote =
              'Çevrede belirgin rakım farkı (~' +
              Math.round(ringDelta) +
              ' m) — rüzgâr/soğuk hava akışı riski (ölçüm).';
          } else if (ringDelta > 80) {
            slopeNote =
              'Hafif engebeli arazi (~' + Math.round(ringDelta) + ' m fark) (ölçüm).';
          } else {
            slopeNote = 'Yakın çevrede rakım görece düzgün (ölçüm).';
          }
        }

        var insights = [];
        insights.push({
          k: 'Rakım',
          v: here.elevM != null ? here.elevM + ' m' : '—',
          note: here.elevSource === 'open-meteo' ? 'rakım ölçümü' : 'eksik'
        });
        insights.push({
          k: 'Foraj yarıçapı',
          v: here.radiusKm + ' km',
          note: 'arılar bu çapta geziyor'
        });
        if (climateOk && here.meanTempC != null) {
          insights.push({
            k: 'Sezon sıcaklık',
            v: here.meanTempC + ' °C ort. (' + (here.seasonLabel || season.label) + ')',
            note: 'iklim arşivi'
          });
          insights.push({
            k: 'Sezon yağış',
            v:
              here.precipSumMm +
              ' mm' +
              (here.precipDays != null ? ' · ' + here.precipDays + ' yağışlı gün' : ''),
            note: 'iklim arşivi'
          });
        } else {
          insights.push({
            k: 'İklim',
            v: 'Archive alınamadı — skor yalnızca rakım/eğim',
            note: 'fallback'
          });
        }

        var water = climateOk ? waterAnalysis(climates[0] || null) : null;
        if (water) {
          if (water.meanRhPct != null) {
            insights.push({
              k: 'Bağıl nem',
              v:
                water.meanRhPct +
                ' % ort.' +
                (water.rhNote ? ' — ' + water.rhNote : ''),
              note: 'su / nem'
            });
          }
          if (water.et0SumMm != null && here.precipSumMm != null) {
            insights.push({
              k: 'Su dengesi',
              v:
                'yağış ' +
                here.precipSumMm +
                ' mm · ET0 ' +
                water.et0SumMm +
                ' mm' +
                (water.waterBalanceMm != null
                  ? ' · Δ ' +
                    (water.waterBalanceMm > 0 ? '+' : '') +
                    water.waterBalanceMm +
                    ' mm'
                  : ''),
              note: 'su / nem'
            });
          }
          insights.push({
            k: 'Su / nem',
            v: water.droughtLabel + ' — ' + water.summary,
            note: 'yorum'
          });
        }

        insights.push({
          k: 'Uygunluk skoru',
          v: here.score + '/100 · ' + gradeLabel(here.score).tr,
          note: climateOk
            ? 'rakım+iklim+eğim'
            : 'rakım+eğim'
        });
        if (slopeNote) {
          insights.push({ k: 'Arazi', v: slopeNote, note: 'ölçüm' });
        }

        var disclaimer = climateOk
          ? 'Kaynaklar: rakım ölçümü + iklim arşivi (' +
            season.label +
            ' ortalama sıcaklık, yağış, bağıl nem, ET0). Uygunluk skoru rakım+iklim+eğim; Su/nem paneli yağış−ET0 ve nem ölçümünden. Sahte flora/verim % yoktur.'
          : 'Kaynak: rakım ölçümü. İklim arşivi alınamadı — skor yalnızca rakım/eğim. Sahte flora/verim % yoktur.';

        return {
          lat: lat,
          lon: lon,
          radiusKm: here.radiusKm,
          score: here.score,
          grade: gradeLabel(here.score),
          elevM: here.elevM,
          elevSource: here.elevSource,
          meanTempC: here.meanTempC,
          precipSumMm: here.precipSumMm,
          meanRhPct: here.meanRhPct,
          et0SumMm: here.et0SumMm,
          water: water || null,
          seasonLabel: here.seasonLabel || season.label,
          insights: insights,
          tip: tip,
          disclaimer: disclaimer,
          demo: !climateOk,
          climateOk: climateOk,
          sources: climateOk
            ? ['rakım ölçümü', 'iklim arşivi', 'su / nem (RH+ET0)']
            : ['rakım ölçümü']
        };
      });
  }

  /** Leaflet circle helper — Arılık sayfaları Yandex için SuperAriYandexMap.attachRadar kullanır. */
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

    var tip = '';
    if (analysis.tip) {
      var whyHtml = '';
      if (analysis.tip.why && analysis.tip.why.length) {
        whyHtml =
          '<ul class="forage-tip-why">' +
          analysis.tip.why
            .map(function (w) {
              return (
                '<li><span class="forage-tip-why-k">' +
                escapeHtml(w.k) +
                ':</span> ' +
                escapeHtml(w.v) +
                '</li>'
              );
            })
            .join('') +
          '</ul>';
      }
      var hasTarget =
        analysis.tip.targetLat != null &&
        analysis.tip.targetLon != null &&
        isFinite(Number(analysis.tip.targetLat)) &&
        isFinite(Number(analysis.tip.targetLon));
      if (hasTarget) {
        tip =
          '<button type="button" class="forage-tip is-action" data-lat="' +
          Number(analysis.tip.targetLat) +
          '" data-lon="' +
          Number(analysis.tip.targetLon) +
          '">' +
          '<span class="forage-tip-text">' +
          escapeHtml(analysis.tip.text) +
          '</span>' +
          whyHtml +
          '<span class="forage-tip-cta">Haritada göster ›</span>' +
          '</button>';
      } else {
        tip =
          '<div class="forage-tip">' +
          '<span class="forage-tip-text">' +
          escapeHtml(analysis.tip.text) +
          '</span>' +
          whyHtml +
          '</div>';
      }
    }

    return (
      '<div class="forage-panel" data-score="' +
      analysis.score +
      '" data-demo="' +
      (analysis.demo ? '1' : '0') +
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
      ' km çapta geziyor (foraj çemberi).' +
      (analysis.demo
        ? ' <span class="forage-tag">iklim yok · rakım/eğim</span>'
        : '') +
      '</p>' +
      '<div class="forage-grid">' +
      rows +
      '</div>' +
      (function () {
        if (!analysis.water) return '';
        var w = analysis.water;
        return (
          '<div class="forage-water">' +
            '<div class="forage-water-head">Su / nem analizi</div>' +
            '<p class="forage-water-sum">' +
            escapeHtml(w.summary || w.droughtLabel || '') +
            '</p>' +
            (w.meanRhPct != null
              ? '<div class="forage-row"><div class="forage-k">Bağıl nem <span class="forage-tag">ölçüm</span></div><div class="forage-v">' +
                escapeHtml(String(w.meanRhPct) + ' %') +
                '</div></div>'
              : '') +
            (w.et0SumMm != null
              ? '<div class="forage-row"><div class="forage-k">Buharlaşma (ET0) <span class="forage-tag">ölçüm</span></div><div class="forage-v">' +
                escapeHtml(String(w.et0SumMm) + ' mm') +
                '</div></div>'
              : '') +
            (w.droughtLabel
              ? '<div class="forage-row"><div class="forage-k">Kuraklık / su <span class="forage-tag tone-' +
                escapeHtml(w.droughtTone || 'mid') +
                '">' +
                escapeHtml(w.droughtLabel) +
                '</span></div><div class="forage-v">' +
                escapeHtml(w.droughtNote || '') +
                '</div></div>'
              : '') +
          '</div>'
        );
      })() +
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
    '.forage-tip{display:block;margin:10px 0 0;padding:10px 11px;border-radius:12px;background:#fff;border:1px dashed #c9a227;font-size:12px;font-weight:700;color:#4a2f1a;line-height:1.4;box-sizing:border-box;width:100%;text-align:left;font-family:inherit;}',
    '.forage-tip.is-action{cursor:pointer;-webkit-tap-highlight-color:transparent;appearance:none;-webkit-appearance:none;}',
    '.forage-tip.is-action:hover{border-style:solid;background:#fff8e6;}',
    '.forage-tip.is-action:active{transform:scale(.98);background:#fff3d1;}',
    '.forage-tip-text{display:block;}',
    '.forage-tip-why{margin:8px 0 0;padding:0 0 0 1.1em;list-style:disc;font-size:11px;font-weight:650;color:#5a4634;line-height:1.45;}',
    '.forage-tip-why-k{font-weight:800;color:#4a2f1a;}',
    '.forage-tip-cta{display:inline-block;margin-top:8px;font-size:11px;font-weight:800;color:#8a6a1a;letter-spacing:.01em;}',
    '.forage-disc{margin:8px 0 0;font-size:10px;color:#8a8278;line-height:1.35;font-weight:560;}',
    '.forage-radius{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin:8px 0 0;}',
    '.forage-radius label{font-size:11px;font-weight:700;color:#6b635a;}',
    '.forage-radius input[type=range]{width:100%;}',
    '.forage-radius .val{font-size:11px;font-weight:800;color:#4a2f1a;font-variant-numeric:tabular-nums;}',
    '.forage-auto-hint{margin:4px 0 0;font-size:10px;color:#8a8278;line-height:1.35;font-weight:560;}',
    '.forage-water{margin-top:10px;padding:10px 11px;border-radius:12px;background:#f3f8ff;border:1px solid #a8c4e0;}',
    '.forage-water-head{font-size:12px;font-weight:800;color:#1e3a5f;margin:0 0 4px;}',
    '.forage-water-sum{font-size:11px;font-weight:650;color:#3a4f66;margin:0 0 8px;line-height:1.4;}',
    '.forage-water .forage-row{margin-top:4px;}',
    '.forage-tag.tone-good{color:#3d5a2a;}',
    '.forage-tag.tone-ok{color:#4a2f1a;}',
    '.forage-tag.tone-mid{color:#6a4220;}',
    '.forage-tag.tone-bad{color:#8a2e1c;}'
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
