/**
 * Shared static demo data for panel pages (arici / kovanlar / uyarilar / gorevler / arılıklar).
 * Replaces missing SuperAriDemo dependency so list pages render without API.
 * Apiaries + per-apiary hives persist in localStorage (seeded demo + user-added).
 *
 * Invariant: apiary.hiveCount === hivesForApiary(apiary.id).length (always).
 */
(function (global) {
  var STORAGE_KEY = 'superari.ariliklar.v1';
  var HIVES_KEY = 'superari.kovanlar.v1';

  /* Arılık: short `place` for Ana weather cycle; full `name` for panel lists. */
  var SEED_APIARIES = [
    { id: 'a1', name: 'Kayaköy Ana Arılık', place: 'Kayaköy', lat: 39.92, lon: 41.27, hiveCount: 42 },
    { id: 'a2', name: 'Tortum Yayla Arılığı', place: 'Tortum', lat: 40.61, lon: 41.66, hiveCount: 35 },
    { id: 'a3', name: 'Palandöken Yayla Arılığı', place: 'Palandöken', lat: 40.45, lon: 41.4, hiveCount: 23 }
  ];

  /* Named demo hives used by alerts / tasks — included inside full per-apiary fleets. */
  var FEATURED_HIVES = [
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

  var HEALTHS = ['İyi', 'İyi', 'İyi', 'Dikkat', 'Kritik'];
  var SWARMS = ['Düşük', 'Düşük', 'Orta', 'Yüksek'];

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

  function normalizeHive(h) {
    return {
      id: Number(h.id),
      name: String(h.name || ('Kovan ' + h.id)),
      apiaryId: String(h.apiaryId || ''),
      weightKg: Number(h.weightKg) || 30,
      deltaKg: Number(h.deltaKg) || 0,
      health: String(h.health || 'İyi'),
      healthScore: Math.max(0, Math.min(100, Number(h.healthScore) || 80)),
      colonyScore: Math.max(0, Math.min(100, Number(h.colonyScore) || 75)),
      swarmRisk: String(h.swarmRisk || 'Düşük')
    };
  }

  function synthHive(apiaryId, id, i) {
    var health = HEALTHS[i % HEALTHS.length];
    var score = health === 'Kritik' ? 40 + (i % 10) : (health === 'Dikkat' ? 58 + (i % 12) : 78 + (i % 18));
    var delta = ((i % 7) - 2) * 0.3;
    return normalizeHive({
      id: id,
      name: 'Kovan ' + id,
      apiaryId: apiaryId,
      weightKg: 28 + (i % 15) + (i % 3) * 0.4,
      deltaKg: Math.round(delta * 10) / 10,
      health: health,
      healthScore: score,
      colonyScore: Math.max(40, score - 6 + (i % 5)),
      swarmRisk: SWARMS[i % SWARMS.length]
    });
  }

  function idBlockFor(apiaryId) {
    if (apiaryId === 'a1') return 100;
    if (apiaryId === 'a2') return 200;
    if (apiaryId === 'a3') return 300;
    var n = 0;
    var s = String(apiaryId);
    for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 7000;
    return 1000 + n;
  }

  /** Build exactly `want` hive records for one apiary (featured first, then synth). */
  function makeExactFleet(apiaryId, want, usedIds) {
    want = Math.max(0, Number(want) || 0);
    var used = usedIds || {};
    var out = [];
    var featured = FEATURED_HIVES.filter(function (h) {
      return h.apiaryId === apiaryId;
    });
    var i;
    for (i = 0; i < featured.length && out.length < want; i++) {
      var f = normalizeHive(featured[i]);
      if (used[f.id]) continue;
      used[f.id] = true;
      out.push(f);
    }
    var nextId = idBlockFor(apiaryId);
    var guard = 0;
    while (out.length < want && guard < want + 2000) {
      guard++;
      nextId++;
      if (used[nextId]) continue;
      used[nextId] = true;
      out.push(synthHive(apiaryId, nextId, out.length));
    }
    return out;
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

  function saveHives(list) {
    if (!Array.isArray(list)) return;
    try {
      localStorage.setItem(HIVES_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  /**
   * Reconcile so every apiary has exactly hiveCount hive records.
   * Prefers declared hiveCount when padding; if no count set, keeps existing length.
   * Writes both stores so label count == record count.
   */
  function reconcile(apiaries, hives) {
    var byApiary = {};
    var used = {};
    (hives || []).forEach(function (h) {
      var hh = normalizeHive(h);
      if (!hh.apiaryId || !isFinite(hh.id)) return;
      used[hh.id] = true;
      if (!byApiary[hh.apiaryId]) byApiary[hh.apiaryId] = [];
      byApiary[hh.apiaryId].push(hh);
    });

    var out = [];
    var apiaryOut = apiaries.map(function (a) {
      var existing = byApiary[a.id] || [];
      var want = Math.max(0, Number(a.hiveCount) || 0);
      /* Legacy short fleets: seed apiaries declare N but old storage only had ~2–3. Pad to N. */
      if (want === 0 && existing.length > 0) want = existing.length;

      var fleet;
      if (existing.length === want) {
        fleet = existing;
      } else if (existing.length > want) {
        fleet = existing.slice(0, want);
      } else {
        fleet = existing.slice();
        var need = want - existing.length;
        var pad = makeExactFleet(a.id, need + existing.length, used).filter(function (h) {
          return !existing.some(function (e) { return e.id === h.id; });
        });
        var pi = 0;
        while (fleet.length < want && pi < pad.length) {
          fleet.push(pad[pi]);
          used[pad[pi].id] = true;
          pi++;
        }
        while (fleet.length < want) {
          var id = idBlockFor(a.id) + 5000 + fleet.length;
          while (used[id]) id++;
          used[id] = true;
          fleet.push(synthHive(a.id, id, fleet.length));
        }
      }

      fleet.forEach(function (h) { out.push(h); });
      return {
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: fleet.length
      };
    });

    /* Keep orphan hives from unknown apiaries out of the active set (count is per known apiary). */
    saveApiaries(apiaryOut);
    saveHives(out);
    return { apiaries: apiaryOut, hives: out };
  }

  function readRawHives() {
    try {
      var raw = localStorage.getItem(HIVES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(normalizeHive).filter(function (h) {
            return h.apiaryId && isFinite(h.id);
          });
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function loadHives() {
    var apiaries = loadApiaries();
    var raw = readRawHives();
    if (!raw) {
      /* Fresh seed: exactly SEED hiveCounts worth of records. */
      var used = {};
      var seeded = [];
      apiaries.forEach(function (a) {
        seeded = seeded.concat(makeExactFleet(a.id, a.hiveCount, used));
      });
      var fresh = reconcile(apiaries, seeded);
      return fresh.hives;
    }
    return reconcile(apiaries, raw).hives;
  }

  function addApiary(input) {
    var list = loadApiaries();
    /* Ensure hives store is initialized / reconciled before we append. */
    var hives = loadHives();
    list = loadApiaries();

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

    var used = {};
    hives.forEach(function (h) { used[h.id] = true; });
    var fleet = makeExactFleet(item.id, hiveCount, used);
    item.hiveCount = fleet.length;
    hives = hives.concat(fleet);

    saveApiaries(list);
    saveHives(hives);
    return item;
  }

  function hiveById(id) {
    var n = Number(id);
    var list = loadHives();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === n) return list[i];
    }
    return null;
  }

  function apiaryById(id) {
    loadHives(); /* reconcile counts first */
    var list = loadApiaries();
    var key = String(id);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === key) return list[i];
    }
    return null;
  }

  function hivesForApiary(apiaryId) {
    var key = String(apiaryId);
    return loadHives().filter(function (h) { return h.apiaryId === key; });
  }

  Object.defineProperty(global, 'SuperAriDemo', {
    configurable: true,
    enumerable: true,
    value: {
      STORAGE_KEY: STORAGE_KEY,
      HIVES_KEY: HIVES_KEY,
      SEED_APIARIES: SEED_APIARIES,
      get apiaries() { return loadApiaries(); },
      get hives() { return loadHives(); },
      alerts: alerts,
      tasks: tasks,
      get counts() {
        var h = loadHives();
        return {
          alerts: alerts.length,
          tasks: tasks.length,
          hives: h.length,
          apiaries: loadApiaries().length
        };
      },
      hiveById: hiveById,
      apiaryById: apiaryById,
      hivesForApiary: hivesForApiary,
      loadApiaries: loadApiaries,
      saveApiaries: saveApiaries,
      loadHives: loadHives,
      saveHives: saveHives,
      addApiary: addApiary
    }
  });
})(window);
