/**
 * SüperArı — hava durumu geçmiş kayıtları (localStorage).
 * Ana Open-Meteo yanıtından günde 1 kayıt / arılık; eksik günler Open-Meteo
 * geçmiş (past_days / archive) ile otomatik doldurulur — uygulama o gün
 * açılmasa bile rapor süreklidir.
 */
(function (global) {
  var STORAGE_KEY = 'superari.hava.kayit.v1';
  var BACKFILL_META_KEY = 'superari.hava.backfill.v1';
  var RANGE_KEY = 'superari.hava.range.v1';
  var MAX_DAYS = 200; /* bal sezonu 15 May–15 Eyl = 124 gün; en az 130+ */
  var DEFAULT_BACKFILL_DAYS = 30;
  var PAST_DAYS_LIMIT = 92; /* Open-Meteo forecast past_days üst sınırı */
  var ARCHIVE_CHUNK_DAYS = 90;
  var RAIN_HOUR_THRESHOLD_MM = 0.1; /* saatlik yağış ≥ bu → yağış saati sayılır */
  var DEFAULT_APIARIES = [
    { id: 'a1', label: 'Kayaköy', lat: 39.92, lon: 41.27 },
    { id: 'a2', label: 'Tortum', lat: 40.257866, lon: 41.613415 },
    { id: 'a3', label: 'Palandöken', lat: 40.45, lon: 41.4 },
    { id: 'a4', label: 'Yanıkdağ Baluğundüzü', lat: 41.080781, lon: 40.753956 },
    { id: 'a5', label: 'Cimil Yaylası', lat: 40.733, lon: 40.789 }
  ];

  var backfillInFlight = null;

  function roundC(v) {
    var n = Math.round(Number(v));
    return isFinite(n) ? n : null;
  }

  function conditionFromCode(code, precipMm) {
    var c = Number(code) || 0;
    var p = Number(precipMm) || 0;
    if (p >= 2 || (c >= 51 && c <= 67) || c >= 80) return 'yagmur';
    if (c >= 95) return 'firtina';
    if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return 'kar';
    if (c <= 3) return 'acik';
    return 'bulutlu';
  }

  function labelFromCondition(condition) {
    var map = {
      acik: 'Açık',
      bulutlu: 'Bulutlu',
      yagmur: 'Yağmurlu',
      firtina: 'Fırtına',
      kar: 'Kar / soğuk'
    };
    return map[condition] || 'Bulutlu';
  }

  function localDateKey(d) {
    var dt = d ? new Date(d) : new Date();
    return (
      dt.getFullYear() +
      '-' +
      String(dt.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(dt.getDate()).padStart(2, '0')
    );
  }

  function addDaysKey(dateKey, delta) {
    var p = String(dateKey || '').split('-');
    if (p.length !== 3) return localDateKey();
    var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    dt.setDate(dt.getDate() + (delta || 0));
    return localDateKey(dt);
  }

  function dateKeysInclusive(fromKey, toKey) {
    var out = [];
    if (!fromKey || !toKey || fromKey > toKey) return out;
    var cur = fromKey;
    var guard = 0;
    while (cur <= toKey && guard < 500) {
      out.push(cur);
      cur = addDaysKey(cur, 1);
      guard++;
    }
    return out;
  }

  /* Regional honey-season profiles (MM-DD). Simple Turkey boxes by lat/lon. */
  var REGION_PROFILES = {
    dogu_anadolu: { fromMD: '05-15', toMD: '09-15', label: 'Doğu Anadolu bal sezonu' },
    ege_akdeniz: { fromMD: '05-01', toMD: '09-30', label: 'Ege / Akdeniz bal sezonu' },
    karadeniz: { fromMD: '05-15', toMD: '09-15', label: 'Karadeniz bal sezonu' },
    ic_anadolu: { fromMD: '06-01', toMD: '09-15', label: 'İç Anadolu bal sezonu' },
    marmara: { fromMD: '05-15', toMD: '09-15', label: 'Marmara bal sezonu' },
    fallback: { fromMD: '06-01', toMD: '09-30', label: 'Bal sezonu' }
  };

  var TR_MON_SHORT = [
    '',
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara'
  ];

  function detectRegion(lat, lon) {
    var La = Number(lat);
    var Lo = Number(lon);
    if (!isFinite(La) || !isFinite(Lo)) return 'fallback';
    /* Doğu Karadeniz yayla (Rize / İkizdere / Cimil) — before Doğu Anadolu box */
    if (La >= 40.4 && La <= 41.6 && Lo >= 39.8 && Lo <= 41.1) return 'karadeniz';
    /* East Anatolia (Erzurum yayla etc.) */
    if (La >= 37.0 && La <= 42.8 && Lo >= 38.0 && Lo <= 45.0) return 'dogu_anadolu';
    if (La >= 39.5 && La <= 42.2 && Lo >= 26.0 && Lo <= 30.8) return 'marmara';
    if (
      (La >= 36.0 && La <= 39.8 && Lo >= 26.0 && Lo <= 30.5) ||
      (La >= 36.0 && La <= 37.8 && Lo >= 30.5 && Lo <= 36.5)
    ) {
      return 'ege_akdeniz';
    }
    if (La >= 40.5 && La <= 42.5 && Lo >= 27.0 && Lo <= 42.5) return 'karadeniz';
    if (La >= 37.2 && La <= 40.8 && Lo >= 31.0 && Lo <= 37.5) return 'ic_anadolu';
    return 'fallback';
  }

  /**
   * Resolve coords for season: explicit lat/lon, else selected apiary,
   * else average (or first) of registered / DEMO_APIARIES.
   */
  function resolveSeasonCoords(lat, lon) {
    var La = Number(lat);
    var Lo = Number(lon);
    if (isFinite(La) && isFinite(Lo)) return { lat: La, lon: Lo };

    try {
      var raw = localStorage.getItem('superari.ana.selectedApiary');
      if (raw) {
        var parsed = JSON.parse(raw);
        var want = parsed && parsed.id ? String(parsed.id) : null;
        if (want && want !== 'all') {
          var byId = resolveApiaries();
          for (var i = 0; i < byId.length; i++) {
            if (byId[i].id === want) {
              return { lat: byId[i].lat, lon: byId[i].lon };
            }
          }
        }
      }
    } catch (eSel) {
      /* ignore */
    }

    var list = typeof resolveApiaries === 'function' ? resolveApiaries() : DEFAULT_APIARIES.slice();
    if (!list || !list.length) {
      return { lat: DEFAULT_APIARIES[0].lat, lon: DEFAULT_APIARIES[0].lon };
    }
    if (list.length === 1) return { lat: list[0].lat, lon: list[0].lon };
    var slat = 0;
    var slon = 0;
    var n = 0;
    for (var j = 0; j < list.length; j++) {
      var a = list[j];
      if (!a || !isFinite(Number(a.lat)) || !isFinite(Number(a.lon))) continue;
      slat += Number(a.lat);
      slon += Number(a.lon);
      n++;
    }
    if (n > 0) return { lat: slat / n, lon: slon / n };
    return { lat: list[0].lat, lon: list[0].lon };
  }

  function formatMdShort(iso) {
    var p = String(iso || '').split('-');
    if (p.length < 3) return iso || '';
    var day = Number(p[2]);
    var mon = Number(p[1]);
    var monLab = TR_MON_SHORT[mon] || p[1];
    return day + ' ' + monLab;
  }

  function balSeasonChipLabel(bounds) {
    var b = bounds || balSeasonBounds();
    return 'Bal sezonu (' + formatMdShort(b.from) + ' – ' + formatMdShort(b.to) + ')';
  }

  /**
   * balSeasonBounds(year, lat?, lon?)
   * Region from apiary location; if lat/lon omitted, selected apiary or avg/first.
   */
  function balSeasonBounds(year, lat, lon) {
    var y = year != null ? Number(year) : new Date().getFullYear();
    if (!isFinite(y)) y = new Date().getFullYear();
    var coords = resolveSeasonCoords(lat, lon);
    var region = detectRegion(coords.lat, coords.lon);
    var profile = REGION_PROFILES[region] || REGION_PROFILES.fallback;
    return {
      from: y + '-' + profile.fromMD,
      to: y + '-' + profile.toMD,
      preset: 'bal',
      region: region,
      regionLabel: profile.label,
      lat: coords.lat,
      lon: coords.lon
    };
  }

  function lastNDaysBounds(n) {
    var days = Math.max(1, Number(n) || 30);
    var to = localDateKey();
    return { from: addDaysKey(to, -(days - 1)), to: to, preset: String(days) };
  }

  /** Default: current-year regional Bal sezonu, to capped at today. */
  function defaultRange() {
    var bal = balSeasonBounds();
    var today = localDateKey();
    var to = bal.to > today ? today : bal.to;
    return {
      from: bal.from,
      to: to,
      preset: 'bal',
      region: bal.region,
      regionLabel: bal.regionLabel
    };
  }

  function clampRange(range) {
    var today = localDateKey();
    var from = range && range.from ? String(range.from) : null;
    var to = range && range.to ? String(range.to) : null;
    var preset = range && range.preset ? String(range.preset) : 'custom';
    if (!from || !to) return defaultRange();
    if (to > today) to = today;
    if (from > to) {
      var tmp = from;
      from = to;
      to = tmp;
    }
    return { from: from, to: to, preset: preset };
  }

  function loadRange() {
    try {
      var raw = localStorage.getItem(RANGE_KEY);
      if (!raw) return defaultRange();
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.from || !parsed.to) return defaultRange();
      /* Always refresh bal bounds from current apiary region */
      if (String(parsed.preset || '') === 'bal') return rangeFromPreset('bal');
      return clampRange(parsed);
    } catch (e) {
      return defaultRange();
    }
  }

  function saveRange(range) {
    var r = clampRange(range || defaultRange());
    try {
      localStorage.setItem(
        RANGE_KEY,
        JSON.stringify({ from: r.from, to: r.to, preset: r.preset || 'custom', at: Date.now() })
      );
    } catch (e) {
      /* ignore */
    }
    return r;
  }

  function rangeFromPreset(preset, lat, lon) {
    var p = String(preset || '');
    if (p === 'bal') {
      var bal = balSeasonBounds(null, lat, lon);
      var today = localDateKey();
      var clamped = clampRange({
        from: bal.from,
        to: bal.to > today ? today : bal.to,
        preset: 'bal'
      });
      clamped.region = bal.region;
      clamped.regionLabel = bal.regionLabel;
      return clamped;
    }
    if (p === '30' || p === 'son30') return lastNDaysBounds(30);
    if (p === '90' || p === 'son90') return lastNDaysBounds(90);
    /* custom: keep current stored dates, mark custom */
    var cur;
    try {
      var raw = localStorage.getItem(RANGE_KEY);
      cur = raw ? JSON.parse(raw) : null;
    } catch (eCur) {
      cur = null;
    }
    if (!cur || !cur.from || !cur.to) cur = defaultRange();
    return clampRange({ from: cur.from, to: cur.to, preset: 'custom' });
  }

  function daysBetweenKeys(fromKey, toKey) {
    return dateKeysInclusive(fromKey, toKey).length;
  }


  var LABEL_KAYAKOY = 'Kayaköy';
  var LABEL_YANIK = 'Yanıkdağ Baluğundüzü';
  var YANIK_TARGET_LAT = 41.080781;
  var YANIK_TARGET_LON = 40.753956;
  var YANIK_LEGACY_COORDS = [
    { lat: 39.95, lon: 41.30 },
    { lat: 41.072, lon: 40.743 }
  ];
  var TORTUM_TARGET_LAT = 40.257866;
  var TORTUM_TARGET_LON = 41.613415;

  function looksLikeYanikBalugLabel(s) {
    var lower = String(s || '').toLocaleLowerCase('tr');
    return (lower.indexOf('yanıkdağ') !== -1 && (
      lower.indexOf('baluğundüzü') !== -1 ||
      lower.indexOf('balığundüzü') !== -1 ||
      lower.indexOf('balığındüzü') !== -1 ||
      lower.indexOf('balığun') !== -1
    )) || lower.indexOf('baluğundüzü') !== -1 || lower.indexOf('balığundüzü') !== -1 ||
      lower.indexOf('balığındüzü') !== -1 || lower.indexOf('balığun') !== -1;
  }

  function isLegacyYanikWeatherCoords(r) {
    var lat = Number(r && r.lat);
    var lon = Number(r && r.lon);
    if (!isFinite(lat) || !isFinite(lon)) return false;
    return YANIK_LEGACY_COORDS.some(function (old) {
      return Math.abs(lat - old.lat) <= 0.02 && Math.abs(lon - old.lon) <= 0.02;
    });
  }

  function isLegacyTortumWeatherCoords(r) {
    var lat = Number(r && r.lat);
    var lon = Number(r && r.lon);
    return isFinite(lat) && isFinite(lon) && Math.abs(lat - 40.61) <= 0.02 && Math.abs(lon - 41.66) <= 0.02;
  }

  function isNearWeatherTarget(r, targetLat, targetLon) {
    var lat = Number(r && r.lat);
    var lon = Number(r && r.lon);
    return isFinite(lat) && isFinite(lon) && Math.abs(lat - targetLat) <= 0.0005 && Math.abs(lon - targetLon) <= 0.0005;
  }

  function migrateHavaLabels(list) {
    var changed = false;
    var out = (list || []).map(function (r) {
      if (!r) return r;
      var lab = String(r.label || '').trim();
      var id = String(r.apiaryId || '');
      var nameOrPlace = String(r.name || '') + ' ' + String(r.place || '');
      var next = lab;
      /* Undo bad a1 rename */
      if (id === 'a1' && looksLikeYanikBalugLabel(lab)) next = LABEL_KAYAKOY;
      else if (looksLikeYanikBalugLabel(lab) || looksLikeYanikBalugLabel(nameOrPlace) || lab === 'Yanıkdağ' || /^Yanıkdağ(\s|$)/i.test(lab)) {
        if (lab.toLocaleLowerCase('tr').indexOf('kayaköy') === -1) next = LABEL_YANIK;
      }
      var nextLat = r.lat;
      var nextLon = r.lon;
      var isYanik = id === 'a4' || (id !== 'a2' && (looksLikeYanikBalugLabel(lab) || looksLikeYanikBalugLabel(nameOrPlace)));
      if (isYanik && !isNearWeatherTarget(r, YANIK_TARGET_LAT, YANIK_TARGET_LON)) {
        nextLat = YANIK_TARGET_LAT;
        nextLon = YANIK_TARGET_LON;
      }
      var isTortum = id === 'a2' || (id !== 'a4' && (/tortum/i.test(lab) || /tortum/i.test(nameOrPlace)));
      if (!isYanik && isTortum && !isNearWeatherTarget(r, TORTUM_TARGET_LAT, TORTUM_TARGET_LON)) {
        nextLat = TORTUM_TARGET_LAT;
        nextLon = TORTUM_TARGET_LON;
      }
      if (next === lab && nextLat === r.lat && nextLon === r.lon) return r;
      changed = true;
      var copy = {};
      for (var k in r) {
        if (Object.prototype.hasOwnProperty.call(r, k)) copy[k] = r[k];
      }
      copy.label = next;
      copy.lat = nextLat;
      copy.lon = nextLon;
      return copy;
    });
    return { list: out, changed: changed };
  }

  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var mig = migrateHavaLabels(parsed);
      if (mig.changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mig.list));
        } catch (eMig) { /* ignore */ }
      }
      return mig.list;
    } catch (e) {
      return [];
    }
  }

  function saveRecords(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function loadBackfillMeta() {
    try {
      var raw = localStorage.getItem(BACKFILL_META_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveBackfillMeta(meta) {
    try {
      localStorage.setItem(BACKFILL_META_KEY, JSON.stringify(meta || {}));
    } catch (e) {
      /* ignore */
    }
  }

  function prune(list) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    var key = localDateKey(cutoff);
    return (list || []).filter(function (r) {
      return r && r.date && r.date >= key;
    });
  }

  function seedDemo() {
    var apiaries = DEFAULT_APIARIES;
    var codes = [0, 1, 2, 3, 61, 63, 80, 95, 71];
    var out = [];
    var today = new Date();
    for (var d = 13; d >= 1; d--) {
      var dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      var date = localDateKey(dt);
      for (var i = 0; i < apiaries.length; i++) {
        var a = apiaries[i];
        var code = codes[(d + i * 3) % codes.length];
        var base = 14 + ((d + i) % 9);
        var low = base - 4 - (i % 2);
        var high = base + 5 + (i % 3);
        var temp = Math.round((low + high) / 2);
        var precip = code >= 51 ? 1.5 + (d % 4) : 0;
        var cond = conditionFromCode(code, precip);
        out.push({
          id: a.id + ':' + date,
          apiaryId: a.id,
          label: a.label,
          lat: a.lat,
          lon: a.lon,
          date: date,
          at: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0).toISOString(),
          temp: temp,
          high: high,
          low: low,
          weatherCode: code,
          condition: cond,
          conditions: labelFromCondition(cond),
          precipMm: Math.round(precip * 10) / 10,
          rainHours: precip > 0 ? 1 + (d % 4) : 0,
          dayAvgTemp: Math.round((high * 0.65 + temp * 0.35) * 10) / 10,
          nightAvgTemp: Math.round((low * 0.65 + temp * 0.35) * 10) / 10,
          source: 'seed'
        });
      }
    }
    return out;
  }

  function ensureSeed() {
    var list = loadRecords();
    var range = loadRange();
    var bfOpts = { from: range.from, to: range.to };
    if (list.length) {
      scheduleBackfill(bfOpts);
      return list;
    }
    list = seedDemo();
    saveRecords(list);
    scheduleBackfill(bfOpts);
    return list;
  }

  function todayHiLo(daily) {
    if (!daily || !daily.time || !daily.time.length) return { high: null, low: null, precipMm: 0, weatherCode: null };
    var today = localDateKey();
    var idx = daily.time.indexOf(today);
    if (idx < 0) idx = 0;
    return {
      high: roundC(daily.temperature_2m_max && daily.temperature_2m_max[idx]),
      low: roundC(daily.temperature_2m_min && daily.temperature_2m_min[idx]),
      precipMm:
        daily.precipitation_sum && daily.precipitation_sum[idx] != null
          ? Math.round(Number(daily.precipitation_sum[idx]) * 10) / 10
          : 0,
      weatherCode:
        daily.weather_code && daily.weather_code[idx] != null ? Number(daily.weather_code[idx]) : null
    };
  }

  function sortRecords(list) {
    list.sort(function (a, b) {
      if (a.date === b.date) return String(a.apiaryId).localeCompare(String(b.apiaryId));
      return a.date < b.date ? -1 : 1;
    });
    return list;
  }

  function upsertRow(list, row, preferLive) {
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === row.id) {
        var existing = list[i];
        /* Canlı Ana kaydı arşiv ile ezilmesin */
        if (
          preferLive &&
          existing &&
          existing.source === 'open_meteo' &&
          row.source !== 'open_meteo'
        ) {
          /* Canlı kaydı koru; eksik rainHours / gece-gündüz ort. doldur */
          if (existing.rainHours == null && row.rainHours != null) {
            existing.rainHours = row.rainHours;
          }
          if (existing.dayAvgTemp == null && row.dayAvgTemp != null) {
            existing.dayAvgTemp = row.dayAvgTemp;
          }
          if (existing.nightAvgTemp == null && row.nightAvgTemp != null) {
            existing.nightAvgTemp = row.nightAvgTemp;
          }
          found = true;
          break;
        }
        list[i] = row;
        found = true;
        break;
      }
    }
    if (!found) list.push(row);
    return list;
  }

  /**
   * Upsert one snapshot per arılık per local calendar day.
   * Safe to call on every successful Open-Meteo response — does not spam API.
   */
  function recordFromMeteo(opts) {
    if (!opts || !opts.apiaryId) return null;
    var meteo = opts.meteo || {};
    var cur = meteo.current || {};
    var daily = meteo.daily || null;
    var day = todayHiLo(daily);
    var temp = roundC(cur.temperature_2m != null ? cur.temperature_2m : opts.temp);
    var code =
      cur.weather_code != null
        ? Number(cur.weather_code)
        : day.weatherCode != null
          ? day.weatherCode
          : opts.weatherCode != null
            ? Number(opts.weatherCode)
            : 0;
    var precip = day.precipMm || 0;
    var condition = conditionFromCode(code, precip);
    var date = localDateKey();
    var id = opts.apiaryId + ':' + date;
    var rainHours = null;
    var dayAvgTemp = null;
    var nightAvgTemp = null;
    if (meteo.hourly) {
      var rhMap = rainHoursFromHourly(meteo.hourly);
      if (rhMap[date] != null) rainHours = rhMap[date];
      var dnMap = dayNightAvgFromHourly(meteo.hourly);
      if (dnMap[date]) {
        if (dnMap[date].dayAvgTemp != null) dayAvgTemp = dnMap[date].dayAvgTemp;
        if (dnMap[date].nightAvgTemp != null) nightAvgTemp = dnMap[date].nightAvgTemp;
      }
    } else if (
      daily &&
      daily.precipitation_hours &&
      daily.time
    ) {
      var pidx = daily.time.indexOf(date);
      if (pidx < 0) pidx = 0;
      if (daily.precipitation_hours[pidx] != null) {
        rainHours = Math.round(Number(daily.precipitation_hours[pidx]) * 10) / 10;
      }
    }
    var row = {
      id: id,
      apiaryId: String(opts.apiaryId),
      label: String(opts.label || opts.apiaryId),
      lat: Number(opts.lat) || 0,
      lon: Number(opts.lon) || 0,
      date: date,
      at: new Date().toISOString(),
      temp: temp,
      high: day.high != null ? day.high : temp,
      low: day.low != null ? day.low : temp,
      weatherCode: code,
      condition: condition,
      conditions: labelFromCondition(condition),
      precipMm: precip,
      rainHours: rainHours,
      dayAvgTemp: dayAvgTemp,
      nightAvgTemp: nightAvgTemp,
      source: 'open_meteo'
    };

    var list = prune(loadRecords());
    upsertRow(list, row, false);
    sortRecords(list);
    saveRecords(list);
    return row;
  }

  function resolveApiaries(extra) {
    var map = {};
    function add(a) {
      if (!a || !a.id) return;
      var lat = Number(a.lat);
      var lon = Number(a.lon);
      if (!isFinite(lat) || !isFinite(lon)) return;
      var id = String(a.id);
      var label = String(a.label || a.name || a.place || id);
      if (!map[id]) {
        map[id] = { id: id, label: label, lat: lat, lon: lon };
      } else {
        if (label && label !== id) map[id].label = label;
        map[id].lat = lat;
        map[id].lon = lon;
      }
    }

    var fromDemo = false;
    try {
      if (global.SuperAriDemo && typeof global.SuperAriDemo.loadApiaries === 'function') {
        var demoList = global.SuperAriDemo.loadApiaries();
        if (demoList && demoList.length) {
          fromDemo = true;
          for (var d = 0; d < demoList.length; d++) {
            var da = demoList[d];
            add({
              id: da.id,
              label: da.place || da.name || da.id,
              lat: da.lat,
              lon: da.lon
            });
          }
        }
      } else if (global.SuperAriDemo && global.SuperAriDemo.apiaries && global.SuperAriDemo.apiaries.length) {
        fromDemo = true;
        var demoList2 = global.SuperAriDemo.apiaries;
        for (var d2 = 0; d2 < demoList2.length; d2++) {
          var da2 = demoList2[d2];
          add({
            id: da2.id,
            label: da2.place || da2.name || da2.id,
            lat: da2.lat,
            lon: da2.lon
          });
        }
      }
    } catch (eDemo) {
      /* ignore */
    }

    /* Only fall back to DEFAULT when no live demo list — never resurrect deleted names
       from weather records or seed defaults when SuperAriDemo has the live set. */
    if (!fromDemo) {
      DEFAULT_APIARIES.forEach(add);
    }

    if (extra && extra.length) {
      for (var j = 0; j < extra.length; j++) add(extra[j]);
    }

    return Object.keys(map).map(function (k) {
      return map[k];
    });
  }

  function missingDatesForApiary(apiaryId, fromKey, toKey, list) {
    var have = {};
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || r.apiaryId !== apiaryId || !r.date) continue;
      /* seed sayılmaz — gerçek veri ile değiştirilecek */
      if (r.source === 'seed') continue;
      have[r.date] = true;
    }
    return dateKeysInclusive(fromKey, toKey).filter(function (dk) {
      return !have[dk];
    });
  }

  function needsBackfill(apiaries, days) {
    var today = localDateKey();
    var from = addDaysKey(today, -(Math.max(1, days) - 1));
    var list = loadRecords();
    var meta = loadBackfillMeta();
    for (var i = 0; i < apiaries.length; i++) {
      var a = apiaries[i];
      var miss = missingDatesForApiary(a.id, from, today, list);
      if (miss.length) return true;
      if (meta[a.id] !== today) return true;
    }
    return false;
  }

  /**
   * Saatlik precipitation dizisinden gün başına yağış süresi (saat).
   * precip >= RAIN_HOUR_THRESHOLD_MM olan her saat +1.
   */
  function rainHoursFromHourly(hourly, threshold) {
    var map = {};
    var thr = threshold != null ? Number(threshold) : RAIN_HOUR_THRESHOLD_MM;
    if (!isFinite(thr)) thr = 0.1;
    if (!hourly || !hourly.time || !hourly.time.length) return map;
    var precipArr = hourly.precipitation;
    if (!precipArr || !precipArr.length) return map;
    for (var i = 0; i < hourly.time.length; i++) {
      var t = String(hourly.time[i] || '');
      if (t.length < 10) continue;
      var date = t.slice(0, 10);
      var p = precipArr[i] != null ? Number(precipArr[i]) : 0;
      if (!isFinite(p)) p = 0;
      if (p >= thr) map[date] = (map[date] || 0) + 1;
    }
    return map;
  }

  function formatRainHours(h) {
    if (h == null || !isFinite(Number(h))) return null;
    var n = Math.round(Number(h) * 10) / 10;
    if (n <= 0) return '0 saat';
    if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n) + ' saat';
    return String(n).replace('.', ',') + ' saat';
  }

  function formatPrecipLine(precipMm, rainHours) {
    var mm = precipMm != null && isFinite(Number(precipMm)) ? Number(precipMm) : 0;
    var mmLab = (Math.round(mm * 10) / 10) + ' mm';
    if (rainHours == null || !isFinite(Number(rainHours))) {
      return mm > 0 ? 'Yağış ' + mmLab : null;
    }
    var hLab = formatRainHours(rainHours);
    if (mm <= 0 && Number(rainHours) <= 0) return null;
    return 'Yağış ' + mmLab + ' · ~' + hLab;
  }

  /**
   * Saatlik temperature_2m'den gün/gece ortalama (°C, 1 ondalık).
   * Gündüz: yerel saat 06–19; Gece: 20–23 ve 00–05.
   * Dönüş: { [date]: { dayAvgTemp, nightAvgTemp } }
   */
  function dayNightAvgFromHourly(hourly) {
    var daySum = {};
    var dayN = {};
    var nightSum = {};
    var nightN = {};
    if (!hourly || !hourly.time || !hourly.time.length) return {};
    var temps = hourly.temperature_2m;
    if (!temps || !temps.length) return {};
    for (var i = 0; i < hourly.time.length; i++) {
      var t = String(hourly.time[i] || '');
      if (t.length < 13) continue;
      var date = t.slice(0, 10);
      var hour = Number(t.slice(11, 13));
      if (!isFinite(hour)) continue;
      var temp = temps[i] != null ? Number(temps[i]) : NaN;
      if (!isFinite(temp)) continue;
      if (hour >= 6 && hour <= 19) {
        daySum[date] = (daySum[date] || 0) + temp;
        dayN[date] = (dayN[date] || 0) + 1;
      } else {
        nightSum[date] = (nightSum[date] || 0) + temp;
        nightN[date] = (nightN[date] || 0) + 1;
      }
    }
    var map = {};
    var seen = {};
    var d;
    for (d in daySum) {
      if (Object.prototype.hasOwnProperty.call(daySum, d)) seen[d] = true;
    }
    for (d in nightSum) {
      if (Object.prototype.hasOwnProperty.call(nightSum, d)) seen[d] = true;
    }
    for (d in seen) {
      if (!Object.prototype.hasOwnProperty.call(seen, d)) continue;
      map[d] = {
        dayAvgTemp: dayN[d] ? Math.round((daySum[d] / dayN[d]) * 10) / 10 : null,
        nightAvgTemp: nightN[d] ? Math.round((nightSum[d] / nightN[d]) * 10) / 10 : null
      };
    }
    return map;
  }

  /** Ortalama sıcaklık etiketi (tek değer). */
  function formatAvgWithDayNight(avg, night, day) {
    if (avg == null || !isFinite(Number(avg))) return '—';
    return Number(avg) + '°';
  }

  function rowFromDailyIndex(apiary, daily, idx, source, rainHoursMap, dayNightMap) {
    if (!daily || !daily.time || idx < 0 || idx >= daily.time.length) return null;
    var date = daily.time[idx];
    if (!date) return null;
    var high = roundC(daily.temperature_2m_max && daily.temperature_2m_max[idx]);
    var low = roundC(daily.temperature_2m_min && daily.temperature_2m_min[idx]);
    var precip =
      daily.precipitation_sum && daily.precipitation_sum[idx] != null
        ? Math.round(Number(daily.precipitation_sum[idx]) * 10) / 10
        : 0;
    var code =
      daily.weather_code && daily.weather_code[idx] != null
        ? Number(daily.weather_code[idx])
        : 0;
    var temp =
      high != null && low != null
        ? Math.round((high + low) / 2)
        : high != null
          ? high
          : low;
    var condition = conditionFromCode(code, precip);
    var parts = date.split('-');
    var atIso =
      parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).toISOString()
        : new Date().toISOString();
    var rainHours = null;
    if (rainHoursMap && rainHoursMap[date] != null) {
      rainHours = Number(rainHoursMap[date]) || 0;
    } else if (daily.precipitation_hours && daily.precipitation_hours[idx] != null) {
      /* Open-Meteo daily precipitation_hours yedek */
      rainHours = Math.round(Number(daily.precipitation_hours[idx]) * 10) / 10;
    }
    var dayAvgTemp = null;
    var nightAvgTemp = null;
    if (dayNightMap && dayNightMap[date]) {
      if (dayNightMap[date].dayAvgTemp != null) dayAvgTemp = dayNightMap[date].dayAvgTemp;
      if (dayNightMap[date].nightAvgTemp != null) nightAvgTemp = dayNightMap[date].nightAvgTemp;
    }
    return {
      id: apiary.id + ':' + date,
      apiaryId: String(apiary.id),
      label: String(apiary.label || apiary.id),
      lat: Number(apiary.lat) || 0,
      lon: Number(apiary.lon) || 0,
      date: date,
      at: atIso,
      temp: temp,
      high: high != null ? high : temp,
      low: low != null ? low : temp,
      weatherCode: code,
      condition: condition,
      conditions: labelFromCondition(condition),
      precipMm: precip,
      rainHours: rainHours,
      dayAvgTemp: dayAvgTemp,
      nightAvgTemp: nightAvgTemp,
      source: source || 'open_meteo_archive'
    };
  }

  function fetchForecastPast(apiary, pastDays) {
    var days = Math.min(92, Math.max(1, pastDays || DEFAULT_BACKFILL_DAYS));
    var url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      encodeURIComponent(apiary.lat) +
      '&longitude=' +
      encodeURIComponent(apiary.lon) +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_hours' +
      '&hourly=precipitation,temperature_2m' +
      '&timezone=auto&past_days=' +
      days +
      '&forecast_days=1';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('meteo_past_' + r.status);
      return r.json();
    });
  }

  function fetchArchiveRange(apiary, startKey, endKey) {
    var url =
      'https://archive-api.open-meteo.com/v1/archive?latitude=' +
      encodeURIComponent(apiary.lat) +
      '&longitude=' +
      encodeURIComponent(apiary.lon) +
      '&start_date=' +
      encodeURIComponent(startKey) +
      '&end_date=' +
      encodeURIComponent(endKey) +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_hours' +
      '&hourly=precipitation,temperature_2m' +
      '&timezone=auto';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('meteo_archive_' + r.status);
      return r.json();
    });
  }

  function emptyDaily() {
    return {
      time: [],
      temperature_2m_max: [],
      temperature_2m_min: [],
      weather_code: [],
      precipitation_sum: [],
      precipitation_hours: []
    };
  }

  function emptyHourly() {
    return { time: [], precipitation: [], temperature_2m: [] };
  }

  function mergeDaily(into, meteo) {
    var acc = into || { daily: emptyDaily(), hourly: emptyHourly() };
    if (!acc.daily) acc.daily = emptyDaily();
    if (!acc.hourly) acc.hourly = emptyHourly();
    var src = meteo && meteo.daily;
    if (src && src.time && src.time.length) {
      var d = acc.daily;
      var keys = [
        'time',
        'temperature_2m_max',
        'temperature_2m_min',
        'weather_code',
        'precipitation_sum',
        'precipitation_hours'
      ];
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (!d[key]) d[key] = [];
        var arr = src[key] || [];
        for (var i = 0; i < arr.length; i++) d[key].push(arr[i]);
      }
    }
    var hs = meteo && meteo.hourly;
    if (hs && hs.time && hs.time.length) {
      var h = acc.hourly;
      if (!h.time) h.time = [];
      if (!h.precipitation) h.precipitation = [];
      if (!h.temperature_2m) h.temperature_2m = [];
      for (var j = 0; j < hs.time.length; j++) {
        h.time.push(hs.time[j]);
        h.precipitation.push(hs.precipitation ? hs.precipitation[j] : null);
        h.temperature_2m.push(hs.temperature_2m ? hs.temperature_2m[j] : null);
      }
    }
    return acc;
  }

  /** Open-Meteo archive date ranges — chunk long bal-season windows. */
  function fetchArchiveRangeChunked(apiary, startKey, endKey) {
    if (!startKey || !endKey || startKey > endKey) {
      return Promise.resolve({ daily: emptyDaily() });
    }
    var keys = dateKeysInclusive(startKey, endKey);
    if (!keys.length) return Promise.resolve({ daily: emptyDaily() });
    var chunkSize = ARCHIVE_CHUNK_DAYS;
    var segments = [];
    for (var i = 0; i < keys.length; i += chunkSize) {
      var slice = keys.slice(i, i + chunkSize);
      segments.push({ start: slice[0], end: slice[slice.length - 1] });
    }
    var chain = Promise.resolve({ daily: emptyDaily() });
    segments.forEach(function (seg) {
      chain = chain.then(function (acc) {
        return fetchArchiveRange(apiary, seg.start, seg.end).then(function (meteo) {
          return mergeDaily(acc, meteo);
        });
      });
    });
    return chain;
  }

  function applyDailyToList(list, apiary, daily, wantSet, source, rainHoursMap, dayNightMap) {
    if (!daily || !daily.time) return 0;
    var added = 0;
    for (var i = 0; i < daily.time.length; i++) {
      var date = daily.time[i];
      if (wantSet && !wantSet[date]) continue;
      var row = rowFromDailyIndex(apiary, daily, i, source, rainHoursMap, dayNightMap);
      if (!row) continue;
      /* Gerçek sıcaklık yoksa yazma — sahte/sentetik üretme */
      if (row.temp == null && row.high == null && row.low == null) continue;
      upsertRow(list, row, true);
      added++;
    }
    return added;
  }

  function applyMeteoPayload(list, apiary, meteo, wantSet, source) {
    var daily = meteo && meteo.daily;
    var rainMap = rainHoursFromHourly(meteo && meteo.hourly);
    var dnMap = dayNightAvgFromHourly(meteo && meteo.hourly);
    return applyDailyToList(list, apiary, daily, wantSet, source, rainMap, dnMap);
  }

  /**
   * Eksik günleri Open-Meteo geçmiş verisiyle doldurur (uygulama kapalı olsa bile).
   * from/to verilirse TÜM aralık (bal sezonu 124 gün vb.) — DEFAULT_BACKFILL_DAYS=30 ile sınırlama.
   * Promise<{ filled, apiaries }>.
   */
  function backfillMissing(opts) {
    opts = opts || {};
    var today = localDateKey();
    var fromKey;
    var toKey = today;
    var days;
    if (opts.from && opts.to) {
      var clamped = clampRange({ from: opts.from, to: opts.to, preset: opts.preset || 'custom' });
      fromKey = clamped.from;
      toKey = clamped.to;
      days = daysBetweenKeys(fromKey, toKey) || DEFAULT_BACKFILL_DAYS;
      /* Uzun aralıkta from'u MAX_DAYS ile budama (to sabit) */
      if (days > MAX_DAYS) {
        fromKey = addDaysKey(toKey, -(MAX_DAYS - 1));
        days = daysBetweenKeys(fromKey, toKey);
      }
    } else {
      days = Number(opts.days) || DEFAULT_BACKFILL_DAYS;
      if (days > MAX_DAYS) days = MAX_DAYS;
      fromKey = addDaysKey(today, -(days - 1));
      toKey = today;
    }
    var apiaries = resolveApiaries(opts.apiaries);
    if (!apiaries.length) {
      return Promise.resolve({ filled: 0, apiaries: 0 });
    }

    if (!opts.force && !opts.from && !needsBackfill(apiaries, days)) {
      return Promise.resolve({ filled: 0, apiaries: apiaries.length, skipped: true });
    }

    if (backfillInFlight && !opts.force) return backfillInFlight;

    var run = Promise.resolve()
      .then(function () {
        var chain = Promise.resolve(0);
        var meta = loadBackfillMeta();

        apiaries.forEach(function (apiary) {
          chain = chain.then(function (filledSoFar) {
            var list = prune(loadRecords());
            var missing = missingDatesForApiary(apiary.id, fromKey, toKey, list);
            /* Meta bugün değilse seed'leri de yenilemek için tüm aralığı iste */
            if (!missing.length && meta[apiary.id] === today && !opts.force) {
              return filledSoFar;
            }
            var wantSet = {};
            var allKeys = dateKeysInclusive(fromKey, toKey);
            if (opts.force || !missing.length) {
              /* force veya seed pass: tüm aralık (rainHours dahil yenile) */
              for (var k = 0; k < allKeys.length; k++) wantSet[allKeys[k]] = true;
            } else {
              for (var m = 0; m < missing.length; m++) wantSet[missing[m]] = true;
              /* Mevcut kayıtlarda rainHours yoksa onları da iste */
              for (var li = 0; li < list.length; li++) {
                var rr = list[li];
                if (!rr || rr.apiaryId !== apiary.id || !rr.date) continue;
                if (rr.date < fromKey || rr.date > toKey) continue;
                if (rr.source === 'seed') {
                  wantSet[rr.date] = true;
                  continue;
                }
                if (
                  rr.rainHours == null ||
                  rr.dayAvgTemp == null ||
                  rr.nightAvgTemp == null
                ) {
                  wantSet[rr.date] = true;
                }
              }
            }

            var wantKeys = Object.keys(wantSet).sort();
            if (!wantKeys.length) {
              meta[apiary.id] = today;
              saveBackfillMeta(meta);
              return filledSoFar;
            }

            /* past_days ~92; daha eski → archive (chunk). Karışık aralıkta hibrit. */
            var recentCutoff = addDaysKey(today, -(PAST_DAYS_LIMIT - 1));
            var archiveKeys = [];
            var pastKeys = [];
            for (var w = 0; w < wantKeys.length; w++) {
              if (wantKeys[w] < recentCutoff) archiveKeys.push(wantKeys[w]);
              else pastKeys.push(wantKeys[w]);
            }

            var steps = Promise.resolve(0);

            if (archiveKeys.length) {
              steps = steps.then(function (n0) {
                var aFrom = archiveKeys[0];
                var aTo = archiveKeys[archiveKeys.length - 1];
                var aWant = {};
                for (var ai = 0; ai < archiveKeys.length; ai++) aWant[archiveKeys[ai]] = true;
                return fetchArchiveRangeChunked(apiary, aFrom, aTo)
                  .then(function (meteo) {
                    list = prune(loadRecords());
                    var n = applyMeteoPayload(list, apiary, meteo, aWant, 'open_meteo_archive');
                    sortRecords(list);
                    saveRecords(list);
                    return n0 + n;
                  });
              });
            }

            if (pastKeys.length) {
              steps = steps.then(function (n0) {
                var pWant = {};
                for (var pi = 0; pi < pastKeys.length; pi++) pWant[pastKeys[pi]] = true;
                var pastSpan = daysBetweenKeys(pastKeys[0], today);
                return fetchForecastPast(apiary, Math.min(PAST_DAYS_LIMIT, Math.max(pastSpan, pastKeys.length)))
                  .catch(function () {
                    return fetchArchiveRangeChunked(apiary, pastKeys[0], pastKeys[pastKeys.length - 1]);
                  })
                  .then(function (meteo) {
                    list = prune(loadRecords());
                    var srcLabel =
                      meteo && meteo.daily && meteo.daily.time && pastKeys[0] >= recentCutoff
                        ? 'open_meteo_past'
                        : 'open_meteo_archive';
                    var n = applyMeteoPayload(list, apiary, meteo, pWant, srcLabel);
                    sortRecords(list);
                    saveRecords(list);
                    return n0 + n;
                  });
              });
            }

            return steps
              .then(function (n) {
                meta[apiary.id] = today;
                saveBackfillMeta(meta);
                return filledSoFar + (n || 0);
              })
              .catch(function () {
                /* Ağ hatası — sessizce atla */
                return filledSoFar;
              });
          });
        });

        return chain;
      })
      .then(function (filled) {
        if (backfillInFlight === run) backfillInFlight = null;
        return { filled: filled || 0, apiaries: apiaries.length, from: fromKey, to: toKey, days: days };
      })
      .catch(function (err) {
        if (backfillInFlight === run) backfillInFlight = null;
        return { filled: 0, apiaries: apiaries.length, error: String(err && err.message || err) };
      });

    backfillInFlight = run;
    return run;
  }

  function scheduleBackfill(opts) {
    if (typeof fetch !== 'function') return;
    try {
      /* Ana / rapor açılışında arka planda doldur */
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(
          function () {
            backfillMissing(opts);
          },
          { timeout: 2500 }
        );
      } else {
        setTimeout(function () {
          backfillMissing(opts);
        }, 400);
      }
    } catch (e) {
      try {
        backfillMissing(opts);
      } catch (e2) {
        /* ignore */
      }
    }
  }

  /**
   * Rapor sayfası için: seed + arşiv doldurma, sonra kayıtlar.
   * opts.from/to yoksa kayıtlı aralık (bal sezonu dahil) kullanılır — 30 güne düşmez.
   */
  function ensureHistory(opts) {
    ensureSeed();
    opts = opts || {};
    if (!opts.from && !opts.to && opts.days == null) {
      var range = loadRange();
      opts = {
        from: range.from,
        to: range.to,
        preset: range.preset,
        force: !!opts.force
      };
    }
    return backfillMissing(opts);
  }

  function filterRecords(opts) {
    opts = opts || {};
    var list = ensureSeed();
    return list.filter(function (r) {
      if (!r) return false;
      if (opts.apiaryId && opts.apiaryId !== 'all' && r.apiaryId !== opts.apiaryId) return false;
      if (opts.from && r.date < opts.from) return false;
      if (opts.to && r.date > opts.to) return false;
      return true;
    });
  }

  function summarize(records) {
    var list = records || [];
    if (!list.length) {
      return {
        count: 0,
        avgTemp: null,
        avgNightTemp: null,
        avgDayTemp: null,
        minTemp: null,
        maxTemp: null,
        rainyDays: 0,
        stormDays: 0
      };
    }
    var sum = 0;
    var n = 0;
    var nightSum = 0;
    var nightN = 0;
    var daySum = 0;
    var dayN = 0;
    var minT = null;
    var maxT = null;
    var rainy = 0;
    var storm = 0;
    var rainyDates = {};
    var stormDates = {};
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      var t = r.temp != null ? r.temp : r.high;
      if (t != null && isFinite(t)) {
        sum += t;
        n++;
      }
      if (r.nightAvgTemp != null && isFinite(Number(r.nightAvgTemp))) {
        nightSum += Number(r.nightAvgTemp);
        nightN++;
      }
      if (r.dayAvgTemp != null && isFinite(Number(r.dayAvgTemp))) {
        daySum += Number(r.dayAvgTemp);
        dayN++;
      }
      var lo = r.low != null ? r.low : t;
      var hi = r.high != null ? r.high : t;
      if (lo != null && (minT == null || lo < minT)) minT = lo;
      if (hi != null && (maxT == null || hi > maxT)) maxT = hi;
      if (r.condition === 'yagmur' || r.condition === 'kar' || (r.precipMm || 0) >= 1) {
        rainyDates[r.date] = true;
      }
      if (r.condition === 'firtina') stormDates[r.date] = true;
    }
    rainy = Object.keys(rainyDates).length;
    storm = Object.keys(stormDates).length;
    return {
      count: list.length,
      avgTemp: n ? Math.round((sum / n) * 10) / 10 : null,
      avgNightTemp: nightN ? Math.round((nightSum / nightN) * 10) / 10 : null,
      avgDayTemp: dayN ? Math.round((daySum / dayN) * 10) / 10 : null,
      minTemp: minT,
      maxTemp: maxT,
      rainyDays: rainy,
      stormDays: storm
    };
  }

  function apiaryOptions(records) {
    /* Dropdown = live apiaries only (same source as Ana / Arılıklar). */
    var live = resolveApiaries();
    if (live && live.length) {
      return live
        .slice()
        .sort(function (a, b) {
          return String(a.label || a.id).localeCompare(String(b.label || b.id), 'tr');
        })
        .map(function (a) {
          return { id: a.id, label: a.label || a.id };
        });
    }
    var map = {};
    var list = records || ensureSeed();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || !r.apiaryId) continue;
      map[r.apiaryId] = r.label || r.apiaryId;
    }
    return Object.keys(map)
      .sort()
      .map(function (id) {
        return { id: id, label: map[id] };
      });
  }

  /**
   * HiveTracks-style: first upcoming day suitable for inspection.
   * Mild temp (12–28°C), little rain, not storm.
   */
  function bestInspectionDay(daily) {
    if (!daily || !daily.time || !daily.time.length) return null;
    var today = localDateKey();
    var dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    for (var i = 0; i < daily.time.length; i++) {
      var date = daily.time[i];
      if (date < today) continue;
      var hi = roundC(daily.temperature_2m_max && daily.temperature_2m_max[i]);
      var lo = roundC(daily.temperature_2m_min && daily.temperature_2m_min[i]);
      var precip =
        daily.precipitation_sum && daily.precipitation_sum[i] != null
          ? Number(daily.precipitation_sum[i])
          : 0;
      var code =
        daily.weather_code && daily.weather_code[i] != null ? Number(daily.weather_code[i]) : 0;
      var mid = hi != null && lo != null ? (hi + lo) / 2 : hi != null ? hi : lo;
      if (mid == null) continue;
      if (mid < 12 || mid > 28) continue;
      if (precip >= 2) continue;
      if (code >= 95 || (code >= 80 && code <= 82)) continue;
      var parts = date.split('-');
      var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      var dayLabel = dayNames[dt.getDay()] + ' ' + dt.getDate();
      var reason =
        Math.round(mid) +
        '° civarı' +
        (precip < 0.2 ? ', yağış yok' : ', az yağış') +
        ' — muayene için uygun';
      return { date: date, dayLabel: dayLabel, mid: Math.round(mid), reason: reason };
    }
    return null;
  }

  global.SuperAriHava = {
    STORAGE_KEY: STORAGE_KEY,
    RANGE_KEY: RANGE_KEY,
    MAX_DAYS: MAX_DAYS,
    DEFAULT_BACKFILL_DAYS: DEFAULT_BACKFILL_DAYS,
    PAST_DAYS_LIMIT: PAST_DAYS_LIMIT,
    daysBetweenKeys: daysBetweenKeys,
    dateKeysInclusive: dateKeysInclusive,
    rainHoursFromHourly: rainHoursFromHourly,
    dayNightAvgFromHourly: dayNightAvgFromHourly,
    formatRainHours: formatRainHours,
    formatPrecipLine: formatPrecipLine,
    formatAvgWithDayNight: formatAvgWithDayNight,
    RAIN_HOUR_THRESHOLD_MM: RAIN_HOUR_THRESHOLD_MM,
    conditionFromCode: conditionFromCode,
    labelFromCondition: labelFromCondition,
    localDateKey: localDateKey,
    addDaysKey: addDaysKey,
    REGION_PROFILES: REGION_PROFILES,
    detectRegion: detectRegion,
    resolveSeasonCoords: resolveSeasonCoords,
    balSeasonBounds: balSeasonBounds,
    balSeasonChipLabel: balSeasonChipLabel,
    formatMdShort: formatMdShort,
    lastNDaysBounds: lastNDaysBounds,
    defaultRange: defaultRange,
    loadRange: loadRange,
    saveRange: saveRange,
    rangeFromPreset: rangeFromPreset,
    clampRange: clampRange,
    loadRecords: loadRecords,
    saveRecords: saveRecords,
    ensureSeed: ensureSeed,
    ensureHistory: ensureHistory,
    backfillMissing: backfillMissing,
    recordFromMeteo: recordFromMeteo,
    filterRecords: filterRecords,
    summarize: summarize,
    apiaryOptions: apiaryOptions,
    bestInspectionDay: bestInspectionDay,
    resolveApiaries: resolveApiaries
  };
})(typeof window !== 'undefined' ? window : this);
