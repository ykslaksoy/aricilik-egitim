/**
 * SüperArı — hava durumu geçmiş kayıtları (localStorage demo).
 * Ana Open-Meteo yanıtından günde 1 kayıt / arılık; rapor sayfası buradan okur.
 */
(function (global) {
  var STORAGE_KEY = 'superari.hava.kayit.v1';
  var MAX_DAYS = 90;

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

  function prune(list) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    var key = localDateKey(cutoff);
    return (list || []).filter(function (r) {
      return r && r.date && r.date >= key;
    });
  }

  function seedDemo() {
    var apiaries = [
      { id: 'a1', label: 'Kayaköy', lat: 39.92, lon: 41.27 },
      { id: 'a2', label: 'Tortum', lat: 40.61, lon: 41.66 },
      { id: 'a3', label: 'Palandöken', lat: 40.45, lon: 41.4 }
    ];
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
    if (list.length) return list;
    list = seedDemo();
    saveRecords(list);
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
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i] = row;
        found = true;
        break;
      }
    }
    if (!found) list.push(row);
    list.sort(function (a, b) {
      if (a.date === b.date) return String(a.apiaryId).localeCompare(String(b.apiaryId));
      return a.date < b.date ? -1 : 1;
    });
    saveRecords(list);
    return row;
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
    conditionFromCode: conditionFromCode,
    labelFromCondition: labelFromCondition,
    localDateKey: localDateKey,
    loadRecords: loadRecords,
    saveRecords: saveRecords,
    ensureSeed: ensureSeed,
    recordFromMeteo: recordFromMeteo,
    filterRecords: filterRecords,
    summarize: summarize,
    apiaryOptions: apiaryOptions,
    bestInspectionDay: bestInspectionDay
  };
})(typeof window !== 'undefined' ? window : this);
