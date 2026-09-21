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
  var MAX_DAYS = 200;
  var DEFAULT_BACKFILL_DAYS = 30;
  var DEFAULT_APIARIES = [
    { id: 'a1', label: 'Kayaköy', lat: 39.92, lon: 41.27 },
    { id: 'a2', label: 'Tortum', lat: 40.61, lon: 41.66 },
    { id: 'a3', label: 'Palandöken', lat: 40.45, lon: 41.4 }
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
    /* East Anatolia (Erzurum yayla etc.) — check first */
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

  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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

    DEFAULT_APIARIES.forEach(add);

    try {
      if (global.SuperAriDemo) {
        var demoList =
          typeof global.SuperAriDemo.apiaries !== 'undefined'
            ? global.SuperAriDemo.apiaries
            : null;
        if (demoList && demoList.length) {
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
      }
    } catch (eDemo) {
      /* ignore */
    }

    var records = loadRecords();
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (!r) continue;
      add({ id: r.apiaryId, label: r.label, lat: r.lat, lon: r.lon });
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

  function rowFromDailyIndex(apiary, daily, idx, source) {
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
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum' +
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
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum' +
      '&timezone=auto';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('meteo_archive_' + r.status);
      return r.json();
    });
  }

  function applyDailyToList(list, apiary, daily, wantSet, source) {
    if (!daily || !daily.time) return 0;
    var added = 0;
    for (var i = 0; i < daily.time.length; i++) {
      var date = daily.time[i];
      if (wantSet && !wantSet[date]) continue;
      var row = rowFromDailyIndex(apiary, daily, i, source);
      if (!row) continue;
      var before = list.length;
      upsertRow(list, row, true);
      if (list.length > before || true) added++;
    }
    return added;
  }

  /**
   * Eksik günleri Open-Meteo geçmiş verisiyle doldurur (uygulama kapalı olsa bile).
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
    } else {
      days = Number(opts.days) || DEFAULT_BACKFILL_DAYS;
      if (days > MAX_DAYS) days = MAX_DAYS;
      fromKey = addDaysKey(today, -(days - 1));
      toKey = today;
    }
    if (days > MAX_DAYS) days = MAX_DAYS;
    var apiaries = resolveApiaries(opts.apiaries);
    if (!apiaries.length) {
      return Promise.resolve({ filled: 0, apiaries: 0 });
    }

    if (!opts.force && !opts.from && !needsBackfill(apiaries, days)) {
      return Promise.resolve({ filled: 0, apiaries: apiaries.length, skipped: true });
    }

    if (backfillInFlight && !opts.force) return backfillInFlight;

    backfillInFlight = Promise.resolve()
      .then(function () {
        var chain = Promise.resolve(0);
        var meta = loadBackfillMeta();

        apiaries.forEach(function (apiary) {
          chain = chain.then(function (filledSoFar) {
            var list = prune(loadRecords());
            var missing = missingDatesForApiary(apiary.id, fromKey, toKey, list);
            /* Meta bugün değilse seed'leri de yenilemek için tüm aralığı iste */
            if (!missing.length && meta[apiary.id] === today) {
              return filledSoFar;
            }
            var wantSet = {};
            if (missing.length) {
              for (var m = 0; m < missing.length; m++) wantSet[missing[m]] = true;
            } else {
              /* İlk günlük pass: seed'leri gerçek veri ile değiştir */
              var allKeys = dateKeysInclusive(fromKey, toKey);
              for (var k = 0; k < allKeys.length; k++) wantSet[allKeys[k]] = true;
            }

            /* past_days max ~92; older / bal season → archive API */
            var recentCutoff = addDaysKey(today, -91);
            var usePast = fromKey >= recentCutoff && days <= 92;
            var fetchP = usePast
              ? fetchForecastPast(apiary, Math.max(days, daysBetweenKeys(fromKey, today)))
              : fetchArchiveRange(apiary, fromKey, toKey);

            return fetchP
              .catch(function () {
                /* Forecast past başarısızsa archive dene */
                return fetchArchiveRange(apiary, fromKey, toKey);
              })
              .then(function (meteo) {
                var daily = meteo && meteo.daily;
                list = prune(loadRecords());
                var n = applyDailyToList(
                  list,
                  apiary,
                  daily,
                  wantSet,
                  usePast ? 'open_meteo_past' : 'open_meteo_archive'
                );
                sortRecords(list);
                saveRecords(list);
                meta[apiary.id] = today;
                saveBackfillMeta(meta);
                return filledSoFar + n;
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
        backfillInFlight = null;
        return { filled: filled || 0, apiaries: apiaries.length };
      })
      .catch(function (err) {
        backfillInFlight = null;
        return { filled: 0, apiaries: apiaries.length, error: String(err && err.message || err) };
      });

    return backfillInFlight;
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
   */
  function ensureHistory(opts) {
    ensureSeed();
    return backfillMissing(opts || { days: DEFAULT_BACKFILL_DAYS });
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
        minTemp: null,
        maxTemp: null,
        rainyDays: 0,
        stormDays: 0
      };
    }
    var sum = 0;
    var n = 0;
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
      minTemp: minT,
      maxTemp: maxT,
      rainyDays: rainy,
      stormDays: storm
    };
  }

  function apiaryOptions(records) {
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
