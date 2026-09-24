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
    { id: 101, name: 'Kovan 101', apiaryId: 'a1', weightKg: 38.2, deltaKg: 1.2, health: 'İyi', healthScore: 88, colonyScore: 82, swarmRisk: 'Düşük', strength: 'güçlü', breed: 'Muğla Arısı' },
    { id: 102, name: 'Kovan 102', apiaryId: 'a1', weightKg: 35.6, deltaKg: 0.4, health: 'İyi', healthScore: 84, colonyScore: 79, swarmRisk: 'Düşük', strength: 'orta', breed: 'Muğla Arısı' },
    { id: 118, name: 'Kovan 118', apiaryId: 'a1', weightKg: 41.0, deltaKg: 1.8, health: 'Dikkat', healthScore: 62, colonyScore: 71, swarmRisk: 'Orta', strength: 'orta', breed: 'Muğla Arısı' },
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
      var nextIl = trimAdmin(a.il) || trimAdmin(seed.il);
      var nextIlce = trimAdmin(a.ilce) || trimAdmin(seed.ilce);
      var nextKoy = trimAdmin(a.koy) || trimAdmin(seed.koy);
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
   * Nearest catalog water source that has finite lat/lon (haversine).
   * @returns {{ item: object, metres: number }|null}
   */
  function nearestWaterSourceWithCoords(lat, lon) {
    var a = Number(lat);
    var b = Number(lon);
    if (!isFinite(a) || !isFinite(b)) return null;
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
      if (m < bestM) {
        bestM = m;
        best = item;
      }
    }
    if (!best) return null;
    return { item: best, metres: bestM };
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
    return dest;
  }

  var BREEDS = ['Anadolu', 'Kafkas', 'Karniyol', 'İtalyan', 'Kafkas × Karniyol', 'Karadeniz melez', 'Kafkas × Karadeniz', 'Muğla Arısı'];
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
    return out;
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
      breed: String(apiaryId) === 'a4' ? 'Karniyol' : (String(apiaryId) === 'a1' ? 'Muğla Arısı' : (String(apiaryId) === 'a2' ? 'Kafkas × Karadeniz' : BREEDS[i % BREEDS.length]))
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

  /** Yanıkdağ (a4): tüm kovanlar Karniyol (Carniyol / A. m. carnica). */
  function applyYanikKarniyolBreeds(hives) {
    var changed = false;
    var out = (hives || []).map(function (h) {
      if (!h || String(h.apiaryId) !== 'a4') return h;
      var cur = String(h.breed || '').trim();
      if (cur === 'Karniyol') return h;
      changed = true;
      var copy = {};
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) copy[k] = h[k];
      }
      copy.breed = 'Karniyol';
      return copy;
    });
    return { list: out, changed: changed };
  }

  /** Kayaköy (a1): tüm kovanlar Muğla Arısı. */
  function applyKayakoyMuglaBreeds(hives) {
    var changed = false;
    var out = (hives || []).map(function (h) {
      if (!h || String(h.apiaryId) !== 'a1') return h;
      var cur = String(h.breed || '').trim();
      if (cur === 'Muğla Arısı') return h;
      changed = true;
      var copy = {};
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) copy[k] = h[k];
      }
      copy.breed = 'Muğla Arısı';
      return copy;
    });
    return { list: out, changed: changed };
  }


  /** Tortum (a2): tüm kovanlar Kafkas × Karadeniz. */
  function applyTortumKafkasKaradenizBreeds(hives) {
    var changed = false;
    var out = (hives || []).map(function (h) {
      if (!h || String(h.apiaryId) !== 'a2') return h;
      var cur = String(h.breed || '').trim();
      if (cur === 'Kafkas × Karadeniz') return h;
      changed = true;
      var copy = {};
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) copy[k] = h[k];
      }
      copy.breed = 'Kafkas × Karadeniz';
      return copy;
    });
    return { list: out, changed: changed };
  }

  function loadHives() {
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
    var breedMig = applyYanikKarniyolBreeds(reconciled.hives);
    var kayakoyMig = applyKayakoyMuglaBreeds(breedMig.list);
    var tortumMig = applyTortumKafkasKaradenizBreeds(kayakoyMig.list);
    if (breedMig.changed || kayakoyMig.changed || tortumMig.changed) {
      try {
        saveHives(tortumMig.list);
      } catch (eBreed) { /* ignore */ }
      return tortumMig.list;
    }
    return reconciled.hives;
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
        if (patch.lat != null && patch.lat !== '') {
          var la = Number(patch.lat);
          if (isFinite(la)) a.lat = la;
        }
        if (patch.lon != null && patch.lon !== '') {
          var lo = Number(patch.lon);
          if (isFinite(lo)) a.lon = lo;
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
        /* Konum veya su kaynağı değişince mesafeyi haritadan güncelle (uydurma yok). */
        var refreshedOne = refreshWaterDistancesFromMap([a]);
        if (refreshedOne.list[0]) a = refreshedOne.list[0];
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
      nearestWaterSourceWithCoords: nearestWaterSourceWithCoords,
      computedWaterDistanceM: computedWaterDistanceM,
      effectiveWaterDistanceM: effectiveWaterDistanceM,
      refreshWaterDistancesFromMap: refreshWaterDistancesFromMap,
      yandexMapsUrl: yandexMapsUrl,
      yandexSearchUrl: yandexSearchUrl,
      geocodeSearch: geocodeSearch,
      parseCoordsFromText: parseCoordsFromText
    }
  });
})(window);
