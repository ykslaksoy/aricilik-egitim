/**
 * Shared static demo data for panel pages (arici / kovanlar / uyarilar / gorevler / arılıklar).
 * Replaces missing SuperAriDemo dependency so list pages render without API.
 * Apiaries persist in localStorage (seeded demo + user-added).
 */
(function (global) {
  var STORAGE_KEY = 'superari.ariliklar.v1';

  /* Arılık: short `place` for Ana weather cycle; full `name` for panel lists. */
  var SEED_APIARIES = [
    { id: 'a1', name: 'Kayaköy Ana Arılık', place: 'Kayaköy', lat: 39.92, lon: 41.27, hiveCount: 42 },
    { id: 'a2', name: 'Tortum Yayla Arılığı', place: 'Tortum', lat: 40.61, lon: 41.66, hiveCount: 35 },
    { id: 'a3', name: 'Palandöken Yayla Arılığı', place: 'Palandöken', lat: 40.45, lon: 41.4, hiveCount: 23 }
  ];

  var hives = [
    { id: 101, name: 'Kovan 101', apiaryId: 'a1', weightKg: 38.2, deltaKg: 1.2, health: 'İyi', healthScore: 88, colonyScore: 82, swarmRisk: 'Düşük' },
    { id: 102, name: 'Kovan 102', apiaryId: 'a1', weightKg: 35.6, deltaKg: 0.4, health: 'İyi', healthScore: 84, colonyScore: 79, swarmRisk: 'Düşük' },
    { id: 118, name: 'Kovan 118', apiaryId: 'a1', weightKg: 41.0, deltaKg: 1.8, health: 'Dikkat', healthScore: 62, colonyScore: 71, swarmRisk: 'Orta' },
    { id: 204, name: 'Kovan 204', apiaryId: 'a2', weightKg: 33.1, deltaKg: -0.3, health: 'İyi', healthScore: 90, colonyScore: 86, swarmRisk: 'Düşük' },
    { id: 211, name: 'Kovan 211', apiaryId: 'a2', weightKg: 29.4, deltaKg: 0.1, health: 'Kritik', healthScore: 41, colonyScore: 48, swarmRisk: 'Yüksek' },
    { id: 305, name: 'Kovan 305', apiaryId: 'a3', weightKg: 36.8, deltaKg: 0.9, health: 'İyi', healthScore: 85, colonyScore: 80, swarmRisk: 'Düşük' }
  ];

  var alerts = [
    { id: 'al1', title: 'Oğul riski yükseldi', type: 'ogul', hiveId: 211, severity: 'high' },
    { id: 'al2', title: 'Sağlık skoru düştü', type: 'saglik', hiveId: 118, severity: 'medium' },
    { id: 'al3', title: 'Tartı ani değişim', type: 'tarti', hiveId: 101, severity: 'low' },
    { id: 'al4', title: 'Oğul: acil müdahale', type: 'ogul', hiveId: 211, severity: 'high' }
  ];

  var tasks = [
    { id: 't1', title: 'Kovan 211 oğul kontrolü', hiveId: 211, priority: 1 },
    { id: 't2', title: 'Kuzey tartı kalibrasyonu', hiveId: 101, priority: 2 },
    { id: 't3', title: 'Petek tarama — 118', hiveId: 118, priority: 2 },
    { id: 't4', title: 'Yayla besleme kontrolü', hiveId: 305, priority: 3 },
    { id: 't5', title: 'Güney çerçeve değişimi', hiveId: 204, priority: 3 }
  ];

  function cloneSeed() {
    return SEED_APIARIES.map(function (a) {
      return {
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: a.hiveCount
      };
    });
  }

  function loadApiaries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(function (a) {
            return {
              id: String(a.id),
              name: String(a.name || '').trim() || 'Arılık',
              place: String(a.place || '').trim() || '—',
              lat: a.lat != null && a.lat !== '' ? Number(a.lat) : null,
              lon: a.lon != null && a.lon !== '' ? Number(a.lon) : null,
              hiveCount: Math.max(0, Number(a.hiveCount) || 0)
            };
          });
        }
      }
    } catch (e) { /* ignore */ }
    var seed = cloneSeed();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch (e2) { /* ignore */ }
    return seed;
  }

  function saveApiaries(list) {
    if (!Array.isArray(list)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  function addApiary(input) {
    var list = loadApiaries();
    var place = String((input && input.place) || '').trim();
    var name = String((input && input.name) || '').trim();
    if (!name) name = place ? (place + ' Arılığı') : 'Yeni Arılık';
    if (!place) place = '—';
    var hiveCount = Math.max(0, Number(input && input.hiveCount) || 0);
    var lat = input && input.lat != null && input.lat !== '' ? Number(input.lat) : null;
    var lon = input && input.lon != null && input.lon !== '' ? Number(input.lon) : null;
    var item = {
      id: 'a' + Date.now(),
      name: name,
      place: place,
      lat: isFinite(lat) ? lat : null,
      lon: isFinite(lon) ? lon : null,
      hiveCount: hiveCount
    };
    list.push(item);
    saveApiaries(list);
    return item;
  }

  function hiveById(id) {
    var n = Number(id);
    for (var i = 0; i < hives.length; i++) {
      if (hives[i].id === n) return hives[i];
    }
    return null;
  }

  function apiaryById(id) {
    var list = loadApiaries();
    var key = String(id);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === key) return list[i];
    }
    return null;
  }

  function hivesForApiary(apiaryId) {
    var key = String(apiaryId);
    return hives.filter(function (h) { return h.apiaryId === key; });
  }

  Object.defineProperty(global, 'SuperAriDemo', {
    configurable: true,
    enumerable: true,
    value: {
      STORAGE_KEY: STORAGE_KEY,
      SEED_APIARIES: SEED_APIARIES,
      get apiaries() { return loadApiaries(); },
      hives: hives,
      alerts: alerts,
      tasks: tasks,
      get counts() {
        return {
          alerts: alerts.length,
          tasks: tasks.length,
          hives: 100,
          apiaries: loadApiaries().length
        };
      },
      hiveById: hiveById,
      apiaryById: apiaryById,
      hivesForApiary: hivesForApiary,
      loadApiaries: loadApiaries,
      saveApiaries: saveApiaries,
      addApiary: addApiary
    }
  });
})(window);
