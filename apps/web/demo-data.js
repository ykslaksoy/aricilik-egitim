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
  var QUEENS_KEY = 'superari.anaArilar.v1';
  var DELETED_SEEDS_KEY = 'superari.ariliklar.deletedSeeds.v1';
  var WATER_CATALOG_KEY = 'superari.waterSources.catalog.v1';

  /* Arılık: short `place` for Ana weather cycle; full `name` for panel lists. */
  var SEED_APIARIES = [
    { id: 'a1', name: 'Kayaköy Ana Arılık', place: 'Kayaköy', il: 'Muğla', ilce: 'Fethiye', koy: 'Kayaköy', lat: 36.58141, lon: 29.08886, hiveCount: 42 },
    { id: 'a2', name: 'Tortum Yayla Arılığı', place: 'Tortum', il: 'Erzurum', ilce: 'Tortum', koy: 'Tortum', lat: 40.257866, lon: 41.613415, hiveCount: 35 },
    { id: 'a3', name: 'Palandöken Yayla Arılığı', place: 'Palandöken', il: 'Erzurum', ilce: 'Palandöken', koy: 'Palandöken', lat: 39.90, lon: 41.27, hiveCount: 23 },
    { id: 'a4', name: 'Yanıkdağ Baluğundüzü Arılığı', place: 'Yanıkdağ Baluğundüzü', il: 'Rize', ilce: 'Çayeli', koy: 'Yanıkdağ Baluğundüzü', lat: 41.080781, lon: 40.753956, hiveCount: 20 },
    { id: 'a5', name: 'Cimil Yaylası Arılığı', place: 'Cimil Yaylası', il: 'Rize', ilce: 'İkizdere', koy: 'Cimil Yaylası', lat: 40.733, lon: 40.789, hiveCount: 25 }
  ];

  /* Named demo hives used by alerts / tasks — included inside full per-apiary fleets. */
  var FEATURED_HIVES = [
    { id: 101, name: 'Kovan 101', apiaryId: 'a1', weightKg: 38.2, deltaKg: 1.2, health: 'İyi', healthScore: 88, colonyScore: 82, swarmRisk: 'Düşük', strength: 'güçlü', breed: 'Muğla' },
    { id: 102, name: 'Kovan 102', apiaryId: 'a1', weightKg: 35.6, deltaKg: 0.4, health: 'İyi', healthScore: 84, colonyScore: 79, swarmRisk: 'Düşük', strength: 'orta', breed: 'Muğla' },
    { id: 118, name: 'Kovan 118', apiaryId: 'a1', weightKg: 41.0, deltaKg: 1.8, health: 'Dikkat', healthScore: 62, colonyScore: 71, swarmRisk: 'Orta', strength: 'orta', breed: 'Muğla' },
    { id: 204, name: 'Kovan 204', apiaryId: 'a2', weightKg: 33.1, deltaKg: -0.3, health: 'İyi', healthScore: 90, colonyScore: 86, swarmRisk: 'Düşük', strength: 'güçlü', breed: 'Kafkas × Karadeniz' },
    { id: 211, name: 'Kovan 211', apiaryId: 'a2', weightKg: 29.4, deltaKg: 0.1, health: 'Kritik', healthScore: 41, colonyScore: 48, swarmRisk: 'Yüksek', strength: 'zayıf', breed: 'Kafkas × Karadeniz' },
    { id: 305, name: 'Kovan 305', apiaryId: 'a3', weightKg: 36.8, deltaKg: 0.9, health: 'İyi', healthScore: 85, colonyScore: 80, swarmRisk: 'Düşük', strength: 'güçlü', breed: 'Kafkas × Karniyol' }
  ];

  var alerts = [
    { id: 'al1', title: 'Oğul riski yükseldi', type: 'ogul', hiveId: 211, severity: 'high' },
    { id: 'al2', title: 'Sağlık skoru düştü', type: 'saglik', hiveId: 118, severity: 'medium' },
    { id: 'al3', title: 'Tartı ani değişim', type: 'tarti', hiveId: 101, severity: 'low' },
    { id: 'al4', title: 'Oğul: acil müdahale', type: 'ogul', hiveId: 211, severity: 'high' }
  ];

  var tasks = [
    { id: 't2', title: 'Kuzey tartı kalibrasyonu', hiveId: 101, priority: 2 },
    { id: 't3', title: 'Petek tarama — 118', hiveId: 118, priority: 2 },
    { id: 't4', title: 'Yayla besleme kontrolü', hiveId: 305, priority: 3 },
    { id: 't5', title: 'Güney çerçeve değişimi', hiveId: 204, priority: 3 }
  ];

  var HEALTHS = ['İyi', 'İyi', 'İyi', 'Dikkat', 'Kritik'];
  var SWARMS = ['Düşük', 'Düşük', 'Orta', 'Yüksek'];

  function cloneSeed() {
    return SEED_APIARIES.map(function (a) {
      return copyAdminFields({
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: a.hiveCount
      }, a);
    });
  }

  function trimAdmin(v) {
    if (v == null || v === '') return '';
    return String(v).trim();
  }

  /** il · ilçe · köy (tekrarları atlar). */
  function formatPlaceSubtitle(a) {
    if (!a) return '—';
    var parts = [];
    var seen = {};
    function push(v) {
      var s = trimAdmin(v);
      if (!s || s === '—') return;
      var key = s.toLocaleLowerCase('tr');
      if (seen[key]) return;
      seen[key] = true;
      parts.push(s);
    }
    push(a.il);
    push(a.ilce);
    push(a.koy);
    if (!parts.length) push(a.place);
    return parts.length ? parts.join(' · ') : '—';
  }

  function copyAdminFields(dest, src) {
    if (!dest) return dest;
    var il = trimAdmin(src && src.il);
    var ilce = trimAdmin(src && src.ilce);
    var koy = trimAdmin(src && src.koy);
    if (il) dest.il = il; else delete dest.il;
    if (ilce) dest.ilce = ilce; else delete dest.ilce;
    if (koy) dest.koy = koy; else delete dest.koy;
    return dest;
  }

  /** Seed arılıklarında eksik il/ilçe/köy doldur. */
  function migratePlaceAdmin(list) {
    var changed = false;
    var bySeed = {};
    SEED_APIARIES.forEach(function (s) { bySeed[s.id] = s; });
    var out = (list || []).map(function (a) {
      if (!a) return a;
      var seed = bySeed[String(a.id)];
      if (!seed) return a;
      /* Seed arılıklarında il/ilçe/köy kaynağı seed (yerel eksik veya eski değer düzelir). */
      var nextIl = trimAdmin(seed.il) || trimAdmin(a.il);
      var nextIlce = trimAdmin(seed.ilce) || trimAdmin(a.ilce);
      var nextKoy = trimAdmin(seed.koy) || trimAdmin(a.koy);
      if (trimAdmin(a.il) === nextIl && trimAdmin(a.ilce) === nextIlce && trimAdmin(a.koy) === nextKoy) {
        return a;
      }
      changed = true;
      var copy = applyWaterDistance({
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: a.hiveCount
      }, a);
      return copyAdminFields(copy, { il: nextIl, ilce: nextIlce, koy: nextKoy });
    });
    return { list: out, changed: changed };
  }


  /** Metres to nearest water; null/missing → omit (yield waterFactor 1.0). */
  function parseWaterDistanceM(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  /** User-reported local water source (not satellite-detected). ASCII keys. */
  var WATER_SOURCE_TYPE_KEYS = {
    kuyu: true,
    dere: true,
    oluk: true,
    golet: true,
    cesme: true,
    mevsimlik_dere: true,
    diger: true
  };

  var WATER_SOURCE_TYPE_LABELS_TR = {
    kuyu: 'Kuyu',
    dere: 'Dere',
    oluk: 'Oluk-kap',
    golet: 'Gölet',
    cesme: 'Çeşme',
    mevsimlik_dere: 'Mevsimlik dere',
    diger: 'Diğer'
  };

  function parseWaterSourceType(v) {
    if (v == null || v === '') return null;
    var k = String(v).trim().toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '_');
    if (k === 'go_let') k = 'golet';
    if (!WATER_SOURCE_TYPE_KEYS[k]) return null;
    return k;
  }

  function parseWaterSourceNote(v) {
    if (v == null || v === '') return null;
    var s = String(v).trim();
    if (!s) return null;
    if (s.length > 120) s = s.slice(0, 120);
    return s;
  }

  function parseWaterSourceLabel(v) {
    if (v == null || v === '') return null;
    var s = String(v).trim();
    if (!s) return null;
    if (s.length > 80) s = s.slice(0, 80);
    return s;
  }

  function newWaterCatalogId() {
    return 'ws' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function parseOptionalCoord(v, kind) {
    if (v == null || v === '') return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    if (kind === 'lat' && (n < -90 || n > 90)) return null;
    if (kind === 'lon' && (n < -180 || n > 180)) return null;
    return Math.round(n * 1e6) / 1e6;
  }

  function parseWaterPlace(v) {
    if (v == null || v === '') return null;
    var s = String(v).trim();
    if (!s) return null;
    if (s.length > 80) s = s.slice(0, 80);
    return s;
  }

  /** Haversine distance in metres between two WGS84 points. */
  function haversineMetres(lat1, lon1, lat2, lon2) {
    var a = Number(lat1);
    var b = Number(lon1);
    var c = Number(lat2);
    var d = Number(lon2);
    if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) return null;
    var toRad = Math.PI / 180;
    var dLat = (c - a) * toRad;
    var dLon = (d - b) * toRad;
    var x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a * toRad) * Math.cos(c * toRad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var metres = 2 * 6371000 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    if (!isFinite(metres) || metres < 0) return null;
    return Math.round(metres);
  }

  function applyCatalogCoords(dest, src) {
    var lat = parseOptionalCoord(src && src.lat, 'lat');
    var lon = parseOptionalCoord(src && src.lon, 'lon');
    if (lat != null && lon != null) {
      dest.lat = lat;
      dest.lon = lon;
    }
    var place = parseWaterPlace(src && src.place);
    if (place != null) dest.place = place;
    return dest;
  }

  function normalizeWaterCatalogItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = raw.id != null ? String(raw.id).trim() : '';
    if (!id) return null;
    var typeKey = parseWaterSourceType(raw.typeKey);
    if (!typeKey) typeKey = 'diger';
    var label = parseWaterSourceLabel(raw.label);
    if (!label) {
      label = WATER_SOURCE_TYPE_LABELS_TR[typeKey] || typeKey;
    }
    var note = parseWaterSourceNote(raw.note);
    var createdAt = raw.createdAt != null ? String(raw.createdAt) : new Date().toISOString();
    var out = { id: id, label: label, typeKey: typeKey, createdAt: createdAt };
    if (note != null) out.note = note;
    applyCatalogCoords(out, raw);
    return out;
  }

  function loadWaterCatalog() {
    try {
      var raw = localStorage.getItem(WATER_CATALOG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          var out = [];
          var seen = {};
          parsed.forEach(function (item) {
            var n = normalizeWaterCatalogItem(item);
            if (!n || seen[n.id]) return;
            seen[n.id] = true;
            out.push(n);
          });
          return out;
        }
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveWaterCatalog(list) {
    if (!Array.isArray(list)) return;
    try {
      localStorage.setItem(WATER_CATALOG_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  function waterCatalogById(id) {
    var key = String(id || '');
    if (!key) return null;
    var list = loadWaterCatalog();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === key) return list[i];
    }
    return null;
  }

  function mergeCatalogCoordsIfMissing(existing, incoming) {
    var changed = false;
    if (incoming.lat != null && incoming.lon != null &&
        (existing.lat == null || existing.lon == null)) {
      existing.lat = incoming.lat;
      existing.lon = incoming.lon;
      changed = true;
    }
    if (incoming.place && !existing.place) {
      existing.place = incoming.place;
      changed = true;
    }
    if (incoming.note && !existing.note) {
      existing.note = incoming.note;
      changed = true;
    }
    return changed;
  }

  /** Append a permanent catalog entry (shared across apiaries). Never wiped on navigate. */
  function addWaterCatalogItem(input) {
    var typeKey = parseWaterSourceType(input && input.typeKey);
    if (!typeKey) typeKey = 'diger';
    var label = parseWaterSourceLabel(input && input.label);
    if (!label) label = WATER_SOURCE_TYPE_LABELS_TR[typeKey] || typeKey;
    var note = parseWaterSourceNote(input && input.note);
    var item = {
      id: (input && input.id) ? String(input.id) : newWaterCatalogId(),
      label: label,
      typeKey: typeKey,
      createdAt: (input && input.createdAt) ? String(input.createdAt) : new Date().toISOString()
    };
    if (note != null) item.note = note;
    applyCatalogCoords(item, input || {});
    var list = loadWaterCatalog();
    /* Dedupe by same label+typeKey (case-insensitive label). */
    var labLower = item.label.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (list[i].typeKey === item.typeKey && String(list[i].label).toLowerCase() === labLower) {
        if (mergeCatalogCoordsIfMissing(list[i], item)) saveWaterCatalog(list);
        return list[i];
      }
    }
    list.push(item);
    saveWaterCatalog(list);
    return item;
  }

  /** Patch fields on an existing catalog entry (label/type/note/coords). */
  function updateWaterCatalogItem(id, patch) {
    var key = String(id || '');
    if (!key || !patch) return null;
    var list = loadWaterCatalog();
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== key) continue;
      var cur = list[i];
      if (Object.prototype.hasOwnProperty.call(patch, 'label')) {
        var lab = parseWaterSourceLabel(patch.label);
        if (lab) cur.label = lab;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'typeKey')) {
        var tk = parseWaterSourceType(patch.typeKey);
        if (tk) cur.typeKey = tk;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'note')) {
        var wn = parseWaterSourceNote(patch.note);
        if (wn != null) cur.note = wn;
        else delete cur.note;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'place')) {
        var pl = parseWaterPlace(patch.place);
        if (pl != null) cur.place = pl;
        else delete cur.place;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'lat') ||
          Object.prototype.hasOwnProperty.call(patch, 'lon')) {
        var la = Object.prototype.hasOwnProperty.call(patch, 'lat')
          ? parseOptionalCoord(patch.lat, 'lat')
          : cur.lat;
        var lo = Object.prototype.hasOwnProperty.call(patch, 'lon')
          ? parseOptionalCoord(patch.lon, 'lon')
          : cur.lon;
        if (la != null && lo != null) {
          cur.lat = la;
          cur.lon = lo;
        } else if (patch.lat === null || patch.lon === null ||
                   patch.lat === '' || patch.lon === '') {
          delete cur.lat;
          delete cur.lon;
        }
      }
      list[i] = cur;
      found = cur;
      break;
    }
    if (!found) return null;
    saveWaterCatalog(list);
    /* Su iğnesi konumu değişince bağlı arılık mesafelerini haritadan yenile. */
    try {
      var ap = loadApiaries();
      var wd = refreshWaterDistancesFromMap(ap);
      if (wd.changed) saveApiaries(wd.list);
    } catch (eWd) { /* ignore */ }
    return found;
  }

  function removeWaterCatalogItem(id) {
    var key = String(id || '');
    if (!key) return false;
    var list = loadWaterCatalog();
    var next = list.filter(function (x) { return x.id !== key; });
    if (next.length === list.length) return false;
    saveWaterCatalog(next);
    return true;
  }

  /**
   * Distance for yield: manual waterDistanceM override wins;
   * else haversine when both apiary + catalog item have coords.
   */
  function computedWaterDistanceM(apiary, catalogItem) {
    if (!apiary || !catalogItem) return null;
    var alat = Number(apiary.lat);
    var alon = Number(apiary.lon);
    var wlat = Number(catalogItem.lat);
    var wlon = Number(catalogItem.lon);
    if (!isFinite(alat) || !isFinite(alon) || !isFinite(wlat) || !isFinite(wlon)) return null;
    return haversineMetres(alat, alon, wlat, wlon);
  }

  function effectiveWaterDistanceM(apiary, catalogItem) {
    var item = catalogItem || (apiary && apiary.waterSourceId ? waterCatalogById(apiary.waterSourceId) : null);
    /* Harita mesafesi varsa her zaman onu kullan — elle/uydurma değer skor/hedef balı şişirmesin. */
    var auto = computedWaterDistanceM(apiary, item);
    if (auto != null) {
      return { metres: Math.round(auto), source: 'haversine' };
    }
    var override = parseWaterDistanceM(apiary && apiary.waterDistanceM);
    if (override != null) return { metres: override, source: 'manual' };
    return { metres: null, source: 'none' };
  }

  /**
   * Tüm arılıklarda su mesafesini güncelle: su iğnesi + arılık koordinatı varsa
   * haversine (m) yaz; uydurma varsayılan (ör. 800) atma. Koordinat yoksa mesafeyi silme /
   * uydurma ekleme — yalnız elle girilmiş değer kalır.
   */
  function refreshWaterDistancesFromMap(list) {
    var changed = false;
    var out = (list || []).map(function (a) {
      if (!a) return a;
      var sid = a.waterSourceId != null ? String(a.waterSourceId).trim() : '';
      if (!sid) return a;
      var item = waterCatalogById(sid);
      var auto = computedWaterDistanceM(a, item);
      if (auto == null || !isFinite(auto)) return a;
      var metres = Math.round(auto);
      if (parseWaterDistanceM(a.waterDistanceM) === metres) {
        syncWaterConvenienceFromCatalog(a);
        return a;
      }
      changed = true;
      var copy = applyWaterDistance({
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: a.hiveCount
      }, a);
      copy.waterDistanceM = metres;
      syncWaterConvenienceFromCatalog(copy);
      return copy;
    });
    return { list: out, changed: changed };
  }

  /**
   * Max metres for a catalog water source to count as "local" to an apiary.
   * Beyond this (göçer taşınma / başka bölge) link is cleared — no fake 800 m.
   */
  var WATER_LOCAL_MAX_M = 15000;

  /**
   * Nearest catalog water source that has finite lat/lon (haversine).
   * @param {number} lat
   * @param {number} lon
   * @param {{ maxMetres?: number }|} [opts] - optional max distance filter
   * @returns {{ item: object, metres: number }|null}
   */
  function nearestWaterSourceWithCoords(lat, lon, opts) {
    var a = Number(lat);
    var b = Number(lon);
    if (!isFinite(a) || !isFinite(b)) return null;
    opts = opts || {};
    var maxM = opts.maxMetres != null ? Number(opts.maxMetres) : Infinity;
    if (!isFinite(maxM) || maxM < 0) maxM = Infinity;
    var list = loadWaterCatalog();
    var best = null;
    var bestM = Infinity;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var wlat = Number(item.lat);
      var wlon = Number(item.lon);
      if (!isFinite(wlat) || !isFinite(wlon)) continue;
      var m = haversineMetres(a, b, wlat, wlon);
      if (m == null) continue;
      if (m > maxM) continue;
      if (m < bestM) {
        bestM = m;
        best = item;
      }
    }
    if (!best) return null;
    return { item: best, metres: bestM };
  }

  function clearApiaryWaterLink(dest) {
    if (!dest) return dest;
    delete dest.waterSourceId;
    delete dest.waterSourceLabel;
    delete dest.waterSourceType;
    delete dest.waterSourceNote;
    delete dest.waterSourceConfirmedAt;
    delete dest.waterDistanceM;
    return dest;
  }

  /**
   * After apiary lat/lon change or new apiary: drop stale waterDistanceM,
   * keep linked catalog source only if still within WATER_LOCAL_MAX_M (refresh haversine),
   * else clear and auto-bind nearest local catalog source (if any).
   * Never invents a default distance (no 800 m).
   * @returns {{ apiary: object, changed: boolean, nearest: object|null, status: string }}
   */
  function resyncWaterForNewCoords(apiary, opts) {
    opts = opts || {};
    if (!apiary) return { apiary: apiary, changed: false, nearest: null, status: 'none' };
    var lat = Number(apiary.lat);
    var lon = Number(apiary.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      return { apiary: apiary, changed: false, nearest: null, status: 'no_coords' };
    }
    var maxM = opts.maxMetres != null ? Number(opts.maxMetres) : WATER_LOCAL_MAX_M;
    if (!isFinite(maxM) || maxM <= 0) maxM = WATER_LOCAL_MAX_M;

    var before = JSON.stringify({
      sid: apiary.waterSourceId || null,
      wd: apiary.waterDistanceM != null ? apiary.waterDistanceM : null,
      lab: apiary.waterSourceLabel || null
    });

    var copy = applyWaterDistance({
      id: apiary.id,
      name: apiary.name,
      place: apiary.place,
      lat: apiary.lat,
      lon: apiary.lon,
      hiveCount: apiary.hiveCount
    }, apiary);
    /* Location move invalidates manual override — haversine or honest empty. */
    delete copy.waterDistanceM;

    var sid = copy.waterSourceId != null ? String(copy.waterSourceId).trim() : '';
    var linkedItem = sid ? waterCatalogById(sid) : null;
    var linkedAuto = computedWaterDistanceM(copy, linkedItem);

    if (linkedItem && linkedAuto != null && linkedAuto <= maxM) {
      copy.waterDistanceM = Math.round(linkedAuto);
      syncWaterConvenienceFromCatalog(copy);
      var keptAfter = JSON.stringify({
        sid: copy.waterSourceId || null,
        wd: copy.waterDistanceM != null ? copy.waterDistanceM : null,
        lab: copy.waterSourceLabel || null
      });
      return {
        apiary: copy,
        changed: before !== keptAfter,
        nearest: { item: linkedItem, metres: linkedAuto },
        status: 'kept'
      };
    }

    if (sid) clearApiaryWaterLink(copy);

    var hit = nearestWaterSourceWithCoords(lat, lon, { maxMetres: maxM });
    if (hit && hit.item && hit.metres != null && hit.metres <= maxM) {
      copy.waterSourceId = hit.item.id;
      copy.waterDistanceM = Math.round(hit.metres);
      syncWaterConvenienceFromCatalog(copy);
      return {
        apiary: copy,
        changed: true,
        nearest: hit,
        status: 'bound'
      };
    }

    var after = JSON.stringify({
      sid: copy.waterSourceId || null,
      wd: copy.waterDistanceM != null ? copy.waterDistanceM : null,
      lab: copy.waterSourceLabel || null
    });
    return {
      apiary: copy,
      changed: before !== after,
      nearest: hit,
      status: hit ? 'too_far' : 'empty'
    };
  }

  /** Sync convenience fields from active catalog item onto dest. */
  function syncWaterConvenienceFromCatalog(dest) {
    if (!dest) return dest;
    var sid = dest.waterSourceId != null ? String(dest.waterSourceId).trim() : '';
    if (!sid) {
      delete dest.waterSourceLabel;
      return dest;
    }
    var item = waterCatalogById(sid);
    if (!item) return dest;
    dest.waterSourceType = item.typeKey;
    dest.waterSourceLabel = item.label;
    if (item.note) dest.waterSourceNote = item.note;
    else delete dest.waterSourceNote;
    /* If no manual override, leave waterDistanceM unset so estimate uses haversine. */
    return dest;
  }

  /**
   * If apiary has legacy type/distance but no waterSourceId, promote into global catalog once.
   * Catalog entries persist forever — never wiped on navigate/refresh.
   */
  function migrateLegacyWaterToCatalog(dest, src) {
    if (!dest) return dest;
    var existingId = dest.waterSourceId || (src && src.waterSourceId);
    if (existingId && waterCatalogById(existingId)) {
      dest.waterSourceId = String(existingId);
      return syncWaterConvenienceFromCatalog(dest);
    }
    var t = parseWaterSourceType(src && src.waterSourceType) || parseWaterSourceType(dest.waterSourceType);
    var n = parseWaterSourceNote(src && src.waterSourceNote) || parseWaterSourceNote(dest.waterSourceNote);
    var lab = parseWaterSourceLabel(src && src.waterSourceLabel) || parseWaterSourceLabel(dest.waterSourceLabel);
    var hasDist = parseWaterDistanceM(dest.waterDistanceM) != null ||
      parseWaterDistanceM(src && src.waterDistanceM) != null;
    if (!t && !lab && !n && !hasDist) return dest;
    if (!t && !lab && !n) return dest; /* distance alone — wait for type/label via UI */
    if (!t) t = 'diger';
    if (!lab) lab = n || WATER_SOURCE_TYPE_LABELS_TR[t] || t;
    var item = addWaterCatalogItem({ label: lab, typeKey: t, note: n });
    dest.waterSourceId = item.id;
    return syncWaterConvenienceFromCatalog(dest);
  }

  var LIVE_CACHE_KEYS = ['forageCache', 'climateCache', 'seasonCache'];
  var LIVE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  /** Persist live Open-Meteo snapshots on apiary (lat/lon/fetchedAt/payload). */
  function copyLiveCaches(dest, src) {
    if (!dest || !src) return dest;
    LIVE_CACHE_KEYS.forEach(function (k) {
      var c = src[k];
      if (c && typeof c === 'object' && c.payload != null) {
        dest[k] = {
          lat: c.lat != null ? Number(c.lat) : null,
          lon: c.lon != null ? Number(c.lon) : null,
          fetchedAt: c.fetchedAt != null ? String(c.fetchedAt) : null,
          payload: c.payload
        };
      }
    });
    return dest;
  }

  function clearLiveCaches(dest) {
    if (!dest) return dest;
    LIVE_CACHE_KEYS.forEach(function (k) { delete dest[k]; });
    return dest;
  }

  function coordsMatchCache(cache, lat, lon, eps) {
    if (!cache) return false;
    var cla = Number(cache.lat);
    var clo = Number(cache.lon);
    var la = Number(lat);
    var lo = Number(lon);
    if (!isFinite(cla) || !isFinite(clo) || !isFinite(la) || !isFinite(lo)) return false;
    eps = eps != null ? eps : 1e-5;
    return Math.abs(cla - la) <= eps && Math.abs(clo - lo) <= eps;
  }

  function isLiveCacheFresh(cache, lat, lon, maxAgeMs) {
    if (!cache || cache.payload == null || !cache.fetchedAt) return false;
    if (!coordsMatchCache(cache, lat, lon)) return false;
    var t = Date.parse(String(cache.fetchedAt));
    if (!isFinite(t)) return false;
    var maxAge = maxAgeMs != null ? maxAgeMs : LIVE_CACHE_MAX_AGE_MS;
    return Date.now() - t <= maxAge;
  }

  function makeLiveCache(lat, lon, payload) {
    return {
      lat: Number(lat),
      lon: Number(lon),
      fetchedAt: new Date().toISOString(),
      payload: payload
    };
  }

  /** Copy waterDistanceM + waterSourceId + type/note/label from src onto dest (load/save path). */
  function applyWaterDistance(dest, src) {
    var w = parseWaterDistanceM(src && src.waterDistanceM);
    if (w != null) dest.waterDistanceM = w;
    var sid = src && src.waterSourceId != null ? String(src.waterSourceId).trim() : '';
    if (sid) dest.waterSourceId = sid;
    var t = parseWaterSourceType(src && src.waterSourceType);
    if (t != null) dest.waterSourceType = t;
    var n = parseWaterSourceNote(src && src.waterSourceNote);
    if (n != null) dest.waterSourceNote = n;
    var lab = parseWaterSourceLabel(src && src.waterSourceLabel);
    if (lab != null) dest.waterSourceLabel = lab;
    if (src && src.waterSourceConfirmedAt != null && String(src.waterSourceConfirmedAt).trim()) {
      dest.waterSourceConfirmedAt = String(src.waterSourceConfirmedAt).trim();
    }
    migrateLegacyWaterToCatalog(dest, src);
    syncWaterConvenienceFromCatalog(dest);
    copyLiveCaches(dest, src);
    return dest;
  }

  var BREEDS = ['Anadolu', 'Kafkas', 'Karniyol', 'Karadeniz', 'Muğla', 'İtalyan', 'Kafkas × Karniyol', 'Karadeniz melez', 'Kafkas × Karadeniz', 'Muğla Arısı'];

  /*
   * Arılık başına ırk planı (seed + tek seferlik göç):
   *  a1 Kayaköy → hepsi Muğla · a2 Tortum → hepsi Kafkas × Karadeniz (Karadeniz = sarı Kafkas ekotipi)
   *  a3 Palandöken → hepsi Kafkas × Karniyol (melez, tek ırk) · a4 Yanıkdağ Baluğundüzü → hepsi Kafkas
   *  a5 Cimil Yaylası → hepsi Kafkas × Karadeniz (melez, tek ırk)
   */
  var APIARY_BREED_PLAN = {
    a1: ['Muğla'],
    a2: ['Kafkas × Karadeniz'],
    a3: ['Kafkas × Karniyol'],
    a4: ['Kafkas'],
    a5: ['Kafkas × Karadeniz']
  };
  var DEFAULT_SEED_BREED = 'Karniyol';

  /** Seed id veya ad/yer eşleşmesiyle plan anahtarı (a1..a4) — yoksa ''. */
  function breedPlanKeyFor(apiary) {
    if (!apiary) return '';
    var id = String(apiary.id || '');
    if (APIARY_BREED_PLAN[id]) return id;
    var txt = String(apiary.name || '') + ' ' + String(apiary.place || '');
    if (looksLikeYanikBalug(txt)) return 'a4';
    if (/tortum/i.test(txt)) return 'a2';
    if (/paland[oö]ken/i.test(txt)) return 'a3';
    if (/kayak[oö]y/i.test(txt)) return 'a1';
    if (/cimil/i.test(txt)) return 'a5';
    return '';
  }

  /** i. kovan (arılık içi sıra) için planlanan ırk; plan yoksa null. */
  function plannedBreed(planKey, i) {
    var plan = APIARY_BREED_PLAN[planKey];
    if (!plan || !plan.length) return null;
    return plan[(Number(i) || 0) % plan.length];
  }

  function seedBreedFor(apiaryId, i) {
    return plannedBreed(breedPlanKeyFor({ id: apiaryId }), i) || DEFAULT_SEED_BREED;
  }
  var STRENGTHS = ['güçlü', 'orta', 'zayıf', 'orta', 'güçlü', 'orta'];

  function normalizeHive(h) {
    var out = {
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
    /* Optional colony fields for yield / swap heuristics (graceful if absent). */
    if (h.strength != null && String(h.strength).trim()) out.strength = String(h.strength).trim();
    if (h.breed != null && String(h.breed).trim()) out.breed = String(h.breed).trim();
    else if (h.irk != null && String(h.irk).trim()) out.breed = String(h.irk).trim();
    copyColonyFields(out, h);
    return out;
  }

  /* ---------- Koloni: ana arı + koloni özellikleri (tek kaynak: kovan kaydı) ---------- */
  var COLONY_BREED_OPTIONS = ['Kafkas', 'Kafkas × Karadeniz', 'Kafkas × Karniyol', 'Kafkas × Anadolu', 'Karadeniz', 'Karniyol', 'Karniyol × Muğla', 'Muğla', 'Anadolu', 'İtalyan', 'Buckfast', 'Diğer'];
  var SWARM_TENDENCIES = ['Düşük', 'Orta', 'Yüksek'];
  var CALM_LABELS = { 1: 'Çok sinirli', 2: 'Sinirli', 3: 'Orta', 4: 'Sakin', 5: 'Çok sakin' };
  /* Uluslararası ana arı renk kodu (yılın son hanesi). */
  var QUEEN_COLORS = [
    { name: 'Mavi', hex: '#1e6fd9' },    /* 0 */
    { name: 'Beyaz', hex: '#f4f4f4' },   /* 1 */
    { name: 'Sarı', hex: '#f2c500' },    /* 2 */
    { name: 'Kırmızı', hex: '#d62828' }, /* 3 */
    { name: 'Yeşil', hex: '#2f9e44' },   /* 4 */
    { name: 'Mavi', hex: '#1e6fd9' },    /* 5 */
    { name: 'Beyaz', hex: '#f4f4f4' },   /* 6 */
    { name: 'Sarı', hex: '#f2c500' },    /* 7 */
    { name: 'Kırmızı', hex: '#d62828' }, /* 8 */
    { name: 'Yeşil', hex: '#2f9e44' }    /* 9 */
  ];

  function parseQueenYear(v) {
    if (v == null || v === '') return null;
    var n = Math.round(Number(v));
    return isFinite(n) && n >= 1990 && n <= 2100 ? n : null;
  }
  function parseCalmness(v) {
    if (v == null || v === '') return null;
    var n = Math.round(Number(v));
    return isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }
  function parseSwarmTendency(v) {
    var t = String(v == null ? '' : v).trim();
    for (var i = 0; i < SWARM_TENDENCIES.length; i++) {
      if (t.toLocaleLowerCase('tr') === SWARM_TENDENCIES[i].toLocaleLowerCase('tr')) return SWARM_TENDENCIES[i];
    }
    return null;
  }
  function copyColonyFields(out, h) {
    if (!h) return out;
    var qy = parseQueenYear(h.queenYear);
    if (qy != null) out.queenYear = qy;
    if (h.queenSource != null && String(h.queenSource).trim()) out.queenSource = String(h.queenSource).trim().slice(0, 120);
    if (h.queenMarked === true || h.queenMarked === false) out.queenMarked = h.queenMarked;
    if (h.queenClipped === true || h.queenClipped === false) out.queenClipped = h.queenClipped;
    if (h.queenClipped === true && /^\d{4}-\d{2}-\d{2}$/.test(String(h.queenClippedAt || ''))) out.queenClippedAt = String(h.queenClippedAt);
    var c = parseCalmness(h.calmness);
    if (c != null) out.calmness = c;
    var st = parseSwarmTendency(h.swarmTendency);
    if (st) out.swarmTendency = st;
    if (h.colonyNote != null && String(h.colonyNote).trim()) out.colonyNote = String(h.colonyNote).trim().slice(0, 500);
    if (h.colonyUpdatedAt != null && String(h.colonyUpdatedAt).trim()) out.colonyUpdatedAt = String(h.colonyUpdatedAt).trim();
    if (h.currentQueenId != null && String(h.currentQueenId).trim()) out.currentQueenId = String(h.currentQueenId).trim().slice(0, 32);
    if (Array.isArray(h.queenHistory) && h.queenHistory.length) {
      var hist = h.queenHistory.map(normalizeQueenHistoryEntry).filter(Boolean);
      if (hist.length) out.queenHistory = hist.slice(-20);
    }
    /* Koloni işlemleri (bölme / birleştirme / ana taşıma / ana üretimi). */
    if (h.queenless === true) out.queenless = true;
    if (h.queenCellSince && /^\d{4}-\d{2}-\d{2}$/.test(String(h.queenCellSince))) out.queenCellSince = String(h.queenCellSince);
    if (h.colonyState === 'birlestirildi') out.colonyState = 'birlestirildi';
    if (h.mergedInto != null && isFinite(Number(h.mergedInto))) out.mergedInto = Number(h.mergedInto);
    if (h.splitFrom != null && isFinite(Number(h.splitFrom))) out.splitFrom = Number(h.splitFrom);
    if (h.createdBy === 'bolme') out.createdBy = 'bolme';
    if (h.queenGivenAt && /^\d{4}-\d{2}-\d{2}$/.test(String(h.queenGivenAt))) out.queenGivenAt = String(h.queenGivenAt);
    if (Array.isArray(h.colonyEvents) && h.colonyEvents.length) {
      out.colonyEvents = h.colonyEvents.filter(function (e) { return e && e.date && e.text; }).slice(-30).map(function (e) {
        var o = { id: String(e.id || '').slice(0, 40), date: String(e.date).slice(0, 10), type: String(e.type || '').slice(0, 20), text: String(e.text).slice(0, 300) };
        if (e.otherHiveId != null) o.otherHiveId = Number(e.otherHiveId);
        return o;
      });
    }
    return out;
  }
  function todayLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  /** Geçmiş girdisi: { date, oldYear, oldBreed, newYear, newBreed, source, marked, note, bulk }. */
  function normalizeQueenHistoryEntry(e) {
    if (!e || typeof e !== 'object') return null;
    var o = {};
    var d = String(e.date || '').trim();
    o.date = /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : todayLocal();
    var oy = parseQueenYear(e.oldYear != null ? e.oldYear : e.prevQueenYear);
    if (oy != null) o.oldYear = oy;
    var ob = e.oldBreed != null ? e.oldBreed : e.prevBreed;
    if (ob != null && String(ob).trim()) o.oldBreed = String(ob).trim().slice(0, 60);
    var ny = parseQueenYear(e.newYear != null ? e.newYear : e.queenYear);
    if (ny != null) o.newYear = ny;
    var nb = e.newBreed != null ? e.newBreed : e.breed;
    if (nb != null && String(nb).trim()) o.newBreed = String(nb).trim().slice(0, 60);
    if (e.source != null && String(e.source).trim()) o.source = String(e.source).trim().slice(0, 120);
    if (e.marked === true || e.marked === false) o.marked = e.marked;
    if (e.note != null && String(e.note).trim()) o.note = String(e.note).trim().slice(0, 300);
    if (e.bulk === true) o.bulk = true;
    if (e.oldQueenId) o.oldQueenId = String(e.oldQueenId).slice(0, 32);
    if (e.newQueenId) o.newQueenId = String(e.newQueenId).slice(0, 32);
    if (e.label != null && String(e.label).trim()) o.label = String(e.label).trim().slice(0, 120);
    return o;
  }

  function currentYear() { return new Date().getFullYear(); }
  function queenAge(h) {
    var y = parseQueenYear(h && h.queenYear);
    if (y == null) return null;
    return Math.max(0, currentYear() - y);
  }
  function queenColor(year) {
    var y = parseQueenYear(year);
    if (y == null) return null;
    return QUEEN_COLORS[y % 10];
  }
  /** 'Yenile' (yaş ≥ 2), 'Bilinmiyor' (yıl yok) veya null (sorun yok). */
  function queenStatus(h) {
    var age = queenAge(h);
    if (age == null) return 'Bilinmiyor';
    return age >= 2 ? 'Yenile' : null;
  }
  function calmLabel(n) {
    var c = parseCalmness(n);
    return c == null ? '' : (CALM_LABELS[c] + ' (' + c + '/5)');
  }
  /** Kapsam özeti: ırk dağılımı, ort. ana yaşı, yenilenecek / bilinmeyen sayısı. */
  function colonySummary(hives) {
    var list = hives || [];
    var counts = {}, order = [];
    var ageSum = 0, ageN = 0, requeen = 0, unknown = 0;
    list.forEach(function (h) {
      var b = String((h && h.breed) || '').trim() || 'Belirtilmemiş';
      if (!counts[b]) { counts[b] = 0; order.push(b); }
      counts[b]++;
      var age = queenAge(h);
      if (age == null) unknown++;
      else {
        ageSum += age; ageN++;
        if (age >= 2) requeen++;
      }
    });
    var breeds = order.map(function (b, i) { return { breed: b, count: counts[b], i: i }; })
      .sort(function (x, y) { return (y.count - x.count) || (x.i - y.i); })
      .map(function (x) { return { breed: x.breed, count: x.count }; });
    return {
      total: list.length,
      breeds: breeds,
      avgQueenAge: ageN ? Math.round((ageSum / ageN) * 10) / 10 : null,
      knownAges: ageN,
      requeen: requeen,
      unknown: unknown
    };
  }
  function colonySummaryText(hives) {
    var s = colonySummary(hives);
    if (!s.total) return '';
    var br = s.breeds.map(function (b) { return b.breed + ' ' + b.count; }).join(' · ');
    return br + ' · ort. ana yaşı ' + (s.avgQueenAge != null ? String(s.avgQueenAge).replace('.', ',') : '—') +
      ' · yenilenecek ana ' + s.requeen + (s.unknown ? ' · bilinmeyen ' + s.unknown : '');
  }

  /* ---------- Ana arı kayıtları (kovandan bağımsız, ayrı depo) ----------
   * Queen: { id:'Q-2026-0012', year, breed, source, marked, note, createdAt,
   *          placements:[{ hiveId, from, to|null, endReason }] }
   * Kovan: currentQueenId → mevcut ana; hive.breed/queenYear/queenSource/queenMarked
   * mevcut anadan türetilen aynalardır (majorityBreed / kışlama kodu hive.breed okur).
   */
  function normalizeQueen(q) {
    if (!q || typeof q !== 'object' || !q.id) return null;
    var o = { id: String(q.id).slice(0, 32) };
    var y = parseQueenYear(q.year);
    o.year = y;
    o.breed = q.breed != null && String(q.breed).trim() ? String(q.breed).trim().slice(0, 60) : '';
    if (q.source != null && String(q.source).trim()) o.source = String(q.source).trim().slice(0, 120);
    if (q.marked === true || q.marked === false) o.marked = q.marked;
    if (q.note != null && String(q.note).trim()) o.note = String(q.note).trim().slice(0, 300);
    if (q.clipped === true || q.clipped === false) o.clipped = q.clipped;
    if (q.clipped === true && /^\d{4}-\d{2}-\d{2}$/.test(String(q.clippedAt || ''))) o.clippedAt = String(q.clippedAt);
    o.createdAt = String(q.createdAt || new Date().toISOString());
    if (q.migrated === true) o.migrated = true;
    o.placements = (Array.isArray(q.placements) ? q.placements : []).map(function (p) {
      if (!p || p.hiveId == null) return null;
      return {
        hiveId: Number(p.hiveId),
        from: p.from ? String(p.from).slice(0, 10) : null,
        to: p.to ? String(p.to).slice(0, 10) : null,
        endReason: p.endReason ? String(p.endReason).slice(0, 60) : null
      };
    }).filter(Boolean);
    return o;
  }
  function loadQueens() {
    try {
      var raw = localStorage.getItem(QUEENS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(normalizeQueen).filter(Boolean) : [];
    } catch (e) { return []; }
  }
  function saveQueens(list) {
    try { localStorage.setItem(QUEENS_KEY, JSON.stringify(list || [])); } catch (e) { /* ignore */ }
  }
  function queenSeq(id) {
    var m = /-(\d+)$/.exec(String(id || ''));
    return m ? Number(m[1]) : 0;
  }
  function makeQueenIdGen(queens) {
    var max = 0;
    (queens || []).forEach(function (q) { max = Math.max(max, queenSeq(q.id)); });
    return function (year) {
      max++;
      return 'Q-' + (year || currentYear()) + '-' + String(max).padStart(4, '0');
    };
  }
  function openPlacement(q) {
    var ps = q && q.placements ? q.placements : [];
    for (var i = ps.length - 1; i >= 0; i--) if (!ps[i].to) return ps[i];
    return null;
  }
  function queenById(id, queens) {
    var list = queens || loadQueens();
    for (var i = 0; i < list.length; i++) if (list[i].id === String(id)) return list[i];
    return null;
  }
  /** Kovan aynası ← mevcut ana (breed, queenYear, queenSource, queenMarked). */
  function mirrorQueenToHive(hive, q) {
    delete hive.queenYear; delete hive.queenSource; delete hive.queenMarked; delete hive.queenClipped; delete hive.queenClippedAt;
    if (!q) { delete hive.currentQueenId; return hive; }
    hive.currentQueenId = q.id;
    if (q.year != null) hive.queenYear = q.year;
    if (q.breed) hive.breed = q.breed;
    if (q.source) hive.queenSource = q.source;
    if (q.marked === true || q.marked === false) hive.queenMarked = q.marked;
    if (q.clipped === true || q.clipped === false) hive.queenClipped = q.clipped;
    if (q.clipped === true && q.clippedAt) hive.queenClippedAt = q.clippedAt;
    return hive;
  }
  function sameMirror(h, q) {
    return h.currentQueenId === q.id &&
      (h.queenYear == null ? null : h.queenYear) === q.year &&
      (!q.breed || h.breed === q.breed) &&
      (h.queenSource || '') === (q.source || '') &&
      (h.queenMarked == null ? null : h.queenMarked) === (q.marked == null ? null : q.marked) &&
      (h.queenClipped == null ? null : h.queenClipped) === (q.clipped == null ? null : q.clipped) &&
      (h.queenClippedAt || '') === (q.clipped === true && q.clippedAt ? q.clippedAt : '');
  }
  function cloneObj(h) {
    var c = {};
    for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) c[k] = h[k];
    return c;
  }

  /**
   * Her kovanın bir ana kaydı olmasını sağla (ilk çalışmada: mevcut queenYear/breed'den aktarım),
   * kovan aynalarını anadan eşitle, kaldırılan kovanlardaki açık yerleşimleri kapat.
   */
  function ensureQueens(hives) {
    var queens = loadQueens();
    var byId = {};
    queens.forEach(function (q) { byId[q.id] = q; });
    var gen = makeQueenIdGen(queens);
    var qChanged = false, hChanged = false;
    var hiveIds = {};
    var nowIso = new Date().toISOString();
    var out = (hives || []).map(function (h) {
      hiveIds[h.id] = true;
      var q = h.currentQueenId ? byId[h.currentQueenId] : null;
      /* Anasız / birleştirilmiş kovana otomatik ana kaydı açılmaz. */
      if (!q && (h.queenless === true || h.colonyState === 'birlestirildi')) return h;
      if (!q) {
        q = normalizeQueen({
          id: gen(h.queenYear),
          year: h.queenYear, breed: h.breed, source: h.queenSource, marked: h.queenMarked,
          createdAt: nowIso, migrated: true,
          placements: [{ hiveId: h.id, from: null, to: null, endReason: null }]
        });
        queens.push(q); byId[q.id] = q; qChanged = true;
      } else {
        var op = openPlacement(q);
        if (!op || op.hiveId !== h.id) {
          if (op) { op.to = todayLocal(); op.endReason = 'Başka kovana taşındı'; }
          q.placements.push({ hiveId: h.id, from: todayLocal(), to: null, endReason: null });
          qChanged = true;
        }
      }
      if (sameMirror(h, q)) return h;
      hChanged = true;
      return normalizeHive(mirrorQueenToHive(cloneObj(h), q));
    });
    queens.forEach(function (q) {
      var op = openPlacement(q);
      if (op && !hiveIds[op.hiveId]) { op.to = todayLocal(); op.endReason = 'Kovan kaldırıldı'; qChanged = true; }
    });
    if (qChanged) saveQueens(queens);
    return { list: out, changed: hChanged };
  }

  /** Değişim: eski ananın yerleşimini kapat, yeni ana kaydı oluştur ve yerleştir. (queens dizisini değiştirir) */
  function replaceQueenInMemory(hive, patch, queens, gen, opts) {
    opts = opts || {};
    var date = /^\d{4}-\d{2}-\d{2}$/.test(String(patch.date || '')) ? patch.date : todayLocal();
    var old = hive.currentQueenId ? queenById(hive.currentQueenId, queens) : null;
    if (old) {
      var op = openPlacement(old);
      if (op && op.hiveId === hive.id) { op.to = date; op.endReason = 'Değiştirildi'; }
    }
    var y = parseQueenYear(patch.queenYear);
    var breed = String(patch.breed == null ? '' : patch.breed).trim().slice(0, 60) || hive.breed || '';
    var nq = normalizeQueen({
      id: gen(y),
      year: y, breed: breed,
      source: patch.queenSource, marked: patch.queenMarked, note: patch.note,
      createdAt: new Date().toISOString(),
      placements: [{ hiveId: hive.id, from: date, to: null, endReason: null }]
    });
    queens.push(nq);
    var copy = cloneObj(hive);
    var entry = { date: date, oldQueenId: old ? old.id : hive.currentQueenId, newQueenId: nq.id };
    if (hive.queenYear != null) entry.oldYear = hive.queenYear;
    if (hive.breed) entry.oldBreed = hive.breed;
    if (nq.year != null) entry.newYear = nq.year;
    if (nq.breed) entry.newBreed = nq.breed;
    if (nq.source) entry.source = nq.source;
    if (nq.marked === true || nq.marked === false) entry.marked = nq.marked;
    if (nq.note) entry.note = nq.note;
    if (opts.bulk) entry.bulk = true;
    copy.queenHistory = (Array.isArray(hive.queenHistory) ? hive.queenHistory.slice() : []).concat([entry]);
    mirrorQueenToHive(copy, nq);
    /* Yeni ana: anasız / ana hücresi durumu kapanır. */
    delete copy.queenless; delete copy.queenCellSince;
    copy.queenGivenAt = date;
    copy.colonyUpdatedAt = new Date().toISOString();
    return { hive: copy, queen: nq, oldQueen: old, entry: entry };
  }

  function applyColonyTraits(copy, patch) {
    ['calmness', 'swarmTendency', 'colonyNote'].forEach(function (f) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, f)) delete copy[f];
    });
    var tmp = {};
    ['calmness', 'swarmTendency', 'colonyNote'].forEach(function (f) { if (patch && patch[f] != null) tmp[f] = patch[f]; });
    copyColonyFields(copy, tmp);
  }

  /**
   * Tek kovan (Koloni düzenleyicisi).
   * mode 'correct' (Bilgileri düzelt): mevcut ana kaydını günceller, yeni kayıt yok.
   * mode 'replace' (Ana arıyı değiştir): eski yerleşimi kapatır, yeni ana oluşturur, kovan geçmişine yazar.
   * Koloni özellikleri (sakinlik, oğul eğilimi, koloni notu) her iki modda kovana yazılır.
   */
  function updateHiveColony(id, patch, mode) {
    patch = patch || {};
    var n = Number(id);
    var list = loadHives();
    var queens = loadQueens();
    var gen = makeQueenIdGen(queens);
    var found = null;
    var out = list.map(function (h) {
      if (h.id !== n) return h;
      var copy;
      if (mode === 'replace') {
        copy = replaceQueenInMemory(h, patch, queens, gen).hive;
      } else {
        copy = cloneObj(h);
        var q = h.currentQueenId ? queenById(h.currentQueenId, queens) : null;
        if (q) {
          if (Object.prototype.hasOwnProperty.call(patch, 'queenYear')) q.year = parseQueenYear(patch.queenYear);
          if (patch.breed != null && String(patch.breed).trim()) q.breed = String(patch.breed).trim().slice(0, 60);
          if (Object.prototype.hasOwnProperty.call(patch, 'queenSource')) {
            var src = String(patch.queenSource == null ? '' : patch.queenSource).trim();
            if (src) q.source = src.slice(0, 120); else delete q.source;
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'queenMarked')) {
            if (patch.queenMarked === true || patch.queenMarked === false) q.marked = patch.queenMarked; else delete q.marked;
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'queenClipped')) {
            if (patch.queenClipped === true) {
              q.clipped = true;
              var cd = String(patch.queenClippedAt || '');
              if (/^\d{4}-\d{2}-\d{2}$/.test(cd)) q.clippedAt = cd; else if (!q.clippedAt) q.clippedAt = todayLocal();
            } else if (patch.queenClipped === false) { q.clipped = false; delete q.clippedAt; }
            else { delete q.clipped; delete q.clippedAt; }
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'queenNote')) {
            var qn = String(patch.queenNote == null ? '' : patch.queenNote).trim();
            if (qn) q.note = qn.slice(0, 300); else delete q.note;
          }
          mirrorQueenToHive(copy, q);
        }
      }
      applyColonyTraits(copy, patch);
      copy.colonyUpdatedAt = new Date().toISOString();
      found = normalizeHive(copy);
      return found;
    });
    if (!found) return null;
    saveQueens(queens);
    saveHives(out);
    return found;
  }

  /** Ana arı kanadı kırpıldı: mevcut ana kaydına yazar + tamamlanan görev olarak kayıt düşer. */
  function setQueenClipped(hiveId, on, date) {
    var d = isoDate(date) || todayLocal();
    var saved = updateHiveColony(hiveId, { queenClipped: on === true ? true : (on === false ? false : null), queenClippedAt: d }, 'correct');
    if (saved && on === true) {
      try {
        var row = addUserTask({ title: 'Ana arı kanadı kırpıldı — ' + saved.name + (workMode() === 'demo' ? ' · Demo' : ''), hiveId: saved.id, due: d, priority: 3, note: '[ana:kirpik] ' + (saved.currentQueenId || '') });
        if (row) completeTask(row.id, { date: d, note: 'Kanat kırpma kaydı' });
      } catch (e) { /* ignore */ }
    }
    return saved;
  }

  /**
   * Toplu ana arı değişimi: seçili her kovan için ayrı yeni ana kaydı + kovan geçmişi.
   * Döner: [{ id, name, oldYear, newYear, oldBreed, newBreed, oldQueenId, newQueenId }]
   */
  function bulkQueenReplace(ids, patch) {
    patch = patch || {};
    var want = {};
    (ids || []).forEach(function (id) { want[Number(id)] = true; });
    var queens = loadQueens();
    var gen = makeQueenIdGen(queens);
    var updated = [];
    var out = loadHives().map(function (h) {
      if (!want[h.id]) return h;
      var r = replaceQueenInMemory(h, patch, queens, gen, { bulk: true });
      var nh = normalizeHive(r.hive);
      updated.push({
        id: nh.id, name: nh.name,
        oldYear: r.entry.oldYear, newYear: r.entry.newYear,
        oldBreed: r.entry.oldBreed, newBreed: r.entry.newBreed,
        oldQueenId: r.entry.oldQueenId, newQueenId: r.entry.newQueenId
      });
      return nh;
    });
    if (updated.length) { saveQueens(queens); saveHives(out); }
    return updated;
  }

  /** Kapsamdaki ana arılar: mevcut (açık yerleşimi kapsamda) + önceki (geçmiş yerleşimi kapsamda). */
  function queensForHives(hiveIds) {
    var set = {};
    (hiveIds || []).forEach(function (id) { set[Number(id)] = true; });
    var current = [], past = [];
    loadQueens().forEach(function (q) {
      var op = openPlacement(q);
      if (op && set[op.hiveId]) current.push(q);
      else if (q.placements.some(function (p) { return set[p.hiveId]; })) past.push(q);
    });
    var bySeq = function (a, b) { return queenSeq(b.id) - queenSeq(a.id); };
    current.sort(function (a, b) { return (openPlacement(a).hiveId - openPlacement(b).hiveId); });
    past.sort(bySeq);
    return { current: current, past: past };
  }

  /** Demo ana arı yılları + özellikler — tek seferlik, yalnız eksik alanları doldurur. */
  function seedQueenTraits(hives) {
    var changed = false;
    var years = [2025, 2024, 2026, 2025, 2026, 2024, 2025, 2026, 2025, 2024, 2026, null];
    var out = (hives || []).map(function (h) {
      if (!h || !isFinite(h.id)) return h;
      var id = Number(h.id);
      var copy = null;
      function set(k, v) {
        if (!copy) {
          copy = {};
          for (var kk in h) if (Object.prototype.hasOwnProperty.call(h, kk)) copy[kk] = h[kk];
        }
        copy[k] = v;
      }
      var seed = (id * 7 + 3) % 12;
      if (h.queenYear == null && years[seed] != null) set('queenYear', years[seed]);
      if (h.calmness == null) {
        var br = String(h.breed || '');
        var base = /Karniyol|Kafkas/.test(br) ? 4 : (/Muğla|Anadolu/.test(br) ? 3 : 3);
        set('calmness', Math.max(1, Math.min(5, base + ((id % 5) === 0 ? -1 : ((id % 7) === 0 ? 1 : 0)))));
      }
      if (h.swarmTendency == null) {
        set('swarmTendency', demoSwarmTendency(h.breed, id));
      }
      if (h.queenMarked == null && h.queenYear == null && years[seed] != null) set('queenMarked', (id % 3) !== 0);
      if (copy) { changed = true; return copy; }
      return h;
    });
    return { list: out, changed: changed };
  }

  /** Demo oğul eğilimi: ırka göre (Kafkas/Karadeniz düşük, Karniyol/Muğla daha yüksek). */
  function demoSwarmTendency(breed, id) {
    var f = breedSwarmFactor(breed).f;
    if (f <= 0.65) return (id % 9) === 0 ? 'Orta' : 'Düşük';
    if (f >= 1.2) return (id % 3) === 0 ? 'Yüksek' : 'Orta';
    return (id % 4) === 0 ? 'Düşük' : 'Orta';
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
      swarmRisk: SWARMS[i % SWARMS.length],
      strength: STRENGTHS[i % STRENGTHS.length],
      breed: seedBreedFor(apiaryId, i)
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


  var PLACE_A1 = 'Kayaköy';
  var NAME_A1 = 'Kayaköy Ana Arılık';
  var PLACE_YANIK = 'Yanıkdağ Baluğundüzü';
  var NAME_YANIK = 'Yanıkdağ Baluğundüzü Arılığı';
  var YANIK_TARGET_LAT = 41.080781;
  var YANIK_TARGET_LON = 40.753956;
  var TORTUM_TARGET_LAT = 40.257866;
  var TORTUM_TARGET_LON = 41.613415;
  /* Fethiye Kayaköy (Muğla) — Muğla Arısı için doğru bölge; eski Erzurum 39.92/41.27 değil. */
  var KAYAKOY_TARGET_LAT = 36.58141;
  var KAYAKOY_TARGET_LON = 29.08886;
  /* Erzurum–Palandöken kenarı (~1920 m mera/yayla bandı; kayak zirvesi değil). */
  var PALANDOKEN_TARGET_LAT = 39.90;
  var PALANDOKEN_TARGET_LON = 41.27;
  var YANIK_LEGACY_COORDS = [
    { lat: 39.95, lon: 41.30 },
    { lat: 41.072, lon: 40.743 }
  ];

  function looksLikeYanikBalug(s) {
    var lower = String(s || '').toLocaleLowerCase('tr');
    return (lower.indexOf('yanıkdağ') !== -1 && (
      lower.indexOf('baluğundüzü') !== -1 ||
      lower.indexOf('balığundüzü') !== -1 ||
      lower.indexOf('balığındüzü') !== -1 ||
      lower.indexOf('balığun') !== -1
    )) || lower.indexOf('baluğundüzü') !== -1 || lower.indexOf('balığundüzü') !== -1 ||
      lower.indexOf('balığındüzü') !== -1 || lower.indexOf('balığun') !== -1;
  }

  function isLegacyYanikCoords(a) {
    var lat = Number(a && a.lat);
    var lon = Number(a && a.lon);
    if (!isFinite(lat) || !isFinite(lon)) return false;
    return YANIK_LEGACY_COORDS.some(function (old) {
      return Math.abs(lat - old.lat) <= 0.02 && Math.abs(lon - old.lon) <= 0.02;
    });
  }

  function isLegacyTortumCoords(a) {
    var lat = Number(a && a.lat);
    var lon = Number(a && a.lon);
    return isFinite(lat) && isFinite(lon) && Math.abs(lat - 40.61) <= 0.02 && Math.abs(lon - 41.66) <= 0.02;
  }

  function isNearCoordinateTarget(a, targetLat, targetLon) {
    var lat = Number(a && a.lat);
    var lon = Number(a && a.lon);
    return isFinite(lat) && isFinite(lon) && Math.abs(lat - targetLat) <= 0.0005 && Math.abs(lon - targetLon) <= 0.0005;
  }

  function migrateApiaryCoordinates(list) {
    var changed = false;
    var out = (list || []).map(function (a) {
      if (!a) return a;
      var id = String(a.id);
      var isYanik = id === 'a4' || (id !== 'a1' && id !== 'a2' && id !== 'a3' && (looksLikeYanikBalug(a.name) || looksLikeYanikBalug(a.place)));
      var isTortum = id === 'a2' || (id !== 'a1' && id !== 'a4' && id !== 'a3' && (/tortum/i.test(String(a.name || '')) || /tortum/i.test(String(a.place || ''))));
      var isPalandoken = id === 'a3' || (/paland[oö]ken/i.test(String(a.name || '')) || /paland[oö]ken/i.test(String(a.place || '')));
      var isKayakoy = id === 'a1' || (/kayaköy/i.test(String(a.name || '')) || /kayaköy/i.test(String(a.place || '')) || /kayakoy/i.test(String(a.name || '')) || /kayakoy/i.test(String(a.place || '')));
      var targetLat = null;
      var targetLon = null;
      if (isYanik) {
        targetLat = YANIK_TARGET_LAT;
        targetLon = YANIK_TARGET_LON;
      } else if (isTortum) {
        targetLat = TORTUM_TARGET_LAT;
        targetLon = TORTUM_TARGET_LON;
      } else if (isPalandoken) {
        targetLat = PALANDOKEN_TARGET_LAT;
        targetLon = PALANDOKEN_TARGET_LON;
      } else if (isKayakoy) {
        targetLat = KAYAKOY_TARGET_LAT;
        targetLon = KAYAKOY_TARGET_LON;
      }
      if (targetLat == null || isNearCoordinateTarget(a, targetLat, targetLon)) return a;
      changed = true;
      var copy = {};
      for (var k in a) {
        if (Object.prototype.hasOwnProperty.call(a, k)) copy[k] = a[k];
      }
      copy.lat = targetLat;
      copy.lon = targetLon;
      return copy;
    });
    return { list: out, changed: changed };
  }

  /** Exact «Yanıkdağ» or any Baluğundüzü variant → canonical place/name. Never touches Kayaköy. */
  function migrateExactYanik(s, asName) {
    var t = String(s || '').trim();
    if (!t) return t;
    var lower = t.toLocaleLowerCase('tr');
    if (lower.indexOf('kayaköy') !== -1) return t;
    /* Canonicalize every Yanıkdağ Baluğundüzü spelling to seed labels. */
    if (looksLikeYanikBalug(t)) return asName ? NAME_YANIK : PLACE_YANIK;
    if (t === 'Yanıkdağ' || t === 'Yanıkdağ Arılığı' || t === 'Yanıkdağ Ana Arılık') {
      return asName ? NAME_YANIK : PLACE_YANIK;
    }
    if (/^Yanıkdağ(\s|$)/i.test(t) && lower.indexOf('baluğundüzü') === -1 && lower.indexOf('balığındüzü') === -1) {
      return asName ? NAME_YANIK : PLACE_YANIK;
    }
    return t;
  }

  /** Undo 66c8045: a1 wrongly renamed Kayaköy → Yanıkdağ Baluğundüzü. */
  function restoreKayakoyA1(list) {
    var changed = false;
    var out = (list || []).map(function (a) {
      if (!a || String(a.id) !== 'a1') return a;
      var name = String(a.name || '').trim();
      var place = String(a.place || '').trim();
      var bad = looksLikeYanikBalug(name) || looksLikeYanikBalug(place);
      if (!bad) return a;
      changed = true;
      return applyWaterDistance({
        id: a.id,
        name: NAME_A1,
        place: PLACE_A1,
        lat: a.lat != null && isFinite(Number(a.lat)) ? Number(a.lat) : KAYAKOY_TARGET_LAT,
        lon: a.lon != null && isFinite(Number(a.lon)) ? Number(a.lon) : KAYAKOY_TARGET_LON,
        hiveCount: a.hiveCount
      }, a);
    });
    return { list: out, changed: changed };
  }

  function migrateApiaryNames(list) {
    var changed = false;
    var out = (list || []).map(function (a) {
      if (!a) return a;
      /* a1 Kayaköy must not be migrated to Yanıkdağ */
      if (String(a.id) === 'a1') return a;
      var name = String(a.name || '').trim();
      var place = String(a.place || '').trim();
      var nextName = migrateExactYanik(name, true);
      var nextPlace = migrateExactYanik(place, false);
      if (nextName !== name || nextPlace !== place) {
        changed = true;
        return applyWaterDistance({
          id: a.id,
          name: nextName || name || 'Arılık',
          place: nextPlace || place || '—',
          lat: a.lat,
          lon: a.lon,
          hiveCount: a.hiveCount
        }, a);
      }
      return a;
    });
    return { list: out, changed: changed };
  }

  /** Append missing seed apiaries by id (a4/a5 …) without wiping user rows. */
  function readDeletedSeedIds() {
    try {
      var raw = localStorage.getItem(DELETED_SEEDS_KEY);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      var map = {};
      if (Array.isArray(arr)) {
        arr.forEach(function (id) { if (id) map[String(id)] = true; });
      }
      return map;
    } catch (e) { return {}; }
  }

  function markSeedDeleted(id) {
    var key = String(id || '');
    if (!key) return;
    var isSeed = SEED_APIARIES.some(function (s) { return s.id === key; });
    if (!isSeed) return;
    var map = readDeletedSeedIds();
    if (map[key]) return;
    map[key] = true;
    try {
      localStorage.setItem(DELETED_SEEDS_KEY, JSON.stringify(Object.keys(map)));
    } catch (e) { /* ignore */ }
  }

  function ensureSeedApiariesPresent(list) {
    var changed = false;
    var byId = {};
    var deleted = readDeletedSeedIds();
    (list || []).forEach(function (a) {
      if (a && a.id) byId[String(a.id)] = true;
    });
    var out = (list || []).slice();
    SEED_APIARIES.forEach(function (seed) {
      if (byId[seed.id]) return;
      if (deleted[seed.id]) return; /* user deleted this seed — do not resurrect */
      changed = true;
      out.push(copyAdminFields({
        id: seed.id,
        name: seed.name,
        place: seed.place,
        lat: seed.lat,
        lon: seed.lon,
        hiveCount: seed.hiveCount
      }, seed));
    });
    return { list: out, changed: changed };
  }


  function isYanikBalugApiary(a) {
    if (!a || String(a.id) === 'a1') return false;
    return looksLikeYanikBalug(a.name) || looksLikeYanikBalug(a.place)
      || /^yanıkdağ$/i.test(String(a.place || '').trim())
      || /^yanıkdağ$/i.test(String(a.name || '').trim())
      || /^yanıkdağ(\s+arı(lığı)?)?$/i.test(String(a.name || '').trim());
  }

  /**
   * Collapse duplicate Yanıkdağ Baluğundüzü apiaries onto seed a4.
   * Returns remappedIds: { oldId: 'a4', ... } for hive/expense repoint.
   */
  function dedupeYanikBalugApiaries(list) {
    var keep = [];
    var dups = [];
    (list || []).forEach(function (a) {
      if (!a) return;
      if (isYanikBalugApiary(a)) dups.push(a);
      else keep.push(a);
    });
    var remappedIds = {};
    var seedA4 = null;
    for (var si = 0; si < SEED_APIARIES.length; si++) {
      if (SEED_APIARIES[si].id === 'a4') { seedA4 = SEED_APIARIES[si]; break; }
    }
    if (!dups.length) {
      return { list: keep, changed: false, remappedIds: remappedIds };
    }
    var primary = null;
    dups.forEach(function (a) {
      if (String(a.id) === 'a4') primary = a;
    });
    if (!primary) primary = dups[0];
    var maxHives = 0;
    dups.forEach(function (a) {
      maxHives = Math.max(maxHives, Math.max(0, Number(a.hiveCount) || 0));
      if (String(a.id) !== 'a4') remappedIds[String(a.id)] = 'a4';
    });
    if (seedA4) {
      maxHives = Math.max(maxHives, Math.max(0, Number(seedA4.hiveCount) || 0));
    }
    var merged = applyWaterDistance({
      id: 'a4',
      name: NAME_YANIK,
      place: PLACE_YANIK,
      lat: YANIK_TARGET_LAT,
      lon: YANIK_TARGET_LON,
      hiveCount: maxHives
    }, primary);
    var changed = dups.length > 1
      || String(primary.id) !== 'a4'
      || String(primary.name || '') !== NAME_YANIK
      || String(primary.place || '') !== PLACE_YANIK
      || Number(primary.hiveCount) !== maxHives
      || Number(primary.lat) !== YANIK_TARGET_LAT
      || Number(primary.lon) !== YANIK_TARGET_LON
      || Object.keys(remappedIds).length > 0;
    keep.push(merged);
    return { list: keep, changed: changed, remappedIds: remappedIds };
  }

  function remapHiveApiaryIds(remappedIds) {
    if (!remappedIds) return false;
    var keys = Object.keys(remappedIds);
    if (!keys.length) return false;
    try {
      var rawH = localStorage.getItem(HIVES_KEY);
      var hList = rawH ? JSON.parse(rawH) : [];
      if (!Array.isArray(hList)) return false;
      var changed = false;
      hList.forEach(function (h) {
        if (!h) return;
        var id = String(h.apiaryId || '');
        if (remappedIds[id]) {
          h.apiaryId = remappedIds[id];
          changed = true;
        }
      });
      if (changed) localStorage.setItem(HIVES_KEY, JSON.stringify(hList));
      return changed;
    } catch (e) { return false; }
  }

  function repointGiderApiaries(remappedIds) {
    try {
      var G = global.SuperAriGider || global.SuperAriGider;
      if (G && typeof G.repointApiaryIds === 'function') {
        G.repointApiaryIds(remappedIds, { id: 'a4', name: NAME_YANIK });
      }
    } catch (e) { /* ignore */ }
  }

  function loadApiaries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          var mapped = parsed.map(function (a) {
            return copyAdminFields(applyWaterDistance({
              id: String(a.id),
              name: String(a.name || '').trim() || 'Arılık',
              place: String(a.place || '').trim() || '—',
              lat: a.lat != null && a.lat !== '' ? Number(a.lat) : null,
              lon: a.lon != null && a.lon !== '' ? Number(a.lon) : null,
              hiveCount: Math.max(0, Number(a.hiveCount) || 0)
            }, a), a);
          });
          var rest = restoreKayakoyA1(mapped);
          var mig = migrateApiaryNames(rest.list);
          var coordMig = migrateApiaryCoordinates(mig.list);
          var ens = ensureSeedApiariesPresent(coordMig.list);
          var ded = dedupeYanikBalugApiaries(ens.list);
          var adminMig = migratePlaceAdmin(ded.list);
          var waterDist = refreshWaterDistancesFromMap(adminMig.list);
          var out = waterDist.list;
          if (rest.changed || mig.changed || coordMig.changed || ens.changed || ded.changed || adminMig.changed || waterDist.changed) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
            } catch (eMig) { /* ignore */ }
          }
          if (ded.changed && ded.remappedIds && Object.keys(ded.remappedIds).length) {
            remapHiveApiaryIds(ded.remappedIds);
            repointGiderApiaries(ded.remappedIds);
          } else if (ded.changed) {
            /* Still repoint expenses that match Yanıkdağ by name onto a4. */
            repointGiderApiaries({ __yanik_by_name__: 'a4' });
          }
          /* Strip expense/transport labels for ids no longer in live arılık list. */
          try {
            var Gpurge = global.SuperAriGider;
            if (Gpurge && typeof Gpurge.purgeOrphanApiaryLabels === 'function') {
              Gpurge.purgeOrphanApiaryLabels();
            }
          } catch (ePurge) { /* ignore */ }
          if (ens.changed || (ded.changed && Object.keys(ded.remappedIds || {}).length)) {
            try {
              var rawH = localStorage.getItem(HIVES_KEY);
              var hList = rawH ? JSON.parse(rawH) : [];
              if (!Array.isArray(hList)) hList = [];
              return reconcile(out, hList).apiaries;
            } catch (eFleet) { /* ignore */ }
          }
          return out;
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
      return applyWaterDistance({
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: fleet.length
      }, a);
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

  /**
   * Arılık başına ırk planını uygula (Kayaköy Muğla, Tortum Kafkas/Karadeniz,
   * Palandöken Kafkas/Karniyol, Yanıkdağ Baluğundüzü Kafkas). Plan dışı arılıklar dokunulmaz.
   */
  function applyApiaryBreedPlan(apiaries, hives, onlyKeys) {
    var planByApiary = {};
    (apiaries || []).forEach(function (a) {
      var k = breedPlanKeyFor(a);
      if (k && (!onlyKeys || onlyKeys.indexOf(k) !== -1)) planByApiary[String(a.id)] = k;
    });
    var idx = {};
    var changed = false;
    var out = (hives || []).map(function (h) {
      if (!h) return h;
      var aid = String(h.apiaryId || '');
      var key = planByApiary[aid];
      if (!key) return h;
      var i = idx[aid] || 0;
      idx[aid] = i + 1;
      var want = plannedBreed(key, i);
      var cur = String(h.breed || h.irk || '').trim();
      if (!want || cur === want) return h;
      changed = true;
      var copy = {};
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) copy[k] = h[k];
      }
      copy.breed = want;
      if (copy.irk != null) delete copy.irk;
      return copy;
    });
    return { list: out, changed: changed };
  }

  function loadHivesBase() {
    var apiaries = loadApiaries();
    var raw = readRawHives();
    var reconciled;
    if (!raw) {
      /* Fresh seed: exactly SEED hiveCounts worth of records. */
      var used = {};
      var seeded = [];
      apiaries.forEach(function (a) {
        seeded = seeded.concat(makeExactFleet(a.id, a.hiveCount, used));
      });
      reconciled = reconcile(apiaries, seeded);
    } else {
      reconciled = reconcile(apiaries, raw);
    }
    /*
     * Irk göçleri (tek seferlik):
     *  v2 — tüm arılık planı. v2 hiç çalışmadıysa tam plan uygulanır, sonraki anahtarlar da işaretlenir.
     *  v3 — v2'yi çalıştırmış kullanıcılar için yalnız a5 Cimil → Kafkas × Karadeniz.
     *  v4 — v2/v3'ü çalıştırmış kullanıcılar için yalnız a3 Palandöken → Kafkas × Karniyol.
     *  v5 — önceki adımları çalıştırmış kullanıcılar için yalnız a2 Tortum → Kafkas × Karadeniz.
     *  (Diğer arılıklardaki sonradan yapılan elle düzenlemelere dokunulmaz.)
     */
    var MIG_V2 = 'superari.breedMig.v2';
    var LATER_MIGS = [
      { key: 'superari.breedMig.v3', apiary: 'a5' },
      { key: 'superari.breedMig.v4', apiary: 'a3' },
      { key: 'superari.breedMig.v5', apiary: 'a2' }
    ];
    var v2Done = false;
    var onlyKeys = [];
    try {
      v2Done = localStorage.getItem(MIG_V2) === '1';
      LATER_MIGS.forEach(function (m) {
        if (localStorage.getItem(m.key) !== '1') onlyKeys.push(m.apiary);
      });
    } catch (eK) {}
    if (v2Done && !onlyKeys.length) return reconciled.hives;
    try {
      localStorage.setItem(MIG_V2, '1');
      LATER_MIGS.forEach(function (m) { localStorage.setItem(m.key, '1'); });
      localStorage.removeItem('superari.breedMig.karniyol.v1');
    } catch (eK2) {}
    var breedMig = v2Done
      ? applyApiaryBreedPlan(reconciled.apiaries, reconciled.hives, onlyKeys)
      : applyApiaryBreedPlan(reconciled.apiaries, reconciled.hives);
    if (breedMig.changed) {
      try {
        saveHives(breedMig.list);
      } catch (eBreed) { /* ignore */ }
      return breedMig.list;
    }
    return reconciled.hives;
  }

  function loadHives() {
    var list = loadHivesBase();
    var QUEEN_SEED_KEY = 'superari.queenSeed.v1';
    var done = false;
    try { done = localStorage.getItem(QUEEN_SEED_KEY) === '1'; } catch (eQ) {}
    if (!done) {
      try { localStorage.setItem(QUEEN_SEED_KEY, '1'); } catch (eQ2) {}
      var seeded = seedQueenTraits(list);
      if (seeded.changed) {
        try { saveHives(seeded.list); } catch (eQ3) {}
        list = seeded.list;
      }
    }
    /* Ana arı deposu: ilk çalışmada her kovan için ana kaydı oluşturur (superari.anaArilar.v1),
       sonra kovan aynalarını (breed/queenYear/…) mevcut anadan eşitler. */
    var eq = ensureQueens(list);
    if (eq.changed) {
      try { saveHives(eq.list); } catch (eQ4) {}
    }
    /* Demo: eski örnek veride oğul eğilimi sahte oğul riskinden türetilmişti → ırka göre yeniden ata (bir kez). */
    if (workMode() === 'demo') {
      var SW_FIX = 'superari.swarmTendencyFix.demo.v1';
      var swDone = false;
      try { swDone = localStorage.getItem(SW_FIX) === '1'; } catch (eS) {}
      if (!swDone) {
        try { localStorage.setItem(SW_FIX, '1'); } catch (eS2) {}
        eq.list = eq.list.map(function (h) {
          if (!h || !isFinite(h.id)) return h;
          var c = {}; for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) c[k] = h[k];
          c.swarmTendency = demoSwarmTendency(h.breed, Number(h.id));
          return c;
        });
        try { saveHives(eq.list); } catch (eS3) {}
      }
    }
    return attachSwarmRisk(eq.list);
  }

  /* ================= Koloni muayene kayıtları (güç / yavru / hastalık) =================
   * Tek kaynak: kovan başına kayıtlar, localStorage. Demo ve canlı mod ayrı depolar:
   *   canlı: superari.koloniKayit.v1 (boş başlar) · demo: superari.koloniKayit.demo.v1
   * Yapı: { "<hiveId>": { strength:[…], brood:[…], disease:[…] } }
   */
  var REC_KEY_LIVE = 'superari.koloniKayit.v1';
  var REC_KEY_DEMO = 'superari.koloniKayit.demo.v1';
  var REC_SEED_KEY = 'superari.koloniKayitSeed.demo.v1';
  var REC_SEED2_KEY = 'superari.koloniKayitSeed.demo.v2';
  var FEED_TYPES = [
    { key: 'surup11', label: 'Şurup 1:1', unit: 'L' },
    { key: 'surup21', label: 'Şurup 2:1', unit: 'L' },
    { key: 'kek', label: 'Kek', unit: 'kg' },
    { key: 'polen', label: 'Polen / katkı', unit: 'kg' },
    { key: 'balli', label: 'Ballı çerçeve', unit: 'kg' }
  ];
  var FEED_LABEL = {}, FEED_UNIT = {};
  FEED_TYPES.forEach(function (f) { FEED_LABEL[f.key] = f.label; FEED_UNIT[f.key] = f.unit; });
  /* Kışlık stok önerisi için yaklaşık şeker/bal eşdeğeri (kg / birim). */
  var FEED_STORE_FACTOR = { surup11: 0.5, surup21: 0.8, kek: 1, polen: 0, balli: 1 };
  var WINTER_MIN_KG = 15;
  var WINTER_STATUS_LABEL = { hazir: 'Hazır', eksik: 'Eksik var', birlestir: 'Birleştirilmeli' };
  var REC_KINDS = ['strength', 'brood', 'disease', 'feed', 'winter', 'harvest'];
  var DOSE_UNIT_LABEL = { serit: 'şerit', ml: 'ml', g: 'g' };

  var DISEASES = [
    { key: 'varroa', label: 'Varroa' },
    { key: 'nosema', label: 'Nosema' },
    { key: 'kirec', label: 'Kireç hastalığı' },
    { key: 'ayc', label: 'Amerikan yavru çürüğü' },
    { key: 'eyc', label: 'Avrupa yavru çürüğü' },
    { key: 'tulumsu', label: 'Tulumsu yavru' },
    { key: 'dwv', label: 'Kanat deformasyonu virüsü' },
    { key: 'mumguvesi', label: 'Mum güvesi' }
  ];
  var DISEASE_LABEL = {};
  DISEASES.forEach(function (d) { DISEASE_LABEL[d.key] = d.label; });
  var SEVERITY = ['yok', 'hafif', 'orta', 'agir'];
  var SEVERITY_LABEL = { yok: 'Yok', hafif: 'Hafif', orta: 'Orta', agir: 'Ağır' };
  var NOSEMA_LABEL = { yok: 'Yok', suphe: 'Şüphe', dogrulandi: 'Doğrulandı' };
  var AYC_LABEL = { temiz: 'Temiz', suphe: 'Şüphe', dogrulandi: 'Doğrulandı' };
  var VARROA_METHOD_LABEL = { seker: 'Pudra şekeri', alkol: 'Alkol yıkama', tabla: 'Yapışkan tabla' };
  /* Ana memesi yeri: alt kenar = oğul memesi · petek ortası = sessiz ana değiştirme · acil = genç larvadan (anasız). */
  var QUEEN_CELL_LABEL = { yok: 'Yok', ogul: 'Alt kenar (oğul memesi)', yenileme: 'Petek ortası (sessiz ana değiştirme)', acil: 'Acil (genç larvadan, anasız)' };
  var CELL_CAP_LABEL = { kapali: 'kapalı', acik: 'açık' };
  var PATTERN_LABEL = { duzenli: 'Düzenli', daginik: 'Dağınık' };

  function workMode() {
    try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; }
  }
  function recKey() { return workMode() === 'live' ? REC_KEY_LIVE : REC_KEY_DEMO; }
  function isoDate(v) {
    var s = String(v == null ? '' : v).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }
  function addDays(date, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
    if (!m) return '';
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(n || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function intIn(v, lo, hi) {
    if (v == null || v === '') return null;
    var n = Math.round(Number(v));
    return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
  }
  function numIn(v, lo, hi) {
    if (v == null || v === '') return null;
    var n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n * 10) / 10)) : null;
  }
  function pick(v, allowed, def) { return allowed.indexOf(v) !== -1 ? v : def; }
  function txt(v, max) { var t = String(v == null ? '' : v).trim(); return t ? t.slice(0, max || 200) : ''; }

  function strengthClass(r) {
    if (!r) return null;
    var bees = Number(r.beeFrames) || 0, brood = Number(r.broodFrames) || 0;
    if (bees >= 8 && brood >= 4) return 'Güçlü';
    if (bees <= 4 || brood <= 1) return 'Zayıf';
    return 'Orta';
  }

  function normalizeRecord(kind, r) {
    if (!r || typeof r !== 'object') return null;
    var o = { id: txt(r.id, 40) || ('r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), date: isoDate(r.date) || todayLocal() };
    if (r.demo === true) o.demo = true;
    var note = txt(r.note, 300); if (note) o.note = note;
    var pcnt = intIn(r.photoCount, 0, 50); if (pcnt) o.photoCount = pcnt;
    if (kind === 'strength') {
      o.beeFrames = intIn(r.beeFrames, 0, 40) || 0;
      o.broodFrames = intIn(r.broodFrames, 0, 30) || 0;
      o.honeyFrames = intIn(r.honeyFrames, 0, 30) || 0;
      o.pollenFrames = intIn(r.pollenFrames, 0, 20) || 0;
      return o;
    }
    if (kind === 'brood') {
      o.eggs = r.eggs === true;
      o.pattern = pick(r.pattern, ['duzenli', 'daginik'], 'duzenli');
      o.queenCell = pick(r.queenCell, ['yok', 'ogul', 'yenileme', 'acil'], 'yok');
      if (o.queenCell !== 'yok') {
        var cc = intIn(r.cellCount, 1, 60); if (cc) o.cellCount = cc;
        var cp = pick(r.cellCapped, ['kapali', 'acik', ''], ''); if (cp) o.cellCapped = cp;
      }
      o.queenless = r.queenless === true;
      o.chilled = r.chilled === true;
      return o;
    }
    if (kind === 'feed') {
      o.type = pick(r.type, FEED_TYPES.map(function (f) { return f.key; }), 'surup21');
      o.amount = numIn(r.amount, 0, 500) || 0;
      return o;
    }
    if (kind === 'harvest') {
      o.kg = numIn(r.kg, 0, 500);
      o.frames = intIn(r.frames, 0, 60);
      var ht0 = txt(r.honeyType, 40); if (ht0) o.honeyType = ht0;
      return o;
    }
    if (kind === 'winter') {
      o.strongEnough = pick(r.strongEnough, ['evet', 'hayir', ''], '');
      o.storesKg = numIn(r.storesKg, 0, 100);
      o.varroa = pick(r.varroa, ['auto', 'evet', 'hayir'], 'auto');
      o.narrowed = r.narrowed === true;
      o.entrance = r.entrance === true;
      o.insulation = r.insulation === true;
      o.statusChoice = pick(r.statusChoice, ['auto', 'hazir', 'eksik', 'birlestir'], 'auto');
      o.season = seasonOf(o.date);
      return o;
    }
    if (kind === 'disease') {
      o.disease = pick(r.disease, DISEASES.map(function (d) { return d.key; }), 'varroa');
      if (o.disease === 'varroa') {
        o.count = intIn(r.count, 0, 5000);
        o.method = pick(r.method, ['seker', 'alkol', 'tabla'], 'seker');
        o.infestation = numIn(r.infestation, 0, 100);
        if (o.infestation == null && o.count != null && o.method !== 'tabla') o.infestation = Math.round((o.count / 300) * 1000) / 10;
      } else if (o.disease === 'nosema') {
        o.status = pick(r.status, ['yok', 'suphe', 'dogrulandi'], 'yok');
        o.spores = numIn(r.spores, 0, 1e9);
      } else if (o.disease === 'ayc') {
        o.status = pick(r.status, ['temiz', 'suphe', 'dogrulandi'], 'temiz');
      } else {
        o.severity = pick(r.severity, SEVERITY, 'yok');
        if (o.disease === 'kirec') o.frames = intIn(r.frames, 0, 30);
      }
      var tr = txt(r.treatment, 200); if (tr) o.treatment = tr;
      o.dose = numIn(r.dose, 0, 1000);
      if (o.dose != null) o.doseUnit = pick(r.doseUnit, ['serit', 'ml', 'g'], 'serit');
      var by = txt(r.appliedBy, 80); if (by) o.appliedBy = by;
      o.withdrawalDays = intIn(r.withdrawalDays, 0, 365) || 0;
      var cd = isoDate(r.checkDate); if (cd) o.checkDate = cd;
      return o;
    }
    return null;
  }

  function loadRecordsAll() {
    try {
      var raw = localStorage.getItem(recKey());
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch (e) { return {}; }
  }
  function saveRecordsAll(obj) {
    try { localStorage.setItem(recKey(), JSON.stringify(obj || {})); } catch (e) { /* ignore */ }
  }
  function byDateDesc(a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)); }
  function recordsFor(hiveId, all) {
    var src = (all || loadRecordsAll())[String(Number(hiveId))] || {};
    var out = {};
    REC_KINDS.forEach(function (k) {
      out[k] = (Array.isArray(src[k]) ? src[k] : []).map(function (r) { return normalizeRecord(k, r); }).filter(Boolean).sort(byDateDesc);
    });
    /* Hasat: tek hasat deposundan (Raporlar › Bal / verim ile ortak). */
    out.harvest = listHarvests({ hiveId: Number(hiveId) }).map(harvestAsRecord);
    return out;
  }
  function addRecord(hiveId, kind, rec) {
    if (REC_KINDS.indexOf(kind) === -1) return null;
    if (kind === 'harvest') {
      var hr = rec || {};
      var added = addHarvestRow({ hiveId: Number(hiveId), date: hr.date, kg: hr.kg, frames: hr.frames, honeyType: hr.honeyType, note: hr.note, source: 'kayit' });
      return added ? harvestAsRecord(added) : null;
    }
    var r = normalizeRecord(kind, rec || {});
    if (!r) return null;
    var all = loadRecordsAll();
    var key = String(Number(hiveId));
    if (!all[key]) all[key] = {};
    if (!Array.isArray(all[key][kind])) all[key][kind] = [];
    /* Kışlık hazırlık: kovan başına sezonda tek kayıt (Koloni gücü ve Besleme aynı kaydı yazar). */
    if (kind === 'winter') {
      all[key][kind] = all[key][kind].filter(function (x) { return x && seasonOf(x.date) !== r.season; });
    }
    all[key][kind].push(r);
    saveRecordsAll(all);
    return r;
  }
  function updateRecord(hiveId, kind, id, rec) {
    if (REC_KINDS.indexOf(kind) === -1) return null;
    if (kind === 'harvest') {
      var ur = rec || {};
      var up = updateHarvestRow(id, { date: ur.date, honeyKg: ur.kg, frames: ur.frames, honeyType: ur.honeyType || '', note: ur.note || '' });
      return up ? harvestAsRecord(up) : null;
    }
    var all = loadRecordsAll();
    var key = String(Number(hiveId));
    if (!all[key] || !Array.isArray(all[key][kind])) return null;
    var idx = -1;
    all[key][kind].forEach(function (x, i) { if (x && x.id === id) idx = i; });
    if (idx < 0) return null;
    var merged = {};
    Object.keys(rec || {}).forEach(function (k) { merged[k] = rec[k]; });
    merged.id = id;
    if (all[key][kind][idx].demo) merged.demo = true;
    if (merged.photoCount == null && all[key][kind][idx].photoCount) merged.photoCount = all[key][kind][idx].photoCount;
    var r = normalizeRecord(kind, merged);
    if (!r) return null;
    all[key][kind][idx] = r;
    saveRecordsAll(all);
    return r;
  }
  /** Kayda bağlı fotoğraf sayısı (fotoğraflar IndexedDB'de: foto.js). */
  function setPhotoCount(hiveId, kind, id, n) {
    n = Math.max(0, Math.min(50, Math.round(Number(n) || 0)));
    if (kind === 'harvest') return !!updateHarvestRow(id, { photoCount: n || null });
    var all = loadRecordsAll();
    var list = all[String(Number(hiveId))] && all[String(Number(hiveId))][kind];
    if (!Array.isArray(list)) return false;
    var hit = false;
    list.forEach(function (x) { if (x && x.id === id) { hit = true; if (n) x.photoCount = n; else delete x.photoCount; } });
    if (hit) saveRecordsAll(all);
    return hit;
  }
  function removeRecord(hiveId, kind, id) {
    if (kind === 'harvest') return removeHarvestRow(id);
    var all = loadRecordsAll();
    var key = String(Number(hiveId));
    if (!all[key] || !Array.isArray(all[key][kind])) return false;
    var before = all[key][kind].length;
    all[key][kind] = all[key][kind].filter(function (r) { return r && r.id !== id; });
    saveRecordsAll(all);
    return all[key][kind].length !== before;
  }

  /* ================= Hasat kayıtları — TEK depo =================
   * Hızlı kayıt (kovan başına), kovan kayıt formu ve Raporlar › Bal / verim aynı depoyu yazar/okur.
   *   canlı: superari.hasat.v2 (boş başlar) · demo: superari.hasat.demo.v2 (örnekler demo=true)
   * Satır: { id, date, apiaryId, apiaryName, hiveId|null, honeyKg, frames, honeyType, note, source, demo? }
   * hiveId=null → arılık geneli hasat (kovan belirtilmeden).
   * Eski depolar (superari.rapor.hasat.v1 ve koloni kayıtlarındaki "harvest") bir kez taşınır.
   */
  var HARVEST_KEY_LIVE = 'superari.hasat.v2';
  var HARVEST_KEY_DEMO = 'superari.hasat.demo.v2';
  var HARVEST_MIGRATED_KEY = 'superari.hasat.migrated.v2';
  var HARVEST_DEMO_SEED_KEY = 'superari.hasat.demoSeed.v2';
  var OLD_RAPOR_HARVEST_KEY = 'superari.rapor.hasat.v1';
  var HONEY_TYPES = ['Çiçek', 'Kestane', 'Salgı / Orman', 'Ayçiçeği', 'Narenciye', 'Yayla', 'Diğer'];
  var HARVEST_DEMO_SEED = [
    { id: 'h1', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-08-18', honeyKg: 420, frames: 86, note: 'Ana hasat' },
    { id: 'h2', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2026-09-05', honeyKg: 95, frames: 22, note: 'İkinci sıyırma' },
    { id: 'h3', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2026-08-22', honeyKg: 310, frames: 64, note: 'Yayla hasadı' },
    { id: 'h4', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2026-08-25', honeyKg: 180, frames: 38, note: 'Çiçek balı' },
    { id: 'h5', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2026-08-28', honeyKg: 145, frames: 30, note: 'Baluğundüzü' },
    { id: 'h6', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2026-08-30', honeyKg: 165, frames: 34, note: 'Cimil' },
    { id: 'h7', apiaryId: 'a1', apiaryName: 'Kayaköy Ana Arılık', date: '2025-08-20', honeyKg: 380, frames: 78, note: 'Geçen sezon ana' },
    { id: 'h8', apiaryId: 'a2', apiaryName: 'Tortum Yayla Arılığı', date: '2025-08-24', honeyKg: 275, frames: 56, note: 'Geçen sezon yayla' },
    { id: 'h9', apiaryId: 'a3', apiaryName: 'Palandöken Yayla Arılığı', date: '2025-08-27', honeyKg: 155, frames: 32, note: 'Geçen sezon' },
    { id: 'h10', apiaryId: 'a4', apiaryName: 'Yanıkdağ Baluğundüzü Arılığı', date: '2025-08-29', honeyKg: 120, frames: 26, note: 'Geçen sezon' },
    { id: 'h11', apiaryId: 'a5', apiaryName: 'Cimil Yaylası Arılığı', date: '2025-09-01', honeyKg: 140, frames: 28, note: 'Geçen sezon' }
  ];
  function harvestKey() { return workMode() === 'live' ? HARVEST_KEY_LIVE : HARVEST_KEY_DEMO; }
  function readHarvestKey(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeHarvestKey(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list || [])); } catch (e) { /* ignore */ }
  }
  function apiaryNameOf(aid) {
    var nm = '';
    try { loadApiaries().forEach(function (a) { if (String(a.id) === String(aid)) nm = a.name || a.place || ''; }); } catch (e) { /* ignore */ }
    return nm;
  }
  function normalizeHarvest(r) {
    if (!r || typeof r !== 'object') return null;
    var o = {
      id: txt(r.id, 40) || ('h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      date: isoDate(r.date) || todayLocal()
    };
    var hid = (r.hiveId == null || r.hiveId === '') ? null : Number(r.hiveId);
    o.hiveId = (hid != null && isFinite(hid)) ? hid : null;
    var hv = (o.hiveId != null && !txt(r.apiaryId, 40)) ? hiveById(o.hiveId) : null;
    o.apiaryId = txt(r.apiaryId, 40) || (hv ? String(hv.apiaryId || '') : '');
    o.apiaryName = txt(r.apiaryName, 120) || apiaryNameOf(o.apiaryId) || o.apiaryId;
    var kg = numIn(r.honeyKg != null ? r.honeyKg : r.kg, 0, 100000);
    o.honeyKg = kg == null ? 0 : kg;
    o.frames = intIn(r.frames, 0, 100000);
    var ht = txt(r.honeyType, 40); if (ht) o.honeyType = ht;
    var note = txt(r.note, 300); if (note) o.note = note;
    o.source = pick(r.source, ['rapor', 'kayit', 'eski'], 'kayit');
    var pcnt = intIn(r.photoCount, 0, 50); if (pcnt) o.photoCount = pcnt;
    if (r.demo === true) o.demo = true;
    return o;
  }
  function isOldSeedRow(row) {
    if (!row) return false;
    return HARVEST_DEMO_SEED.some(function (s) {
      return s.id === String(row.id) && s.date === row.date && Number(s.honeyKg) === Number(row.honeyKg) && String(s.apiaryId) === String(row.apiaryId);
    });
  }
  /** Bir kez: eski rapor deposu + koloni kayıtlarındaki kovan hasatları → tek depo (id ile tekilleştirilir). */
  function migrateHarvests() {
    try { if (localStorage.getItem(HARVEST_MIGRATED_KEY) === '1') return; } catch (e) { return; }
    var live = readHarvestKey(HARVEST_KEY_LIVE), demo = readHarvestKey(HARVEST_KEY_DEMO);
    function has(list, id) { return list.some(function (x) { return x && String(x.id) === String(id); }); }
    /* 1) Eski rapor deposu: örnek satırlar demo tohumuyla zaten gelir; kullanıcı satırları gerçek (canlı) veridir. */
    var old = [];
    try { old = JSON.parse(localStorage.getItem(OLD_RAPOR_HARVEST_KEY) || '[]'); if (!Array.isArray(old)) old = []; } catch (e) { old = []; }
    old.forEach(function (row) {
      if (!row || isOldSeedRow(row)) return;
      var x = {}; Object.keys(row).forEach(function (k) { x[k] = row[k]; });
      x.source = 'rapor'; delete x.demo;
      var n = normalizeHarvest(x);
      if (n && !has(live, n.id)) live.push(n);
    });
    /* 2) Koloni kayıtlarındaki kovan hasatları: aynı moddaki depoya taşınır, kayıt deposundan silinir. */
    [[REC_KEY_LIVE, live], [REC_KEY_DEMO, demo]].forEach(function (pair) {
      var obj;
      try { obj = JSON.parse(localStorage.getItem(pair[0]) || '{}'); } catch (e) { obj = null; }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      var changed = false;
      Object.keys(obj).forEach(function (hid) {
        var hv = obj[hid];
        if (!hv || !Array.isArray(hv.harvest)) return;
        hv.harvest.forEach(function (r) {
          if (!r) return;
          var n = normalizeHarvest({ id: r.id, date: r.date, hiveId: hid, kg: r.kg, frames: r.frames, note: r.note, honeyType: r.honeyType, demo: r.demo === true, source: 'kayit' });
          if (n && !has(pair[1], n.id)) pair[1].push(n);
        });
        delete hv.harvest;
        changed = true;
      });
      if (changed) { try { localStorage.setItem(pair[0], JSON.stringify(obj)); } catch (e) { /* ignore */ } }
    });
    writeHarvestKey(HARVEST_KEY_LIVE, live);
    writeHarvestKey(HARVEST_KEY_DEMO, demo);
    try { localStorage.setItem(HARVEST_MIGRATED_KEY, '1'); } catch (e) { /* ignore */ }
  }
  /** Demo modda bir kez örnek hasatlar (demo=true, yalnız demo deposuna). */
  function seedDemoHarvests() {
    if (workMode() !== 'demo') return;
    try { if (localStorage.getItem(HARVEST_DEMO_SEED_KEY) === '1') return; localStorage.setItem(HARVEST_DEMO_SEED_KEY, '1'); } catch (e) { return; }
    var list = readHarvestKey(HARVEST_KEY_DEMO);
    HARVEST_DEMO_SEED.forEach(function (s) {
      if (list.some(function (x) { return x && String(x.id) === s.id; })) return;
      var x = {}; Object.keys(s).forEach(function (k) { x[k] = s[k]; });
      x.demo = true; x.source = 'rapor';
      list.push(normalizeHarvest(x));
    });
    writeHarvestKey(HARVEST_KEY_DEMO, list);
  }
  function harvestPrep() { migrateHarvests(); seedDemoHarvests(); }
  /** filter: { hiveId, apiaryId, apiaryOnly (yalnız arılık geneli) } */
  function listHarvests(filter) {
    harvestPrep();
    var f = filter || {};
    return readHarvestKey(harvestKey()).map(normalizeHarvest).filter(function (h) {
      if (!h) return false;
      if (f.hiveId != null && Number(h.hiveId) !== Number(f.hiveId)) return false;
      if (f.hiveId != null && h.hiveId == null) return false;
      if (f.apiaryId != null && f.apiaryId !== '' && String(h.apiaryId) !== String(f.apiaryId)) return false;
      if (f.apiaryOnly && h.hiveId != null) return false;
      return true;
    }).sort(byDateDesc);
  }
  function addHarvestRow(entry) {
    harvestPrep();
    var e = {}; Object.keys(entry || {}).forEach(function (k) { e[k] = entry[k]; });
    delete e.demo; /* kullanıcı girişi asla demo örneği olarak işaretlenmez */
    if (!e.id) delete e.id;
    var n = normalizeHarvest(e);
    if (!n) return null;
    var list = readHarvestKey(harvestKey());
    list.push(n);
    writeHarvestKey(harvestKey(), list);
    return n;
  }
  function updateHarvestRow(id, patch) {
    harvestPrep();
    var list = readHarvestKey(harvestKey()), out = null;
    list = list.map(function (x) {
      if (!x || String(x.id) !== String(id)) return x;
      var m = {}; Object.keys(x).forEach(function (k) { m[k] = x[k]; });
      Object.keys(patch || {}).forEach(function (k) { if (k !== 'id' && k !== 'demo') m[k] = patch[k]; });
      if (patch && patch.kg != null && patch.honeyKg == null) m.honeyKg = patch.kg;
      out = normalizeHarvest(m);
      return out;
    });
    if (out) writeHarvestKey(harvestKey(), list);
    return out;
  }
  function removeHarvestRow(id) {
    harvestPrep();
    var list = readHarvestKey(harvestKey());
    var next = list.filter(function (x) { return x && String(x.id) !== String(id); });
    writeHarvestKey(harvestKey(), next);
    return next.length !== list.length;
  }
  /** Kovan kayıt biçimi (koloni kayıtları API'si için): { id, date, kg, frames, honeyType, note, demo } */
  function harvestAsRecord(h) {
    var o = { id: h.id, date: h.date, kg: h.honeyKg, frames: h.frames };
    if (h.honeyType) o.honeyType = h.honeyType;
    if (h.note) o.note = h.note;
    if (h.photoCount) o.photoCount = h.photoCount;
    if (h.demo) o.demo = true;
    return o;
  }
  var harvestStore = {
    KEY_LIVE: HARVEST_KEY_LIVE,
    KEY_DEMO: HARVEST_KEY_DEMO,
    HONEY_TYPES: HONEY_TYPES,
    list: listHarvests,
    add: addHarvestRow,
    update: updateHarvestRow,
    remove: removeHarvestRow,
    key: harvestKey,
    migrate: migrateHarvests
  };

  /** Hastalık kaydının seviyesi: { active, level: 'temiz'|'izle'|'orta'|'yüksek'|'kritik', text } */
  function diseaseLevel(r) {
    if (!r) return { active: false, level: 'temiz', text: '' };
    var d = r.disease;
    if (d === 'varroa') {
      var p = r.infestation;
      if (p == null) {
        if (r.count == null) return { active: false, level: r.treatment ? 'temiz' : 'izle', text: r.treatment ? 'ilaçlama' : 'sayım girilmedi' };
        return { active: false, level: 'izle', text: r.count + ' akar · ' + VARROA_METHOD_LABEL[r.method] };
      }
      var lvl = p > 3 ? 'yüksek' : (p >= 2 ? 'orta' : 'temiz');
      return { active: p >= 2, level: lvl, text: '%' + String(p).replace('.', ',') + ' bulaşma · ' + VARROA_METHOD_LABEL[r.method] };
    }
    if (d === 'nosema') {
      return { active: r.status !== 'yok', level: r.status === 'dogrulandi' ? 'yüksek' : (r.status === 'suphe' ? 'orta' : 'temiz'),
        text: NOSEMA_LABEL[r.status] + (r.spores != null ? ' · ' + r.spores + ' spor' : '') };
    }
    if (d === 'ayc') {
      return { active: r.status !== 'temiz', level: r.status === 'dogrulandi' ? 'kritik' : (r.status === 'suphe' ? 'yüksek' : 'temiz'), text: AYC_LABEL[r.status] };
    }
    var sv = r.severity || 'yok';
    return { active: sv !== 'yok', level: sv === 'agir' ? 'yüksek' : (sv === 'orta' ? 'orta' : (sv === 'hafif' ? 'izle' : 'temiz')),
      text: SEVERITY_LABEL[sv] + (d === 'kirec' && r.frames != null ? ' · ' + r.frames + ' çerçeve' : '') };
  }

  /** Kış sezonu yılı: Mart–Aralık → o yıl; Ocak–Şubat → önceki yıl. */
  function seasonOf(date) {
    var m = /^(\d{4})-(\d{2})/.exec(date || '');
    if (!m) return new Date().getFullYear();
    var y = Number(m[1]);
    return Number(m[2]) <= 2 ? y - 1 : y;
  }
  function currentSeason() { return seasonOf(todayLocal()); }
  function inAutumn(date, season) {
    return !!date && date >= season + '-08-15' && date <= (season + 1) + '-02-28';
  }
  /** Kovanın kışlık hazırlık durumu (tek kayıt + otomatik okumalar). */
  function winterStatus(hiveId, all, st) {
    var rec = recordsFor(hiveId, all);
    st = st || colonyStatus(hiveId, all);
    var season = currentSeason();
    var w = rec.winter.filter(function (x) { return x.season === season; })[0] || null;
    var autumn = rec.feed.filter(function (f) { return inAutumn(f.date, season); });
    var suggested = 0;
    autumn.forEach(function (f) { suggested += (Number(f.amount) || 0) * (FEED_STORE_FACTOR[f.type] || 0); });
    suggested = Math.round(suggested * 10) / 10;
    var vr = null;
    rec.disease.forEach(function (d) {
      if (vr || d.disease !== 'varroa') return;
      if ((d.treatment || d.withdrawalDays) && d.date >= addDays(todayLocal(), -150)) vr = d;
    });
    var storesKg = w && w.storesKg != null ? w.storesKg : (autumn.length ? suggested : null);
    var storesOk = storesKg != null && storesKg >= WINTER_MIN_KG;
    var weakAuto = st.strengthClass === 'Zayıf';
    var out = { season: season, rec: w, suggestedKg: suggested, autumnFeeds: autumn.length, storesKg: storesKg, storesOk: storesOk,
      varroaAuto: vr, weakAuto: weakAuto, status: null, statusKey: null, missing: [] };
    if (!w) {
      if (weakAuto) { out.statusKey = 'birlestir'; out.status = WINTER_STATUS_LABEL.birlestir; out.suggestedOnly = true; }
      return out;
    }
    var varroaDone = w.varroa === 'evet' || (w.varroa === 'auto' && !!vr);
    if (w.strongEnough !== 'evet') out.missing.push('arı gücü');
    if (!storesOk) out.missing.push('kışlık bal/kek');
    if (!varroaDone) out.missing.push('varroa ilacı');
    if (!w.narrowed) out.missing.push('daraltma');
    if (!w.entrance) out.missing.push('giriş küçültme');
    if (!w.insulation) out.missing.push('yalıtım');
    out.varroaDone = varroaDone;
    var key = (weakAuto || w.strongEnough === 'hayir') ? 'birlestir' : (out.missing.length ? 'eksik' : 'hazir');
    out.autoKey = key;
    if (w.statusChoice !== 'auto') key = w.statusChoice;
    out.statusKey = key;
    out.status = WINTER_STATUS_LABEL[key];
    return out;
  }
  function winterSummary(hives, all) {
    all = all || loadRecordsAll();
    var s = { total: 0, recorded: 0, ready: 0, eksik: 0, birlestir: 0, lowStores: 0 };
    (hives || []).forEach(function (h) {
      s.total++;
      if (!all[String(h.id)]) return;
      var w = winterStatus(h.id, all);
      if (w.rec) s.recorded++;
      if (w.statusKey === 'hazir') s.ready++;
      else if (w.statusKey === 'eksik') s.eksik++;
      else if (w.statusKey === 'birlestir') s.birlestir++;
      if (w.storesKg != null && !w.storesOk) s.lowStores++;
    });
    return s;
  }
  function feedTotals(hives, all, season) {
    all = all || loadRecordsAll();
    season = season || currentSeason();
    var by = {}, n = 0, hivesFed = 0;
    FEED_TYPES.forEach(function (f) { by[f.key] = 0; });
    (hives || []).forEach(function (h) {
      var rec = all[String(h.id)];
      if (!rec || !Array.isArray(rec.feed)) return;
      var fed = false;
      rec.feed.forEach(function (raw) {
        var f = normalizeRecord('feed', raw);
        if (!f || seasonOf(f.date) !== season) return;
        by[f.type] += Number(f.amount) || 0; n++; fed = true;
      });
      if (fed) hivesFed++;
    });
    Object.keys(by).forEach(function (k) { by[k] = Math.round(by[k] * 10) / 10; });
    return { season: season, byType: by, count: n, hivesFed: hivesFed };
  }

  /** Kovanın türetilmiş durumu (son kayıtlara göre). */
  function colonyStatus(hiveId, all) {
    var rec = recordsFor(hiveId, all);
    var today = todayLocal();
    var s = rec.strength[0] || null;
    var b = rec.brood[0] || null;
    var latestByDisease = {};
    rec.disease.forEach(function (r) { if (!latestByDisease[r.disease]) latestByDisease[r.disease] = r; });
    var active = [], dueChecks = [], withdrawalUntil = '', withdrawalRec = null;
    Object.keys(latestByDisease).forEach(function (k) {
      var r = latestByDisease[k];
      var lv = diseaseLevel(r);
      if (lv.active) active.push({ key: k, label: DISEASE_LABEL[k], level: lv.level, text: lv.text, rec: r });
      if (r.checkDate && r.checkDate <= today && (lv.active || lv.level === 'izle')) dueChecks.push({ key: k, label: DISEASE_LABEL[k], date: r.checkDate, rec: r });
    });
    rec.disease.forEach(function (r) {
      if (!r.withdrawalDays) return;
      var until = addDays(r.date, r.withdrawalDays);
      if (until >= today && until > withdrawalUntil) { withdrawalUntil = until; withdrawalRec = r; }
    });
    var cls = strengthClass(s);
    var chilled = !!(b && b.chilled);
    var hf = hiveFlags()[String(Number(hiveId))] || {};
    var emergencyCell = !!(b && b.queenCell === 'acil');
    var queenless = !!(b && (b.queenless || emergencyCell) && !(hf.queenGivenAt && hf.queenGivenAt >= b.date)) || (hf.queenless === true && !hf.queenCellSince);
    var afb = latestByDisease.ayc ? latestByDisease.ayc.status : 'temiz';
    return {
      records: rec,
      strength: s, strengthClass: cls,
      brood: b,
      weak: cls === 'Zayıf' || chilled,
      chilled: chilled,
      queenless: queenless,
      queenCellSince: hf.queenless === true && hf.queenCellSince ? hf.queenCellSince : '',
      merged: hf.colonyState === 'birlestirildi',
      swarmCell: !!(b && b.queenCell === 'ogul'),
      supersedureCell: !!(b && b.queenCell === 'yenileme'),
      emergencyCell: emergencyCell && queenless,
      cellCount: b && b.cellCount ? b.cellCount : null,
      cellCapped: b && b.cellCapped ? b.cellCapped : '',
      broodIssue: !!(b && (b.queenless || b.chilled || b.queenCell === 'ogul' || b.queenCell === 'acil' || !b.eggs || b.pattern === 'daginik')),
      diseases: active,
      dueChecks: dueChecks,
      afb: afb,
      withdrawalUntil: withdrawalUntil,
      withdrawalRec: withdrawalRec,
      latestByDisease: latestByDisease
    };
  }


  /* ================= Oğul riski (hesaplanır; formül arayüzde gösterilmez) =================
   * Girdiler: arılık bölge profili + tarih (oğul mevsimi), ana arı ırkı (melez türü dahil),
   * koloni gücü (muayene > kovan kaydı), ana yaşı, gözlenen oğul eğilimi, oğul/ana hücresi,
   * anasızlık, tartı artışı (sıkışıklık) ve bal katı verilmiş olması (yer açma).
   * Sonuç 5 düzey: Çok düşük · Düşük · Orta · Yüksek · Çok yüksek. */
  var SWARM_LEVELS = [
    { key: 'cok-dusuk', label: 'Çok düşük', tone: 'ok', color: '#1b7a3d' },
    { key: 'dusuk', label: 'Düşük', tone: 'ok', color: '#4f9d2d' },
    { key: 'orta', label: 'Orta', tone: 'warn', color: '#c98a00' },
    { key: 'yuksek', label: 'Yüksek', tone: 'bad', color: '#d9480f' },
    { key: 'cok-yuksek', label: 'Çok yüksek', tone: 'bad', color: '#b3001b' }
  ];
  /* Bölge profili: bakim-plan.js ile aynı anahtarlar (sicak / iliman / yayla / yuksek). */
  var SEASON_SEED_PROFILE = { a1: 'sicak', a2: 'yayla', a3: 'yuksek', a4: 'yuksek', a5: 'yuksek' };
  var SEASON_WARM_IL = ['Muğla', 'Antalya', 'Aydın', 'İzmir', 'Mersin', 'Adana', 'Hatay', 'Balıkesir', 'Çanakkale'];
  var SEASON_HIGH_IL = ['Erzurum', 'Kars', 'Ardahan', 'Ağrı', 'Bayburt', 'Gümüşhane', 'Muş', 'Bitlis', 'Van', 'Hakkari', 'Sivas'];
  var PROFILE_SHORT = { sicak: 'Sıcak / alçak bölge', iliman: 'Ilıman bölge', yayla: 'Yayla', yuksek: 'Yüksek yayla' };
  /* Oğul mevsimi (AA-GG): hazırlık → zirve → kuyruk. Tahmindir. */
  var SWARM_WINDOWS = {
    sicak: { pre: '02-20', from: '03-15', to: '05-10', post: '05-31' },
    iliman: { pre: '04-01', from: '04-20', to: '05-31', post: '06-20' },
    yayla: { pre: '05-10', from: '05-25', to: '06-30', post: '07-20' },
    yuksek: { pre: '05-20', from: '06-05', to: '07-05', post: '07-25' }
  };
  function autoSeasonProfile(a) {
    if (!a) return 'iliman';
    if (SEASON_SEED_PROFILE[a.id] && isSeedApiaryId(a.id)) return SEASON_SEED_PROFILE[a.id];
    var nm = String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.koy || '')).toLocaleLowerCase('tr');
    var alt = Number(a.altitude || a.elevation || a.rakim);
    if (isFinite(alt) && alt > 0) return alt >= 1800 ? 'yuksek' : (alt >= 1100 ? 'yayla' : (alt < 400 && SEASON_WARM_IL.indexOf(a.il) >= 0 ? 'sicak' : 'iliman'));
    if (/yayla/.test(nm)) return 'yayla';
    if (SEASON_HIGH_IL.indexOf(a.il) >= 0) return 'yayla';
    if (SEASON_WARM_IL.indexOf(a.il) >= 0) return 'sicak';
    return 'iliman';
  }
  function planState() {
    try {
      var s = JSON.parse(localStorage.getItem(workMode() === 'live' ? 'superari.bakimPlan.v1' : 'superari.bakimPlan.demo.v1') || '{}');
      return s && typeof s === 'object' ? s : {};
    } catch (e) { return {}; }
  }
  function seasonProfileKey(apId, ctx) {
    var st = ctx ? (ctx.plan || (ctx.plan = planState())) : planState();
    var p = st.profiles && st.profiles[apId];
    if (p && SWARM_WINDOWS[p]) return p;
    var aps = ctx ? (ctx.aps || (ctx.aps = loadApiaries())) : loadApiaries();
    var a = null;
    for (var i = 0; i < aps.length; i++) if (aps[i].id === String(apId)) { a = aps[i]; break; }
    return autoSeasonProfile(a);
  }
  var AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function mdLabel(md) { var p = md.split('-'); return Number(p[1]) + ' ' + AY_KISA[Number(p[0]) - 1]; }
  function swarmSeason(apId, date, ctx) {
    var key = seasonProfileKey(apId, ctx), w = SWARM_WINDOWS[key];
    var md = String(date || todayLocal()).slice(5, 10);
    var phase = (md >= w.from && md <= w.to) ? 'zirve' : ((md >= w.pre && md < w.from) || (md > w.to && md <= w.post) ? 'kenar' : 'disi');
    return { profile: key, profileLabel: PROFILE_SHORT[key], phase: phase, window: mdLabel(w.from) + '–' + mdLabel(w.to),
      factor: phase === 'zirve' ? 1 : (phase === 'kenar' ? 0.6 : 0.15) };
  }
  /* Irk etkisi (oğul eğilimi): melez türü ayrı değerlendirilir. */
  /* Irk = ana arının karakteri (eğilim), kovanın durumu değil: yalnız küçük bir kaydırma (en fazla bir düzey, sınırda). */
  var BREED_TENDENCY = {
    'cok-dusuk': { f: 0.45, shift: -8, note: 'oğul eğilimi çok düşük' },
    'dusuk': { f: 0.65, shift: -5, note: 'oğul eğilimi düşük' },
    'orta': { f: 1.0, shift: 0, note: 'oğul eğilimi orta' },
    'yuksek': { f: 1.2, shift: 4, note: 'oğul eğilimi yüksek' },
    'cok-yuksek': { f: 1.3, shift: 6, note: 'oğul eğilimi çok yüksek' }
  };
  /* 5 düzeyli karakter ölçeği (melezler önce). */
  function breedSwarmFactor(breed) {
    var b = String(breed || '').toLocaleLowerCase('tr');
    function has(x) { return b.indexOf(x) >= 0; }
    var kaf = has('kafkas'), kar = has('karadeniz'), kni = has('karniyol'), mug = has('muğla') || has('mugla'), ana = has('anadolu');
    var k = null;
    if (kaf && kar) k = 'cok-dusuk';
    else if (kaf && kni) k = 'orta';
    else if (kaf && ana) k = 'dusuk';
    else if (kni && mug) k = 'yuksek';
    else if (kni) k = 'cok-yuksek';
    else if (mug) k = 'yuksek';
    else if (kaf || kar || has('buckfast')) k = 'dusuk';
    else if (ana || has('italyan')) k = 'orta';
    if (!k) return { f: 1.0, shift: 0, note: '', level: '' };
    var t = BREED_TENDENCY[k];
    return { f: t.f, shift: t.shift, note: t.note, level: k };
  }
  function swarmLevelOf(score) {
    var i = score >= 75 ? 4 : (score >= 55 ? 3 : (score >= 35 ? 2 : (score >= 15 ? 1 : 0)));
    return SWARM_LEVELS[i];
  }
  function fmtTrShort(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? Number(m[3]) + ' ' + AY_KISA[Number(m[2]) - 1] : ''; }
  function swarmAssess(h, ctx) {
    ctx = ctx || {};
    if (!h) return null;
    var id = Number(h.id);
    var season = swarmSeason(h.apiaryId, ctx.date, ctx);
    var inSeason = season.phase !== 'disi';
    var st = null;
    try {
      if (!ctx.recs) ctx.recs = loadRecordsAll();
      st = colonyStatus(id, ctx.recs);
    } catch (e) { st = null; }
    /* Irk: mevcut ana kaydı → kovan aynası → arılık ırk planı. */
    var breed = '';
    if (h.currentQueenId) {
      if (!ctx.queens) ctx.queens = loadQueens();
      var q = queenById(h.currentQueenId, ctx.queens);
      if (q && q.breed) breed = q.breed;
    }
    if (!breed) breed = h.breed || '';
    if (!breed) breed = plannedBreed(breedPlanKeyFor({ id: h.apiaryId }), 0) || '';
    var bf = breedSwarmFactor(breed);
    var why = []; /* { key, text, dir: up | down | info, group: durum | karakter } */
    function R(key, text, dir, group) { why.push({ key: key, text: text, dir: dir || 'info', group: group || 'durum' }); }
    R('mevsim', inSeason
      ? (season.phase === 'zirve' ? 'Oğul mevsimi (' + season.profileLabel + ', ' + season.window + ')' : 'Oğul mevsimine yakın (' + season.profileLabel + ', ' + season.window + ')')
      : 'Oğul mevsimi dışı (' + season.profileLabel + '; mevsim ' + season.window + ')', inSeason ? 'up' : 'down');
    /* --- Kovan durumu (asıl belirleyici) --- */
    var s = 20;
    var cls = st && st.strengthClass ? st.strengthClass : null;
    var strength = cls ? cls.toLocaleLowerCase('tr') : String(h.strength || '').toLocaleLowerCase('tr');
    var sr = st && st.strength ? st.strength : null;
    var bees = sr && Number(sr.beeFrames) ? Number(sr.beeFrames) : null;
    var broodF = sr && Number(sr.broodFrames) ? Number(sr.broodFrames) : null;
    var beeTxt = bees ? ', ' + bees + ' çerçeve arı' : '';
    if (strength === 'güçlü') { s += 20; R('guc', 'Koloni güçlü' + beeTxt, 'up'); }
    else if (strength === 'orta') { s += 6; R('guc', 'Koloni orta güçte' + beeTxt, 'info'); }
    else if (strength === 'zayıf') { s -= 20; R('guc', 'Koloni zayıf' + beeTxt, 'down'); }
    if (broodF != null && broodF >= 6) { s += 10; R('yavru', 'Çok yavru (' + broodF + ' çerçeve)', 'up'); }
    else if (broodF != null && broodF >= 4) s += 5;
    var sup = (ctx.plan || (ctx.plan = planState())).supers;
    var hasSuper = !!(sup && sup[String(id)]);
    /* Yer darlığı: arılı çerçeve / kutu kapasitesi (10 çerçeveli gövde + bal katı varsa 10). */
    var capF = 10 + (hasSuper ? 10 : 0);
    var space = false, severe = false;
    if (bees != null) {
      var used = bees / capF;
      var full = sr ? (Number(sr.broodFrames) || 0) + (Number(sr.honeyFrames) || 0) + (Number(sr.pollenFrames) || 0) : 0;
      var noEmpty = full >= capF - 1;
      if (used >= 0.9 || (used >= 0.8 && noEmpty)) { s += 25; space = true; severe = true; R('yer', 'Yer darlığı: ' + bees + '/' + capF + ' çerçeve arılı' + (noEmpty ? ', boş çerçeve yok' : ''), 'up'); }
      else if (used >= 0.8 || noEmpty) { s += 12; space = true; R('yer', noEmpty ? 'Boş çerçeve kalmamış' : 'Kovan dolmak üzere (' + bees + '/' + capF + ' çerçeve arılı)', 'up'); }
    } else if (strength === 'güçlü' && !hasSuper) { s += 8; space = true; R('yer', 'Yer darlığı olabilir (bal katı verilmemiş)', 'up'); }
    if (hasSuper && !severe) { s -= 8; R('kat', 'Bal katı verilmiş (yer açıldı)', 'down'); }
    var age = queenAge(h);
    if (age == null) R('ana', 'Ana arı yaşı bilinmiyor', 'info');
    else if (age <= 0) { s -= 10; R('ana', 'Genç ana arı (bu yıl)', 'down'); }
    else if (age === 1) R('ana', 'Ana arı 1 yaşında', 'info');
    else if (age === 2) { s += 8; R('ana', 'Ana arı 2 yaşında', 'up'); }
    else { s += 12; R('ana', 'Ana arı yaşlı (' + age + ' yaş)', 'up'); }
    var dk = Number(h.deltaKg) || 0;
    if (inSeason && dk >= 1.5) { s += 6; R('tarti', 'Hızlı ağırlık artışı (bal akımı, yer dolmakta)', 'up'); }
    else if (inSeason && dk <= -2) { s += 10; R('tarti', 'Ani ağırlık düşüşü — oğul çıkmış olabilir, kontrol edin', 'up'); }
    if (h.lastSwarmDate && /^\d{4}-\d{2}-\d{2}$/.test(String(h.lastSwarmDate)) && String(h.lastSwarmDate) >= addDays(ctx.date || todayLocal(), -365)) {
      s += 10; R('gecmis', 'Son bir yılda oğul verdi (' + fmtTrShort(String(h.lastSwarmDate)) + ')', 'up');
    }
    if (h.sensorSwarmSignal === true) { s += 15; R('sensor', 'Sensör: oğul öncesi ses/ısı işareti', 'up'); }
    s = Math.max(0, Math.min(100, s)) * season.factor;
    /* --- Ana arı karakteri (küçük kaydırma) --- */
    var t = String(h.swarmTendency || '');
    var shift = bf.shift || 0;
    if (t === 'Yüksek') { shift += 4; R('egilim', 'Gözlenen oğul eğilimi yüksek', 'up', 'karakter'); }
    else if (t === 'Düşük') { shift -= 2; R('egilim', 'Gözlenen oğul eğilimi düşük', 'down', 'karakter'); }
    shift = Math.max(-8, Math.min(8, shift)) * (inSeason ? 1 : 0.5);
    var clipped = h.queenClipped === true;
    if (clipped) R('kirpik', 'Ana arı kırpık: oğul kaçışı riski azalır', 'down', 'karakter');
    /* Ana memesi kaydı (son yavru muayenesi): yer, sayı, kapalı/açık. */
    var cell = !!(st && st.swarmCell);
    var capped = !!(st && st.cellCapped === 'kapali');
    if ((capped && cell) || (severe && inSeason)) shift = Math.max(0, shift); /* karakter bu durumlarda düşürmez */
    s += shift;
    if (severe && inSeason) s = Math.max(s, 55);
    var cellN = st && st.cellCount ? st.cellCount : null;
    var cd = st && st.brood && st.brood.date ? ' — muayene ' + fmtTrShort(st.brood.date) : '';
    var nTxt = function (w) { return (cellN ? cellN + ' ' : '') + (st.cellCapped ? CELL_CAP_LABEL[st.cellCapped] + ' ' : '') + w; };
    var quietCells = false, manyCells = false;
    if (cell) {
      s = Math.max(s, capped ? 80 : (inSeason ? 60 : 40));
      why.splice(1, 0, { key: 'meme', text: 'Alt kenarda ' + nTxt('ana memesi (oğul memesi)') + cd, dir: 'up', group: 'durum' });
    } else if (st && st.supersedureCell) {
      if (cellN != null && cellN > 3) {
        manyCells = true;
        s = Math.max(s, inSeason ? 45 : 25);
        why.splice(1, 0, { key: 'meme', text: 'Petek ortasında çok sayıda ana memesi (' + cellN + ') — oğul hazırlığı olabilir' + cd, dir: 'up', group: 'durum' });
      } else {
        quietCells = true;
        why.splice(1, 0, { key: 'meme', text: 'Sessiz ana değiştirme: petek ortasında ' + nTxt('ana memesi') + cd, dir: 'down', group: 'durum' });
      }
    }
    var queenless = !!(st && st.queenless);
    if (queenless) {
      s = Math.min(s, 5);
      why = why.filter(function (x) { return ['ana', 'egilim', 'kirpik'].indexOf(x.key) === -1; }); /* ana yok: ana yaşı/eğilimi anlamsız */
      why.splice(1, 0, st.emergencyCell
        ? { key: 'acil', text: 'Acil ana memesi (genç larvadan' + (cellN ? ', ' + cellN + ' meme' : '') + ') — koloni anasız, yeni ana yetiştiriyor' + cd, dir: 'down', group: 'durum' }
        : { key: 'anasiz', text: 'Koloni anasız — oğul vermez', dir: 'down', group: 'durum' });
    }
    s = Math.round(Math.max(0, Math.min(100, s)));
    var lv = swarmLevelOf(s);
    if (breed && !queenless) R('irk', 'Ana arı karakteri: ' + breed + (bf.note ? ', ' + bf.note : ''), bf.shift < 0 ? 'down' : (bf.shift > 0 ? 'up' : 'info'), 'karakter');
    /* Öneriler (nedene göre). */
    var recs = [];
    function A(id, title, detail, extra) { var r = { id: id, title: title, detail: detail }; if (extra) for (var k in extra) r[k] = extra[k]; recs.push(r); }
    var elevated = lv.key === 'orta' || lv.key === 'yuksek' || lv.key === 'cok-yuksek';
    if (queenless && st && st.emergencyCell) {
      A('anasiz', 'Anasız akışı: memelere dokunma', 'Acil memelerden ana ~1 haftada çıkar, çiftleşme ~2 hafta sürer; ~3 hafta sonra yumurta kontrolü yapın. Meme tutmazsa ana verin veya birleştirin.');
    } else if (queenless) {
      A('anasiz', 'Ana arı ver veya birleştir', 'Anasız koloni oğul vermez ama zayıflar; ana verin, ana memesi verin ya da birleştirin.');
    } else if (quietCells) {
      A('dokunma', 'Memelere dokunma, izle', 'Petek ortasındaki 1–3 meme koloninin anasını sessizce yenilediğini gösterir; memeleri kırmayın, 3 hafta sonra yumurta kontrolü yapın.');
      if (inSeason && (lv.key === 'yuksek' || lv.key === 'cok-yuksek') && (space || strength === 'güçlü')) A('kat', 'Kat at (bal katı ver)', 'Yer darlığını giderir.');
    } else if (cell || (inSeason && elevated)) {
      if (cell) A('meme', capped ? 'Ana memelerini kır veya bölmede kullan' : 'Ana memelerini kontrol et / kır', capped
        ? 'Alt kenarda kapalı oğul memesi: oğul birkaç gün içinde çıkabilir. Memeleri kırın ya da koloniyi bölüp memeyi bölmede kullanın.'
        : 'Açık oğul memeleri: 5–7 gün içinde kapanır. Kırın ya da bölme yapın; yer açın.');
      if (cell && !(strength === 'güçlü')) A('bolme', 'Bölme yap', 'Oğul memesi olan koloniyi bölün; memeli çerçeveyi bölmeye verin.', { href: 'koloni-islem.html?islem=bolme&apiary=' + encodeURIComponent(h.apiaryId) + '&src=' + encodeURIComponent(id) + '&neden=ogul' });
      if (space || strength === 'güçlü') A('kat', 'Kat at (bal katı ver)', 'Yer darlığını giderir; oğul hazırlığını çoğu zaman durdurur.');
      if (strength === 'güçlü') A('bolme', 'Bölme yap', 'Güçlü koloniden yavrulu ve arılı çerçevelerle bölme yapın.', { href: 'koloni-islem.html?islem=bolme&apiary=' + encodeURIComponent(h.apiaryId) + '&src=' + encodeURIComponent(id) + '&neden=ogul' });
      if (space || strength === 'güçlü') A('cerceve', 'Boş çerçeve / temel petek ver', 'Kuluçka alanına 1–2 temel petek koyun; ana yumurtlayacak yer bulur.');
      if (!cell) A('meme', 'Ana memelerini kontrol et', '7–10 günde bir çerçeve altlarına ve kenarlarına bakın.');
      if (age != null && age >= 2) A('ana', 'Ana arıyı yenile', 'Genç ana oğul eğilimini azaltır.');
      if (season.profile === 'sicak' || strength === 'güçlü') A('hava', 'Havalandırma / gölge sağla', 'Giriş aralığını açın, sıcak saatlerde gölge sağlayın.');
      /* Kanat kırpma: yalnız çiftleşmiş ve yumurtlayan, henüz kırpılmamış ana. */
      var laying = !(st && st.queenCellSince) && ((st && st.brood && st.brood.eggs === true) || (age != null && age >= 1));
      if ((lv.key === 'yuksek' || lv.key === 'cok-yuksek') && !clipped && laying) A('kanat', 'Ana arı kanadını kırp (isteğe bağlı)', 'Oğul çıkarsa ana uçamaz, koloni kovana döner. Kırpma tek başına oğulu durdurmaz; ana memesi kontrolü, kat atma veya bölme ile birlikte yapın.');
    } else {
      if (manyCells) A('meme', 'Ana memelerini kontrol et', 'Memelerin yerine bakın: alt kenardaysa oğul, petek ortasındaysa sessiz ana değiştirmedir.');
      if (age != null && age >= 3) A('ana', 'Ana arıyı yenile', 'Yaşlı ana gelecek mevsim oğul riskini artırır.');
      A('izle', 'Bir şey yapma, izlemeye devam', inSeason ? 'Risk düşük; olağan muayenelerde kontrol edin.' : 'Oğul mevsimi dışında; olağan bakımla devam edin.');
    }
    var seasonNote = why[0].text;
    return { score: s, level: lv.label, key: lv.key, tone: lv.tone, color: lv.color, breed: breed,
      season: season, seasonNote: seasonNote, reasons: why.slice(1).map(function (x) { return x.text; }), details: why, recs: recs };
  }
  /** Kovan listesine hesaplanan oğul riskini (swarmRisk) tembel olarak bağlar. */
  function attachSwarmRisk(list) {
    var ctx = { date: todayLocal() };
    (list || []).forEach(function (h) {
      if (!h || typeof h !== 'object') return;
      var cache = null;
      Object.defineProperty(h, 'swarmRisk', {
        configurable: true, enumerable: true,
        get: function () {
          if (!cache) { try { cache = swarmAssess(h, ctx); } catch (e) { cache = { level: 'Düşük' }; } }
          return cache.level;
        },
        set: function (v) { /* hesaplanan alan: yazma yok sayılır */ }
      });
    });
    return list;
  }
  /** Oğul uyarıları: hesaplanan Yüksek / Çok yüksek kovanlar. */
  function swarmAlerts() {
    var out = [];
    var ctx = { date: todayLocal() };
    loadHives().forEach(function (h) {
      var a = swarmAssess(h, ctx);
      if (a && (a.key === 'yuksek' || a.key === 'cok-yuksek')) {
        out.push({ id: 'ogul-' + h.id, title: 'Oğul riski ' + a.level.toLocaleLowerCase('tr'), type: 'ogul', hiveId: h.id,
          apiaryId: h.apiaryId, severity: a.key === 'cok-yuksek' ? 'high' : 'medium', auto: true });
      }
    });
    return out;
  }

  /** Arka plan sağlık modeli için yalın bayraklar (formül sensor-health.js içinde). */
  function healthFlags(hiveId) {
    var st = colonyStatus(hiveId);
    var f = { queenless: st.queenless, chilled: st.chilled, weak: st.strengthClass === 'Zayıf', afb: st.afb };
    Object.keys(st.latestByDisease).forEach(function (k) { f[k] = diseaseLevel(st.latestByDisease[k]).level; });
    return f;
  }

  /* Kovan bayrakları (anasız, ana hücresi, birleştirildi) — ham depodan, değişmedikçe önbellekli. */
  var hiveFlagCache = { raw: null, map: {} };
  function hiveFlags() {
    var raw = null;
    try { raw = localStorage.getItem(HIVES_KEY); } catch (e) { raw = null; }
    if (raw === hiveFlagCache.raw) return hiveFlagCache.map;
    var map = {};
    try {
      (JSON.parse(raw || '[]') || []).forEach(function (h) {
        if (!h || h.id == null) return;
        if (h.queenless || h.colonyState || h.queenGivenAt) map[String(Number(h.id))] = { queenless: h.queenless === true, queenCellSince: h.queenCellSince || '', colonyState: h.colonyState || '', queenGivenAt: h.queenGivenAt || '' };
      });
    } catch (e) { map = {}; }
    hiveFlagCache = { raw: raw, map: map };
    return map;
  }
  function hiveNameMap(hives) {
    var m = {};
    (hives || loadHives()).forEach(function (h) { m[h.id] = h; });
    return m;
  }

  /** Kayıtlardan otomatik görev ve uyarılar (yalnız etkin moddaki kayıtlar). */
  function derivedItems() {
    var all = loadRecordsAll();
    var ids = Object.keys(all);
    var flags = hiveFlags();
    Object.keys(flags).forEach(function (k) { if (flags[k].queenless && ids.indexOf(k) === -1) ids.push(k); });
    var tasksOut = [], alertsOut = [];
    if (!ids.length) return { tasks: tasksOut, alerts: alertsOut };
    var hives = hiveNameMap();
    var aps = {};
    loadApiaries().forEach(function (a) { aps[a.id] = a; });
    var nowIso = new Date().toISOString();
    ids.forEach(function (key) {
      var h = hives[Number(key)];
      if (!h || h.colonyState === 'birlestirildi') return;
      var st = colonyStatus(h.id, all);
      if (st.queenCellSince) {
        var qc = addDays(st.queenCellSince, 21);
        tasksOut.push({ id: 'kr-anahucre-' + h.id, title: 'Ana hücresi verildi — ' + h.name + ': yumurta kontrolü (hücre ' + fmtTr(st.queenCellSince) + ', ana çıkışı ~7 gün, çiftleşme ~2 hafta)', hiveId: h.id, priority: 3, auto: true, due: qc, createdAt: new Date().toISOString() });
      }
      var nm = h.name;
      var apName = aps[h.apiaryId] ? aps[h.apiaryId].name : '';
      if (st.queenless) {
        tasksOut.push({ id: 'kr-anasiz-' + h.id, title: st.emergencyCell
            ? 'Acil ana memesi (anasız) — ' + nm + ': memelere dokunma, ~3 hafta sonra yumurta kontrolü; olmazsa ana ver veya birleştir'
            : 'Anasız koloni — ' + nm + ': ana arı ver veya birleştir', hiveId: h.id, priority: 1, auto: true, due: st.brood ? st.brood.date : '', createdAt: nowIso });
        alertsOut.push({ id: 'kra-anasiz-' + h.id, title: 'Anasız koloni — ' + nm, type: 'koloni', hiveId: h.id, severity: 'high', auto: true });
      }
      if (st.chilled) {
        tasksOut.push({ id: 'kr-usumus-' + h.id, title: 'Birleştir veya çerçeve azalt — ' + nm + ' (zayıf koloni, üşümüş yavru)', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
        alertsOut.push({ id: 'kra-usumus-' + h.id, title: 'Üşümüş yavru — zayıf koloni (' + nm + ')', type: 'koloni', hiveId: h.id, severity: 'medium', auto: true });
      }
      if (st.swarmCell) {
        tasksOut.push({ id: 'kr-ogulhucre-' + h.id, title: 'Oğul memesi görüldü' + (st.cellCapped === 'kapali' ? ' (kapalı)' : '') + ' — ' + nm + ': bölme veya meme kırma, yer açma', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
      }
      if (st.afb === 'dogrulandi') {
        tasksOut.push({ id: 'kr-ayc-komsu-' + h.id, title: 'AYÇ doğrulandı (' + nm + ') — ' + (apName || 'arılıktaki') + ' diğer kovanları kontrol et', hiveId: h.id, priority: 1, auto: true, createdAt: nowIso });
        tasksOut.push({ id: 'kr-ayc-ihbar-' + h.id, title: 'AYÇ ihbarı zorunlu — İl/İlçe Tarım ve Orman Müdürlüğüne bildir (' + nm + ')', hiveId: h.id, priority: 1, auto: true, createdAt: nowIso });
        alertsOut.push({ id: 'kra-ayc-' + h.id, title: 'Amerikan yavru çürüğü doğrulandı — ihbarı zorunlu (' + nm + ')', type: 'hastalık', hiveId: h.id, severity: 'high', auto: true });
      } else if (st.afb === 'suphe') {
        tasksOut.push({ id: 'kr-ayc-suphe-' + h.id, title: 'AYÇ şüphesi — ' + nm + ': numune al ve doğrulat', hiveId: h.id, priority: 1, auto: true, createdAt: nowIso });
        alertsOut.push({ id: 'kra-ayc-suphe-' + h.id, title: 'Amerikan yavru çürüğü şüphesi (' + nm + ')', type: 'hastalık', hiveId: h.id, severity: 'high', auto: true });
      }
      st.diseases.forEach(function (d) {
        if (d.key === 'ayc') return;
        if (d.level === 'yüksek' || d.level === 'kritik' || d.level === 'orta') {
          alertsOut.push({ id: 'kra-' + d.key + '-' + h.id, title: d.label + ' (' + d.text + ') — ' + nm, type: 'hastalık', hiveId: h.id, severity: d.level === 'orta' ? 'medium' : 'high', auto: true });
        }
        if (d.key === 'varroa' && d.level === 'yüksek') {
          tasksOut.push({ id: 'kr-varroa-' + h.id, title: 'Varroa yüksek — ' + nm + ': mücadele planla', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
        }
      });
      st.dueChecks.forEach(function (c) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.date);
        tasksOut.push({ id: 'kr-kontrol-' + c.key + '-' + h.id, title: 'Kontrol: ' + c.label + ' — ' + nm + ' (kontrol tarihi ' + (m ? m[3] + '.' + m[2] + '.' + m[1] : c.date) + ')', hiveId: h.id, priority: 2, auto: true, due: c.date, createdAt: nowIso });
      });
      var today0 = todayLocal();
      /* İlaç bekleme süresi bittiğinde görev (bitişten sonraki 14 gün görünür). */
      st.records.disease.forEach(function (r) {
        if (!r.withdrawalDays) return;
        var until = addDays(r.date, r.withdrawalDays);
        if (until < today0 && until >= addDays(today0, -14)) {
          var wu = /^(\d{4})-(\d{2})-(\d{2})$/.exec(until);
          tasksOut.push({ id: 'kr-bekleme-bitti-' + r.id + '-' + h.id, title: 'İlaç bekleme süresi bitti — ' + nm + ' (' + (wu ? wu[3] + '.' + wu[2] + '.' + wu[1] : until) + ')', hiveId: h.id, priority: 3, auto: true, due: until, createdAt: nowIso });
        }
      });
      /* Varroa ilaçlamasından ~2 hafta sonra tekrar sayım (daha yeni varroa kaydı yoksa). */
      var lastVarroa = st.latestByDisease.varroa;
      if (lastVarroa && (lastVarroa.treatment || lastVarroa.withdrawalDays || lastVarroa.dose != null)) {
        var rc = addDays(lastVarroa.date, 14);
        if (rc <= addDays(today0, 2) && rc >= addDays(today0, -30)) {
          var rm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rc);
          tasksOut.push({ id: 'kr-varroa-sayim-' + h.id, title: 'Varroa tekrar sayımı — ' + nm + ' (ilaçlamadan 2 hafta sonra, ' + (rm ? rm[3] + '.' + rm[2] + '.' + rm[1] : rc) + ')', hiveId: h.id, priority: 2, auto: true, due: rc, createdAt: nowIso });
        }
      }
      var ws = winterStatus(h.id, all, st);
      if (ws.rec && ws.statusKey === 'birlestir') {
        tasksOut.push({ id: 'kr-kis-birlestir-' + h.id, title: 'Kışa girmeden birleştir — ' + nm + ' (kışlık hazırlık)', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
      } else if (ws.rec && ws.statusKey === 'eksik') {
        tasksOut.push({ id: 'kr-kis-eksik-' + h.id, title: 'Kışlık hazırlık eksik — ' + nm + ': ' + ws.missing.join(', '), hiveId: h.id, priority: 3, auto: true, createdAt: nowIso });
      }
      if (ws.storesKg != null && !ws.storesOk) {
        alertsOut.push({ id: 'kra-kisstok-' + h.id, title: 'Kışlık stok yetersiz — ' + nm + ': ' + String(ws.storesKg).replace('.', ',') + ' kg (en az ' + WINTER_MIN_KG + ' kg)', type: 'besleme', hiveId: h.id, severity: 'medium', auto: true });
      }
      if (st.withdrawalUntil) {
        var w = /^(\d{4})-(\d{2})-(\d{2})$/.exec(st.withdrawalUntil);
        alertsOut.push({ id: 'kra-bekleme-' + h.id, title: 'İlaç bekleme süresi — ' + nm + ': ' + (w ? w[3] + '.' + w[2] + '.' + w[1] : st.withdrawalUntil) + ' tarihine kadar hasat yapma', type: 'hastalık', hiveId: h.id, severity: 'low', auto: true });
      }
    });
    return { tasks: tasksOut, alerts: alertsOut };
  }

  /** Demo modda bir kez örnek kayıt seti (açıkça demo: demo=true). */
  function seedDemoRecords() {
    if (workMode() !== 'demo') return;
    try { if (localStorage.getItem(REC_SEED_KEY) === '1') return; localStorage.setItem(REC_SEED_KEY, '1'); } catch (e) { return; }
    var all = loadRecordsAll();
    if (Object.keys(all).length) return;
    var t = todayLocal();
    function d(n) { return addDays(t, -n); }
    function first(aid, i) { var hs = hivesForApiary(aid); return hs[i || 0] ? hs[i || 0].id : null; }
    function put(hid, kind, r) {
      if (hid == null) return;
      var key = String(hid);
      if (!all[key]) all[key] = {};
      if (!all[key][kind]) all[key][kind] = [];
      r.demo = true;
      all[key][kind].push(normalizeRecord(kind, r));
    }
    var h101 = first('a1', 0), h118 = first('a1', 2), h110 = first('a1', 6);
    var h204 = first('a2', 0), h211 = first('a2', 1);
    var h305 = first('a3', 0);
    var h4 = first('a4', 0), h5 = first('a5', 0), h5b = first('a5', 3);
    put(h101, 'strength', { date: d(40), beeFrames: 8, broodFrames: 5, honeyFrames: 3, pollenFrames: 1 });
    put(h101, 'strength', { date: d(9), beeFrames: 10, broodFrames: 6, honeyFrames: 4, pollenFrames: 2 });
    put(h101, 'brood', { date: d(9), eggs: true, pattern: 'duzenli', queenCell: 'yok' });
    put(h118, 'strength', { date: d(12), beeFrames: 6, broodFrames: 3, honeyFrames: 2, pollenFrames: 1 });
    put(h118, 'disease', { date: d(12), disease: 'varroa', count: 11, method: 'alkol', treatment: 'Oksalik asit damlatma', withdrawalDays: 0, checkDate: d(-9), note: 'Sonbahar sayımı' });
    put(h110, 'disease', { date: d(15), disease: 'kirec', severity: 'hafif', frames: 1, treatment: 'Havalandırma, nemli çerçeve çıkarıldı', withdrawalDays: 0, checkDate: d(1) });
    put(h204, 'strength', { date: d(8), beeFrames: 9, broodFrames: 5, honeyFrames: 4, pollenFrames: 2 });
    put(h204, 'brood', { date: d(8), eggs: true, pattern: 'duzenli', queenCell: 'yenileme' });
    put(h211, 'strength', { date: d(6), beeFrames: 4, broodFrames: 1, honeyFrames: 2, pollenFrames: 0 });
    put(h211, 'brood', { date: d(6), eggs: false, pattern: 'daginik', queenCell: 'yok', queenless: true, note: 'Yumurta ve genç larva yok' });
    put(h305, 'disease', { date: d(10), disease: 'nosema', status: 'suphe', treatment: 'Numune gönderildi', withdrawalDays: 0, checkDate: d(-4) });
    put(h4, 'strength', { date: d(7), beeFrames: 7, broodFrames: 4, honeyFrames: 3, pollenFrames: 1 });
    put(h5, 'brood', { date: d(5), eggs: true, pattern: 'daginik', queenCell: 'yok', chilled: true, note: 'Soğuk gece sonrası kenar çerçevelerde' });
    put(h5, 'strength', { date: d(5), beeFrames: 4, broodFrames: 2, honeyFrames: 2, pollenFrames: 0 });
    put(h5b, 'disease', { date: d(20), disease: 'varroa', count: 4, method: 'seker', treatment: 'Amitraz şerit (onaylı)', withdrawalDays: 42, checkDate: d(-20) });
    put(h5b, 'disease', { date: d(18), disease: 'mumguvesi', severity: 'hafif', treatment: 'Boş petekler kükürtlendi', withdrawalDays: 0 });
    saveRecordsAll(all);
  }

  /** Demo: besleme + kışlık hazırlık örnekleri (ayrı bayrak, bir kez). */
  function seedDemoRecords2() {
    if (workMode() !== 'demo') return;
    try { if (localStorage.getItem(REC_SEED2_KEY) === '1') return; localStorage.setItem(REC_SEED2_KEY, '1'); } catch (e) { return; }
    var all = loadRecordsAll();
    var t = todayLocal();
    function d(n) { return addDays(t, -n); }
    function hid(aid, i) { var hs = hivesForApiary(aid); return hs[i] ? hs[i].id : null; }
    function put(id, kind, r) {
      if (id == null) return;
      var key = String(id);
      if (!all[key]) all[key] = {};
      if (!all[key][kind]) all[key][kind] = [];
      if (all[key][kind].length) return;
      r.demo = true;
      all[key][kind].push(normalizeRecord(kind, r));
    }
    function putFeed(id, list) {
      if (id == null) return;
      var key = String(id);
      if (!all[key]) all[key] = {};
      if (all[key].feed && all[key].feed.length) return;
      all[key].feed = list.map(function (r) { r.demo = true; return normalizeRecord('feed', r); });
    }
    putFeed(hid('a1', 0), [{ date: d(20), type: 'surup21', amount: 5 }, { date: d(8), type: 'surup21', amount: 5 }, { date: d(3), type: 'kek', amount: 2 }]);
    putFeed(hid('a1', 2), [{ date: d(14), type: 'surup11', amount: 4 }, { date: d(6), type: 'polen', amount: 0.5, note: 'Polen katkılı kek' }]);
    putFeed(hid('a2', 0), [{ date: d(18), type: 'balli', amount: 6, note: 'Güçlü kovandan 3 ballı çerçeve' }, { date: d(7), type: 'surup21', amount: 8 }]);
    putFeed(hid('a5', 0), [{ date: d(5), type: 'kek', amount: 1 }]);
    put(hid('a1', 0), 'winter', { date: d(2), strongEnough: 'evet', storesKg: 18, varroa: 'evet', narrowed: true, entrance: true, insulation: true });
    put(hid('a1', 2), 'winter', { date: d(4), strongEnough: 'evet', varroa: 'auto', narrowed: true, entrance: false, insulation: false });
    put(hid('a2', 0), 'winter', { date: d(3), strongEnough: 'evet', storesKg: 16, varroa: 'hayir', narrowed: true, entrance: true, insulation: false });
    put(hid('a5', 0), 'winter', { date: d(4), strongEnough: 'hayir', varroa: 'auto', narrowed: false, entrance: false, insulation: false, note: 'Üşümüş yavru sonrası' });
    saveRecordsAll(all);
  }
  function seedAll() { seedDemoRecords(); seedDemoRecords2(); }

  var colonyRecords = {
    DISEASES: DISEASES,
    DISEASE_LABEL: DISEASE_LABEL,
    SEVERITY: SEVERITY,
    SEVERITY_LABEL: SEVERITY_LABEL,
    NOSEMA_LABEL: NOSEMA_LABEL,
    AYC_LABEL: AYC_LABEL,
    VARROA_METHOD_LABEL: VARROA_METHOD_LABEL,
    QUEEN_CELL_LABEL: QUEEN_CELL_LABEL,
    CELL_CAP_LABEL: CELL_CAP_LABEL,
    PATTERN_LABEL: PATTERN_LABEL,
    workMode: workMode,
    strengthClass: strengthClass,
    recordsFor: function (id) { seedAll(); return recordsFor(id); },
    loadAll: function () { seedAll(); return loadRecordsAll(); },
    add: addRecord,
    remove: removeRecord,
    update: updateRecord,
    setPhotoCount: setPhotoCount,
    diseaseLevel: diseaseLevel,
    status: function (id, all) { seedAll(); return colonyStatus(id, all); },
    healthFlags: function (id) { seedAll(); return healthFlags(id); },
    derived: function () { seedAll(); return derivedItems(); },
    addDays: addDays,
    FEED_TYPES: FEED_TYPES,
    DOSE_UNIT_LABEL: DOSE_UNIT_LABEL,
    todayLocal: todayLocal,
    FEED_LABEL: FEED_LABEL,
    FEED_UNIT: FEED_UNIT,
    WINTER_MIN_KG: WINTER_MIN_KG,
    WINTER_STATUS_LABEL: WINTER_STATUS_LABEL,
    currentSeason: currentSeason,
    winterStatus: function (id, all) { seedAll(); return winterStatus(id, all); },
    winterSummary: function (hives, all) { seedAll(); return winterSummary(hives, all); },
    feedTotals: function (hives, all, season) { seedAll(); return feedTotals(hives, all, season); },
    /** Hasat tarihi, arılıktaki bir kovanın ilaç bekleme süresine denk geliyor mu? */
    harvests: harvestStore,
    withdrawalConflicts: function (apiaryId, date) {
      seedAll();
      var all = loadRecordsAll();
      var out = [];
      if (!date) return out;
      loadHives().forEach(function (h) {
        if (apiaryId && String(h.apiaryId) !== String(apiaryId)) return;
        var rec = all[String(h.id)];
        if (!rec || !rec.disease) return;
        rec.disease.forEach(function (d) {
          var days = Number(d.withdrawalDays) || 0;
          if (!days || !d.date) return;
          var until = addDays(d.date, days);
          if (date >= d.date && date <= until) {
            out.push({ hiveId: h.id, hiveName: h.name, disease: DISEASE_LABEL[d.disease] || d.disease, from: d.date, until: until });
          }
        });
      });
      return out;
    }
  };

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
    var lat = input && input.lat != null && input.lat !== '' ? Number(input.lat) : NaN;
    var lon = input && input.lon != null && input.lon !== '' ? Number(input.lon) : NaN;
    if (!isFinite(lat) || !isFinite(lon)) {
      throw new Error('Arılık için haritadan konum seçilmeli (enlem/boylam).');
    }
    var item = copyAdminFields(applyWaterDistance({
      id: 'a' + Date.now(),
      name: name,
      place: place,
      lat: lat,
      lon: lon,
      hiveCount: hiveCount
    }, input || {}), input || {});
    /* Yeni konum → yerel katalog su kaynağını haversine ile bağla (uydurma mesafe yok). */
    if (!(input && input.waterSourceId)) {
      var addSync = resyncWaterForNewCoords(item);
      item = addSync.apiary;
    }
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

  /** Patch fields on an existing apiary (e.g. map-picked lat/lon). */
  function updateApiary(id, patch) {
    loadHives();
    var list = loadApiaries();
    var key = String(id);
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== key) continue;
      var a = list[i];
      if (patch) {
        if (patch.name != null) a.name = String(patch.name).trim() || a.name;
        if (patch.place != null) a.place = String(patch.place).trim() || a.place;
        var prevLat = Number(a.lat);
        var prevLon = Number(a.lon);
        var coordsTouched = false;
        if (patch.lat != null && patch.lat !== '') {
          var la = Number(patch.lat);
          if (isFinite(la)) {
            if (!isFinite(prevLat) || Math.abs(prevLat - la) > 1e-7) coordsTouched = true;
            a.lat = la;
          }
        }
        if (patch.lon != null && patch.lon !== '') {
          var lo = Number(patch.lon);
          if (isFinite(lo)) {
            if (!isFinite(prevLon) || Math.abs(prevLon - lo) > 1e-7) coordsTouched = true;
            a.lon = lo;
          }
        }
        if (patch.hiveCount != null && patch.hiveCount !== '') {
          a.hiveCount = Math.max(0, Number(patch.hiveCount) || 0);
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'il')) {
          var ilV = trimAdmin(patch.il);
          if (ilV) a.il = ilV; else delete a.il;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'ilce')) {
          var ilceV = trimAdmin(patch.ilce);
          if (ilceV) a.ilce = ilceV; else delete a.ilce;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'koy')) {
          var koyV = trimAdmin(patch.koy);
          if (koyV) a.koy = koyV; else delete a.koy;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterDistanceM')) {
          var wd = parseWaterDistanceM(patch.waterDistanceM);
          if (wd != null) a.waterDistanceM = wd;
          else delete a.waterDistanceM;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterSourceId')) {
          var sid = patch.waterSourceId != null ? String(patch.waterSourceId).trim() : '';
          if (sid && waterCatalogById(sid)) {
            a.waterSourceId = sid;
            syncWaterConvenienceFromCatalog(a);
          } else if (!sid) {
            delete a.waterSourceId;
            delete a.waterSourceLabel;
            delete a.waterSourceType;
            delete a.waterSourceNote;
            delete a.waterSourceConfirmedAt;
          }
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterSourceType')) {
          var wt = parseWaterSourceType(patch.waterSourceType);
          if (wt != null) a.waterSourceType = wt;
          else delete a.waterSourceType;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterSourceNote')) {
          var wn = parseWaterSourceNote(patch.waterSourceNote);
          if (wn != null) a.waterSourceNote = wn;
          else delete a.waterSourceNote;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterSourceLabel')) {
          var wl = parseWaterSourceLabel(patch.waterSourceLabel);
          if (wl != null) a.waterSourceLabel = wl;
          else delete a.waterSourceLabel;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'waterSourceConfirmedAt')) {
          var wsc = patch.waterSourceConfirmedAt;
          if (wsc != null && String(wsc).trim()) a.waterSourceConfirmedAt = String(wsc).trim();
          else delete a.waterSourceConfirmedAt;
        }
        /* Keep type/note/label aligned with catalog when id is set. */
        if (a.waterSourceId) syncWaterConvenienceFromCatalog(a);
        var waterPatched =
          Object.prototype.hasOwnProperty.call(patch, 'waterSourceId') ||
          Object.prototype.hasOwnProperty.call(patch, 'waterDistanceM');
        LIVE_CACHE_KEYS.forEach(function (ck) {
          if (Object.prototype.hasOwnProperty.call(patch, ck)) {
            var cv = patch[ck];
            if (cv && typeof cv === 'object' && cv.payload != null) {
              a[ck] = makeLiveCache(
                cv.lat != null ? cv.lat : a.lat,
                cv.lon != null ? cv.lon : a.lon,
                cv.payload
              );
              if (cv.fetchedAt) a[ck].fetchedAt = String(cv.fetchedAt);
            } else {
              delete a[ck];
            }
          }
        });
        if (coordsTouched && !waterPatched) {
          /* Konum değişti: eski su bağını / mesafeyi yerel katalog + haversine ile yenile. */
          var locSync = resyncWaterForNewCoords(a);
          a = locSync.apiary;
          /* Coords changed → drop stale live analyses (refetch on next paint). */
          clearLiveCaches(a);
        } else {
          /* Su kaynağı seçildi veya yalnız mesafe: haritadan mesafeyi yenile (uydurma yok). */
          var refreshedOne = refreshWaterDistancesFromMap([a]);
          if (refreshedOne.list[0]) a = refreshedOne.list[0];
        }
      }
      list[i] = a;
      found = a;
      break;
    }
    if (!found) return null;
    saveApiaries(list);
    /* Reconcile hive fleet if hiveCount changed */
    if (patch && patch.hiveCount != null) loadHives();
    return apiaryById(key);
  }

  /**
   * Remove apiary + its hives from localStorage.
   * Expenses stay in Giderler Toplam but apiaryId/apiaryName are cleared
   * so deleted names never appear as labeled arılık rows.
   */
  function removeApiary(id) {
    var key = String(id || '');
    if (!key) return false;
    loadHives();
    var list = loadApiaries().filter(function (a) {
      return a && String(a.id) !== key;
    });
    var before = loadApiaries().length;
    if (list.length === before) {
      /* Still try hive cleanup / seed mark if id unknown in list */
    }
    markSeedDeleted(key);
    var hives = loadHives().filter(function (h) {
      return h && String(h.apiaryId) !== key;
    });
    /* Avoid reconcile resurrecting hives for a removed apiary: save filtered lists directly. */
    saveApiaries(list);
    saveHives(hives);
    try {
      var G = global.SuperAriGider;
      if (G && typeof G.detachApiaryFromExpenses === 'function') {
        G.detachApiaryFromExpenses(key);
      }
      if (G && typeof G.purgeOrphanApiaryLabels === 'function') {
        G.purgeOrphanApiaryLabels();
      }
    } catch (eDetach) { /* ignore */ }
    return true;
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

  /** Yandex Maps deep link (no API key). Note: pt= is lon,lat. */
  function yandexMapsUrl(lat, lon, zoom) {
    var la = Number(lat);
    var lo = Number(lon);
    var z = zoom || 15;
    if (!isFinite(la) || !isFinite(lo)) {
      return 'https://yandex.com/maps/?z=' + z + '&l=map';
    }
    return (
      'https://yandex.com/maps/?pt=' + lo + ',' + la +
      '&z=' + z + '&l=map'
    );
  }

  function isSeedApiaryId(id) {
    var key = String(id || '');
    return SEED_APIARIES.some(function (s) { return s.id === key; });
  }

  /**
   * Open-Meteo Geocoding has no reverse endpoint (404) — prefer it when available,
   * else Nominatim (User-Agent SuperAri). Never invent provinces.
   * Resolves { il, ilce, koy, place, source, label } — empty strings when unknown.
   */
  function reverseGeocodeAdmin(lat, lon) {
    var la = Number(lat);
    var lo = Number(lon);
    var empty = { il: '', ilce: '', koy: '', place: '', source: '', label: '', lat: la, lon: lo };
    if (!isFinite(la) || !isFinite(lo)) return Promise.resolve(empty);

    function parseNominatim(j) {
      var addr = (j && j.address) || {};
      var il = trimAdmin(addr.province || addr.state || '');
      var ilce = trimAdmin(
        addr.town || addr.municipality || addr.county || addr.city_district || addr.district || ''
      );
      var koy = trimAdmin(
        addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.quarter || ''
      );
      /* Do not invent: only keep real admin strings from the response. */
      var label = trimAdmin(j && j.display_name);
      var place = koy || ilce || il || '';
      return {
        il: il,
        ilce: ilce,
        koy: koy,
        place: place,
        source: 'nominatim',
        label: label,
        lat: la,
        lon: lo
      };
    }

    function nominatim() {
      var url =
        'https://nominatim.openstreetmap.org/reverse?lat=' +
        encodeURIComponent(String(la)) +
        '&lon=' +
        encodeURIComponent(String(lo)) +
        '&format=json&addressdetails=1&accept-language=tr&zoom=14';
      return fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'SuperAri' }
      })
        .then(function (r) {
          if (!r.ok) throw new Error('nominatim_' + r.status);
          return r.json();
        })
        .then(parseNominatim)
        .catch(function () { return empty; });
    }

    /* Probe Open-Meteo reverse; fall through to Nominatim on 404/empty. */
    var omUrl =
      'https://geocoding-api.open-meteo.com/v1/reverse?latitude=' +
      encodeURIComponent(String(la)) +
      '&longitude=' +
      encodeURIComponent(String(lo)) +
      '&language=tr&format=json&count=1';
    return fetch(omUrl)
      .then(function (r) {
        if (!r.ok) return nominatim();
        return r.json().then(function (j) {
          var row = j && j.results && j.results[0];
          if (!row) return nominatim();
          var il = trimAdmin(row.admin1 || '');
          var ilce = trimAdmin(row.admin2 || row.admin3 || '');
          var koy = trimAdmin(row.name || row.admin4 || '');
          if (!il && !ilce && !koy) return nominatim();
          return {
            il: il,
            ilce: ilce,
            koy: koy,
            place: koy || ilce || il || '',
            source: 'open-meteo',
            label: [koy, ilce, il].filter(Boolean).join(', '),
            lat: la,
            lon: lo
          };
        });
      })
      .catch(function () { return nominatim(); });
  }

  /**
   * Merge reverse-geocode into apiary admin fields.
   * Seed apiaries: keep seed il/ilce/koy unless empty.
   * Never invent — only apply non-empty geo fields.
   */
  function adminPatchFromGeocode(apiary, geo) {
    geo = geo || {};
    var patch = {};
    var seed = null;
    if (apiary && isSeedApiaryId(apiary.id)) {
      for (var i = 0; i < SEED_APIARIES.length; i++) {
        if (SEED_APIARIES[i].id === String(apiary.id)) { seed = SEED_APIARIES[i]; break; }
      }
    }
    function pick(field) {
      var seedV = seed ? trimAdmin(seed[field]) : '';
      var curV = trimAdmin(apiary && apiary[field]);
      var geoV = trimAdmin(geo[field]);
      if (seed) {
        /* Seed keep seed admin unless empty — then allow geo fill. */
        if (seedV) return seedV;
        if (curV) return curV;
        return geoV || '';
      }
      return geoV || curV || '';
    }
    var il = pick('il');
    var ilce = pick('ilce');
    var koy = pick('koy');
    if (il) patch.il = il; else patch.il = '';
    if (ilce) patch.ilce = ilce; else patch.ilce = '';
    if (koy) patch.koy = koy; else patch.koy = '';
    return patch;
  }

  /** Open-Meteo geocoder (no API key) — place/address search for map picker. */
  function geocodeSearch(query) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var url =
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(q) +
      '&count=6&language=tr&format=json&countryCode=TR';
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('geocode_' + r.status);
        return r.json();
      })
      .then(function (j) {
        return (j && j.results ? j.results : []).map(function (row) {
          var parts = [row.name, row.admin1, row.country].filter(Boolean);
          return {
            name: String(row.name || '').trim(),
            label: parts.join(', '),
            lat: Number(row.latitude),
            lon: Number(row.longitude)
          };
        }).filter(function (row) {
          return row.name && isFinite(row.lat) && isFinite(row.lon);
        });
      });
  }

  /** Yandex Maps search deep link (no API key). */
  function yandexSearchUrl(query) {
    var q = String(query || '').trim();
    if (!q) return 'https://yandex.com/maps/';
    return 'https://yandex.com/maps/?text=' + encodeURIComponent(q);
  }

  /**
   * Parse lat/lon from a Yandex Maps URL or plain "lat, lon" / "lat lon" text.
   * Yandex ll= and pt= are lon,lat; plain pairs are treated as lat,lon (Turkey range).
   */
  function parseCoordsFromText(text) {
    var s = String(text || '').trim();
    if (!s) return null;
    var m;
    m = s.match(/[?&#](?:pt|ll)=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i);
    if (!m) m = s.match(/[?&#](?:pt|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (m) {
      var lonY = Number(m[1]);
      var latY = Number(m[2]);
      if (isFinite(latY) && isFinite(lonY)) return { lat: latY, lon: lonY, source: 'yandex' };
    }
    m = s.match(/whatshere\[point\]=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i);
    if (!m) m = s.match(/whatshere\[point\]=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (m) {
      var lonW = Number(m[1]);
      var latW = Number(m[2]);
      if (isFinite(latW) && isFinite(lonW)) return { lat: latW, lon: lonW, source: 'yandex' };
    }
    m = s.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      var a = Number(m[1]);
      var b = Number(m[2]);
      if (!isFinite(a) || !isFinite(b)) return null;
      /* Heuristic: Turkey lat ~36–42, lon ~26–45 — if first looks like lon, swap */
      if (Math.abs(a) > 50 && Math.abs(b) <= 90) return { lat: b, lon: a, source: 'text' };
      return { lat: a, lon: b, source: 'text' };
    }
    return null;
  }

  /* ================= Koloni işlemleri: bölme, birleştirme, ana taşıma, ana üretimi =================
   * Kovan ve ana arı kayıtları ortak depodadır (superari.kovanlar / superari.anaArilar.v1).
   * İşlem günlüğü ve üretim partileri moda göre ayrı: superari.koloniIslem.v1 (canlı) / .demo.v1.
   * Örnek (demo) işlem verisi yoktur; tüm işlemler kullanıcı girişidir.
   */
  var OPS_LIVE = 'superari.koloniIslem.v1', OPS_DEMO = 'superari.koloniIslem.demo.v1';
  /* Standart larva transferi takvimi (1 günlük larva aşılandığı gün = 0. gün). */
  var GRAFT_TIMELINE = [
    { key: 'kabul', d: 1, label: 'Kabul kontrolü (kaç yüksük kabul edildi)' },
    { key: 'kapanma', d: 5, label: 'Hücreler kapanır (dokunmayın)' },
    { key: 'dagitim', d: 10, label: 'Olgun hücreleri çiftleşme kutularına dağıt' },
    { key: 'cikis', d: 12, label: 'Ana arı çıkışı' },
    { key: 'ucus', d: 17, label: 'Çiftleşme uçuşları (yaklaşık 5–9 gün sonra)' },
    { key: 'yumurta', d: 24, label: 'Yumurtlama kontrolü (ana çiftleşti mi)' }
  ];
  function opsKey() { return workMode() === 'live' ? OPS_LIVE : OPS_DEMO; }
  function readOps() {
    try {
      var o = JSON.parse(localStorage.getItem(opsKey()) || '{}');
      return { events: Array.isArray(o.events) ? o.events : [], batches: Array.isArray(o.batches) ? o.batches : [] };
    } catch (e) { return { events: [], batches: [] }; }
  }
  function writeOps(o) { try { localStorage.setItem(opsKey(), JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function opsId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function fmtTr(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : (d || ''); }
  function pushEvent(hive, ev) {
    hive.colonyEvents = (Array.isArray(hive.colonyEvents) ? hive.colonyEvents.slice() : []).concat([ev]);
    hive.colonyUpdatedAt = new Date().toISOString();
  }
  function pushQueenHist(hive, entry) {
    hive.queenHistory = (Array.isArray(hive.queenHistory) ? hive.queenHistory.slice() : []).concat([entry]);
  }
  function closePlacement(q, hiveId, date, reason) {
    var op = openPlacement(q);
    if (op && (hiveId == null || op.hiveId === Number(hiveId))) { op.to = date; op.endReason = reason; }
  }
  /** Kovanı anasız bırak (ana kaydı kapatıldıktan sonra). */
  function setQueenless(hive, cellDate) {
    mirrorQueenToHive(hive, null);
    hive.queenless = true;
    if (cellDate) hive.queenCellSince = cellDate; else delete hive.queenCellSince;
  }
  function placeQueen(hive, q, date) {
    q.placements.push({ hiveId: hive.id, from: date, to: null, endReason: null });
    mirrorQueenToHive(hive, q);
    delete hive.queenless; delete hive.queenCellSince;
    hive.queenGivenAt = date;
  }
  function lastStrength(hiveId) { var rec = recordsFor(hiveId); return rec.strength[0] || null; }
  function frameN(v) { var n = intIn(v, 0, 40); return n == null ? 0 : n; }

  /** Bölme: kaynak kovandan yeni kovan (yeni kayıt), çerçeve aktarımı ve ana durumu. */
  function splitHive(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal();
    var list = loadHives();
    var src = null; list.forEach(function (h) { if (h.id === Number(o.sourceId)) src = h; });
    if (!src) throw new Error('Kaynak kovan bulunamadı');
    if (src.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovan bölünemez');
    var brood = frameN(o.broodFrames), honey = frameN(o.honeyFrames), bees = frameN(o.beeFrames);
    if (!brood && !bees) throw new Error('Aktarılan yavrulu veya arılı çerçeve sayısını girin');
    var apiaryId = String(o.apiaryId || src.apiaryId);
    var aps = loadApiaries();
    var ap = null; aps.forEach(function (a) { if (String(a.id) === apiaryId) ap = a; });
    if (!ap) throw new Error('Arılık bulunamadı');
    var used = {}, maxId = 0, maxAp = 0;
    list.forEach(function (h) { used[h.id] = true; maxId = Math.max(maxId, h.id); if (String(h.apiaryId) === apiaryId) maxAp = Math.max(maxAp, h.id); });
    var nid = maxAp + 1; while (used[nid]) nid = ++maxId + 1;
    var queens = loadQueens(), gen = makeQueenIdGen(queens);
    var mode = pick(o.queenMode, ['kaynakta', 'hucre', 'yeniAna', 'anaTasindi'], 'kaynakta');
    var name = txt(o.name, 60) || ('Kovan ' + nid);
    var nh = normalizeHive({ id: nid, name: name, apiaryId: apiaryId, strength: 'zayıf', breed: src.breed, swarmRisk: 'Düşük' });
    nh.splitFrom = src.id; nh.createdBy = 'bolme';
    var sc = cloneObj(src);
    var frTxt = [brood ? brood + ' yavrulu' : '', honey ? honey + ' ballı' : '', bees ? bees + ' arılı' : ''].filter(Boolean).join(', ') + ' çerçeve';
    var qTxt = { kaynakta: 'ana kaynakta kaldı, yeni kovan anasız', hucre: 'yeni kovana ana hücresi verildi', yeniAna: 'yeni kovana yeni ana verildi', anaTasindi: 'ana yeni kovana alındı, kaynak anasız' }[mode];
    if (mode === 'kaynakta') setQueenless(nh, null);
    else if (mode === 'hucre') setQueenless(nh, date);
    else if (mode === 'yeniAna') {
      var r0 = replaceQueenInMemory(nh, { date: date, queenYear: o.queenYear || currentYear(), breed: o.queenBreed || src.breed, queenSource: txt(o.queenSource, 120) || 'Bölmede verildi', queenMarked: o.queenMarked === true }, queens, gen);
      nh = r0.hive; nh.queenGivenAt = date;
      nh.queenHistory[nh.queenHistory.length - 1].label = 'Bölme: yeni ana verildi';
    } else {
      var q = src.currentQueenId ? queenById(src.currentQueenId, queens) : null;
      if (!q) throw new Error('Kaynak kovanın ana kaydı yok; «Ana kaynakta» veya «Ana hücresi» seçin');
      closePlacement(q, src.id, date, 'Bölmede yeni kovana alındı');
      pushQueenHist(sc, { date: date, oldQueenId: q.id, oldYear: q.year, oldBreed: q.breed, label: 'Bölme: ana yeni kovana alındı (' + name + ')' });
      setQueenless(sc, null);
      placeQueen(nh, q, date);
      pushQueenHist(nh, { date: date, newQueenId: q.id, newYear: q.year, newBreed: q.breed, label: 'Bölme: ana geldi (kaynak: ' + src.name + ')' });
    }
    var evId = opsId('ev');
    pushEvent(sc, { id: evId, date: date, type: 'bolme', text: 'Bölme → ' + name + ': ' + frTxt + '; ' + qTxt, otherHiveId: nid });
    pushEvent(nh, { id: evId, date: date, type: 'bolme', text: 'Bölmeyle oluşturuldu (' + src.name + '): ' + frTxt + '; ' + qTxt, otherHiveId: src.id });
    var out = list.map(function (h) { return h.id === src.id ? normalizeHive(sc) : h; });
    out.push(normalizeHive(nh));
    ap.hiveCount = out.filter(function (h) { return String(h.apiaryId) === apiaryId; }).length;
    saveApiaries(aps);
    saveQueens(queens);
    saveHives(out);
    /* Çerçeve aktarımı: koloni gücü kayıtları (etkin mod). */
    var ls = lastStrength(src.id);
    if (ls) {
      addRecord(src.id, 'strength', { date: date, beeFrames: Math.max(0, ls.beeFrames - bees), broodFrames: Math.max(0, ls.broodFrames - brood), honeyFrames: Math.max(0, ls.honeyFrames - honey), pollenFrames: ls.pollenFrames, note: 'Bölme sonrası (' + frTxt + ' → ' + name + ')' });
    }
    addRecord(nid, 'strength', { date: date, beeFrames: bees || brood, broodFrames: brood, honeyFrames: honey, pollenFrames: 0, note: 'Bölmeyle oluşturuldu (' + src.name + ')' });
    var ops = readOps();
    ops.events.push({ id: evId, type: 'bolme', date: date, fromHiveId: src.id, toHiveId: nid, broodFrames: brood, honeyFrames: honey, beeFrames: bees, queenMode: mode, note: txt(o.note, 300) });
    writeOps(ops);
    return { newHiveId: nid, newHiveName: name, eventId: evId };
  }

  /** Birleştirme: zayıf kovan güçlüye katılır; zayıf kovan «birleştirildi» olarak işaretlenir. */
  function mergeHives(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal();
    var list = loadHives();
    var W = null, S = null;
    list.forEach(function (h) { if (h.id === Number(o.weakId)) W = h; if (h.id === Number(o.strongId)) S = h; });
    if (!W || !S) throw new Error('Kovan seçin');
    if (W.id === S.id) throw new Error('Aynı kovan seçilemez');
    if (W.colonyState === 'birlestirildi' || S.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovan tekrar seçilemez');
    var queens = loadQueens();
    var wq = W.currentQueenId ? queenById(W.currentQueenId, queens) : null;
    var sq = S.currentQueenId ? queenById(S.currentQueenId, queens) : null;
    var keep = pick(o.keepQueen, ['guclu', 'zayif'], 'guclu');
    if (keep === 'guclu' && !sq && wq) keep = 'zayif';
    var wc = cloneObj(W), scp = cloneObj(S);
    var qTxt;
    if (keep === 'zayif' && wq) {
      if (sq) { closePlacement(sq, S.id, date, 'Birleştirmede ayrıldı'); }
      closePlacement(wq, W.id, date, 'Birleştirmede geçti: ' + S.name);
      pushQueenHist(scp, { date: date, oldQueenId: sq ? sq.id : undefined, oldYear: sq ? sq.year : undefined, newQueenId: wq.id, newYear: wq.year, newBreed: wq.breed, label: 'Birleştirme: katılan kovanın anası (' + W.name + ')' });
      placeQueen(scp, wq, date);
      pushQueenHist(wc, { date: date, oldQueenId: wq.id, oldYear: wq.year, label: 'Birleştirme: ana birleşilen kovana geçti (' + S.name + ')' });
      qTxt = 'zayıf kovanın anası tutuldu';
    } else {
      if (wq) {
        closePlacement(wq, W.id, date, 'Birleştirmede ayrıldı');
        pushQueenHist(wc, { date: date, oldQueenId: wq.id, oldYear: wq.year, label: 'Birleştirme: ana ayrıldı' });
      }
      qTxt = 'güçlü kovanın anası tutuldu';
    }
    mirrorQueenToHive(wc, null);
    delete wc.queenless; delete wc.queenCellSince;
    wc.colonyState = 'birlestirildi'; wc.mergedInto = S.id;
    var method = o.method === 'dogrudan' ? 'doğrudan' : 'gazete kâğıdı ile';
    var evId = opsId('ev');
    pushEvent(wc, { id: evId, date: date, type: 'birlestirme', text: 'Birleştirildi → ' + S.name + ' (' + method + '); ' + qTxt, otherHiveId: S.id });
    pushEvent(scp, { id: evId, date: date, type: 'birlestirme', text: 'Katılan kovan: ' + W.name + ' (' + method + '); ' + qTxt, otherHiveId: W.id });
    var out = list.map(function (h) { return h.id === W.id ? normalizeHive(wc) : (h.id === S.id ? normalizeHive(scp) : h); });
    saveQueens(queens);
    saveHives(out);
    var lw = lastStrength(W.id), ls = lastStrength(S.id);
    if (lw || ls) {
      var a = lw || { beeFrames: 0, broodFrames: 0, honeyFrames: 0, pollenFrames: 0 }, b = ls || { beeFrames: 0, broodFrames: 0, honeyFrames: 0, pollenFrames: 0 };
      addRecord(S.id, 'strength', { date: date, beeFrames: a.beeFrames + b.beeFrames, broodFrames: a.broodFrames + b.broodFrames, honeyFrames: a.honeyFrames + b.honeyFrames, pollenFrames: a.pollenFrames + b.pollenFrames,
        note: 'Birleştirme sonrası tahmini (' + W.name + ' eklendi' + (lw && ls ? '' : '; bir kovanın güç kaydı yoktu') + ')' });
    }
    var ops = readOps();
    ops.events.push({ id: evId, type: 'birlestirme', date: date, fromHiveId: W.id, toHiveId: S.id, keepQueen: keep, method: o.method === 'dogrudan' ? 'dogrudan' : 'gazete', note: txt(o.note, 300) });
    writeOps(ops);
    return { eventId: evId, keepQueen: keep };
  }

  /** Ana taşıma: bir ana kaydını (kovandaki veya boştaki) başka kovana yerleştir. */
  function moveQueen(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal();
    var queens = loadQueens();
    var q = queenById(o.queenId, queens);
    if (!q) throw new Error('Ana arı seçin');
    var list = loadHives();
    var op = openPlacement(q);
    var A = null, B = null;
    list.forEach(function (h) { if (op && h.id === op.hiveId) A = h; if (h.id === Number(o.toHiveId)) B = h; });
    if (!B) throw new Error('Hedef kovan seçin');
    if (A && A.id === B.id) throw new Error('Ana zaten bu kovanda');
    if (B.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovana ana verilemez');
    var bq = B.currentQueenId ? queenById(B.currentQueenId, queens) : null;
    var bc = cloneObj(B), ac = A ? cloneObj(A) : null;
    if (bq) closePlacement(bq, B.id, date, 'Yerine ana taşındı');
    if (A) {
      closePlacement(q, A.id, date, 'Taşındı: ' + B.name);
      pushQueenHist(ac, { date: date, oldQueenId: q.id, oldYear: q.year, oldBreed: q.breed, label: 'Ana taşıma: ana gitti (hedef: ' + B.name + ')' });
      setQueenless(ac, null);
    }
    pushQueenHist(bc, { date: date, oldQueenId: bq ? bq.id : undefined, oldYear: bq ? bq.year : undefined, oldBreed: bq ? bq.breed : undefined, newQueenId: q.id, newYear: q.year, newBreed: q.breed,
      label: 'Ana taşıma: ' + (A ? 'ana geldi (kaynak: ' + A.name + ')' : 'boştaki ana yerleştirildi') });
    placeQueen(bc, q, date);
    var evId = opsId('ev');
    var tx = q.id + (A ? ' ' + A.name + ' → ' + B.name : ' → ' + B.name) + (bq ? '; önceki ana ' + bq.id + ' ayrıldı' : '');
    if (ac) pushEvent(ac, { id: evId, date: date, type: 'tasima', text: 'Ana taşındı: ' + tx + '; bu kovan anasız', otherHiveId: B.id });
    pushEvent(bc, { id: evId, date: date, type: 'tasima', text: 'Ana geldi: ' + tx, otherHiveId: A ? A.id : undefined });
    var out = list.map(function (h) { return h.id === B.id ? normalizeHive(bc) : (ac && h.id === ac.id ? normalizeHive(ac) : h); });
    saveQueens(queens);
    saveHives(out);
    var ops = readOps();
    ops.events.push({ id: evId, type: 'tasima', date: date, queenId: q.id, fromHiveId: A ? A.id : null, toHiveId: B.id, replacedQueenId: bq ? bq.id : null, note: txt(o.note, 300) });
    writeOps(ops);
    return { eventId: evId, fromHiveId: A ? A.id : null };
  }

  /* ---- Ana üretimi (larva transferi partileri) ---- */
  function batchDates(date) {
    var out = {};
    GRAFT_TIMELINE.forEach(function (t) { out[t.key] = addDays(date, t.d); });
    return out;
  }
  function normalizeBatch(b) {
    if (!b || !b.id) return null;
    var o = { id: String(b.id), date: isoDate(b.date) || todayLocal() };
    o.sourceHiveId = b.sourceHiveId != null ? Number(b.sourceHiveId) : null;
    o.sourceQueenId = txt(b.sourceQueenId, 32);
    o.sourceBreed = txt(b.sourceBreed, 60);
    o.cups = intIn(b.cups, 1, 500) || 1;
    o.accepted = intIn(b.accepted, 0, o.cups);
    o.emerged = intIn(b.emerged, 0, o.cups);
    o.status = pick(b.status, ['aktif', 'tamamlandi', 'iptal'], 'aktif');
    var note = txt(b.note, 300); if (note) o.note = note;
    o.results = (Array.isArray(b.results) ? b.results : []).filter(function (x) { return x && x.queenId; }).map(function (x) {
      return { queenId: String(x.queenId), hiveId: x.hiveId != null ? Number(x.hiveId) : null, date: isoDate(x.date) || o.date };
    });
    o.dates = batchDates(o.date);
    return o;
  }
  function listBatches() {
    return readOps().batches.map(normalizeBatch).filter(Boolean).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function addBatch(b) {
    b = b || {};
    var cups = intIn(b.cups, 1, 500);
    if (!cups) throw new Error('Yüksük (larva) sayısını girin');
    var hv = b.sourceHiveId != null && b.sourceHiveId !== '' ? hiveById(b.sourceHiveId) : null;
    var qid = txt(b.sourceQueenId, 32) || (hv && hv.currentQueenId) || '';
    var q = qid ? queenById(qid) : null;
    var row = normalizeBatch({ id: opsId('b'), date: b.date, sourceHiveId: hv ? hv.id : null, sourceQueenId: qid, sourceBreed: (q && q.breed) || (hv && hv.breed) || '', cups: cups, accepted: b.accepted, note: b.note });
    var ops = readOps(); ops.batches.push(row); writeOps(ops);
    return row;
  }
  function updateBatch(id, patch) {
    var ops = readOps(), out = null;
    ops.batches = ops.batches.map(function (b) {
      if (!b || b.id !== id) return b;
      var m = cloneObj(b);
      ['accepted', 'emerged', 'status', 'note'].forEach(function (k) { if (patch && Object.prototype.hasOwnProperty.call(patch, k)) m[k] = patch[k]; });
      out = normalizeBatch(m);
      return out;
    });
    if (out) writeOps(ops);
    return out;
  }
  function removeBatch(id) {
    var ops = readOps(), n = ops.batches.length;
    ops.batches = ops.batches.filter(function (b) { return b && b.id !== id; });
    writeOps(ops);
    return ops.batches.length !== n;
  }
  /** Partiden çıkan anayı kaydet: yeni ana kaydı; kovan seçildiyse yerleştirilir (varsa eski ana ayrılır). */
  function assignBatchQueen(batchId, o) {
    o = o || {};
    var b = listBatches().filter(function (x) { return x.id === batchId; })[0];
    if (!b) throw new Error('Parti bulunamadı');
    var limit = b.accepted != null ? b.accepted : b.cups;
    if (b.results.length >= limit) throw new Error('Kabul edilen yüksük sayısı kadar ana kaydedildi (' + limit + ')');
    var date = isoDate(o.date) || todayLocal();
    var queens = loadQueens(), gen = makeQueenIdGen(queens);
    var year = Number(b.dates.cikis.slice(0, 4)) || currentYear();
    var src = 'Kendi üretimi · larva transferi ' + fmtTr(b.date) + (b.sourceQueenId ? ' · anne ' + b.sourceQueenId : '');
    var hiveId = o.hiveId != null && o.hiveId !== '' ? Number(o.hiveId) : null;
    var qid;
    if (hiveId != null) {
      var list = loadHives(), found = null;
      var out = list.map(function (h) {
        if (h.id !== hiveId) return h;
        if (h.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovana ana verilemez');
        var r0 = replaceQueenInMemory(h, { date: date, queenYear: year, breed: b.sourceBreed || h.breed, queenSource: src, queenMarked: o.marked === true }, queens, gen);
        var nh = r0.hive;
        nh.queenHistory[nh.queenHistory.length - 1].label = 'Ana üretimi: kendi yetiştirdiğimiz ana verildi';
        delete nh.queenless; delete nh.queenCellSince; nh.queenGivenAt = date;
        pushEvent(nh, { id: opsId('ev'), date: date, type: 'uretim', text: 'Ana üretiminden ana verildi (' + r0.queen.id + ', parti ' + fmtTr(b.date) + ')' });
        qid = r0.queen.id;
        found = normalizeHive(nh);
        return found;
      });
      if (!found) throw new Error('Kovan bulunamadı');
      saveQueens(queens);
      saveHives(out);
    } else {
      var nq = normalizeQueen({ id: gen(year), year: year, breed: b.sourceBreed || '', source: src, marked: o.marked === true, note: 'Boşta (çiftleşme kutusu / satış)', createdAt: new Date().toISOString(), placements: [] });
      queens.push(nq); saveQueens(queens); qid = nq.id;
    }
    var ops = readOps();
    ops.batches = ops.batches.map(function (x) {
      if (!x || x.id !== batchId) return x;
      var m = cloneObj(x); m.results = (Array.isArray(x.results) ? x.results : []).concat([{ queenId: qid, hiveId: hiveId, date: date }]);
      if (m.results.length >= limit) m.status = 'tamamlandi';
      return m;
    });
    writeOps(ops);
    return { queenId: qid, hiveId: hiveId };
  }
  /** Boştaki (kovana yerleşmemiş) ana kayıtları. */
  function freeQueens() {
    return loadQueens().filter(function (q) { return !openPlacement(q) && !(q.placements || []).length; });
  }
  /** Partilerden otomatik görevler (tarihli). */
  function batchTasks() {
    var out = [];
    var today0 = todayLocal();
    listBatches().forEach(function (b) {
      if (b.status !== 'aktif') return;
      var src = b.sourceHiveId != null ? hiveById(b.sourceHiveId) : null;
      var tag = 'larva transferi ' + fmtTr(b.date) + (src ? ', ' + src.name : '');
      GRAFT_TIMELINE.forEach(function (t) {
        if (t.key === 'kapanma' || t.key === 'ucus') return;
        if (t.key === 'kabul' && b.accepted != null) return;
        var due = b.dates[t.key];
        if (due < addDays(today0, -30)) return;
        out.push({ id: 'kr-uretim-' + b.id + '-' + t.key, title: 'Ana üretimi: ' + t.label + ' — ' + tag, hiveId: b.sourceHiveId, apiaryId: src ? src.apiaryId : null,
          priority: t.key === 'kabul' || t.key === 'dagitim' ? 2 : 3, auto: true, kind: 'uretim', due: due });
      });
    });
    return out;
  }
  var colonyOps = {
    GRAFT_TIMELINE: GRAFT_TIMELINE,
    split: splitHive,
    merge: mergeHives,
    moveQueen: moveQueen,
    events: function () { return readOps().events.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); }); },
    batches: listBatches,
    batchDates: batchDates,
    addBatch: addBatch,
    updateBatch: updateBatch,
    removeBatch: removeBatch,
    assignBatchQueen: assignBatchQueen,
    freeQueens: freeQueens,
    batchTasks: batchTasks
  };

  /* ================= Malzeme stoku =================
   * superari.stok.v1 (canlı, boş başlar) / superari.stok.demo.v1 (demo: örnek kalemler demo=true).
   * Kalem: { id, name, category, qty, unit, threshold, feedType?, note?, demo?, log:[{ date, delta, reason }] }
   */
  var STOCK_LIVE = 'superari.stok.v1', STOCK_DEMO = 'superari.stok.demo.v1', STOCK_SEED = 'superari.stokSeed.demo.v1';
  var STOCK_CATS = [
    { key: 'surup', label: 'Şurup' }, { key: 'seker', label: 'Şeker' }, { key: 'kek', label: 'Kek' }, { key: 'polen', label: 'Polen / katkı' },
    { key: 'ilac', label: 'İlaç' }, { key: 'cerceve', label: 'Çerçeve' }, { key: 'temelPetek', label: 'Temel petek' }, { key: 'kovan', label: 'Kovan / kat' },
    { key: 'ekipman', label: 'Ekipman' }, { key: 'diger', label: 'Diğer' }
  ];
  var STOCK_UNITS = ['L', 'kg', 'adet', 'şerit', 'ml', 'g', 'paket'];
  var STOCK_CAT_LABEL = {}; STOCK_CATS.forEach(function (c) { STOCK_CAT_LABEL[c.key] = c.label; });
  function stockKey() { return workMode() === 'live' ? STOCK_LIVE : STOCK_DEMO; }
  function normalizeStock(it) {
    if (!it || !it.id) return null;
    var o = { id: String(it.id).slice(0, 40), name: txt(it.name, 80) || 'Kalem' };
    o.category = pick(it.category, STOCK_CATS.map(function (c) { return c.key; }), 'diger');
    o.unit = pick(it.unit, STOCK_UNITS, 'adet');
    var q = numIn(it.qty, -100000, 1000000); o.qty = q == null ? 0 : q;
    var th = numIn(it.threshold, 0, 1000000); o.threshold = th == null ? 0 : th;
    if (it.feedType && FEED_LABEL[it.feedType]) o.feedType = it.feedType;
    var note = txt(it.note, 200); if (note) o.note = note;
    if (it.demo === true) o.demo = true;
    o.log = (Array.isArray(it.log) ? it.log : []).filter(Boolean).slice(-40).map(function (l) {
      return { date: isoDate(l.date) || todayLocal(), delta: Number(l.delta) || 0, reason: txt(l.reason, 160) };
    });
    o.low = o.threshold > 0 && o.qty <= o.threshold;
    return o;
  }
  function readStock() { try { var a = JSON.parse(localStorage.getItem(stockKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function writeStock(a) { try { localStorage.setItem(stockKey(), JSON.stringify(a || [])); } catch (e) { /* ignore */ } }
  function seedDemoStock() {
    if (workMode() !== 'demo') return;
    try { if (localStorage.getItem(STOCK_SEED) === '1') return; localStorage.setItem(STOCK_SEED, '1'); } catch (e) { return; }
    var a = readStock();
    if (a.length) return;
    var t = todayLocal();
    [
      { id: 'sd1', name: 'Şurup 2:1', category: 'surup', qty: 40, unit: 'L', threshold: 20, feedType: 'surup21' },
      { id: 'sd2', name: 'Arı keki', category: 'kek', qty: 6, unit: 'kg', threshold: 10, feedType: 'kek' },
      { id: 'sd3', name: 'Toz şeker', category: 'seker', qty: 50, unit: 'kg', threshold: 25 },
      { id: 'sd4', name: 'Amitraz şerit (onaylı)', category: 'ilac', qty: 12, unit: 'şerit', threshold: 10 },
      { id: 'sd5', name: 'Oksalik asit çözeltisi', category: 'ilac', qty: 500, unit: 'ml', threshold: 200 },
      { id: 'sd6', name: 'Boş çerçeve', category: 'cerceve', qty: 60, unit: 'adet', threshold: 30 },
      { id: 'sd7', name: 'Temel petek', category: 'temelPetek', qty: 25, unit: 'adet', threshold: 40 },
      { id: 'sd8', name: 'Boş kovan (Langstroth)', category: 'kovan', qty: 3, unit: 'adet', threshold: 2 }
    ].forEach(function (x) { x.demo = true; x.log = [{ date: t, delta: x.qty, reason: 'Demo başlangıç stoğu' }]; a.push(normalizeStock(x)); });
    writeStock(a);
  }
  function listStock() {
    seedDemoStock();
    return readStock().map(normalizeStock).filter(Boolean).sort(function (a, b) { return (b.low - a.low) || a.name.localeCompare(b.name, 'tr'); });
  }
  function saveStockItem(it) {
    seedDemoStock();
    var a = readStock();
    var isNew = !it.id;
    var base = isNew ? { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), log: [] } : null;
    if (!isNew) a.forEach(function (x) { if (x && x.id === it.id) base = x; });
    if (!base) return null;
    var m = cloneObj(base);
    ['name', 'category', 'unit', 'threshold', 'feedType', 'note'].forEach(function (k) { if (Object.prototype.hasOwnProperty.call(it, k)) m[k] = it[k]; });
    if (!it.feedType) delete m.feedType;
    var newQty = numIn(it.qty, -100000, 1000000);
    if (newQty != null && newQty !== Number(base.qty || 0)) {
      m.log = (m.log || []).concat([{ date: todayLocal(), delta: Math.round((newQty - Number(base.qty || 0)) * 10) / 10, reason: isNew ? 'Başlangıç stoğu' : 'Sayım / düzeltme' }]);
      m.qty = newQty;
    }
    var n = normalizeStock(m);
    if (!n) return null;
    if (isNew) a.push(n); else a = a.map(function (x) { return x && x.id === n.id ? n : x; });
    writeStock(a);
    return n;
  }
  /** Stok hareketi: delta (+ giriş / − kullanım). */
  function adjustStock(id, delta, reason, date) {
    var a = readStock(), out = null;
    var d = numIn(delta, -1000000, 1000000);
    if (!d) return null;
    a = a.map(function (x) {
      if (!x || x.id !== id) return x;
      var m = cloneObj(x);
      m.qty = Math.round(((Number(m.qty) || 0) + d) * 10) / 10;
      m.log = (Array.isArray(m.log) ? m.log : []).concat([{ date: isoDate(date) || todayLocal(), delta: d, reason: txt(reason, 160) || (d > 0 ? 'Giriş' : 'Kullanım') }]);
      out = normalizeStock(m);
      return out;
    });
    if (out) writeStock(a);
    return out;
  }
  function removeStock(id) {
    var a = readStock(); var n = a.filter(function (x) { return x && x.id !== id; });
    writeStock(n); return n.length !== a.length;
  }
  function stockAlerts() {
    return listStock().filter(function (x) { return x.low; }).map(function (x) {
      return { id: 'stok-az-' + x.id, title: 'Stok azaldı — ' + x.name + ': ' + String(x.qty).replace('.', ',') + ' ' + x.unit + ' (eşik ' + String(x.threshold).replace('.', ',') + ')', type: 'stok', severity: x.qty <= 0 ? 'high' : 'medium', auto: true, demo: !!x.demo, href: 'stok.html' };
    });
  }
  var stockStore = {
    CATS: STOCK_CATS, CAT_LABEL: STOCK_CAT_LABEL, UNITS: STOCK_UNITS,
    list: listStock, save: saveStockItem, adjust: adjustStock, remove: removeStock, alerts: stockAlerts
  };

  /* ================= Görevler: tamamlama + elle eklenen görevler =================
   * Tamamlanan: superari.gorevTamam.v1 (canlı) / .demo.v1 → { "<taskId>": { date, note, sig, title, hiveId, apiaryId, auto } }
   * Elle görev: superari.gorevler.v1 (canlı) / .demo.v1 → [ { id, title, hiveId, apiaryId, due, priority, note } ]
   * Otomatik görevler (bekleme bitişi, varroa sayımı, ana arı yenile…) "sig" ile eşlenir:
   * aynı görev yeni bir tarihle yeniden doğarsa (ör. yeni ilaçlama) tekrar açılır.
   */
  var TASK_DONE_LIVE = 'superari.gorevTamam.v1', TASK_DONE_DEMO = 'superari.gorevTamam.demo.v1';
  var TASK_USER_LIVE = 'superari.gorevler.v1', TASK_USER_DEMO = 'superari.gorevler.demo.v1';
  function taskDoneKey() { return workMode() === 'live' ? TASK_DONE_LIVE : TASK_DONE_DEMO; }
  function taskUserKey() { return workMode() === 'live' ? TASK_USER_LIVE : TASK_USER_DEMO; }
  function readTaskDone() {
    try { var o = JSON.parse(localStorage.getItem(taskDoneKey()) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; }
  }
  function writeTaskDone(o) { try { localStorage.setItem(taskDoneKey(), JSON.stringify(o || {})); } catch (e) { /* ignore */ } }
  function readUserTasks() {
    try { var a = JSON.parse(localStorage.getItem(taskUserKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function writeUserTasks(a) { try { localStorage.setItem(taskUserKey(), JSON.stringify(a || [])); } catch (e) { /* ignore */ } }
  function taskSig(t) { return String((t && (t.due || t.sig)) || ''); }
  function queenRenewTasks() {
    var out = [];
    loadHives().forEach(function (h) {
      if (queenStatus(h) !== 'Yenile') return;
      var age = queenAge(h);
      out.push({ id: 'kr-ana-yenile-' + h.id, title: 'Ana arıyı yenile — ' + h.name + ' (' + age + ' yaş)', hiveId: h.id, apiaryId: h.apiaryId,
        priority: age >= 3 ? 2 : 3, auto: true, kind: 'ana', sig: 'q' + h.queenYear });
    });
    return out;
  }
  /** Oğul mevsiminde: Orta → izleme görevi, Yüksek/Çok yüksek → kontrol görevi (mevsim dışında görev yok). */
  function swarmTasks() {
    var out = [], ctx = { date: todayLocal() };
    loadHives().forEach(function (h) {
      var a = swarmAssess(h, ctx);
      if (!a || a.season.phase === 'disi') return;
      if (a.key === 'orta') {
        out.push({ id: 'kr-ogul-izle-' + h.id, title: 'Oğul izleme — ' + h.name + ': ana hücresi ve yer darlığı kontrolü (7–10 günde bir)', hiveId: h.id, apiaryId: h.apiaryId,
          priority: 2, auto: true, kind: 'ogul', due: addDays(ctx.date, 7), sig: 'o-orta-' + ctx.date.slice(0, 4) });
      } else if (a.key === 'yuksek' || a.key === 'cok-yuksek') {
        out.push({ id: 'kr-ogul-kontrol-' + h.id, title: 'Oğul kontrolü — ' + h.name + ': ana hücrelerini kontrol et, yer aç / bal katı ver veya böl', hiveId: h.id, apiaryId: h.apiaryId,
          priority: 1, auto: true, kind: 'ogul', due: ctx.date, sig: 'o-yuksek-' + ctx.date.slice(0, 4) });
      }
    });
    return out;
  }
  /** Tüm görevler (açık + tamamlanan bayraklı). */
  function allTasks() {
    var list = [];
    if (workMode() === 'demo') tasks.forEach(function (t) { var c = {}; Object.keys(t).forEach(function (k) { c[k] = t[k]; }); c.demo = true; list.push(c); });
    readUserTasks().forEach(function (t) {
      if (!t || !t.id) return;
      var c = {}; Object.keys(t).forEach(function (k) { c[k] = t[k]; }); c.manual = true; list.push(c);
    });
    var der = [];
    try { der = colonyRecords.derived().tasks; } catch (e) { der = []; }
    list = list.concat(der);
    try { list = list.concat(queenRenewTasks()); } catch (e) { /* ignore */ }
    try { list = list.concat(swarmTasks()); } catch (e) { /* ignore */ }
    try { list = list.concat(batchTasks()); } catch (e) { /* ignore */ }
    var done = readTaskDone();
    var seen = {};
    list.forEach(function (t) {
      seen[t.id] = true;
      var c = done[t.id];
      if (!c) return;
      if (t.auto && String(c.sig || '') !== taskSig(t)) return; /* yeni tekrar: açık */
      t.done = true; t.doneAt = c.date; if (c.note) t.doneNote = c.note;
    });
    /* Koşulu ortadan kalkmış otomatik görevlerin tamamlama kaydı da «Tamamlanan»da kalır. */
    Object.keys(done).forEach(function (id) {
      if (seen[id]) return;
      var c = done[id];
      if (!c || !c.title) return;
      list.push({ id: id, title: c.title, hiveId: c.hiveId, apiaryId: c.apiaryId, auto: !!c.auto, done: true, doneAt: c.date, doneNote: c.note, orphan: true, priority: 3 });
    });
    return list;
  }
  function openTasks() { return allTasks().filter(function (t) { return !t.done; }); }
  function doneTasks() {
    return allTasks().filter(function (t) { return t.done; })
      .sort(function (a, b) { return String(b.doneAt || '') < String(a.doneAt || '') ? -1 : (String(b.doneAt || '') > String(a.doneAt || '') ? 1 : 0); });
  }
  function completeTask(id, opts) {
    var o = opts || {};
    var t = allTasks().filter(function (x) { return x.id === id; })[0];
    if (!t) return null;
    var done = readTaskDone();
    var hv = t.hiveId != null ? hiveById(t.hiveId) : null;
    done[id] = { date: isoDate(o.date) || todayLocal(), sig: taskSig(t), title: t.title, hiveId: t.hiveId != null ? t.hiveId : null,
      apiaryId: t.apiaryId || (hv ? hv.apiaryId : null), auto: !!t.auto };
    var note = txt(o.note, 300); if (note) done[id].note = note;
    writeTaskDone(done);
    return done[id];
  }
  function undoTask(id) {
    var done = readTaskDone();
    if (!done[id]) return false;
    delete done[id];
    writeTaskDone(done);
    return true;
  }
  function addUserTask(t) {
    var title = txt(t && t.title, 160);
    if (!title) return null;
    var hv = t.hiveId != null && t.hiveId !== '' ? hiveById(t.hiveId) : null;
    var row = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: title,
      hiveId: hv ? hv.id : null, apiaryId: hv ? hv.apiaryId : (txt(t.apiaryId, 40) || null),
      due: isoDate(t.due) || '', priority: intIn(t.priority, 1, 3) || 2, createdAt: new Date().toISOString() };
    var note = txt(t.note, 300); if (note) row.note = note;
    var a = readUserTasks(); a.push(row); writeUserTasks(a);
    return row;
  }
  function removeUserTask(id) {
    var a = readUserTasks();
    var n = a.filter(function (x) { return x && x.id !== id; });
    writeUserTasks(n);
    undoTask(id);
    return n.length !== a.length;
  }
  var taskStore = {
    all: allTasks,
    open: openTasks,
    done: doneTasks,
    complete: completeTask,
    undo: undoTask,
    add: addUserTask,
    remove: removeUserTask,
    sig: taskSig
  };

  Object.defineProperty(global, 'SuperAriDemo', {
    configurable: true,
    enumerable: true,
    value: {
      STORAGE_KEY: STORAGE_KEY,
      HIVES_KEY: HIVES_KEY,
      SEED_APIARIES: SEED_APIARIES,
      get apiaries() { return loadApiaries(); },
      get hives() { return loadHives(); },
      /* Statik demo + koloni kayıtlarından türetilen otomatik uyarı/görevler. */
      get alerts() {
        var extra = [];
        try { extra = colonyRecords.derived().alerts; } catch (e) { extra = []; }
        try { extra = extra.concat(stockAlerts()); } catch (e) { /* ignore */ }
        /* Oğul uyarıları statik değil; hesaplanan oğul riskinden (Yüksek / Çok yüksek). */
        try { extra = extra.concat(swarmAlerts().map(function (x) { if (workMode() === 'demo') x.demo = true; return x; })); } catch (e) { /* ignore */ }
        var base = workMode() === 'demo' ? alerts.filter(function (x) { return x.type !== 'ogul'; }).map(function (x) { var c = {}; Object.keys(x).forEach(function (k) { c[k] = x[k]; }); c.demo = true; return c; }) : [];
        return base.concat(extra);
      },
      /* Açık görevler (tamamlananlar hariç). Statik örnek görevler yalnız demo modda, demo=true. */
      get tasks() {
        try { return openTasks(); } catch (e) { return workMode() === 'demo' ? tasks.slice() : []; }
      },
      taskStore: taskStore,
      colonyOps: colonyOps,
      stock: stockStore,
      records: colonyRecords,
      get counts() {
        var h = loadHives();
        return {
          alerts: this.alerts.length,
          tasks: this.tasks.length,
          hives: h.length,
          apiaries: loadApiaries().length
        };
      },
      hiveById: hiveById,
      apiaryById: apiaryById,
      hivesForApiary: hivesForApiary,
      BREEDS: BREEDS,
      colony: {
        BREED_OPTIONS: COLONY_BREED_OPTIONS,
        SWARM_TENDENCIES: SWARM_TENDENCIES,
        CALM_LABELS: CALM_LABELS,
        queenAge: queenAge,
        queenColor: queenColor,
        queenStatus: queenStatus,
        calmLabel: calmLabel,
        summary: colonySummary,
        summaryText: colonySummaryText,
        updateHive: updateHiveColony,
        bulkQueenReplace: bulkQueenReplace,
        setQueenClipped: setQueenClipped,
        loadQueens: loadQueens,
        queenById: function (id) { return queenById(id); },
        openPlacement: openPlacement,
        queensForHives: queensForHives,
        QUEENS_KEY: QUEENS_KEY,
        currentYear: currentYear,
        todayLocal: todayLocal,
        SWARM_LEVELS: SWARM_LEVELS,
        swarm: function (h, date) { return swarmAssess(h, date ? { date: date } : null); },
        swarmLevelOf: swarmLevelOf,
        swarmSeason: function (apId, date) { return swarmSeason(apId, date); },
        autoSeasonProfile: autoSeasonProfile
      },
      harvests: harvestStore,
      APIARY_BREED_PLAN: APIARY_BREED_PLAN,
      loadApiaries: loadApiaries,
      saveApiaries: saveApiaries,
      loadHives: loadHives,
      saveHives: saveHives,
      addApiary: addApiary,
      updateApiary: updateApiary,
      removeApiary: removeApiary,
      WATER_SOURCE_TYPE_KEYS: WATER_SOURCE_TYPE_KEYS,
      WATER_SOURCE_TYPE_LABELS_TR: WATER_SOURCE_TYPE_LABELS_TR,
      WATER_CATALOG_KEY: WATER_CATALOG_KEY,
      parseWaterSourceType: parseWaterSourceType,
      parseWaterSourceNote: parseWaterSourceNote,
      parseWaterSourceLabel: parseWaterSourceLabel,
      parseWaterDistanceM: parseWaterDistanceM,
      loadWaterCatalog: loadWaterCatalog,
      saveWaterCatalog: saveWaterCatalog,
      waterCatalogById: waterCatalogById,
      addWaterCatalogItem: addWaterCatalogItem,
      updateWaterCatalogItem: updateWaterCatalogItem,
      removeWaterCatalogItem: removeWaterCatalogItem,
      haversineMetres: haversineMetres,
      WATER_LOCAL_MAX_M: WATER_LOCAL_MAX_M,
      nearestWaterSourceWithCoords: nearestWaterSourceWithCoords,
      resyncWaterForNewCoords: resyncWaterForNewCoords,
      clearApiaryWaterLink: clearApiaryWaterLink,
      computedWaterDistanceM: computedWaterDistanceM,
      effectiveWaterDistanceM: effectiveWaterDistanceM,
      formatPlaceSubtitle: formatPlaceSubtitle,
      refreshWaterDistancesFromMap: refreshWaterDistancesFromMap,
      yandexMapsUrl: yandexMapsUrl,
      yandexSearchUrl: yandexSearchUrl,
      geocodeSearch: geocodeSearch,
      reverseGeocodeAdmin: reverseGeocodeAdmin,
      adminPatchFromGeocode: adminPatchFromGeocode,
      isSeedApiaryId: isSeedApiaryId,
      isLiveCacheFresh: isLiveCacheFresh,
      makeLiveCache: makeLiveCache,
      clearLiveCaches: clearLiveCaches,
      LIVE_CACHE_MAX_AGE_MS: LIVE_CACHE_MAX_AGE_MS,
      parseCoordsFromText: parseCoordsFromText
    }
  });
})(window);
