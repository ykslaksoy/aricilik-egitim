/**
 * SüperArı — foraj radarı + yer analizi (Open-Meteo + OSM örtü).
 *
 * Data (ücretsiz, anahtarsız):
 *  - Open-Meteo Elevation API — merkez + 8 yön gerçek rakım
 *  - Open-Meteo Archive — bal mevsimi (Mayıs–Eylül) ortalama sıcaklık + yağış toplamı
 *    + bağıl nem + ET0 (su/nem) + precipitation_hours (uçuş/yağış özeti)
 *  - Open-Meteo Forecast — Mevsim/kışlama: don riski, rüzgâr, Karniyol kışlama uygunluğu
 *  - OpenStreetMap Overpass — landuse/natural bitki örtüsü (canlı harita örtüsü, NDVI değil)
 *
 * Skor: rakım bandı, sezon yağış, sezon sıcaklık, yerel eğim + (varsa) OSM örtü.
 * Su/nem paneli ölçülen nem + yağış/ET0 dengesinden; uçuş özeti yağışlı saatlerden.
 * Uydu NDVI yok — OSM etiketleri gerçek harita örtüsü; sahte NDVI % yok.
 */
(function (global) {
  var DEFAULT_RADIUS_KM = 3;
  var MIN_RADIUS_KM = 0.5;
  var MAX_RADIUS_KM = 10;
  var RADIUS_STEP_KM = 0.5;
  var AUTO_HINT_TR =
    'Otomatik foraj (~2–4 km): yakın kovan yoğunluğu veya yerleşim/araç proxy yüksekse daraltır. ' +
    'Yanıkdağ / yayla gibi seyrek yerlerde ~3 km civarı önerilir.';
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
  /* With live OSM land-cover: elev+precip+temp+relief+veg = 1.0 */
  var W_ELEV_V = 0.28;
  var W_PRECIP_V = 0.22;
  var W_TEMP_V = 0.22;
  var W_RELIEF_V = 0.12;
  var W_VEG = 0.16;

  var OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  var OVERPASS_TIMEOUT_MS = 25000;
  var LANDCOVER_SPARSE_MAX = 3;

  /* Hava (hava-kayit) ile hizalı yağış saati eşiği */
  var RAIN_HOUR_THRESHOLD_MM = 0.1;
  /* Gün uçuşa elverişsiz: yağışlı saat ≥6 veya günlük yağış >5 mm */
  var POOR_FLIGHT_RAIN_HOURS = 6;
  var POOR_FLIGHT_PRECIP_MM = 5;

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
    /* Üretken foraj ~2–3,5 km; yoğunluk/yerleşim daraltır, seyrek yayla biraz açar. */
    var raw = 3.6 - hiveP * 2.2 - vehP * 1.6;
    if (hiveP > 0.75) raw -= 0.5;
    if (hiveP > 0.9) raw -= 0.3;
    if (hiveP < 0.12 && vehP < 0.25) raw += 0.65;
    if (hiveP < 0.08 && vehP < 0.18) raw += 0.25;
    /* Opsiyonel: yüksek kendi kovan sayısı daraltır (aynı saha baskısı). */
    var own = Math.max(0, Number(opts.ownHiveCount) || 0);
    if (own >= 40) raw -= 0.35;
    else if (own >= 25) raw -= 0.2;
    /* Otomatik öneri tavanı (kaydırıcı görsel önizleme; skor bu km ile kilitli). */
    if (raw > 4) raw = 4;
    if (raw < 1.5) raw = 1.5;
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
    var rainHoursSum = sum(daily.precipitation_hours);
    var seasonDayCount = 0;
    if (daily.time && daily.time.length) seasonDayCount = daily.time.length;
    else if (daily.precipitation_sum && daily.precipitation_sum.length) {
      seasonDayCount = daily.precipitation_sum.length;
    }
    var poorFlightDays = null;
    if (daily.precipitation_sum && daily.precipitation_sum.length) {
      poorFlightDays = 0;
      var ph = daily.precipitation_hours || [];
      for (var i = 0; i < daily.precipitation_sum.length; i++) {
        var pmm = Number(daily.precipitation_sum[i]);
        var rh = ph[i] != null ? Number(ph[i]) : null;
        var heavyPrecip = isFinite(pmm) && pmm > POOR_FLIGHT_PRECIP_MM;
        var longRain = rh != null && isFinite(rh) && rh >= POOR_FLIGHT_RAIN_HOURS;
        /* precipDays eşiği ile uyumlu: yağışlı ama saat yoksa düşük mm günleri sayma */
        if (longRain || heavyPrecip) poorFlightDays += 1;
      }
    }
    return {
      meanTempC: Math.round(meanT * 10) / 10,
      precipSumMm: Math.round(precipSum * 10) / 10,
      precipDays: precipDays(daily.precipitation_sum, RAIN_HOUR_THRESHOLD_MM),
      meanRhPct: meanRh != null ? Math.round(meanRh * 10) / 10 : null,
      et0SumMm: et0Sum != null ? Math.round(et0Sum * 10) / 10 : null,
      rainHoursSum: rainHoursSum != null ? Math.round(rainHoursSum * 10) / 10 : null,
      rainHoursAvg:
        rainHoursSum != null && seasonDayCount > 0
          ? Math.round((rainHoursSum / seasonDayCount) * 10) / 10
          : null,
      seasonDayCount: seasonDayCount || null,
      poorFlightDays: poorFlightDays
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
      '&daily=temperature_2m_mean,precipitation_sum,precipitation_hours,relative_humidity_2m_mean,et0_fao_evapotranspiration&timezone=auto';
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
                rainHoursSum: clim.rainHoursSum,
                rainHoursAvg: clim.rainHoursAvg,
                seasonDayCount: clim.seasonDayCount,
                poorFlightDays: clim.poorFlightDays,
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

  /**
   * Uçuş / yağış özeti — Archive precipitation_hours (hava-kayit ile aynı kaynak).
   * Skora dahil değil; panelde Su/nem benzeri ayrı blok.
   * Kural: yağışlı saat ≥ POOR_FLIGHT_RAIN_HOURS veya günlük yağış > POOR_FLIGHT_PRECIP_MM
   * → uçuşa elverişsiz gün.
   */
  function flightAnalysis(climate) {
    if (!climate) return null;
    var precipDaysN = climate.precipDays;
    var rainSum = climate.rainHoursSum;
    var rainAvg = climate.rainHoursAvg;
    var seasonDays = climate.seasonDayCount;
    var poor = climate.poorFlightDays;
    var flightOk = null;
    if (seasonDays != null && poor != null) {
      flightOk = Math.max(0, seasonDays - poor);
    }

    var tip =
      'Kural: yağışlı saat ≥' +
      POOR_FLIGHT_RAIN_HOURS +
      ' veya günlük yağış >' +
      POOR_FLIGHT_PRECIP_MM +
      ' mm → uçuşa elverişsiz gün (hava eşiği ' +
      RAIN_HOUR_THRESHOLD_MM +
      ' mm/saat).';

    var summaryParts = [];
    if (precipDaysN != null) summaryParts.push(precipDaysN + ' yağışlı gün');
    if (rainSum != null) {
      summaryParts.push(
        'toplam ~' +
          (Math.abs(rainSum - Math.round(rainSum)) < 0.05
            ? Math.round(rainSum)
            : rainSum) +
          ' yağışlı saat'
      );
    }
    if (flightOk != null) {
      summaryParts.push('uçuşa daha uygun gün ≈ ' + flightOk);
    }
    var summary = summaryParts.length
      ? summaryParts.join(' · ')
      : 'Yağış saati ölçümü yok — yalnızca mevcut alanlar.';

    var tone = 'mid';
    if (flightOk != null && seasonDays) {
      var ratio = flightOk / seasonDays;
      if (ratio >= 0.75) tone = 'good';
      else if (ratio >= 0.55) tone = 'ok';
      else if (ratio >= 0.4) tone = 'mid';
      else tone = 'bad';
    }

    return {
      precipDays: precipDaysN != null ? precipDaysN : null,
      rainHoursSum: rainSum != null && isFinite(rainSum) ? rainSum : null,
      rainHoursAvg: rainAvg != null && isFinite(rainAvg) ? rainAvg : null,
      seasonDayCount: seasonDays != null ? seasonDays : null,
      poorFlightDays: poor != null ? poor : null,
      flightOkDays: flightOk,
      tone: tone,
      tip: tip,
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


  var GOOD_LANDUSE = {
    meadow: 1,
    grassland: 1,
    orchard: 1,
    farmland: 1,
    vineyard: 1,
    flowerbed: 1
  };
  var GOOD_NATURAL = {
    heath: 1,
    scrub: 1,
    grassland: 1,
    fell: 1,
    moor: 1
  };
  var MIXED_LANDUSE = { forest: 1 };
  var MIXED_NATURAL = { wood: 1 };
  var POOR_LANDUSE = {
    residential: 1,
    industrial: 1,
    commercial: 1,
    retail: 1,
    construction: 1,
    quarry: 1,
    landfill: 1,
    cemetery: 1,
    military: 1
  };
  var OTHER_NATURAL = { water: 1, wetland: 1 };

  function classifyLandCoverTags(tags) {
    if (!tags) return null;
    var lu = tags.landuse;
    var nat = tags.natural;
    if (lu && GOOD_LANDUSE[lu]) return 'good';
    if (nat && GOOD_NATURAL[nat]) return 'good';
    if (lu && MIXED_LANDUSE[lu]) return 'mixed';
    if (nat && MIXED_NATURAL[nat]) return 'mixed';
    if (lu && POOR_LANDUSE[lu]) return 'poor';
    if (nat && OTHER_NATURAL[nat]) return 'other';
    if (lu === 'basin' || lu === 'reservoir') return 'other';
    return null;
  }

  function mixedWeightFromLeaf(tags) {
    if (!tags) return 0.55;
    var lt = tags.leaf_type;
    if (lt === 'broadleaved' || lt === 'mixed') return 0.7;
    if (lt === 'needleleaved') return 0.45;
    return 0.55;
  }

  function dominantTagLabelTr(tagCounts) {
    var bestK = null;
    var bestN = 0;
    for (var k in tagCounts) {
      if (!Object.prototype.hasOwnProperty.call(tagCounts, k)) continue;
      if (tagCounts[k] > bestN) {
        bestN = tagCounts[k];
        bestK = k;
      }
    }
    if (!bestK) return null;
    var map = {
      meadow: 'çayır',
      grassland: 'mera / çayır',
      orchard: 'bahçe / fındık-meyve',
      farmland: 'tarım arazisi',
      vineyard: 'bağ',
      flowerbed: 'çiçeklik',
      heath: 'fundalık',
      scrub: 'çalılık',
      fell: 'yayla / çıplak tepe',
      moor: 'fundalık',
      wood: 'orman',
      forest: 'orman',
      residential: 'yerleşim',
      industrial: 'sanayi',
      commercial: 'ticari alan',
      retail: 'ticari alan',
      construction: 'inşaat',
      quarry: 'ocak',
      landfill: 'depolama',
      cemetery: 'mezarlık',
      military: 'askeri alan',
      water: 'su',
      wetland: 'sulak alan'
    };
    return map[bestK] || bestK;
  }

  function summarizeLandCoverTr(goodPct, mixedPct, poorPct, otherPct, tagCounts, sparse) {
    if (sparse) {
      return 'OSM seyrek — skor nötr (haritada az örtü etiketi)';
    }
    var parts = [];
    var dom = dominantTagLabelTr(tagCounts);
    if (dom) parts.push(dom + ' baskın');
    if (goodPct >= 40) parts.push('iyi foraj örtüsü');
    else if (mixedPct >= 40) parts.push('orman / karışık örtü');
    else if (poorPct >= 40) parts.push('yerleşim / zayıf örtü');
    if (otherPct >= 25) parts.push('su/sulak alan notu');
    if (!parts.length) {
      if (goodPct >= mixedPct && goodPct >= poorPct) parts.push('karışık ama foraja uygun etiketler');
      else if (mixedPct >= poorPct) parts.push('orman ağırlıklı karışık örtü');
      else parts.push('zayıf örtü ağırlıklı');
    }
    return parts.join(' · ');
  }

  function landCoverFromElements(elements, radiusKm) {
    var good = 0;
    var mixed = 0;
    var poor = 0;
    var other = 0;
    var mixedWSum = 0;
    var tagCounts = {};
    var n = 0;
    for (var i = 0; i < (elements || []).length; i++) {
      var el = elements[i];
      if (!el || el.type === 'count') continue;
      var tags = el.tags || {};
      var cat = classifyLandCoverTags(tags);
      if (!cat) continue;
      n += 1;
      var key = tags.landuse || tags.natural || 'other';
      tagCounts[key] = (tagCounts[key] || 0) + 1;
      if (cat === 'good') good += 1;
      else if (cat === 'mixed') {
        mixed += 1;
        mixedWSum += mixedWeightFromLeaf(tags);
      } else if (cat === 'poor') poor += 1;
      else other += 1;
    }
    var sparse = n < LANDCOVER_SPARSE_MAX;
    var denom = Math.max(1, n);
    var goodPct = Math.round((good / denom) * 1000) / 10;
    var mixedPct = Math.round((mixed / denom) * 1000) / 10;
    var poorPct = Math.round((poor / denom) * 1000) / 10;
    var otherPct = Math.round((other / denom) * 1000) / 10;
    /* Normalize tiny float drift so shares ~100 */
    var sumPct = goodPct + mixedPct + poorPct + otherPct;
    if (n > 0 && Math.abs(sumPct - 100) > 0.2) {
      otherPct = Math.round((100 - goodPct - mixedPct - poorPct) * 10) / 10;
    }

    var vegScore;
    var coverageNote;
    if (sparse) {
      vegScore = 52;
      coverageNote = 'OSM seyrek — skor nötr (' + n + ' özellik)';
    } else {
      var mixedAvgW = mixed > 0 ? mixedWSum / mixed : 0.55;
      /* Weighted 0–100 from category shares (other contributes 0). */
      vegScore =
        goodPct * 1.0 +
        mixedPct * mixedAvgW +
        poorPct * 0.15;
      vegScore = Math.round(Math.max(8, Math.min(96, vegScore)));
      coverageNote = n + ' OSM özelliği · yarıçap ' + clampRadius(radiusKm) + ' km';
    }

    var summaryTr = summarizeLandCoverTr(
      goodPct,
      mixedPct,
      poorPct,
      otherPct,
      tagCounts,
      sparse
    );

    return {
      ok: true,
      source: 'osm-overpass',
      goodPct: goodPct,
      mixedPct: mixedPct,
      poorPct: poorPct,
      otherPct: otherPct,
      vegScore: vegScore,
      summaryTr: summaryTr,
      featureCount: n,
      sparse: sparse,
      coverageNote: coverageNote,
      tagCounts: tagCounts,
      fetchedAt: new Date().toISOString()
    };
  }

  function buildOverpassQuery(lat, lon, radiusKm) {
    var rM = Math.round(clampRadius(radiusKm) * 1000);
    var around = '(around:' + rM + ',' + lat + ',' + lon + ')';
    return (
      '[out:json][timeout:25];\n' +
      '/* SuperAri forage landcover */\n' +
      '(\n' +
      '  way["landuse"~"^(meadow|grassland|orchard|farmland|vineyard|flowerbed|forest|residential|industrial|commercial|retail|construction|quarry|landfill|cemetery|military)$"]' +
      around +
      ';\n' +
      '  way["natural"~"^(heath|scrub|grassland|fell|moor|wood|water|wetland)$"]' +
      around +
      ';\n' +
      '  relation["landuse"~"^(meadow|grassland|orchard|farmland|vineyard|flowerbed|forest|residential|industrial|commercial|retail|construction|quarry|landfill|cemetery|military)$"]' +
      around +
      ';\n' +
      '  relation["natural"~"^(heath|scrub|grassland|fell|moor|wood|water|wetland)$"]' +
      around +
      ';\n' +
      ');\n' +
      'out tags;'
    );
  }

  function fetchOverpassOnce(endpoint, query, signal) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json'
      },
      body: 'data=' + encodeURIComponent(query),
      signal: signal
    }).then(function (r) {
      if (!r.ok) throw new Error('overpass_' + r.status);
      return r.json();
    });
  }

  /**
   * Live OSM land-cover for forage circle. Not satellite NDVI.
   * Degrades to null on timeout / error (caller keeps climate/elev score).
   */
  function fetchLandCover(lat, lon, radiusKm) {
    var query = buildOverpassQuery(lat, lon, radiusKm);
    var controllers = [];
    function attempt(i) {
      if (i >= OVERPASS_ENDPOINTS.length) {
        return Promise.reject(new Error('overpass_all_failed'));
      }
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (ctrl) controllers.push(ctrl);
      var timer =
        ctrl &&
        setTimeout(function () {
          try {
            ctrl.abort();
          } catch (e) {}
        }, OVERPASS_TIMEOUT_MS);
      return fetchOverpassOnce(
        OVERPASS_ENDPOINTS[i],
        query,
        ctrl ? ctrl.signal : undefined
      )
        .then(function (j) {
          if (timer) clearTimeout(timer);
          var els = (j && j.elements) || [];
          return landCoverFromElements(els, radiusKm);
        })
        .catch(function () {
          if (timer) clearTimeout(timer);
          return attempt(i + 1);
        });
    }
    return attempt(0);
  }

  /**
   * Suitability 0–100 from measured elev + optional climate + relief + OSM örtü.
   * No hash flora / fake NDVI / fake habitat %.
   */
  function scoreSpot(lat, lon, elevM, radiusKm, climate, reliefDeltaM, landCover) {
    var hasElev = elevM != null && isFinite(elevM);
    var elev = hasElev ? elevM : null;
    var eScore = hasElev ? elevBandScore(elev) : 50;
    var pScore = climate ? precipScore(climate.precipSumMm) : null;
    var tScore = climate ? tempScore(climate.meanTempC) : null;
    var rScore = reliefScore(reliefDeltaM);
    var hasClimate = pScore != null && tScore != null;
    var hasVeg =
      landCover &&
      landCover.ok &&
      landCover.vegScore != null &&
      isFinite(landCover.vegScore);
    var vScore = hasVeg ? Number(landCover.vegScore) : null;

    var raw;
    if (hasClimate && hasVeg) {
      raw =
        eScore * W_ELEV_V +
        pScore * W_PRECIP_V +
        tScore * W_TEMP_V +
        rScore * W_RELIEF_V +
        vScore * W_VEG;
    } else if (hasClimate) {
      raw =
        eScore * W_ELEV +
        pScore * W_PRECIP +
        tScore * W_TEMP +
        rScore * W_RELIEF;
    } else if (hasVeg) {
      /* Elevation + relief + OSM örtü (iklim yok). */
      raw = eScore * 0.55 + rScore * 0.25 + vScore * 0.2;
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
      hasVeg: !!hasVeg,
      vegScore: vScore != null ? Math.round(vScore) : null,
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
  function midKgFromScoreLocal(S) {
    S = Number(S) || 0;
    if (S >= 80) return 30;
    if (S >= 65) return 24;
    if (S >= 45) return 16;
    return 10;
  }

  function yieldPctForTip(scoreHere, scoreBest) {
    var Y = global.SuperAriForageYield;
    if (Y && typeof Y.yieldPctFromScores === 'function') {
      return Y.yieldPctFromScores(scoreHere, scoreBest);
    }
    var midHere =
      Y && typeof Y.midKgFromScore === 'function'
        ? Y.midKgFromScore(scoreHere)
        : midKgFromScoreLocal(scoreHere);
    var midBest =
      Y && typeof Y.midKgFromScore === 'function'
        ? Y.midKgFromScore(scoreBest)
        : midKgFromScoreLocal(scoreBest);
    var pct = Math.round(100 * (midBest - midHere) / Math.max(midHere, 1));
    if (!isFinite(pct) || pct < 8) return null;
    return Math.max(5, Math.min(80, pct));
  }

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

    var kmShow = Math.round(Number(sampleDist) * 2) / 2;
    if (!isFinite(kmShow)) kmShow = Number(sampleDist) || 0;
    var distStr = String(kmShow).replace(/\.0$/, '');
    var dirLabel = best.dir.label;
    var yieldPct = yieldPctForTip(here.score, best.score);

    var lines = [];
    if (yieldPct != null) {
      lines.push(
        'Yaklaşık ' +
          distStr +
          ' km ' +
          dirLabel +
          ' taşırsan hedef bal ~%' +
          yieldPct +
          ' artabilir (garanti değil; yer skoru ' +
          here.score +
          '→' +
          best.score +
          ').'
      );
    } else {
      lines.push(
        'Önerilen konum: ~' +
          distStr +
          ' km ' +
          dirLabel +
          ' — rakım/iklim uygunluğu daha yüksek (hava modeli). «Haritada göster» ile mevcut ve öneri birlikte açılır.'
      );
    }

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

    var tip = {
      text: lines[0],
      why: why,
      dirKey: best.dir.key,
      dirLabel: dirLabel,
      distKm: kmShow,
      targetLat: best.lat,
      targetLon: best.lon,
      scoreHere: here.score,
      scoreBest: best.score
    };
    if (yieldPct != null) tip.yieldPct = yieldPct;
    return tip;
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

    /* OSM land-cover in parallel with elev+climate (one query for whole circle). */
    var landCoverPromise = fetchLandCover(lat, lon, radiusKm).catch(function () {
      return null;
    });

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
        return landCoverPromise.then(function (lc) {
          pack.landCover = lc && lc.ok ? lc : null;
          return pack;
        });
      })
      .then(function (pack) {
        var rows = pack.rows;
        var climates = pack.climates || [];
        var climateOk = !!pack.climateOk && climates.some(function (c) { return !!c; });
        var landCover = pack.landCover || null;
        var landCoverOk = !!(landCover && landCover.ok);

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
          reliefFor(0, centerElev),
          landCover
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
            reliefFor(i + 1, row.elev),
            landCover
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
          note: 'arılar bu yarıçapta geziyor'
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
        var flight = climateOk ? flightAnalysis(climates[0] || null) : null;
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

        if (flight && flight.flightOkDays != null) {
          insights.push({
            k: 'Uçuş penceresi',
            v:
              '≈ ' +
              flight.flightOkDays +
              ' gün' +
              (flight.rainHoursSum != null
                ? ' · ~' + flight.rainHoursSum + ' yağışlı saat'
                : ''),
            note: 'özet (skora dahil değil)'
          });
        }

        var scoreNoteParts = [];
        if (climateOk) scoreNoteParts.push('rakım+iklim+eğim');
        else scoreNoteParts.push('rakım+eğim');
        if (landCoverOk) scoreNoteParts.push('OSM örtü');
        insights.push({
          k: 'Uygunluk skoru',
          v: here.score + '/100 · ' + gradeLabel(here.score).tr,
          note: scoreNoteParts.join('+')
        });
        if (slopeNote) {
          insights.push({ k: 'Arazi', v: slopeNote, note: 'ölçüm' });
        }

        if (landCoverOk) {
          insights.push({
            k: 'Bitki örtüsü',
            v:
              '%' +
              Math.round(landCover.goodPct) +
              ' iyi / %' +
              Math.round(landCover.mixedPct) +
              ' orman / %' +
              Math.round(landCover.poorPct) +
              ' zayıf · OSM canlı (yarıçap ' +
              here.radiusKm +
              ' km)',
            note: 'Bitki örtüsü (OSM canlı)'
          });
          insights.push({
            k: 'Örtü özeti',
            v: landCover.summaryTr || landCover.coverageNote || '',
            note: landCover.sparse ? 'OSM seyrek' : 'OSM landuse/natural'
          });
        } else {
          insights.push({
            k: 'Bitki örtüsü',
            v: 'Canlı örtü alınamadı — skor rakım+iklim',
            note: 'Bitki örtüsü alınamadı'
          });
        }

        var disclaimerParts = [];
        if (climateOk) {
          disclaimerParts.push(
            'Kaynaklar: Open-Meteo rakım + iklim arşivi (' +
              season.label +
              ' sıcaklık, yağış, yağışlı saat, bağıl nem, ET0)'
          );
        } else {
          disclaimerParts.push(
            'Kaynak: Open-Meteo rakım. İklim arşivi alınamadı — skor yalnız rakım/eğim' +
              (landCoverOk ? '+OSM örtü' : '')
          );
        }
        if (landCoverOk) {
          disclaimerParts.push(
            'bitki örtüsü OpenStreetMap Overpass (landuse/natural) — harita örtüsü, uydu NDVI değil'
          );
        } else {
          disclaimerParts.push('canlı OSM örtü alınamadı');
        }
        disclaimerParts.push(
          'Uydu NDVI yok — sahte NDVI/flora % yoktur. OSM yoğunluğu yere göre değişir.'
        );
        if (climateOk) {
          disclaimerParts.push('Skor rakım+iklim+eğim' + (landCoverOk ? '+OSM örtü' : '') + '; su/nem yağış−ET0; uçuş precipitation_hours.');
        }
        var disclaimer = disclaimerParts.join('. ');

        var sources = [];
        if (climateOk) {
          sources = [
            'rakım ölçümü',
            'iklim arşivi',
            'su / nem (RH+ET0)',
            'uçuş / yağış saati'
          ];
        } else {
          sources = ['rakım ölçümü'];
        }
        if (landCoverOk) sources.push('bitki örtüsü (OSM)');

        var landCoverPayload = null;
        if (landCoverOk) {
          landCoverPayload = {
            source: 'osm-overpass',
            goodPct: landCover.goodPct,
            mixedPct: landCover.mixedPct,
            poorPct: landCover.poorPct,
            otherPct: landCover.otherPct,
            summaryTr: landCover.summaryTr,
            featureCount: landCover.featureCount,
            vegScore: landCover.vegScore,
            sparse: !!landCover.sparse,
            coverageNote: landCover.coverageNote,
            fetchedAt: landCover.fetchedAt
          };
        }

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
          flight: flight || null,
          seasonLabel: here.seasonLabel || season.label,
          insights: insights,
          tip: tip,
          disclaimer: disclaimer,
          demo: !climateOk,
          climateOk: climateOk,
          ndviAvailable: false,
          landCoverAvailable: landCoverOk,
          landCover: landCoverPayload,
          sources: sources,
          climateSnapshot: climateOk && climates[0]
            ? {
                meanTempC: climates[0].meanTempC,
                precipSumMm: climates[0].precipSumMm,
                meanRhPct: climates[0].meanRhPct,
                et0SumMm: climates[0].et0SumMm,
                precipDays: climates[0].precipDays,
                rainHoursSum: climates[0].rainHoursSum,
                poorFlightDays: climates[0].poorFlightDays,
                seasonLabel: season.label
              }
            : null
        };
      });
  }

  /**
   * Mevsim / kışlama — Open-Meteo forecast (don, rüzgâr) + Karniyol kışlama yorumu.
   * No fake sensors; wind/frost only when API returns values.
   */
  function analyzeSeason(lat, lon) {
    lat = Number(lat);
    lon = Number(lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      return Promise.reject(new Error('invalid_coords'));
    }
    var url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      encodeURIComponent(String(lat)) +
      '&longitude=' +
      encodeURIComponent(String(lon)) +
      '&daily=temperature_2m_min,temperature_2m_max,wind_speed_10m_max,precipitation_sum' +
      '&forecast_days=14&timezone=auto';
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('forecast_' + r.status);
        return r.json();
      })
      .then(function (j) {
        var daily = (j && j.daily) || {};
        var mins = daily.temperature_2m_min || [];
        var maxs = daily.temperature_2m_max || [];
        var winds = daily.wind_speed_10m_max || [];
        var precips = daily.precipitation_sum || [];
        var elev = j && j.elevation != null && isFinite(Number(j.elevation))
          ? Math.round(Number(j.elevation))
          : null;

        function avg(arr) {
          var s = 0;
          var n = 0;
          for (var i = 0; i < arr.length; i++) {
            var v = Number(arr[i]);
            if (isFinite(v)) { s += v; n++; }
          }
          return n ? s / n : null;
        }
        function minOf(arr) {
          var m = null;
          for (var i = 0; i < arr.length; i++) {
            var v = Number(arr[i]);
            if (!isFinite(v)) continue;
            if (m == null || v < m) m = v;
          }
          return m;
        }
        function maxOf(arr) {
          var m = null;
          for (var i = 0; i < arr.length; i++) {
            var v = Number(arr[i]);
            if (!isFinite(v)) continue;
            if (m == null || v > m) m = v;
          }
          return m;
        }

        var frostDays = 0;
        var nearFrostDays = 0;
        for (var i = 0; i < mins.length; i++) {
          var t = Number(mins[i]);
          if (!isFinite(t)) continue;
          if (t <= 0) frostDays++;
          else if (t <= 3) nearFrostDays++;
        }
        var minT = minOf(mins);
        var maxWind = maxOf(winds);
        var avgWind = avg(winds);
        var avgMin = avg(mins);
        var avgMax = avg(maxs);
        var precip14 = avg(precips) != null
          ? Math.round(precips.reduce(function (s, v) {
              var n = Number(v);
              return s + (isFinite(n) ? n : 0);
            }, 0) * 10) / 10
          : null;

        var frostTone = 'good';
        var frostLabel = 'Düşük don riski';
        var frostNote = 'Önümüzdeki 14 günde gece ≤0 °C beklenmiyor (tahmin).';
        if (frostDays >= 5) {
          frostTone = 'bad';
          frostLabel = 'Yüksek don riski';
          frostNote = frostDays + ' gece ≤0 °C · min ≈ ' + (minT != null ? minT.toFixed(1) : '—') + ' °C';
        } else if (frostDays >= 1) {
          frostTone = 'mid';
          frostLabel = 'Orta don riski';
          frostNote = frostDays + ' gece don · ' + nearFrostDays + ' gece 0–3 °C';
        } else if (nearFrostDays >= 3) {
          frostTone = 'ok';
          frostLabel = 'Hafif soğuk riski';
          frostNote = nearFrostDays + ' gece 0–3 °C (tahmin)';
        }

        var windTone = 'good';
        var windLabel = 'Rüzgâr ölçümü yok';
        var windNote = 'Open-Meteo rüzgâr alanı alınamadı.';
        if (maxWind != null) {
          if (maxWind >= 55) {
            windTone = 'bad';
            windLabel = 'Sert rüzgâr';
            windNote = '14g max ≈ ' + Math.round(maxWind) + ' km/s — kış yalıtımı / yön önemli';
          } else if (maxWind >= 40) {
            windTone = 'mid';
            windLabel = 'Orta-kuvvetli rüzgâr';
            windNote = '14g max ≈ ' + Math.round(maxWind) + ' km/s · ort. max ≈ ' +
              (avgWind != null ? Math.round(avgWind) : '—') + ' km/s';
          } else {
            windTone = 'good';
            windLabel = 'Ilımlı rüzgâr';
            windNote = '14g max ≈ ' + Math.round(maxWind) + ' km/s · ort. max ≈ ' +
              (avgWind != null ? Math.round(avgWind) : '—') + ' km/s';
          }
        }

        /* Karniyol: iyi kışlayan ırk; don+sert rüzgâr+yüksek rakım birlikte zorlar. */
        var winterScore = 72;
        if (frostDays >= 5) winterScore -= 18;
        else if (frostDays >= 1) winterScore -= 8;
        else if (nearFrostDays >= 3) winterScore -= 4;
        if (maxWind != null && maxWind >= 55) winterScore -= 12;
        else if (maxWind != null && maxWind >= 40) winterScore -= 6;
        if (elev != null && elev >= 1800) winterScore -= 8;
        else if (elev != null && elev >= 1200) winterScore -= 3;
        if (avgMin != null && avgMin >= 5) winterScore += 6;
        winterScore = Math.max(25, Math.min(92, winterScore));

        var winterTone = winterScore >= 70 ? 'good' : winterScore >= 55 ? 'ok' : winterScore >= 40 ? 'mid' : 'bad';
        var winterLabel =
          winterScore >= 70
            ? 'Karniyol için kışlama uygun'
            : winterScore >= 55
              ? 'Karniyol kışlama: dikkatli'
              : winterScore >= 40
                ? 'Kışlama zorlayıcı'
                : 'Kışlama riskli';
        var winterNote =
          'Karniyol soğuğa dayanıklıdır; yine de yalıtım, rüzgâr yönü ve kış stoğu kritik. ' +
          'Skor yalnız Open-Meteo tahmin + rakım — sensör yok.';

        return {
          lat: lat,
          lon: lon,
          elevM: elev,
          frost: {
            tone: frostTone,
            label: frostLabel,
            note: frostNote,
            frostDays: frostDays,
            nearFrostDays: nearFrostDays,
            minTempC: minT != null ? Math.round(minT * 10) / 10 : null,
            avgMinC: avgMin != null ? Math.round(avgMin * 10) / 10 : null,
            avgMaxC: avgMax != null ? Math.round(avgMax * 10) / 10 : null
          },
          wind: {
            tone: windTone,
            label: windLabel,
            note: windNote,
            maxKmh: maxWind != null ? Math.round(maxWind) : null,
            avgMaxKmh: avgWind != null ? Math.round(avgWind) : null,
            available: maxWind != null
          },
          wintering: {
            score: winterScore,
            tone: winterTone,
            label: winterLabel,
            note: winterNote,
            breed: 'Karniyol'
          },
          precipSum14Mm: precip14,
          source: 'open-meteo-forecast-14d',
          fetchedAt: new Date().toISOString()
        };
      });
  }

  function renderSeasonPanelHtml(season, escapeHtml) {
    escapeHtml =
      escapeHtml ||
      function (s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    if (!season) {
      return (
        '<div class="season-panel is-empty">' +
          '<p>Konum kaydedilince don riski, rüzgâr ve Karniyol kışlama burada görünür.</p>' +
        '</div>'
      );
    }
    var f = season.frost || {};
    var w = season.wind || {};
    var wi = season.wintering || {};
    return (
      '<div class="season-panel" data-winter="' +
      escapeHtml(String(wi.score != null ? wi.score : '')) +
      '">' +
        '<div class="season-head">' +
          '<strong>Mevsim / kışlama</strong>' +
          '<span class="season-badge tone-' +
          escapeHtml(wi.tone || 'mid') +
          '">' +
          escapeHtml(String(wi.score != null ? wi.score : '—')) +
          ' · Karniyol</span>' +
        '</div>' +
        '<p class="season-sub">Canlı Open-Meteo 14 günlük tahmin — sensör yok.</p>' +
        '<div class="season-row">' +
          '<div class="season-k">Don riski <span class="season-tag tone-' +
          escapeHtml(f.tone || 'mid') +
          '">' +
          escapeHtml(f.label || '—') +
          '</span></div>' +
          '<div class="season-v">' +
          escapeHtml(f.note || '') +
          (f.minTempC != null ? ' · min ' + escapeHtml(String(f.minTempC)) + ' °C' : '') +
          '</div>' +
        '</div>' +
        '<div class="season-row">' +
          '<div class="season-k">Rüzgâr <span class="season-tag tone-' +
          escapeHtml(w.tone || 'mid') +
          '">' +
          escapeHtml(w.label || '—') +
          '</span></div>' +
          '<div class="season-v">' +
          escapeHtml(w.note || '') +
          '</div>' +
        '</div>' +
        '<div class="season-row">' +
          '<div class="season-k">Kışlama <span class="season-tag tone-' +
          escapeHtml(wi.tone || 'mid') +
          '">' +
          escapeHtml(wi.label || '—') +
          '</span></div>' +
          '<div class="season-v">' +
          escapeHtml(wi.note || '') +
          (season.elevM != null ? ' · rakım ' + escapeHtml(String(season.elevM)) + ' m' : '') +
          '</div>' +
        '</div>' +
        (season.precipSum14Mm != null
          ? '<div class="season-row"><div class="season-k">14g yağış <span class="season-tag">tahmin</span></div><div class="season-v">' +
            escapeHtml(String(season.precipSum14Mm) + ' mm') +
            '</div></div>'
          : '') +
        '<p class="season-disc">Kaynak: Open-Meteo Forecast. Uydu NDVI / sahte sensör yok.</p>' +
      '</div>'
    );
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
      ' km yarıçapta geziyor (foraj çemberi).' +
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
      (function () {
        if (!analysis.flight) return '';
        var f = analysis.flight;
        function fmtH(h) {
          if (h == null || !isFinite(Number(h))) return null;
          var n = Math.round(Number(h) * 10) / 10;
          if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
          return String(n).replace('.', ',');
        }
        return (
          '<div class="forage-flight">' +
            '<div class="forage-flight-head">Uçuş / yağış özeti</div>' +
            '<p class="forage-flight-sum">' +
            escapeHtml(f.summary || '') +
            '</p>' +
            (f.precipDays != null
              ? '<div class="forage-row"><div class="forage-k">Yağışlı gün <span class="forage-tag">sezon</span></div><div class="forage-v">' +
                escapeHtml(String(f.precipDays) + ' gün') +
                '</div></div>'
              : '') +
            (f.rainHoursSum != null
              ? '<div class="forage-row"><div class="forage-k">Yağışlı saat <span class="forage-tag">toplam</span></div><div class="forage-v">' +
                escapeHtml('~' + fmtH(f.rainHoursSum) + ' saat') +
                (f.rainHoursAvg != null
                  ? escapeHtml(' · ort. ' + fmtH(f.rainHoursAvg) + ' sa/gün')
                  : '') +
                '</div></div>'
              : '') +
            (f.flightOkDays != null
              ? '<div class="forage-row"><div class="forage-k">Uçuş penceresi <span class="forage-tag tone-' +
                escapeHtml(f.tone || 'mid') +
                '">özet</span></div><div class="forage-v">' +
                escapeHtml(
                  'uçuşa daha uygun gün ≈ ' +
                    f.flightOkDays +
                    (f.poorFlightDays != null
                      ? ' (elverişsiz ' + f.poorFlightDays + ')'
                      : '')
                ) +
                '</div></div>'
              : '') +
            (f.tip
              ? '<p class="forage-flight-tip">' + escapeHtml(f.tip) + '</p>'
              : '') +
          '</div>'
        );
      })() +
      (function () {
        var lc = analysis.landCover;
        if (analysis.landCoverAvailable && lc) {
          return (
            '<div class="forage-landcover">' +
              '<div class="forage-landcover-head">Bitki örtüsü (OSM canlı)</div>' +
              '<p class="forage-landcover-sum">' +
              escapeHtml(lc.summaryTr || '') +
              '</p>' +
              '<div class="forage-row"><div class="forage-k">İyi foraj <span class="forage-tag">çayır/bahçe/tarım</span></div><div class="forage-v">' +
              escapeHtml('%' + Math.round(Number(lc.goodPct) || 0)) +
              '</div></div>' +
              '<div class="forage-row"><div class="forage-k">Orman / karışık <span class="forage-tag">wood/forest</span></div><div class="forage-v">' +
              escapeHtml('%' + Math.round(Number(lc.mixedPct) || 0)) +
              '</div></div>' +
              '<div class="forage-row"><div class="forage-k">Zayıf örtü <span class="forage-tag">yerleşim/sanayi</span></div><div class="forage-v">' +
              escapeHtml('%' + Math.round(Number(lc.poorPct) || 0)) +
              '</div></div>' +
              (lc.otherPct != null
                ? '<div class="forage-row"><div class="forage-k">Su / diğer <span class="forage-tag">not</span></div><div class="forage-v">' +
                  escapeHtml('%' + Math.round(Number(lc.otherPct) || 0)) +
                  '</div></div>'
                : '') +
              '<p class="forage-landcover-note">' +
              escapeHtml(
                (lc.coverageNote || '') +
                  ' · uydu NDVI değil; OSM landuse/natural etiketleri'
              ) +
              '</p>' +
            '</div>'
          );
        }
        if (analysis.landCoverAvailable === false) {
          return (
            '<div class="forage-landcover is-miss">' +
              '<div class="forage-landcover-head">Bitki örtüsü</div>' +
              '<p class="forage-landcover-sum">Canlı örtü alınamadı — skor rakım+iklim</p>' +
            '</div>'
          );
        }
        return '';
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
    '.forage-flight{margin-top:10px;padding:10px 11px;border-radius:12px;background:#fff8f0;border:1px solid #e0b88a;}',
    '.forage-flight-head{font-size:12px;font-weight:800;color:#5a3a1a;margin:0 0 4px;}',
    '.forage-flight-sum{font-size:11px;font-weight:650;color:#6a4f34;margin:0 0 8px;line-height:1.4;}',
    '.forage-flight .forage-row{margin-top:4px;}',
    '.forage-flight-tip{margin:8px 0 0;font-size:10px;font-weight:560;color:#8a7358;line-height:1.35;}',
    '.forage-tag.tone-good{color:#3d5a2a;}',
    '.forage-tag.tone-ok{color:#4a2f1a;}',
    '.forage-tag.tone-mid{color:#6a4220;}',
    '.forage-tag.tone-bad{color:#8a2e1c;}',
    '.forage-landcover{margin-top:10px;padding:10px 11px;border-radius:12px;background:#f3faf3;border:1px solid #9bb87a;}',
    '.forage-landcover.is-miss{background:#f7f5f0;border-color:#d0c8b8;}',
    '.forage-landcover-head{font-size:12px;font-weight:800;color:#2e4a22;margin:0 0 4px;}',
    '.forage-landcover-sum{font-size:11px;font-weight:650;color:#3d5a2a;margin:0 0 8px;line-height:1.4;}',
    '.forage-landcover .forage-row{margin-top:4px;}',
    '.forage-landcover-note{margin:8px 0 0;font-size:10px;font-weight:560;color:#6a7a58;line-height:1.35;}',
    '.season-panel{margin-top:10px;padding:12px;border-radius:14px;background:#f4f7fb;border:1px solid #a8b8d0;}',
    '.season-panel.is-empty{color:#6b635a;font-size:12px;font-weight:600;}',
    '.season-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}',
    '.season-head strong{font-size:13px;color:#1e2a3a;}',
    '.season-badge{font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid #a8b8d0;color:#1e2a3a;white-space:nowrap;}',
    '.season-badge.tone-good{border-color:#9bb87a;color:#3d5a2a;}',
    '.season-badge.tone-ok{border-color:#e0c56a;}',
    '.season-badge.tone-mid{border-color:#d4a574;color:#6a4220;}',
    '.season-badge.tone-bad{border-color:#e0a090;color:#8a2e1c;}',
    '.season-sub{font-size:11px;color:#5a6570;font-weight:600;margin:0 0 8px;}',
    '.season-row{display:grid;gap:2px;margin-top:6px;}',
    '.season-k{font-size:11px;font-weight:700;color:#5a6570;}',
    '.season-tag{font-weight:700;opacity:.9;}',
    '.season-tag.tone-good{color:#3d5a2a;}',
    '.season-tag.tone-ok{color:#4a2f1a;}',
    '.season-tag.tone-mid{color:#6a4220;}',
    '.season-tag.tone-bad{color:#8a2e1c;}',
    '.season-v{font-size:12px;font-weight:700;color:#1e2a3a;line-height:1.35;}',
    '.season-disc{margin:8px 0 0;font-size:10px;color:#7a8490;line-height:1.35;font-weight:560;}'
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
    analyzeSeason: analyzeSeason,
    attachRadar: attachRadar,
    renderPanelHtml: renderPanelHtml,
    renderSeasonPanelHtml: renderSeasonPanelHtml,
    destination: destination,
    haversineKm: haversineKm
  };
})(window);
