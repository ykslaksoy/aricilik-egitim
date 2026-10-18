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
  /* Demo ve Canlı ayrı depolar: demo arılık/kovan/ana arı «.demo» anahtarlarında; Canlı anahtarları eskisi gibi (mevcut veriler korunur). */
  function mk(k) {
    var demo = false;
    try { demo = localStorage.getItem('superari.workMode') !== 'live'; } catch (e) { demo = true; }
    return demo ? String(k).replace(/\.v(\d+)$/, '.demo.v$1') : k;
  }
  function isLiveMode() { return mk('x.v1') === 'x.v1'; }

  /*
   * koloni-280: tek seferlik kovan numarası göçü — Cimil kovanları en küçük numaralar (1..n), Yanıkdağ ardından (n+1..).
   * Bulut (Supabase) satırları sunucuda aynı eşlemeyle taşındı; burada cihazdaki tüm depolar (kovan no ile anahtarlı
   * görev / uyarı / tartı / sensör / not / fotoğraf / ses kayıtları, bulut eşitleme anahtarları) aynı eşlemeye çevrilir.
   */
  var RENUM_KEY = 'superari.kovanNoGoc.k280';
  var RENUM_REF = ['hiveId', 'fromHiveId', 'toHiveId', 'otherHiveId', 'mergedInto', 'splitFrom', 'sourceHiveId', 'targetHiveId'];
  function renumBuildMap(aps, hives) {
    if (!Array.isArray(aps) || !Array.isArray(hives)) return null;
    function apOf(re) { for (var i = 0; i < aps.length; i++) if (aps[i] && re.test(String(aps[i].name || '') + ' ' + String(aps[i].place || ''))) return String(aps[i].id); return null; }
    var order = [apOf(/cimil/i), apOf(/yan[ıi]kda/i)].filter(Boolean);
    if (!order.length) return null;
    var map = {}, next = 1, moving = {}, n = 0;
    order.forEach(function (ap) {
      hives.filter(function (h) { return h && String(h.apiaryId) === ap && isFinite(Number(h.id)); })
        .map(function (h) { return Number(h.id); }).sort(function (a, b) { return a - b; })
        .forEach(function (id) { moving[id] = 1; if (id !== next) { map[id] = next; n++; } next++; });
    });
    if (!n) return null;
    for (var i = 0; i < hives.length; i++) {
      var id = hives[i] && Number(hives[i].id);
      if (!moving[id] && id >= 1 && id < next) return null; /* çakışma: dokunma */
    }
    return map;
  }
  function renumValue(v, map) {
    if (typeof v === 'number') return map[v] != null ? map[v] : v;
    if (typeof v === 'string' && /^\d+$/.test(v) && map[Number(v)] != null) return String(map[Number(v)]);
    return v;
  }
  function renumDeep(o, map, inHives) {
    if (Array.isArray(o)) return o.map(function (x) { return renumDeep(x, map, inHives); });
    if (typeof o === 'string') {
      var m = /^hk:([0-9a-f-]{36}):(\d+)$/.exec(o);
      if (m && map[Number(m[2])] != null) return 'hk:' + m[1] + ':' + map[Number(m[2])];
      return o;
    }
    if (!o || typeof o !== 'object') return o;
    var r = {};
    Object.keys(o).forEach(function (k) {
      var v = o[k], nk = (/^\d+$/.test(k) && map[Number(k)] != null) ? String(map[Number(k)]) : k;
      if (RENUM_REF.indexOf(k) >= 0 || (inHives && k === 'id')) r[nk] = renumValue(v, map);
      else if (k === 'hiveIds' && Array.isArray(v)) r[nk] = v.map(function (x) { return renumValue(x, map); });
      else if (inHives && k === 'name' && typeof v === 'string') { var nm = /^Kovan (\d+)$/.exec(v); r[nk] = nm && map[Number(nm[1])] != null ? 'Kovan ' + map[Number(nm[1])] : v; }
      else r[nk] = renumDeep(v, map, false);
    });
    return r;
  }
  function renumberHivesK279(ls) {
    ls = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!ls) return null;
    try { if (ls.getItem(RENUM_KEY) === '1') return null; } catch (e0) { return null; }
    var done = {};
    ['', '.demo'].forEach(function (sfx) {
      var aps, hives;
      try { aps = JSON.parse(ls.getItem('superari.ariliklar' + sfx + '.v1') || 'null'); hives = JSON.parse(ls.getItem('superari.kovanlar' + sfx + '.v1') || 'null'); } catch (e1) { return; }
      var map = renumBuildMap(aps, hives);
      if (!map) return;
      done[sfx || 'live'] = map;
      var keys = [];
      for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf('superari.') === 0 && k !== RENUM_KEY) keys.push(k); }
      keys.forEach(function (k) {
        var isDemo = k.indexOf('.demo') >= 0;
        if (sfx ? !isDemo : isDemo) return;
        var raw = ls.getItem(k), j;
        if (!raw || (raw[0] !== '{' && raw[0] !== '[')) return;
        try { j = JSON.parse(raw); } catch (e2) { return; }
        if (k === 'superari.bulut.state.v1') {
          /* yalnız yerel kovan no → bulut anahtarı eşlemesi; snap/queue eski anahtarlarıyla kalır (silme işareti eski satıra gider) */
          if (!j || !j.keys) return;
          var nkeys = {};
          Object.keys(j.keys).forEach(function (kk) {
            var hm = /^hives:(\d+)$/.exec(kk);
            if (hm && map[Number(hm[1])] != null) { var nn = map[Number(hm[1])]; nkeys['hives:' + nn] = String(j.keys[kk]).replace(/:\d+$/, ':' + nn); }
            else if (!nkeys[kk]) nkeys[kk] = j.keys[kk];
          });
          j.keys = nkeys;
          try { ls.setItem(k, JSON.stringify(j)); } catch (eS) { /* */ }
          return;
        }
        var out = JSON.stringify(renumDeep(j, map, k === 'superari.kovanlar' + sfx + '.v1'));
        if (out !== raw) { try { ls.setItem(k, out); } catch (e3) { /* yer yok */ } }
      });
    });
    try { ls.setItem(RENUM_KEY, '1'); } catch (e4) { /* */ }
    return done;
  }
  try { renumberHivesK279(); } catch (eRen) { /* göç başarısızsa veri bozulmaz */ }
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

  /** Göç (Arılığı Taşı): konum geçmişi + kullanıcı taşıdı/yeniden adlandırdı işaretleri korunur (bulut data alanına da gider). */
  function copyMoveFields(dest, src) {
    if (!dest || !src) return dest;
    if (Array.isArray(src.locHistory) && src.locHistory.length) dest.locHistory = src.locHistory.slice(-30);
    if (src.userMovedAt) dest.userMovedAt = String(src.userMovedAt);
    if (src.userRenamedAt) dest.userRenamedAt = String(src.userRenamedAt);
    return dest;
  }

  /** Seed arılıklarında eksik il/ilçe/köy doldur. */
  function migratePlaceAdmin(list) {
    var changed = false;
    var bySeed = {};
    SEED_APIARIES.forEach(function (s) { bySeed[s.id] = s; });
    var out = (list || []).map(function (a) {
      if (!a || a.userMovedAt) return a;
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

  /** k184: sunucunun hesapladığı su mesafesi (arilik_cevre, OSM en yakın kenar) ya da null. */
  function serverWaterM(apiary) {
    try { var C = global.SuperAriCevre; return C && C.suM ? C.suM(apiary) : null; } catch (e) { return null; }
  }
  /** k184: kullanıcı onaylamadıysa yerel/eski su mesafesi (ör. Yanıkdağ 240 m) sunucu değeriyle ezilir; onaylı elle değer korunur. */
  function applyServerWater(list) {
    var changed = false;
    var out = (list || []).map(function (a) {
      if (!a || (a.waterSourceConfirmedAt != null && String(a.waterSourceConfirmedAt).trim())) return a;
      var m = serverWaterM(a);
      if (m == null || parseWaterDistanceM(a.waterDistanceM) === m && !a.waterSourceId) return a;
      changed = true;
      var c = Object.assign({}, a);
      c.waterDistanceM = m;
      delete c.waterSourceId; /* otomatik konan eski su iğnesi (arılık koordinatında) mesafeyi bozmasın */
      return c;
    });
    return { list: out, changed: changed };
  }

  function effectiveWaterDistanceM(apiary, catalogItem) {
    var confirmed = apiary && apiary.waterSourceConfirmedAt != null && String(apiary.waterSourceConfirmedAt).trim();
    var srv = confirmed ? null : serverWaterM(apiary);
    if (srv != null) return { metres: srv, source: 'sunucu' };
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
    copyMoveFields(dest, src);
    return dest;
  }

  var BREEDS = ['Anadolu', 'Kafkas', 'Karniyol', 'Karadeniz', 'Muğla', 'İtalyan', 'Kafkas × Karniyol', 'Karadeniz melez', 'Kafkas × Karadeniz', 'Muğla Arısı', 'Efe arısı'];

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
  /* k127: seçici grupları — Saf / İkili melez / Üçlü melez ((ana hattı) × erkek arı). */
  var COLONY_BREED_GROUPS = [
    { key: 'saf', label: 'Saf', items: ['Kafkas', 'Karadeniz', 'Karniyol', 'Muğla', 'Efe arısı', 'Anadolu', 'İtalyan', 'Buckfast'] },
    { key: 'iki', label: 'İkili melez', items: ['Kafkas × Karadeniz', 'Kafkas × Karniyol', 'Karniyol × Kafkas', 'Kafkas × Anadolu', 'Karniyol × Muğla', 'Anadolu × Karniyol', 'Anadolu × Muğla', 'İtalyan × Karniyol', 'Buckfast × İtalyan', 'Kafkas × Muğla', 'Muğla ana × Kafkas baba', 'Kafkas ana × Muğla baba', 'Efe ana × Kafkas baba', 'Karadeniz × Muğla', 'Karadeniz × Anadolu'] }, /* k160: son üçü yeni — kilitli genetik tabloda puanı yok · k289: Muğla × Kafkas iki yönü ayrı (eski yönsüz «Kafkas × Muğla» kalır; Genetik puanı kilitli kafkas+mugla = 35) · k290: «Efe ana × Kafkas baba» (Genetik: kilitli anadolu+kafkas = 55 yeniden kullanılır, uzman tahmini) */
    { key: 'uc', label: 'Üçlü melez', items: ['(Kafkas × Karniyol) × Muğla', '(Kafkas × Karadeniz) × Muğla', '(Kafkas × Anadolu) × Muğla', '(Kafkas × Anadolu) × Karniyol', '(Karniyol × İtalyan) × Anadolu', '(Buckfast × İtalyan) × Muğla'] }
  ];
  var COLONY_BREED_OPTIONS = COLONY_BREED_GROUPS.reduce(function (a, g) { return a.concat(g.items); }, []).concat(['Diğer']);
  /** <optgroup>'lu seçenekler. sel(b) → seçili mi; withOther: «Diğer» eklensin mi. */
  function breedOptionsHtml(sel, withOther) {
    function e(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    return COLONY_BREED_GROUPS.map(function (g) {
      return '<optgroup label="' + e(g.label) + '">' + g.items.map(function (b) { return '<option value="' + e(b) + '"' + (sel && sel(b) ? ' selected' : '') + '>' + e(b) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + (withOther ? '<option value="Diğer"' + (sel && sel('Diğer') ? ' selected' : '') + '>Diğer</option>' : '');
  }
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
  function normBoxes(b) {
    if (!b || typeof b !== 'object') return null;
    var body = Math.round(Number(b.body)), kat = Math.round(Number(b.kat));
    if (!isFinite(body) || body < 1 || body > 3) body = 1;
    if (!isFinite(kat) || kat < 0 || kat > 4) kat = 0;
    var o = { body: body, kat: kat, ballik: b.ballik === true };
    if (o.ballik && !o.kat) o.kat = 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) o.date = String(b.date);
    return o;
  }
  function copyColonyFields(out, h) {
    if (!h) return out;
    var qy = parseQueenYear(h.queenYear);
    if (qy != null) out.queenYear = qy;
    if (h.queenSource != null && String(h.queenSource).trim()) out.queenSource = String(h.queenSource).trim().slice(0, 120);
    if (h.queenMarked === true || h.queenMarked === false) out.queenMarked = h.queenMarked;
    if (h.breedLine != null && String(h.breedLine).trim()) out.breedLine = String(h.breedLine).trim().slice(0, 80);
    if (h.queenMotherId != null && String(h.queenMotherId).trim()) out.queenMotherId = String(h.queenMotherId).trim().slice(0, 32);
    if (h.queenMotherRef != null && String(h.queenMotherRef).trim()) out.queenMotherRef = String(h.queenMotherRef).trim().slice(0, 120);
    if (out.breed && h.breedEstimated === true) out.breedEstimated = true;
    if (!out.breed && h.breedUnknown === true) out.breedUnknown = true;
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
    if (h.colonyState === 'sonuk') { out.colonyState = 'sonuk'; if (/^\d{4}-\d{2}-\d{2}$/.test(String(h.sonukAt || ''))) out.sonukAt = String(h.sonukAt); }
    if (h.mergedInto != null && isFinite(Number(h.mergedInto))) out.mergedInto = Number(h.mergedInto);
    if (h.splitFrom != null && isFinite(Number(h.splitFrom))) out.splitFrom = Number(h.splitFrom);
    if (h.createdBy === 'bolme' || h.createdBy === 'ogul') out.createdBy = h.createdBy;
    if (h.swarmFrom != null && isFinite(Number(h.swarmFrom))) out.swarmFrom = Number(h.swarmFrom);
    if (h.lastSwarmDate && /^\d{4}-\d{2}-\d{2}$/.test(String(h.lastSwarmDate))) out.lastSwarmDate = String(h.lastSwarmDate);
    /* Kovan kutusu: gövde (kuluçkalık) sayısı, kat sayısı, ballık takılı mı. */
    var bx = normBoxes(h.boxes);
    if (bx) out.boxes = bx;
    if (h.queenGivenAt && /^\d{4}-\d{2}-\d{2}$/.test(String(h.queenGivenAt))) out.queenGivenAt = String(h.queenGivenAt);
    /* Soy: bu kovanda yetişecek (veya yetişmiş) ananın annesi (bölmede kaynak kovanın anası). */
    if (h.pendingMother && typeof h.pendingMother === 'object' && (h.pendingMother.breed || h.pendingMother.queenId)) {
      var pm = h.pendingMother;
      out.pendingMother = { date: /^\d{4}-\d{2}-\d{2}$/.test(String(pm.date || '')) ? String(pm.date) : todayLocal(), origin: String(pm.origin || 'bolme').slice(0, 20) };
      if (pm.queenId) out.pendingMother.queenId = String(pm.queenId).slice(0, 32);
      if (pm.breed) out.pendingMother.breed = String(pm.breed).slice(0, 60);
      if (pm.fromHiveId != null && isFinite(Number(pm.fromHiveId))) out.pendingMother.fromHiveId = Number(pm.fromHiveId);
    }
    if (h.hiveType) {
      var ht = String(h.hiveType).trim();
      if ((global.SuperAriBalAgirlik && global.SuperAriBalAgirlik.isKnownHiveType(ht)) ||
          /^(langstroth_10|langstroth_8|dadant_11|layens_12|national|warre|kafkas|ozel|custom_[a-z0-9_]{1,28})$/.test(ht)) {
        out.hiveType = ht;
      }
    }
    if (h.customTypeLabel != null && String(h.customTypeLabel).trim()) out.customTypeLabel = String(h.customTypeLabel).trim().slice(0, 60);
    var ehk = numIn(h.emptyHiveKg, 0, 200);
    if (ehk != null && ehk > 0) out.emptyHiveKg = ehk;
    if (h.emptyHiveSource && /^(manuel|tarti|varsayilan)$/.test(String(h.emptyHiveSource))) out.emptyHiveSource = String(h.emptyHiveSource);
    if (h.lastTareAt && /^\d{4}-\d{2}-\d{2}$/.test(String(h.lastTareAt))) out.lastTareAt = String(h.lastTareAt);
    if (Array.isArray(h.colonyEvents) && h.colonyEvents.length) {
      out.colonyEvents = h.colonyEvents.filter(function (e) { return e && e.date && e.text; }).slice(-30).map(function (e) {
        var o = { id: String(e.id || '').slice(0, 40), date: String(e.date).slice(0, 10), type: String(e.type || '').slice(0, 20), text: String(e.text).slice(0, 300) };
        if (e.otherHiveId != null) o.otherHiveId = Number(e.otherHiveId);
        if (e.sug && /^(kabul|az|cok|alternatif|degisti)$/.test(e.sug)) { o.sug = e.sug; if (e.sugText) o.sugText = String(e.sugText).slice(0, 120); }
        if (e.demo === true) o.demo = true;
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
  /* ---------- Ana arı değişim yaşı (ırka göre) ----------
   * ideal: değişim yaşı (yıl). risk: 3. yaşındaki ana için risk düzeyi (kullanıcı tablosu, doğrulanmış).
   * Vade: ana yılı + ideal yılın 1 Nisan'ı (ilkbahar = en iyi değişim dönemi). */
  /* k262: değişim yaşı tüm ırklarda 2 yıl (AAE 2022 «Ana Arı» kitapçığı, Güler 2017 — genel öneri; Anadolu için Akyol ve ark. 2008, A. m. anatoliaca).
   * 3. yaş riski: Anadolu Akyol 2008 (3 yaşta yaşama %40); diğerleri uzman tahmini. Yönetici panelinden ırk başına değiştirilir (ogul_skor_ayar.sensor anaDeg* / anaRisk3*). */
  var QUEEN_PROFILES = [
    { key: 'buckfast', test: function (b) { return /buckfast|belfast/.test(b); }, label: 'Buckfast', ideal: 2, risk: 'cok-yuksek', note: 'Hibrit; melez gücü nesilde kaybolur' },
    { key: 'karniyol-mugla', test: function (b) { return /karniyol/.test(b) && /mugla/.test(b); }, label: 'Karniyol × Muğla melezi', ideal: 2, risk: 'yuksek', note: 'Melez; Karniyol tarafı oğul eğilimli' },
    { key: 'kafkas-karniyol', test: function (b) { return /kafkas/.test(b) && /karniyol/.test(b); }, label: 'Kafkas × Karniyol melezi', ideal: 2, risk: 'yuksek', note: 'Melez; Karniyol tarafı oğul eğilimli' },
    { key: 'karniyol', test: function (b) { return /karniyol/.test(b); }, label: 'Karniyol', ideal: 2, risk: 'yuksek', note: 'Oğul eğilimi yüksek' },
    { key: 'italyan', test: function (b) { return /italyan/.test(b); }, label: 'İtalyan', ideal: 2, risk: 'yuksek', note: 'Kışın çok tüketir, yağmacı' },
    { key: 'kafkas-karadeniz', test: function (b) { return /kafkas/.test(b) && /karadeniz/.test(b); }, label: 'Kafkas × Karadeniz melezi', ideal: 2, risk: 'orta', note: 'Oğul eğilimi düşük melez' },
    { key: 'karadeniz', test: function (b) { return /karadeniz/.test(b); }, label: 'Karadeniz (sarı Kafkas)', ideal: 2, risk: 'orta', note: 'Kafkas ekotipi' },
    { key: 'anadolu', test: function (b) { return /anadolu/.test(b); }, label: 'Anadolu arısı', ideal: 2, risk: 'yuksek', note: 'Yerli, az tüketir' },
    { key: 'kafkas', test: function (b) { return /kafkas/.test(b); }, label: 'Kafkas arısı', ideal: 2, risk: 'dusuk', note: 'Yerli, oğul eğilimi düşük' }
  ];
  var QUEEN_RISK_KODU = ['', 'dusuk', 'orta', 'yuksek', 'cok-yuksek'];
  function queenProfAyarAd(key) { return String(key).split('-').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join(''); }
  /** Yönetici ayarı (varsa) → değişim yaşı 1–6, 3. yaş riski 1–4 (1 düşük/yeşil · 2 orta/sarı · 3 yüksek/kırmızı · 4 çok yüksek/kırmızı). */
  function queenProfAyar(key, ideal, risk) {
    var T = null; try { T = (OGUL_SKOR && OGUL_SKOR.sensor) || null; } catch (e) { T = null; }
    var ad = queenProfAyarAd(key), i = T ? Number(T['anaDeg' + ad]) : NaN, r = T ? Number(T['anaRisk3' + ad]) : NaN;
    return { ideal: isFinite(i) && i >= 1 && i <= 6 ? Math.round(i) : ideal, risk: isFinite(r) && QUEEN_RISK_KODU[Math.round(r)] ? QUEEN_RISK_KODU[Math.round(r)] : risk };
  }

  var QUEEN_RISK = {
    'cok-yuksek': { label: 'Çok yüksek', tone: 'red' },
    yuksek: { label: 'Yüksek', tone: 'red' },
    orta: { label: 'Orta', tone: 'yellow' },
    dusuk: { label: 'Düşük', tone: 'green' }
  };
  var QUEEN_SEASON_NOTE = 'En iyi değişim dönemi: ilkbahar – yaz başı (bol nektar/polen, çiftleşme kolay). Olmazsa yaz sonu–sonbahar başı; genç ana ile kışlatma ilkbahar oğulunu azaltır.';
  function foldBreed(s) {
    return String(s || '').toLocaleLowerCase('tr').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/i̇/g, 'i');
  }
  function queenProfile(breed) {
    var b = foldBreed(breed);
    for (var i = 0; b && i < QUEEN_PROFILES.length; i++) {
      var p = QUEEN_PROFILES[i];
      if (p.test(b)) { var A = queenProfAyar(p.key, p.ideal, p.risk); return { key: p.key, label: p.label, ideal: A.ideal, risk: A.risk, riskLabel: QUEEN_RISK[A.risk].label, note: p.note, known: true }; }
    }
    var A0 = queenProfAyar('varsayilan', 2, 'orta');
    return { key: 'varsayilan', label: breed ? String(breed) : 'Irk bilinmiyor', ideal: A0.ideal, risk: A0.risk, riskLabel: QUEEN_RISK[A0.risk].label, note: 'Tabloda yok: varsayılan değişim yaşı', known: false };
  }
  var QUEEN_TONE_COLOR = { green: '#2b8a3e', yellow: '#e67700', red: '#c92a2a', gray: '#6b7280' };
  /**
   * Ana arı değişim planı. key: iyi | yaklasiyor | zamani | gecti | bilinmiyor
   * tone: green | yellow | red | gray. 3. yaşta renk ırk riskine göre (Yüksek kırmızı, Orta sarı, Düşük yeşil/bilgi);
   * 4+ yaş her ırkta kırmızı. Yaklaşıyor = vadeye ≤ 60 gün.
   */
  function queenPlan(h, date) {
    var d = isoDate(date) || todayLocal();
    var prof = queenProfile(h && h.breed);
    var y = parseQueenYear(h && h.queenYear);
    var out = { profile: prof, ideal: prof.ideal, seasonNote: QUEEN_SEASON_NOTE, year: y, known: y != null };
    if (y == null) {
      out.key = 'bilinmiyor'; out.label = 'Yaş bilinmiyor'; out.tone = 'gray'; out.color = QUEEN_TONE_COLOR.gray; out.severity = 'low';
      out.text = 'Ana arı yılı girilmemiş — yaşı bilinmeden değişim zamanı hesaplanamaz. Ana yılını elle girin.';
      out.say = 'Ana arı yaşı bilinmiyor. Ana yılını girin.';
      return out;
    }
    var cy = Number(d.slice(0, 4));
    out.age = Math.max(0, cy - y);
    var due = (y + prof.ideal) + '-04-01';
    out.dueDate = due; out.dueYear = y + prof.ideal;
    var ms = Date.parse(due + 'T00:00:00Z') - Date.parse(d + 'T00:00:00Z');
    out.daysToDue = Math.round(ms / 86400000);
    /* etkin yaş: ana yılından bu yana geçen ilkbahar (1 Nisan) sayısı */
    var eff = cy - y - (d.slice(5) < '04-01' ? 1 : 0);
    out.effAge = Math.max(0, eff);
    var tone;
    if (out.daysToDue > 60) { out.key = 'iyi'; tone = 'green'; }
    else if (out.daysToDue > 0) { out.key = 'yaklasiyor'; tone = 'yellow'; }
    else {
      out.key = out.effAge >= prof.ideal + 1 ? 'gecti' : 'zamani';
      tone = out.effAge >= 4 ? 'red' : (out.effAge === 3 ? QUEEN_RISK[prof.risk].tone : 'yellow');
    }
    out.tone = tone; out.color = QUEEN_TONE_COLOR[tone];
    /* k262: yaş tek başına en çok «orta»; yüksek yalnız gözlenen belirtiyle (queenSigns, queenAlerts) */
    out.severity = out.key === 'iyi' ? null : (out.key === 'yaklasiyor' ? 'low' : (tone === 'red' || tone === 'yellow' ? 'medium' : 'low'));
    var season = 'İlkbahar ' + out.dueYear;
    if (out.key === 'iyi') {
      out.label = 'Genç ana'; out.text = out.age + ' yaş · ' + prof.label + ' için değişim yaşı ' + prof.ideal + ' · sonraki değişim: ' + season;
      out.say = 'Ana arı ' + out.age + ' yaşında, değişim ' + out.dueYear + ' ilkbaharında.';
    } else if (out.key === 'yaklasiyor') {
      out.label = 'Değişim yaklaşıyor'; out.text = out.age + ' yaş · ' + prof.label + ' için değişim yaşı ' + prof.ideal + ' · ' + season + ' değiştirin (≈ ' + out.daysToDue + ' gün). Yeni anayı şimdiden ayarlayın.';
      out.say = 'Ana arı değişimi yaklaşıyor. ' + out.dueYear + ' ilkbaharında değiştirin.';
    } else {
      var over = out.effAge - prof.ideal;
      out.label = out.key === 'gecti' ? 'Değişim gecikti' : 'Değişim zamanı';
      if (out.key === 'gecti' && out.effAge === 3) {
        /* k262: 3. yaş — kullanıcı onaylı metin; yaş tek başına acil değildir (belirti yoksa en çok orta) */
        out.label = 'Değişim zamanı geçti';
        out.text = 'Ana 3 yaşında: değişim zamanı geçti — ilkbahar–yaz başında değiştirmeyi planlayın.';
        out.say = out.text;
        return out;
      }
      out.text = out.age + ' yaş · ' + prof.label + ' için değişim yaşı ' + prof.ideal +
        (out.key === 'gecti' ? ' · ' + over + ' yıl gecikti' : '') +
        (out.effAge === 3 ? ' · 3. yaş riski: ' + prof.riskLabel : '') + ' · anayı değiştirin (en iyisi ilkbahar – yaz başı).';
      out.say = 'Ana arı ' + out.age + ' yaşında. ' + (out.key === 'gecti' ? 'Değişim gecikti.' : 'Değişim zamanı geldi.') + ' Önerim: ana değişimini planlayın.';
    }
    return out;
  }
  /** k262: son yavru muayenesinde gözlenen ana sorunu belirtileri (erkek yumurtası / kambur yavru, dağınık yavru, sessiz değiştirme memesi, anasızlık). */
  function queenSigns(h) {
    var st = null; try { seedAll(); st = colonyStatus(h.id); } catch (e) { st = null; }
    var o = []; if (!st) return o;
    if (st.sign === 'erkekYavru') o.push('erkek yumurtası / kambur yavru');
    if (st.brood && st.brood.pattern === 'daginik') o.push('dağınık yavru');
    if (st.supersedureCell) o.push('sessiz değiştirme memesi');
    if (st.queenless) o.push('anasızlık');
    return o;
  }
  /** Uyarılar: kırmızı ya da belirtili → kovan başına; sarı/yeşil "zamanı", yaklaşıyor ve bilinmeyen → arılık başına özet.
   *  k262: yalnız yaş → en çok orta; yüksek yalnız gözlenen belirtiyle. */
  function queenAlerts(date) {
    var out = [], groups = {};
    var aps = {};
    try { loadApiaries().forEach(function (a) { aps[a.id] = a; }); } catch (e) { /* ignore */ }
    loadHives().forEach(function (h) {
      if (!h || h.colonyState === 'birlestirildi' || h.colonyState === 'sonuk' || h.queenless) return;
      var p = queenPlan(h, date);
      if (p.key === 'iyi') return;
      var sg = (p.key === 'zamani' || p.key === 'gecti') ? queenSigns(h) : [];
      if (p.tone === 'red' || sg.length || (p.key === 'gecti' && p.effAge === 3)) {
        var t3 = p.key === 'gecti' && p.effAge === 3;
        out.push({ id: 'ana-yas-' + h.id, title: (t3 ? h.name + ' · ' + p.text : p.label + ' — ' + h.name + ': ana ' + p.age + ' yaş (' + p.profile.label + ', değişim yaşı ' + p.ideal + ')') +
            (sg.length ? ' · Gözlenen: ' + sg.join(', ') + ' — ana değişimini öne alın' : ''),
          type: 'ana', hiveId: h.id, apiaryId: h.apiaryId, severity: sg.length ? 'high' : 'medium', auto: true, queen: p.key, signs: sg });
        return;
      }
      var g = (h.apiaryId || 'none') + '|' + p.key;
      if (!groups[g]) groups[g] = { apiaryId: h.apiaryId, key: p.key, label: p.label, hives: [], sev: p.severity };
      groups[g].hives.push(h);
      if (p.severity === 'medium') groups[g].sev = 'medium';
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], ap = aps[g.apiaryId], n = g.hives.length;
      var names = g.hives.slice(0, 3).map(function (h) { return h.name; }).join(', ') + (n > 3 ? ' +' + (n - 3) : '');
      var title = g.key === 'bilinmiyor' ? 'Ana yaşı bilinmiyor — ' + n + ' kovan (' + names + '): ana yılını girin'
        : g.label + ' — ' + n + ' kovan (' + names + ')';
      out.push({ id: 'ana-yas-' + g.key + '-' + g.apiaryId, title: title + (ap ? ' · ' + ap.name : ''), type: 'ana', apiaryId: g.apiaryId,
        hiveId: n === 1 ? g.hives[0].id : undefined, severity: g.key === 'bilinmiyor' ? 'low' : g.sev, auto: true, queen: g.key,
        href: 'kovanlar.html?view=koloni&topic=ana&mode=apiary&apiary=' + encodeURIComponent(g.apiaryId || '') });
    });
    return out;
  }
  /** 'Yenile' (ırka göre değişim zamanı geldi/geçti), 'Bilinmiyor' (yıl yok) veya null (sorun yok). */
  function queenStatus(h) {
    var p = queenPlan(h);
    if (p.key === 'bilinmiyor') return 'Bilinmiyor';
    return (p.key === 'zamani' || p.key === 'gecti') ? 'Yenile' : null;
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
        if (queenStatus(h) === 'Yenile') requeen++;
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
    if (o.breed && q.breedEstimated === true) o.breedEstimated = true;
    if (!o.breed && q.breedUnknown === true) o.breedUnknown = true;
    if (q.source != null && String(q.source).trim()) o.source = String(q.source).trim().slice(0, 120);
    if (q.marked === true || q.marked === false) o.marked = q.marked;
    if (q.note != null && String(q.note).trim()) o.note = String(q.note).trim().slice(0, 300);
    if (q.clipped === true || q.clipped === false) o.clipped = q.clipped;
    /* Soy: anne ana ve ananın kökeni (satın alma / ana üretimi / bölme / oğul / sessiz / acil). */
    if (q.motherQueenId) o.motherQueenId = String(q.motherQueenId).slice(0, 32);
    if (q.motherBreed != null && String(q.motherBreed).trim()) o.motherBreed = String(q.motherBreed).trim().slice(0, 60);
    if (QUEEN_ORIGINS.indexOf(q.origin) >= 0) o.origin = q.origin;
    /* Damızlık hat / kaynak adı (serbest metin) ve dış kaynaklı anne ana notu */
    if (q.line != null && String(q.line).trim()) o.line = String(q.line).trim().slice(0, 80);
    if (q.motherRef != null && String(q.motherRef).trim()) o.motherRef = String(q.motherRef).trim().slice(0, 120);
    if (q.clipped === true && /^\d{4}-\d{2}-\d{2}$/.test(String(q.clippedAt || ''))) o.clippedAt = String(q.clippedAt);
    /* k257: Belgeli ana arı (isteğe bağlı): belge no, yetiştirici adı / ili, alım tarihi, işaret numarası, belge fotoğrafı var mı */
    var ct = normalizeQueenCert(q.cert); if (ct) o.cert = ct;
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
  function normalizeQueenCert(c) {
    if (!c || typeof c !== 'object') return null;
    var o = {}, t = function (v, n) { return v != null && String(v).trim() ? String(v).trim().slice(0, n) : ''; };
    var no = t(c.no, 60), br = t(c.breeder, 80), city = t(c.city, 40), mk = t(c.markNo, 20), dt = /^\d{4}-\d{2}-\d{2}$/.test(String(c.date || '')) ? String(c.date) : '';
    if (no) o.no = no; if (br) o.breeder = br; if (city) o.city = city; if (dt) o.date = dt; if (mk) o.markNo = mk;
    if (c.photo === true) o.photo = true;
    return Object.keys(o).length ? o : null;
  }
  /** Belgeli ana arı özeti: «Belge 123 · Yetiştirici X (Erzurum) · alım 12.05.2026 · işaret no 7» — boşsa ''. */
  function queenCertText(c) {
    c = normalizeQueenCert(c); if (!c) return '';
    var o = [];
    if (c.no) o.push('Belge ' + c.no);
    if (c.breeder || c.city) o.push('Yetiştirici ' + (c.breeder || '') + (c.city ? (c.breeder ? ' (' + c.city + ')' : c.city) : ''));
    if (c.date) o.push('alım ' + c.date.slice(8, 10) + '.' + c.date.slice(5, 7) + '.' + c.date.slice(0, 4));
    if (c.markNo) o.push('işaret no ' + c.markNo);
    if (c.photo) o.push('belge fotoğrafı var');
    return o.join(' · ');
  }
  var QUEEN_ORIGINS = ['satin', 'uretim', 'bolme', 'ogul', 'yenileme', 'acil'];
  var QUEEN_ORIGIN_LABEL = { satin: 'satın alınan ana', uretim: 'ana üretimi (larva transferi)', bolme: 'bölmede yetişen ana', ogul: 'oğul sonrası yetişen ana', yenileme: 'sessiz ana değiştirme', acil: 'acil ana memesinden' };
  function loadQueens() {
    try {
      var raw = localStorage.getItem(mk(QUEENS_KEY));
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(normalizeQueen).filter(Boolean) : [];
    } catch (e) { return []; }
  }
  function saveQueens(list) {
    try { localStorage.setItem(mk(QUEENS_KEY), JSON.stringify(list || [])); } catch (e) { /* ignore */ }
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
    delete hive.breedEstimated; delete hive.breedUnknown;
    delete hive.breedLine; delete hive.queenMotherId; delete hive.queenMotherRef;
    if (!q) { delete hive.currentQueenId; return hive; }
    if (q.line) hive.breedLine = q.line;
    if (q.motherQueenId) hive.queenMotherId = q.motherQueenId;
    if (q.motherRef) hive.queenMotherRef = q.motherRef;
    hive.currentQueenId = q.id;
    if (q.year != null) hive.queenYear = q.year;
    if (q.breed) hive.breed = q.breed;
    else if (q.breedUnknown) { delete hive.breed; hive.breedUnknown = true; }
    if (q.breed && q.breedEstimated) hive.breedEstimated = true;
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
      (!q.breedUnknown || (!h.breed && h.breedUnknown === true)) &&
      (h.breedEstimated === true) === (!!q.breed && q.breedEstimated === true) &&
      (h.queenSource || '') === (q.source || '') &&
      (h.queenMarked == null ? null : h.queenMarked) === (q.marked == null ? null : q.marked) &&
      (h.queenClipped == null ? null : h.queenClipped) === (q.clipped == null ? null : q.clipped) &&
      (h.queenClippedAt || '') === (q.clipped === true && q.clippedAt ? q.clippedAt : '') &&
      (h.breedLine || '') === (q.line || '') && (h.queenMotherId || '') === (q.motherQueenId || '') && (h.queenMotherRef || '') === (q.motherRef || '');
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
    ['calmness', 'swarmTendency', 'colonyNote', 'hiveType', 'customTypeLabel', 'emptyHiveKg', 'emptyHiveSource', 'lastTareAt'].forEach(function (f) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, f)) delete copy[f];
    });
    var tmp = {};
    ['calmness', 'swarmTendency', 'colonyNote', 'hiveType', 'customTypeLabel', 'emptyHiveKg', 'emptyHiveSource', 'lastTareAt'].forEach(function (f) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, f)) tmp[f] = patch[f];
    });
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
          if (patch.breed != null && String(patch.breed).trim()) {
            q.breed = String(patch.breed).trim().slice(0, 60);
            delete q.breedUnknown;
            if (patch.breedEstimated === true) q.breedEstimated = true; else delete q.breedEstimated;
          } else if (patch.breedUnknown === true) {
            q.breed = ''; q.breedUnknown = true; delete q.breedEstimated;
          }
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
          /* Irk ve soy: damızlık hat, anne ana (kayıtlı ana id) veya dış kaynak notu */
          if (Object.prototype.hasOwnProperty.call(patch, 'breedLine')) {
            var ln = String(patch.breedLine == null ? '' : patch.breedLine).trim();
            if (ln) q.line = ln.slice(0, 80); else delete q.line;
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'motherQueenId')) {
            var mq = String(patch.motherQueenId == null ? '' : patch.motherQueenId).trim(), mo = mq && mq !== q.id ? queenById(mq, queens) : null;
            if (mo) { q.motherQueenId = mo.id; if (mo.breed) q.motherBreed = mo.breed; else delete q.motherBreed; }
            else { delete q.motherQueenId; delete q.motherBreed; }
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'motherRef')) {
            var mr = String(patch.motherRef == null ? '' : patch.motherRef).trim();
            if (mr) q.motherRef = mr.slice(0, 120); else delete q.motherRef;
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'queenCert')) {
            var qc = normalizeQueenCert(patch.queenCert);
            if (qc) q.cert = qc; else delete q.cert;
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

  /** Irk tahmini kabul: ırk «tahmini» işaretiyle mevcut ana kaydına yazılır. */
  function setBreedEstimate(hiveId, breed) {
    var b = String(breed || '').trim();
    if (!b) return null;
    return updateHiveColony(hiveId, { breed: b, breedEstimated: true }, 'correct');
  }
  /** Arılıktaki çoğunluk ırkı (bu kovan hariç) — yerel erkek arı kaynağı tahmini. */
  function apiaryMajorityBreed(apiaryId, exceptId) {
    var cnt = {}, tot = 0;
    loadHives().forEach(function (x) {
      if (String(x.apiaryId) !== String(apiaryId) || x.id === Number(exceptId) || !x.breed || x.colonyState === 'birlestirildi' || x.colonyState === 'sonuk' || x.breed === 'Diğer') return;
      cnt[x.breed] = (cnt[x.breed] || 0) + 1; tot++;
    });
    var best = '', bn = 0;
    Object.keys(cnt).forEach(function (k) { if (cnt[k] > bn) { bn = cnt[k]; best = k; } });
    return bn >= 2 && bn / tot >= 0.4 ? best : '';
  }
  function queenAt(hiveId, date, queens) {
    var hit = null;
    (queens || loadQueens()).forEach(function (q) {
      (q.placements || []).forEach(function (p) { if (p.hiveId === Number(hiveId) && (!p.from || p.from <= date) && (!p.to || p.to >= date)) hit = q; });
    });
    return hit;
  }
  function prevQueenBefore(hiveId, date, queens) {
    var hit = null, best = '';
    (queens || loadQueens()).forEach(function (q) {
      (q.placements || []).forEach(function (p) { if (p.hiveId === Number(hiveId) && p.to && p.to <= date && p.to >= best) { best = p.to; hit = q; } });
    });
    return hit;
  }
  var PURCHASE_RE = /sat[ıi]n|al[ıi]nd[ıi]|yeti[şs]tirici|[üu]retici|firma|[çc]iftli[ğg]i|enstit[üu]/i;
  var LOCAL_RE = /kendi|do[ğg]al|sessiz|o[ğg]ul|acil|meme|h[üu]cre|yenileme/i;
  /**
   * Soy kanıtı (ırk tahmininin ilk satırı):
   *  { kind: 'satin'|'yerel'|null, breed, motherBreed, localBreed, origin, source, text }
   * satin: satın alınan, ırkı belirtilmiş ana (en güçlü kanıt).
   * yerel: annesi bilinen, yerelde çiftleşmiş ana (baba bilinmiyor).
   */
  function queenLineage(h) {
    var out = { kind: null, breed: '', motherBreed: '', localBreed: '', origin: '', source: '', text: '' };
    if (!h) return out;
    var queens = loadQueens(), q = h.currentQueenId ? queenById(h.currentQueenId, queens) : null;
    out.localBreed = apiaryMajorityBreed(h.apiaryId, h.id);
    function fromPlacement(qq) { var f = ''; (qq.placements || []).forEach(function (p) { if (p.hiveId === h.id && p.from && (!f || p.from < f)) f = p.from; }); return f; }
    var purchased = q && q.breed && !q.breedEstimated && (q.origin === 'satin' || (!q.origin && PURCHASE_RE.test(q.source || '') && !LOCAL_RE.test(q.source || '')));
    if (purchased) {
      out.kind = 'satin'; out.breed = q.breed; out.origin = 'satin';
      out.source = 'Ana kaydı' + (q.source ? ' (' + q.source + ')' : '');
      out.text = 'Satın alınan ana, ırkı belirtilmiş: ' + q.breed + '.';
      return out;
    }
    var mb = '', mq = null, origin = '', src = '';
    if (q && (q.motherBreed || q.motherQueenId)) {
      mq = q.motherQueenId ? queenById(q.motherQueenId, queens) : null;
      mb = q.motherBreed || (mq && mq.breed) || ''; origin = q.origin || '';
      src = q.origin === 'uretim' ? 'Ana üretimi' + (q.motherQueenId ? ' (anne ' + q.motherQueenId + ')' : '') : 'Ana kaydı';
    }
    if (!mb && h.pendingMother && (!q || fromPlacement(q) >= h.pendingMother.date)) {
      var pm = h.pendingMother, fh = pm.fromHiveId != null ? hiveById(pm.fromHiveId) : null;
      mq = pm.queenId ? queenById(pm.queenId, queens) : null;
      mb = pm.breed || (mq && mq.breed) || ''; origin = pm.origin || 'bolme';
      src = pm.origin === 'manuel' ? 'Elle girildi' : 'Bölme ' + fmtTr(pm.date) + (fh ? ' (kaynak: ' + fh.name + ')' : '');
    }
    if (!mb) {
      var br = []; try { br = recordsFor(h.id).brood.filter(function (b) { return ['ogul', 'yenileme', 'acil'].indexOf(b.queenCell) >= 0; }); } catch (e) { br = []; }
      if (br.length) {
        var b0 = br[0], m0 = queenAt(h.id, b0.date, queens) || prevQueenBefore(h.id, b0.date, queens);
        if (m0 && m0.breed && (!q || q.id !== m0.id)) { mq = m0; mb = m0.breed; origin = b0.queenCell; src = 'Yavru kaydı ' + fmtTr(b0.date) + ' (' + QUEEN_ORIGIN_LABEL[b0.queenCell] + ')'; }
      }
    }
    if (!mb && q && LOCAL_RE.test(q.source || '')) {
      var hist = (h.queenHistory || []).filter(function (e) { return e.newQueenId === q.id && e.oldBreed; });
      if (hist.length) { mb = hist[hist.length - 1].oldBreed; origin = 'yenileme'; src = 'Ana geçmişi (önceki ana)'; }
    }
    if (!mb) return out;
    out.kind = 'yerel'; out.motherBreed = mb; out.breed = mb; out.origin = origin; out.source = src;
    out.text = 'Anne ' + mb + ', baba bilinmiyor: ' + mb + ' veya ' + mb + ' × ' + (out.localBreed && out.localBreed !== mb ? out.localBreed : 'yerel arı') + ' melezi olabilir' + (out.localBreed === mb ? ' (arılık çoğunluğu da ' + mb + ')' : '') + '.';
    return out;
  }
  /** Soy bilgisini elle yaz: mevcut ana kaydına (yoksa kovanda yetişecek anaya) anne ırkı / köken. */
  function setQueenLineage(hiveId, o) {
    o = o || {};
    var mb = String(o.motherBreed || '').trim().slice(0, 60), origin = QUEEN_ORIGINS.indexOf(o.origin) >= 0 ? o.origin : '';
    var list = loadHives(), queens = loadQueens(), found = null;
    var out = list.map(function (h) {
      if (h.id !== Number(hiveId)) return h;
      var copy = cloneObj(h), q = h.currentQueenId ? queenById(h.currentQueenId, queens) : null;
      if (q) {
        if (origin) q.origin = origin;
        if (origin === 'satin') { if (mb) { q.breed = mb; delete q.breedEstimated; delete q.breedUnknown; } delete q.motherBreed; }
        else if (mb) q.motherBreed = mb;
        mirrorQueenToHive(copy, q);
      } else if (mb && origin !== 'satin') {
        copy.pendingMother = { date: todayLocal(), origin: 'manuel', breed: mb };
      } else return h;
      copy.colonyUpdatedAt = new Date().toISOString();
      found = normalizeHive(copy);
      return found;
    });
    if (!found) return null;
    saveQueens(queens); saveHives(out);
    return found;
  }
  /** Görünen ırk: «Kafkas (tahmini)» / «Bilinmiyor». */
  function breedLabel(h) {
    if (!h || !h.breed) return 'Bilinmiyor';
    return h.breed + (h.breedEstimated ? ' (tahmini)' : '');
  }
  /* Irk ve soy kaydı: saf ırklar (seçim listesi) ve melez yazımı «A × B», «A × B × C» */
  var PURE_BREEDS = ['Kafkas', 'Karniyol', 'Anadolu', 'Karadeniz', 'Muğla', 'Efe arısı', 'İtalyan', 'Buckfast', 'Erzurum (Doğu yerli)'];
  function breedKind(b) { var n = breedParts(b).length; return !String(b || '').trim() ? '' : (n >= 3 ? 'uc' : (n === 2 ? 'iki' : 'saf')); }
  function joinBreed(parts) { return (parts || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' × ').slice(0, 60); }
  /** «Hat: Doğu Karadeniz İst. · Anne: Kovan 204 anası (Q-…)» — boşsa ''. */
  function lineageText(h, queens) {
    if (!h) return '';
    var out = [];
    if (h.breedLine) out.push('Hat: ' + h.breedLine);
    if (h.queenMotherId) {
      var mq = queenById(h.queenMotherId, queens), pl = mq && Array.isArray(mq.placements) ? mq.placements[mq.placements.length - 1] : null, mh = pl ? hiveById(pl.hiveId) : null;
      out.push('Anne ana: ' + (mh ? mh.name + ' anası' : h.queenMotherId) + (mq && mq.breed ? ' (' + mq.breed + ')' : ''));
    }
    if (h.queenMotherRef) out.push('Anne ana: ' + h.queenMotherRef);
    return out.join(' · ');
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
    if (workMode() !== 'demo') return { list: hives || [], changed: false }; /* k283: Canlı'da örnek veri yok */
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
    /* Canlı: yeni kovan boş kayıt — örnek ağırlık/ırk/güç/skor atanmaz (normalizeHive varsayılanları arayüzde Canlı’da gösterilmez). */
    if (isLiveMode()) return normalizeHive({ id: id, name: 'Kovan ' + id, apiaryId: apiaryId, hiveType: 'langstroth_10' });
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
    /* koloni-280: Cimil en küçük numaralar (1–25), Yanıkdağ ardından (26–45) */
    if (apiaryId === 'a5') return 0;
    if (apiaryId === 'a4') return 25;
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
    var featured = isLiveMode() ? [] : FEATURED_HIVES.filter(function (h) {
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
      if (!a || a.userMovedAt) return a;
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
      if (!a || a.userMovedAt || a.userRenamedAt) return a;
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
      var raw = localStorage.getItem(mk(DELETED_SEEDS_KEY));
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
      localStorage.setItem(mk(DELETED_SEEDS_KEY), JSON.stringify(Object.keys(map)));
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
      /* Kullanıcının taşıdığı/birleştirdiği arılık asla otomatik birleşmez. */
      if (isYanikBalugApiary(a) && !a.userMovedAt && !a.userRenamedAt) dups.push(a);
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
      var rawH = localStorage.getItem(mk(HIVES_KEY));
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
      if (changed) localStorage.setItem(mk(HIVES_KEY), JSON.stringify(hList));
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
      var raw = localStorage.getItem(mk(STORAGE_KEY));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && !parsed.length && isLiveMode()) return [];
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
          }).map(function (m, i) { return copyMoveFields(m, parsed[i]); });
          var liveM = isLiveMode();
          /* Örnek arılık onarımları yalnız Demo’da; Canlı’da kullanıcının listesine örnek arılık eklenmez. */
          var rest = liveM ? { list: mapped, changed: false } : restoreKayakoyA1(mapped);
          /* Göç (Arılığı Taşı): örnek ad/konum düzeltmeleri yalnız Demo’da ve kullanıcı taşımadıysa (Canlı’da kullanıcının konumu/adı asla zorlanmaz). */
          var mig = liveM ? { list: rest.list, changed: false } : migrateApiaryNames(rest.list);
          var coordMig = liveM ? { list: mig.list, changed: false } : migrateApiaryCoordinates(mig.list);
          var ens = liveM ? { list: coordMig.list, changed: false } : ensureSeedApiariesPresent(coordMig.list);
          var ded = liveM ? { list: ens.list, changed: false } : dedupeYanikBalugApiaries(ens.list);
          var adminMig = migratePlaceAdmin(ded.list);
          var waterDist = refreshWaterDistancesFromMap(adminMig.list);
          var srvW = applyServerWater(waterDist.list);
          var out = srvW.list;
          if (srvW.changed) waterDist.changed = true;
          if (rest.changed || mig.changed || coordMig.changed || ens.changed || ded.changed || adminMig.changed || waterDist.changed) {
            try {
              var outS = JSON.stringify(out);
              if (outS !== raw) localStorage.setItem(mk(STORAGE_KEY), outS); /* k159: aynıysa yazma (her okumada yeniden yazılıyordu) */
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
              var rawH = localStorage.getItem(mk(HIVES_KEY));
              var hList = rawH ? JSON.parse(rawH) : [];
              if (!Array.isArray(hList)) hList = [];
              return reconcile(out, hList).apiaries;
            } catch (eFleet) { /* ignore */ }
          }
          return out;
        }
      }
    } catch (e) { /* ignore */ }
    /* Canlı: veri yoksa boş başlar (örnek arılık/kovan yok). */
    if (isLiveMode()) return [];
    var seed = cloneSeed();
    try {
      localStorage.setItem(mk(STORAGE_KEY), JSON.stringify(seed));
    } catch (e2) { /* ignore */ }
    return seed;
  }

  function saveApiaries(list) {
    if (!Array.isArray(list)) return;
    try {
      var asS = JSON.stringify(list); if (localStorage.getItem(mk(STORAGE_KEY)) !== asS) localStorage.setItem(mk(STORAGE_KEY), asS);
    } catch (e) { /* ignore */ }
  }

  function saveHives(list) {
    if (!Array.isArray(list)) return;
    try {
      var hs = JSON.stringify(list);
      if (localStorage.getItem(mk(HIVES_KEY)) !== hs) localStorage.setItem(mk(HIVES_KEY), hs); /* k159: değişmediyse yazma */
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
      /* k159: il/ilçe/köy korunur (kaybolunca loadApiaries her okumada yeniden yazıyordu → önbellek hep düşüyordu) */
      return copyAdminFields(applyWaterDistance({
        id: a.id,
        name: a.name,
        place: a.place,
        lat: a.lat,
        lon: a.lon,
        hiveCount: fleet.length
      }, a), a);
    });

    /* Keep orphan hives from unknown apiaries out of the active set (count is per known apiary). */
    saveApiaries(apiaryOut);
    saveHives(out);
    return { apiaries: apiaryOut, hives: out };
  }

  function readRawHives() {
    try {
      var raw = localStorage.getItem(mk(HIVES_KEY));
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
    var MIG_V2 = mk('superari.breedMig.v2');
    var LATER_MIGS = [
      { key: mk('superari.breedMig.v3'), apiary: 'a5' },
      { key: mk('superari.breedMig.v4'), apiary: 'a3' },
      { key: mk('superari.breedMig.v5'), apiary: 'a2' }
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

  /* k159 performans: loadHives depo değişmedikçe önbellekten (her çağrıda 145 kovan normalize + yazma yapılıyordu) */
  var LH = { sig: null, list: null, map: null };
  function loadHives() {
    var sig = hiveStoreSig();
    if (sig !== null && sig === LH.sig && LH.list) return LH.list.slice();
    var l = loadHivesUncached();
    LH.list = l; LH.map = null; LH.sig = hiveStoreSig();
    return l.slice();
  }
  function loadHivesUncached() {
    var list = loadHivesBase();
    var QUEEN_SEED_KEY = mk('superari.queenSeed.v1');
    var done = false;
    try { done = localStorage.getItem(QUEEN_SEED_KEY) === '1'; } catch (eQ) {}
    /* k283: örnek ana yılı / sakinlik / oğul eğilimi / işaret YALNIZ Demo'da. Canlı'da (ör. yeni tarayıcıda buluttan gelen
       Tekman kovanları) eksik ana verisi uydurulmaz → arayüz «—» / «Ana yaşı bilinmiyor» gösterir. Mevcut kayıtlara dokunulmaz. */
    if (!done && workMode() === 'demo') {
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
    list = eq.list;
    var HT_MIG = 'superari.hiveType.migrated.v1';
    var htDone = false;
    try { htDone = localStorage.getItem(HT_MIG) === '1'; } catch (eHt) { /* ignore */ }
    if (!htDone) {
      var mig = global.SuperAriBalAgirlik && global.SuperAriBalAgirlik.migrateHiveTypesOnList
        ? global.SuperAriBalAgirlik.migrateHiveTypesOnList(list)
        : null;
      if (!mig) {
        mig = { list: list, changed: false };
        mig.list = list.map(function (h) {
          if (!h || h.hiveType) return h;
          mig.changed = true;
          var c = cloneObj(h);
          c.hiveType = 'langstroth_10';
          return c;
        });
      }
      if (mig.changed) {
        try { saveHives(mig.list); } catch (eHt2) { /* ignore */ }
        list = mig.list;
      }
      try { localStorage.setItem(HT_MIG, '1'); } catch (eHt3) { /* ignore */ }
    }
    return attachSwarmRisk(list);
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
  var QUEEN_CELL_LABEL = { yok: 'Yok', ogul: 'Alt kenar (oğul yüksüğü)', yenileme: 'Petek ortası (sessiz ana değiştirme)', acil: 'Acil (genç larvadan, anasız)', bilinmiyor: 'Yeri bilinmiyor' };
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

  /* ---- Koloni gücü: 5 seviye (arka planda 0–100 skor; formül arayüzde gösterilmez) ----
   * Ana girdi: arılı çerçeve (FoB: Langstroth derin çerçevenin iki yüzü ≥%75 arıyla kaplı, kısmiler toplanır — UCANR).
   * Evrensel eşik yok: Türkiye'de bölge ortalamaları çok farklı (Malatya 8,3–9, Bingöl 10–12, Erzurum 13–19 arılı çerçeve; DergiPark makale 4656326).
   * Bu yüzden: arılıkta son 45 günde güç kaydı olan ≥3 başka kovan varsa seviye ARILIĞIN KENDİ ORTALAMASINA göre (oran: <0,5 Çok zayıf, 0,5–0,8 Zayıf,
   * 0,8–1,2 Normal, 1,2–1,5 Güçlü, >1,5 Çok güçlü — VARSAYIM); yeterli veri yoksa başlangıç eşikleri ≤2 / 3–4 / 5–7 / 8–11 / ≥12 (VARSAYIM;
   * dayanak: HBRC Guelph 3 zayıf · 5 orta · 8 güçlü; Almond Board 4 asgari · 8 ortalama).
   * Arılık verisi yoksa: KONUM × CİNS beklentisine göre aynı oranlar (COLONY_ENV); bant da bilinmiyorsa başlangıç eşikleri.
   * Mutlak taban: ≤2 çerçeve her zaman Çok zayıf; <5 çerçeve en fazla Zayıf (UK NBU: kışa en az 5 çerçeve arı; NSW DPI «Wintering bees»: <6 çerçeve
   * kış salkımını sürdüremeyebilir). Mevsim / yavru / tartı katkıları uygulamanın kararıdır (varsayım). */
  /* ---- KONUM (rakım / iklim bandı) × ARI CİNSİ — TEK TABLO (güç beklentisi + kış bal rezervi) ----
   * fobMean: üretim mevsiminde (Nis–Eyl) bölgede beklenen ortalama arılı çerçeve. Kaynak: DergiPark makale 4656326 (Malatya 8,3–9 · Bingöl 10–12 · Erzurum 13–19).
   *   sıcak / alçak için Türk verisi bulunamadı → ılıman ile aynı (VARSAYIM).
   * winterKg: kışa girerken hedef bal rezervi. Ilıman 20 kg: UK NBU Fact sheet 19 (≈20 kg). Sıcak 15 / yayla 22 / yüksek yayla 25 kg: uygulama değeri —
   *   kış kısa / uzun olduğu için (VARSAYIM; Yanıkdağ 215 m ılıman-nemli → alçak bant, Erzurum / Tortum / Palandöken → yayla / yüksek).
   * Cins fob (Anadolu = 1,00): Kafkas 0,90 (Dülger 1997 Erzurum 15,62 / 17,08; Dodoloğlu & Genç 2002 10,88 / 12,38); Kafkas×Anadolu melez 0,95 (Dodoloğlu: 11,36 ve 12,13);
   *   Erzurum / Doğu yerli 1,08 (Dülger: 18,49 / 17,08); Karniyol 1,15 ve Buckfast 1,11 (Cengiz & Erdoğan 2017 Kafkas Üniv. Vet. Fak. Derg. 23(6): Karniyol 12,17, Buckfast 11,72,
   *   Kafkas 9,52 → Kafkas oranı × 0,90); Karadeniz (Kafkas ekotipi) 0,90, Muğla / İtalyan / bilinmeyen 1,00: VARSAYIM.
   * Cins kış rezervi düzeltmesi 0: Türk çalışmalarında kış tüketimi farkı küçük ve tutarsız (Tokat: Karniyol 5,53 · Kafkas 6,00 · İtalyan 5,22 kg, fark istatistiksel önemsiz;
   *   Erzurum: Kafkas 4,1 · Anadolu 4,26 kg; Dodoloğlu: Kafkas 9,09 · Anadolu 7,29 kg) → kaynaklı bir katsayı yok.
   * OFF_SEASON: Eki–Mar beklenen arılı çerçeve = fobMean × 0,65 (Dülger 1997: kışlatmada popülasyon azalması %32–47 → ≈%35; VARSAYIM). */
  var COLONY_ENV = {
    BANDS: {
      sicak: { label: 'Sıcak / alçak', fobMean: 8.6, winterKg: 15 },
      iliman: { label: 'Ilıman / iç bölge', fobMean: 8.6, winterKg: 20 },
      yayla: { label: 'Yayla', fobMean: 11, winterKg: 22 },
      yuksek: { label: 'Yüksek yayla', fobMean: 16, winterKg: 25 }
    },
    BREEDS: [
      { key: 'karadeniz', label: 'Karadeniz', test: function (b) { return /karadeniz/.test(b); }, fob: 0.90, winterAdjKg: 0, grp: 'kafkas' },
      { key: 'kafkas', label: 'Kafkas', test: function (b) { return /kafkas/.test(b); }, fob: 0.90, winterAdjKg: 0, grp: 'kafkas' },
      { key: 'karniyol', label: 'Karniyol', test: function (b) { return /karniyol|karniol|carnica|krain/.test(b); }, fob: 1.15, winterAdjKg: 0, grp: 'karniyol' },
      { key: 'buckfast', label: 'Buckfast', test: function (b) { return /buckfast/.test(b); }, fob: 1.11, winterAdjKg: 0, grp: 'buckfast' },
      { key: 'erzurum', label: 'Erzurum / Doğu yerli', test: function (b) { return /erzurum|doğu|dogu/.test(b); }, fob: 1.08, winterAdjKg: 0, grp: 'yerli' },
      { key: 'mugla', label: 'Muğla', test: function (b) { return /muğla|mugla/.test(b); }, fob: 1.00, winterAdjKg: 0, grp: 'mugla' },
      { key: 'italyan', label: 'İtalyan', test: function (b) { return /italyan|ligustica|i̇talyan/.test(b); }, fob: 1.00, winterAdjKg: 0, grp: 'italyan' },
      { key: 'anadolu', label: 'Anadolu', test: function (b) { return /anadolu|yerli/.test(b); }, fob: 1.00, winterAdjKg: 0, grp: 'yerli' },
      { key: 'diger', label: 'Diğer / bilinmiyor', test: function () { return true; }, fob: 1.00, winterAdjKg: 0, grp: 'diger' }
    ],
    /* MELEZ (F1) ÖZELLİKLERİ — gruplar arası. F1 beklentisi = ebeveyn ortalaması × (1 + H); H = denemede ölçülen melez gücü (heterosis)
     * (Falconer & Mackay: F1 = ebeveyn ortalaması + heterosis). Düz ortalama DEĞİL: H yalnız kaynaklı denemeden; kaynak yoksa H = 0 ve kanıt «yok».
     * kis: kışlama (sonbahar → ilkbahar arı korunumu) ebeveyn ortalamasına göre fark; kış beklentisine en fazla ±%10 yansıtılır (deneme küçük).
     * Mizaç ve bal yalnız bilgi (güç skoruna girmez).
     * Kafkas × Karniyol: Erkan, Günbey, Günbey & Cengiz 2024, Bioscience Journal 40:e40008 (Van, karşılıklı F1, 6 ölçüm):
     *   ortalama arılı çerçeve Kafkas 5,06 · Karniyol 5,77 · K♀×Kr♂ 6,16 · Kr♀×K♂ 6,42 → melez 6,29 / ebeveyn ort. 5,415 = +%16;
     *   Mayıs/Eylül arı oranı Kafkas 0,37 · Karniyol 0,25 · melez 0,43 (ebeveyn ort. 0,31) → kışlama ebeveynlerden iyi (n = 4–6 koloni / grup);
     *   iğne sayısı Kafkas 3,8 · Karniyol 3,3 · melez 4,0 → sakin (fark önemsiz).
     * Kafkas × yerli (Anadolu / Doğu yerli): aynı deneme K×Y 6,00 · Y×K 6,39 / ebeveyn ort. 6,43 → −%4 (önemsiz) → H 0;
     *   Dodoloğlu & Genç 2002 (Erzurum): Kafkas × Anadolu ≈ ebeveyn ortalaması (eski 0,95 katsayısı ile aynı sonuç); Gencer & Karacaoğlu 2003 (Ege):
     *   melez Kafkas'tan çok yavru → ebeveyn ortalamasıyla uyumlu. Mizaç: yerliden sakin (iğne 5,1–8,8 / yerli 16,6).
     * Karniyol × yerli: aynı deneme Kr×Y 7,19 · Y×Kr 5,94 / ebeveyn ort. 6,79 → −%3 → H 0; bal en yüksek Kr♀×Y♂ (14,8 kg); yerliden sakin.
     * Kafkas × Muğla: Akyol & Kaftanoğlu 2001 (karşılıklı melezler, gezginci): yavru üretimi M×M ve M♀×K♂ en yüksek, bal M♀×K♂ en yüksek,
     *   M♀×K♂ en hırçın; kışlama farkı önemsiz (tez: M×K %91,7 · M×M %86,0 · K×K %82,0 · K×M %72,1). Arılı çerçeve verisi yok → H 0,08 (ZAYIF kanıt:
     *   yavru üstünlüğü bir yönde; ters melez K♀×M♂ bal bakımından Kafkas düzeyinde).
     * Kafkas × Karadeniz: Karadeniz Kafkas arısının ekotipi (aynı alt tür) → melez gücü beklenmez, deneme yok → H 0.
     * Diğer tüm çiftler (Buckfast, İtalyan, Karniyol × Muğla …): Türkiye koşullarında karşılaştırmalı F1 denemesi bulunamadı → H 0, kanıt «yok». */
    CROSS: [
      { g: ['kafkas', 'karniyol'], H: 0.16, kis: 0.10, kanit: 'orta', ozet: 'gelişme ebeveynlerden iyi · kışlama iyi · sakin', src: 'Erkan ve ark. 2024 (Van, karşılıklı F1)' },
      { g: ['kafkas', 'yerli'], H: 0, kis: 0, kanit: 'orta', ozet: 'ebeveyn ortalaması · yerliden sakin', src: 'Erkan ve ark. 2024; Dodoloğlu & Genç 2002; Gencer & Karacaoğlu 2003' },
      { g: ['karniyol', 'yerli'], H: 0, kis: 0, kanit: 'zayıf', ozet: 'ebeveyn ortalaması · bal iyi · yerliden sakin', src: 'Erkan ve ark. 2024 (Van)' },
      { g: ['kafkas', 'mugla'], H: 0.08, kis: 0, kanit: 'zayıf', ozet: 'yavru iyi (Muğla ana ile) · hırçınlaşabilir', src: 'Akyol & Kaftanoğlu 2001' },
      { g: ['kafkas', 'kafkas'], H: 0, kis: 0, kanit: 'gerekçe', ozet: 'aynı alt tür · melez gücü beklenmez', src: 'Karadeniz = Kafkas ekotipi' }
    ],
    OFF_SEASON: 0.65
  };
  /* güç / konum hesabı için hafif önbellek: kovan, arılık ve bakım planı kayıtları değişmedikçe kovan listesi ve bant yeniden kurulmaz
     (colonyStatus her kovan için çağrılır; hiveById/apiaryById her seferinde tüm listeyi yükler) */
  var envMemo = { sig: null, hives: null, band: {}, building: false };
  function envSig() {
    var g = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
    var live = g('superari.workMode') === 'live';
    return [live ? 'L' : 'D', g(mk(HIVES_KEY)), g(mk(STORAGE_KEY)), g(live ? 'superari.bakimPlan.v1' : 'superari.bakimPlan.demo.v1')];
  }
  function sameSig(a, b) { if (!a || !b) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function envMemoFresh() {
    if (envMemo.building) return null;
    var sig = envSig();
    if (!sameSig(sig, envMemo.sig)) {
      envMemo.building = true;
      var map = {};
      try { loadHives().forEach(function (x) { map[String(Number(x.id))] = x; }); } catch (e) { map = {}; }
      envMemo.building = false;
      envMemo = { sig: envSig(), hives: map, band: {}, building: false };
    }
    return envMemo;
  }
  function liteHive(id) { var m = envMemoFresh(); if (m) return m.hives[String(Number(id))] || null; try { return hiveById(id); } catch (e) { return null; } }
  function liteHives() { var m = envMemoFresh(); if (m) return Object.keys(m.hives).map(function (k) { return m.hives[k]; }); return loadHives(); }
  function breedEnv1(b) { return COLONY_ENV.BREEDS.filter(function (x) { return x.test(b); })[0]; }
  /** Melez yazımını bileşenlere ayırır: «Kafkas × Karadeniz × Muğla» → ['kafkas','karadeniz','muğla'] (×, x, *, + ayırıcı). */
  /* k289: yönlü melez yazımı («Muğla ana × Kafkas baba») → ana / baba / erkek eki ırk adından düşülür (bileşen: muğla, kafkas). */
  function breedParts(b) { return String(b || '').toLocaleLowerCase('tr').replace(/[()]/g, ' ').split(/\s*(?:×|✕|\*|\+|\sx\s)\s*/).map(function (x) { return x.trim().replace(/\s+(?:ana|baba|erkek)$/, ''); }).filter(Boolean); }
  function crossOf(ga, gb) {
    return COLONY_ENV.CROSS.filter(function (c) { return (c.g[0] === ga && c.g[1] === gb) || (c.g[0] === gb && c.g[1] === ga); })[0] || null;
  }
  /** İkili melez (F1): ebeveyn ortalaması × (1 + H); aynı grup (ör. Kafkas × Kafkas) → H 0. */
  function cross2(a, b) {
    var c = a.grp === b.grp && a.grp !== 'kafkas' ? null : crossOf(a.grp, b.grp), H = c ? c.H : 0;
    return { fob: (a.fob + b.fob) / 2 * (1 + H), kis: c ? c.kis : 0, c: c };
  }
  /* Saf ırk: tablodaki eşleşme. İkili melez: F1 = ebeveyn ortalaması × (1 + H) (CROSS tablosu, kaynaklı; yoksa H 0).
     Üçlü melez «A × B × C» = A × B melez ana arı, C erkek arı (üçlü melez): beklenti = ½ (A×C + B×C) (Falconer üçlü melez tahmini);
     melez ananın kendi (anaç) melez gücü için sayısal kaynak bulunamadı → eklenmedi. */
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function breedEnv(h) {
    var b = String((h && (h.breed || h.irk)) || '').toLocaleLowerCase('tr'), parts = breedParts(b);
    if (parts.length < 2) return breedEnv1(b);
    var bs = parts.slice(0, 3).map(breedEnv1), o;
    if (bs.length === 2) {
      o = cross2(bs[0], bs[1]);
      return { key: 'melez2', label: 'İkili melez', parts: bs.map(function (x) { return x.key; }), fob: r3(o.fob), kis: o.kis, cross: o.c, kanit: o.c ? o.c.kanit : 'yok',
        winterAdjKg: 0, test: function () { return false; } };
    }
    var ac = cross2(bs[0], bs[2]), bc = cross2(bs[1], bs[2]);
    var cs = [ac.c, bc.c].filter(Boolean);
    return { key: 'melez3', label: 'Üçlü melez', parts: bs.map(function (x) { return x.key; }), fob: r3((ac.fob + bc.fob) / 2), kis: (ac.kis + bc.kis) / 2,
      cross: cs[0] || null, kanit: cs.length ? (cs.some(function (c) { return c.kanit === 'orta'; }) ? 'orta' : 'zayıf') : 'yok', winterAdjKg: 0, test: function () { return false; } };
  }
  /** Melez özelliği (arayüz için kısa metin; formül yok): { ozet, kanit, src } veya null. */
  /* k289: yönlü Muğla × Kafkas melezleri — kullanıcıya yalnız sade özellik (kaynak ve rakamlar yalnız yönetici panelinde: Akyol 1998; Akyol & Kaftanoğlu 2001). */
  var CROSS_YON = [
    { id: 'mugla_kafkas', ad: 'Muğla ana × Kafkas baba', ana: /mu[ğg]la ana/, baba: /kafkas (?:baba|erkek)/, ozet: 'yüksek bal verimi · daha hırçın · F1 melez: ana arıyı her yıl yenileyin' },
    { id: 'kafkas_mugla', ad: 'Kafkas ana × Muğla baba', ana: /kafkas ana/, baba: /mu[ğg]la (?:baba|erkek)/, ozet: 'denemede bal verimi düşük kaldı' },
    /* k290: tescilli Efe (Ege) ana hattı × Kafkas erkek — kaynak/rakam yalnız yönetici; verim denemesi yok */
    { id: 'efe_kafkas', ad: 'Efe ana × Kafkas baba', ana: /efe ana/, baba: /kafkas (?:baba|erkek)/, ozet: 'tescilli Efe ana hattı · F1 melez: ana arıyı her yıl yenileyin · bal verimi: Veri yok' }
  ];
  /* koloni-291: yönlü ikili melez — genetik puan / «Melez özelliği» yönetici › Arı genetikleri (ogul_skor_ayar.data.melezYon); kilitli tablo değişmez */
  function melezYonVarsayilanGenetik(id) {
    if (id === 'efe_kafkas') return GENETIK_MELEZ['anadolu+kafkas'];
    if (id === 'mugla_kafkas' || id === 'kafkas_mugla') return GENETIK_MELEZ['kafkas+mugla'];
    return null;
  }
  function melezYonDefaults() {
    var items = {}; CROSS_YON.forEach(function (y) { items[y.id] = { ozet: y.ozet }; }); return { items: items };
  }
  function melezYonMerge(raw) {
    var d = melezYonDefaults(); if (!raw || typeof raw !== 'object' || !raw.items || typeof raw.items !== 'object') return d;
    CROSS_YON.forEach(function (y) {
      var s = raw.items[y.id]; if (!s || typeof s !== 'object') return;
      var it = d.items[y.id];
      if (typeof s.ozet === 'string' && s.ozet.trim()) it.ozet = s.ozet.trim().slice(0, 500);
      var g = Number(s.genetik); if (s.genetik !== '' && s.genetik != null && isFinite(g) && g >= 0 && g <= 100) it.genetik = g;
      if (typeof s.kaynak === 'string') it.kaynak = s.kaynak.trim().slice(0, 12000);
      if (typeof s.not === 'string') it.not = s.not.trim().slice(0, 12000);
    });
    return d;
  }
  function melezYonCfg() { return melezYonMerge((OGUL_SKOR && OGUL_SKOR.melezYon) || null); }
  function melezYonGenetikOverride(breed) {
    var y = crossYon(breed); if (!y) return null;
    var g = melezYonCfg().items[y.id].genetik; return g == null ? null : g;
  }
  function crossYon(breed) {
    var b = String(breed || '').toLocaleLowerCase('tr');
    var y = CROSS_YON.filter(function (x) { return x.ana.test(b) && x.baba.test(b); })[0] || null;
    if (!y) return null;
    var oz = melezYonCfg().items[y.id].ozet || y.ozet;
    return { id: y.id, ad: y.ad, ana: y.ana, baba: y.baba, ozet: oz };
  }
  function crossInfo(breed) {
    var y = crossYon(breed); if (y) return { ozet: y.ozet, kanit: '', src: '', yon: true, ad: y.ad };
    var e = breedEnv({ breed: breed }); if (!e || (e.key !== 'melez2' && e.key !== 'melez3')) return null;
    return e.cross ? { ozet: e.cross.ozet, kanit: e.kanit, src: e.cross.src } : { ozet: 'karşılaştırmalı deneme bulunamadı', kanit: 'yok', src: '' };
  }
  function bandKeyOf(h) {
    if (!h) return null;
    var m = envMemoFresh(), ck = String(h.apiaryId);
    if (m && Object.prototype.hasOwnProperty.call(m.band, ck)) return m.band[ck];
    var k0 = bandKeyRaw(h);
    if (m) m.band[ck] = k0;
    return k0;
  }
  function bandKeyRaw(h) {
    try { var P = global.SuperAriPlan; if (P && P.profileKey) { var k = P.profileKey(h.apiaryId); if (COLONY_ENV.BANDS[k]) return k; } } catch (e) { /* ignore */ }
    var a = null; try { a = apiaryById(h.apiaryId); } catch (e) { a = null; }
    var alt = a ? Number(a.altitude || a.elevation || a.rakim) : NaN;
    if (isFinite(alt) && alt > 0) return alt >= 1800 ? 'yuksek' : (alt >= 1100 ? 'yayla' : 'iliman');
    return null;
  }
  /** Kovanın konum × cins değerleri: { bandKey, band, breed, fobPeak, fobNow(date), winterKg } (bant bilinmiyorsa bandKey null). */
  function envFor(h, date) {
    var bk = bandKeyOf(h), band = bk ? COLONY_ENV.BANDS[bk] : null, br = breedEnv(h);
    var m = Number(String(date || todayLocal()).slice(5, 7)) || 6, peak = band ? band.fobMean * br.fob : null;
    return { bandKey: bk, band: band, breed: br, fobPeak: peak, fobNow: peak != null ? Math.round(peak * (m >= 4 && m <= 9 ? 1 : COLONY_ENV.OFF_SEASON * (1 + Math.max(-0.1, Math.min(0.1, br.kis || 0)))) * 100) / 100 : null,
      winterKg: band ? band.winterKg + (br.winterAdjKg || 0) : null };
  }
  /* Skor ölçeği (k93, kullanıcı kararı — 7 seviye; skor 0–100, 100'ü geçmez):
   *   Birleştirilmeli 0–44 (yaşama sınırının altı) · Çok zayıf 45–59 · Zayıf 60–69 · Normal 70–79 · Güçlü 80–89 · Çok güçlü 90–100
   *   + Bölünmesi Gerekiyor (kısa: Bölünmeli): skordan bağımsız bölme kuralı (splitCheck) sağlanınca; skor yine en fazla 100.
   * Yaşama sınırı (viableFrames, bölge × mevsim) skor 45'e oturur → sınırın altı = Birleştirilmeli. */
  var SCORE_LEVELS = [
    { key: 'birlestir', label: 'Birleştirilmeli', short: 'Birleştirilmeli', min: 0, tone: 'red', color: '#c92a2a', bg: '#ffe3e3' },
    { key: 'cok-zayif', label: 'Çok zayıf', short: 'Çok zayıf', min: 45, tone: 'deeporange', color: '#d9480f', bg: '#ffe8cc' },
    { key: 'zayif', label: 'Zayıf', short: 'Zayıf', min: 60, tone: 'orange', color: '#b35c00', bg: '#fff3bf' },
    { key: 'normal', label: 'Normal', short: 'Normal', min: 70, tone: 'gray', color: '#495057', bg: '#e9ecef' },
    { key: 'guclu', label: 'Güçlü', short: 'Güçlü', min: 80, tone: 'green', color: '#2b8a3e', bg: '#d3f9d8' },
    { key: 'cok-guclu', label: 'Çok güçlü', short: 'Çok güçlü', min: 90, tone: 'teal', color: '#087f5b', bg: '#c3fae8' }];
  var SPLIT_LEVEL = { key: 'bolunmeli', label: 'Bölünmesi Gerekiyor', short: 'Bölünmeli', min: null, tone: 'purple', color: '#6741d9', bg: '#e5dbff' };
  var STRENGTH_LEVELS = SCORE_LEVELS.concat([SPLIT_LEVEL]);
  var VIABLE_SCORE = 45;
  var BELOW_VIABLE = SCORE_LEVELS[0]; /* eski ad korunur (k88 «yaşama sınırı altı» → k93 «Birleştirilmeli») */
  var STRENGTH_ALIAS = { 'cok zayif': 'cok-zayif', 'cok-zayif': 'cok-zayif', 'very weak': 'cok-zayif', zayif: 'zayif', weak: 'zayif', orta: 'normal', normal: 'normal', medium: 'normal',
    guclu: 'guclu', strong: 'guclu', 'cok guclu': 'cok-guclu', 'cok-guclu': 'cok-guclu', 'very strong': 'cok-guclu',
    birlestir: 'birlestir', birlestirilmeli: 'birlestir', 'sinir-alti': 'birlestir', 'yasama siniri alti': 'birlestir', yasayamaz: 'birlestir', olu: 'birlestir', dead: 'birlestir',
    bolunmeli: 'bolunmeli', 'bolunmesi gerekiyor': 'bolunmeli', bolunmesi: 'bolunmeli', split: 'bolunmeli' };
  function strengthKeyOf(v) {
    var t = String(v == null ? '' : v).trim().toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/\s+/g, ' ');
    return STRENGTH_ALIAS[t] || null;
  }
  /** Her yazımı (eski 3/5 seviyeli değerler dahil; «sinir-alti» → Birleştirilmeli) seviye nesnesine eşler; bilinmiyorsa null. */
  function strengthLevel(v) { var k = strengthKeyOf(v); return k ? STRENGTH_LEVELS.filter(function (x) { return x.key === k; })[0] : null; }
  function levelOfScore(sc) { var o = SCORE_LEVELS[0]; SCORE_LEVELS.forEach(function (x) { if (sc >= x.min) o = x; }); return o; }
  /** Seviyenin skor aralığı: { min, max, text: '80–89' }; Bölünmesi Gerekiyor skor bandı değil → 'bölme eşiği' (arayüzde hesap gösterilmez). */
  function strengthRange(v) {
    var l = typeof v === 'object' && v ? v : strengthLevel(v); if (!l) return null;
    if (l.key === 'bolunmeli') return { min: null, max: null, text: 'bölme eşiği' };
    var i = SCORE_LEVELS.indexOf(l), nx = SCORE_LEVELS[i + 1], mx = nx ? nx.min - 1 : 100;
    return { min: l.min, max: mx, text: l.min + '–' + mx };
  }
  /* BÖLME KURALI (Bölünmesi Gerekiyor) — kaynaklar:
   *  · eXtension Bee Health «Dividing a Colony»: kalabalık, büyük nüfuslu koloni bölünür; her bölme için 3–5 yavrulu çerçeve + 1–2 bal/polen çerçevesi;
   *    zayıf koloni ve yılın geç döneminde bölme yapılmaz (kışa kadar gelişemez).
   *  · Utah State Üniv. Extension «Splitting»: ilkbaharın başında, ana nektar akımından ve oğul döneminden önce; kışı geçirmiş kalabalık kovan.
   *  · Univ. Minnesota (Reuter) «Spring Colony Divides»: ana akımdan 6–8 hafta önce; ABD 3 gövdeli kovanda ≥10 yavrulu çerçeve (Türk kovanları daha küçük:
   *    bölge ortalaması 8,6–16 arılı çerçeve, DergiPark 4656326 → mutlak eşik yerine bölge beklentisi).
   *  Uygulama kuralı: (1) muayene tarihi bölme döneminde: arılığın oğul profili penceresinin başlangıcından (pre) oğul zirvesinin sonuna (to) kadar
   *  (sıcak 20 Şub–10 May · ılıman 1 Nis–31 May · yayla 10 May–30 Haz · yüksek yayla 20 May–5 Tem); (2) arılı çerçeve ≥ en az 10 (dolu bir Langstroth gövde)
   *  ve bölge × ırk beklentisinin 1,2 katı (Güçlü düzeyinin başlangıcı); (3) yavrulu çerçeve ≥ 6 (bir bölmeye 3, ana kovana ≥ 3 kalır). */
  var SPLIT_MIN_BEES = 10, SPLIT_MIN_BROOD = 6;
  function splitWindow(apId, date) {
    var key = 'iliman'; try { key = seasonProfileKey(apId) || 'iliman'; } catch (e) { key = 'iliman'; }
    var w = SWARM_WINDOWS[key] || SWARM_WINDOWS.iliman, md = String(date || todayLocal()).slice(5, 10);
    return { profile: key, inWindow: md >= w.pre && md <= w.to, from: w.pre, to: w.to, label: mdLabel(w.pre) + '–' + mdLabel(w.to) };
  }
  /** r: güç kaydı, E: bölge × ırk beklenen arılı çerçeve (o tarihte), apId → { need, inWindow, window, minBees, minBrood } */
  function splitCheck(r, E, apId) {
    var date = String((r && r.date) || todayLocal()), bees = Number(r && r.beeFrames) || 0, brood = Number(r && r.broodFrames) || 0;
    var minBees = Math.max(SPLIT_MIN_BEES, Math.round(1.2 * (E || 8.6)));
    /* ucuz ön kontrol: çerçeve eşiği tutmuyorsa dönem hesabına (profil / arılık okuması) girilmez */
    if (bees < minBees || brood < SPLIT_MIN_BROOD) return { need: false, inWindow: null, window: '', minBees: minBees, minBrood: SPLIT_MIN_BROOD };
    var w = splitWindow(apId, date);
    return { need: w.inWindow, inWindow: w.inWindow, window: w.label, minBees: minBees, minBrood: SPLIT_MIN_BROOD };
  }
  /* YAŞAMA SINIRI (en az arılı çerçeve; altı = skor 0). Kaynaklar:
   *  · Arıcılık Yönetmeliği (Resmî Gazete 23.05.2024) md. 4/s: koloni = aktif dönemde 5–6+ arılı (3–4 yavrulu), PASİF DÖNEMDE EN AZ 3 ARILI ÇERÇEVE.
   *  · BEEHAVE (Becher ve ark. 2014, J. Appl. Ecol.) ve Martin 2001: 31 Aralık'ta < 4000 ergin arı = ölü koloni; Delaplane ve ark. 2013 (J. Apic. Res. 52(1)):
   *    tam kaplı Langstroth çerçeve ≈ 2 × 1215 = 2430 arı → 4000 arı ≈ 1,6 çerçeve.
   *  · Kuan ve ark. 2018 (Environ. Toxicol. Chem., BEEHAVE II, 156 koloni): Ekim'de < 4000 arılı kolonilerin %90'ı kışta öldü; > 19 000 arılıların %89'u yaşadı.
   *  · UK NBU: kışa en az 5 çerçeve arı önerilir (öneri, ölüm sınırı değil); NSW DPI: < 6 çerçeve soğuk bölgede kışı geçiremeyebilir.
   *  Uygulama değerleri: Nisan–Mayıs (kıştan yeni çıkmış, yavrulu) 2 çerçeve (≈ 4900 arı, BEEHAVE sınırının hemen üstü); Haziran–Ağustos 3 (yönetmelik
   *  asgari koloni); Eylül–Mart kışlama: sıcak / ılıman 3 (yönetmelik), yayla 4, yüksek yayla 5 (VARSAYIM: uzun / sert kışta kayıp büyük — Dülger 1997
   *  Erzurum kış nüfus kaybı %32–47; NBU 5). Irka göre ayrı sınır için kaynak yok (Kafkas kışlama oranı daha düşük: Cengiz & Erdoğan 2017 %56 —
   *  beklenti / kış katsayısına yansır, sınıra değil). */
  var VIABLE_WINTER = { sicak: 3, iliman: 3, yayla: 4, yuksek: 5 };
  function viableFrames(bandKey, date) {
    var m = Number(String(date || todayLocal()).slice(5, 7)) || 6;
    if (m === 4 || m === 5) return 2;
    if (m >= 6 && m <= 8) return 3;
    return VIABLE_WINTER[bandKey] || 3;
  }
  /* arılı çerçeve → skor (k93): yaşama sınırı V → 45; V ile 0,8 E ortası → 60; 0,8 E → 70; beklenen E → 75 (Normal ortası); 1,2 E → 80; 1,5 E → 90; 2 E → 100;
   * V altı → 0–44 (çerçeveyle orantılı; Birleştirilmeli). Çerçeve sınırları k88 ile aynı, yalnız skor ölçeği kaydırıldı. */
  function viaScore(b, E, V) {
    if (!(b > 0)) return 0;
    if (!(b >= V)) return Math.min(VIABLE_SCORE - 1, (VIABLE_SCORE - 1) * b / V);
    E = Math.max(E, V + 1);
    var n0 = 0.8 * E; if (n0 <= V + 0.3) n0 = V + 0.6 * (E - V);
    return interp([[V, 45], [(V + n0) / 2, 60], [n0, 70], [E, 75], [1.2 * E, 80], [1.5 * E, 90], [2 * E, 100]], b);
  }
  function isWeakClass(c) { var l = strengthLevel(c); return !!l && (l.key === 'zayif' || l.key === 'cok-zayif' || l.key === 'birlestir'); }
  function isStrongClass(c) { var l = strengthLevel(c); return !!l && (l.key === 'guclu' || l.key === 'cok-guclu' || l.key === 'bolunmeli'); }
  /* arılı çerçeve → skor (parça parça doğrusal; eşikler yukarıdaki çerçeve sayılarına oturur) */
  var BEE_ANCHORS = [[0, 0], [2.5, 20], [4.5, 40], [7.5, 60], [11.5, 80], [16, 100]];
  function beeScore(b) {
    if (b <= 0) return 0; if (b >= 16) return 100;
    for (var i = 1; i < BEE_ANCHORS.length; i++) { var a = BEE_ANCHORS[i - 1], z = BEE_ANCHORS[i]; if (b <= z[0]) return a[1] + (b - a[0]) / (z[0] - a[0]) * (z[1] - a[1]); }
    return 100;
  }
  var REL_ANCHORS = [[0, 0], [0.5, 20], [0.8, 40], [1.2, 60], [1.5, 80], [2, 100]];
  function interp(A, x) {
    if (x <= A[0][0]) return A[0][1]; if (x >= A[A.length - 1][0]) return A[A.length - 1][1];
    for (var i = 1; i < A.length; i++) { var a = A[i - 1], z = A[i]; if (x <= z[0]) return a[1] + (x - a[0]) / (z[0] - a[0]) * (z[1] - a[1]); }
    return A[A.length - 1][1];
  }
  function seasonFac(d) { var m = Number(String(d || todayLocal()).slice(5, 7)) || 6; return m === 12 || m <= 2 ? 1.15 : (m >= 6 && m <= 8 ? 0.92 : 1); }
  /* arılık ortalaması (mevsim düzeltmeli arılı çerçeve) — kayıtlar değişmedikçe önbellekten */
  var peerCache = { raw: null, byDate: {} };
  function peerAvg(hiveId, date) {
    var hv = liteHive(hiveId);
    if (!hv || !hv.apiaryId) return null;
    var raw = null; try { raw = localStorage.getItem(recKey()); } catch (e) { raw = null; }
    if (peerCache.raw !== raw) peerCache = { raw: raw, byDate: {} };
    var map = peerCache.byDate[date];
    if (!map) {
      /* tek geçiş: arılık → [{ id, v }] (v = son 45 gündeki son kaydın arılı çerçevesi ÷ cins katsayısı) */
      map = peerCache.byDate[date] = {};
      var all = loadRecordsAll(), from = addDays(date, -45);
      liteHives().forEach(function (x) {
        if (!x.apiaryId || x.colonyState === 'birlestirildi' || x.colonyState === 'sonuk') return;
        var l = ((all[String(Number(x.id))] || {}).strength || []).filter(function (q) { return q && q.date && q.date >= from && q.date <= date && Number(q.beeFrames) > 0; })
          .sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
        if (l) (map[x.apiaryId] = map[x.apiaryId] || []).push({ id: String(x.id), v: Number(l.beeFrames) / (breedEnv(x).fob || 1) });
      });
    }
    var vals = (map[hv.apiaryId] || []).filter(function (o) { return o.id !== String(hiveId); }).map(function (o) { return o.v; });
    return vals.length >= 3 ? { avg: vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, n: vals.length } : null;
  }
  /** { score 0–100, key, label, manual, auto, basis } — r.level (elle seçim) varsa seviye odur; skor yine hesaplanır.
   *  ctx: { hiveId } → arılık ortalamasına göre göreli seviye + tartı katkısı. */
  function strengthInfo(r, ctx) {
    if (!r) return null;
    var bees = Number(r.beeFrames) || 0, brood = Number(r.broodFrames) || 0, date = String(r.date || todayLocal());
    var m = Number(date.slice(5, 7)) || 6;
    var active = m >= 3 && m <= 9;
    /* mevsim (varsayım): kışın küme küçülür → aynı çerçeve daha değerli; yaz zirvesinde biraz daha az */
    var eq = bees * seasonFac(date);
    var hid0 = ctx && ctx.hiveId != null ? ctx.hiveId : (r.hiveId != null ? r.hiveId : null);
    var hv0 = hid0 != null ? liteHive(hid0) : null;
    var pa = hid0 != null ? peerAvg(hid0, date) : null, env = hv0 ? envFor(hv0, date) : null, basis, sc;
    /* 1) arılığın kendi ortalaması (cinse göre normalize) · 2) konum × cins beklentisi · 3) başlangıç beklentisi (8,6 çerçeve, ılıman) — hepsi yaşama sınırından başlar */
    var V = viableFrames(env ? env.bandKey : null, date);
    /* k89: sönük kovan (koloni kaybı kaydı) → skor 0, güç ortalamalarına girmez */
    if (hv0 && hv0.colonyState === 'sonuk' && (!hv0.sonukAt || date >= hv0.sonukAt)) return { score: 0, key: BELOW_VIABLE.key, label: 'Sönük kovan', short: 'Sönük kovan', tone: BELOW_VIABLE.tone, color: BELOW_VIABLE.color, bg: BELOW_VIABLE.bg, manual: false, auto: 'Sönük kovan', autoKey: BELOW_VIABLE.key, basis: 'sonuk', viable: V, sonuk: true };
    var E0 = env && env.fobNow ? env.fobNow : 8.6 * (m >= 4 && m <= 9 ? 1 : COLONY_ENV.OFF_SEASON);
    if (pa && pa.avg > 0) { basis = 'arilik'; sc = viaScore(bees, pa.avg * (env ? env.breed.fob : 1), V); }
    else if (env && env.fobNow) { basis = 'bolge'; sc = viaScore(bees, env.fobNow, V); }
    else { basis = 'baslangic'; sc = viaScore(bees, E0, V); }
    var alive = bees > 0 && bees >= V;
    /* yavru (aktif mevsim): yavru yok / çok az → düşür; arının yarısı kadar yavru → artır */
    if (alive && active && bees > 0) { if (brood <= 1) sc -= 10; else if (brood >= bees * 0.5) sc += 2; }
    /* tartı (aktif mevsim, son 14 gün net değişim ±2 kg) */
    var hid = hid0, TW = global.SuperAriTarti;
    if (alive && active && hid != null && TW && TW.series) {
      try {
        var d0 = addDays(String(r.date || todayLocal()), -14), pts = TW.series(hid, 400).filter(function (p) { return p.date >= d0 && p.date <= (r.date || todayLocal()); });
        if (pts.length >= 2) { var dk = pts[pts.length - 1].net - pts[0].net; if (dk >= 2) sc += 4; else if (dk <= -2) sc -= 4; }
      } catch (e) { /* ignore */ }
    }
    /* kışlama dönemi (Eyl–Mar): < 5 çerçeve en fazla Zayıf (UK NBU: kışa en az 5 çerçeve arı) */
    if (alive && !(m >= 4 && m <= 8) && bees < 5) sc = Math.min(sc, 69);
    /* yaşama sınırının üstü en az 45 (Çok zayıf); altı 0–44 (Birleştirilmeli); skor hiçbir zaman 100'ü geçmez */
    sc = alive ? Math.max(VIABLE_SCORE, Math.min(100, Math.floor(sc))) : Math.max(0, Math.min(VIABLE_SCORE - 1, Math.floor(sc)));
    var sp = alive ? splitCheck({ date: date, beeFrames: bees, broodFrames: brood }, E0, hv0 ? hv0.apiaryId : null) : null;
    var auto = sp && sp.need ? SPLIT_LEVEL : levelOfScore(sc), man = r.level ? strengthLevel(r.level) : null, lv = man || auto;
    return { score: sc, key: lv.key, label: lv.label, short: lv.short, tone: lv.tone, color: lv.color, bg: lv.bg, manual: !!man, auto: auto.label, autoKey: auto.key, basis: basis, viable: V, split: sp };
  }
  function strengthClass(r, ctx) { var i = strengthInfo(r, ctx); return i ? i.label : null; }
  /** Arayüz metni: «Güçlü · 60–79 · skor 64»; elle seçimde «Güçlü (elle) · 60–79 · skor 47 (Normal)». Formül / katsayı / çerçeve hesabı gösterilmez. */
  function strengthTag(i, short) {
    if (!i) return '';
    var rg = strengthRange(i.key), au = i.manual && i.auto !== i.label ? ' (' + i.auto + ')' : '';
    if (short) return (i.key === 'bolunmeli' && i.short ? i.short : i.label) + (i.manual ? ' (elle)' : '') + ' · ' + i.score;
    return i.label + (i.manual ? ' (elle)' : '') + (rg && i.key !== 'bolunmeli' ? ' · ' + rg.text : '') + ' · skor ' + i.score + au;
  }

  function normalizeRecord(kind, r) {
    if (!r || typeof r !== 'object') return null;
    var o = { id: txt(r.id, 40) || ('r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), date: isoDate(r.date) || todayLocal() };
    if (r.demo === true) o.demo = true;
    var note = txt(r.note, 300); if (note) o.note = note;
    var pcnt = intIn(r.photoCount, 0, 50); if (pcnt) o.photoCount = pcnt;
    /* Bakım akışı: önerinin kabul edilip edilmediği (sonradan öğrenme için) */
    if (r.akis === true) o.akis = true;
    var sg = pick(r.sug, ['kabul', 'az', 'cok', 'alternatif', 'degisti', ''], ''); if (sg) o.sug = sg;
    var sgv = numIn(r.sugVal, 0, 5000); if (sgv != null && sg) o.sugVal = sgv;
    var sgt = txt(r.sugText, 120); if (sgt && sg) o.sugText = sgt;
    if (kind === 'strength') {
      o.beeFrames = intIn(r.beeFrames, 0, 40) || 0;
      o.broodFrames = intIn(r.broodFrames, 0, 30) || 0;
      o.honeyFrames = intIn(r.honeyFrames, 0, 30) || 0;
      o.pollenFrames = intIn(r.pollenFrames, 0, 20) || 0;
      var lvk = strengthKeyOf(r.level); if (lvk) o.level = lvk; /* elle seçilen güç seviyesi (7 seviye) */
      if (r.inspection === true) o.inspection = true; /* Kolay muayene ile girildi */
      var sp = pick(r.space, ['bol', 'dolmak', 'dolu', 'kat', ''], ''); if (sp) o.space = sp; /* muayenede gözlenen yer durumu */
      var vs0 = pick(r.varroaSeen, ['az', 'cok', ''], ''); if (vs0) o.varroaSeen = vs0;
      if (r.diseaseSign === true) o.diseaseSign = true;
      return o;
    }
    if (kind === 'brood') {
      o.eggs = r.eggs === true;
      o.pattern = pick(r.pattern, ['duzenli', 'daginik'], 'duzenli');
      o.queenCell = pick(r.queenCell, ['yok', 'ogul', 'yenileme', 'acil', 'bilinmiyor'], 'yok');
      if (o.queenCell !== 'yok') {
        var cc = intIn(r.cellCount, 1, 60); if (cc) o.cellCount = cc;
        var cp = pick(r.cellCapped, ['kapali', 'acik', ''], ''); if (cp) o.cellCapped = cp;
      }
      /* Oğul memeli çerçeve sayısı (Hızlı muayene: tam sayı, 0 = yok) */
      if (r.swarmCellFrames != null && r.swarmCellFrames !== '') { var sf = Number(r.swarmCellFrames); if (isFinite(sf) && sf >= 0 && sf <= 30) o.swarmCellFrames = Math.round(sf); }
      o.queenless = r.queenless === true;
      o.chilled = r.chilled === true;
      var vs1 = pick(r.varroaSeen, ['az', 'cok', ''], ''); if (vs1) o.varroaSeen = vs1; /* Kolay muayene: gözle varroa */
      if (r.diseaseSign === true) o.diseaseSign = true; /* Kolay muayene: hastalık belirtisi işaretlendi */
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
        if (o.method === 'tabla') { var dd0 = intIn(r.days, 1, 60); if (dd0) o.days = dd0; }
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
      if (r.suspected === true) o.suspected = true; /* Hastalık tahmini (kesin değil) ile açılan şüpheli kayıt */
      var tr = txt(r.treatment, 200); if (tr) o.treatment = tr;
      o.dose = numIn(r.dose, 0, 1000);
      if (o.dose != null) o.doseUnit = pick(r.doseUnit, ['serit', 'ml', 'g'], 'serit');
      var ld = numIn(r.labelDose, 0, 1000); if (o.dose != null && ld != null && ld > 0) o.labelDose = ld; /* etiket dozu (gerçek miktar = dose) */
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
    /* güç seviyesi arılık ortalamasına göre hesaplanabilsin diye (saklanmaz) */
    out.strength.forEach(function (r) { r.hiveId = Number(hiveId); });
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
    var nk = numIn(r.netKg, 0, 100000);
    if (nk != null && nk > 0) o.netKg = nk;
    if (r.method && /^(cerceve|tarti|karma)$/.test(String(r.method))) o.method = String(r.method);
    var sb = numIn(r.scaleBeforeKg, 0, 400); if (sb != null) o.scaleBeforeKg = sb;
    var sa = numIn(r.scaleAfterKg, 0, 400); if (sa != null) o.scaleAfterKg = sa;
    return o;
  }
  function enrichHarvestEntry(e) {
    var B = global.SuperAriBalAgirlik;
    if (!B || !B.enrichHarvestRow || !e) return e;
    try { return B.enrichHarvestRow(e); } catch (err) { return e; }
  }
  function logHarvestHiveEvent(row) {
    if (!row || row.hiveId == null) return;
    var B = global.SuperAriBalAgirlik;
    var text = B && B.harvestEventText ? B.harvestEventText(row) : null;
    if (!text) {
      var kg = row.netKg != null ? row.netKg : row.honeyKg;
      if (!(Number(kg) > 0)) return;
      text = 'Sağım: ' + String(kg).replace('.', ',') + ' kg bal';
    }
    try { addHiveEvent(row.hiveId, { type: 'hasat', date: row.date, text: text }); } catch (e) { /* ignore */ }
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
    var n = normalizeHarvest(enrichHarvestEntry(e));
    if (!n) return null;
    var list = readHarvestKey(harvestKey());
    list.push(n);
    writeHarvestKey(harvestKey(), list);
    logHarvestHiveEvent(n);
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
      out = normalizeHarvest(enrichHarvestEntry(m));
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
    if (h.netKg != null) o.netKg = h.netKg;
    if (h.method) o.method = h.method;
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
    var weakAuto = isWeakClass(st.strengthClass);
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
    var sInfo = s ? strengthInfo(s, { hiveId: hiveId }) : null, cls = sInfo ? sInfo.label : null;
    var chilled = !!(b && b.chilled);
    var hf = hiveFlags()[String(Number(hiveId))] || {};
    var emergencyCell = !!(b && b.queenCell === 'acil');
    var queenless = !!(b && (b.queenless || emergencyCell) && !(hf.queenGivenAt && hf.queenGivenAt >= b.date)) || (hf.queenless === true && !hf.queenCellSince);
    var afb = latestByDisease.ayc ? latestByDisease.ayc.status : 'temiz';
    return {
      records: rec,
      strength: s, strengthClass: cls, strengthScore: sInfo ? sInfo.score : null, strengthInfo: sInfo, strengthTag: strengthTag(sInfo), strengthTagShort: strengthTag(sInfo, true),
      brood: b,
      weak: isWeakClass(cls) || chilled,
      chilled: chilled,
      queenless: queenless,
      queenCellSince: hf.queenless === true && hf.queenCellSince ? hf.queenCellSince : '',
      merged: hf.colonyState === 'birlestirildi',
      swarmCell: !!(b && b.queenCell === 'ogul'),
      supersedureCell: !!(b && b.queenCell === 'yenileme'),
      unknownCell: !!(b && b.queenCell === 'bilinmiyor'), /* meme var, yeri bilinmiyor: ORS bypass yok, yalnız «yerine bak» notu */
      emergencyCell: emergencyCell && queenless,
      cellCount: b && b.cellCount ? b.cellCount : null,
      sign: b && b.sign ? b.sign : '', queenSeen: !!(b && b.queenSeen), eggs: b ? b.eggs !== false : null,
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
  /* k129 ORS düzeyleri: <35 Düşük · 35–69 Orta · ≥70 Kritik */
  var SWARM_LEVELS = [
    { key: 'dusuk', label: 'Düşük', tone: 'ok', color: '#1b7a3d' },
    { key: 'orta', label: 'Orta', tone: 'warn', color: '#c98a00' },
    { key: 'yuksek', label: 'Yüksek', tone: 'bad', color: '#d9480f' },
    { key: 'kritik', label: 'Kritik', tone: 'crit', color: '#b3001b' } /* k154: yalnız bypass (oğul yüksüğü / Ana Arılar Ötmesi (Piping)) */
  ];
  function orsYuksek(k) { return k === 'yuksek' || k === 'kritik'; }
  /* Bölge profili: bakim-plan.js ile aynı anahtarlar (sicak / iliman / yayla / yuksek). */
  /* örnek arılıklar: yaklaşık rakım (m) — bakim-plan.js SEED_ALT ile aynı; Yanıkdağ Baluğundüzü ≈215 m kıyı → ılıman */
  var SEASON_SEED_ALT = { a1: 200, a2: 1500, a3: 2100, a4: 215, a5: 2100 };
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
    var nm = String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.koy || '')).toLocaleLowerCase('tr');
    var alt = Number(a.altitude || a.elevation || a.rakim);
    if (!(isFinite(alt) && alt > 0) && SEASON_SEED_ALT[a.id] && isSeedApiaryId(a.id)) alt = SEASON_SEED_ALT[a.id];
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
  /* k132: arılık başına elle oğul dönemi (yönetici; OGUL_SKOR.donem[apId] = { from, to: 'AA-GG', isCustomPeriod: true }). */
  function customPeriod(apId) { var d = OGUL_SKOR && OGUL_SKOR.donem && OGUL_SKOR.donem[String(apId)]; return d && d.isCustomPeriod ? d : null; }
  /* koloni-279: bölge bilinir mi (il, rakım, örnek arılık, bölge seçimi) — bal-hedef.js bolgeBilinir ile aynı tanım; bilinmiyorsa oğul mevsimi «Veri yok» */
  function swarmRegionKnown(apId, ctx) {
    var st = ctx ? (ctx.plan || (ctx.plan = planState())) : planState();
    if (st.profiles && st.profiles[apId]) return true;
    var aps = ctx ? (ctx.aps || (ctx.aps = loadApiaries())) : loadApiaries(), a = null;
    for (var i = 0; i < aps.length; i++) if (aps[i].id === String(apId)) { a = aps[i]; break; }
    if (!a) return false;
    if (String(a.il || '').trim()) return true;
    if (Number(a.altitude || a.elevation || a.rakim) > 0) return true;
    try { if (isSeedApiaryId(a.id)) return true; } catch (e) { /* */ }
    return false;
  }
  /* koloni-279: Oğul sayfası döşemeleri ayrık — mevsim dışındaki kovan yalnız «Mevsim dışı»nda sayılır (Düşük / Orta'da ayrıca sayılmaz);
     Yüksek / Kritik (oğul yüksüğü, Ana Arılar Ötmesi) mevsim dışında da kendi düzeyinde kalır. Sonbahar (çam balı) için doğrulanmış doğal oğul penceresi yok (kaynaklar yalnız yönetici). */
  function swarmBucket(a) {
    if (!a) return '';
    if (a.season && a.season.phase === 'disi' && !a.season.bilinmiyor && !orsYuksek(a.key)) return 'mevsimdisi';
    return a.key;
  }
  function swarmSeason(apId, date, ctx) {
    var key = seasonProfileKey(apId, ctx), w = SWARM_WINDOWS[key], cp = customPeriod(apId);
    if (cp) w = { pre: cp.from, from: cp.from, to: cp.to, post: cp.to };
    var md = String(date || todayLocal()).slice(5, 10);
    var phase = (md >= w.from && md <= w.to) ? 'zirve' : ((md >= w.pre && md < w.from) || (md > w.to && md <= w.post) ? 'kenar' : 'disi');
    return { profile: key, profileLabel: cp ? 'elle dönem' : PROFILE_SHORT[key], custom: !!cp, bilinmiyor: !cp && !swarmRegionKnown(apId, ctx), phase: phase, window: mdLabel(w.from) + '–' + mdLabel(w.to),
      factor: phase === 'zirve' ? 1 : (phase === 'kenar' ? 0.6 : 0.15) };
  }
  /* Irk etkisi (oğul eğilimi): melez türü ayrı değerlendirilir. */
  /* Irk = ana arının karakteri (eğilim): k125'ten beri oğul riskinin ana etkenlerinden biri. */
  /* k125: ırk oğul riskinde ana etkenlerden biri (kullanıcı ölçeği, 7 düzey). Melez = ebeveyn ırklarının ortalaması. */
  var BREED_SWARM_SCALE = [
    { key: 'kafkas', v: 1, m: ['kafkas'] },
    { key: 'buckfast', v: 2, m: ['buckfast'] },
    { key: 'efe', v: 2.5, lbl: 'çok az–az', m: ['efe arısı', 'efe arisi', 'efe'] }, /* k170: uzman tahmini (kaynak yalnız yönetici) */
    { key: 'karadeniz', v: 3, m: ['karadeniz'] },
    { key: 'italyan', v: 4, m: ['italyan'] },
    { key: 'mugla', v: 4, m: ['muğla', 'mugla'] },
    { key: 'anadolu', v: 5, m: ['anadolu'] },
    { key: 'trakya', v: 5, m: ['trakya'] },
    { key: 'karniyol', v: 5, m: ['karniyol', 'karnika', 'carnica'] },
    { key: 'iran', v: 5, m: ['iran'] },
    { key: 'yigilca', v: 6, m: ['yığılca', 'yigilca'] },
    { key: 'hatay', v: 7, m: ['hatay', 'suriye'] }
  ];
  var BREED_SWARM_LABELS = ['', 'çok çok az', 'çok az', 'az', 'orta', 'yüksek', 'çok yüksek', 'çok çok yüksek'];
  var BREED_LEVEL_KEYS = ['', 'cok-cok-dusuk', 'cok-dusuk', 'dusuk', 'orta', 'yuksek', 'cok-yuksek', 'cok-cok-yuksek'];
  /* k125: melezler ebeveyn ortalaması DEĞİL — her melezin kendi düzeyi (yayın varsa). F1 melezlerde heterosis oğulu artırabilir.
     Anahtar: ırk anahtarları alfabetik, «+» ile. Kaynak her satırda. Tabloda olmayan melez → etki yok + yöneticiye «veri eksik». */
  var HYBRID_SWARM = {
    'anadolu+kafkas': { v: 4, src: 'Yığılca çalışması (Kafkas Üniv. Vet. Fak. Derg.): ana arı yüksüğü — Anadolu ırkı melezi 13,0±7,0; Kafkas ırkı melezi 8,0±1,15; Yığılca 49,9±18,0 / koloni. Kafkas’tan belirgin yüksek, Yığılca’dan çok düşük → orta.' },
    /* k127: kullanıcının belirlediği düzeyler (arıcı deneyimi). Üçlü: (ana hattı) × erkek arı. */
    'kafkas+karadeniz': { v: 3, src: 'kullanıcı (arıcı deneyimi)' },
    'kafkas+karniyol': { v: 4, src: 'kullanıcı (arıcı deneyimi)' },
    'karniyol+mugla': { v: 5, src: 'kullanıcı (arıcı deneyimi)' },
    'kafkas+karniyol+mugla': { v: 5, src: 'kullanıcı (arıcı deneyimi)' },
    'kafkas+karadeniz+mugla': { v: 4, src: 'kullanıcı (arıcı deneyimi)' },
    'anadolu+kafkas+mugla': { v: 5, src: 'kullanıcı (arıcı deneyimi)' },
    'anadolu+kafkas+karniyol': { v: 6, src: 'kullanıcı (arıcı deneyimi)' },
    'anadolu+italyan+karniyol': { v: 6, src: 'kullanıcı (arıcı deneyimi)' },
    'buckfast+italyan+mugla': { v: 4, src: 'kullanıcı (arıcı deneyimi)' },
    /* k171: ayrıntı ve kaynak yalnız yönetici panelinde */
    'kafkas+mugla': { v: 3, src: 'kaynağa dayalı tahmin', tahmin: true },
    'karadeniz+mugla': { v: 4, src: 'uzman tahmini', tahmin: true },
    'anadolu+karadeniz': { v: 4.5, label: 'orta–yüksek', src: 'uzman tahmini', tahmin: true }
  };
  /* Buckfast ikili melezleri: az–orta (3,5), nesle göre değişir. */
  var BUCKFAST_CROSS = { v: 3.5, label: 'az–orta (nesle göre değişir)', src: 'kullanıcı (arıcı deneyimi)' };
  var IRK_EKSIK_KEY = 'superari.irk.ogulVeriEksik.v1';
  var irkEksikSeen = {};
  function irkEksikLog() { try { var m = JSON.parse(localStorage.getItem(IRK_EKSIK_KEY) || 'null'); return m && m.items ? m : { items: {} }; } catch (e) { return { items: {} }; } }
  function reportHybridMissing(key, name) {
    if (irkEksikSeen[key]) return; irkEksikSeen[key] = 1;
    try {
      var m = irkEksikLog();
      var now = new Date().toISOString(), e = m.items[key] || { name: name, first: now, count: 0 };
      e.name = name; e.last = now; e.count = (e.count || 0) + 1; m.items[key] = e;
      localStorage.setItem(IRK_EKSIK_KEY, JSON.stringify(m));
    } catch (eR) { /* ignore */ }
    scheduleIrkFlush();
  }
  /* k126: buluta (Supabase sa_report_irk_ogul_eksik → public.irk_ogul_eksik), fiyat_eksik ile aynı desen.
     Yalnız melez anahtarı + adı gider (kullanıcı/kovan verisi yok); hata olursa kayıt cihazda bekler. */
  var irkFlushT = null, irkFlushing = false, irkFlushTry = 0;
  function scheduleIrkFlush() { if (irkFlushT || typeof setTimeout !== 'function') return; irkFlushT = setTimeout(function () { irkFlushT = null; flushIrkEksik(); }, 1500); }
  function flushIrkEksik() {
    var g = typeof window !== 'undefined' ? window : globalThis, B = g.SuperAriBulut, m = irkEksikLog();
    var items = Object.keys(m.items).filter(function (k) { var e = m.items[k]; return (Number(e.count) || 0) > (Number(e.sentN) || 0); });
    if (!items.length || irkFlushing || (g.navigator && g.navigator.onLine === false)) return Promise.resolve(false);
    if (!B || !B.client || !B.session) { if (irkFlushTry++ < 3 && typeof setTimeout === 'function') setTimeout(flushIrkEksik, 6000); return Promise.resolve(false); }
    irkFlushing = true;
    var payload = items.slice(0, 30).map(function (k) { return { key: k, name: m.items[k].name, n: Number(m.items[k].count) || 0 }; });
    var v = ((g.document && g.document.querySelector && g.document.querySelector('script[src*="demo-data.js"]')) || {}).src || '';
    v = v.replace(/^.*[?&]v=/, '').slice(0, 40);
    return Promise.resolve(B.session()).then(function (s) {
      if (!s) return false;
      return B.client().then(function (c) { return c.rpc('sa_report_irk_ogul_eksik', { p_items: payload, p_version: v || null }); }).then(function (r) {
        var m2 = irkEksikLog();
        if (r && r.error) { m2.cloud = 'error'; m2.cloudErr = String(r.error.code || r.error.message || 'hata').slice(0, 80); }
        else { payload.forEach(function (p) { var e = m2.items[p.key]; if (e) e.sentN = Math.max(Number(e.sentN) || 0, p.n); }); m2.cloud = 'ok'; m2.cloudAt = new Date().toISOString(); delete m2.cloudErr; }
        try { localStorage.setItem(IRK_EKSIK_KEY, JSON.stringify(m2)); } catch (e) {}
        return !(r && r.error);
      });
    }).catch(function () { return false; }).then(function (ok) { irkFlushing = false; return ok; });
  }
  /* k129: ORS Genetik puanı (0–100). KİLİTLİ — kullanıcı onayladı; onaysız değiştirmeyin (tests/k129-genetik-kilit.test.js).
     Anahtar: ırk anahtarları alfabetik, «+» ile. Üçlü: (ana hattı) × erkek arı. Bilinmeyen melez → 55 + yöneticiye. */
  var GENETIK_SAF = { kafkas: 5, buckfast: 15, efe: 25, karadeniz: 35, italyan: 55, mugla: 55, anadolu: 75, trakya: 75, karniyol: 75, iran: 75, yigilca: 90, hatay: 100 };
  var GENETIK_MELEZ = {
    'kafkas+karadeniz': 35, 'anadolu+kafkas': 55, 'kafkas+karniyol': 55, 'karniyol+mugla': 75, 'anadolu+karniyol': 75, 'anadolu+mugla': 75, 'italyan+karniyol': 65,
    /* k171: kullanıcı onaylı — kafkas+mugla kaynağa dayalı tahmin; karadeniz melezleri uzman tahmini (kaynak yalnız yönetici) */
    'kafkas+mugla': 35, 'karadeniz+mugla': 55, 'anadolu+karadeniz': 65,
    'kafkas+karadeniz+mugla': 55, 'buckfast+italyan+mugla': 55, 'kafkas+karniyol+mugla': 75, 'anadolu+kafkas+mugla': 75, 'anadolu+kafkas+karniyol': 90, 'anadolu+italyan+karniyol': 90
  };
  var GENETIK_BUCKFAST_IKILI = 45, GENETIK_BILINMEYEN = 55;
  /* k290: kilitli tablo dışı takma ad (puan uydurulmaz, en yakın kilitli basamak): efe+kafkas → anadolu+kafkas, yalnız yönlü «Efe ana × Kafkas baba» kaydında (yönsüz «Efe arısı × Kafkas» k168 gereği Veri yok kalır; uzman tahmini) */
  var GENETIK_TAKMA = { 'efe+kafkas': 'anadolu+kafkas' };
  /* k168: tescilli ama sayısal puanı yayımlanmamış ırk/ekotipler — puan uydurulmaz, Genetik «Veri yok» (ağırlık dağıtılır). Kaynak yalnız yönetici panelinde. */
  var IRK_PUANSIZ = [
    { key: 'efe', m: ['efe'], ad: 'Efe arısı', genetik: 25, olcek: '2–3', durum: 'uzman tahmini', dil: '6,05 ± 0,21 mm (Resmî Gazete 16.05.2019 sa. 30776 EK-1)', tur: 'Apis mellifera anatoliaca — Ege/Batı Anadolu ekotipi (eski adı Batı Ege arısı)',
      ozet: 'Tescil: 16.05.2019 Resmî Gazete 30776 (Ege Tarımsal Araştırma Enstitüsü). Yayılış: Ege, Akdeniz, Marmara, Orta Anadolu. Islahla bölge arılarına göre koloni indeksi %20, bal verimi %25 yüksek; çamdan bal toplama eğilimi yüksek, hırçın değil, hastalıklara dayanıklı, oğul verme eğilimi çok düşük, kışlatma yüksek, ilkbahar gelişimi hızlı (nitel). Genetik 25 / oğul ölçeği 2–3: uzman tahmini (kaynakta sayısal oğul puanı yok; «oğul eğilimi düşük/çok düşük» → Buckfast 15 ile Karadeniz 35 arası).',
      kaynak: ['Resmî Gazete 16.05.2019 sayı 30776 EK-1 (dil uzunluğu 6,05 ± 0,21 mm; «Oğul eğilimi düşüktür»; «Orta derecede uysaldır») — https://www.resmigazete.gov.tr/eskiler/2019/05/20190516-14-1.pdf',
        'T.C. Tarım ve Orman Bakanlığı TAGEM, «Gökçeada ve Efe Arısı Ekotipleri Tescil Edildi», 20.05.2019 — https://www.tarimorman.gov.tr/TAGEM/Haber/478/Gokceada-Ve-Efe-Arisi-Ekotipleri-Tescil-Edildi',
        'Resmî Gazete 16.05.2019 sayı 30776, Evcil Hayvan Genetik Kaynakları Tescil Komitesi Kararı',
        'Resmî Gazete 14.10.2020, Tebliğ No 2020/22 (Efe Arısı Ekotipi Ek-60)'] }
  ];
  function irkPuansiz(b) { b = String(b || '').toLocaleLowerCase('tr'); return IRK_PUANSIZ.filter(function (x) { return x.genetik == null; }).filter(function (x) { return x.m.some(function (w) { return new RegExp('(^|[^a-zçğıöşü])' + w + '([^a-zçğıöşü]|$)').test(b); }); }); }
  var ORS_WEIGHTS = { genetik: 0.30, sikisiklik: 0.40, mevsim: 0.15, anaYasi: 0.15 };
  /* k130: yönetici ayarları (Supabase public.ogul_skor_ayar, id 1) — cihaz önbelleği; yoksa yukarıdaki varsayılanlar. */
  var OGUL_SKOR_KEY = 'superari.ogul.skor.v1';
  var GENETIK_ADLAR = { kafkas: 'Kafkas', buckfast: 'Buckfast', karadeniz: 'Karadeniz', italyan: 'İtalyan', mugla: 'Muğla', anadolu: 'Anadolu', trakya: 'Trakya', karniyol: 'Karniyol', iran: 'İran', yigilca: 'Yığılca', hatay: 'Hatay / Suriye',
    'kafkas+karadeniz': 'Kafkas × Karadeniz', 'anadolu+kafkas': 'Kafkas × Anadolu', 'kafkas+karniyol': 'Kafkas × Karniyol (iki yön)', 'karniyol+mugla': 'Karniyol × Muğla', 'anadolu+karniyol': 'Anadolu × Karniyol', 'anadolu+mugla': 'Anadolu × Muğla', 'italyan+karniyol': 'İtalyan × Karniyol',
    'kafkas+karadeniz+mugla': '(Kafkas × Karadeniz) × Muğla', 'buckfast+italyan+mugla': '(Buckfast × İtalyan) × Muğla', 'kafkas+karniyol+mugla': '(Kafkas × Karniyol) × Muğla', 'anadolu+kafkas+mugla': '(Kafkas × Anadolu) × Muğla', 'anadolu+kafkas+karniyol': '(Kafkas × Anadolu) × Karniyol', 'anadolu+italyan+karniyol': '(Karniyol × İtalyan) × Anadolu' };
  function num01(v, lo, hi) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : null; }
  /* k131: sensörlü mod eşikleri (yönetici düzenler). Sensör yoksa ORS cihazsız modda (KİLİTLİ) kalır. */
  var ORS_SENSOR = { /* k262: ana yaşı oğul puanı (uzman tahmini) + ırk başına değişim yaşı / 3. yaş riski (1 düşük · 2 orta · 3 yüksek · 4 çok yüksek) */
    anaYasPuan0: 20, anaYasPuan1: 60, anaYasPuan2: 100,
    anaDegBuckfast: 2, anaDegKarniyolMugla: 2, anaDegKafkasKarniyol: 2, anaDegKarniyol: 2, anaDegItalyan: 2, anaDegKafkasKaradeniz: 2, anaDegKaradeniz: 2, anaDegAnadolu: 2, anaDegKafkas: 2, anaDegVarsayilan: 2,
    anaRisk3Buckfast: 4, anaRisk3KarniyolMugla: 3, anaRisk3KafkasKarniyol: 3, anaRisk3Karniyol: 3, anaRisk3Italyan: 3, anaRisk3KafkasKaradeniz: 2, anaRisk3Karadeniz: 2, anaRisk3Anadolu: 3, anaRisk3Kafkas: 1, anaRisk3Varsayilan: 2,
    /* koloni-241: sensör geçmişi saklama (uzman tahmini) */ hamSaklaGun: 30, hiveSensGun: 21, ozetSaklaGun: 400, /* koloni-236: varsayılan okuma sıklığı (tek kaynak) */ okumaIsiNemDk: 30, okumaTartiDk: 15, okumaEsekHizliDk: 2, /* koloni-242: diğer sensörlerin okuma sıklığı (tek kaynak) */ okumaSesDk: 3, okumaTitDk: 3, okumaIrDk: 5, okumaGirisSicakDk: 30, okumaDisHavaDk: 30, okumaPilDk: 240, okumaKameraDk: 1440, okumaGatewayDk: 10, /* koloni-233: 5 IR giriş sayacı kuralı (tek kaynak) */ ilacPencereDk: 60, ilacTabanGun: 5, ilacGirisKat: 2, ilacCikisOran: 0.7, ilacMinTaban: 20, donmeYumusakGun: 3, donmeTabanGun: 7, donmeFark: 0.1, donmeMinCikis: 200, aktiviteTabanGun: 14, aktiviteMinGun: 7, aktiviteGun: 3, aktiviteOran: 0.5, sayacSaat: 2, sayacMinDiger: 50, sayacDengeOran: 0.5, sayacGun: 2, ogulCiktiDk: 10, ogulCiktiNet: 2000, ogulDonusDk: 60, ogulDonusOran: 0.3, ogulKgDusus: 1, /* koloni-232: 4 titreşim kuralı (tek kaynak) */ titOgulGeceBas: 0, titOgulGeceSon: 5, titOgulHzMin: 20, titOgulHzMax: 800, titOgulGun: 10, titOgulTabanGun: 7, titOgulArtisOran: 1.3, titOgulArtisGece: 3, titTootHzMin: 200, titTootHzMax: 550, titQuackHzMin: 300, titQuackHzMax: 350, titOtmeSiraSaat: 48, titDarbeHzMin: 200, titDarbeHzMax: 400, titDarbeMinMs: 50, titDarbeMaxMs: 200, titDarbePencereDk: 10, titDarbeKat: 5, titDarbeMinSay: 10, titSpikeG: 2, titKisAyBas: 11, titKisAySon: 3, titKisTabanGun: 14, titKisSaat: 24, titKisOran: 0.1, /* koloni-231: 5 yeni sensör kuralı (tek kaynak) */ sonukGun: 2, sonukSalinimOran: 0.7, sonukDisMinC: 6, sonukIrGunMax: 50, sonukAgirlikKg: 0.3, yavrusuzSalinimC: 3, yavrusuzGun: 2, tarlaciSaatBas: 7, tarlaciPencereSaat: 3, tarlaciTabanGun: 7, tarlaciMinKg: 0.1, tarlaciOran: 0.4, tarlaciGun: 2, esekSicakDegisimC: 0.5, esekEslesDk: 10, esekTitresimKat: 1.5, esekTitTabanDk: 60, esekGirisYuksekC: 44, esekIrOran: 0.5, esekIrPencereDk: 60, esekIrTabanDk: 120, esekIrAyBas: 7, esekIrAySon: 10, havaSaat: 6, havaSicakC: 36, havaYogusmaRh: 85, havaYogusmaFarkC: 15, havaYogusmaAyBas: 11, havaYogusmaAySon: 3, /* koloni-227: 4 yeni ses kuralı (tek kaynak) */ ogulOn110HzMin: 100, ogulOn110HzMax: 120, ogulOn110ArtisDb: 3, ogulOnBaskinHz: 300, ogulOnBaskinTolHz: 30, ogulOnSicakAltC: 33, ogulOnSicakUstC: 35, ogulOnSicakDusC: 32, ogulOnSaat: 24, otmeSessizGunMin: 4, otmeSessizGunMax: 7, otmeSiraSaat: 48, dursunHzMin: 300, dursunHzMax: 450, dursunMinMs: 50, dursunMaxMs: 200, dursunPencereDk: 10, dursunKat: 3, dursunMinSay: 10, esekHzMin: 4500, esekHzMax: 7300, esekTemelHz: 499, esekSureMs: 620, esekSureTolMs: 300, esekMinSay: 3, esekPencereDk: 5, esekMinOrneklemeHz: 32000, batOrtaGun: 14, batYuksekGun: 7, batTabanOran: 0.3, batIlkGun: 7, batIlkDusus: 2, gwOrtaGun: 7, gwYuksekGun: 3, batErkenGun: 30, batSezonArtiGun: 7, batGorevOnceGun: 2, batSarjArtis: 30, batBittiPct: 10, tasNegGun: 3, tasNetEsikKg: 0, tasErkenGun: 30, tasHazirlikGun: 3, rotaHasatAg: 0.5, rotaTartiAg: 0.5, rotaPencere: 7, rotaMinGun: 14, aniKayipKg: 3, aniKayipSaat: 6, suGuvenliM: 500, suRiskliM: 1500, suRiskAgirlik: 0.6, suUzakMod: 'alta', veriYokCarpan: 0.8, alanDogalOran: 0.5, varroaSayimGun: 30, kulucka0Rakim: 500, kulucka1Rakim: 1200, pipingHzMin: 400, pipingHzMax: 500, pipingDk: 1, pipingAraSn: 60,
    tempHigh: 36, tempHighSaat: 6, tempHighArti: 10,
    riseMin: 37, riseMax: 38.5, riseDelta: 1.5, riseSaat: 3, riseArti: 15,
    nemHigh: 75, nemArti: 10,
    kiloHizli: 1.5, kiloPlato: 0.3, ariYuksekOran: 0.8, kiloArti: 15,
    ariTrendOran: 0.9, ariTrendArti: 15, ariCerceve: 2500, ariZirveOran: 0.9,
    nektarKg: 1,
    /* k146: Vakvaklama (Quacking) + Anasızlık Uğultusu (Queenless Roar) + yanlış alarm filtresi */
    quackHzMin: 200, quackHzMax: 350, quackHeceMinMs: 100, quackHeceMaxMs: 200, quackHeceSay: 3, quackPencereDk: 30,
    anasizHzMin: 300, anasizHzMax: 400, anasizDk: 10, anasizArtisDb: 6,
    darbeMaxMs: 1000,
    /* k148 KİLİTLİ 2026-10-14: kovan içi ses protokolü */
    tabanGunduzHzMin: 100, tabanGunduzHzMax: 300, tabanGeceHzMin: 25, tabanGeceHzMax: 150, gunduzSaatBas: 7, gunduzSaatSon: 19,
    pipingAramaHzMin: 340,
    isciOtmeHzMin: 100, isciOtmeHzMax: 250, isciOtmeMinMs: 500, isciOtmeMaxMs: 1200, isciOtmeSay: 3, isciOtmePencereDk: 10,
    ogulAniHzMin: 500, ogulAniHzMax: 600, ogulAniArtisDb: 6, ogulAniDk: 2,
    /* k149 sensörlü Sıkışıklık alt skoru ağırlıkları (eksik sensörün payı orantılı dağıtılır) */
    sikW_tarti: 30, sikW_ir: 25, sikW_ses: 20, sikW_isi: 15, sikW_nem: 10,
    tartiBosKutuKg: 8, tartiDoluKutuKg: 30, nemDisMax: 85, irSapmaOran: 0.5,
    disYagmurMm: 1, disYagmurPr: 60, disYagmurSonraSaat: 3, disNemYuksek: 85, nemDisNemCarpan: 0.5, nemYagmurCarpan: 0, disSicakYuksek: 35, isiDisSicakCarpan: 0.5, irYagmurdaCikar: 1, sesSapmaDb: 6, nemSapma: 15, yuksekKat: 0.5,
    ogulSonrasiDusDb: 6,
    ogulKaymaHz: 20, yelpazeHzMin: 150, yelpazeHzMax: 195, yelpazeOran: 0.4, saglikUyariDb: 4, saglikKritikDb: 7,
    /* k180: Varroa hatırlatması — bant Yıldız & Karabağ 2026 (model özelliği); sapma eşiği uzman tahmini */
    varroaHzMin: 122, varroaHzMax: 396, varroaSapmaDb: 4, varroaGun: 7,
    /* k182: Kireç riski (Flores ve ark. 1996; süre uzman tahmini) ve genel koloni kontrolü (nüfus uyarı %20 / kritik %30, uzman tahmini) — haftada en çok bir görev */
    kirecIsiC: 30, kirecSaat: 24, kirecAyBas: 3, kirecAySon: 8, kirecNemYuksek: 80, hatirlatmaGun: 7,
    genelKayipKat: 2, genelKayipMinKg: 0.5, genelNufusUyariOran: 0.2, genelNufusKritikOran: 0.3, genelAyBas: 11, genelAySon: 5,
    /* k192: Kuluçka sıcaklığı — bant 33–36 °C (Kleinhenz ve ark. 2003, doi:10.1242/jeb.00680); süre/oynaklık/dönem uzman tahmini; yalnız kuluçkalıktaki sensör */
    kuluckaHedefC: 34.5, kuluckaUyariAltC: 34, kuluckaUyariUstC: 35, kuluckaAltC: 33, kuluckaUstC: 36, kuluckaSaat: 6, kuluckaOynaklikC: 2, kuluckaOynaklikSaat: 24, kuluckaAyBas: 3, kuluckaAySon: 8, kuluckaAcilC: 30, kuluckaAcilSaat: 6,
    /* koloni-199: eksik eşikler — tümü uzman tahmini (kullanıcı onayı 2026-10-17) */
    nemNormalAlt: 60, nemNormalUst: 75, nemDisiSaat: 24, nemKirecUst: 80, nemKritikAlt: 55,
    irOgulNetCikis: 5000, irOgulDk: 30, irYagmaOran: 2, irYagmaDk: 30, irTrafikOran: 0.3, irTrafikGun: 2,
    titresimKat: 3, titresimDk: 15,
    /* koloni-217: Uçuş havası arı cinsine göre — tüm değerler uzman tahmini (ırka özgü hakemli uçuş eşiği bulunamadı; genel A. mellifera: Burrill & Dietz 1981 9 °C altında uçuş yok, Vicens & Bosch 2000 12–14 °C). Melez: ebeveynlerin daha ihtiyatlı (yüksek sıcaklık, düşük rüzgar/yağış) değeri. */
    ucusGenelUygunC: 15, ucusGenelKismenC: 12, ucusGenelUygunRuzgar: 20, ucusGenelKismenRuzgar: 30, ucusGenelYagisMm: 1, ucusKafkasUygunC: 14, ucusKafkasKismenC: 10, ucusKafkasUygunRuzgar: 20, ucusKafkasKismenRuzgar: 30, ucusKafkasYagisMm: 1, ucusKarniyolUygunC: 14, ucusKarniyolKismenC: 10, ucusKarniyolUygunRuzgar: 20, ucusKarniyolKismenRuzgar: 30, ucusKarniyolYagisMm: 1, ucusKaradenizUygunC: 14, ucusKaradenizKismenC: 11, ucusKaradenizUygunRuzgar: 20, ucusKaradenizKismenRuzgar: 30, ucusKaradenizYagisMm: 1, 
    /* koloni-249: uçuş mevsimi (sezon) + saatlik değerlendirme. Temizlik uçuşu alt sıcaklığı: Burrill & Dietz 1981, Apidologie 12:319 (9 °C altında uçuş yok; kışın 9,3 °C üstü uçuş: J. Apiculture 2024, doi:10.17519/apiculture.2024.11.39.4.317).
       Uygun saat güneş ışınımı: Vicens & Bosch 2000, Environ. Entomol. 29:413 (A. mellifera 12–14 °C ve ~300 W/m²'de etkin). Uygun gün en az saat: uzman tahmini.
       Bölge mevsimi (AAGG sayı, ör. 920 = 20 Eyl): bakım takvimi profillerinden (ilkbahar gelişimi başı → kışlatma başı) — uzman tahmini; Erzurum/Tortum çiçeklenme Haziran–Ağustos (Arıcılık Araştırma Enstitüsü 2022). */
    ucusTemizlikC: 9, ucusIsinimW: 300, ucusSaatMin: 3,
    ucusSezonSicakBas: 201, ucusSezonSicakSon: 1101, ucusSezonCamSon: 1130, ucusSezonIlimanBas: 315, ucusSezonIlimanSon: 1001, ucusSezonYaylaBas: 415, ucusSezonYaylaSon: 920, ucusSezonYuksekBas: 501, ucusSezonYuksekSon: 915,
    sessizOkuma: 3, sessizMinDk: 60, sessizKirmiziDk: 180, kopukSaat: 24,
    arizaAltEksiC: 40, arizaUstC: 85, arizaAyniSaat: 6, arizaSicramaC: 10 };
  var ORS_SENSOR_ADLAR = { anaYasPuan0: 'Oğul skoru · ana yaşı puanı: bu yılın anası (0–100, uzman tahmini; yön: Simpson 1957/1960, Akyol 2008)', anaYasPuan1: 'Oğul skoru · ana yaşı puanı: 1 yaş (uzman tahmini)', anaYasPuan2: 'Oğul skoru · ana yaşı puanı: 2 yaş ve üstü (uzman tahmini)',
    anaDegKafkas: 'Ana değişim yaşı · Kafkas (yıl; AAE 2022 genel öneri, Güler 2017)', anaDegAnadolu: 'Ana değişim yaşı · Anadolu (yıl; Akyol 2008 + AAE 2022)', anaDegVarsayilan: 'Ana değişim yaşı · tabloda olmayan ırk (yıl; AAE 2022)',
    hamSaklaGun: 'Sensör geçmişi: ham okumalar telefonda (gün) (uzman tahmini) — sunucuda süresiz', hiveSensGun: 'Sensör geçmişi: kuralların baktığı ham pencere (gün) (uzman tahmini)', ozetSaklaGun: 'Sensör geçmişi: günlük özetler telefonda (gün) (uzman tahmini) — sunucuda süresiz', okumaIsiNemDk: 'Okuma sıklığı: kovan içi sıcaklık + nem (dk) (uzman tahmini)', okumaSesDk: 'Okuma sıklığı: ses (mikrofon) ortalama spektrum kaydı (dk) (uzman tahmini; titreşimdeki 3 dk ortalamayla aynı). Dinleme sürekli; piping / tıslama / dur sinyali olay anında gönderilir', okumaTitDk: 'Okuma sıklığı: titreşim (ivmeölçer) ortalama spektrum (dk) · Ramsey 2020 (sürekli kayıt, 3 dk ortalama; gece 00–05). Ötme / darbe olay anında gönderilir', okumaIrDk: 'Okuma sıklığı: giriş sayacı giren / çıkan ayrı toplama (dk) (uzman tahmini; oğul çıktı penceresine en az 2 dilim)', okumaGirisSicakDk: 'Okuma sıklığı: giriş sıcaklığı (dk) (uzman tahmini; tıslama/titreşimde eşek hızlı okuma bunu da kapsar)', okumaDisHavaDk: 'Okuma sıklığı: dış hava sensörü sıcaklık + nem (dk) (uzman tahmini)', okumaPilDk: 'Okuma sıklığı: pil okuma (dk) (uzman tahmini)', okumaKameraDk: 'Okuma sıklığı: kamera fotoğrafı (dk) (uzman tahmini; günde 1)', okumaGatewayDk: 'Okuma sıklığı: gateway buluta gönderim (dk) (uzman tahmini; oğul çıktı penceresi kadar; acil olaylar beklemeden gönderilir)', okumaTartiDk: 'Okuma sıklığı: tartı (dk) · Meikle 5–15 dk aralığı; 15 uzman tahmini', okumaEsekHizliDk: 'Eşek arısı: tıslama/titreşim tetiklenince sıcaklık hızlı okuma (dk) (uzman tahmini; 30 dk tabanda ±0,5 °C / 10 dk yakalanmaz)', ilacPencereDk: 'İlaçlama şüphesi: pencere (dk) (uzman tahmini)', ilacTabanGun: 'İlaçlama şüphesi: taban için önceki gün (uzman tahmini)', ilacGirisKat: 'İlaçlama şüphesi: giren ≥ tabanın katı (uzman tahmini)', ilacCikisOran: 'İlaçlama şüphesi: çıkan ≤ tabanın oranı (uzman tahmini)', ilacMinTaban: 'İlaçlama şüphesi: taban en az giren (arı) (uzman tahmini)', donmeYumusakGun: 'Dönmeyen tarlacı: yumuşatma (gün) (uzman tahmini)', donmeTabanGun: 'Dönmeyen tarlacı: taban (gün) (uzman tahmini)', donmeFark: 'Dönmeyen tarlacı: dönüş oranı tabanın bu kadar altı (uzman tahmini)', donmeMinCikis: 'Dönmeyen tarlacı: günlük en az çıkış (arı) (uzman tahmini)', aktiviteTabanGun: 'Düşük aktivite: öğrenme (uygun gün) (uzman tahmini)', aktiviteMinGun: 'Düşük aktivite: en az öğrenme günü (uzman tahmini)', aktiviteGun: 'Düşük aktivite: art arda uygun gün (uzman tahmini)', aktiviteOran: 'Düşük aktivite: beklenenin oranı altı (uzman tahmini)', sayacSaat: 'Sayaç arızası: kanal sıfır süresi (saat) (uzman tahmini)', sayacMinDiger: 'Sayaç arızası: diğer kanallar en az (arı) (uzman tahmini)', sayacDengeOran: 'Sayaç arızası: günlük giren/çıkan dengesizlik oranı (uzman tahmini)', sayacGun: 'Sayaç arızası: dengesiz gün (uzman tahmini)', ogulCiktiDk: 'Oğul çıktı (IR): pencere (dk) (uzman tahmini)', ogulCiktiNet: 'Oğul çıktı (IR): net çıkış en az (arı) (uzman tahmini)', ogulDonusDk: 'Oğul çıktı (IR): dönüş penceresi (dk) (uzman tahmini)', ogulDonusOran: 'Oğul çıktı (IR): dönen oran en çok (uzman tahmini)', ogulKgDusus: 'Oğul çıktı (IR): tartı doğrulama düşüşü (kg) (uzman tahmini)', titOgulGeceBas: 'Titreşim oğul hazırlığı: gece başlangıç saati · Ramsey 2020 (00–05)', titOgulGeceSon: 'Titreşim oğul hazırlığı: gece bitiş saati · Ramsey 2020 (00–05)', titOgulHzMin: 'Titreşim oğul hazırlığı: alt bant (Hz) · Bencsik 2011 25–800 Hz + Ramsey 2020 en güçlü ~20–24 Hz', titOgulHzMax: 'Titreşim oğul hazırlığı: üst bant (Hz) · Bencsik 2011', titOgulGun: 'Titreşim oğul hazırlığı: bakılan süre (gün) · Bencsik 2011 (~10 gün önce)', titOgulTabanGun: 'Titreşim oğul hazırlığı: kendi taban (gün) (uzman tahmini)', titOgulArtisOran: 'Titreşim oğul hazırlığı: gece seviyesi tabanın katı (uzman tahmini)', titOgulArtisGece: 'Titreşim oğul hazırlığı: art arda artan gece (uzman tahmini)', titTootHzMin: 'Titreşim ana ötmesi: tooting alt (Hz) · Ramsey 2020', titTootHzMax: 'Titreşim ana ötmesi: tooting üst (Hz) · Ramsey 2020 (~400)', titQuackHzMin: 'Titreşim ana ötmesi: quacking alt (Hz) · Ramsey 2020', titQuackHzMax: 'Titreşim ana ötmesi: quacking üst (Hz) · Ramsey 2020', titOtmeSiraSaat: 'Titreşim ana ötmesi: tooting→quacking penceresi (saat) (uzman tahmini)', titDarbeHzMin: 'Titreşim darbe: kısa sinyal alt (Hz) · Ramsey 2017', titDarbeHzMax: 'Titreşim darbe: kısa sinyal üst (Hz) · Ramsey 2017', titDarbeMinMs: 'Titreşim darbe: en kısa sinyal (ms) · Ramsey 2017', titDarbeMaxMs: 'Titreşim darbe: en uzun sinyal (ms) · Ramsey 2017', titDarbePencereDk: 'Titreşim darbe: pencere (dk) (uzman tahmini)', titDarbeKat: 'Titreşim darbe: kendi tabanının katı (uzman tahmini)', titDarbeMinSay: 'Titreşim darbe: pencerede en az sinyal (uzman tahmini)', titSpikeG: 'Titreşim darbe: tek ivme sıçraması ≥ (g) (uzman tahmini)', titKisAyBas: 'Kış hareketsizliği: başlangıç ayı (uzman tahmini)', titKisAySon: 'Kış hareketsizliği: bitiş ayı (uzman tahmini)', titKisTabanGun: 'Kış hareketsizliği: kendi taban (gün) (uzman tahmini)', titKisSaat: 'Kış hareketsizliği: kesintisiz süre (saat) (uzman tahmini)', titKisOran: 'Kış hareketsizliği: tabanın bu oranının altı (sıfıra yakın) (uzman tahmini)', sonukGun: 'Koloni sönmüş: art arda gün (uzman tahmini)', sonukSalinimOran: 'Koloni sönmüş: iç günlük salınım ≥ dış salınımın oranı (uzman tahmini)', sonukDisMinC: 'Koloni sönmüş: dış günlük salınım en az (°C) (uzman tahmini)', sonukIrGunMax: 'Koloni sönmüş: günlük giriş trafiği en çok (arı) (uzman tahmini)', sonukAgirlikKg: 'Koloni sönmüş: günlük ağırlık oynaması en çok (kg) (uzman tahmini)', yavrusuzSalinimC: 'Yavrusuz/anasız: kuluçka günlük salınımı ≥ (°C) (uzman tahmini)', yavrusuzGun: 'Yavrusuz/anasız: art arda gün (uzman tahmini)', tarlaciSaatBas: 'Tarlacı kaybı: sabah çıkış penceresi başlangıcı (saat) (uzman tahmini)', tarlaciPencereSaat: 'Tarlacı kaybı: pencere uzunluğu (saat) (uzman tahmini)', tarlaciTabanGun: 'Tarlacı kaybı: taban (önceki uygun gün sayısı) (uzman tahmini)', tarlaciMinKg: 'Tarlacı kaybı: taban sabah düşüşü en az (kg) (uzman tahmini)', tarlaciOran: 'Tarlacı kaybı: düşüş tabanın bu oranının altı (uzman tahmini)', tarlaciGun: 'Tarlacı kaybı: art arda uygun gün (uzman tahmini)', esekSicakDegisimC: 'Eşek arısı: kısa sürede sıcaklık değişimi (artış ya da düşüş) ≥ (°C) (uzman tahmini)', esekEslesDk: 'Eşek arısı: sıcaklık + tıslama + titreşim aynı pencerede (dk) (uzman tahmini)', esekTitresimKat: 'Eşek arısı: titreşim önceki tabanın katı (uzman tahmini)', esekTitTabanDk: 'Eşek arısı: titreşim taban penceresi (dk) (uzman tahmini)', esekGirisYuksekC: 'Eşek arısı: giriş sensörü varsa ek işaret — giriş sıcaklığı > (°C) · Ono 1995 / Käfer 2012 (top 44–47 °C)', esekIrOran: 'Eşek arısı (tıslamasız yedek): çıkan trafik tabanın bu oranının altı (uzman tahmini)', esekIrPencereDk: 'Eşek arısı (tıslamasız yedek): çıkan penceresi (dk) (uzman tahmini)', esekIrTabanDk: 'Eşek arısı (tıslamasız yedek): çıkan taban penceresi (dk) (uzman tahmini)', esekIrAyBas: 'Eşek arısı (tıslamasız yedek): sezon başlangıç ayı (uzman tahmini) · Requier 2019 / Monceau 2013', esekIrAySon: 'Eşek arısı (tıslamasız yedek): sezon bitiş ayı (uzman tahmini) · Requier 2019 / Monceau 2013', havaSaat: 'Havalandırma: kesintisiz süre (saat) (uzman tahmini)', havaSicakC: 'Havalandırma: kuluçka sıcaklığı üstü (°C) (uzman tahmini)', havaYogusmaRh: 'Havalandırma: yoğuşma nemi ≥ (%) (uzman tahmini)', havaYogusmaFarkC: 'Havalandırma: iç−dış sıcaklık farkı ≥ (°C) (uzman tahmini)', havaYogusmaAyBas: 'Havalandırma: soğuk dönem başlangıç ayı (uzman tahmini)', havaYogusmaAySon: 'Havalandırma: soğuk dönem bitiş ayı (uzman tahmini)', ogulOn110HzMin: 'Oğul öncesi: ~110 Hz bandı alt (Hz) · bant genişliği (uzman tahmini)', ogulOn110HzMax: 'Oğul öncesi: ~110 Hz bandı üst (Hz) · bant genişliği (uzman tahmini)', ogulOn110ArtisDb: 'Oğul öncesi: 110 Hz güç artışı (dB) (uzman tahmini)', ogulOnBaskinHz: 'Oğul öncesi: baskın frekans hedefi (Hz) · Ferrari 2008', ogulOnBaskinTolHz: 'Oğul öncesi: baskın frekans toleransı (Hz) (uzman tahmini)', ogulOnSicakAltC: 'Oğul öncesi: başlangıç sıcaklığı (°C) · Ferrari 2008', ogulOnSicakUstC: 'Oğul öncesi: yükselen sıcaklık (°C) · Ferrari 2008', ogulOnSicakDusC: 'Oğul sonrası: düşen sıcaklık (°C) · Ferrari 2008', ogulOnSaat: 'Oğul öncesi: karşılaştırma penceresi (saat) (uzman tahmini)', otmeSessizGunMin: 'Oğuldan sonra ötmesiz normal süre alt (gün) · Ramsey 2020', otmeSessizGunMax: 'Oğuldan sonra ötmesiz normal süre üst (gün) · Ramsey 2020', otmeSiraSaat: 'Quacking öncesi tooting arama penceresi (saat) (uzman tahmini)', dursunHzMin: 'Dur sinyali alt (Hz) (uzman tahmini)', dursunHzMax: 'Dur sinyali üst (Hz) (uzman tahmini)', dursunMinMs: 'Dur sinyali en kısa darbe (ms) (uzman tahmini)', dursunMaxMs: 'Dur sinyali en uzun darbe (ms) (uzman tahmini)', dursunPencereDk: 'Darbe/sarsıntı sonrası pencere (dk) (uzman tahmini)', dursunKat: 'Aynı gece/gündüz tabanının katı (uzman tahmini)', dursunMinSay: 'Pencerede en az dur sinyali (uzman tahmini)', esekHzMin: 'Eşek arısı tıslaması baskın alt (Hz) · Papachristoforou 2008 (5,9±1,4 kHz)', esekHzMax: 'Eşek arısı tıslaması baskın üst (Hz) · Papachristoforou 2008 (5,9±1,4 kHz)', esekTemelHz: 'Tıslama temel frekansı (Hz, bilgi) · Papachristoforou 2008 (499±67)', esekSureMs: 'Tıslama süresi (ms) · Papachristoforou 2008 (~0,62 sn)', esekSureTolMs: 'Süre toleransı (ms) (uzman tahmini)', esekMinSay: 'Pencerede en az tıslama (uzman tahmini)', esekPencereDk: 'Tıslama penceresi (dk) (uzman tahmini)', esekMinOrneklemeHz: 'Mikrofon en düşük örnekleme (Hz) · Nyquist (5,9 kHz + yayılım)', gwOrtaGun: 'Gateway pili: kalan gün ≤ → Orta (uzman tahmini)', gwYuksekGun: 'Gateway pili: kalan gün ≤ → Yüksek (uzman tahmini)', batErkenGun: 'Pil: tarih yoksa sıklık önerisi kalan gün < (uzman tahmini)', batSezonArtiGun: 'Pil: ayrılış yoksa hedef = bal sezonu sonu + gün (uzman tahmini)', batGorevOnceGun: 'Pil: «Pili değiştir» görevi tahmini bitişten gün önce (uzman tahmini)', batSarjArtis: 'Pil: şarj sayılan artış (puan, uzman tahmini)', batBittiPct: 'Pil: sessiz cihazda «Pil bitmiş olabilir» son okuma ≤ % (uzman tahmini)', ucusGenelUygunC: 'Uçuş (Genel): «uygun» en düşük gündüz azami sıcaklığı (°C, uzman tahmini)', ucusGenelKismenC: 'Uçuş (Genel): «kısmen» en düşük sıcaklık (°C, uzman tahmini)', ucusGenelUygunRuzgar: 'Uçuş (Genel): «uygun» en yüksek rüzgar (km/sa, uzman tahmini)', ucusGenelKismenRuzgar: 'Uçuş (Genel): «kısmen» en yüksek rüzgar (km/sa, uzman tahmini)', ucusGenelYagisMm: 'Uçuş (Genel): bu yağış (mm) ve üstü uygun değil (uzman tahmini)', ucusKafkasUygunC: 'Uçuş (Kafkas): «uygun» en düşük gündüz azami sıcaklığı (°C, uzman tahmini)', ucusKafkasKismenC: 'Uçuş (Kafkas): «kısmen» en düşük sıcaklık (°C, uzman tahmini)', ucusKafkasUygunRuzgar: 'Uçuş (Kafkas): «uygun» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKafkasKismenRuzgar: 'Uçuş (Kafkas): «kısmen» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKafkasYagisMm: 'Uçuş (Kafkas): bu yağış (mm) ve üstü uygun değil (uzman tahmini)', ucusKarniyolUygunC: 'Uçuş (Karniyol): «uygun» en düşük gündüz azami sıcaklığı (°C, uzman tahmini)', ucusKarniyolKismenC: 'Uçuş (Karniyol): «kısmen» en düşük sıcaklık (°C, uzman tahmini)', ucusKarniyolUygunRuzgar: 'Uçuş (Karniyol): «uygun» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKarniyolKismenRuzgar: 'Uçuş (Karniyol): «kısmen» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKarniyolYagisMm: 'Uçuş (Karniyol): bu yağış (mm) ve üstü uygun değil (uzman tahmini)', ucusKaradenizUygunC: 'Uçuş (Karadeniz): «uygun» en düşük gündüz azami sıcaklığı (°C, uzman tahmini)', ucusKaradenizKismenC: 'Uçuş (Karadeniz): «kısmen» en düşük sıcaklık (°C, uzman tahmini)', ucusKaradenizUygunRuzgar: 'Uçuş (Karadeniz): «uygun» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKaradenizKismenRuzgar: 'Uçuş (Karadeniz): «kısmen» en yüksek rüzgar (km/sa, uzman tahmini)', ucusKaradenizYagisMm: 'Uçuş (Karadeniz): bu yağış (mm) ve üstü uygun değil (uzman tahmini)', aniKayipKg: 'Ani ağırlık kaybı: eşik (kg, uzman tahmini)', aniKayipSaat: 'Ani ağırlık kaybı: süre (saat, uzman tahmini)', suGuvenliM: 'Su: bu mesafeye kadar risk yok, m (uzman tahmini; literatürde ~500 m önerisi geçer)', suRiskliM: 'Su: bu mesafeden sonra yüksek risk, m (uzman tahmini)', suRiskAgirlik: 'Su riski rota güvenini en çok bu oranda düşürür (0–1, uzman tahmini)', veriYokCarpan: 'Su/alan verisi yoksa güven çarpanı (uzman tahmini)', alanDogalOran: 'Toplama alanı: ağaçlık+çalılık+çayır en az oranı (0–1, uzman tahmini)', varroaSayimGun: 'Varroa: son sayımdan bu yana gün → hatırlatma (uzman tahmini)', kulucka0Rakim: 'Kuluçka başlangıcı: bu rakımın altı Şubat (uzman tahmini)', kulucka1Rakim: 'Kuluçka başlangıcı: bu rakımın üstü Nisan, arası Mart (uzman tahmini)', rotaHasatAg: 'Rota puanı: geçmiş hasat ağırlığı (0–1, uzman tahmini)', rotaTartiAg: 'Rota puanı: tartı artış ağırlığı (0–1, uzman tahmini)', rotaPencere: 'Rota: kayan ortalama penceresi, gün (uzman tahmini)', rotaMinGun: 'Rota: eşik öğrenmek için en az kayıtlı gün (uzman tahmini)', batOrtaGun: 'Batarya: kalan gün ≤ → Orta uyarı (uzman tahmini)', batYuksekGun: 'Batarya: kalan gün ≤ → Yüksek uyarı (uzman tahmini)', batTabanOran: 'Batarya: taban tüketim payı (0–1, uzman tahmini)', batIlkGun: 'Batarya: ilk hesap için gün (uzman tahmini)', batIlkDusus: 'Batarya: ilk hesap için en az düşüş (puan, uzman tahmini)', tasNegGun: 'Taşınma: üst üste net artış ≤ eşik gün sayısı (uzman tahmini)', tasNetEsikKg: 'Taşınma: günlük net artış eşiği (kg/gün)', tasErkenGun: 'Taşınma: en erken uyarı (ayrılıştan gün önce)', tasHazirlikGun: 'Taşınma: hazırlık görevi (ayrılıştan gün önce)', ucusTemizlikC: 'Uçuş: mevsim dışı temizlik uçuşu en düşük sıcaklık (°C) · Burrill & Dietz 1981', ucusIsinimW: 'Uçuş: uygun saat en az güneş ışınımı (W/m²) · Vicens & Bosch 2000', ucusSaatMin: 'Uçuş: «uygun» gün için en az uygun saat (uzman tahmini)', ucusSezonSicakBas: 'Uçuş mevsimi (sıcak bölge) başlangıç (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonSicakSon: 'Uçuş mevsimi (sıcak bölge) bitiş (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonCamSon: 'Çam balı bölgesi mevsim sonu (sıcak bölge, çam balı illeri; AAGG, ör. 1130 = 30 Kas) · kaynaklı: MAYBİR (yoğun dönem Ağustos–Kasım), Küre Ansiklopedi (15 Ağustos–30 Kasım), Günbey / Arıcılık Araştırma Enstitüsü', ucusSezonIlimanBas: 'Uçuş mevsimi (ılıman) başlangıç (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonIlimanSon: 'Uçuş mevsimi (ılıman) bitiş (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonYaylaBas: 'Uçuş mevsimi (yayla) başlangıç (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonYaylaSon: 'Uçuş mevsimi (yayla) bitiş (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonYuksekBas: 'Uçuş mevsimi (yüksek yayla) başlangıç (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', ucusSezonYuksekSon: 'Uçuş mevsimi (yüksek yayla) bitiş (AAGG, ör. 920 = 20 Eyl; uzman tahmini)', pipingHzMin: 'Ana Arılar Ötmesi (Piping) alt frekans (Hz)', pipingHzMax: 'Ana Arılar Ötmesi (Piping) üst frekans (Hz)', pipingDk: 'Ana Arılar Ötmesi (Piping) süresi — bilinmeyen ırk (dk; ırk satırlarında ayrı)', pipingAraSn: 'Kesinti sayılmayan en uzun ara (sn)',
    tempHigh: 'Kuluçka ısısı eşiği (°C)', tempHighSaat: 'Eşik üstü en az süre (saat)', tempHighArti: '→ Sıkışıklık artışı',
    riseMin: 'Ani yükseliş alt (°C)', riseMax: 'Ani yükseliş üst (°C)', riseDelta: 'Ani yükseliş en az fark (°C)', riseSaat: 'Ani yükseliş penceresi (saat)', riseArti: '→ Sıkışıklık artışı',
    nemHigh: 'Nem eşiği (%) — Nem normal üst sınırına bağlı', nemArti: '→ Sıkışıklık artışı',
    kiloHizli: 'Hızlı kilo artışı (kg/gün)', kiloPlato: 'Plato: günlük değişim en çok (kg)', ariYuksekOran: 'Plato için arı sayısı / kapasite', kiloArti: '→ Sıkışıklık artışı',
    ariTrendOran: 'Arı sayısı kapasiteye yakın (oran)', ariTrendArti: '→ Sıkışıklık artışı', ariCerceve: 'Çerçeve başına arı (kapasite hesabı)', ariZirveOran: 'Sert kilo artışı + arı yoğunluğu zirve (oran) → Sıkışıklık 100',
    nektarKg: 'Canlı nektar akımı: günlük artış en az (kg)',
    quackHzMin: 'Vakvaklama (Quacking) alt frekans (Hz)', quackHzMax: 'Vakvaklama (Quacking) üst frekans (Hz)', quackHeceMinMs: 'Vakvaklama (Quacking) hecesi en kısa (ms)', quackHeceMaxMs: 'Vakvaklama (Quacking) hecesi en uzun (ms)', quackHeceSay: 'Peş peşe en az hece', quackPencereDk: 'Ana Arılar Ötmesi (Piping) + Vakvaklama (Quacking) birlikte penceresi (dk) → Yüksek',
    anasizHzMin: 'Anasızlık Uğultusu (Queenless Roar) alt frekans (Hz)', anasizHzMax: 'Anasızlık Uğultusu (Queenless Roar) üst frekans (Hz)', anasizDk: 'Anasızlık Uğultusu (Queenless Roar) kesintisiz süre (dk)', anasizArtisDb: 'Kovan taban seviyesine göre artış (dB, göreli)',
    darbeMaxMs: 'Darbe filtresi: bundan kısa sesler Ana Arılar Ötmesi (Piping) / Anasızlık Uğultusu (Queenless Roar) sayılmaz (ms)',
    tabanGunduzHzMin: 'Taban gündüz alt (Hz)', tabanGunduzHzMax: 'Taban gündüz üst (Hz)', tabanGeceHzMin: 'Taban gece alt (Hz)', tabanGeceHzMax: 'Taban gece üst (Hz)', gunduzSaatBas: 'Gündüz başlangıç saati', gunduzSaatSon: 'Gündüz bitiş saati',
    pipingAramaHzMin: 'Ana Arılar Ötmesi (Piping) arama alt sınırı (Hz; alarm altı yalnız kayıt)',
    isciOtmeHzMin: 'İşçi Arı Ötmesi (Worker Piping) alt (Hz)', isciOtmeHzMax: 'İşçi Arı Ötmesi (Worker Piping) üst (Hz)', isciOtmeMinMs: 'İşçi Arı Ötmesi (Worker Piping) darbe en kısa (ms)', isciOtmeMaxMs: 'İşçi Arı Ötmesi (Worker Piping) darbe en uzun (ms)', isciOtmeSay: 'İşçi Arı Ötmesi (Worker Piping) en az darbe', isciOtmePencereDk: 'İşçi Arı Ötmesi (Worker Piping) penceresi (dk)',
    ogulAniHzMin: 'Oğul Anı Sesi (Swarming) alt (Hz)', ogulAniHzMax: 'Oğul Anı Sesi (Swarming) üst (Hz)', ogulAniArtisDb: 'Oğul Anı Sesi (Swarming): tabana göre artış (dB)', ogulAniDk: 'Oğul Anı Sesi (Swarming) en az süre (dk)',
    sikW_tarti: 'Sıkışıklık ağırlığı: Tartı', sikW_ir: 'Sıkışıklık ağırlığı: IR uçuş yoğunluğu', sikW_ses: 'Sıkışıklık ağırlığı: Ses ve titreşim', sikW_isi: 'Sıkışıklık ağırlığı: Isı', sikW_nem: 'Sıkışıklık ağırlığı: Nem',
    tartiBosKutuKg: 'Tartı: boş kutu (gövde/kat) kg', tartiDoluKutuKg: 'Tartı: dolu kutu net kg (100 puan)', disYagmurMm: 'Dış: yağmur sayılan yağış (mm/saat)', disYagmurPr: 'Dış: yağmur sayılan olasılık (%)', disYagmurSonraSaat: 'Dış: yağmur bittikten sonra düzeltme süresi (saat)', disNemYuksek: 'Dış: yüksek bağıl nem (%)', nemDisNemCarpan: 'Nem katı çarpanı: dış nem yüksek', nemYagmurCarpan: 'Nem katı çarpanı: yağmur', disSicakYuksek: 'Dış: çok sıcak (°C)', isiDisSicakCarpan: 'Isı katı çarpanı: dış çok sıcak', irYagmurdaCikar: 'Yağmur sırasında IR hesaptan çıkar (1 = evet, 0 = hayır)',
    irSapmaOran: 'IR: tabandan bu oranda artış = 1 (0,5 = %50)', sesSapmaDb: 'Ses: tabandan bu kadar dB artış = 1', nemSapma: 'Nem: tabandan bu kadar % artış = 1', yuksekKat: 'Tartı artışını saymak için IR/Nem katı en az', nemDisMax: 'Nem: dış nem bundan yüksekse okuma yok sayılır (%)',
    ogulSonrasiDusDb: 'Oğul sonrası: tabana göre düşüş (dB)',
    ogulKaymaHz: 'Oğul eğilimi: gündüz tepe frekansı kayması (Hz)', yelpazeHzMin: 'Yelpazeleme alt (Hz)', yelpazeHzMax: 'Yelpazeleme üst (Hz)', yelpazeOran: 'Kovan sağlığı: yelpazeleme okuma oranı (0,4 = %40, uzman tahmini)', saglikUyariDb: 'Kovan sağlığı: taban sapması → Uyarı (dB, uzman tahmini)', saglikKritikDb: 'Kovan sağlığı: taban sapması → Kritik (dB, uzman tahmini)',
    varroaHzMin: 'Varroa hatırlatması: bant (Hz; kaynak Yıldız & Karabağ 2026)', varroaSapmaDb: 'Varroa hatırlatması: bant taban sapması (dB, uzman tahmini)', varroaGun: 'Varroa hatırlatması: en sık (gün)',
    kirecIsiC: 'Kireç riski: kuluçka ısısı bunun altında (°C; Flores ve ark. 1996)', kirecSaat: 'Kireç riski: kesintisiz süre (saat, uzman tahmini)', kirecAyBas: 'Kireç riski: kuluçka dönemi ilk ay (1–12, uzman tahmini)', kirecAySon: 'Kireç riski: kuluçka dönemi son ay (1–12, uzman tahmini)', kirecNemYuksek: 'Kireç riski: destekleyici nem (%) — Nem kireç eşiğine bağlı', hatirlatmaGun: 'Kireç / genel kontrol hatırlatması: en sık (gün)',
    genelKayipKat: 'Genel kontrol: günlük ağırlık kaybı kendi geçmişinin bu katı (uzman tahmini)', genelKayipMinKg: 'Genel kontrol: en az günlük kayıp (kg, uzman tahmini)', genelNufusUyariOran: 'Genel kontrol: nüfus düşüşü → uyarı (0,2 = %20, uzman tahmini)', genelNufusKritikOran: 'Genel kontrol: nüfus düşüşü → kritik (0,3 = %30, uzman tahmini)', genelAyBas: 'Genel kontrol: kış–ilkbahar ilk ay (1–12, uzman tahmini)', genelAySon: 'Genel kontrol: kış–ilkbahar son ay (1–12, uzman tahmini)',
    kuluckaHedefC: 'Kuluçka sıcaklığı: hedef (°C; Groh ve ark. 2004: 34,5 °C)', kuluckaUyariAltC: 'Kuluçka sıcaklığı: uyarı — bunun altı (°C, uzman tahmini; Groh ve ark. 2004 etkiyi 33,5 °C’de gösterdi, 34 °C daha ihtiyatlı seçim)', kuluckaUyariUstC: 'Kuluçka sıcaklığı: uyarı — bu değer ve üstü (°C; Groh ve ark. 2004: 35 °C’de etki)', kuluckaAltC: 'Kuluçka sıcaklığı: kritik — bunun altı (°C; Kleinhenz ve ark. 2003: 33–36 °C)', kuluckaUstC: 'Kuluçka sıcaklığı: kritik — bunun üstü (°C; Kleinhenz ve ark. 2003)', kuluckaSaat: 'Kuluçka sıcaklığı: uyarı/kritik için kesintisiz süre (saat, uzman tahmini)', kuluckaOynaklikC: 'Kuluçka sıcaklığı: pencere içinde en yüksek − en düşük farkı (°C, uzman tahmini)', kuluckaOynaklikSaat: 'Kuluçka sıcaklığı: oynaklık penceresi (saat, uzman tahmini)', kuluckaAyBas: 'Kuluçka sıcaklığı: dönem ilk ay (1–12, uzman tahmini)', kuluckaAySon: 'Kuluçka sıcaklığı: dönem son ay (1–12, uzman tahmini)', kuluckaAcilC: 'Kuluçka sıcaklığı: ACİL — bu değer ve altı, kireç hastalığı riski (°C; Flores ve ark. 1996, Apidologie 27:185, doi:10.1051/apido:19960401 — kapalı yavruda 30 °C’de mumyalaşma 35 °C’ye göre belirgin yüksek)', kuluckaAcilSaat: 'Kuluçka sıcaklığı: ACİL için kesintisiz süre (saat, uzman tahmini)',
    nemNormalAlt: 'Nem normal aralık: alt; bunun altı erken uyarı (%; uzman tahmini, kullanıcı seçimi — ilgili: Doull 1976, Apidologie 7:61, doi:10.1051/apido:19760104, %50 altında yumurta açılmadı)', nemNormalUst: 'Nem normal aralık: üst (%; uzman tahmini, kullanıcı seçimi — kovan için doğrulanmış eşik yok)', nemKritikAlt: 'Nem kritik: bunun altı (%; uzman tahmini, kullanıcı seçimi — ilgili: Doull 1976 %50)', nemKirecUst: 'Nem kireç riski: bunun üstü (%; destekleyici: Liang 2000, Ying Yong Sheng Tai Xue Bao 11:869, PubMed 11767561 — %80 altında spor çimlenmedi; Flores 1996 doi:10.1051/apido:19960401 — %87 nemde kireç artışı; süre uzman tahmini)', nemDisiSaat: 'Nem aralık dışı kesintisiz süre (saat, uzman tahmini)',
    irOgulNetCikis: 'IR oğul: net çıkış en az (arı, uzman tahmini — destekleyici: Struye 1994, Apidologie 25:384, doi:10.1051/apido:19940405)', irOgulDk: 'IR oğul: pencere (dk, uzman tahmini)', irYagmaOran: 'IR yağma: giriş/çıkış oranı en az (uzman tahmini)', irYagmaDk: 'IR yağma: kesintisiz süre, gündüz (dk, uzman tahmini)', irTrafikOran: 'IR trafik düşüşü: 7 gün aynı saat ortalamasının bu oranından az (0,3 = %30, uzman tahmini)', irTrafikGun: 'IR trafik düşüşü: üst üste gün (uzman tahmini)',
    titresimKat: 'Titreşim olağandışı hareket: 7 gün tabanının katı (uzman tahmini)', titresimDk: 'Titreşim olağandışı hareket: kesintisiz süre (dk, uzman tahmini)',
    sessizOkuma: 'Veri gelmiyor: kaçırılan okuma sayısı (uzman tahmini)', sessizMinDk: 'Veri gelmiyor: sarı için en az (dk, uzman tahmini)', sessizKirmiziDk: 'Veri gelmiyor: kırmızı (dk, uzman tahmini)', kopukSaat: 'Bağlantı koptu: veri yok (saat, uzman tahmini)',
    arizaAltEksiC: 'Arızalı: sıcaklık bunun eksisinin altı (°C; 40 = −40 °C, uzman tahmini)', arizaUstC: 'Arızalı: sıcaklık bunun üstü (°C, uzman tahmini)', arizaAyniSaat: 'Arızalı: aynı değer kesintisiz (saat, uzman tahmini)', arizaSicramaC: 'Arızalı: iki okuma arası sıçrama (°C, uzman tahmini)' };
  function pipingDefaults() { var o = {}; Object.keys(GENETIK_SAF).concat(Object.keys(GENETIK_MELEZ)).forEach(function (k) { o[k] = ORS_SENSOR.pipingDk; }); return o; }
  /* k161 EK13: kullanıcı onaylı bildirim şablonları */
  var KovanBildirimSablonlari = {
    ALARM_MANUEL_YUKSUK_01: { severity: 'critical', title: '🚨 KRİTİK: Oğul Yüksüğü Var!', body: 'Kovanda yapılan muayenede aktif oğul yüksüğü tespit edildi. Bölme veya oğul önlemini acilen devreye al.', action: 'Kovanı kontrol et, yüksüklerin durumunu incele ve acil oğul yönetim protokolünü uygula.', ekip: 'ogul_yuksugu' },
    ALARM_YUKSEK_CIKIS_01: { severity: 'high', title: '⚠️ UYARI: Oğul Çıkmış Olabilir', body: 'Tartıdaki ani ağırlık düşüşü veya kovan sesleri, koloninin oğul vererek kovanı terk etmiş olabileceğini gösteriyor.', action: 'Kovanı acilen muayene et, arı mevcudunu ve ana arının varlığını kontrol et.', ekip: 'ogul_cikmis' },
    ALARM_BILGI_SAGLIK_01: { severity: 'low', title: '📊 Bilgi: Kovan Sağlığı', body: 'Kovanın ses ve iklim dengesi normalden saptı.', action: 'Havalandırmayı kontrol et.' }
  };
  function sablonUyari(code, h, nm, type) { var t = KovanBildirimSablonlari[code]; return { id: 'kra-' + code.toLowerCase() + '-' + h.id, code: code, title: t.title + ' (' + nm + ')', body: t.body, action: t.action, type: type, hiveId: h.id, severity: t.severity, auto: true }; }
  var EKIP_BILDIRIM = ['piping', 'quacking', 'ogul_ani', 'ogul_yuksugu', 'ogul_cikmis', 'ors_70', 'isci_otme_artis', 'ALARM_ARILIK_KOSUL_01', 'onerilen_risk', 'batarya_7', 'ani_kayip', 'ors_orta'];
  /** koloni-204: nem kademe sırası — kritik < erken (normal alt) < normal üst ≤ kireç */
  /** koloni-205: tek kaynak nem durumu (kullanıcıya yalnız metin). Dönen { k: 'kritik'|'erken'|'normal'|'ustunde'|'kirec', etiket, ton } ya da null. */
  function nemDurum(rh, T) { T = T || (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR; var v = Number(rh); if (rh == null || !isFinite(v)) return null;
    if (v < T.nemKritikAlt) return { k: 'kritik', etiket: 'Çok düşük', kisa: 'Çok düşük', ton: 'bad' }; if (v < T.nemNormalAlt) return { k: 'erken', etiket: 'Düşüyor', kisa: 'Düşük', ton: 'warn' };
    if (v > T.nemKirecUst) return { k: 'kirec', etiket: 'Çok yüksek', kisa: 'Çok yüksek', ton: 'bad' }; if (v > T.nemNormalUst) return { k: 'ustunde', etiket: 'Normalin üstünde', kisa: 'Yüksek', ton: 'warn' }; return { k: 'normal', etiket: 'Normal', kisa: 'Normal', ton: '' }; }
  /* koloni-217: arılığın arı cinsi → uçuş eşikleri (tek kaynak OGUL_SKOR.sensor). Melez: her ebeveyn grubundan en ihtiyatlı değer. */
  function ucusGruplari(breed) { var t = String(breed || '').toLocaleLowerCase('tr'), g = [];
    if (/kafkas/.test(t)) g.push('Kafkas'); if (/karniyol|carni/.test(t)) g.push('Karniyol'); if (/karadeniz/.test(t)) g.push('Karadeniz'); return g.length ? g : ['Genel']; }
  function apiaryBreed(apId) { var c = {}, best = null; try { loadHives().forEach(function (h) { if (String(h.apiaryId) === String(apId) && h.breed) c[h.breed] = (c[h.breed] || 0) + 1; }); } catch (e) {}
    Object.keys(c).forEach(function (k) { if (!best || c[k] > c[best]) best = k; }); return best || plannedBreed(breedPlanKeyFor({ id: apId }), 0) || null; }
  function ucusEsik(breed, aid) { var T = (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR, gs = kuralAcik('ucus', aid) ? ucusGruplari(breed) : ['Genel']; /* koloni-220: kural kapalı → cinse bakmaz, Genel eşik */
    function v(g, k) { var x = Number(T['ucus' + g + k]); return isFinite(x) ? x : ORS_SENSOR['ucus' + g + k]; }
    function agg(k, f) { return f.apply(null, gs.map(function (g) { return v(g, k); })); }
    return { breed: breed || null, gruplar: gs, uygunC: agg('UygunC', Math.max), kismenC: agg('KismenC', Math.max), uygunRuzgar: agg('UygunRuzgar', Math.min), kismenRuzgar: agg('KismenRuzgar', Math.min), yagisMm: agg('YagisMm', Math.min) }; }
  /* koloni-249: uçuş mevsimi — bölge profili (rakım/il; sicak/iliman/yayla/yuksek) varsayılanı, yönetici arılık başına değiştirebilir. Mevsim dışında sıcak gün «uçuş uygun» denmez (toplama yok). */
  var UCUS_SEZON_P = ['Sicak', 'Iliman', 'Yayla', 'Yuksek'], UCUS_SEZON_K = { sicak: 'Sicak', iliman: 'Iliman', yayla: 'Yayla', yuksek: 'Yuksek' };
  function mdNum(n) { n = Number(n); if (!isFinite(n) || n !== Math.floor(n)) return null; var m = Math.floor(n / 100), g = n % 100; if (m < 1 || m > 12 || g < 1 || g > [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]) return null; return (m < 10 ? '0' : '') + m + '-' + (g < 10 ? '0' : '') + g; }
  /* koloni-270: sıcak bölgede çam balı illeri (Muğla, Aydın, İzmir, Balıkesir, Çanakkale, Antalya kıyıları) → mevsim sonu ayrı ayar ucusSezonCamSon (varsayılan 30 Kas; kaynaklar yalnız yönetici panelinde) */
  var CAM_BALI_RE = /muğla|mugla|aydın|aydin|izmir|balıkesir|balikesir|çanakkale|canakkale|antalya|fethiye|marmaris|bodrum|kayaköy|kayakoy/;
  function camBaliBolge(apId) { var a = null; try { var aps = loadApiaries(); for (var i = 0; i < aps.length; i++) if (String(aps[i].id) === String(apId)) { a = aps[i]; break; } } catch (e) { a = null; }
    if (!a) return false; return CAM_BALI_RE.test(String((a.il || '') + ' ' + (a.name || '') + ' ' + (a.place || '') + ' ' + (a.koy || '')).toLocaleLowerCase('tr')); }
  function ucusSezon(apId, date, oto) { /* oto: elle dönemi yok say (yönetici «otomatik» gösterimi) */
    var T = (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR, key = 'iliman'; try { key = seasonProfileKey(apId) || 'iliman'; } catch (e) { key = 'iliman'; }
    var g = UCUS_SEZON_K[key] || 'Iliman', from = mdNum(T['ucusSezon' + g + 'Bas']) || mdNum(ORS_SENSOR['ucusSezon' + g + 'Bas']), to = mdNum(T['ucusSezon' + g + 'Son']) || mdNum(ORS_SENSOR['ucusSezon' + g + 'Son']);
    var cam = key === 'sicak' && camBaliBolge(apId); if (cam) { var ct = mdNum(T.ucusSezonCamSon) || mdNum(ORS_SENSOR.ucusSezonCamSon); if (ct && ct > from) to = ct; }
    var cp = !oto && OGUL_SKOR && OGUL_SKOR.ucusSezon && OGUL_SKOR.ucusSezon[String(apId)]; if (cp && cp.from && cp.to) { from = cp.from; to = cp.to; }
    var md = String(date || todayLocal()).slice(5, 10);
    return { acik: md >= from && md <= to, from: from, to: to, profile: key, profileLabel: cp ? 'elle' : PROFILE_SHORT[key], custom: !!cp, cam: !!cam && !cp, window: mdLabel(from) + '–' + mdLabel(to) };
  }
  function nemSiraGecerli(o) { var k = Number(o.nemKritikAlt), a = Number(o.nemNormalAlt), u = Number(o.nemNormalUst), c = Number(o.nemKirecUst); return [k, a, u, c].every(isFinite) && k >= 0 && c <= 100 && k < a && a < u && u <= c; }
  /* koloni-220: aç/kapa yapılabilen uyarı kuralları (yönetici paneli → Ölçüm kuralları / Cihazlar) */
  var KURALLAR = [['kulucka', 'Kuluçka sıcaklığı (uyarı/kritik/oynaklık)'], ['kuluckaAcil', 'Kuluçka ACİL'], ['kirec', 'Kireç hatırlatması'], ['nem', 'Nem kademeleri'], ['agirlik', 'Ağırlık (genel kayıp)'],
    ['sesOgulAni', 'Ses: Oğul anı'], ['sesPiping', 'Ses: Piping'], ['sesQuack', 'Ses: Quacking'], ['sesAnasiz', 'Ses: Anasızlık'], ['sesIsciOtme', 'Ses: İşçi ötmesi'], ['sesOgulEgilim', 'Ses: Oğul eğilimi'], ['sesSaglik', 'Ses: Kovan sağlığı'], ['sesVarroa', 'Ses: Varroa'], ['sesOgulOnce', 'Ses: Oğul öncesi ses + sıcaklık'], ['sesOtmeSira', 'Ses: Ana arı ötme sırası'], ['sesRahatsiz', 'Ses: Rahatsız edilme'], ['sesEsekArisi', 'Ses: Eşek arısı'], ['koloniSonuk', 'Koloni sönmüş olabilir'], ['yavrusuzSicak', 'Yavrusuz / anasız (sıcaklık salınımı)'], ['tarlaciKayip', 'Tarlacı arı kaybı (tartı)'], ['esekGiris', 'Eşek arısı: sıcaklık + tıslama + titreşim'], ['havalandirma', 'Havalandırma yetersiz'],
    ['titresim', 'Titreşim'], ['titOgul', 'Titreşim: Oğul hazırlığı (gece)'], ['titOtme', 'Titreşim: Ana ötmesi'], ['titDarbe', 'Titreşim: Rahatsız edilme / darbe'], ['titKis', 'Titreşim: Kış hareketsizliği'], ['irOgul', 'IR: Oğul'], ['irYagma', 'IR: Yağma'], ['irTrafik', 'IR: Trafik düşüşü'], ['irIlac', 'IR: İlaçlama şüphesi'], ['irDonmeyen', 'IR: Dönmeyen tarlacı'], ['irDusukAktivite', 'IR: Beklenenden düşük aktivite'], ['irSayac', 'IR: Sayaç arızası'], ['irOgulCikti', 'IR: Oğul çıktı'], ['pil', 'Pil düşüklüğü'], ['cihazSessiz', 'Veri gelmiyor'], ['cihazKopuk', 'Bağlantı koptu'], ['cihazAriza', 'Arızalı'], ['ucus', 'Uçuş havası cinse göre (kapalıysa Genel eşik)'], ['ogulYerTahmin', 'Oğul: Yer darlığı olabilir (bal katı yok, sayım yok — uzman tahmini)'], ['ogulMemeYerBilinmiyor', 'Oğul: Ana memesi yeri bilinmiyor — «yerine bakın» notu (uzman tahmini)']];
  var KURAL_IDS = KURALLAR.map(function (x) { return x[0]; });
  /* Etkin = genel açık VE o kullanıcı (e-posta) için kapalı değil VE o arılık (ad) için kapalı değil. */
  var KURAL_UEMAIL = '';
  function kuralAnahtar(x) { return String(x == null ? '' : x).trim().toLocaleLowerCase('tr').slice(0, 120); }
  function kuralAcik(id, aid, email) {
    var o = OGUL_SKOR || {}, k = o.kuralKapali; if (k && k.indexOf(id) >= 0) return false;
    var em = kuralAnahtar(email != null ? email : KURAL_UEMAIL), ku = o.kuralKapaliKullanici || {}; if (em && ku[em] && ku[em].indexOf(id) >= 0) return false;
    if (aid != null && aid !== '') { var an = kuralAnahtar(apiaryNameOf(aid)), ka = o.kuralKapaliArilik || {}; if (an && ka[an] && ka[an].indexOf(id) >= 0) return false; }
    return true;
  }
  function kuralKullaniciAyarla(em) { KURAL_UEMAIL = kuralAnahtar(em); }
  try { setTimeout(function () { var B = global.SuperAriBulut; if (B && B.session) Promise.resolve(B.session()).then(function (x) { if (x && x.user && x.user.email) kuralKullaniciAyarla(x.user.email); }).catch(function () {}); }, 0); } catch (eKu) { /* */ }
  function ogulSkorDefaults() { return { kuralKapali: [], kuralKapaliKullanici: {}, kuralKapaliArilik: {}, ekipBildirim: EKIP_BILDIRIM.slice(), donem: {}, ucusSezon: {}, piping: pipingDefaults(), sensor: Object.assign({}, ORS_SENSOR), weights: Object.assign({}, ORS_WEIGHTS), saf: Object.assign({}, GENETIK_SAF), melez: Object.assign({}, GENETIK_MELEZ), buckfastIkili: GENETIK_BUCKFAST_IKILI, bilinmeyen: GENETIK_BILINMEYEN }; }
  /** Geçerli ayar = varsayılan + (geçerliyse) yönetici kaydı. Ağırlık toplamı 1 değilse ağırlıklar varsayılan kalır. */
  function ogulSkorMerge(o) {
    var d = ogulSkorDefaults(); if (!o || typeof o !== 'object') return d;
    var w = o.weights || {}, ww = {}, sum = 0, ok = true;
    ['genetik', 'sikisiklik', 'mevsim', 'anaYasi'].forEach(function (k) { var v = num01(w[k], 0, 1); if (v == null) ok = false; else { ww[k] = v; sum += v; } });
    if (ok && Math.abs(sum - 1) < 0.001) d.weights = ww;
    ['saf', 'melez'].forEach(function (g) { var src = o[g] || {}; Object.keys(d[g]).forEach(function (k) { var v = num01(src[k], 0, 100); if (v != null) d[g][k] = v; }); });
    var MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    Object.keys(o.donem || {}).slice(0, 500).forEach(function (k) { var x = o.donem[k]; if (x && x.isCustomPeriod === true && MD.test(x.from) && MD.test(x.to) && x.from <= x.to) d.donem[String(k).slice(0, 40)] = { from: x.from, to: x.to, isCustomPeriod: true }; });
    /* koloni-249: arılık başına elle uçuş mevsimi (yönetici) { apId: { from, to: 'AA-GG' } } */
    Object.keys(o.ucusSezon || {}).slice(0, 500).forEach(function (k) { var x = o.ucusSezon[k]; if (x && MD.test(x.from) && MD.test(x.to) && x.from < x.to) d.ucusSezon[String(k).slice(0, 40)] = { from: x.from, to: x.to }; });
    var po = o.piping || {}; Object.keys(d.piping).forEach(function (k) { var v = num01(po[k], 0.1, 600); if (v != null) d.piping[k] = v; });
    var so = o.sensor || {}; Object.keys(d.sensor).forEach(function (k) { if (k === 'suUzakMod') { if (so[k] === 'cikar' || so[k] === 'alta') d.sensor[k] = so[k]; return; } var v = num01(so[k], 0, 100000); if (v != null) d.sensor[k] = v; });
    /* k177: Kovan sağlığı dB eşikleri — kritik < uyarı ise ikisi de varsayılana döner */
    if (!(d.sensor.saglikKritikDb >= d.sensor.saglikUyariDb)) { d.sensor.saglikUyariDb = ORS_SENSOR.saglikUyariDb; d.sensor.saglikKritikDb = ORS_SENSOR.saglikKritikDb; }
    /* k182: Genel kontrol nüfus eşikleri — kritik < uyarı ise ikisi de varsayılana döner */
    if (!(d.sensor.kuluckaUstC > d.sensor.kuluckaAltC)) { d.sensor.kuluckaAltC = ORS_SENSOR.kuluckaAltC; d.sensor.kuluckaUstC = ORS_SENSOR.kuluckaUstC; }
    /* k194: uyarı bandı kritik bandın içinde olmalı (alt ≤ uyarıAlt < uyarıÜst ≤ üst), değilse uyarı eşikleri varsayılana döner */
    if (!(d.sensor.kuluckaAltC <= d.sensor.kuluckaUyariAltC && d.sensor.kuluckaUyariAltC < d.sensor.kuluckaUyariUstC && d.sensor.kuluckaUyariUstC <= d.sensor.kuluckaUstC)) { d.sensor.kuluckaUyariAltC = ORS_SENSOR.kuluckaUyariAltC; d.sensor.kuluckaUyariUstC = ORS_SENSOR.kuluckaUyariUstC; }
    /* k195: acil eşiği kritik alt eşiğin altında olmalı */
    if (!(d.sensor.kuluckaAcilC < d.sensor.kuluckaAltC)) d.sensor.kuluckaAcilC = ORS_SENSOR.kuluckaAcilC;
    /* koloni-204: nem kademe sırası kritik < normal alt (erken) < normal üst ≤ kireç; bozuksa nem eşikleri varsayılana döner */
    if (!nemSiraGecerli(d.sensor)) { ['nemKritikAlt', 'nemNormalAlt', 'nemNormalUst', 'nemKirecUst'].forEach(function (k) { d.sensor[k] = ORS_SENSOR[k]; }); }
    /* koloni-217: uçuş eşik sırası (kısmen ≤ uygun sıcaklık, uygun ≤ kısmen rüzgar); bozuksa o cinsin değerleri varsayılana döner */
    ['Genel', 'Kafkas', 'Karniyol', 'Karadeniz'].forEach(function (g) { var S = d.sensor, p = 'ucus' + g; if (!(S[p + 'KismenC'] <= S[p + 'UygunC'] && S[p + 'UygunRuzgar'] <= S[p + 'KismenRuzgar'] && S[p + 'YagisMm'] > 0)) ['UygunC', 'KismenC', 'UygunRuzgar', 'KismenRuzgar', 'YagisMm'].forEach(function (k) { S[p + k] = ORS_SENSOR[p + k]; }); });
    /* koloni-249: bölge uçuş mevsimi AAGG geçerli ve başlangıç < bitiş olmalı; değilse o bölge varsayılana döner */
    UCUS_SEZON_P.forEach(function (g) { var S = d.sensor, a = 'ucusSezon' + g + 'Bas', b = 'ucusSezon' + g + 'Son'; if (!(mdNum(S[a]) && mdNum(S[b]) && S[a] < S[b])) { S[a] = ORS_SENSOR[a]; S[b] = ORS_SENSOR[b]; } });
    if (!(mdNum(d.sensor.ucusSezonCamSon) && d.sensor.ucusSezonCamSon > d.sensor.ucusSezonSicakBas)) d.sensor.ucusSezonCamSon = ORS_SENSOR.ucusSezonCamSon; /* koloni-270 */
    /* koloni-205: eski ayrı nem anahtarları tek kaynağa bağlı (yalnız geriye uyum) */
    d.sensor.nemHigh = d.sensor.nemNormalUst; d.sensor.kirecNemYuksek = d.sensor.nemKirecUst;
    if (!(d.sensor.genelNufusKritikOran >= d.sensor.genelNufusUyariOran)) { d.sensor.genelNufusUyariOran = ORS_SENSOR.genelNufusUyariOran; d.sensor.genelNufusKritikOran = ORS_SENSOR.genelNufusKritikOran; }
    /* k161 EK12: ekip bildirimi gönderilecek uyarı kodları (yönetici listesi) */
    if (Array.isArray(o.ekipBildirim)) d.ekipBildirim = o.ekipBildirim.filter(function (k) { return typeof k === 'string' && k.length < 60; }).slice(0, 60);
    /* koloni-220: kural aç/kapa — genel liste + kullanıcı (e-posta) + arılık (ad) listeleri; yalnız bilinen kimlikler. Eşikler silinmez. Varsayılan: tümü açık. */
    if (Array.isArray(o.kuralKapali)) d.kuralKapali = o.kuralKapali.filter(function (k, i, a) { return typeof k === 'string' && KURAL_IDS.indexOf(k) >= 0 && a.indexOf(k) === i; });
    ['kuralKapaliKullanici', 'kuralKapaliArilik'].forEach(function (f) { var m = o[f]; if (!m || typeof m !== 'object' || Array.isArray(m)) return; Object.keys(m).slice(0, 2000).forEach(function (key) { var nk = kuralAnahtar(key), L = Array.isArray(m[key]) ? m[key].filter(function (x, i, a) { return KURAL_IDS.indexOf(x) >= 0 && a.indexOf(x) === i; }) : []; if (nk && L.length) d[f][nk] = L; }); });
    var b = num01(o.buckfastIkili, 0, 100); if (b != null) d.buckfastIkili = b;
    var u = num01(o.bilinmeyen, 0, 100); if (u != null) d.bilinmeyen = u;
    /* koloni-273: ayrı modüllerin ayarları (hastalik-ayar.js, bal-hedef.js kendi merge’üyle doğrular) birleştirmede düşmesin — önceden ogulSkor().hastalik hep boştu */
    ['hastalik', 'balHedef', 'melezYon'].forEach(function (k) { var v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v)) { try { d[k] = k === 'melezYon' ? melezYonMerge(v) : JSON.parse(JSON.stringify(v)); } catch (eK) { /* yoksay */ } } });
    return d;
  }
  var OGUL_SKOR = ogulSkorDefaults();
  try { var oc = JSON.parse(localStorage.getItem(OGUL_SKOR_KEY) || 'null'); if (oc && oc.data) OGUL_SKOR = ogulSkorMerge(oc.data); } catch (eOS) { /* varsayılan */ }
  function ogulSkorSet(data, meta) {
    OGUL_SKOR = ogulSkorMerge(data);
    try { localStorage.setItem(OGUL_SKOR_KEY, JSON.stringify({ data: data, at: (meta && meta.at) || new Date().toISOString() })); } catch (e) {}
    return OGUL_SKOR;
  }
  /** Buluttan güncel ayarı çeker (oturum gerekmez); değiştiyse önbelleğe yazar. */
  function ogulSkorSync() {
    var g = typeof window !== 'undefined' ? window : globalThis, B = g.SuperAriBulut;
    if (!B || !B.client || !B.loadConfig) return Promise.resolve(false);
    return B.loadConfig().then(function (cfg) {
      if (!cfg || !cfg.enabled) return false;
      return B.client().then(function (c) { return c.from('ogul_skor_ayar').select('data,updated_at').eq('id', 1).maybeSingle(); }).then(function (r) {
        if (!r || r.error || !r.data || !r.data.data) return false;
        var prev = null; try { prev = (JSON.parse(localStorage.getItem(OGUL_SKOR_KEY) || 'null') || {}).at; } catch (e) {}
        if (prev === r.data.updated_at) return false;
        ogulSkorSet(r.data.data, { at: r.data.updated_at }); return true;
      });
    }).catch(function () { return false; });
  }
  /* k161 EK10: ayar sürümü — açılışta ve öne gelince kontrol; değiştiyse sessizce çek + 'superari-ayar-guncel' (sayfalar yerinde yeniden hesaplar; genel bildirim yok) */
  var AYAR_SURUM_KEY = 'superari.ayar.surum.v1';
  function ayarSurumKontrol() {
    var g = typeof window !== 'undefined' ? window : globalThis, B = g.SuperAriBulut;
    if (!B || !B.client || !B.loadConfig) return Promise.resolve(false);
    return B.loadConfig().then(function (cfg) {
      if (!cfg || !cfg.enabled) return false;
      return B.client().then(function (c) { return c.rpc('sa_ayar_surum'); }).then(function (r) {
        var v = r && !r.error ? Number(r.data) : NaN; if (!isFinite(v)) return false;
        var once = Number(localStorage.getItem(AYAR_SURUM_KEY) || 0); if (v === once) return false;
        return ogulSkorSync().then(function () {
          try { localStorage.setItem(AYAR_SURUM_KEY, String(v)); } catch (e) {}
          if (once) { try { g.dispatchEvent(new CustomEvent('superari-ayar-guncel', { detail: { surum: v, once: once } })); } catch (e) {} }
          return true;
        });
      });
    }).catch(function () { return false; });
  }
  if (typeof setTimeout === 'function' && typeof window !== 'undefined' && window.document) {
    setTimeout(function () { ogulSkorSync().then(ayarSurumKontrol); }, 2500);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') ayarSurumKontrol(); });
  }
  /* k131: sensör okumaları (sensor-polling.js deposu, localStorage) — kovan başına son 72 saat. */
  var SENS_KEYS = { tarti: 'superari.sensor.tarti.v1', isi_nem: 'superari.sensor.isi_nem.v1', ses: 'superari.sensor.ses.v1', titresim: 'superari.sensor.titresim.v1', ir: 'superari.sensor.ir.v1', dis_isi_nem: 'superari.sensor.dis_isi_nem.v1' };
  var sensCache = {};
  /* koloni-241: ham okumalar SuperAriSensorHam (IndexedDB + bellek penceresi); IndexedDB yoksa eski localStorage anahtarı */
  function sensHam() { var Hm = global.SuperAriSensorHam; return Hm && Hm.list ? Hm : null; }
  function sensList(tip) {
    var Hm = sensHam(), raw = null, src = null;
    if (Hm && Hm.aktif()) { src = Hm.list(tip); raw = 'h' + Hm.surum() + (Hm.hazir() ? '' : ':' + src.length); }
    else { try { raw = localStorage.getItem(SENS_KEYS[tip]); } catch (e) { raw = null; } }
    var DVk = global.SuperAriDevices, dk = DVk && DVk.disRaw ? DVk.disRaw() : ''; /* koloni-220: devre dışı cihaz okumaları hesaba girmez */
    var c = sensCache[tip]; if (c && c.raw === raw && c.dk === dk) return c.list;
    var l = src ? src.slice() : []; if (!src) { try { l = JSON.parse(raw || '[]'); } catch (e) { l = []; } } if (!Array.isArray(l)) l = [];
    if (dk && DVk.okumaKapali) l = l.filter(function (x) { return !(x && DVk.okumaKapali(x.hiveId, tip)); });
    l = l.map(function (x) { var t = Date.parse(String(x.at || '').length <= 16 ? x.at + ':00' : x.at); return isFinite(t) ? Object.assign({ t: t }, x) : null; }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    sensCache[tip] = { raw: raw, dk: dk, list: l }; return l;
  }
  /* koloni-241: yerel gün anahtarı (sensor-ham.js ile aynı) + günlük özet erişimi */
  function gunKeyL(t) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ozGun(S, t) { var G = S && S.gunluk; return G ? (G[gunKeyL(t)] || null) : null; }
  /** k151: olaya dayalı sensör girişi. JSON: { kovan_id, sensor_tipi, timestamp, deger } (ses/titresim: sinif, hz, db, sure_ms, ritmik; FFT kovan cihazında).
      Kaydeder ve YALNIZ o kovanın Sıkışıklık puanını yeniden hesaplar (zamanlayıcı yok). Dönen: { ok, kovanId, sikisiklik, etiket } */

  /* k159: sıcaklık ve nem okumaları ayrı satırlar, zaman etiketli — cihazda (localStorage) + Supabase sensor_okumalari (kullanıcıya özel RLS). Olaya dayalı gönderim (zamanlayıcı yok). */
  var OKUMA_KEY = 'superari.sensor.okumalar.v1', OKUMA_Q = 'superari.sensor.okumalar.kuyruk.v1';
  function okumaRows(r, tip) {
    var out = [], base = { kovan_id: r.hiveId >= 0 ? r.hiveId : null, arilik_id: r.apiaryId != null ? String(r.apiaryId) : null, sensor_tipi: tip, ts: r.at };
    if (r.tempC != null && isFinite(r.tempC)) out.push(Object.assign({ olcum: 'isi', deger: Math.round(r.tempC * 10) / 10, birim: '°C' }, base));
    if (r.rh != null && isFinite(r.rh)) out.push(Object.assign({ olcum: 'nem', deger: Math.round(r.rh * 10) / 10, birim: '%' }, base));
    return out;
  }
  function okumaRead(k) { try { var l = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function okumaKaydet(rows, nowMs) {
    if (!rows.length) return;
    var cut = new Date((nowMs || Date.now()) - 30 * 86400000).toISOString();
    var L = okumaRead(OKUMA_KEY).concat(rows).filter(function (x) { return String(x.ts) >= cut; }).slice(-5000);
    try { localStorage.setItem(OKUMA_KEY, JSON.stringify(L)); } catch (e) { /* kota */ }
    var Q = okumaRead(OKUMA_Q).concat(rows).slice(-2000);
    try { localStorage.setItem(OKUMA_Q, JSON.stringify(Q)); } catch (e) { /* kota */ }
    okumaGonder();
  }
  var okumaBusy = false;
  function okumaGonder() {
    var g = typeof window !== 'undefined' ? window : globalThis, B = g.SuperAriBulut;
    if (okumaBusy || !B || !B.client || !B.session) return Promise.resolve(false);
    var Q = okumaRead(OKUMA_Q); if (!Q.length) return Promise.resolve(true);
    okumaBusy = true;
    return B.session().then(function (ses) {
      if (!ses) return false;
      return B.client().then(function (c) {
        var batch = Q.slice(0, 500);
        return c.from('sensor_okumalari').upsert(batch, { onConflict: 'user_id,sensor_tipi,olcum,kovan_id,arilik_id,ts', ignoreDuplicates: true }).then(function (r) {
          if (r && r.error) return false;
          var rest = okumaRead(OKUMA_Q).slice(batch.length);
          try { localStorage.setItem(OKUMA_Q, JSON.stringify(rest)); } catch (e) { /* ignore */ }
          return true;
        });
      });
    }).catch(function () { return false; }).then(function (v) { okumaBusy = false; return v; });
  }
  /** Son okumalar: { tip: 'isi_nem'|'dis_isi_nem', kovanId?, apiaryId?, limit } → [{ ts, isi, nem, kovanId, apiaryId }] (aynı zaman damgası tek satır) */
  function sensorOkumalar(o) {
    o = o || {}; var tip = o.tip || 'isi_nem', by = {};
    okumaRead(OKUMA_KEY).forEach(function (x) {
      if (x.sensor_tipi !== tip) return;
      try { var DVo = global.SuperAriDevices; if (DVo && DVo.okumaKapali && DVo.okumaKapali(x.kovan_id, tip)) return; } catch (eO) { /* ignore */ }
      if (o.kovanId != null && Number(x.kovan_id) !== Number(o.kovanId)) return;
      if (o.apiaryId && x.arilik_id != null && String(x.arilik_id) !== String(o.apiaryId)) return;
      var k = x.ts + '|' + x.kovan_id + '|' + x.arilik_id;
      var r = by[k] || (by[k] = { ts: x.ts, kovanId: x.kovan_id, apiaryId: x.arilik_id, isi: null, nem: null });
      if (x.olcum === 'isi') r.isi = Number(x.deger); else if (x.olcum === 'nem') r.nem = Number(x.deger);
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }).slice(0, o.limit || 50);
  }
  var SIK_CACHE = {};
  /** koloni-241: cihaz alanları atılmaz — giren/cikan (in/out), yer, rms, deger, darbe, g, bant, sr, deviceId, kanal/kanallar, pil. Ham veri yazılım geliştirme için saklanır. */
  function sensorAlanGecir(j, d, r, tip) {
    var o = d && typeof d === 'object' ? d : {};
    function al(k) { return j[k] != null ? j[k] : o[k]; }
    function sayi(v) { v = Number(v); return isFinite(v) ? v : null; }
    var dev = j.deviceId != null ? j.deviceId : (j.cihaz_id != null ? j.cihaz_id : (j.device_id != null ? j.device_id : o.deviceId)); if (dev != null) r.deviceId = String(dev).slice(0, 64);
    var yer = al('yer'); if (yer != null) r.yer = String(yer).slice(0, 20);
    if (tip === 'ir') {
      var gi = sayi(al('giren') != null ? al('giren') : al('in')), ci = sayi(al('cikan') != null ? al('cikan') : al('out'));
      if (gi != null) r.giren = gi; if (ci != null) r.cikan = ci;
      if (!isFinite(r.count) && gi != null && ci != null) r.count = gi + ci;
      if (!isFinite(r.count)) delete r.count;
    }
    if (tip === 'titresim' || tip === 'ses') {
      ['rms', 'g', 'sr', 'deger', 'enerji'].forEach(function (k) { var v = sayi(al(k)); if (v != null) r[k] = v; });
      if (typeof d === 'number' && r.deger == null && tip === 'titresim') r.deger = d;
      var dz = al('darbe'); if (dz != null) r.darbe = dz === true || dz === 1 || dz === '1' || dz === 'true';
      var bt = al('bant'); if (bt != null) r.bant = typeof bt === 'object' ? bt : String(bt).slice(0, 40);
      var orn = al('ornekleme'); if (orn != null && r.sr == null && isFinite(Number(orn))) r.sr = Number(orn);
    }
    var kn = al('kanal'); if (kn != null) r.kanal = kn;
    var kl = al('kanallar'); if (Array.isArray(kl)) r.kanallar = kl.slice(0, 16).map(function (k) { return { kanal: k && k.kanal != null ? k.kanal : null, giren: sayi(k && (k.giren != null ? k.giren : k['in'])), cikan: sayi(k && (k.cikan != null ? k.cikan : k.out)) }; });
    var pil = sayi(al('pil') != null ? al('pil') : al('batteryPct')); if (pil != null) r.pil = pil;
    return r;
  }
  function sensorGiris(j, nowMs) {
    if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { return { ok: false, hata: 'json' }; } }
    if (!j || typeof j !== 'object') return { ok: false, hata: 'bos' };
    var hid = Number(j.kovan_id), tip = String(j.sensor_tipi || '').toLowerCase(), t = Date.parse(j.timestamp);
    if (tip === 'nem' || tip === 'isi') tip = 'isi_nem';
    if (tip === 'dis_isi_nem' && !isFinite(hid) && j.arilik_id != null) hid = -1;
    if (!isFinite(hid) || !SENS_KEYS[tip] || !isFinite(t)) return { ok: false, hata: 'alan' };
    if (hid === -1) { /* arılık geneli dış sensör: kayıt, puan yeniden hesap yok */ }
    var d = j.deger, r = { hiveId: hid, type: tip, at: new Date(t).toISOString() };
    if (j.arilik_id != null) r.apiaryId = String(j.arilik_id);
    if (tip === 'dis_isi_nem') { var od = d && typeof d === 'object' ? d : {}; ['tempC', 'rh', 'mm', 'pr'].forEach(function (k) { if (od[k] != null) r[k] = Number(od[k]); }); if (od.yagmur != null) r.yagmur = !!od.yagmur; }
    if (tip === 'tarti') r.kg = Number(d && typeof d === 'object' ? d.kg : d);
    else if (tip === 'ir') r.count = Number(d && typeof d === 'object' ? d.count : d);
    else if (tip === 'dis_isi_nem') { /* yukarıda */ }
    else if (tip === 'isi_nem') { var o = d && typeof d === 'object' ? d : {}; if (String(j.sensor_tipi).toLowerCase() === 'nem') o = { rh: d }; else if (String(j.sensor_tipi).toLowerCase() === 'isi') o = { tempC: d }; if (o.tempC != null) r.tempC = Number(o.tempC); if (o.rh != null) r.rh = Number(o.rh); if (o.disRh != null) r.disRh = Number(o.disRh); }
    else { var a = d && typeof d === 'object' ? d : {}; ['hz', 'db', 'sinif', 'sure_ms', 'ritmik', 'guven'].forEach(function (k) { var v = j[k] != null ? j[k] : a[k]; if (v != null) r[k] = v; }); if (r.db != null) { r.dbRel = Number(r.db); r.level = Number(r.db); delete r.db; } if (r.sure_ms != null) { r.sureMs = Number(r.sure_ms); delete r.sure_ms; } if (r.hz != null) r.hz = Number(r.hz); }
    sensorAlanGecir(j, d, r, tip);
    if (r.apiaryId == null && hid >= 0) { try { var hA = hiveById(hid); if (hA && hA.apiaryId != null) r.apiaryId = String(hA.apiaryId); } catch (eA) { /* */ } }
    var Hm = sensHam();
    if (!(Hm && Hm.ekle(tip, r))) { /* IndexedDB yok → eski localStorage yolu (8 gün / 20.000 satır) */
      var L = []; try { L = JSON.parse(localStorage.getItem(SENS_KEYS[tip]) || '[]'); } catch (e) { L = []; } if (!Array.isArray(L)) L = [];
      L.push(r); var cut = (nowMs || Date.now()) - 8 * 24 * 3600000;
      L = L.filter(function (x) { var tt = Date.parse(x.at); return !isFinite(tt) || tt >= cut; }).slice(-20000);
      try { localStorage.setItem(SENS_KEYS[tip], JSON.stringify(L)); } catch (e) { /* kota */ }
    }
    /* k146 + koloni-241: gerçek cihazın etiketli ses/titreşim olayı → ses_olaylari (oturum yoksa yalnız yerelde) */
    if ((tip === 'ses' || tip === 'titresim') && r.sinif && !r.demo) { try { var SP = global.SuperAriSensorPolling; if (SP && SP.sesOlayGonder) SP.sesOlayGonder(r); } catch (eS) { /* */ } }
    if (tip === 'isi_nem' || tip === 'dis_isi_nem') okumaKaydet(okumaRows(r, tip), nowMs);
    var now = Math.max(nowMs || Date.now(), t), S = hiveSens(hid, now), h = null;
    try { h = (typeof hiveById === 'function' ? hiveById(hid) : null); } catch (e) { h = null; }
    var so = sensorOrs(S, h && h.boxes ? 10 * ((Number(h.boxes.body) || 1) + (Number(h.boxes.kat) || 0)) : 10, Object.assign({}, OGUL_SKOR.sensor));
    SIK_CACHE[hid] = { at: now, sikisiklik: so.sikSensor, etiket: so.sikEtiket || null, piping: so.piping };
    try { var gK = typeof window !== 'undefined' ? window : globalThis; if (gK.SuperAriKritik && (tip === 'ses' || tip === 'titresim')) gK.SuperAriKritik.sesten(hid, so, h && h.apiaryId); } catch (eK) { /* */ }
    try { if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('superari:sikisiklik', { detail: { kovanId: hid, sikisiklik: so.sikSensor } })); } catch (e) { /* yok */ }
    return { ok: true, kovanId: hid, sikisiklik: so.sikSensor, etiket: so.sikEtiket || null, piping: so.piping };
  }
  /* k180: Varroa hatırlatma çapası (kovan → ilk gösterim günü). Aynı hafta içinde aynı görev (sig) — tamamlandıysa tekrar açılmaz; süre dolunca yeni görev. Son varroa sayımı süre içindeyse görev yok. */
  var VARROA_SES_KEY = 'superari.varroa.ses.v1';
  function varroaHatirlatma(hid, sapma, sonSayim, today) {
    var gun = Number(OGUL_SKOR.sensor.varroaGun) || 7, M = {}; try { M = JSON.parse(localStorage.getItem(VARROA_SES_KEY) || '{}') || {}; } catch (e) { M = {}; }
    var an = M[hid];
    if (an && today < addDays(an, gun)) return sapma ? an : null;
    if (!sapma) return null;
    if (sonSayim && sonSayim > addDays(today, -gun)) return null;
    M[hid] = today; try { localStorage.setItem(VARROA_SES_KEY, JSON.stringify(M)); } catch (e) { /* kota */ }
    return today;
  }
  /* k181: genel haftalık hatırlatma çapası (anahtar → kovan → ilk gösterim günü). Aynı dönemde aynı sig — tamamlandıysa tekrar açılmaz. */
  function haftalikHatirlatma(anahtar, hid, kosul, today, gun) {
    gun = Number(gun) || 7; var K = 'superari.hatirlatma.' + anahtar + '.v1', M = {}; try { M = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { M = {}; }
    var an = M[hid];
    if (an && today < addDays(an, gun)) return kosul ? an : null;
    if (!kosul) return null;
    M[hid] = today; try { localStorage.setItem(K, JSON.stringify(M)); } catch (e) { /* kota */ }
    return today;
  }
  function ayIcinde(m, b, e) { b = Number(b); e = Number(e); return b <= e ? m >= b && m <= e : m >= b || m <= e; }
  /** k182: Kireç riski + genel koloni kontrolü. Teşhis değil. Dönen { kirec, kirecNem, genel, genelNeden, genelNufusUyari, genelNufusKritik }.
      Kireç: kuluçka döneminde (kirecAyBas–Son) kuluçka ısısı kesintisiz kirecSaat saat < kirecIsiC (okumalar arası ≤ 2 saat). Nem yalnız destekleyici.
      Genel (ağırlık): kış–ilkbahar son 24 saat kaybı ≥ genelKayipMinKg ve önceki günlerin ortanca kaybının ≥ genelKayipKat katı.
      Nüfus: IR düşüşü ≥ genelNufusUyariOran → uyarı; ≥ genelNufusKritikOran → kritik (uzman tahmini). */
  /** koloni-267: Genel kontrol (ağırlık) — kış–ilkbahar (genelAyBas–Son) son 24 saat kaybı ≥ genelKayipMinKg ve önceki günlerin ortanca kaybının ≥ genelKayipKat katı.
      Tek tanım: saglikHatirlatmalari ve Tartı sayfası «Ani düşüş» döşemesi aynı fonksiyonu kullanır (yönetici › Ölçüm kuralları › Ağırlık (tartı)). Yan etkisiz. */
  function genelAgirlikKaybi(S, T, nowMs) {
    var H = 3600000, D = 24 * H, ay = new Date(nowMs).getMonth() + 1;
    if (!ayIcinde(ay, T.genelAyBas, T.genelAySon)) return false;
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    var W = (S.tarti || []).filter(function (x) { return isFinite(Number(x.kg)); });
    function kgAt(t) { var b = null; W.forEach(function (x) { if (x.t <= t) b = x; }); return b && t - b.t <= 3 * H ? Number(b.kg) : null; }
    if (W.length <= 1) return false;
    var son = W[W.length - 1].t;
    var gunluk = []; for (var i = 0; i < 7; i++) { var y = i === 0 ? Number(W[W.length - 1].kg) : kgAt(son - i * D), o = kgAt(son - (i + 1) * D); gunluk.push(y != null && o != null ? o - y : null); }
    var bugun = gunluk[0], gecmis = gunluk.slice(1).filter(function (v) { return v != null; });
    if (!(bugun != null && gecmis.length >= 3)) return false;
    var m = Math.max(0.05, md(gecmis));
    return bugun >= T.genelKayipMinKg && bugun >= m * T.genelKayipKat && kuralAcik('agirlik', S.apiaryId);
  }
  function saglikHatirlatmalari(S, T, nowMs) {
    var H = 3600000, D = 24 * H, ay = new Date(nowMs).getMonth() + 1, r = { kirec: false, kirecNem: false, genel: false, genelNeden: null, genelNufusUyari: false, genelNufusKritik: false };
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    var I = (S.isi_nem || []).filter(function (x) { return isFinite(Number(x.tempC)); });
    if (ayIcinde(ay, T.kirecAyBas, T.kirecAySon) && I.length) {
      var bas = null, p = null, maks = 0, enBas = null;
      I.forEach(function (x) { var lo = Number(x.tempC) < T.kirecIsiC; if (lo && (bas == null || (p && x.t - p.t > 2 * H))) bas = x.t; if (!lo) bas = null; if (lo && bas != null && x.t - bas > maks) { maks = x.t - bas; enBas = bas; } p = x; });
      if (maks >= T.kirecSaat * H) { r.kirec = true; var rh = md(I.filter(function (x) { return x.t >= enBas; }).map(function (x) { return Number(x.rh); })); r.kirecNem = rh != null && rh > T.nemKirecUst; /* koloni-205: nem tek kaynak — kireç eşiği */ }
    }
    /* k192: Kuluçka sıcaklığı — yalnız sensör kuluçkalıktaysa (S.kuluckaSensoru). Bant dışı kesintisiz kuluckaSaat saat → kulucka; son kuluckaOynaklikSaat saatte en yüksek−en düşük ≥ kuluckaOynaklikC → kuluckaOynak. Teşhis değil. */
    /* k194: hedef 34,5 °C (Groh 2004). Uyarı: < kuluckaUyariAltC ya da ≥ kuluckaUyariUstC kesintisiz kuluckaSaat; kritik: < kuluckaAltC ya da > kuluckaUstC (Kleinhenz 2003) kesintisiz kuluckaSaat. */
    r.kulucka = false; r.kuluckaYon = null; r.kuluckaKritik = false; r.kuluckaAcil = false; r.kuluckaOynak = false;
    /* k195: ACİL (kritikten bir üst): ≤ kuluckaAcilC kesintisiz kuluckaAcilSaat → kireç hastalığı riski (Flores 1996). Süre uzman tahmini. */
    if (S.kuluckaSensoru && ayIcinde(ay, T.kuluckaAyBas, T.kuluckaAySon) && I.length) {
      var kuSeri = function (yonF, saat) { saat = saat || T.kuluckaSaat; var kb = null, kp = null, kyon = null, sonuc = null;
        I.forEach(function (x) { var y = yonF(Number(x.tempC));
          if (!y || (kp && x.t - kp.t > 2 * H) || y !== kyon) kb = y ? x.t : null; kyon = y;
          if (y && kb != null && x.t - kb >= saat * H) sonuc = y; kp = x; });
        return sonuc; };
      var kKr = kuSeri(function (v) { return v < T.kuluckaAltC ? 'dusuk' : v > T.kuluckaUstC ? 'yuksek' : null; });
      var kUy = kuSeri(function (v) { return v < T.kuluckaUyariAltC ? 'dusuk' : v >= T.kuluckaUyariUstC ? 'yuksek' : null; });
      var kAc = kuralAcik('kuluckaAcil', S.apiaryId) ? kuSeri(function (v) { return v <= T.kuluckaAcilC ? 'dusuk' : null; }, T.kuluckaAcilSaat || T.kuluckaSaat) : null;
      if (!kuralAcik('kulucka', S.apiaryId)) { kKr = null; kUy = null; }
      if (kAc) { r.kulucka = true; r.kuluckaKritik = true; r.kuluckaAcil = true; r.kuluckaYon = 'dusuk'; } else if (kKr) { r.kulucka = true; r.kuluckaKritik = true; r.kuluckaYon = kKr; } else if (kUy) { r.kulucka = true; r.kuluckaYon = kUy; }
      var son2 = I[I.length - 1].t, P = I.filter(function (x) { return x.t >= son2 - T.kuluckaOynaklikSaat * H; });
      if (P.length >= 6 && son2 - P[0].t >= 0.8 * T.kuluckaOynaklikSaat * H) { var vs = P.map(function (x) { return Number(x.tempC); }); if (Math.max.apply(null, vs) - Math.min.apply(null, vs) >= T.kuluckaOynaklikC && kuralAcik('kulucka', S.apiaryId)) r.kuluckaOynak = true; }
    }
    /* koloni-199: nem normal aralık (nemNormalAlt–nemNormalUst) dışında kesintisiz nemDisiSaat → nemDisi; IR oğul/yağma/trafik; titreşim olağandışı hareket. Tümü uzman tahmini; teşhis değil. */
    yeniKurallar(S, T, r, nowMs);
    if (!kuralAcik('kirec', S.apiaryId)) { r.kirec = false; r.kirecNem = false; }
    kuralYeni5(S, T, r, nowMs);
    kuralIr5(S, T, r, nowMs);
    if (ayIcinde(ay, T.genelAyBas, T.genelAySon)) {
      if (genelAgirlikKaybi(S, T, nowMs)) { r.genel = true; r.genelNeden = 'agirlik'; }
      var Ir = (S.ir || []).filter(function (x) { return isFinite(Number(x.count)); });
      if (Ir.length) {
        var sn = Ir[Ir.length - 1].t, yeni = md(Ir.filter(function (x) { return x.t > sn - D; }).map(function (x) { return Number(x.count); })), eski = md(Ir.filter(function (x) { return x.t <= sn - D; }).map(function (x) { return Number(x.count); }));
        if (eski > 0 && yeni != null && Ir.filter(function (x) { return x.t <= sn - D; }).length >= 3) {
          var dus = (eski - yeni) / eski;
          if (dus >= T.genelNufusKritikOran) { r.genelNufusKritik = true; r.genelNufusUyari = true; }
          else if (dus >= T.genelNufusUyariOran) { r.genelNufusUyari = true; }
        }
      }
    }
    return r;
  }
  /** koloni-231 (kullanıcı onayı): 5 yeni sensör kuralı. Değerler OGUL_SKOR.sensor (tek kaynak, panelden); kaynaklar yalnız yönetici panelinde; teşhis değil.
      (1) koloniSonuk — Meikle ve ark. 2017 (kavram): kovan sıcaklığı düzenlenmez (günlük salınım dış havaya yaklaşır), IR ~0, ağırlık yalnız oynar.
      (2) yavrusuz — Groh 2004 / Kleinhenz 2003 / Meikle 2017: yavru varken kuluçka 34–35 °C sabit; büyük günlük salınım → yavru kalmamış olabilir (anasızlık uyarısıyla tek uyarı).
      (3) tarlaciKayip — Meikle 2008 / 2018, Meikle & Holst 2014: uygun uçuş gününde sabah çıkış düşüşü kovanın kendi tabanına göre kaybolur.
      (4) esekGiris — sıcaklık değişimi + titreşim + (tıslama ya da tıslamasız IR çıkan düşüşü). Tıslama ölçülemezse IR yedek (Requier 2019 / Monceau 2013, Tem–Eki, uygun uçuş günü); IR de yoksa uyarı yok.
      (5) havalandirma — CO₂ sensörü olmadan: sıcak+nemli kuluçka ya da soğuk dönemde yoğuşma riski; yelpazeleme sesi destekler. */
  function kuralYeni5(S, T, r, nowMs) {
    var H = 3600000, D = 24 * H, ap = S.apiaryId, ay = new Date(nowMs).getMonth() + 1;
    function num(v) { v = Number(v); return isFinite(v) ? v : null; }
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    function salinim(L, a, b) { var v = L.filter(function (x) { return x.t > a && x.t <= b; }); if (v.length < 6 || v[v.length - 1].t - v[0].t < 0.8 * (b - a)) return null; var n = v.map(function (x) { return Number(x.tempC); }); return Math.max.apply(null, n) - Math.min.apply(null, n); }
    var I = (S.isi_nem || []).filter(function (x) { return num(x.tempC) != null && x.yer !== 'giris'; }), O = (S.dis || []).filter(function (x) { return num(x.tempC) != null; });
    var son = I.length ? I[I.length - 1].t : nowMs;
    r.koloniSonuk = false; r.yavrusuz = false; r.tarlaciKayip = false; r.esekSicakAt = []; r.esekTitAt = []; r.esekGirisSicak = []; r.esekIrAt = []; r.esekIrVar = false; r.havalandirma = false; r.havaNeden = null; r.havaYelpaze = false;
    /* (1) Koloni sönmüş */
    if (kuralAcik('koloniSonuk', ap) && I.length && O.length) {
      var ok1 = true;
      for (var k = 0; k < T.sonukGun && ok1; k++) { var a = son - (k + 1) * D, b = son - k * D, si = salinim(I, a, b), so = salinim(O, a, b); ok1 = si != null && so != null && so >= T.sonukDisMinC && si >= so * T.sonukSalinimOran; }
      if (ok1) {
        var IR = (S.ir || []).map(function (x) { var g = num(x.giren != null ? x.giren : x['in']), c = num(x.cikan != null ? x.cikan : x.out); return g != null && c != null ? { t: x.t, v: g + c } : (num(x.count) != null ? { t: x.t, v: num(x.count) } : null); }).filter(Boolean).filter(function (x) { return x.t > son - D; });
        if (IR.length && IR.reduce(function (s2, x) { return s2 + x.v; }, 0) > T.sonukIrGunMax) ok1 = false;
        var W = (S.tarti || []).filter(function (x) { return num(x.kg) != null && x.t > son - D; }).map(function (x) { return Number(x.kg); });
        if (W.length >= 2 && Math.max.apply(null, W) - Math.min.apply(null, W) > T.sonukAgirlikKg) ok1 = false;
        r.koloniSonuk = ok1 && (IR.length > 0 || W.length >= 2); /* sıcaklık tek başına yetmez: IR ya da tartı da doğrulamalı */
      }
    }
    titresimKis(S, T, r, nowMs); if (r.titKis) r.koloniSonukTit = true; /* koloni-232: koloni ölümü ile tek uyarı */
    /* (2) Yavrusuz / anasız (kuluçka sıcaklığı salınımı) — yalnız sensör kuluçkalıktaysa ve kuluçka döneminde */
    if (kuralAcik('yavrusuzSicak', ap) && !r.koloniSonuk && S.kuluckaSensoru && ayIcinde(ay, T.kuluckaAyBas, T.kuluckaAySon) && I.length) {
      var ok2 = true; for (var k2 = 0; k2 < T.yavrusuzGun && ok2; k2++) { var sv = salinim(I, son - (k2 + 1) * D, son - k2 * D); ok2 = sv != null && sv >= T.yavrusuzSalinimC; }
      r.yavrusuz = ok2;
      if (ok2) r.kuluckaOynak = false; /* aynı belirti: genel oynaklık görevi yerine tek uyarı */
    }
    /* (3) Tarlacı kaybı — sabah çıkış düşüşü (tartı), yalnız uygun uçuş günleri */
    var Wt = (S.tarti || []).filter(function (x) { return num(x.kg) != null; });
    if (kuralAcik('tarlaciKayip', ap) && !r.koloniSonuk && Wt.length > 10 && O.length) {
      var g0 = new Date(Wt[Wt.length - 1].t); g0.setHours(0, 0, 0, 0); var dusus = [];
      for (var g = 0; g < T.tarlaciTabanGun + T.tarlaciGun + 7; g++) {
        var bas = g0.getTime() - g * D + T.tarlaciSaatBas * H, bit = bas + T.tarlaciPencereSaat * H;
        var hv = O.filter(function (x) { return x.t >= bas && x.t <= bit; });
        var uygun = hv.length && md(hv.map(function (x) { return Number(x.tempC); })) >= T.ucusGenelUygunC && !hv.some(function (x) { return Number(x.mm) >= T.ucusGenelYagisMm; });
        var w0 = Wt.filter(function (x) { return x.t <= bas && bas - x.t <= H; }), wp = Wt.filter(function (x) { return x.t > bas && x.t <= bit; });
        if (!w0.length || wp.length < 2) { /* koloni-241: ham yoksa günlük özet (sabah düşüşü + uygunluk) */
          var oz = ozGun(S, bas); if (oz && oz.sabahDususKg != null && (uygun || (!hv.length && oz.sabahUygun))) dusus.push(Number(oz.sabahDususKg));
          continue;
        }
        if (!uygun) continue;
        dusus.push(Number(w0[w0.length - 1].kg) - Math.min.apply(null, wp.map(function (x) { return Number(x.kg); })));
      }
      if (dusus.length >= T.tarlaciGun + 3) {
        var taban = md(dusus.slice(T.tarlaciGun, T.tarlaciGun + T.tarlaciTabanGun));
        r.tarlaciKayip = taban != null && taban >= T.tarlaciMinKg && dusus.slice(0, T.tarlaciGun).every(function (v) { return v < taban * T.tarlaciOran; });
      }
    }
    /* (4) Eşek arısı — sıcaklık değişimi + titreşim artışı zamanları; tıslama (ses) veya tıslamasız IR çıkan düşüşü ile birleştirme derivedItems'ta. */
    r.esekIrAt = []; r.esekIrVar = false;
    if (kuralAcik('esekGiris', ap)) {
      var Wm = T.esekEslesDk * 60000;
      [I, (S.giris || []).filter(function (x) { return num(x.tempC) != null; })].forEach(function (G) { G.forEach(function (x) { var w = G.filter(function (y) { return y.t <= x.t && y.t >= x.t - Wm; }).map(function (y) { return Number(y.tempC); }); if (w.length >= 2 && Math.max.apply(null, w) - Math.min.apply(null, w) >= T.esekSicakDegisimC) r.esekSicakAt.push(x.t); }); });
      (S.giris || []).forEach(function (x) { if (Number(x.tempC) > T.esekGirisYuksekC) r.esekGirisSicak.push(x.t); });
      var V = (S.titresim || []).map(function (x) { var v = x.rms != null ? x.rms : x.deger; return v != null && isFinite(Number(v)) ? { t: x.t, v: Number(v) } : null; }).filter(Boolean);
      V.forEach(function (x) { var tb = md(V.filter(function (y) { return y.t < x.t - Wm && y.t >= x.t - Wm - T.esekTitTabanDk * 60000; }).map(function (y) { return y.v; })); if (tb != null && tb > 0 && x.v >= tb * T.esekTitresimKat) r.esekTitAt.push(x.t); });
      /* tıslamasız yedek: Tem–Eki + uygun uçuş günü + çıkan trafik kendi tabanının altına düşer (Requier 2019 / Monceau 2013 bağlam; oran uzman tahmini) */
      function cikIr(x) { return num(x.cikan != null ? x.cikan : x.out); }
      var IR = (S.ir || []).filter(function (x) { return cikIr(x) != null; });
      r.esekIrVar = IR.length > 0;
      if (IR.length && ayIcinde(ay, T.esekIrAyBas, T.esekIrAySon)) {
        var Wp = T.esekIrPencereDk * 60000, Wt = T.esekIrTabanDk * 60000;
        var gb = T.gunduzSaatBas != null ? T.gunduzSaatBas : 7, gs = T.gunduzSaatSon != null ? T.gunduzSaatSon : 19;
        function uygunT(t) { var hv = O.filter(function (x) { return Math.abs(x.t - t) <= 3 * H; }); if (!hv.length) return false; var mdT = md(hv.map(function (x) { return Number(x.tempC); })); return mdT != null && mdT >= T.ucusGenelUygunC && !hv.some(function (x) { return Number(x.mm) >= T.ucusGenelYagisMm; }); }
        IR.forEach(function (x) {
          var hh = new Date(x.t).getHours(); if (hh < gb || hh >= gs || !uygunT(x.t)) return;
          var cur = 0, nC = 0; IR.forEach(function (y) { if (y.t <= x.t && y.t >= x.t - Wp) { cur += cikIr(y); nC++; } });
          if (!nC) return;
          var tabL = [];
          for (var off = Wp; off <= Wt; off += Wp) {
            var s3 = 0, n3 = 0; IR.forEach(function (y) { if (y.t < x.t - off + Wp && y.t >= x.t - off) { s3 += cikIr(y); n3++; } });
            if (n3) tabL.push(s3);
          }
          var tbI = md(tabL);
          if (tbI != null && tbI > 0 && cur <= tbI * T.esekIrOran) r.esekIrAt.push(x.t);
        });
      }
    }
    /* (5) Havalandırma yetersiz (CO₂ yok): sıcak + nemli kuluçka ya da soğuk dönemde yoğuşma riski */
    if (kuralAcik('havalandirma', ap) && !r.koloniSonuk) {
      var N = I.filter(function (x) { return num(x.rh) != null; });
      function disAt(t) { var b2 = null; O.forEach(function (x) { if (x.t <= t + H) b2 = x; }); return b2 && Math.abs(t - b2.t) <= 3 * H ? Number(b2.tempC) : null; }
      function seri(f) { var b3 = null, p = null, out = false; N.forEach(function (x) { var y = f(x); if (!y || b3 == null || (p && x.t - p.t > 2 * H)) b3 = y ? (b3 != null && !(p && x.t - p.t > 2 * H) ? b3 : x.t) : null; if (y && b3 != null && x.t - b3 >= T.havaSaat * H) out = true; p = x; }); return out; }
      if (seri(function (x) { return Number(x.rh) > T.nemNormalUst && Number(x.tempC) > T.havaSicakC; })) r.havaNeden = 'sicak';
      else if (ayIcinde(ay, T.havaYogusmaAyBas, T.havaYogusmaAySon) && seri(function (x) { var dt = disAt(x.t); return Number(x.rh) >= T.havaYogusmaRh && dt != null && Number(x.tempC) - dt >= T.havaYogusmaFarkC; })) r.havaNeden = 'yogusma';
      r.havalandirma = !!r.havaNeden;
      r.havaYelpaze = r.havalandirma && (S.ses || []).some(function (x) { var hz = Number(x.hz); return x.t > son - T.havaSaat * H && (x.sinif === 'yelpazeleme' || (hz >= T.yelpazeHzMin && hz <= T.yelpazeHzMax)); });
      /* nem kuralıyla çift uyarı yok: «nem normalin üstünde» görevi bu uyarıya katılır; kireç riski varsa kireç görevi kalır, bu uyarı çıkmaz */
      if (r.havalandirma && r.nemDisi && r.nemYon === 'yuksek') { r.nemDisi = false; r.nemYon = null; }
      if (r.havalandirma && (r.kirec || r.nemYon === 'kirec')) { r.havalandirma = false; r.havaNeden = null; }
    }
    return r;
  }

  /* koloni-232 (kullanıcı onayı): 4 titreşim kuralı. Değerler OGUL_SKOR.sensor (tek kaynak, panelden); frekans/kaynak yalnız yönetici panelinde. Mevcut ses kurallarıyla tek uyarı.
     (1) titOgul — Bencsik 2011 (doi:10.1016/j.compag.2011.01.004), Ramsey 2020 (doi:10.1038/s41598-020-66115-5): gece düşük bant titreşimi oğuldan ~10 gün önce kendi tabanına göre artar → r.ogulOnce.
     (2) titOtme — Ramsey 2020: tooting (200–550 Hz) sonra quacking (~300–350 Hz) → bakire ana çıktı, ikincil oğul riski.
     (3) titDarbe — Ramsey 2017 (doi:10.1371/journal.pone.0171162): 200–400 Hz kısa sinyaller tabanın çok üstünde ya da tek büyük ivme sıçraması → r.rahatsiz.
     (4) titKis — Bencsik 2024 (doi:10.1038/s41598-024-54107-8): kışın titreşim sıfıra yakın → koloni ölümü şüphesi (kuralYeni5 içinde, koloniSonuk ile tek uyarı). */
  function titDeger(x) { var v = x.rms != null ? x.rms : (x.deger != null ? x.deger : x.level); v = Number(v); return isFinite(v) ? v : null; }
  function titresimYeni4(S, T, r, son) {
    var H = 3600000, D = 24 * H, aid = S.apiaryId, V = (S.titresim || []).slice().sort(function (a, b) { return a.t - b.t; });
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    function hz(x) { return Number(x.hz); }
    r.titOgul = false; r.titOtme = false; r.titDarbe = false;
    if (!V.length) return r;
    var sonV = V[V.length - 1].t;
    /* (1) gece düşük bant seviyesi: her gece ortanca; son titOgulArtisGece gece tabanın titOgulArtisOran katı ve artan */
    if (kuralAcik('titOgul', aid)) {
      var gece = function (x) { var h = new Date(x.t).getHours(); return h >= T.titOgulGeceBas && h < T.titOgulGeceSon; };
      var bant = function (x) { var f = hz(x); return !isFinite(f) || (f >= T.titOgulHzMin && f <= T.titOgulHzMax) || x.bant === 'dusuk'; };
      var g0 = new Date(sonV); g0.setHours(0, 0, 0, 0); var gn = [];
      for (var g = 0; g < T.titOgulGun + T.titOgulTabanGun; g++) { var a = g0.getTime() - g * D, b = a + D, gv = md(V.filter(function (x) { return x.t >= a && x.t < b && gece(x) && bant(x) && !x.darbe; }).map(titDeger)); if (gv == null) { var oz = ozGun(S, a + 12 * H); if (oz && oz.titGeceMd != null && isFinite(oz.titGeceMd)) gv = Number(oz.titGeceMd); } gn.push(gv); } /* koloni-241: ham yoksa günlük özet */
      var son3 = gn.slice(0, T.titOgulArtisGece), taban = md(gn.slice(T.titOgulGun, T.titOgulGun + T.titOgulTabanGun));
      if (taban != null && taban > 0 && son3.every(function (v) { return v != null && v >= taban * T.titOgulArtisOran; })) {
        var art = true; for (var i = 0; i < son3.length - 1; i++) if (son3[i] < son3[i + 1]) art = false;
        r.titOgul = art;
      }
      if (r.titOgul) { if (r.ogulOnce) r.ogulOnceOrtak = true; r.ogulOnce = true; r.ogulOnceTit = true; if (r.notes) r.notes.push('Sensör: gece titreşimi oğul öncesine benzer şekilde arttı'); }
    }
    /* (2) tooting → quacking */
    if (kuralAcik('titOtme', aid)) {
      var toot = V.filter(function (x) { var f = hz(x); return x.sinif === 'tooting' || (isFinite(f) && f >= T.titTootHzMin && f <= T.titTootHzMax && (x.ritmik === true || x.rhythmic === true) && x.sinif !== 'quacking'); }).map(function (x) { return x.t; });
      var quack = V.filter(function (x) { var f = hz(x); return x.sinif === 'quacking' || (isFinite(f) && f >= T.titQuackHzMin && f <= T.titQuackHzMax && Number(x.sureMs) > 0 && Number(x.sureMs) < 200); }).map(function (x) { return x.t; });
      r.titOtme = quack.some(function (q) { return toot.some(function (t) { return t < q && q - t <= T.titOtmeSiraSaat * H; }); });
      if (r.titOtme && r.notes) r.notes.push('Sensör: bakire ana çıktı, ikincil oğul riski');
    }
    /* (3) kısa darbeler tabanın çok üstünde ya da tek büyük ivme sıçraması */
    if (kuralAcik('titDarbe', aid)) {
      var pw = T.titDarbePencereDk * 60000;
      var P = V.filter(function (x) { var f = hz(x), d = Number(x.sureMs); return isFinite(f) && f >= T.titDarbeHzMin && f <= T.titDarbeHzMax && isFinite(d) && d >= T.titDarbeMinMs && d <= T.titDarbeMaxMs; });
      P.forEach(function (x) {
        if (r.titDarbe) return; var cnt = P.filter(function (y) { return y.t <= x.t && y.t > x.t - pw; }).length; if (cnt < T.titDarbeMinSay) return;
        var onc = P.filter(function (y) { return y.t <= x.t - pw && y.t > x.t - pw - D; }).length, bek = onc / (D / pw);
        if (cnt >= T.titDarbeKat * Math.max(bek, 1)) { r.titDarbe = true; r.titDarbeAt = x.t; }
      });
      V.forEach(function (x) { var g2 = Number(x.g != null ? x.g : x.ivmeG); if (isFinite(g2) && g2 >= T.titSpikeG) { r.titDarbe = true; r.titDarbeAt = x.t; } });
      if (r.titDarbe) { if (!r.rahatsiz && r.notes) r.notes.push('Sensör: kovan rahatsız edilmiş olabilir'); r.rahatsiz = true; r.rahatsizAt = r.rahatsizAt || r.titDarbeAt; }
    }
    return r;
  }
  /* koloni-232: (4) kış hareketsizliği — kış aylarında titreşim titKisSaat boyunca kendi tabanının titKisOran altında */
  function titresimKis(S, T, r, nowMs) {
    var H = 3600000, D = 24 * H, ay = new Date(nowMs).getMonth() + 1; r.titKis = false;
    if (!kuralAcik('titKis', S.apiaryId) || !ayIcinde(ay, T.titKisAyBas, T.titKisAySon)) return r;
    var V = (S.titresim || []).map(function (x) { return { t: x.t, v: titDeger(x), d: x.darbe }; }).filter(function (x) { return x.v != null && !x.d; }).sort(function (a, b) { return a.t - b.t; });
    if (V.length < 6) return r;
    var son = V[V.length - 1].t, w = T.titKisSaat * H;
    var y = V.filter(function (x) { return x.t > son - w; }), e = V.filter(function (x) { return x.t <= son - w && x.t > son - w - T.titKisTabanGun * D; }).map(function (x) { return x.v; }).sort(function (a, b) { return a - b; });
    var eMin = 6;
    if (e.length < 6 && S.gunluk) { /* koloni-241: taban için ham yoksa günlük özet (gün ortancası, en az 3 gün) */
      var eo = []; for (var k = 0; k < T.titKisTabanGun; k++) { var oz = ozGun(S, son - w - k * D); if (oz && oz.titMd != null && isFinite(oz.titMd)) eo.push(Number(oz.titMd)); }
      if (eo.length >= 3) { e = eo.sort(function (a, b) { return a - b; }); eMin = 3; }
    }
    if (y.length < 3 || e.length < eMin || son - y[0].t < 0.8 * w) return r;
    var tb = e[Math.floor(e.length / 2)];
    r.titKis = tb > 0 && y.every(function (x) { return x.v <= tb * T.titKisOran; });
    return r;
  }
  /* koloni-236: cihaz yok / devre dışı / veri yok ayrımı (kısa metin; frekans yok). Admin «Veri yok» (bilimsel kaynak yok) değişmez. */
  function hiveCihazTipDurum(hid, tipEs) {
    var L = [];
    try {
      var DV = global.SuperAriDevices;
      if (DV && DV.listDevices) L = DV.listDevices().filter(function (d) {
        if (!d || d.hiveId == null || Number(d.hiveId) !== Number(hid)) return false;
        return typeof tipEs === 'function' ? tipEs(d) : (String(d.tip || d.type) === String(tipEs));
      });
    } catch (e) { L = []; }
    var aktif = L.filter(function (d) { return !d.disabled; });
    if (aktif.length) return 'aktif';
    if (L.length) return 'devre_disi';
    return 'yok';
  }
  function sensorCihazMetin(onEk, kod, varMi) {
    if (kod === 'yok') return onEk + ': Cihaz yok';
    if (kod === 'devre_disi') return onEk + ': Cihaz devre dışı';
    return onEk + ': ' + (varMi ? 'açık' : 'Veri yok');
  }
  function titresimDurum(hid) {
    try {
      var kod = hiveCihazTipDurum(hid, 'titresim');
      var S = hiveSens(hid, Date.now());
      return sensorCihazMetin('Titreşim uyarıları', kod, !!(S && S.titresim && S.titresim.length));
    } catch (e) { return 'Titreşim uyarıları: Cihaz yok'; }
  }
  function girisSayacDurum(hid) {
    try {
      var kod = hiveCihazTipDurum(hid, 'ir');
      var S = hiveSens(hid, Date.now());
      return sensorCihazMetin('Giriş sayacı', kod, !!(S && S.ir && S.ir.length));
    } catch (e) { return 'Giriş sayacı: Cihaz yok'; }
  }
  function girisSicakDurum(hid) {
    try {
      var kod = hiveCihazTipDurum(hid, function (d) { return String(d.tip || d.type) === 'isi_nem' && String(d.yer || '') === 'giris'; });
      var S = hiveSens(hid, Date.now());
      return sensorCihazMetin('Giriş sıcaklığı', kod, !!(S && S.giris && S.giris.length));
    } catch (e) { return 'Giriş sıcaklığı: Cihaz yok'; }
  }

  /** koloni-241: kovan × gün özeti (ham okumalardan; kural ayarlarıyla aynı pencere/bant). R: { tip: [okuma{t,...}] }, gunBasMs: yerel gün başı.
      Uzun taban isteyen kurallar (titreşim oğul 17 gece, kış hareketsizliği 14 gün, IR aktivite 14 gün, dönmeyen tarlacı 10 gün, tartı tarlacı) ham olmayan günlerde bunu okur. */
  function gunlukOzetHesapla(R, gunBasMs, T) {
    T = T || Object.assign({}, ORS_SENSOR, OGUL_SKOR.sensor || {}); R = R || {};
    var H = 3600000, o = { n: {} };
    function num(v) { v = Number(v); return isFinite(v) ? v : null; }
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    function r1(v, k) { if (v == null || !isFinite(v)) return null; var m = Math.pow(10, k == null ? 2 : k); return Math.round(v * m) / m; }
    function mnx(a, f) { a = a.filter(function (v) { return v != null; }); return a.length ? f.apply(null, a) : null; }
    Object.keys(R).forEach(function (tp) { o.n[tp] = (R[tp] || []).length; });
    var I = (R.isi_nem || []).filter(function (x) { return num(x.tempC) != null && x.yer !== 'giris'; }), N = (R.isi_nem || []).filter(function (x) { return num(x.rh) != null && x.yer !== 'giris'; });
    o.isiMin = r1(mnx(I.map(function (x) { return num(x.tempC); }), Math.min), 1); o.isiMax = r1(mnx(I.map(function (x) { return num(x.tempC); }), Math.max), 1); o.isiMd = r1(md(I.map(function (x) { return num(x.tempC); })), 1);
    o.nemMin = r1(mnx(N.map(function (x) { return num(x.rh); }), Math.min), 0); o.nemMax = r1(mnx(N.map(function (x) { return num(x.rh); }), Math.max), 0); o.nemMd = r1(md(N.map(function (x) { return num(x.rh); })), 0);
    var Gi = (R.isi_nem || []).filter(function (x) { return x.yer === 'giris' && num(x.tempC) != null; }); o.girisMax = r1(mnx(Gi.map(function (x) { return num(x.tempC); }), Math.max), 1);
    var gb = T.gunduzSaatBas != null ? T.gunduzSaatBas : 7, gs = T.gunduzSaatSon != null ? T.gunduzSaatSon : 19;
    var O = (R.dis_isi_nem || []).filter(function (x) { return num(x.tempC) != null; });
    o.disMin = r1(mnx(O.map(function (x) { return num(x.tempC); }), Math.min), 1); o.disMax = r1(mnx(O.map(function (x) { return num(x.tempC); }), Math.max), 1);
    var Og = O.filter(function (x) { var h = new Date(x.t).getHours(); return h >= gb && h < gs; });
    o.disGunduzC = Og.length ? r1(Og.reduce(function (a, x) { return a + num(x.tempC); }, 0) / Og.length, 1) : null;
    o.disYagisMm = r1(mnx(O.map(function (x) { return num(x.mm); }), Math.max), 1);
    /* titreşim: gece (titOgulGeceBas–Son) düşük bant ortancası, gün ortancası, darbe sayısı */
    var V = R.titresim || [];
    var gece = V.filter(function (x) { var h = new Date(x.t).getHours(), f = Number(x.hz); return h >= T.titOgulGeceBas && h < T.titOgulGeceSon && !x.darbe && (!isFinite(f) || (f >= T.titOgulHzMin && f <= T.titOgulHzMax) || x.bant === 'dusuk'); });
    o.titGeceMd = r1(md(gece.map(titDeger)), 4); o.titGeceN = gece.length;
    o.titGeceEnerji = r1(md(gece.map(function (x) { return num(x.enerji); })), 4);
    o.titMd = r1(md(V.filter(function (x) { return !x.darbe; }).map(titDeger)), 4);
    o.titDarbe = V.filter(function (x) { return x.darbe || Number(x.g) >= T.titSpikeG; }).length;
    o.titGMax = r1(mnx(V.map(function (x) { return num(x.g); }), Math.max), 3);
    /* IR: günlük giren / çıkan (kanal toplamları), dönüş oranı */
    var IR = R.ir || [], gi = 0, ci = 0, gn = 0, tc = 0, tn = 0;
    IR.forEach(function (x) { var g2 = num(x.giren != null ? x.giren : x['in']), c2 = num(x.cikan != null ? x.cikan : x.out); if (g2 != null && c2 != null) { gi += g2; ci += c2; gn++; } else if (num(x.count) != null) { tc += num(x.count); tn++; } });
    o.irGiren = gn ? gi : null; o.irCikan = gn ? ci : null; o.irDonus = gn && ci > 0 ? r1((gi - ci) / ci, 4) : null; o.irToplam = gn ? gi + ci : (tn ? tc : null);
    /* tartı: min/max/ilk/son, net, sabah düşüşü (tarlacı penceresi) */
    var W = (R.tarti || []).filter(function (x) { return num(x.kg) != null; }).sort(function (a, b) { return a.t - b.t; });
    if (W.length) { o.kgMin = r1(Math.min.apply(null, W.map(function (x) { return num(x.kg); }))); o.kgMax = r1(Math.max.apply(null, W.map(function (x) { return num(x.kg); }))); o.kgIlk = r1(num(W[0].kg)); o.kgSon = r1(num(W[W.length - 1].kg)); o.kgNet = r1(o.kgSon - o.kgIlk); }
    var bas = gunBasMs + T.tarlaciSaatBas * H, bit = bas + T.tarlaciPencereSaat * H;
    var w0 = W.filter(function (x) { return x.t <= bas && bas - x.t <= H; }), wp = W.filter(function (x) { return x.t > bas && x.t <= bit; });
    o.sabahDususKg = w0.length && wp.length >= 2 ? r1(num(w0[w0.length - 1].kg) - Math.min.apply(null, wp.map(function (x) { return num(x.kg); }))) : null;
    var hv = O.filter(function (x) { return x.t >= bas && x.t <= bit; });
    o.sabahUygun = hv.length ? (md(hv.map(function (x) { return num(x.tempC); })) >= T.ucusGenelUygunC && !hv.some(function (x) { return Number(x.mm) >= T.ucusGenelYagisMm; })) : null;
    /* ses + titreşim olayları: ötme (piping/tooting), vakvaklama, dur sinyali (whooping), tıslama, yelpazeleme */
    var SE = (R.ses || []).concat(V);
    function say(f) { return SE.filter(f).length; }
    o.pipingSay = say(function (x) { var f = Number(x.hz); return x.sinif === 'tooting' || x.sinif === 'cikmis_ana' || (isFinite(f) && f >= T.pipingHzMin && f <= T.pipingHzMax && (x.ritmik === true || x.rhythmic === true)); });
    o.quackSay = say(function (x) { return x.sinif === 'quacking'; });
    o.durSay = say(function (x) { return x.sinif === 'dur_sinyali'; });
    o.tislamaSay = say(function (x) { return x.sinif === 'tislama'; });
    o.yelpazeSay = say(function (x) { return x.sinif === 'yelpazeleme'; });
    o.sesMd = r1(md((R.ses || []).map(function (x) { return num(x.level != null ? x.level : x.dbRel); })), 1);
    var P = (R.pil || []).concat(IR, V, R.tarti || [], R.isi_nem || []).filter(function (x) { return num(x.batteryPct != null ? x.batteryPct : x.pil) != null; }).sort(function (a, b) { return a.t - b.t; });
    o.pilSon = P.length ? num(P[P.length - 1].batteryPct != null ? P[P.length - 1].batteryPct : P[P.length - 1].pil) : null;
    Object.keys(o).forEach(function (k) { if (o[k] == null) delete o[k]; });
    return o;
  }
  /** koloni-241: uzun taban isteyen kuralların taban durumu (kovan sayfası; satır sayısı yalnız cihazlara bağlı → ekran atlamaz).
      Dönen [{ id, ad, var, gerek, birim, hazir, metin }]. Cihaz yoksa / devre dışıysa / kural kapalıysa satır yok. */
  function tabanDurum(hid, nowMs) {
    nowMs = nowMs || Date.now(); var out = [], T = Object.assign({}, ORS_SENSOR, OGUL_SKOR.sensor || {}), H = 3600000, D = 24 * H, S;
    try { S = hiveSens(hid, nowMs); } catch (e) { return out; }
    var ap = S.apiaryId, ay = new Date(nowMs).getMonth() + 1;
    function gunSay(gun, tip, f, oz) {
      var g0 = new Date(nowMs); g0.setHours(0, 0, 0, 0); var n = 0;
      for (var k = 0; k < gun; k++) { var a = g0.getTime() - k * D, b = a + D, L = (S[tip] || []).filter(function (x) { return x.t >= a && x.t < b; });
        if (L.some(f)) { n++; continue; } var z = ozGun(S, a + 12 * H); if (z && z[oz] != null) n++; }
      return n;
    }
    function ekle(id, ad, tip, gun, birim, f, oz) {
      if (hiveCihazTipDurum(hid, tip) !== 'aktif' || !kuralAcik(id, ap)) return;
      var v = gunSay(gun, tip, f, oz), hz = v >= gun;
      out.push({ id: id, ad: ad, var: v, gerek: gun, birim: birim, hazir: hz, metin: ad + ': ' + (hz ? 'taban hazır' : 'Taban oluşuyor (' + v + '/' + gun + ' ' + birim + ')') });
    }
    ekle('titOgul', 'Oğul hazırlığı (titreşim)', 'titresim', T.titOgulGun + T.titOgulTabanGun, 'gece', function (x) { var h = new Date(x.t).getHours(); return h >= T.titOgulGeceBas && h < T.titOgulGeceSon && titDeger(x) != null && !x.darbe; }, 'titGeceMd');
    if (ayIcinde(ay, T.titKisAyBas, T.titKisAySon)) ekle('titKis', 'Kış hareketsizliği', 'titresim', T.titKisTabanGun, 'gün', function (x) { return titDeger(x) != null && !x.darbe; }, 'titMd');
    ekle('irDusukAktivite', 'Beklenenden düşük aktivite', 'ir', T.aktiviteTabanGun, 'gün', function (x) { return x.cikan != null || x.out != null; }, 'irCikan');
    ekle('irDonmeyen', 'Dönmeyen tarlacı', 'ir', T.donmeYumusakGun + T.donmeTabanGun, 'gün', function (x) { return x.cikan != null || x.out != null; }, 'irCikan');
    ekle('tarlaciKayip', 'Tarlacı kaybı (tartı)', 'tarti', T.tarlaciTabanGun + T.tarlaciGun, 'gün', function (x) { return isFinite(Number(x.kg)); }, 'kgSon');
    return out;
  }
  /* koloni-241: sensor-ham.js için kovan → arılık */
  try { global.SuperAriSensorHamArilik = function (hid) { try { var h = hiveById(hid); return h && h.apiaryId != null ? String(h.apiaryId) : null; } catch (e) { return null; } }; } catch (eHA) { /* */ }

  /** koloni-233 (kullanıcı onayı): 5 IR giriş sayacı kuralı. Değerler OGUL_SKOR.sensor (tek kaynak, panelden); kaynaklar yalnız yönetici panelinde; teşhis değil. Devre dışı cihaz okumaları sensList'te zaten elenir.
      (1) irIlac — Struye 1994 (Apidologie 25:384): gündüz giren ani artar, çıkan düşer (normalde görülmez).
      (2) irDonmeyen — Henry 2012 (Science): günlük dönüş (giren−çıkan)/çıkan, çok günlük ortalama, kovanın kendi tabanının altında. Tartı tarlacı kaybıyla tek uyarı.
      (3) irDusukAktivite — Clarke & Robert 2018 (Apidologie): uçuşu hava açıklar; kovana özgü sıcaklık→çıkış modeli, uygun günlerde gerçek çok düşük. (Güneş ışınımı verisi yok.)
      (4) irSayac — Odemer 2021 (Ann Appl Biol): kanal tıkanması; bir kanal sıfır, diğerleri sayıyor ya da günlük giren/çıkan dengesiz. Arıza varken diğer IR kuralları susar.
      (5) irOgulCikti — Struye 1994: dakikalar içinde toplu çıkış, dönüş yok; tartı düşüşü / oğul sesi doğrular (oğul uyarısıyla tek uyarı). */
  function kuralIr5(S, T, r, nowMs) {
    var H = 3600000, M = 60000, D = 24 * H, ap = S.apiaryId;
    function num(v) { v = Number(v); return v != null && isFinite(v) ? v : null; }
    function gir(x) { return num(x.giren != null ? x.giren : x['in']); }
    function cik(x) { return num(x.cikan != null ? x.cikan : x.out); }
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    function top(L, a, b, f) { var s = 0, n = 0; L.forEach(function (x) { if (x.t > a && x.t <= b) { s += f(x); n++; } }); return n ? s : null; }
    var IR = (S.ir || []).filter(function (x) { return gir(x) != null && cik(x) != null; }), O = (S.dis || []).filter(function (x) { return num(x.tempC) != null; });
    r.irVeri = IR.length > 0; r.irIlac = false; r.irDonmeyen = false; r.irDusukAktivite = false; r.irSayac = false; r.irSayacNeden = null; r.irOgulCikti = false; r.irOgulTarti = false;
    if (!IR.length) return r; /* giriş sayacı okuması yok → uyarı yok (metin: Cihaz yok / Veri yok) */
    var son = IR[IR.length - 1].t, g0 = new Date(son); g0.setHours(0, 0, 0, 0); var g0t = g0.getTime();
    var gb = T.gunduzSaatBas != null ? T.gunduzSaatBas : 7, gs = T.gunduzSaatSon != null ? T.gunduzSaatSon : 19;
    function gun(k) { var a = g0t - k * D, b = a + D, gg = top(IR, a - 1, b - 1, gir), cc = top(IR, a - 1, b - 1, cik); if (gg == null && cc == null) { var oz = ozGun(S, a + 12 * H); if (oz && oz.irGiren != null && oz.irCikan != null) { gg = Number(oz.irGiren); cc = Number(oz.irCikan); } } return { g: gg, c: cc, a: a, b: b }; } /* koloni-241: ham yoksa günlük özet */
    function uygun(a, b) { var hv = O.filter(function (x) { var hh = new Date(x.t).getHours(); return x.t >= a && x.t < b && hh >= gb && hh < gs; }); if (!hv.length) { var oz = ozGun(S, a + 12 * H); if (oz && oz.disGunduzC != null) return Number(oz.disGunduzC) >= T.ucusGenelUygunC && !(Number(oz.disYagisMm) >= T.ucusGenelYagisMm) ? Number(oz.disGunduzC) : null; return null; } var t = hv.reduce(function (s2, x) { return s2 + Number(x.tempC); }, 0) / hv.length; return t >= T.ucusGenelUygunC && !hv.some(function (x) { return Number(x.mm) >= T.ucusGenelYagisMm; }) ? t : null; }
    /* (4) Sayaç arızası — önce: veri güvenilmezse diğer kurallar susar */
    if (kuralAcik('irSayac', ap)) {
      var KN = {}; IR.filter(function (x) { return x.t > son - T.sayacSaat * H; }).forEach(function (x) { var hh = new Date(x.t).getHours(); if (hh < gb || hh >= gs) return; (x.kanallar || []).forEach(function (k, i) { var id = k.kanal != null ? k.kanal : i; KN[id] = (KN[id] || 0) + (num(k.giren) || 0) + (num(k.cikan) || 0); }); if (x.kanal != null) KN[x.kanal] = (KN[x.kanal] || 0) + gir(x) + cik(x); });
      var ks = Object.keys(KN), sifir = ks.filter(function (k) { return KN[k] === 0; }), dig = ks.filter(function (k) { return KN[k] > 0; });
      if (ks.length >= 2 && sifir.length && dig.length && dig.reduce(function (s2, k) { return s2 + KN[k]; }, 0) / dig.length >= T.sayacMinDiger && IR[0].t <= son - T.sayacSaat * H) { r.irSayac = true; r.irSayacNeden = 'kanal'; }
      if (!r.irSayac) { var dz = 0; for (var k1 = 1; k1 <= T.sayacGun; k1++) { var G1 = gun(k1); if (G1.c != null && G1.c >= T.donmeMinCikis && (G1.g / G1.c < 1 - T.sayacDengeOran || G1.g / G1.c > 1 + T.sayacDengeOran)) dz++; } if (dz >= T.sayacGun) { r.irSayac = true; r.irSayacNeden = 'denge'; } }
    }
    if (r.irSayac) return r;
    /* (1) İlaçlama şüphesi — bugün gündüz pencereleri, aynı saat diliminin önceki günlerine göre */
    if (kuralAcik('irIlac', ap)) {
      var W = T.ilacPencereDk * M;
      for (var t = son; t > son - D && !r.irIlac; t -= W / 2) {
        var hh = new Date(t).getHours(); if (hh < gb || hh >= gs) continue;
        var gN = top(IR, t - W, t, gir), cN = top(IR, t - W, t, cik), tg = [], tc = [];
        for (var k2 = 1; k2 <= T.ilacTabanGun; k2++) { var x1 = top(IR, t - k2 * D - W, t - k2 * D, gir); if (x1 != null) { tg.push(x1); tc.push(top(IR, t - k2 * D - W, t - k2 * D, cik)); } }
        var mg = md(tg), mc = md(tc);
        if (gN != null && tg.length >= 3 && mg >= T.ilacMinTaban && gN >= mg * T.ilacGirisKat && mc > 0 && cN <= mc * T.ilacCikisOran) r.irIlac = true;
      }
    }
    /* (2) Dönmeyen tarlacı — günlük dönüş (giren−çıkan)/çıkan; son günler ortalaması vs taban medyanı */
    if (kuralAcik('irDonmeyen', ap)) {
      var hr = []; for (var k3 = 1; k3 <= T.donmeYumusakGun + T.donmeTabanGun; k3++) { var G3 = gun(k3); hr.push(G3.c != null && G3.c >= T.donmeMinCikis ? (G3.g - G3.c) / G3.c : null); }
      var yak = hr.slice(0, T.donmeYumusakGun), tab = hr.slice(T.donmeYumusakGun);
      if (yak.every(function (v) { return v != null; }) && tab.filter(function (v) { return v != null; }).length >= 3) { var ort = yak.reduce(function (a, b) { return a + b; }, 0) / yak.length, mt = md(tab); r.irDonmeyen = ort < mt - T.donmeFark; }
    }
    /* (3) Beklenenden düşük aktivite — kovana özgü doğrusal model: gündüz ort. sıcaklık → günlük çıkış (yalnız uygun günler) */
    if (kuralAcik('irDusukAktivite', ap) && O.length) {
      var P = []; for (var k4 = 1; k4 <= T.aktiviteGun + T.aktiviteTabanGun + 10 && P.length < T.aktiviteGun + T.aktiviteTabanGun; k4++) { var G4 = gun(k4), u = uygun(G4.a, G4.b); if (u != null && G4.c != null) P.push({ x: u, y: G4.c }); }
      var Ls = P.slice(0, T.aktiviteGun), Lt = P.slice(T.aktiviteGun);
      if (Ls.length === T.aktiviteGun && Lt.length >= T.aktiviteMinGun) {
        var mx = Lt.reduce(function (a, p) { return a + p.x; }, 0) / Lt.length, my = Lt.reduce(function (a, p) { return a + p.y; }, 0) / Lt.length, sxy = 0, sxx = 0;
        Lt.forEach(function (p) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) * (p.x - mx); });
        var bb = sxx > 0 ? Math.max(0, sxy / sxx) : 0, aa = my - bb * mx;
        r.irDusukAktivite = my > 0 && Ls.every(function (p) { var bek = aa + bb * p.x; return bek > 0 && p.y < bek * T.aktiviteOran; });
      }
    }
    /* (5) Oğul çıktı — pencerede net çıkış, ardından dönüş az */
    if (kuralAcik('irOgulCikti', ap)) {
      for (var i = 0; i < IR.length && !r.irOgulCikti; i++) {
        var t0 = IR[i].t; if (t0 < son - D) continue;
        var t1 = t0 + T.ogulCiktiDk * M, net = 0; IR.forEach(function (x) { if (x.t >= t0 && x.t <= t1) net += cik(x) - gir(x); });
        if (net < T.ogulCiktiNet) continue;
        var donus = 0; IR.forEach(function (x) { if (x.t > t1 && x.t <= t1 + T.ogulDonusDk * M) donus += gir(x) - cik(x); });
        if (son - t1 >= T.ogulDonusDk * M * 0.8 && donus < net * T.ogulDonusOran) {
          r.irOgulCikti = true; r.irOgulAt = t0;
          var Wk = (S.tarti || []).filter(function (x) { return num(x.kg) != null; }), once = Wk.filter(function (x) { return x.t <= t0 && t0 - x.t <= H; }), sonra = Wk.filter(function (x) { return x.t > t0 && x.t <= t1 + T.ogulDonusDk * M; });
          if (once.length && sonra.length) r.irOgulTarti = Number(once[once.length - 1].kg) - Math.min.apply(null, sonra.map(function (x) { return Number(x.kg); })) >= T.ogulKgDusus;
        }
      }
    }
    return r;
  }

  /** koloni-199: Nem aralığı, IR (oğul, yağma, trafik düşüşü), titreşim. Okumalar arası > 2 saat boşluk seriyi keser. */
  function yeniKurallar(S, T, r, nowMs) {
    var H = 3600000, M = 60000, D = 24 * H;
    r.nemDisi = false; r.nemYon = null; /* nemYon: 'dusuk' (< nemKritikAlt, kritik) | 'erken' (< nemNormalAlt) | 'yuksek' | 'kirec' (> nemKirecUst) */ r.irOgul = false; r.irYagma = false; r.irTrafik = false; r.titresimOlagan = false;
    function seri(L, f, ms) { var b = null, p = null, yon = null, out = null; L.forEach(function (x) { var y = f(x); if (!y || (p && x.t - p.t > 2 * H) || y !== yon) b = y ? x.t : null; yon = y; if (y && b != null && x.t - b >= ms) out = y; p = x; }); return out; }
    var N = (S.isi_nem || []).filter(function (x) { return x.rh != null && isFinite(Number(x.rh)); });
    if (N.length) { var nk = T.nemKirecUst != null ? seri(N, function (x) { return Number(x.rh) > T.nemKirecUst ? 'kirec' : null; }, T.nemDisiSaat * H) : null; var ny = nk || seri(N, function (x) { var v = Number(x.rh); return v < T.nemKritikAlt ? 'dusuk' : null; }, T.nemDisiSaat * H) || seri(N, function (x) { var v = Number(x.rh); return v < T.nemNormalAlt ? 'erken' : v > T.nemNormalUst ? 'yuksek' : null; }, T.nemDisiSaat * H); if (ny) { r.nemDisi = true; r.nemYon = ny; } }
    function gir(x) { var v = x.giren != null ? x.giren : x['in']; return v != null && isFinite(Number(v)) ? Number(v) : null; }
    function cik(x) { var v = x.cikan != null ? x.cikan : x.out; return v != null && isFinite(Number(v)) ? Number(v) : null; }
    var IR = (S.ir || []).filter(function (x) { return gir(x) != null && cik(x) != null; });
    if (IR.length) {
      for (var i = 0; i < IR.length && !r.irOgul; i++) { var net = 0; for (var j = i; j < IR.length && IR[j].t - IR[i].t <= T.irOgulDk * M; j++) net += cik(IR[j]) - gir(IR[j]); if (net >= T.irOgulNetCikis) r.irOgul = true; }
      var gb = T.gunduzSaatBas != null ? T.gunduzSaatBas : 7, gs = T.gunduzSaatSon != null ? T.gunduzSaatSon : 19;
      if (seri(IR, function (x) { var hh = new Date(x.t).getHours(), o = cik(x); return hh >= gb && hh < gs && (o > 0 ? gir(x) / o >= T.irYagmaOran : gir(x) > 0) ? 'y' : null; }, T.irYagmaDk * M)) r.irYagma = true;
    }
    var TR = (S.ir || []).map(function (x) { var g = gir(x), c = cik(x), v = g != null && c != null ? g + c : (x.count != null && isFinite(Number(x.count)) ? Number(x.count) : null); return v == null ? null : { t: x.t, v: v }; }).filter(Boolean);
    if (TR.length) {
      var g0 = new Date(nowMs); g0.setHours(0, 0, 0, 0); var g0t = g0.getTime(), son = new Date(TR[TR.length - 1].t).getHours() + 1, n = Math.max(1, Number(T.irTrafikGun) || 2), dus = 0, top = 0;
      var gunTop = function (k) { var a = g0t - k * D, sum = 0, any = false; TR.forEach(function (x) { if (x.t >= a && x.t < a + D && new Date(x.t).getHours() < son) { sum += x.v; any = true; } }); return any ? sum : null; };
      var taban = []; for (var k = n; k < n + 7; k++) { var v = gunTop(k); if (v != null) taban.push(v); }
      if (taban.length >= 3) { var ort = taban.reduce(function (a, b) { return a + b; }, 0) / taban.length; for (var q = 0; q < n; q++) { var b = gunTop(q); if (b != null) { top++; if (b < ort * T.irTrafikOran) dus++; } } if (ort > 0 && top === n && dus === n) r.irTrafik = true; }
    }
    var V = (S.titresim || []).map(function (x) { var v = x.rms != null ? x.rms : x.deger; return v != null && isFinite(Number(v)) ? { t: x.t, v: Number(v) } : null; }).filter(Boolean);
    if (V.length >= 10) {
      var sonT = V[V.length - 1].t, eski = V.filter(function (x) { return x.t < sonT - T.titresimDk * M; }).map(function (x) { return x.v; }).sort(function (a, b) { return a - b; });
      if (eski.length >= 6) { var md = eski[Math.floor(eski.length / 2)]; if (md > 0 && seri(V, function (x) { return x.v >= md * T.titresimKat ? 'y' : null; }, T.titresimDk * M)) r.titresimOlagan = true; }
    }
    /* koloni-220: kapalı kural → bayrak yok (uyarı/rozet/push/kart yok) */
    var ap = S.apiaryId; if (!kuralAcik('nem', ap)) { r.nemDisi = false; r.nemYon = null; }
    if (!kuralAcik('irOgul', ap)) r.irOgul = false; if (!kuralAcik('irYagma', ap)) r.irYagma = false; if (!kuralAcik('irTrafik', ap)) r.irTrafik = false; if (!kuralAcik('titresim', ap)) r.titresimOlagan = false;
    return r;
  }
  /** koloni-199: Cihaz sağlığı. Dönen [{ id, tip, hiveId, apiaryId, durum: 'sari'|'kirmizi'|'kopuk'|'arizali', neden }]. Gateway kopuksa aynı arılığın cihazları için ayrı uyarı yok. */
  function cihazSaglik(devices, T, nowMs, okumaF) {
    var out = [], gwKopuk = {}, H = 3600000;
    (devices || []).forEach(function (d) { if (d && d.tip === 'gateway' && d.lastMins != null && d.lastMins >= T.kopukSaat * 60) { gwKopuk[String(d.apiaryId)] = 1; out.push({ id: d.id, tip: d.tip, hiveId: null, apiaryId: d.apiaryId, durum: 'kopuk', neden: 'gateway' }); } });
    (devices || []).forEach(function (d) {
      if (!d || d.tip === 'gateway' || d.source === 'demo') return;
      var L = okumaF ? (okumaF(d) || []) : [];
      if (d.tip === 'isi_nem' && L.length) {
        var ariza = null, p = null;
        L.forEach(function (x) { var c = Number(x.tempC), h = x.rh != null ? Number(x.rh) : null; if (isFinite(c) && (c < -T.arizaAltEksiC || c > T.arizaUstC)) ariza = 'imkansiz'; if (h != null && isFinite(h) && (h < 0 || h > 100)) ariza = 'imkansiz'; if (p && isFinite(c) && isFinite(Number(p.tempC)) && Math.abs(c - Number(p.tempC)) > T.arizaSicramaC) ariza = ariza || 'sicrama'; p = x; });
        var sonT = L[L.length - 1].t, P = L.filter(function (x) { return x.t >= sonT - T.arizaAyniSaat * H; });
        if (!ariza && P.length >= 3 && sonT - P[0].t >= 0.9 * T.arizaAyniSaat * H && P.every(function (x) { return x.tempC === P[0].tempC && x.rh === P[0].rh; })) ariza = 'ayni';
        if (ariza) { out.push({ id: d.id, tip: d.tip, hiveId: d.hiveId, apiaryId: d.apiaryId, durum: 'arizali', neden: ariza }); return; }
      }
      if (d.status === 'arizali') { out.push({ id: d.id, tip: d.tip, hiveId: d.hiveId, apiaryId: d.apiaryId, durum: 'arizali', neden: 'cihaz' }); return; }
      if (d.lastMins == null) return; /* hiç okuma yok → «Veri yok», uyarı değil */
      if (gwKopuk[String(d.apiaryId)]) return;
      var ar = Number(d.aralikMs) > 0 ? Number(d.aralikMs) / 60000 : 0, sari = Math.max(T.sessizOkuma * ar, T.sessizMinDk);
      var durum = d.lastMins >= T.kopukSaat * 60 ? 'kopuk' : d.lastMins >= T.sessizKirmiziDk ? 'kirmizi' : d.lastMins >= sari ? 'sari' : null;
      if (durum) out.push({ id: d.id, tip: d.tip, hiveId: d.hiveId, apiaryId: d.apiaryId, durum: durum, neden: 'sessiz' });
    });
    return out.filter(function (c) { return kuralAcik(c.durum === 'arizali' ? 'cihazAriza' : c.durum === 'kopuk' ? 'cihazKopuk' : 'cihazSessiz', c.apiaryId); }); /* koloni-220 */
  }
  function hiveSens(hid, nowMs) {
    var lbG = Number(OGUL_SKOR.sensor && OGUL_SKOR.sensor.hiveSensGun); if (!(lbG > 0)) lbG = 21; /* koloni-241: pencere ayarı (varsayılan 21 gün, uzman tahmini); eskiden sabit 7 gün */
    var from = nowMs - lbG * 24 * 3600000, o = {}, any = false, ap = null;
    try { var hh = hiveById(hid); ap = hh ? hh.apiaryId : null; } catch (e) { ap = null; }
    Object.keys(SENS_KEYS).forEach(function (tip) { o[tip] = sensList(tip).filter(function (x) { return (Number(x.hiveId) === Number(hid) || (tip === 'dis_isi_nem' && ap != null && x.apiaryId != null && String(x.apiaryId) === String(ap))) && x.t >= from && x.t <= nowMs + 600000; }); if (o[tip].length && tip !== 'dis_isi_nem') any = true; });
    /* k152: dış ortam — öncelik gateway dış sensörü, yoksa uygulamadaki hava tahmini (arılık, saatlik) */
    o.dis = o.dis_isi_nem.slice();
    if (!o.dis.length && ap != null) { try { var hc = JSON.parse(localStorage.getItem('superari.hava.tahmin.v1.' + ap) || 'null'); ((hc && hc.d && hc.d.hours) || []).forEach(function (x) { var t = Date.parse(x.t); if (isFinite(t)) o.dis.push({ t: t, tempC: x.temp, rh: x.rh, mm: x.mm, pr: x.pr, kaynak: 'hava' }); }); } catch (e) { /* yok */ } }
    /* k192: kuluçka sıcaklığı kuralı yalnız sensör kuluçkalıktaysa — okuma yer:'kulucka' ya da cihaz kaydında yer:'kulucka' */
    o.giris = o.isi_nem.filter(function (x) { return x.yer === 'giris'; }); /* koloni-231: isteğe bağlı giriş sıcaklığı (mevcut ısı/nem sensörü, yer: giris) */
    o.kuluckaSensoru = o.isi_nem.some(function (x) { return x.yer === 'kulucka'; });
    if (!o.kuluckaSensoru) { try { var DV = global.SuperAriDevices; o.kuluckaSensoru = !!(DV && DV.listDevices && DV.listDevices().some(function (d) { return d && d.tip === 'isi_nem' && d.yer === 'kulucka' && Number(d.hiveId) === Number(hid); })); } catch (eK) { o.kuluckaSensoru = false; } }
    if (o.kuluckaSensoru) o.isi_nem = o.isi_nem.filter(function (x) { return !x.yer || x.yer === 'kulucka'; });
    /* koloni-227: mikrofon örnekleme hızı (okuma sr/ornekleme ya da cihaz kaydı) — eşek arısı kuralı için */
    o.sesOrnekleme = null; o.ses.forEach(function (x) { var r = Number(x.sr != null ? x.sr : x.ornekleme); if (isFinite(r) && r > 0) o.sesOrnekleme = Math.max(o.sesOrnekleme || 0, r); });
    if (o.sesOrnekleme == null) { try { var DV2 = global.SuperAriDevices; (DV2 && DV2.listDevices ? DV2.listDevices() : []).forEach(function (d) { if (d && d.tip === 'ses' && Number(d.hiveId) === Number(hid) && !d.disabled) { var r = Number(d.ornekleme != null ? d.ornekleme : d.sampleRate); if (isFinite(r) && r > 0) o.sesOrnekleme = Math.max(o.sesOrnekleme || 0, r); } }); } catch (eSr) { /* */ } }
    /* koloni-241: günlük özetler (telefon + sunucudan geri okunan) — uzun taban isteyen kurallar ham veri olmayan günlerde bunları kullanır */
    o.gunluk = {}; try { var HmO = sensHam(); if (HmO && HmO.ozetler) o.gunluk = HmO.ozetler(hid) || {}; } catch (eG) { o.gunluk = {}; }
    o.any = any; o.apiaryId = ap; return o;
  }
  /* KİLİTLİ 2026-10-14 (koloni-168) — kovan içi ses protokolü; kullanıcı onayı olmadan değiştirme. k146: bilimsel kaynaklı kovan ses sınıfları (varsayılan; bulut public.ses_siniflari yönetici düzenler) */
  var SES_SINIFLARI = [{"id": "taban_gunduz", "ad": "Taban (gündüz)", "en": "Baseline (day)", "hzMin": 100, "hzMax": 300, "yapi": "Sürekli koloni uğultusu; tepe 200–270 Hz; kovanın kendi gündüz ortancası", "anlam": "Normal etkinlik — taban", "seviye": "kayit", "kaynak": "Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77", "zayif": false}, {"id": "taban_gece", "ad": "Taban (gece)", "en": "Baseline (night)", "hzMin": 25, "hzMax": 150, "yapi": "Sürekli, daha pes; kovanın kendi gece ortancası", "anlam": "Normal gece etkinliği — taban", "seviye": "kayit", "kaynak": "Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77", "zayif": false}, {"id": "anali_tepe", "ad": "Analı kovan tepesi", "en": "Queenright peak", "hzMin": 200, "hzMax": 300, "yapi": "Orta bant; anasızda bant enerjisi artar, tepe genişler", "anlam": "Gösterge — sadece kayıt", "seviye": "kayit", "kaynak": "Ruvinga ve ark. 2021/2023; Nolasco ve ark. 2019; Robles-Guerrero ve ark. 2017; Terenzi ve ark. 2020 (derleme). Bu çalışmalar analı/anasız ayrımını tek frekansla değil, MFCC/spektrum örüntüsüyle yapar; sabit bir kayma değeri bildiren yok.", "zayif": true}, {"id": "yelpazeleme", "ad": "Yelpazeleme", "en": "Fanning", "hzMin": 150, "hzMax": 195, "yapi": "Sürekli; kanat vuruşu 173,9 ± 20,4 Hz (kinematik; akustik karşılığı kaynak zayıf)", "anlam": "Havalandırma (erkek arı değil) — sadece kayıt", "seviye": "kayit", "kaynak": "Peters J.M., Gravish N., Combes S.A. (2017). Wings as impellers: honey bees co-opt flight system to induce nest ventilation and disperse pheromones. J Exp Biol 220:2203", "zayif": false}, {"id": "tooting", "ad": "Ana Arılar Ötmesi (Piping)", "en": "Queen tooting (piping)", "hzMin": 340, "hzMax": 500, "yapi": "Arama 340–500 Hz; alarm 400–500 Hz ritmik ≥1 dk; 340–400 Hz yalnız kayıt. İlk hece 1–2 sn, sonra ~0,25 sn heceler", "anlam": "Yeni çıkan ana; oğul / ikinci oğul hazırlığı", "seviye": "kritik", "kaynak": "Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5", "zayif": false}, {"id": "cikmis_ana", "ad": "Çıkmış Ana Ötmesi (Tooting)", "en": "Queen tooting", "ust": "tooting", "hzMin": null, "hzMax": null, "yapi": "Ana Arılar Ötmesi (Piping) alt türü; ayrı eşik yok — üst türün (Piping) eşikleriyle algılanır", "anlam": "Yüksükten çıkmış ananın sesi; yüksükteki ana Vakvaklama (Quacking) ile yanıt verir. Tek başına → Yüksek; Vakvaklama ile birlikte → Kritik «Ana Arılar Ötmesi (Piping)» (bilimsel olarak Piping genel ad; uygulamada birlikte duyulma uyarısı)", "seviye": "kritik", "kaynak": "Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611", "zayif": false}, {"id": "quacking", "ad": "Vakvaklama (Quacking)", "en": "Queen quacking", "hzMin": 200, "hzMax": 350, "yapi": "Hece <0,2 sn; 10 sn içinde ≥3 hece", "anlam": "Yüksükte bakire ana — ikinci oğul riski; Ana Arılar Ötmesi (Piping) ile 30 dk içinde → Yüksek", "seviye": "erken", "kaynak": "Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5", "zayif": false}, {"id": "anasizlik", "ad": "Anasızlık Uğultusu (Queenless Roar)", "en": "Queenless roar", "hzMin": 300, "hzMax": 400, "yapi": "Ritmik değil, 10 dk kesintisiz, kendi tabanı +6 dB", "anlam": "Anasızlık şüphesi — muayene et (Oğul skorunu etkilemez)", "seviye": "ayri", "kaynak": "Ruvinga S., Hunter G., Duran O., Nebel J.-C. (2023). Identifying queenlessness in honeybee hives from audio signals using machine learning. Electronics 12(7):1627", "zayif": false}, {"id": "isci_otmesi", "ad": "İşçi Arı Ötmesi (Worker Piping)", "en": "Worker piping", "hzMin": 100, "hzMax": 250, "yapi": "~0,8 sn darbe; 100–200 → 200–250 Hz yükselir", "anlam": "Oğul kalkışa hazırlanıyor", "seviye": "yuksek", "kaynak": "Seeley T.D., Tautz J. (2001). Worker piping in honey bee swarms and its role in preparing for liftoff. J Comp Physiol A 187:667–676", "zayif": false}, {"id": "ogul_ani", "ad": "Oğul Anı Sesi (Swarming)", "en": "Swarming sound", "hzMin": 500, "hzMax": 600, "yapi": "500–600 Hz’de ani enerji artışı (taban +6 dB, ≥2 dk)", "anlam": "Oğul çıkıyor", "seviye": "kritik", "kaynak": "Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77", "zayif": false}, {"id": "ogul_egilim", "ad": "Oğul hazırlığı (spektrum değişimi)", "en": "Pre-swarm spectral change", "hzMin": 100, "hzMax": 300, "yapi": "Gündüz taban tepe frekansı son 24 saatte ≥20 Hz yukarı", "anlam": "Oğul eğilimi — muayene et", "seviye": "erken", "kaynak": "Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5 · Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77", "zayif": false}, {"id": "kovan_sagligi", "ad": "Kovan sağlığı", "en": "Hive health", "hzMin": 100, "hzMax": 600, "yapi": "Taban 100–600 Hz; taban sapması (dB) ≥ uyarı eşiği → Uyarı, ≥ kritik eşiği → Kritik; yelpazeleme bandı 150–195 Hz okuma oranı ≥ oran eşiği → Uyarı. Eşikler yönetici ayarı (varsayılan 4 dB / 7 dB / %40, uzman tahmini)", "anlam": "Bilgi", "seviye": "bilgi", "kaynak": "Ferrari ve ark. 2008: oğul öncesi genlik/frekans artışı ve 100–300 → 500–600 Hz kayması (dB eşiği vermez). Peters ve ark. 2017: yelpazeleme kanat frekansı 173,9 ± 20,4 Hz (kinematik). dB eşikleri ve %40 oranı uzman tahminidir.", "zayif": true}, {"id": "dur_sinyali", "ad": "Dur sinyali", "en": "Stop signal / brief piping", "hzMin": 350, "hzMax": 420, "yapi": "~380 Hz, ~150 ms tek darbe; <1 sn sesler Ana Arılar Ötmesi (Piping) / Anasızlık Uğultusu (Queenless Roar) sayılmaz", "anlam": "Toplayıcı alımını durdurma — alarm değil", "seviye": "kayit", "kaynak": "Lau C.W., Nieh J.C. (2010). Honey bee stop-signal production: temporal distribution and effect of feeder crowding. Apidologie 41(1) · Nieh J.C. (1993). The stop signal of honey bees: reconsidering its message. Behav Ecol Sociobiol 33:51–56 · Pastor K.A., Seeley T.D. (2005). The brief piping signal of the honey bee: begging call or stop signal? Ethology 111:775–784", "zayif": false}, {"id": "ciftlesmis_ana", "ad": "Çiftleşmiş ana ötmesi", "en": "Mated queen piping", "hzMin": 330, "hzMax": 430, "yapi": "Ana Arılar Ötmesi (Piping) sesine benzer, daha pes", "anlam": "Oğul alarmı değil", "seviye": "kayit", "kaynak": "Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3)", "zayif": true}, {"id": "titresim", "ad": "Titreşim sinyali", "en": "Shaking signal (DVAV)", "hzMin": null, "hzMax": null, "yapi": "Petek titreşimi, 1–2 sn; mikrofonla zayıf", "anlam": "İş bölümünü yeniden düzenleme", "seviye": "kayit", "kaynak": "Nieh J.C. (1998). The honey bee shaking signal: function and design of a modulatory communication signal. Behav Ecol Sociobiol 42:23–36", "zayif": false}, {"id": "sallanma_dansi", "ad": "Sallanma dansı sesi", "en": "Waggle dance sound", "hzMin": 200, "hzMax": 300, "yapi": "Düz koşuda ~200 Hz civarı darbeler", "anlam": "Aktif toplayıcılık", "seviye": "kayit", "kaynak": "Wenner A.M. (1962). Sound production during the waggle dance of the honey bee. Animal Behaviour 10:79–95 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3)", "zayif": false}, {"id": "tislama", "ad": "Tıslama (savunma)", "en": "Hissing", "hzMin": 500, "hzMax": 20000, "yapi": "Geniş bant, harmonikli. A. m. cypria'da temel ~0,5 kHz, baskın ~5,9 kHz, 16–17 kHz'e kadar (eşek arısı saldırısı). A. mellifera'da laboratuvarda ~4–20 kHz (şok/koku). Tehdit tepkisi. Türkiye ırklarında ölçüm yok.", "anlam": "Tehdit tepkisi", "seviye": "kayit", "kaynak": "Papachristoforou A., Sueur J., Rortais A., Angelopoulos S., Thrasyvoulou A., Arnold G. (2008). High frequency sounds produced by Cyprian honeybees Apis mellifera cypria when confronting their predator, the Oriental hornet Vespa orientalis. Apidologie 39(4):468–474. doi:10.1051/apido:2008027 · Wehmann H.-N., Gustav D., Kirkerud N.H., Galizia C.G. (2015). The Sound and the Fury—Bees Hiss when Expecting Danger. PLoS ONE 10(3):e0118708. doi:10.1371/journal.pone.0118708", "zayif": true}, {"id": "stres_varroa", "ad": "Hastalık / stres sesi (varroa)", "en": "Stress / varroa", "hzMin": 122, "hzMax": 396, "yapi": "Makine öğrenmesi modelinde Varroa varlığı için önemli bulunan frekans aralığı; tek başına eşik değil, sınıflandırıcı girdisi. Akar yürüme titreşimi 500–2000 Hz, yalnız petek ivmeölçeriyle.", "anlam": "Varroa sayımı önerilir — düşük seviyeli hatırlatma (teşhis değil; bant tabandan saparsa, en çok haftada bir görev)", "seviye": "bilgi", "kaynak": "Yıldız B.İ., Karabağ K. (2026). When the hive speaks: detecting Varroa destructor infestation in honey bees through acoustic biomarkers and machine learning. Experimental and Applied Acarology 97(3):23. doi:10.1007/s10493-026-01179-y · Qandour 2014 (Acoustics Australia 42:204–209) · Scientific Reports 2023, doi:10.1038/s41598-023-36810-0", "zayif": true, "etiket": "tek çalışma / model özelliği"}, {"id": "kumelenme", "ad": "Kış kümelenmesi titremesi", "en": "Shivering thermogenesis", "hzMin": null, "hzMax": null, "yapi": "Titreme termografiyle kanıtlı; akustik imza ölçülmemiş", "anlam": "Kışta ısı üretimi", "seviye": "kayit", "kaynak": "Stabentheiner A., Pressl H., Papst T., Hrassnigg N., Crailsheim K. (2003). Endothermic heat production in honeybee winter clusters. J Exp Biol 206:353–358. doi:10.1242/jeb.00082", "zayif": true}, {"id": "yagma", "ad": "Yağma sesi", "en": "Robbing", "hzMin": null, "hzMax": null, "yapi": "Girişte düzensiz, sallanarak uçuş ve yığılma; akustik frekans verisi yok", "anlam": "Yağma şüphesi", "seviye": "kayit", "kaynak": "Free J.B. (1955). The Behaviour of Robber Honeybees. Behaviour 7:233–239. doi:10.1163/156853955x00085 · Tashakkori R., Buchanan G.B., Craig L.M. (2020). Analyses of Audio and Video Recordings for Detecting a Honey Bee Hive Robbery. IEEE SoutheastCon. doi:10.1109/southeastcon44009.2020.9249684", "zayif": true}];
  /* k146: <darbeMaxMs süreli darbe (ör. dur sinyali ~380–400 Hz, 100–150 ms) Ana Arılar Ötmesi (Piping) / Anasızlık Uğultusu (Queenless Roar) sayılmaz. sureMs yoksa süre bilinmez → darbe değil. */
  function kisaDarbe(x, T) { var d = Number(x.sureMs); return isFinite(d) && d > 0 && d < (T.darbeMaxMs || 1000) && x.sinif !== 'quacking'; }
  /** k146: Vakvaklama (Quacking) ve Anasızlık Uğultusu (Queenless Roar). Oğul skorunu DEĞİŞTİRMEZ; r.quack / r.quackYuksek / r.anasizSes + notlar. */
  function sesKurallari(S, T, r) {
    var L = (S.ses || []).concat(S.titresim || []).sort(function (a, b) { return a.t - b.t; });
    r.quack = false; r.quackYuksek = false; r.anasizSes = false; r.quackAt = null; r.pipingAt = null;
    if (!L.length) return;
    /* Vakvaklama (Quacking): quackHz aralığında, hece süresi quackHeceMin–MaxMs, 10 sn içinde en az quackHeceSay hece. İşçi 200–250 Hz SÜREKLİ ses hece değildir (süre uzun). */
    var run = [];
    L.forEach(function (x) {
      var hz = Number(x.hz), d = Number(x.sureMs);
      var hece = x.sinif === 'quacking' || (isFinite(hz) && hz >= T.quackHzMin && hz <= T.quackHzMax && isFinite(d) && d >= T.quackHeceMinMs && d <= T.quackHeceMaxMs);
      if (!hece) { run = []; return; }
      run = run.filter(function (y) { return x.t - y.t <= 10000; }); run.push(x);
      if (run.length >= T.quackHeceSay) { r.quack = true; r.quackAt = x.t; }
    });
    /* Ötme zamanı (piping okumaları) — penceredeki birliktelik için */
    L.forEach(function (x) { var hz = Number(x.hz); if (isFinite(hz) && hz >= T.pipingHzMin && hz <= T.pipingHzMax && (x.ritmik === true || x.rhythmic === true) && !kisaDarbe(x, T)) r.pipingAt = x.t; });
    if (!kuralAcik('sesQuack', S.apiaryId)) r.quack = false; /* koloni-220 */
    if (r.quack && r.pipingAt != null && Math.abs(r.quackAt - r.pipingAt) <= T.quackPencereDk * 60000) r.quackYuksek = true;
    if (r.quack) r.notes.push(r.quackYuksek ? 'Sensör: Çıkmış Ana Ötmesi (Tooting) ve Vakvaklama (Quacking) birlikte — yeni ana rekabeti' : 'Sensör: yüksükte bakire ana olabilir — ikinci oğul riski');
    /* k148: kovanın kendi gece/gündüz ortancası (sabit dB yok) */
    function gunduz(x) { var h = new Date(x.t).getHours(); return h >= T.gunduzSaatBas && h < T.gunduzSaatSon; }
    function lvl(x) { var l = Number(x.dbRel != null ? x.dbRel : x.level); return isFinite(l) ? l : null; }
    function med(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    var tabanG = med(L.filter(gunduz).map(lvl)), tabanN = med(L.filter(function (x) { return !gunduz(x); }).map(lvl));
    function taban(x) { var t = gunduz(x) ? tabanG : tabanN; return t != null ? t : (tabanG != null ? tabanG : tabanN); }
    r.taban = { gunduz: tabanG, gece: tabanN };
    function surekli(on, dk) { var st0 = null, prev = null, ok = false; L.forEach(function (x) { var o = on(x); if (o && (st0 == null || (prev && x.t - prev.t > T.pipingAraSn * 1000))) st0 = x.t; if (!o) st0 = null; if (o && st0 != null && x.t - st0 >= dk * 60000) ok = true; prev = x; }); return ok; }
    /* Anasızlık Uğultusu (Queenless Roar): ~300–400 Hz, ritmik değil, darbe değil, 10 dk kesintisiz, kendi tabanı +6 dB → ayrı uyarı (Oğul skorunu etkilemez) */
    r.anasizSes = kuralAcik('sesAnasiz', S.apiaryId) && surekli(function (x) { var hz = Number(x.hz), l = lvl(x), tb = taban(x); return x.sinif === 'anasizlik' || (isFinite(hz) && hz >= T.anasizHzMin && hz <= T.anasizHzMax && x.ritmik !== true && !kisaDarbe(x, T) && tb != null && l != null && l - tb >= T.anasizArtisDb); }, T.anasizDk);
    /* Ana Arılar Ötmesi (Piping) arama 340–400 Hz ritmik: yalnız kayıt (alarm 400–500 Hz, yukarıda) */
    r.otmeAltKayit = L.some(function (x) { var hz = Number(x.hz); return isFinite(hz) && hz >= T.pipingAramaHzMin && hz < T.pipingHzMin && x.ritmik === true && !kisaDarbe(x, T); });
    /* İşçi Arı Ötmesi (Worker Piping): 100–250 Hz, ~0,8 sn darbe (500–1200 ms), pencerede ≥ isciOtmeSay → Yüksek */
    var ip = L.filter(function (x) { var hz = Number(x.hz), d = Number(x.sureMs); return x.sinif === 'isci_otmesi' || (isFinite(hz) && hz >= T.isciOtmeHzMin && hz <= T.isciOtmeHzMax && isFinite(d) && d >= T.isciOtmeMinMs && d <= T.isciOtmeMaxMs); });
    r.isciOtme = kuralAcik('sesIsciOtme', S.apiaryId) && ip.some(function (x) { return ip.filter(function (y) { return y.t <= x.t && x.t - y.t <= T.isciOtmePencereDk * 60000; }).length >= T.isciOtmeSay; });
    if (r.isciOtme) r.notes.push('Sensör: İşçi Arı Ötmesi (Worker Piping) — oğul kalkışa hazırlanıyor olabilir');
    /* Oğul Anı Sesi (Swarming): 500–600 Hz ani artış (taban +6 dB, ≥2 dk) → Kritik */
    r.ogulAni = kuralAcik('sesOgulAni', S.apiaryId) && surekli(function (x) { var hz = Number(x.hz), l = lvl(x), tb = taban(x); return x.sinif === 'ogul_ani' || (isFinite(hz) && hz >= T.ogulAniHzMin && hz <= T.ogulAniHzMax && !kisaDarbe(x, T) && tb != null && l != null && l - tb >= T.ogulAniArtisDb); }, T.ogulAniDk);
    if (r.ogulAni) r.notes.push('Sensör: Oğul Anı Sesi (Swarming) — kovanı kontrol et');
    r.ogulAniAt = null; if (r.ogulAni) L.forEach(function (x) { var hz = Number(x.hz); if (x.sinif === 'ogul_ani' || (hz >= T.ogulAniHzMin && hz <= T.ogulAniHzMax)) r.ogulAniAt = x.t; });
    /* k150 (Ramsey 2020): oğul çıktıktan sonra kovan uğultusu belirgin düşer → bilgi */
    r.ogulCikti = false;
    if (r.ogulAni) { var oa = L.filter(function (x) { var hz = Number(x.hz); return hz >= T.ogulAniHzMin && hz <= T.ogulAniHzMax; }); var tA = oa.length ? oa[oa.length - 1].t : null;
      if (tA != null) { var sonra = L.filter(function (x) { return x.t > tA && x.t <= tA + 3 * 3600000; }), ls = med(sonra.map(lvl)), tbA = med(L.filter(function (x) { return x.t < tA - 600000; }).map(lvl));
        if (sonra.length >= 3 && ls != null && tbA != null && tbA - ls >= T.ogulSonrasiDusDb) r.ogulCikti = true; } }
    /* Oğul hazırlığı: gündüz taban tepe frekansı son 24 saatte öncekine göre ≥ ogulKaymaHz yukarı → erken uyarı */
    var son = L.length ? L[L.length - 1].t : 0;
    function tepe(arr) { return med(arr.filter(function (x) { var hz = Number(x.hz); return gunduz(x) && isFinite(hz) && hz >= T.tabanGunduzHzMin && hz <= T.tabanGunduzHzMax && !kisaDarbe(x, T); }).map(function (x) { return Number(x.hz); })); }
    var t24 = tepe(L.filter(function (x) { return x.t > son - 24 * 3600000; })), tOnce = tepe(L.filter(function (x) { return x.t <= son - 24 * 3600000; }));
    r.ogulEgilim = kuralAcik('sesOgulEgilim', S.apiaryId) && t24 != null && tOnce != null && t24 - tOnce >= T.ogulKaymaHz;
    if (r.ogulEgilim) r.notes.push('Sensör: Oğul eğilimi — muayene et');
    /* Kovan sağlığı: son 24 saat taban sapması (dB) ≥ saglikUyariDb → uyarı, ≥ saglikKritikDb → kritik; yelpazeleme (yelpazeHzMin–Max) okuma oranı ≥ yelpazeOran → uyarı. Eşikler yönetici ayarı (ogul_skor_ayar), uzman tahmini */
    var l24 = med(L.filter(function (x) { return x.t > son - 24 * 3600000; }).map(lvl)), lOnce = med(L.filter(function (x) { return x.t <= son - 24 * 3600000; }).map(lvl));
    var sapma = l24 != null && lOnce != null ? l24 - lOnce : null;
    var yel = L.filter(function (x) { var hz = Number(x.hz); return x.sinif === 'yelpazeleme' || (isFinite(hz) && hz >= T.yelpazeHzMin && hz <= T.yelpazeHzMax); }).length / L.length;
    var sa = sapma != null ? Math.abs(sapma) : null;
    r.saglikKritik = kuralAcik('sesSaglik', S.apiaryId) && sa != null && sa >= T.saglikKritikDb;
    r.saglikBilgi = kuralAcik('sesSaglik', S.apiaryId) && (r.saglikKritik || (sa != null && sa >= T.saglikUyariDb) || yel >= T.yelpazeOran);
    r.saglikNot = r.saglikBilgi ? 'Kovanın ses ve iklim dengesi normalden saptı' : ''; /* EK13: metinde birim yok */
    /* k180: Varroa — teşhis değil, hatırlatma. Bant (varroaHzMin–Max, Yıldız & Karabağ 2026 model özelliği) son 24 saat ortanca seviyesi kovanın önceki tabanından ≥ varroaSapmaDb (uzman tahmini) saparsa → «Varroa sayımı önerilir». Her iki pencerede en az 3 okuma. */
    function vb(x) { var hz = Number(x.hz); return isFinite(hz) && hz >= T.varroaHzMin && hz <= T.varroaHzMax && !kisaDarbe(x, T) && lvl(x) != null; }
    var v24 = L.filter(function (x) { return x.t > son - 24 * 3600000 && vb(x); }), vOnce = L.filter(function (x) { return x.t <= son - 24 * 3600000 && vb(x); });
    var vs = v24.length >= 3 && vOnce.length >= 3 ? med(v24.map(lvl)) - med(vOnce.map(lvl)) : null;
    r.varroaSapma = vs; r.varroaHatirlat = kuralAcik('sesVarroa', S.apiaryId) && vs != null && T.varroaSapmaDb > 0 && Math.abs(vs) >= T.varroaSapmaDb;
    sesYeni4(S, T, r, L, son, { lvl: lvl, med: med, gunduz: gunduz });
  }
  /* koloni-227 (kullanıcı onayı): 4 yeni kovan içi ses kuralı. Değerler OGUL_SKOR.sensor (tek kaynak, panelden); kaynaklar yalnız yönetici panelinde. */
  function sesYeni4(S, T, r, L, son, U) {
    var H = 3600000, lvl = U.lvl, med = U.med, gunduz = U.gunduz, aid = S.apiaryId;
    function hzOf(x) { return Number(x.hz); }
    /* (1) Ferrari ve ark. 2008: ~110 Hz güç artışı + baskın frekans ~300 Hz'e kayma + sıcaklık 33→35 °C; oğul sonrası ~32 °C. Mevcut oğul kuralıyla ortak kontrol. */
    r.ogulOnce = false; r.ogulOnceOrtak = false;
    if (kuralAcik('sesOgulOnce', aid)) {
      var w = T.ogulOnSaat * H;
      var b110 = function (x) { var hz = hzOf(x); return isFinite(hz) && hz >= T.ogulOn110HzMin && hz <= T.ogulOn110HzMax && lvl(x) != null && !kisaDarbe(x, T); };
      var p24 = L.filter(function (x) { return x.t > son - w && b110(x); }), pOn = L.filter(function (x) { return x.t <= son - w && b110(x); });
      var g110 = p24.length >= 3 && pOn.length >= 3 ? med(p24.map(lvl)) - med(pOn.map(lvl)) : null;
      var bas = function (a) { return med(a.filter(function (x) { return isFinite(hzOf(x)) && !kisaDarbe(x, T) && x.sinif !== 'quacking'; }).map(hzOf)); };
      var b24 = bas(L.filter(function (x) { return x.t > son - w; })), bOn = bas(L.filter(function (x) { return x.t <= son - w; }));
      var kayma = b24 != null && bOn != null && b24 > bOn && Math.abs(b24 - T.ogulOnBaskinHz) <= T.ogulOnBaskinTolHz;
      var I = (S.isi_nem || []).filter(function (x) { return isFinite(Number(x.tempC)); }), iSon = I.length ? I[I.length - 1].t : son;
      var i24 = I.filter(function (x) { return x.t > iSon - w; }).map(function (x) { return Number(x.tempC); }), iOn = med(I.filter(function (x) { return x.t <= iSon - w; }).map(function (x) { return Number(x.tempC); }));
      var sicak = i24.length > 0 && iOn != null && iOn <= T.ogulOnSicakAltC + (T.ogulOnSicakUstC - T.ogulOnSicakAltC) / 2 && Math.max.apply(null, i24) >= T.ogulOnSicakUstC;
      r.ogulOnce = g110 != null && g110 >= T.ogulOn110ArtisDb && kayma && sicak; r.ogulOnceSes = r.ogulOnce;
      r.ogulOnceOrtak = r.ogulOnce && !!(r.ogulAni || r.ogulEgilim || r.isciOtme);
      if (r.ogulOnce) r.notes.push(r.ogulOnceOrtak ? 'Sensör: oğul öncesi ses ve sıcaklık oğul sesiyle birlikte — güçlü işaret' : 'Sensör: oğul öncesi ses ve sıcaklık değişimi');
      /* oğul sesinden sonra sıcaklık düşüşü → oğul çıkmış (ortak kontrol) */
      if (r.ogulAniAt != null && I.some(function (x) { return x.t > r.ogulAniAt && x.t <= r.ogulAniAt + 6 * H && Number(x.tempC) <= T.ogulOnSicakDusC; })) r.ogulCikti = true;
    }
    /* (2) Ramsey ve ark. 2020: tooting her zaman quacking'den önce; ilk oğuldan sonra 4–7 gün ötme olmaması normal. */
    r.otmeBekle = false; r.quackSirasiz = false;
    if (kuralAcik('sesOtmeSira', aid)) {
      var toot = L.filter(function (x) { var hz = hzOf(x); return isFinite(hz) && hz >= T.pipingHzMin && hz <= T.pipingHzMax && (x.ritmik === true || x.rhythmic === true) && !kisaDarbe(x, T); }).map(function (x) { return x.t; });
      if (r.quack && r.quackAt != null && !toot.some(function (t) { return t <= r.quackAt && r.quackAt - t <= T.otmeSiraSaat * H; })) {
        r.quack = false; r.quackYuksek = false; r.quackSirasiz = true;
        r.notes = r.notes.filter(function (n) { return n.indexOf('Vakvaklama') < 0 && n.indexOf('bakire ana') < 0; });
      }
      var sw = r.ogulAniAt != null ? r.ogulAniAt : (S.ogulTarihMs != null ? Number(S.ogulTarihMs) : null);
      if (sw != null && son - sw >= 0 && son - sw <= T.otmeSessizGunMax * 24 * H && !toot.some(function (t) { return t > sw; })) {
        r.otmeBekle = true; r.anasizSes = false; r.notes.push('Sensör: oğuldan sonraki ilk günlerde ana arı sesi duyulmaması normal');
      }
    }
    /* (3) Ramsey, Bencsik, Newton 2017: dur sinyali darbeleri en çok gece; darbe/sarsıntıdan hemen sonra ani artış → rahatsız edilme. Kovanın kendi gece/gündüz tabanıyla. */
    r.rahatsiz = false; r.rahatsizAt = null;
    if (kuralAcik('sesRahatsiz', aid)) {
      var dur = L.filter(function (x) { var hz = hzOf(x), d = Number(x.sureMs); return x.sinif === 'dur_sinyali' || (isFinite(hz) && hz >= T.dursunHzMin && hz <= T.dursunHzMax && isFinite(d) && d >= T.dursunMinMs && d <= T.dursunMaxMs); });
      var knock = (S.titresim || []).concat(S.ses || []).filter(function (x) { return x.darbe === true || x.sinif === 'darbe' || x.sinif === 'sarsinti'; });
      var pw = T.dursunPencereDk * 60000, gH = Math.max(1, T.gunduzSaatSon - T.gunduzSaatBas);
      knock.forEach(function (k) {
        var cnt = dur.filter(function (x) { return x.t > k.t && x.t <= k.t + pw; }).length; if (cnt < T.dursunMinSay) return;
        var gk = gunduz(k), onc = dur.filter(function (x) { return x.t < k.t && x.t >= k.t - 24 * H && gunduz(x) === gk; }).length;
        var dk = (gk ? gH : 24 - gH) * 60, bek = onc / dk * T.dursunPencereDk;
        if (cnt >= T.dursunKat * Math.max(bek, 1)) { r.rahatsiz = true; r.rahatsizAt = k.t; }
      });
      if (r.rahatsiz) r.notes.push('Sensör: kovan rahatsız edilmiş olabilir');
    }
    titresimYeni4(S, T, r, son);
    /* (4) Papachristoforou ve ark. 2008: eşek arısı saldırısında tıslama (baskın ~5,9 kHz, ~0,62 sn). Mikrofon örneklemesi yetmezse «Mikrofon desteklemiyor»; mikrofon yoksa «Cihaz yok». */
    r.esekArisi = false; r.esekDurum = null;
    if (kuralAcik('sesEsekArisi', aid)) {
      var sr = Number(S.sesOrnekleme);
      if (!(isFinite(sr) && sr >= T.esekMinOrneklemeHz)) r.esekDurum = 'destek_yok';
      else {
        r.esekDurum = 'ok';
        var hs = (S.ses || []).filter(function (x) { var hz = hzOf(x), d = Number(x.sureMs); return x.sinif === 'esek_tislama' || (isFinite(hz) && hz >= T.esekHzMin && hz <= T.esekHzMax && isFinite(d) && Math.abs(d - T.esekSureMs) <= T.esekSureTolMs); });
        r.esekArisi = hs.some(function (x) { return hs.filter(function (y) { return y.t <= x.t && x.t - y.t <= T.esekPencereDk * 60000; }).length >= T.esekMinSay; });
        r.esekAt = null; hs.forEach(function (x) { if (hs.filter(function (y) { return y.t <= x.t && x.t - y.t <= T.esekPencereDk * 60000; }).length >= T.esekMinSay) r.esekAt = x.t; });
        if (r.esekArisi) r.notes.push('Sensör: eşek arısı saldırısı olabilir');
      }
    }
  }
  /** koloni-227: kullanıcı uygulaması için eşek arısı algılama durumu (sayı yok). */
  function esekMikDurum(d) {
    if (!d) return 'Eşek arısı algılama: Cihaz yok';
    if (d.disabled) return 'Eşek arısı algılama: Cihaz devre dışı';
    var T = (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR, r = Number(d.ornekleme != null ? d.ornekleme : d.sampleRate);
    return isFinite(r) && r >= T.esekMinOrneklemeHz ? 'Eşek arısı algılama: hazır' : 'Eşek arısı algılama: Mikrofon desteklemiyor';
  }
  /** koloni-236: hangi eşek arısı yolu kullanılır (sayı yok; yönetici + kovan durumu). */
  function esekYolDurum(hid) {
    try {
      var mik = hiveCihazTipDurum(hid, 'ses');
      var ir = hiveCihazTipDurum(hid, 'ir');
      if (mik === 'aktif') {
        var S = hiveSens(hid, Date.now());
        var sr = null;
        try {
          var DV = global.SuperAriDevices, L = DV && DV.listDevices ? DV.listDevices().filter(function (d) { return d && !d.disabled && Number(d.hiveId) === Number(hid) && String(d.tip || d.type) === 'ses'; }) : [];
          if (L.length) sr = Number(L[0].ornekleme != null ? L[0].ornekleme : L[0].sampleRate);
        } catch (e0) { sr = null; }
        if (S && S.sesOrnekleme != null) sr = Number(S.sesOrnekleme);
        var T = (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR;
        if (isFinite(sr) && sr >= T.esekMinOrneklemeHz) return 'Eşek arısı yolu: tıslama';
        return ir === 'yok' ? 'Eşek arısı yolu: tıslama ölçülemiyor, giriş sayacı yok' : 'Eşek arısı yolu: IR yedek (tıslamasız)';
      }
      if (mik === 'devre_disi') return ir === 'yok' ? 'Eşek arısı yolu: tıslama ölçülemiyor, giriş sayacı yok' : 'Eşek arısı yolu: IR yedek (tıslamasız)';
      return ir === 'yok' ? 'Eşek arısı yolu: tıslama ölçülemiyor, giriş sayacı yok' : 'Eşek arısı yolu: IR yedek (tıslamasız)';
    } catch (e) { return 'Eşek arısı yolu: tıslama ölçülemiyor, giriş sayacı yok'; }
  }
  /** Sensör katkısı: { piping, sikArti, sikTahmin, nektar, notes[] }. T = eşikler. */
  function sensorOrs(S, capFrames, T) {
    var r = { piping: false, sikArti: 0, sikTahmin: null, nektar: false, notes: [] }, H = 3600000;
    /* (1) Ses/titreşim piping: ÜÇÜ birden — frekans pipingHzMin–Max, ritmik desen (okuma.ritmik), pipingDk dakika kesintisiz (ara ≤ pipingAraSn). */
    [S.ses, S.titresim].forEach(function (L) {
      if (r.piping || !L || !L.length) return;
      var st0 = null, prev = null;
      L.forEach(function (x) {
        var hz = Number(x.hz), on = isFinite(hz) && hz >= T.pipingHzMin && hz <= T.pipingHzMax && (x.ritmik === true || x.rhythmic === true) && !kisaDarbe(x, T);
        if (on && (st0 == null || (prev && x.t - prev.t > T.pipingAraSn * 1000))) st0 = x.t;
        if (!on) st0 = null;
        if (on && st0 != null && x.t - st0 >= T.pipingDk * 60000) r.piping = true;
        prev = x;
      });
    });
    if (!kuralAcik('sesPiping', S.apiaryId)) r.piping = false; /* koloni-220 */
    if (r.piping) r.notes.push('Sensör: Çıkmış Ana Ötmesi (Tooting) — oğul hazırlığı');
    sesKurallari(S, T, r);
    /* (2) Isı / nem */
    var I = S.isi_nem || [];
    if (I.length) {
      var lastT = I[I.length - 1], runStart = null, maxRun = 0, p0 = null;
      I.forEach(function (x) { var hi = Number(x.tempC) > T.tempHigh; if (hi && (runStart == null || (p0 && x.t - p0.t > 2 * H))) runStart = x.t; if (!hi) runStart = null; if (hi && runStart != null) maxRun = Math.max(maxRun, x.t - runStart); p0 = x; });
      if (maxRun >= T.tempHighSaat * H) { r.sikArti += T.tempHighArti; }
      var lt = Number(lastT.tempC);
      if (lt >= T.riseMin && lt <= T.riseMax) {
        var mn = Infinity; I.forEach(function (x) { if (x.t >= lastT.t - T.riseSaat * H && x.t < lastT.t) mn = Math.min(mn, Number(x.tempC)); });
        if (isFinite(mn) && lt - mn >= T.riseDelta) { r.sikArti += T.riseArti; }
      }
      var rh = Number(lastT.rh); if (isFinite(rh) && rh > T.nemNormalUst) { /* koloni-205: nem tek kaynak — normal üst sınır */ r.sikArti += T.nemArti; }
    }
    /* Arı sayısı (IR) → kapasite oranı */
    var capBees = (capFrames || 10) * T.ariCerceve, Ir = S.ir || [], bees = null, beeTrendUp = false;
    if (Ir.length) {
      bees = Number(Ir[Ir.length - 1].count);
      var old = Ir.filter(function (x) { return x.t <= Ir[Ir.length - 1].t - 24 * H; }); old = old.length ? old[old.length - 1] : Ir[0];
      beeTrendUp = Ir.length > 1 && bees > Number(old.count);
      if (isFinite(bees)) r.sikTahmin = Math.min(100, bees / capBees * 100);
    }
    var ratio = isFinite(bees) && bees != null ? bees / capBees : null;
    /* Tartı: günlük değişim */
    var W = S.tarti || [], dayGain = null;
    if (W.length > 1) {
      var lw = W[W.length - 1], ow = W.filter(function (x) { return x.t <= lw.t - 20 * H; }); ow = ow.length ? ow[ow.length - 1] : null;
      if (ow) dayGain = (Number(lw.kg) - Number(ow.kg)) / Math.max(1, (lw.t - ow.t) / (24 * H));
    }
    /* Sert kilo artışı + arı yoğunluğu zirvede → Sıkışıklık dolu (100). Isı/nem tek başına alarm vermez, yalnız stres eki. */
    if (dayGain != null && dayGain >= T.kiloHizli && ratio != null && ratio >= T.ariZirveOran) { r.sikDolu = true; }
    else if (dayGain != null && (dayGain >= T.kiloHizli || (Math.abs(dayGain) <= T.kiloPlato && ratio != null && ratio >= T.ariYuksekOran))) {
      r.sikArti += T.kiloArti;
    }
    if (beeTrendUp && ratio != null && ratio >= T.ariTrendOran) { r.sikArti += T.ariTrendArti; }
    /* (3) Canlı nektar akımı */
    if (dayGain != null && dayGain >= T.nektarKg) { r.nektar = true; r.notes.push('Sensör: canlı nektar akımı'); }
    /* k150 KİLİTLİ Sıkışıklık Puanı: her kat 0–1; Puan = Σ(kat×w)/Σ(w bağlı sensörler)×100. IR/Ses/Nem = kovanın kendi ortanca tabanından sapma (0–1 kırpılır). */
    var sub = {}, kutu = Math.max(1, Math.round((capFrames || 10) / 10));
    function c01(v) { return Math.max(0, Math.min(1, v)); }
    var gStart = T.gunduzSaatBas, gEnd = T.gunduzSaatSon;
    function gd(x) { var h = new Date(x.t).getHours(); return h >= gStart && h < gEnd; }
    function ayni(L0) { if (!L0.length) return L0; var g = gd(L0[L0.length - 1]); var f = L0.filter(function (x) { return gd(x) === g; }); return f.length ? f : L0; } /* k151: son 7 gün gece/gündüz kayan ortanca */
    function md(a) { a = a.filter(function (v) { return v != null && isFinite(v); }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
    if (Ir.length) { var irM = md(ayni(Ir).map(function (x) { return Number(x.count); })), irL = Number(Ir[Ir.length - 1].count); if (irM > 0 && isFinite(irL)) sub.ir = c01((irL / irM - 1) / T.irSapmaOran); }
    var SL = (S.ses || []).concat(S.titresim || []).filter(function (x) { return isFinite(Number(x.dbRel != null ? x.dbRel : x.level)); }).sort(function (p, q) { return p.t - q.t; });
    if (SL.length) { var lv0 = function (x) { return Number(x.dbRel != null ? x.dbRel : x.level); }, sM = md(ayni(SL).map(lv0)); sub.ses = c01((lv0(SL[SL.length - 1]) - sM) / T.sesSapmaDb); }
    var In = I.filter(function (x) { var rh = Number(x.rh), d = Number(x.disRh); return isFinite(rh) && !(isFinite(d) && d >= T.nemDisMax) && x.yagmur !== true; });
    if (In.length) { var nM = md(ayni(In).map(function (x) { return Number(x.rh); })); sub.nem = c01((Number(In[In.length - 1].rh) - nM) / T.nemSapma); }
    var It = I.filter(function (x) { return isFinite(Number(x.tempC)); });
    if (It.length) { var tc = Number(It[It.length - 1].tempC); sub.isi = tc <= 35.5 ? 0 : (tc >= 36 ? 1 : (tc - 35.5) / 0.5); }
    /* k152 dış ortam düzeltmesi (uzman tahmini; eşikler yönetici panelinde) */
    var tL = 0; [Ir, SL, I, W].forEach(function (A) { if (A && A.length) tL = Math.max(tL, A[A.length - 1].t); });
    var DS = (S.dis || []).filter(function (x) { return x.t <= tL + 3600000 && x.t >= tL - Math.max(1, T.disYagmurSonraSaat) * 3600000 - 3600000; });
    function yag(x) { return x.yagmur === true || Number(x.mm) >= T.disYagmurMm || Number(x.pr) >= T.disYagmurPr; }
    var yagmurDis = DS.some(function (x) { return x.t >= tL - T.disYagmurSonraSaat * 3600000 && x.t <= tL + 3600000 && yag(x); });
    var dNow = DS.filter(function (x) { return Math.abs(x.t - tL) <= 3600000; }).sort(function (p, q) { return Math.abs(p.t - tL) - Math.abs(q.t - tL); })[0] || null;
    r.disDuzeltme = { yagmur: yagmurDis, disRh: dNow ? dNow.rh : null, disTemp: dNow ? dNow.tempC : null };
    if (sub.nem != null) { if (yagmurDis) sub.nem *= T.nemYagmurCarpan; else if (dNow && Number(dNow.rh) >= T.disNemYuksek) sub.nem *= T.nemDisNemCarpan; }
    if (sub.isi != null && dNow && Number(dNow.tempC) >= T.disSicakYuksek) sub.isi *= T.isiDisSicakCarpan;
    var yagmurSimdi = DS.some(function (x) { return Math.abs(x.t - tL) <= 3600000 && yag(x); }); r.disDuzeltme.yagmurSimdi = yagmurSimdi;
    if (sub.ir != null && yagmurSimdi && T.irYagmurdaCikar) delete sub.ir; /* yağmur sırasında IR hesaptan çıkarılır (bağlı değilmiş gibi; ağırlığı orantılı dağılır) */
    if (W.length) {
      /* Tartı: kat sayısına göre net kütle / kutu. Bal akımına karşı: artış ancak IR veya Nem katı da yüksekse (≥ yuksekKat) sayılır. */
      var kgRef = Number(W[W.length - 1].kg), yuk = (sub.ir != null && sub.ir >= T.yuksekKat) || (sub.nem != null && sub.nem >= T.yuksekKat);
      if (ow && kgRef > Number(ow.kg) && !yuk) kgRef = Number(ow.kg);
      if (isFinite(kgRef)) sub.tarti = c01((kgRef - kutu * T.tartiBosKutuKg) / kutu / T.tartiDoluKutuKg);
    }
    var wsum = 0, vsum = 0; ['tarti', 'ir', 'ses', 'isi', 'nem'].forEach(function (k) { var w = Number(T['sikW_' + k]) || 0; if (sub[k] != null && w > 0) { wsum += w; vsum += w * sub[k]; } });
    r.sikSensor = wsum > 0 ? Math.round(vsum / wsum * 1000) / 10 : null;
    if (r.sikSensor != null) { r.sikEtiket = 'Sıkışıklık ' + Math.round(r.sikSensor); r.notes.push('Sensör: ' + r.sikEtiket); }
    r.sikAlt = sub;
    return r;
  }
  /** ORS saf hesap: bypass → 100; aksi ağırlıklı toplam (0–100, 0,1 hassasiyet). */
  function orsCompute(o) { if (o.bypass) return 100; var W = OGUL_SKOR.weights; var v = Math.min(100, o.sikisiklik) * W.sikisiklik + o.mevsim * W.mevsim, ws = W.sikisiklik + W.mevsim + (o.genetik != null ? W.genetik : 0) + (o.anaYasi != null ? W.anaYasi : 0); if (o.genetik != null) v += o.genetik * W.genetik; if (o.anaYasi != null) v += o.anaYasi * W.anaYasi; v = v / Math.max(1e-9, ws) * (W.genetik + W.sikisiklik + W.mevsim + W.anaYasi); /* k160: genetik veri yoksa da orantılı dağıtım */ /* k153: ana yaşı bilinmiyorsa ağırlığı orantılı dağıtılır */ return Math.round(Math.max(0, Math.min(100, v)) * 10) / 10; }
  function genetikWord(gen) {
    if (!gen.known) return gen.missing ? 'bilinmiyor (melez verisi yok)' : 'bilinmiyor';
    var g = gen.g; if (g == null) return 'veri yok'; return g <= 5 ? 'çok çok az' : g <= 15 ? 'çok az' : g <= 35 ? 'az' : g <= 45 ? 'az–orta (nesle göre değişir)' : g <= 55 ? 'orta' : g <= 65 ? 'orta–yüksek' : g <= 75 ? 'yüksek' : g <= 90 ? 'çok yüksek' : 'çok çok yüksek';
  }
  function genetikScore(breed) {
    var b = String(breed || '').toLocaleLowerCase('tr'), found = [];
    BREED_SWARM_SCALE.forEach(function (x) { if (x.m.some(function (w) { return b.indexOf(w) >= 0; })) found.push(x.key); });
    var pz = irkPuansiz(b);
    if (pz.length) { var pk = found.concat(pz.map(function (x) { return x.key; })).sort().join('+'); if (found.length) reportHybridMissing(pk, b); return { key: pk, g: null, known: false, hybrid: !!found.length, missing: true, veriYok: true, puansiz: true, label: 'veri yok' }; }
    if (!found.length) return { g: OGUL_SKOR.bilinmeyen, known: false, hybrid: false, label: b ? 'ırk tabloda yok' : 'ırk bilinmiyor' };
    if (found.length === 1) return { key: found[0], g: OGUL_SKOR.saf[found[0]], known: true, hybrid: false, label: 'saf hat' };
    var key = found.slice().sort().join('+');
    if (OGUL_SKOR.melez[key] != null) {
      var g0 = OGUL_SKOR.melez[key], go = melezYonGenetikOverride(breed);
      return { key: key, g: go != null ? go : g0, known: true, hybrid: true, label: found.length > 2 ? 'üçlü melez' : 'ikili melez', yonOverride: go != null };
    }
    /* k290: kilitli tabloya anahtar eklenmez — Efe (Ege/Anadolu ekotipi) × Kafkas, Anadolu × Kafkas basamağını kullanır (uzman tahmini; yönetici › Kural kaynakları) */
    if (GENETIK_TAKMA[key] && /efe ana/.test(b) && OGUL_SKOR.melez[GENETIK_TAKMA[key]] != null) {
      var gt = OGUL_SKOR.melez[GENETIK_TAKMA[key]], go2 = melezYonGenetikOverride(breed);
      return { key: key, g: go2 != null ? go2 : gt, known: true, hybrid: true, takma: GENETIK_TAKMA[key], label: 'ikili melez', yonOverride: go2 != null };
    }
    if (found.length === 2 && found.indexOf('buckfast') >= 0) return { g: OGUL_SKOR.buckfastIkili, known: true, hybrid: true, label: 'Buckfast melezi (nesle göre değişir)' };
    reportHybridMissing(key, found.join(' × '));
    /* k160: kilitli tabloda puanı olmayan melez → Genetik «Veri yok»: bileşen ORS'tan düşer, ağırlığı orantılı dağıtılır (puan uydurulmaz) */
    return { key: key, g: null, known: false, hybrid: true, missing: true, veriYok: true, label: 'veri yok' };
  }
  /* k127: tabloya eklenen melezler cihazdaki «veri eksik» kaydından düşülür. */
  (function purgeCovered() { try { var m = irkEksikLog(), ch = 0; Object.keys(m.items).forEach(function (k) { if (GENETIK_MELEZ[k] != null || (k.split('+').length === 2 && k.indexOf('buckfast') >= 0)) { delete m.items[k]; ch = 1; } }); if (ch) localStorage.setItem(IRK_EKSIK_KEY, JSON.stringify(m)); } catch (e) {} })();
  function breedSwarmFactor(breed) {
    var b = String(breed || '').toLocaleLowerCase('tr');
    var found = [];
    BREED_SWARM_SCALE.forEach(function (x) {
      if (x.m.some(function (w) { return b.indexOf(w) >= 0; })) found.push(x);
    });
    if (!found.length) return { f: 1.0, shift: 0, note: '', level: '', v: null, label: '' };
    var v = null, src = '', hlabel = '', hybrid = found.length > 1;
    if (!hybrid) { v = found[0].v; hlabel = found[0].lbl || ''; }
    else {
      var key = found.map(function (x) { return x.key; }).sort().join('+');
      var hy = HYBRID_SWARM[key] || (found.length === 2 && key.indexOf('buckfast') >= 0 ? BUCKFAST_CROSS : null);
      if (hy) { v = hy.v; src = hy.tahmin ? '' : hy.src; hlabel = hy.label || ''; }
      else {
        return { f: 1.0, shift: 0, note: 'melez: oğul verisi yok', level: '', v: null, label: '', hybrid: true, missing: true };
      }
    }
    var d = v - 4; /* −3 … +3 */
    return {
      v: v, hybrid: hybrid, src: src,
      f: Math.round((1 + d * 0.12) * 100) / 100, /* çarpan 0,64 … 1,36 */
      shift: Math.round(d * 6), /* ±18 puan */
      level: BREED_LEVEL_KEYS[Math.round(v)] || (v === 3.5 ? 'dusuk' : ''), label: hlabel || BREED_SWARM_LABELS[v],
      note: 'oğul eğilimi ' + (hlabel || BREED_SWARM_LABELS[v]) + (hybrid ? (!src ? ' (melez)' : src === 'kullanıcı (arıcı deneyimi)' ? ' (melez, arıcı deneyimi)' : ' (melez, yayına göre)') : '')
    };
  }
  function swarmLevelOf(score) {
    var i = score >= 70 ? 2 : (score >= 35 ? 1 : 0);
    return SWARM_LEVELS[i];
  }
  function fmtTrShort(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? Number(m[3]) + ' ' + AY_KISA[Number(m[2]) - 1] : ''; }
  function swarmAssess(h, ctx) {
    var sesPiping = false, hucreVar = false;
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
    if (!breed && !h.breedUnknown) breed = plannedBreed(breedPlanKeyFor({ id: h.apiaryId }), 0) || '';
    var breedTxt = breed ? breed + (h.breedEstimated ? ' (tahmini)' : '') : '';
    var bf = breedSwarmFactor(breed);
    var why = []; /* { key, text, dir: up | down | info, group: durum | karakter } */
    function R(key, text, dir, group) { why.push({ key: key, text: text, dir: dir || 'info', group: group || 'durum' }); }
    R('mevsim', season.bilinmiyor ? 'Oğul mevsimi: Veri yok (arılığın bölgesi bilinmiyor)' : inSeason
      ? (season.phase === 'zirve' ? 'Oğul mevsimi (' + season.profileLabel + ', ' + season.window + ')' : 'Oğul mevsimine yakın (' + season.profileLabel + ', ' + season.window + ')')
      : 'Oğul dönemi değil (' + season.profileLabel + '; oğul dönemi ' + season.window + ')', inSeason ? 'up' : 'down');
    /* --- Kovan durumu (asıl belirleyici) --- */
    var s = 0;
    var cls = st && st.strengthClass ? st.strengthClass : null;
    var slv = strengthLevel(cls || h.strength), strength = slv ? slv.key : '';
    /* k249: «güçlü» karşılaştırmaları gerçek anahtarla — strength 'guclu' / 'cok-guclu' / 'bolunmeli' olur, 'güçlü' hiç eşleşmiyordu. Güçlü = isStrongClass (Bölme ekranıyla aynı tanım). */
    var guclu = isStrongClass(strength);
    var sr = st && st.strength ? st.strength : null;
    var bees = sr && Number(sr.beeFrames) ? Number(sr.beeFrames) : null;
    var broodF = sr && Number(sr.broodFrames) ? Number(sr.broodFrames) : null;
    var beeTxt = bees ? ', ' + bees + ' çerçeve arı' : '';
    if (strength === 'bolunmeli') { R('guc', 'Koloni bölünmesi gerekiyor' + beeTxt, 'up'); }
    else if (strength === 'cok-guclu') { R('guc', 'Koloni çok güçlü' + beeTxt, 'up'); }
    else if (strength === 'guclu') { R('guc', 'Koloni güçlü' + beeTxt, 'up'); }
    else if (strength === 'normal') { R('guc', 'Koloni normal güçte' + beeTxt, 'info'); }
    else if (strength === 'zayif') { R('guc', 'Koloni zayıf' + beeTxt, 'down'); }
    else if (strength === 'cok-zayif') { R('guc', 'Koloni çok zayıf' + beeTxt, 'down'); }
    else if (strength === 'birlestir') { R('guc', 'Koloni birleştirilmeli' + beeTxt, 'down'); }
    if (broodF != null && broodF >= 6) { R('yavru', 'Çok yavru (' + broodF + ' çerçeve)', 'up'); }
    /* k249: 4–5 yavrulu çerçeve dalı boştu ve alttaki «var bxs = hiveBoxes(…)» satırını yutuyordu (kutu düzeni / bal katı yalnız 4–5 çerçevede okunuyordu).
       Bu dal ilk sürümde «s += 5» idi; ORS (k129) skoru aşağıda yeniden hesapladığı için etkisi yoktu — neden eklenmez. Kutu düzeni artık her kovanda okunur. */
    else if (broodF != null && broodF >= 4) { /* olağan yavru — neden eklenmez */ }
    var bxs = hiveBoxes(h, ctx.plan || (ctx.plan = planState()));
    var hasSuper = !!(bxs && (bxs.kat > 0 || bxs.ballik));
    /* Yer darlığı: arılı çerçeve / kutu kapasitesi (her gövde ve kat 10 çerçeve). */
    var capF = bxs ? bxs.frames : 10;
    if (bxs && bxs.known) R('kutu', 'Kovan: ' + bxs.label + ' (' + capF + ' çerçeve yer)', 'info');
    var space = false, severe = false;
    if (bees != null) {
      var used = bees / capF;
      var full = sr ? (Number(sr.broodFrames) || 0) + (Number(sr.honeyFrames) || 0) + (Number(sr.pollenFrames) || 0) : 0;
      var noEmpty = full >= capF - 1;
      if (used >= 0.9 || (used >= 0.8 && noEmpty)) { space = true; severe = true; R('yer', 'Yer darlığı: ' + bees + '/' + capF + ' çerçeve arılı' + (noEmpty ? ', boş çerçeve yok' : ''), 'up'); }
      else if (used >= 0.8 || noEmpty) { space = true; R('yer', noEmpty ? 'Boş çerçeve kalmamış' : 'Kovan dolmak üzere (' + bees + '/' + capF + ' çerçeve arılı)', 'up'); }
    } else if (guclu && !hasSuper && kuralAcik('ogulYerTahmin', h.apiaryId)) {
      /* koloni-247: kaynaksız (uzman tahmini) — yönetici › Ölçüm kuralları › «Oğul: Yer darlığı olabilir» aç/kapa (arılık / kullanıcı başına da). Skoru değiştirmez;
         Kat at / Boş çerçeve önerileri güçlü koloni için zaten çıkar (bu nedenden bağımsız). */
      space = true;
      R('yer', 'Yer darlığı olabilir (bal katı verilmemiş)', 'up');
    }
    /* Muayenede gözlenen yer durumu (Kolay muayene): sayıdan bağımsız doğrudan gözlem. */
    if (sr && sr.space === 'dolu' && !severe) { space = true; severe = true; R('yer', 'Muayenede kovan dolu / sıkışık gözlendi', 'up'); }
    else if (sr && sr.space === 'dolmak' && !space) { space = true; R('yer', 'Muayenede kovan dolmak üzere gözlendi', 'up'); }
    if (hasSuper && !severe) { R('kat', 'Bal katı verilmiş (yer açıldı)', 'down'); }
    var age = queenAge(h);
    if (age == null) R('ana', 'Ana arı yaşı bilinmiyor', 'info');
    else if (age <= 0) { R('ana', 'Genç ana arı (bu yıl)', 'down'); }
    else if (age === 1) R('ana', 'Ana arı 1 yaşında', 'info');
    else if (age === 2) { R('ana', 'Ana arı 2 yaşında', 'up'); }
    else { R('ana', 'Ana arı yaşlı (' + age + ' yaş)', 'up'); }
    var dk = Number(h.deltaKg) || 0;
    if (inSeason && dk >= 1.5) { R('tarti', 'Hızlı ağırlık artışı (bal akımı, yer dolmakta)', 'up'); }
    else if (inSeason && dk <= -2) { R('tarti', 'Ani ağırlık düşüşü — oğul çıkmış olabilir, kontrol et', 'up'); }
    var swD = h.lastSwarmDate && /^\d{4}-\d{2}-\d{2}$/.test(String(h.lastSwarmDate)) ? String(h.lastSwarmDate) : '';
    var today0 = ctx.date || todayLocal();
    /* Bu mevsim oğul verdiyse (son 120 gün): koloni ana memesinden yeni ana yetiştirir, tekrar oğul riski düşüktür. */
    var recentSwarm = !!(swD && swD <= today0 && swD >= addDays(today0, -120));
    if (swD && !recentSwarm && swD >= addDays(today0, -365)) {
      R('gecmis', 'Son bir yılda oğul verdi (' + fmtTrShort(swD) + ')', 'up');
    }
    if (h.sensorSwarmSignal === true) { R('sensor', 'Sensör: oğul öncesi ses/ısı işareti', 'up'); }
    /* --- Ana arı karakteri: ırk ana etkenlerden biri (k125) — çarpan + kaydırma --- */
    var t = String(h.swarmTendency || '');
    var shift = bf.shift || 0;
    if (t === 'Yüksek') { shift += 4; R('egilim', 'Gözlenen oğul eğilimi yüksek', 'up', 'karakter'); }
    else if (t === 'Düşük') { shift -= 2; R('egilim', 'Gözlenen oğul eğilimi düşük', 'down', 'karakter'); }
    shift = Math.max(-22, Math.min(22, shift)) * (inSeason ? 1 : 0.5);
    var clipped = h.queenClipped === true;
    if (clipped) R('kirpik', 'Ana arı kırpık: oğul kaçışı riski azalır', 'down', 'karakter');
    /* Ana memesi kaydı (son yavru muayenesi): yer, sayı, kapalı/açık. */
    var cell = !!(st && st.swarmCell);
    var capped = !!(st && st.cellCapped === 'kapali');
    if ((capped && cell) || (severe && inSeason)) shift = Math.max(0, shift); /* karakter bu durumlarda düşürmez */
    var cellN = st && st.cellCount ? st.cellCount : null;
    var cd = st && st.brood && st.brood.date ? ' — muayene ' + fmtTrShort(st.brood.date) : '';
    var nTxt = function (w) { return (cellN ? cellN + ' ' : '') + (st.cellCapped ? CELL_CAP_LABEL[st.cellCapped] + ' ' : '') + w; };
    var quietCells = false, manyCells = false;
    if (cell) {
      why.splice(1, 0, { key: 'meme', text: 'Alt kenarda ' + nTxt('oğul yüksüğü') + cd, dir: 'up', group: 'durum' });
    } else if (st && st.supersedureCell) {
      if (cellN != null && cellN > 3) {
        manyCells = true;
        why.splice(1, 0, { key: 'meme', text: 'Petek ortasında çok sayıda yüksük (' + cellN + ') — oğul hazırlığı olabilir' + cd, dir: 'up', group: 'durum' });
      } else {
        quietCells = true;
        why.splice(1, 0, { key: 'meme', text: 'Sessiz ana değiştirme: petek ortasında ' + nTxt('yüksük') + cd, dir: 'down', group: 'durum' });
      }
    } else if (st && st.unknownCell && kuralAcik('ogulMemeYerBilinmiyor', h.apiaryId)) {
      /* Yer bilinmiyor: oğul yüksüğü sayılmaz (skor 100'e çıkmaz), ama kontrol önerilir. */
      why.splice(1, 0, { key: 'meme', text: 'Ana memesi var, yeri bilinmiyor (' + nTxt('yüksük') + ') — alt kenardaysa oğul hazırlığıdır, yerine bakın' + cd, dir: 'up', group: 'durum' });
    }
    var capQ = false, capS = false;
    var queenless = !!(st && st.queenless);
    if (queenless) {
      capQ = true;
      why = why.filter(function (x) { return ['ana', 'egilim', 'kirpik'].indexOf(x.key) === -1; }); /* ana yok: ana yaşı/eğilimi anlamsız */
      why.splice(1, 0, st.emergencyCell
        ? { key: 'acil', text: 'Acil yüksük (genç larvadan' + (cellN ? ', ' + cellN + ' yüksük' : '') + ') — koloni anasız, yeni ana yetiştiriyor' + cd, dir: 'down', group: 'durum' }
        : { key: 'anasiz', text: 'Koloni anasız — oğul vermez', dir: 'down', group: 'durum' });
    }
    if (recentSwarm) {
      /* Oğuldan 3 haftadan uzun süre sonra yeniden alt kenar memesi kaydı varsa sınırlama kalkar. */
      var lateCell = cell && st && st.brood && st.brood.date && st.brood.date > addDays(swD, 21);
      if (!lateCell) {
        capS = true;
        why = why.filter(function (x) { return x.key !== 'yer' && x.key !== 'tarti'; });
        why.splice(1, 0, { key: 'ogulverdi', text: 'Oğul verdi (' + fmtTrShort(swD) + ') — bu mevsim tekrar oğul riski düşük', dir: 'down', group: 'durum' });
      }
    }
    /* --- k129 Oğul Risk Skoru (ORS) ---
       Ana memesi (açık/kapalı) son muayenede → 100. Aksi: Genetik×0,30 + Sıkışıklık×0,40 + Mevsim×0,15 + AnaYaşı×0,15 (varsayılan; yönetici değiştirebilir).
       Sınırlar: anasız ≤ 5; son 120 günde oğul verdi ≤ 15. */
    var gen = genetikScore(breed);
    var capTot = capF || 10, fullF = null;
    if (sr) { var ff = (Number(sr.broodFrames) || 0) + (Number(sr.honeyFrames) || 0) + (Number(sr.pollenFrames) || 0); fullF = Math.max(bees || 0, ff) || null; }
    var sik = fullF != null ? Math.min(100, fullF / capTot * 100) : (sr && sr.space === 'dolu' ? 100 : (sr && sr.space === 'dolmak' ? 75 : 50));
    var mev = season.phase === 'zirve' ? 100 : (season.phase === 'kenar' ? 60 : 15); /* k153: zirve 100 · kenar 60 · dışı 15 (nektar akımı → 100 aşağıda) */
    var TP = (OGUL_SKOR && OGUL_SKOR.sensor) || ORS_SENSOR; /* k262: ana yaşı puanları yönetici ayarı (uzman tahmini; yön: Simpson 1957/1960, Akyol 2008) */
    var anaP = age == null ? null : (age <= 0 ? TP.anaYasPuan0 : (age === 1 ? TP.anaYasPuan1 : TP.anaYasPuan2)); /* k153: bilinmiyorsa bileşen çıkarılır */
    if (anaP != null) anaP = Math.max(0, Math.min(100, Number(anaP)));
    /* k150 (Winston 1987; Fell & Morse 1984): yalnız oğul yüksüğü bypass; sessiz değiştirme (1–2 yüksük, ana var) ve boş kupa skoru artırmaz */
    var anyCell = !!(st && st.swarmCell);
    if (st && st.supersedureCell) R('yenileme', 'Sessiz ana değiştirme yüksüğü — oğul işareti değil', 'info');
    /* k131 sensörlü mod: sensör verisi yoksa yukarıdaki cihazsız mod aynen geçerli. */
    var sensorlu = false, S = hiveSens(id, ctx.now || Date.now());
    if (S.any) {
      hucreVar = anyCell;
      var Tp = Object.assign({}, OGUL_SKOR.sensor, { pipingDk: (gen.key && OGUL_SKOR.piping[gen.key]) || ORS_SENSOR.pipingDk }), so = sensorOrs(S, capTot, Tp), noFrame = fullF == null && !(sr && (sr.space === 'dolu' || sr.space === 'dolmak'));
      if (so.sikSensor != null) { sik = so.sikSensor; sensorlu = true; } /* k149: ağırlıklı sensörlü Sıkışıklık */
      else {
        if (noFrame && so.sikTahmin != null) { sik = so.sikTahmin; sensorlu = true; }
        if (so.sikArti) { sik = Math.min(100, sik + so.sikArti); sensorlu = true; }
        if (so.sikDolu) { sik = 100; sensorlu = true; }
      }
      if (so.nektar && mev < 100) { mev = 100; sensorlu = true; }
      if (so.piping) { anyCell = true; sensorlu = true; sesPiping = true; }
      so.notes.forEach(function (t) { R('sensor', t, 'up'); });
    }
    var ors = { genetik: gen.g, sikisiklik: Math.round(sik * 10) / 10, mevsim: mev, anaYasi: anaP, bypass: anyCell, sensorlu: sensorlu };
    s = orsCompute(ors);
    if (capQ) s = Math.min(s, 5);
    if (capS) s = Math.min(s, 15);
    s = Math.round(Math.max(0, Math.min(100, s)) * 10) / 10;
    var lv = anyCell && s >= 70 ? SWARM_LEVELS[3] : swarmLevelOf(s);
    if (!queenless) R('irk', 'Ana arı karakteri: ' + (breedTxt || 'ırk bilinmiyor') + ' — oğul eğilimi ' + genetikWord(gen), gen.g == null ? 'info' : gen.g >= 70 ? 'up' : (gen.g < 35 ? 'down' : 'info'), 'karakter');
    /* Öneriler (nedene göre). */
    var recs = [];
    function A(id, title, detail, extra) { var r = { id: id, title: title, detail: detail }; if (extra) for (var k in extra) r[k] = extra[k]; recs.push(r); }
    var elevated = lv.key !== 'dusuk';
    if (queenless && st && st.emergencyCell) {
      A('anasiz', 'Anasız akışı: yüksüklere dokunma', 'Acil yüksükten ana ~1 haftada çıkar, çiftleşme ~2 hafta sürer; 3 hafta sonra yumurta kontrol et. Tutmazsa ana arı ver veya kovanı birleştir.');
    } else if (queenless) {
      A('anasiz', 'Ana arı ver veya kovanı birleştir', 'Anasız koloni oğul vermez ama zayıflar; ana arı ver, yüksük ver ya da kovanı birleştir.');
    } else if (quietCells) {
      A('dokunma', 'Yüksüklere dokunma, izle', 'Petek ortasındaki 1–3 yüksük koloninin anasını sessizce yenilediğini gösterir; yüksüklere dokunma, 3 hafta sonra yumurta kontrol et.');
      if (inSeason && orsYuksek(lv.key) && (space || guclu)) A('kat', 'Kat at (bal katı ver)', 'Yer darlığını giderir.');
    } else if (cell || (inSeason && elevated)) {
      if (cell) A('meme', capped ? 'Yüksükleri bölmede kullan' : 'Yüksükleri kontrol et', capped
        ? 'Kapalı oğul yüksüğü: oğul birkaç gün içinde çıkabilir. Koloniyi böl, yüksüklü çerçeveyi bölmede kullan.'
        : 'Açık oğul yüksüğü: 7 gün sonra tekrar kontrol et. Bölme yap veya yer aç.');
      if (cell && !guclu) A('bolme', 'Bölme yap', 'Oğul yüksüğü olan koloniyi böl; yüksüklü çerçeveyi bölmeye ver.', { href: 'koloni-islem.html?islem=bolme&apiary=' + encodeURIComponent(h.apiaryId) + '&src=' + encodeURIComponent(id) + '&neden=ogul' });
      if (space || guclu) A('kat', 'Kat at (bal katı ver)', 'Yer darlığını giderir; oğul hazırlığını çoğu zaman durdurur.');
      if (guclu) A('bolme', 'Bölme yap', 'Güçlü koloniden yavrulu ve arılı çerçevelerle bölme yap.', { href: 'koloni-islem.html?islem=bolme&apiary=' + encodeURIComponent(h.apiaryId) + '&src=' + encodeURIComponent(id) + '&neden=ogul' });
      if (space || guclu) A('cerceve', 'Boş çerçeve / temel petek ver', 'Kuluçka alanına 1–2 temel petek koy; ana yumurtlayacak yer bulur.');
      if (!cell) A('meme', 'Yüksükleri kontrol et', '7–10 günde bir çerçeve altlarına ve kenarlarına bak.');
      if (age != null && age >= 2) A('ana', 'Ana arıyı yenile', 'Genç ana oğul eğilimini azaltır.');
      if (season.profile === 'sicak' || guclu) A('hava', 'Havalandırma / gölge sağla', 'Giriş aralığını aç, sıcak saatlerde gölge sağla.');
      /* Kanat kırpma: yalnız çiftleşmiş ve yumurtlayan, henüz kırpılmamış ana. */
      var laying = !(st && st.queenCellSince) && ((st && st.brood && st.brood.eggs === true) || (age != null && age >= 1));
      if (orsYuksek(lv.key) && !clipped && laying) A('kanat', 'Ana arı kanadını kırp (isteğe bağlı)', 'Oğul çıkarsa ana uçamaz, koloni kovana döner. Kırpma tek başına oğulu durdurmaz; yüksük kontrolü, kat atma veya bölme ile birlikte yap.');
    } else {
      if (manyCells) A('meme', 'Yüksükleri kontrol et', 'Yüksüklerin yerine bak: alt kenardaysa oğul, petek ortasındaysa sessiz ana değiştirmedir.');
      if (age != null && age >= 3) A('ana', 'Ana arıyı yenile', 'Yaşlı ana gelecek mevsim oğul riskini artırır.');
      A('izle', 'Bir şey yapma, izlemeye devam', inSeason ? 'Risk düşük; olağan muayenelerde kontrol et.' : 'Oğul dönemi değil; olağan bakımla devam et.');
    }
    var seasonNote = why[0].text;
    return { score: s, piping: sesPiping, hucre: hucreVar || (anyCell && !sesPiping), sensorlu: sensorlu, display: lv.label + ' ' + Math.round(s) + (sensorlu ? ' · sensörlü' : ''), ors: ors, genetik: gen, level: lv.label, key: lv.key, tone: lv.tone, color: lv.color, breed: breed,
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
  /** Oğul uyarıları: ORS ≥ 70 (Kritik) kovanlar. */
  function swarmAlerts() {
    var out = [];
    var ctx = { date: todayLocal() };
    loadHives().forEach(function (h) {
      var a = swarmAssess(h, ctx);
      if (a && a.piping && !a.hucre) return; /* ötme: ses uyarısı (ALARM_KRITIK_PIP_01) */
      /* EK12: ORS seviye izleme → ors_70 / ors_orta (ekip bildirimi) */
      try { var gO = typeof window !== 'undefined' ? window : globalThis; if (a && gO.SuperAriKritik) gO.SuperAriKritik.orsGozle(h.id, a.key, a.score, h.apiaryId); } catch (eO) { /* */ }
      /* EK13: muayenede yüksük → yalnız ALARM_MANUEL_YUKSUK_01 (aynı olayda ALARM_KRITIK_CELL_01 çıkmaz) */
      if (a && a.key === 'kritik' && a.hucre) return;
      if (a && orsYuksek(a.key)) {
        var kr = a.key === 'kritik';
        out.push({ id: 'ogul-' + h.id, code: kr ? 'ALARM_KRITIK_CELL_01' : 'ALARM_YUKSEK_SCORE_01', title: kr ? '🚨 KRİTİK: Oğul Yüksüğü Var' : '⚠️ YÜKSEK: Sıkışıklık ve Oğul Riski',
          body: kr ? 'Son muayenede oğul yüksüğü görüldü. Oğul hazırlığı başladı.' : 'Oğul Risk Skoru yüksek seviyede. Kovan içi veriler oğul hazırlığına işaret ediyor.',
          action: kr ? 'Kovanı muayene et; bölme yap veya yer aç.' : 'Kovanı muayene et, kat atma veya çerçeve çekme işlemlerini uygula.', type: 'ogul', hiveId: h.id, score: a.score,
          apiaryId: h.apiaryId, severity: kr ? 'critical' : 'high', auto: true, href: 'bakim-akis.html?id=' + encodeURIComponent(h.id) + '&apiary=' + encodeURIComponent(h.apiaryId), hrefLabel: 'Hızlı muayene' });
      }
    });
    return out;
  }

  /** Arka plan sağlık modeli için yalın bayraklar (formül sensor-health.js içinde). */
  function healthFlags(hiveId) {
    var st = colonyStatus(hiveId);
    var f = { queenless: st.queenless, chilled: st.chilled, weak: isWeakClass(st.strengthClass), afb: st.afb };
    Object.keys(st.latestByDisease).forEach(function (k) { f[k] = diseaseLevel(st.latestByDisease[k]).level; });
    return f;
  }

  /* Kovan bayrakları (anasız, ana hücresi, birleştirildi) — ham depodan, değişmedikçe önbellekli. */
  var hiveFlagCache = { raw: null, map: {} };
  function hiveFlags() {
    var raw = null;
    try { raw = localStorage.getItem(mk(HIVES_KEY)); } catch (e) { raw = null; }
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
      if (!h || h.colonyState === 'birlestirildi' || h.colonyState === 'sonuk') return;
      var st = colonyStatus(h.id, all);
      if (st.queenCellSince) {
        var qc = addDays(st.queenCellSince, 21);
        tasksOut.push({ id: 'kr-anahucre-' + h.id, title: 'Yüksük verildi — ' + h.name + ': yumurta kontrol et (yüksük ' + fmtTr(st.queenCellSince) + ', ana çıkışı ~7 gün, çiftleşme ~2 hafta)', hiveId: h.id, priority: 3, auto: true, due: qc, createdAt: new Date().toISOString() });
      }
      var nm = h.name;
      var apName = aps[h.apiaryId] ? aps[h.apiaryId].name : '';
      if (st.queenless) {
        tasksOut.push({ id: 'kr-anasiz-' + h.id, title: st.emergencyCell
            ? 'Acil yüksük (anasız) — ' + nm + ': yüksüklere dokunma, 3 hafta sonra yumurta kontrol et; olmazsa ana arı ver veya kovanı birleştir'
            : 'Anasız koloni — ' + nm + ': ana arı ver veya kovanı birleştir', hiveId: h.id, priority: 1, auto: true, due: st.brood ? st.brood.date : '', createdAt: nowIso });
      }
      /* k154 yalancı ana / erkek yumurtlayan ana (ayrı id'ler) */
      if (st.sign === 'cokYumurta' && !st.queenSeen) alertsOut.push({ id: 'kra-yalanci-yumurta-' + h.id, title: 'Yalancı ana arı şüphesi (' + nm + ')', body: 'Gözlerde birden çok yumurta var, ana görülmedi.', action: '9 gün sonra kapalı yavruyu kontrol et.', type: 'koloni', hiveId: h.id, severity: 'high', auto: true });
      if (st.sign === 'erkekYavru' && !st.queenSeen) alertsOut.push({ id: 'kra-yalanci-erkek-' + h.id, title: 'Yalancı ana arı şüphesi (' + nm + ')', body: 'Dağınık erkek yavru var, ana görülmedi.', action: '9 gün sonra kapalı yavruyu kontrol et.', type: 'koloni', hiveId: h.id, severity: 'high', auto: true });
      if (st.sign === 'erkekYavru' && st.queenSeen) alertsOut.push({ id: 'kra-erkekana-' + h.id, title: 'Erkek yumurtlayan ana şüphesi (' + nm + ')', body: 'Ana var ama yalnız erkek yavru görülüyor.', action: 'Ana arıyı değiştir.', type: 'koloni', hiveId: h.id, severity: 'medium', auto: true });
      /* k154 ses uyarıları (şablon) + anasızlık tek uyarı (kanıt arttıkça seviye yükselir) */
      var so6 = null;
      var shY = null; try { var SHy = hiveSens(h.id, Date.now()); if (SHy.any) shY = saglikHatirlatmalari(SHy, Object.assign({}, OGUL_SKOR.sensor), Date.now()); } catch (eSh) { shY = null; }
      try {
        var SS = hiveSens(h.id, Date.now());
        if (SS.any && (SS.ses.length || SS.titresim.length)) so6 = sensorOrs(SS, 10, Object.assign({}, OGUL_SKOR.sensor));
      } catch (eSes) { so6 = null; }
      function AL(id, code, sev, title, body, action) { alertsOut.push({ id: id + h.id, code: code, title: title, body: body, action: action, type: 'ses', hiveId: h.id, severity: sev, auto: true }); }
      if (so6) {
        var swP = false; try { swP = !!swarmAssess(h).piping; } catch (eP) { swP = false; }
        if (so6.ogulAni) AL('kra-ses-ogulani-', 'ALARM_KRITIK_SW_01', 'critical', '🚨 ACİL: Oğul Çıkıyor! (' + nm + ')', 'Kovanda oğul çıkışına özgü ses tespit edildi. Arılar kovanı terk ediyor!', 'Arılığa git ve oğul salkımını yakalamak için hazırlık yap.');
        if (so6.isciOtme) AL('kra-ses-isci-', 'ALARM_YUKSEK_WORK_01', 'high', '⚡ Önemli: Oğul Çıkışına Yaklaşılıyor (' + nm + ')', 'İşçi Arı Ötmesi (Worker Piping) sesinde sert artış tespit edildi. Oğul yaklaşık 1 saat içinde kovandan havalanabilir!', 'Kovan girişini ve uçuş tahtasını gözlemle.');
        /* k174: kullanıcı kararı — Tooting + Quacking birlikte = «Ana Arılar Ötmesi (Piping)» en yüksek (kritik, art oğul yakın); tek başına Tooting / Quacking daha düşük. Yeni eşik yok (mevcut quackYuksek penceresi). */
        if (so6.titOtme && !(so6.quack && so6.quackYuksek)) AL('kra-ses-pip-', 'ALARM_KRITIK_PIP_01', 'critical', '👑 Bakire ana çıktı, ikincil oğul riski (' + nm + ')', 'Kovanda ana arı ötmesi ardından yüksükte bakire ana sesi algılandı.', 'Kovanı muayene et, yüksükleri kontrol et.');
        else if (so6.quack && so6.quackYuksek) AL('kra-ses-pip-', 'ALARM_KRITIK_PIP_01', 'critical', '🚨 KRİTİK: Ana Arılar Ötmesi (Piping) (' + nm + ')', 'Çıkmış Ana Ötmesi (Tooting) ve Vakvaklama (Quacking) birlikte duyuldu. Art oğul çok yakın!', 'Kovanı hemen aç, yüksükleri kontrol et ve art oğul önlemi al.');
        else if (so6.piping || swP) AL('kra-ses-toot-', 'ALARM_YUKSEK_TOOT_01', 'high', '⚠️ YÜKSEK: Çıkmış Ana Ötmesi (Tooting) (' + nm + ')', 'Kovanda ritmik Çıkmış Ana Ötmesi (Tooting) duyuldu. Yüksükten ana çıkmış olabilir; oğul hazırlığı.', 'Kovanı muayene et, yüksükleri kontrol et.');
        else if (so6.quack) AL('kra-ses-quack-', 'ALARM_ORTA_QUACK_01', 'medium', '👑 Erken Uyarı: Yüksükte Bakire Ana (' + nm + ')', 'Kovanda yüksük içi Vakvaklama (Quacking) sesi tespit edildi. İçeride bakire ana var, ikinci oğul riski!', 'Kovanı muayene et ve yeni doğacak ana arıların durumunu kontrol et.');
        if (so6.ogulEgilim) AL('kra-ses-egilim-', 'ALARM_ORTA_TREND_01', 'medium', '🔍 Erken Uyarı: Oğul Eğilimi (' + nm + ')', 'Kovanın sesinde son günlerde oğul eğilimine işaret eden bir değişim var.', 'Kovanı takibe al, kontrollerde yüksük başlangıçlarını incele.');
        /* koloni-227: yeni ses kuralları — kısa, sayısız metin */
        if (so6.ogulOnce && !so6.ogulAni) AL('kra-ses-ogulonce-', 'ALARM_ORTA_OGULONCE_01', so6.ogulOnceOrtak ? 'high' : 'medium', '🔍 Erken Uyarı: Oğul Hazırlığı (' + nm + ')', (so6.ogulOnceTit && !so6.ogulOnceSes ? 'Kovanın gece titreşimi oğul öncesine benzer şekilde arttı.' : 'Kovanın sesi ve sıcaklığı birlikte oğul öncesine benzer şekilde değişti.'), 'Kovanı muayene et, yüksükleri kontrol et.');
        if (so6.rahatsiz) AL('kra-ses-rahatsiz-', 'ALARM_ORTA_RAHATSIZ_01', 'medium', '⚠️ Kovan Rahatsız Edilmiş Olabilir (' + nm + ')', (so6.titDarbe ? 'Kovanda ani bir darbe ya da huzursuzluk titreşimi algılandı.' : 'Bir darbe ya da sarsıntıdan sonra arılarda ani bir huzursuzluk sesi duyuldu.'), 'Kovanın yerini, kapağını ve çevresini kontrol et.');
        /* EK13: yalnız gerçek sapmada (saglikBilgi: taban sapması / yelpazeleme eşiği aşıldı) */
        if (so6.saglikBilgi) { var saU = sablonUyari('ALARM_BILGI_SAGLIK_01', h, nm, 'ses'); if (so6.saglikKritik) saU.severity = 'high'; alertsOut.push(saU); }
      }
      /* koloni-236: eşek arısı — yol A: tıslama+sıcaklık+titreşim; yol B (tıslama ölçülemezse): sıcaklık+titreşim+IR çıkan düşüşü (Tem–Eki, uygun uçuş); IR yoksa uyarı yok. */
      if (shY && kuralAcik('esekGiris', h.apiaryId)) {
        var esW = OGUL_SKOR.sensor.esekEslesDk * 60000;
        var yakT = function (ref, L) { return !!(ref != null && L && L.some(function (t) { return Math.abs(t - ref) <= esW; })); };
        var mikYok = false; try { mikYok = hiveCihazTipDurum(h.id, 'ses') === 'yok' || hiveCihazTipDurum(h.id, 'ses') === 'devre_disi'; } catch (eM) { mikYok = true; }
        var tislamaYok = mikYok || !so6 || so6.esekDurum !== 'ok';
        var yolA = so6 && so6.esekArisi && so6.esekDurum === 'ok' && yakT(so6.esekAt, shY.esekSicakAt) && yakT(so6.esekAt, shY.esekTitAt);
        var refB = null;
        if (!yolA && tislamaYok && shY.esekSicakAt && shY.esekSicakAt.length && shY.esekTitAt && shY.esekTitAt.length && shY.esekIrAt && shY.esekIrAt.length) {
          shY.esekSicakAt.forEach(function (ts) {
            if (refB != null) return;
            if (shY.esekTitAt.some(function (t) { return Math.abs(t - ts) <= esW; }) && shY.esekIrAt.some(function (t) { return Math.abs(t - ts) <= esW; })) refB = ts;
          });
        }
        var yolB = refB != null;
        shY.esekYol = yolA ? 'tislama' : (yolB ? 'ir' : (tislamaYok && shY.esekSicakAt.length && shY.esekTitAt.length && !shY.esekIrVar ? 'yetersiz' : null));
        var esekSevA = yolA && yakT(so6.esekAt, shY.esekGirisSicak) ? 'critical' : 'high';
        var esekSevB = yolB && shY.esekGirisSicak && shY.esekGirisSicak.some(function (t) { return Math.abs(t - refB) <= esW; }) ? 'critical' : 'high';
        if (yolA) AL('kra-ses-esek-', 'ALARM_YUKSEK_ESEK_01', esekSevA, '🐝 Eşek Arısı Saldırısı Olabilir (' + nm + ')', 'Tıslama sesi, sıcaklık değişimi ve titreşim birlikte algılandı.', 'Kovan girişini kontrol et, giriş daraltıcı tak ve tuzak kur.');
        else if (yolB) AL('kra-ses-esek-', 'ALARM_YUKSEK_ESEK_01', esekSevB, '🐝 Eşek Arısı Saldırısı Olabilir (' + nm + ')', 'Sıcaklık değişimi, titreşim artışı ve uçuşta ani düşüş birlikte algılandı.', 'Kovan girişini kontrol et, giriş daraltıcı tak ve tuzak kur.');
      }
      /* EK13: oğul çıkmış olabilir — ses (oğul sonrası uğultu düşüşü) ya da tartıda ani ağırlık kaybı */
      var aniK = false; try { var gK2 = typeof window !== 'undefined' ? window : globalThis, TL = sensList('tarti').filter(function (x) { return Number(x.hiveId) === Number(h.id); }).map(function (x) { return { t: x.t, kg: Number(x.kg != null ? x.kg : x.deger) }; }); aniK = !!(gK2.SuperAriKritik && gK2.SuperAriKritik.aniKayip(TL)); } catch (eAK) { aniK = false; }
      if ((so6 && so6.ogulCikti) || aniK) alertsOut.push(sablonUyari('ALARM_YUKSEK_CIKIS_01', h, nm, so6 && so6.ogulCikti ? 'ses' : 'tarti'));
      /* EK13: muayenede aktif oğul yüksüğü */
      var aY = null; try { aY = swarmAssess(h); } catch (eY) { aY = null; }
      if (st.swarmCell || (aY && aY.key === 'kritik' && aY.hucre)) { var yk = sablonUyari('ALARM_MANUEL_YUKSUK_01', h, nm, 'koloni'); yk.apiaryId = h.apiaryId; yk.href = 'bakim-akis.html?id=' + encodeURIComponent(h.id) + '&apiary=' + encodeURIComponent(h.apiaryId); yk.hrefLabel = 'Hızlı muayene'; alertsOut.push(yk); }
      /* koloni-231: yeni 5 kural — kısa, sayısız metin; ekran atlaması yok (yalnız uyarı kartı) */
      if (shY && (shY.koloniSonuk || shY.titKis)) alertsOut.push({ id: 'kra-sonuk-' + h.id, code: 'ALARM_YUKSEK_SONUK_01', type: 'koloni', hiveId: h.id, auto: true, severity: 'high', title: (shY.koloniSonuk ? '⚫ Koloni sönmüş olabilir (' : '⚫ Koloni ölümü şüphesi (') + nm + ')', body: shY.koloniSonuk ? 'Kovan sıcaklığı dış hava gibi değişiyor, arı hareketi yok.' + (shY.titKis ? ' Kış titreşimi de durmuş.' : '') : 'Kışın kovanda titreşim neredeyse durdu.', action: 'Kovanı kontrol et.' });
      if (shY && shY.tarlaciKayip && !shY.irDonmeyen) alertsOut.push({ id: 'kra-tarlaci-' + h.id, code: 'ALARM_ORTA_TARLACI_01', type: 'tarti', hiveId: h.id, auto: true, severity: 'medium', title: '🐝 Tarlacı arı kaybı olabilir (' + nm + ')', body: 'Uygun havada sabahları tarlacı çıkışı her zamankinden az.', action: 'Kovanı ve çevredeki ilaçlamaları kontrol et.' });
      if (shY && shY.havalandirma) alertsOut.push({ id: 'kra-hava-' + h.id, code: 'ALARM_ORTA_HAVA_01', type: 'koloni', hiveId: h.id, auto: true, severity: shY.havaYelpaze ? 'high' : 'medium', title: '🌬️ Havalandırma yetersiz olabilir (' + nm + ')', body: shY.havaNeden === 'yogusma' ? 'Kovan içi çok nemli, kapakta su damlaması olabilir.' : 'Kovan içi uzun süredir hem sıcak hem nemli.', action: shY.havaNeden === 'yogusma' ? 'Üst havalandırmayı aç, kapağı kontrol et.' : 'Havalandırmayı artır, gölgeleme yap.' });
      /* koloni-233: IR giriş sayacı kuralları — kısa, sayısız metin; tek uyarı birleştirmeleri */
      if (shY && shY.irSayac) alertsOut.push({ id: 'kra-ir-sayac-' + h.id, code: 'ALARM_ORTA_IRSAYAC_01', type: 'cihaz', hiveId: h.id, auto: true, severity: 'medium', title: '🔧 Giriş sayacı: kanal tıkalı olabilir (' + nm + ')', body: 'Giriş sayacının bir kanalı saymıyor ya da sayımlar tutarsız.', action: 'Sayacın kanallarını propolis ve çöpten temizle.' });
      if (shY && shY.irIlac) alertsOut.push({ id: 'kra-ir-ilac-' + h.id, code: 'ALARM_YUKSEK_ILAC_01', type: 'koloni', hiveId: h.id, auto: true, severity: 'high', title: '☠️ İlaçlama şüphesi (' + nm + ')', body: 'Girişte arı hareketi aniden olağandışı değişti, zehirlenme olabilir.', action: 'Giriş önünde ölü arı var mı bak, çevredeki ilaçlamayı sor.' });
      if (shY && shY.irDonmeyen) alertsOut.push({ id: 'kra-tarlaci-' + h.id, code: 'ALARM_ORTA_TARLACI_01', type: 'koloni', hiveId: h.id, auto: true, severity: shY.tarlaciKayip ? 'high' : 'medium', title: '🐝 Tarlacı arı kaybı olabilir (' + nm + ')', body: shY.tarlaciKayip ? 'Tarlacılar her zamankinden az dönüyor, tartı da bunu gösteriyor.' : 'Tarlacılar her zamankinden az dönüyor.', action: 'Kovanı ve çevredeki ilaçlamaları kontrol et.' });
      if (shY && shY.irDusukAktivite) alertsOut.push({ id: 'kra-ir-aktivite-' + h.id, code: 'ALARM_ORTA_AKTIVITE_01', type: 'koloni', hiveId: h.id, auto: true, severity: 'medium', title: '📉 Uçuş beklenenden az (' + nm + ')', body: 'Hava uygun olduğu halde arılar her zamankinden çok daha az uçuyor.', action: 'Kovanı muayene et, koloni gücüne ve ana arıya bak.' });
      if (shY && shY.irOgulCikti) {
        var ogA = alertsOut.filter(function (a) { return a && String(a.id || '').indexOf('kra-ses-ogulani-') === 0 && String(a.hiveId) === String(h.id); })[0];
        if (ogA) ogA.body = String(ogA.body || '') + ' Giriş sayacı da toplu çıkışı gösteriyor.';
        else alertsOut.push({ id: 'kra-ses-ogulani-' + h.id, code: 'ALARM_KRITIK_SW_01', type: 'koloni', hiveId: h.id, auto: true, severity: shY.irOgulTarti ? 'critical' : 'high', title: '🚨 Oğul çıkmış olabilir (' + nm + ')', body: shY.irOgulTarti ? 'Girişten çok sayıda arı çıktı ve dönmedi, kovan da hafifledi.' : 'Girişten çok sayıda arı çıktı ve dönmedi.', action: 'Arılığa git, çevrede oğul salkımı ara.' });
      }
      var qSic = !!(shY && shY.yavrusuz);
      var qSes = !!(so6 && so6.anasizSes), qMua = !!st.queenless, qYum = !!(st.brood && st.eggs === false);
      if (!qSes && !qMua && qSic) alertsOut.push({ id: 'kra-anasiz-' + h.id, code: 'ALARM_AYRI_QUEENLESS_01', type: 'koloni', hiveId: h.id, auto: true, severity: 'medium', title: '💔 Yavru kalmamış olabilir (' + nm + ')', body: 'Kuluçka sıcaklığı her zamanki gibi sabit tutulmuyor.', action: 'Kovanı muayene et, yumurta ve ana arıyı kontrol et.' });
      if (qSes || qMua) {
        var nK = (qSes ? 1 : 0) + (qMua ? 1 : 0) + (qYum && !qMua ? 1 : 0) + (qSic ? 1 : 0);
        alertsOut.push({ id: 'kra-anasiz-' + h.id, code: 'ALARM_AYRI_QUEENLESS_01', type: qSes ? 'ses' : 'koloni', hiveId: h.id, auto: true,
          severity: nK >= 2 || qMua ? 'high' : 'medium',
          title: (qSes ? '💔 UYARI: Anasızlık Şüphesi' : '💔 UYARI: Anasız Koloni') + ' (' + nm + ')',
          body: [qSes ? 'Kovanda 10 dakika boyunca normalden belirgin şekilde yüksek, düzensiz bir uğultu var: Anasızlık Uğultusu (Queenless Roar).' : '', qMua ? 'Son muayenede ana ve yumurta görülmedi.' : (qYum ? 'Son muayenede yumurta görülmedi.' : ''), qSic ? 'Kuluçka sıcaklığı da sabit tutulmuyor.' : ''].filter(Boolean).join(' '),
          action: st.emergencyCell ? 'Acil yüksüklere dokunma; 3 hafta sonra yumurta kontrol et.' : 'Kovanı muayene et. Ana arı kaybı varsa yeni ana arı ver veya kovanı birleştir.' });
      }

      if (st.chilled) {
        tasksOut.push({ id: 'kr-usumus-' + h.id, title: 'Birleştir veya çerçeve azalt — ' + nm + ' (zayıf koloni, üşümüş yavru)', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
        alertsOut.push({ id: 'kra-usumus-' + h.id, title: 'Üşümüş yavru — zayıf koloni (' + nm + ')', type: 'koloni', hiveId: h.id, severity: 'medium', auto: true });
      }
      if (st.swarmCell) {
        tasksOut.push({ id: 'kr-ogulhucre-' + h.id, title: 'Oğul yüksüğü görüldü' + (st.cellCapped === 'kapali' ? ' (kapalı)' : '') + ' — ' + nm + ': bölme yap veya yer aç', hiveId: h.id, priority: 2, auto: true, createdAt: nowIso });
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
          alertsOut.push({ id: 'kra-' + d.key + '-' + h.id, title: d.label + ' — ' + nm, type: 'hastalık', hiveId: h.id, severity: d.level === 'orta' ? 'medium' : 'high', auto: true });
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
      /* k180: ses varroa bandı tabandan saptıysa düşük seviyeli görev «Varroa sayımı önerilir» — teşhis değil, en çok varroaGun (7) günde bir */
      var vrA = varroaHatirlatma(h.id, !!(so6 && so6.varroaHatirlat), st.latestByDisease.varroa ? st.latestByDisease.varroa.date : null, today0);
      if (vrA) tasksOut.push({ id: 'kr-varroa-ses-' + h.id, title: 'Varroa sayımı önerilir — ' + nm, hiveId: h.id, priority: 3, auto: true, sig: vrA, createdAt: nowIso });
      /* k181: Kireç riski ve genel koloni kontrolü — teşhis değil, düşük seviyeli görev; en çok hatirlatmaGun (7) günde bir; tamamlanınca o dönem tekrar gelmez */
      var shR = shY;
      var hgun = OGUL_SKOR.sensor.hatirlatmaGun;
      var nemKr = !!(shR && shR.nemYon === 'kirec'); /* koloni-202: nem > nemKirecUst ile sıcaklık kireç kuralı aynı anahtar → kovan başına hatirlatmaGun günde tek uyarı */
      var krA = haftalikHatirlatma('kirec', h.id, !!(shR && (shR.kirec || nemKr)), today0, hgun);
      if (krA) tasksOut.push({ id: 'kr-kirec-' + h.id, title: (shR && !shR.kirec && nemKr ? 'Nem çok yüksek, kireç hastalığı riski var' : 'Kireç riski, kuluçka ve havalandırma kontrolü önerilir') + ' — ' + nm, hiveId: h.id, priority: 3, auto: true, sig: krA, createdAt: nowIso, not: shR && shR.kirecNem ? 'Kovan içi nem de yüksek.' : '' });
      /* k192: Kuluçka sıcaklığı — sade metin, hastalık adı yok; en çok hatirlatmaGun günde bir */
      var kuA = haftalikHatirlatma('kulucka', h.id, !!(shR && (shR.kulucka || shR.kuluckaOynak)), today0, hgun);
      if (kuA) tasksOut.push({ id: 'kr-kulucka-' + h.id, title: (shR && shR.kulucka ? (shR.kuluckaAcil ? 'ACİL: Kuluçka bölümü çok soğudu, kireç hastalığı riski var. Kovanı hemen kontrol edin' : shR.kuluckaKritik ? (shR.kuluckaYon === 'dusuk' ? 'Kuluçka bölümü uzun süredir çok soğuk, kovanı hemen kontrol edin' : 'Kuluçka bölümü uzun süredir çok sıcak, kovanı hemen kontrol edin') : (shR.kuluckaYon === 'dusuk' ? 'Kuluçka bölümü uzun süredir normalden soğuk, kovanı kontrol edin' : 'Kuluçka bölümü uzun süredir normalden sıcak, kovanı kontrol edin')) : 'Kuluçka bölümünün sıcaklığı dengesiz, kovanı kontrol edin') + ' — ' + nm, hiveId: h.id, priority: shR && shR.kuluckaKritik ? 1 : 3, seviye: shR && shR.kuluckaAcil ? 'acil' : (shR && shR.kuluckaKritik ? 'kritik' : 'uyari'), auto: true, sig: kuA, createdAt: nowIso });
      /* k195: ACİL → sabit kırmızı kart (yalnız Tamam ile kapanır); düzelince «Durum düzeldi» */
      try { var KRk = global.SuperAriKritik; if (KRk) { if (shR && shR.kuluckaAcil) KRk.ac({ kod: 'kulucka_acil', anahtar: String(h.id), hiveId: h.id, apiaryId: h.apiaryId }); else KRk.iyilesti('kulucka_acil', String(h.id)); } } catch (eKa) { /* */ }
      /* koloni-199: nem aralığı, IR, titreşim — sade metin, eşik/kaynak yok */
      var nmA = haftalikHatirlatma('nem_disi', h.id, !!(shR && shR.nemDisi && shR.nemYon !== 'kirec'), today0, hgun);
      if (nmA) tasksOut.push({ id: 'kr-nem-' + h.id, title: (shR.nemYon === 'dusuk' ? 'Nem çok düşük, yavru (yumurta) açılmama riski var' : shR.nemYon === 'erken' ? 'Nem düşüyor, yavrularda kuruma riski var' : 'Nem normal aralığın üstünde') + ' — ' + nm, hiveId: h.id, priority: shR.nemYon === 'dusuk' ? 1 : 3, auto: true, sig: nmA, createdAt: nowIso });
      var ioA = haftalikHatirlatma('ir_ogul', h.id, !!(shR && shR.irOgul && !shR.irOgulCikti), today0, 1);
      if (ioA) tasksOut.push({ id: 'kr-ir-ogul-' + h.id, title: 'Girişte çok sayıda arı çıktı, oğul vermiş olabilir. Kovanı hemen kontrol edin — ' + nm, hiveId: h.id, priority: 1, auto: true, sig: ioA, createdAt: nowIso });
      var iyA = haftalikHatirlatma('ir_yagma', h.id, !!(shR && shR.irYagma), today0, 1);
      if (iyA) tasksOut.push({ id: 'kr-ir-yagma-' + h.id, title: 'Girişte yağma belirtisi olabilir, giriş daraltmayı değerlendirin — ' + nm, hiveId: h.id, priority: 2, auto: true, sig: iyA, createdAt: nowIso });
      var itA = haftalikHatirlatma('ir_trafik', h.id, !!(shR && shR.irTrafik && !shR.irDusukAktivite), today0, hgun);
      if (itA) tasksOut.push({ id: 'kr-ir-trafik-' + h.id, title: 'Giriş trafiği son günlerde çok azaldı, kovanı kontrol edin — ' + nm, hiveId: h.id, priority: 2, auto: true, sig: itA, createdAt: nowIso });
      var tvA = haftalikHatirlatma('titresim', h.id, !!(shR && shR.titresimOlagan), today0, 1);
      if (tvA) tasksOut.push({ id: 'kr-titresim-' + h.id, title: 'Kovanda olağandışı hareket algılandı, kovanı kontrol edin — ' + nm, hiveId: h.id, priority: 2, auto: true, sig: tvA, createdAt: nowIso });
      var gkA = haftalikHatirlatma('genel', h.id, !!(shR && shR.genel), today0, hgun);
      if (gkA) tasksOut.push({ id: 'kr-genel-kontrol-' + h.id, title: 'Genel koloni kontrolü ve fiziksel muayene yapılması önerilir — ' + nm, hiveId: h.id, priority: 3, auto: true, sig: gkA, createdAt: nowIso });
      /* k182: nüfus düşüşü — %20 uyarı (öncelik 3), %30 kritik (öncelik 1); aynı haftalık anahtar, kritik öncelikli */
      var nufKosul = !!(shR && (shR.genelNufusKritik || shR.genelNufusUyari));
      var gnA = haftalikHatirlatma('genel_nufus', h.id, nufKosul, today0, hgun);
      if (gnA) {
        var kritik = !!(shR && shR.genelNufusKritik);
        tasksOut.push({ id: 'kr-genel-nufus-' + h.id, title: (kritik ? 'Kritik: ' : '') + 'Genel koloni kontrolü ve fiziksel muayene yapılması önerilir — ' + nm, hiveId: h.id, priority: kritik ? 1 : 3, auto: true, sig: gnA, createdAt: nowIso });
      }
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
    /* koloni-199: cihaz sağlığı — sarı/kırmızı/kopuk/arızalı; cihaz başına günde en çok bir görev */
    try {
      var DVc = global.SuperAriDevices, tdC = todayLocal(), Tc = Object.assign({}, OGUL_SKOR.sensor);
      if (DVc && DVc.listDevices) cihazSaglik(DVc.listDevices().filter(function (d) { return d && !d.disabled; }), Tc, Date.now(), function (d) { return d.tip === 'isi_nem' && d.hiveId != null ? sensList('isi_nem').filter(function (x) { return Number(x.hiveId) === Number(d.hiveId) && x.t >= Date.now() - 2 * 86400000; }) : []; }).forEach(function (c) {
        var an = haftalikHatirlatma('cihaz_' + c.durum, String(c.id), true, tdC, 1); if (!an) return;
        var hv = c.hiveId != null ? hives[Number(c.hiveId)] : null, ad = (DVc.tipLabel ? DVc.tipLabel(c.tip) : c.tip) + (hv ? ' · ' + hv.name : '');
        var ttl = c.neden === 'gateway' ? 'Gateway bağlantısı koptu, arılıktaki cihazlardan veri gelmiyor' : c.durum === 'arizali' ? 'Cihaz arızalı olabilir, okumalar mantıksız' : c.durum === 'kopuk' ? 'Cihaz bağlantısı koptu' : c.durum === 'kirmizi' ? 'Cihazdan uzun süredir veri gelmiyor' : 'Cihazdan veri gelmiyor';
        tasksOut.push({ id: 'kr-cihaz-' + c.durum + '-' + c.id, title: ttl + ' — ' + ad, hiveId: c.hiveId, priority: c.durum === 'sari' ? 3 : 2, auto: true, sig: an, createdAt: nowIso });
      });
    } catch (eCs) { /* */ }
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
    strengthInfo: strengthInfo,
    strengthLevel: strengthLevel,
    strengthRange: strengthRange,
    viableFrames: viableFrames,
    viaScore: viaScore,
    BELOW_VIABLE: BELOW_VIABLE,
    SPLIT_LEVEL: SPLIT_LEVEL,
    SCORE_LEVELS: SCORE_LEVELS,
    VIABLE_SCORE: VIABLE_SCORE,
    splitCheck: splitCheck,
    splitWindow: splitWindow,
    crossInfo: crossInfo,
    crossYon: crossYon,
    strengthTag: strengthTag,
    STRENGTH_LEVELS: STRENGTH_LEVELS,
    COLONY_ENV: COLONY_ENV,
    envFor: envFor,
    breedEnv: breedEnv,
    breedParts: breedParts,
    isWeakClass: isWeakClass,
    isStrongClass: isStrongClass,
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
    /* k175: il yazılınca çiçek takvimi talebi (takvimi olmayan il → tek kayıt) */
    try { var gC = typeof window !== 'undefined' ? window : globalThis; if (input && input.il && gC.SuperAriCicek && gC.SuperAriCicek.secildi) setTimeout(function () { gC.SuperAriCicek.secildi(input.il); }, 0); } catch (eC) { /* */ }
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
    /* k175: il yazılınca çiçek takvimi talebi (takvimi olmayan il → tek kayıt) */
    try { var gC = typeof window !== 'undefined' ? window : globalThis; if (patch && patch.il && gC.SuperAriCicek && gC.SuperAriCicek.secildi) setTimeout(function () { gC.SuperAriCicek.secildi(patch.il); }, 0); } catch (eC) { /* */ }
    loadHives();
    var list = loadApiaries();
    var key = String(id);
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== key) continue;
      var a = list[i];
      if (patch) {
        var prevLoc = { lat: a.lat, lon: a.lon, place: a.place, il: a.il, ilce: a.ilce, koy: a.koy };
        if (patch.name != null && String(patch.name).trim() && String(patch.name).trim() !== a.name && patch._userRename) a.userRenamedAt = new Date().toISOString();
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
        if (coordsTouched) {
          /* Konum geçmişi: 100 m’den büyük değişiklikte eski yer kaydedilir; kullanıcı taşıdı işareti örnek konum düzeltmesini kapatır. */
          var pla = Number(prevLoc.lat), plo = Number(prevLoc.lon);
          if (isFinite(pla) && isFinite(plo) && prevLoc.lat != null && !patch._noHistory && haversineMetres(pla, plo, Number(a.lat), Number(a.lon)) > 100) {
            var hist = Array.isArray(a.locHistory) ? a.locHistory.slice() : [];
            var he = { lat: pla, lon: plo, place: prevLoc.place || '', until: todayLocal(), at: new Date().toISOString() };
            if (prevLoc.il) he.il = prevLoc.il; if (prevLoc.ilce) he.ilce = prevLoc.ilce; if (prevLoc.koy) he.koy = prevLoc.koy;
            if (patch._gocId) he.gocId = String(patch._gocId);
            hist.push(he); a.locHistory = hist.slice(-30);
          }
          a.userMovedAt = new Date().toISOString();
        }
        if (coordsTouched && !waterPatched) {
          /* Konum değişti: eski su bağını / mesafeyi yerel katalog + haversine ile yenile. */
          var locSync = resyncWaterForNewCoords(a);
          /* il/ilçe/köy yeni kopyada kayboluyordu → korunur (Göç (Arılığı Taşı) yeni il/ilçeyi yazar). */
          a = copyAdminFields(locSync.apiary, a);
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

  /* k159 performans: hiveById her çağrıda 145 kovanı yeniden normalize ediyordu (O(n²)). Depo değişmedikçe kimlik haritası önbellekte. */
  function hiveStoreSig() {
    try { return workMode() + '\u0001' + todayLocal() + '\u0001' + localStorage.getItem(mk(HIVES_KEY)) + '\u0001' + localStorage.getItem(mk(STORAGE_KEY)) + '\u0001' + localStorage.getItem(mk(QUEENS_KEY)); } catch (e) { return null; }
  }
  function hiveById(id) {
    var n = Number(id);
    loadHives();
    if (!LH.map) { var m = {}; (LH.list || []).forEach(function (h) { m[h.id] = h; }); LH.map = m; }
    return LH.map[n] || null;
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
    /* k89: 1 günlük larva aşılaması (gün 0) → ana arı yumurtadan ~16 günde (aşılamadan ~11–12 gün sonra) çıkar.
       crit: kritik gün (Larva Transferi ve Ana Takvimi ekranında uyarı); win: gün aralığı (gösterim) */
    { key: 'asilama', d: 0, label: 'Larva transferi (aşılama)' },
    { key: 'kabul', d: 1, label: 'Kabul kontrolü (kaç yüksük kabul edildi)' },
    { key: 'kapanma', d: 5, label: 'Hücreler kapanır — 5–10. gün çerçeveyi sarsmayın, ters çevirmeyin', crit: true },
    { key: 'dagitim', d: 10, label: 'Olgun hücreleri çiftleşme kutularına taşı (en geç 10. gün)', crit: true },
    { key: 'cikis', d: 11, win: '11–12', label: 'Ana arı çıkışı — çıkış kontrolü (ilk çıkan diğer hücreleri öldürür)', crit: true },
    { key: 'ucus', d: 17, win: '16–20', label: 'Çiftleşme uçuşu kontrolü (öğle, sıcak ve rüzgârsız günler)' },
    { key: 'yumurta', d: 21, win: '21–28', label: 'Yumurtlama kontrolü (ana çiftleşti mi)', crit: true },
    { key: 'yumurta2', d: 28, label: 'Son yumurtlama kontrolü: yumurta yoksa ana kayıp say, yeni ana ver' }
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
    var qTxt = { kaynakta: 'ana kaynakta kaldı, yeni kovan anasız', hucre: 'yeni kovana yüksük verildi', yeniAna: 'yeni kovana yeni ana verildi', anaTasindi: 'ana yeni kovana alındı, kaynak anasız' }[mode];
    var srcQ = src.currentQueenId ? queenById(src.currentQueenId, queens) : null;
    if (mode === 'kaynakta') { setQueenless(nh, null); nh.pendingMother = { date: date, origin: 'bolme', queenId: srcQ ? srcQ.id : '', breed: (srcQ && srcQ.breed) || src.breed || '', fromHiveId: src.id }; }
    else if (mode === 'hucre') setQueenless(nh, date);
    else if (mode === 'yeniAna') {
      var r0 = replaceQueenInMemory(nh, { date: date, queenYear: o.queenYear || currentYear(), breed: o.queenBreed || src.breed, queenSource: txt(o.queenSource, 120) || 'Bölmede verildi', queenMarked: o.queenMarked === true }, queens, gen);
      nh = r0.hive; nh.queenGivenAt = date;
      nh.queenHistory[nh.queenHistory.length - 1].label = 'Bölme: yeni ana verildi';
    } else {
      var q = src.currentQueenId ? queenById(src.currentQueenId, queens) : null;
      if (!q) throw new Error('Kaynak kovanın ana kaydı yok; «Ana kaynakta» veya «Yüksük» seç');
      closePlacement(q, src.id, date, 'Bölmede yeni kovana alındı');
      pushQueenHist(sc, { date: date, oldQueenId: q.id, oldYear: q.year, oldBreed: q.breed, label: 'Bölme: ana yeni kovana alındı (' + name + ')' });
      setQueenless(sc, null);
      sc.pendingMother = { date: date, origin: 'bolme', queenId: q.id, breed: q.breed || '', fromHiveId: src.id };
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
        /* Kız ana: ırk anneden önerilir (tahmini; baba yerel erkek arılar). */
        r0.queen.origin = 'uretim';
        if (b.sourceQueenId) r0.queen.motherQueenId = b.sourceQueenId;
        if (b.sourceBreed) { r0.queen.motherBreed = b.sourceBreed; r0.queen.breed = b.sourceBreed; r0.queen.breedEstimated = true; }
        mirrorQueenToHive(nh, r0.queen);
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
      var nq = normalizeQueen({ id: gen(year), year: year, breed: b.sourceBreed || '', breedEstimated: !!b.sourceBreed, origin: 'uretim', motherQueenId: b.sourceQueenId, motherBreed: b.sourceBreed, source: src, marked: o.marked === true, note: 'Boşta (çiftleşme kutusu / satış)', createdAt: new Date().toISOString(), placements: [] });
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
        if (t.key === 'asilama' || t.key === 'kapanma') return;
        if (t.key === 'kabul' && b.accepted != null) return;
        var due = b.dates[t.key];
        if (due < addDays(today0, -30)) return;
        out.push({ id: 'kr-uretim-' + b.id + '-' + t.key, title: 'Ana üretimi: ' + t.label + ' — ' + tag, hiveId: b.sourceHiveId, apiaryId: src ? src.apiaryId : null,
          priority: t.key === 'kabul' || t.key === 'dagitim' ? 2 : 3, auto: true, kind: 'uretim', due: due });
      });
    });
    return out;
  }
  /* ================= Koloni ek kayıtları (k89) =================
   * Tek depo: superari.koloniEk.v1 (canlı) / superari.koloniEk.demo.v1 (demo; örnek kayıt YOK — boş başlar).
   * Satır: { id, type, apiaryId, hiveId?, date, ...alanlar, createdAt, demo? }
   *  type 'kapan'     oğul kapanı: name, place, lat?, lng?, every (kontrol aralığı, gün), lastCheck?, checks:[tarih], status 'aktif'|'kaldirildi'
   *  type 'yakalama'  yakalanan oğul: trapId?, size 'kucuk'|'orta'|'buyuk', note, hiveId? (kovana alındıysa)
   *  type 'kayip'     sönük kovan: hiveId, cause, note (fotoğraf: SuperAriFoto, kayıt kimliği 'ke:<id>')
   *  type 'hircin'    hırçınlık skoru 1 (çok sakin) … 5 (çok hırçın), hiveId
   *  type 'foto'      çerçeve fotoğrafı: hiveId, frame, pattern (elle değerlendirme), note (fotoğraflar 'ke:<id>')
   *  type 'vet'       veteriner kontrolü: hiveId? (boş = arılığın tamamı), inspector, findings, medicine, withdrawalDays, withdrawalEnd
   * Bulut: records tablosu, kind 'colony_event', local_id 'ke:<id>' (yeni tablo gerekmez; bkz. bulut.js). */
  var KE_LIVE = 'superari.koloniEk.v1', KE_DEMO = 'superari.koloniEk.demo.v1';
  var KE_TYPES = ['kapan', 'yakalama', 'kayip', 'hircin', 'foto', 'vet'];
  var LOSS_CAUSES = [
    { key: 'varroa', label: 'Varroa' }, { key: 'aclik', label: 'Açlık' }, { key: 'anasizlik', label: 'Anasızlık' },
    { key: 'soguk', label: 'Soğuk / nem' }, { key: 'yagma', label: 'Yağma' }, { key: 'zehir', label: 'Zehirlenme' }, { key: 'bilinmiyor', label: 'Bilinmiyor' }
  ];
  var TEMPER_LABELS = { 1: 'Çok sakin', 2: 'Sakin', 3: 'Orta', 4: 'Hırçın', 5: 'Çok hırçın' };
  var BROOD_PATTERNS = [
    { key: 'duzenli', label: 'Düzenli (kompakt)' }, { key: 'hafif', label: 'Hafif boşluklu' }, { key: 'daginik', label: 'Dağınık' },
    { key: 'cok-daginik', label: 'Çok dağınık / delikli' }, { key: 'yok', label: 'Kuluçka yok' }
  ];
  var SWARM_SIZES = { kucuk: 'Küçük', orta: 'Orta', buyuk: 'Büyük' };
  function keKey() { return workMode() === 'live' ? KE_LIVE : KE_DEMO; }
  function keRead() { try { var a = JSON.parse(localStorage.getItem(keKey()) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && x.id && x.type; }) : []; } catch (e) { return []; } }
  function keWrite(a) { try { localStorage.setItem(keKey(), JSON.stringify(a || [])); } catch (e) { /* ignore */ } try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e2) { /* ignore */ } }
  function keList(f) {
    f = f || {};
    return keRead().filter(function (x) {
      if (f.type && x.type !== f.type) return false;
      if (f.hiveId != null && Number(x.hiveId) !== Number(f.hiveId)) return false;
      if (f.apiaryId != null && f.apiaryId !== '' && f.apiaryId !== 'all' && String(x.apiaryId) !== String(f.apiaryId)) return false;
      return true;
    }).sort(function (a, b) { return a.date === b.date ? (String(a.createdAt) < String(b.createdAt) ? 1 : -1) : (a.date < b.date ? 1 : -1); });
  }
  function keGet(id) { return keRead().filter(function (x) { return String(x.id) === String(id); })[0] || null; }
  function keClean(type, o, base) {
    var r = base ? JSON.parse(JSON.stringify(base)) : { id: 'ke' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: type, createdAt: new Date().toISOString() };
    if (o.date != null) r.date = isoDate(o.date) || todayLocal(); if (!r.date) r.date = todayLocal();
    if (o.hiveId != null && o.hiveId !== '') { var hv = hiveById(o.hiveId); if (!hv) throw new Error('Kovan bulunamadı'); r.hiveId = hv.id; r.apiaryId = String(hv.apiaryId); }
    else if (o.hiveId === '') delete r.hiveId;
    if (o.apiaryId != null && o.apiaryId !== '' && r.hiveId == null) r.apiaryId = String(o.apiaryId);
    if (!r.apiaryId && type !== 'yakalama') throw new Error('Arılık seçin');
    var t = function (k, n) { if (o[k] != null) { var v = txt(o[k], n); if (v) r[k] = v; else delete r[k]; } };
    t('note', 400);
    if (type === 'kapan') {
      t('name', 60); t('place', 160);
      if (!r.name) throw new Error('Kapan adı / yeri girin');
      ['lat', 'lng'].forEach(function (k) { if (o[k] != null && o[k] !== '') { var v = numIn(o[k], -180, 180); if (v != null) r[k] = Math.round(v * 1e5) / 1e5; } });
      if (o.every != null) r.every = intIn(o.every, 1, 60) || 7; if (!r.every) r.every = 7;
      if (o.status != null) r.status = o.status === 'kaldirildi' ? 'kaldirildi' : 'aktif'; if (!r.status) r.status = 'aktif';
      if (!Array.isArray(r.checks)) r.checks = [];
    } else if (type === 'yakalama') {
      if (o.trapId != null) { if (o.trapId) r.trapId = String(o.trapId); else delete r.trapId; }
      if (r.trapId) { var tr = keGet(r.trapId); if (tr && !r.apiaryId) r.apiaryId = tr.apiaryId; }
      if (!r.apiaryId) throw new Error('Arılık seçin');
      if (o.size != null) r.size = SWARM_SIZES[o.size] ? o.size : 'orta';
    } else if (type === 'kayip') {
      if (r.hiveId == null) throw new Error('Kovan seçin');
      if (o.cause != null) r.cause = LOSS_CAUSES.some(function (c) { return c.key === o.cause; }) ? o.cause : 'bilinmiyor'; if (!r.cause) r.cause = 'bilinmiyor';
    } else if (type === 'hircin') {
      if (r.hiveId == null) throw new Error('Kovan seçin');
      if (o.score != null) { var sv = Math.round(Number(o.score)); r.score = sv >= 1 && sv <= 5 ? sv : null; } if (!r.score) throw new Error('1–5 arası puan seçin');
    } else if (type === 'foto') {
      if (r.hiveId == null) throw new Error('Kovan seçin');
      t('frame', 20);
      if (o.pattern != null) { if (BROOD_PATTERNS.some(function (p) { return p.key === o.pattern; })) r.pattern = o.pattern; else delete r.pattern; }
    } else if (type === 'vet') {
      t('inspector', 80); t('findings', 600); t('medicine', 200); t('docNo', 60);
      if (o.withdrawalDays != null) { var wd = intIn(o.withdrawalDays, 0, 365); if (wd) r.withdrawalDays = wd; else delete r.withdrawalDays; }
      if (r.withdrawalDays) r.withdrawalEnd = addDays(r.date, r.withdrawalDays); else delete r.withdrawalEnd;
      if (!r.inspector && !r.findings && !r.medicine) throw new Error('Kontrol eden, bulgu veya reçeteden en az birini girin');
    }
    if (workMode() !== 'live') r.demo = true;
    return r;
  }
  function keAdd(type, o) {
    if (KE_TYPES.indexOf(type) < 0) throw new Error('Bilinmeyen kayıt türü');
    var r = keClean(type, o || {}); var l = keRead(); l.push(r); keWrite(l); return r;
  }
  function keUpdate(id, patch) {
    var l = keRead(), out = null;
    l = l.map(function (x) { if (String(x.id) !== String(id)) return x; out = keClean(x.type, patch || {}, x); out.updatedAt = new Date().toISOString(); return out; });
    if (!out) throw new Error('Kayıt bulunamadı');
    keWrite(l); return out;
  }
  function keRemove(id) { keWrite(keRead().filter(function (x) { return String(x.id) !== String(id); })); }
  /* Oğul kapanı: kontrol edildi → son kontrol bugün; sıradaki kontrol = son kontrol (yoksa kurulum) + aralık */
  function trapNext(t) { return addDays(t.lastCheck || t.date, t.every || 7); }
  function keUpdateRaw(id, fields) {
    var l = keRead(), out = null;
    l = l.map(function (x) { if (String(x.id) !== String(id)) return x; out = JSON.parse(JSON.stringify(x)); Object.keys(fields).forEach(function (k) { if (fields[k] == null) delete out[k]; else out[k] = fields[k]; }); out.updatedAt = new Date().toISOString(); return out; });
    if (out) keWrite(l); return out;
  }
  /** Yakalanan oğulu yeni kovan yapar (arılığa eklenir, kovan sayısı güncellenir). */
  function captureToHive(capId, o) {
    o = o || {};
    var c = keGet(capId); if (!c || c.type !== 'yakalama') throw new Error('Yakalama kaydı bulunamadı');
    if (c.hiveId != null && hiveById(c.hiveId)) throw new Error('Bu oğul zaten kovana alındı');
    var apiaryId = String(o.apiaryId || c.apiaryId || ''), aps = loadApiaries(), ap = null;
    aps.forEach(function (a) { if (String(a.id) === apiaryId) ap = a; });
    if (!ap) throw new Error('Arılık seçin');
    var list = loadHives(), used = {}, maxId = 0, maxAp = 0;
    list.forEach(function (h) { used[h.id] = true; maxId = Math.max(maxId, h.id); if (String(h.apiaryId) === apiaryId) maxAp = Math.max(maxAp, h.id); });
    var nid = maxAp + 1; while (used[nid]) nid = ++maxId + 1;
    var nh = normalizeHive({ id: nid, name: txt(o.name, 60) || ('Kovan ' + nid), apiaryId: apiaryId, strength: 'orta', swarmRisk: 'Düşük', breedUnknown: true });
    nh.createdBy = 'ogul';
    list.push(nh); saveHives(list);
    ap.hiveCount = list.filter(function (h) { return String(h.apiaryId) === apiaryId; }).length; saveApiaries(aps);
    var bees = intIn(o.beeFrames, 0, 20);
    if (bees) addRecord(nh.id, 'strength', { date: c.date, beeFrames: bees, broodFrames: 0, honeyFrames: 0, pollenFrames: 0, note: 'Yakalanan oğul kovanlandı' + (workMode() === 'demo' ? ' · Demo' : '') });
    keUpdateRaw(capId, { hiveId: nh.id, apiaryId: apiaryId });
    return nh;
  }
  /** Sönük kovan kaydı: kovan «sönük» olur, etkin sayımlardan ve güç ortalamalarından çıkar; geçmiş korunur. */
  function markDead(o) {
    o = o || {};
    var hv = hiveById(o.hiveId); if (!hv) throw new Error('Kovan seçin');
    if (hv.colonyState === 'sonuk') throw new Error('Bu kovan zaten sönük olarak kayıtlı');
    if (hv.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovan sönük kaydedilemez');
    var r = keAdd('kayip', o);
    var list = loadHives().map(function (h) { if (h.id !== hv.id) return h; var c = cloneObj(h); c.colonyState = 'sonuk'; c.sonukAt = r.date; c.colonyUpdatedAt = new Date().toISOString(); return c; });
    saveHives(list);
    return r;
  }
  function undoDead(recId) {
    var r = keGet(recId); if (!r || r.type !== 'kayip') throw new Error('Kayıt bulunamadı');
    keRemove(recId);
    var others = keList({ type: 'kayip', hiveId: r.hiveId });
    if (!others.length) {
      saveHives(loadHives().map(function (h) { if (h.id !== Number(r.hiveId) || h.colonyState !== 'sonuk') return h; var c = cloneObj(h); delete c.colonyState; delete c.sonukAt; c.colonyUpdatedAt = new Date().toISOString(); return c; }));
    }
    return r;
  }
  /** Hırçınlık skoru (1 çok sakin … 5 çok hırçın); kovan kaydındaki «sakinlik» (5 çok sakin) da güncellenir: sakinlik = 6 − skor. */
  function setTemper(o) {
    var r = keAdd('hircin', o || {});
    try { updateHiveColony(r.hiveId, { calmness: 6 - r.score }); } catch (e) { /* ignore */ }
    return r;
  }
  function lastTemper(hiveId) { return keList({ type: 'hircin', hiveId: hiveId })[0] || null; }
  function isActiveHive(h) { return !!h && h.colonyState !== 'sonuk' && h.colonyState !== 'birlestirildi'; }
  /* Görevler: kapan kontrol günü · veteriner bekleme süresi bitişi (otomatik, «sig» ile) */
  function extraTasks() {
    var out = [], today0 = todayLocal();
    keRead().forEach(function (x) {
      if (x.type === 'kapan' && x.status !== 'kaldirildi') {
        var due = trapNext(x);
        out.push({ id: 'kr-kapan-' + x.id, title: 'Oğul kapanını kontrol et — ' + x.name, apiaryId: x.apiaryId, priority: due <= today0 ? 2 : 3, auto: true, kind: 'ogul', due: due, sig: 'k' + (x.lastCheck || x.date) });
      } else if (x.type === 'vet' && x.withdrawalEnd && x.withdrawalEnd >= addDays(today0, -7)) {
        var hv = x.hiveId != null ? hiveById(x.hiveId) : null;
        out.push({ id: 'kr-vet-' + x.id, title: 'Bekleme süresi bitiyor (' + (x.medicine || 'ilaç') + ') — ' + (hv ? hv.name : 'arılık') + ': bal hasadı bu tarihten sonra', hiveId: hv ? hv.id : undefined, apiaryId: x.apiaryId, priority: 3, auto: true, kind: 'hastalik', due: x.withdrawalEnd, sig: 'v' + x.withdrawalEnd });
      }
    });
    return out;
  }
  var colonyExtra = {
    KEY_LIVE: KE_LIVE, KEY_DEMO: KE_DEMO, TYPES: KE_TYPES, LOSS_CAUSES: LOSS_CAUSES, TEMPER_LABELS: TEMPER_LABELS, BROOD_PATTERNS: BROOD_PATTERNS, SWARM_SIZES: SWARM_SIZES,
    list: keList, get: keGet, add: keAdd, update: keUpdate, remove: keRemove, trapNext: trapNext, trapCheck: function (id, date) {
      var t = keGet(id); if (!t || t.type !== 'kapan') throw new Error('Kapan bulunamadı');
      var d = isoDate(date) || todayLocal(); return keUpdateRaw(id, { lastCheck: d, checks: (t.checks || []).concat([d]).slice(-30) });
    },
    captureToHive: captureToHive, markDead: markDead, undoDead: undoDead, setTemper: setTemper, lastTemper: lastTemper, isActiveHive: isActiveHive, tasks: extraTasks
  };
  /* ================= Kovan kutusu (gövde / kat / ballık) ================= */
  function boxLabel(b) {
    if (!b) return '';
    return b.body + ' gövde' + (b.kat ? ' + ' + b.kat + ' kat' : '') + (b.ballik ? ' (ballık takılı)' : '');
  }
  /** Kovanın kutusu: kayıtlı değilse Bakım planındaki «bal katı» işaretinden tahmin. { body, kat, ballik, frames, label, known } */
  function hiveBoxes(h, plan) {
    if (h != null && typeof h !== 'object') h = hiveById(h);
    if (!h) return null;
    var b = normBoxes(h.boxes), known = !!b;
    if (!b) {
      var sup = (plan || planState()).supers, on = !!(sup && sup[String(h.id)]);
      b = { body: 1, kat: on ? 1 : 0, ballik: on };
    }
    b.frames = 10 * (b.body + b.kat); b.label = boxLabel(b); b.known = known;
    return b;
  }
  /** Kovan geçmişine olay ekle (Bakım akışı: çerçeve/kat, ana, not). { type, text, sug?, sugText? } → olay id */
  function addHiveEvent(hiveId, ev) {
    var n = Number(hiveId), list = loadHives(), id = null;
    var text = txt(ev && ev.text, 300); if (!text) return null;
    var out = list.map(function (h) {
      if (h.id !== n) return h;
      var c = cloneObj(h); id = opsId('ev');
      var e = { id: id, date: isoDate(ev.date) || todayLocal(), type: txt(ev.type, 20) || 'bakim', text: text };
      if (ev.sug) { e.sug = ev.sug; if (ev.sugText) e.sugText = ev.sugText; }
      if (workMode() === 'demo') e.demo = true;
      pushEvent(c, e);
      return normalizeHive(c);
    });
    if (!id) return null;
    saveHives(out);
    return id;
  }
  function removeHiveEvent(hiveId, evId) {
    var n = Number(hiveId), list = loadHives(), hit = false;
    var out = list.map(function (h) {
      if (h.id !== n || !Array.isArray(h.colonyEvents)) return h;
      var c = cloneObj(h), before = c.colonyEvents.length;
      c.colonyEvents = c.colonyEvents.filter(function (e) { return e && e.id !== evId; });
      if (c.colonyEvents.length !== before) { hit = true; c.colonyUpdatedAt = new Date().toISOString(); }
      return normalizeHive(c);
    });
    if (hit) saveHives(out);
    return hit;
  }
  function setHiveBoxes(hiveId, box) {
    var n = Number(hiveId), list = loadHives(), found = null;
    var bx = normBoxes(box); if (!bx) return null;
    if (!bx.date) bx.date = todayLocal();
    var out = list.map(function (h) {
      if (h.id !== n) return h;
      var c = cloneObj(h); c.boxes = bx; c.colonyUpdatedAt = new Date().toISOString();
      found = normalizeHive(c); return found;
    });
    if (!found) return null;
    saveHives(out);
    /* Bakım planındaki bal katı işareti kutu bilgisiyle uyumlu kalsın. */
    try {
      var k = workMode() === 'live' ? 'superari.bakimPlan.v1' : 'superari.bakimPlan.demo.v1';
      var ps = JSON.parse(localStorage.getItem(k) || '{}') || {};
      if (!ps.supers || typeof ps.supers !== 'object') ps.supers = {};
      var had = !!ps.supers[String(n)], want = bx.kat > 0 || bx.ballik;
      if (want && !had) ps.supers[String(n)] = bx.date;
      if (!want && had) delete ps.supers[String(n)];
      if (want !== had) localStorage.setItem(k, JSON.stringify(ps));
    } catch (e) { /* ignore */ }
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e2) { /* ignore */ }
    return found;
  }

  /* ================= Oğul verdi ================= */
  /**
   * Oğul kaydı. o: { sourceId, date, outcome: 'yakalandi' | 'kayip', target: 'yeni' | 'mevcut', targetHiveId, apiaryId, name, beeFrames, note }
   * Soy: oğulla giden ana eski anadır → yakalanıp kovanlanırsa yeni kovana yerleşir; kaynak kovan ana memesinden
   * yeni (kız) ana yetiştirir (pendingMother: origin 'ogul').
   */
  function recordSwarm(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal();
    var list = loadHives();
    var src = null; list.forEach(function (h) { if (h.id === Number(o.sourceId)) src = h; });
    if (!src) throw new Error('Kovan bulunamadı');
    var outcome = o.outcome === 'kayip' ? 'kayip' : 'yakalandi';
    var target = outcome === 'kayip' ? null : (o.target === 'mevcut' ? 'mevcut' : 'yeni');
    var queens = loadQueens();
    var q = src.currentQueenId ? queenById(src.currentQueenId, queens) : null;
    var sc = cloneObj(src), nh = null, tgt = null, aps = null, ap = null;
    if (target === 'mevcut') {
      list.forEach(function (h) { if (h.id === Number(o.targetHiveId)) tgt = h; });
      if (!tgt) throw new Error('Oğulun konduğu kovanı seçin');
      if (tgt.id === src.id) throw new Error('Kaynak kovan seçilemez');
      if (tgt.colonyState === 'birlestirildi') throw new Error('Birleştirilmiş kovan seçilemez');
      nh = cloneObj(tgt);
    } else if (target === 'yeni') {
      var apiaryId = String(o.apiaryId || src.apiaryId);
      aps = loadApiaries(); aps.forEach(function (a) { if (String(a.id) === apiaryId) ap = a; });
      if (!ap) throw new Error('Arılık bulunamadı');
      var used = {}, maxId = 0, maxAp = 0;
      list.forEach(function (h) { used[h.id] = true; maxId = Math.max(maxId, h.id); if (String(h.apiaryId) === apiaryId) maxAp = Math.max(maxAp, h.id); });
      var nid = maxAp + 1; while (used[nid]) nid = ++maxId + 1;
      nh = normalizeHive({ id: nid, name: txt(o.name, 60) || ('Kovan ' + nid), apiaryId: apiaryId, strength: 'orta', breed: (q && q.breed) || src.breed, swarmRisk: 'Düşük' });
      nh.createdBy = 'ogul'; nh.swarmFrom = src.id;
    }
    var nName = nh ? nh.name : '';
    /* Eski ana kaynaktan ayrılır. */
    if (q) {
      closePlacement(q, src.id, date, outcome === 'kayip' ? 'Oğulla gitti (kayıp)' : 'Oğulla çıktı → ' + nName);
      pushQueenHist(sc, { date: date, oldQueenId: q.id, oldYear: q.year, oldBreed: q.breed, label: 'Oğul verdi: ana oğulla ' + (outcome === 'kayip' ? 'gitti (kayıp)' : 'çıktı (' + nName + ')') });
    }
    setQueenless(sc, date);
    sc.pendingMother = { date: date, origin: 'ogul', queenId: q ? q.id : '', breed: (q && q.breed) || src.breed || '', fromHiveId: src.id };
    sc.lastSwarmDate = date;
    if (nh) {
      if (target === 'mevcut') {
        var oq = nh.currentQueenId ? queenById(nh.currentQueenId, queens) : null;
        if (oq) closePlacement(oq, nh.id, date, 'Oğul kondu, önceki ana ayrıldı');
      }
      if (q) {
        placeQueen(nh, q, date);
        pushQueenHist(nh, { date: date, newQueenId: q.id, newYear: q.year, newBreed: q.breed, label: 'Oğul kovanlandı: ana ' + src.name + ' kovanından' });
      } else { mirrorQueenToHive(nh, null); delete nh.queenless; if (src.breed) { nh.breed = src.breed; nh.breedEstimated = true; } }
      nh.swarmFrom = src.id;
    }
    var evId = opsId('ev');
    var tx = outcome === 'kayip' ? 'Oğul verdi — kaçtı (kayıp)' : 'Oğul verdi — yakalandı, ' + nName + ' kovanına konuldu';
    pushEvent(sc, { id: evId, date: date, type: 'ogul', text: tx + '; kovan yüksükten yeni ana yetiştiriyor', otherHiveId: nh ? nh.id : undefined });
    if (nh) pushEvent(nh, { id: evId, date: date, type: 'ogul', text: 'Oğul kondu (' + src.name + ' kovanından' + (q ? ', ana ' + q.id : '') + ')', otherHiveId: src.id });
    var out = list.map(function (h) { return h.id === src.id ? normalizeHive(sc) : (nh && target === 'mevcut' && h.id === nh.id ? normalizeHive(nh) : h); });
    if (target === 'yeni') {
      out.push(normalizeHive(nh));
      ap.hiveCount = out.filter(function (h) { return String(h.apiaryId) === String(ap.id); }).length;
      saveApiaries(aps);
    }
    saveQueens(queens);
    saveHives(out);
    var bees = intIn(o.beeFrames, 0, 20);
    if (nh && bees) addRecord(nh.id, 'strength', { date: date, beeFrames: bees, broodFrames: 0, honeyFrames: 0, pollenFrames: 0, note: 'Oğul kovanlandı (' + src.name + ')' + (workMode() === 'demo' ? ' · Demo' : '') });
    var ops = readOps();
    var ev = { id: evId, type: 'ogul', date: date, fromHiveId: src.id, toHiveId: nh ? nh.id : null, outcome: outcome, target: target, queenId: q ? q.id : null, note: txt(o.note, 300) };
    if (workMode() === 'demo') ev.demo = true;
    ops.events.push(ev);
    writeOps(ops);
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { eventId: evId, newHiveId: nh ? nh.id : null, newHiveName: nName, queenId: q ? q.id : null };
  }
  function swarmEvents(hiveId) {
    var n = Number(hiveId);
    return readOps().events.filter(function (e) { return e && e.type === 'ogul' && (Number(e.fromHiveId) === n || Number(e.toHiveId) === n); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  /* ================= Arılık göçü (kovan taşıma) kaydı =================
   * superari.goc.v1 (Canlı, eşitlenir) / superari.goc.demo.v1 (Demo). Kovanlar hedef arılığa geçer,
   * her kovanın geçmişine «Göç» işlemi yazılır, isteğe bağlı göç sonrası kontrol görevleri açılır. */
  var GOC_REASONS = [
    { key: 'yayla', label: 'Yayla / nektar akımı' },
    { key: 'cam', label: 'Çam balı' },
    { key: 'kislak', label: 'Kışlağa dönüş' },
    { key: 'polinasyon', label: 'Tozlaşma hizmeti' },
    { key: 'izolasyon', label: 'Hastalık / izolasyon' },
    { key: 'ilaclama', label: 'İlaçlama / zehirlenme riski' },
    { key: 'diger', label: 'Diğer' }
  ];
  function gocKey() { return workMode() === 'live' ? 'superari.goc.v1' : 'superari.goc.demo.v1'; }
  function gocRead() { try { var a = JSON.parse(localStorage.getItem(gocKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function gocWrite(a) { try { localStorage.setItem(gocKey(), JSON.stringify(a)); } catch (e) { /* ignore */ } }
  function gocReasonLabel(k) { for (var i = 0; i < GOC_REASONS.length; i++) if (GOC_REASONS[i].key === k) return GOC_REASONS[i].label; return 'Diğer'; }
  function gocList() { return gocRead().slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))); }); }
  function gocForApiary(apId) { var k = String(apId); return gocList().filter(function (g) { return String(g.fromApiaryId) === k || String(g.toApiaryId) === k; }); }
  /** Kovanın son göçü (days gün içinde) veya null */
  function gocRecentForHive(hiveId, days) {
    var lim = addDays(todayLocal(), -(days == null ? 7 : days)), n = Number(hiveId);
    return gocList().filter(function (g) { return g.date >= lim && (g.hiveIds || []).some(function (x) { return Number(x) === n; }); })[0] || null;
  }
  /** Kuş uçuşu mesafe (km, yuvarlak) — koordinatlar yoksa null */
  function gocAirKm(fromId, toId) {
    var a = null, b = null;
    loadApiaries().forEach(function (x) { if (String(x.id) === String(fromId)) a = x; if (String(x.id) === String(toId)) b = x; });
    if (!a || !b || !isFinite(Number(a.lat)) || !isFinite(Number(b.lat)) || a.lat == null || b.lat == null) return null;
    return Math.round(haversineMetres(Number(a.lat), Number(a.lon), Number(b.lat), Number(b.lon)) / 1000);
  }
  function gocAdd(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal();
    var fromId = String(o.fromApiaryId || ''), toId = String(o.toApiaryId || '');
    if (!fromId || !toId) throw new Error('Nereden ve nereye arılığını seçin');
    if (fromId === toId) throw new Error('Hedef arılık kaynakla aynı olamaz');
    var aps = loadApiaries(), from = null, to = null;
    aps.forEach(function (a) { if (String(a.id) === fromId) from = a; if (String(a.id) === toId) to = a; });
    if (!from || !to) throw new Error('Arılık bulunamadı');
    var ids = (Array.isArray(o.hiveIds) ? o.hiveIds : []).map(Number).filter(function (x) { return isFinite(x); });
    if (!ids.length) throw new Error('Taşınacak en az bir kovan seçin');
    var list = loadHives(), moved = [];
    var want = {}; ids.forEach(function (x) { want[x] = true; });
    var reason = pick(o.reason, GOC_REASONS.map(function (r) { return r.key; }), 'diger');
    var km = numIn(o.km, 0, 5000);
    var note = txt(o.note, 200);
    var id = opsId('gc');
    var evText = from.name + ' → ' + to.name + ' (' + gocReasonLabel(reason) + (km != null ? ', ' + String(km).replace('.', ',') + ' km' : '') + ')' + (note ? ' · ' + note : '');
    var out = list.map(function (h) {
      if (!want[h.id]) return h;
      if (String(h.apiaryId) !== fromId) throw new Error((h.name || ('Kovan ' + h.id)) + ' bu arılıkta değil');
      var c = cloneObj(h);
      c.apiaryId = toId;
      pushEvent(c, { id: id + '-' + h.id, date: date, type: 'goc', text: evText, gocId: id });
      moved.push(c);
      return normalizeHive(c);
    });
    if (moved.length !== ids.length) throw new Error('Seçilen kovanlardan bazıları bulunamadı');
    from.hiveCount = out.filter(function (h) { return String(h.apiaryId) === fromId; }).length;
    to.hiveCount = out.filter(function (h) { return String(h.apiaryId) === toId; }).length;
    saveApiaries(aps);
    saveHives(out);
    var refMv = moveRefs(fromId, toId, want, to.name);
    var rec = { id: id, kind: 'degistir', refLog: refMv.log, date: date, apiaryId: toId, fromApiaryId: fromId, toApiaryId: toId, fromName: from.name, toName: to.name,
      hiveIds: moved.map(function (h) { return h.id; }), hiveNames: moved.map(function (h) { return h.name || ('Kovan ' + h.id); }),
      reason: reason, km: km, note: note, createdAt: new Date().toISOString() };
    if (workMode() === 'demo') rec.demo = true;
    var all = gocRead(); all.push(rec); gocWrite(all);
    if (o.tasks !== false) {
      var tag = ' [goc:' + id + ']';
      addUserTask({ title: 'Göç sonrası: uçuş deliklerini açın, su ve dış kontrol — ' + to.name, apiaryId: toId, due: addDays(date, 1), priority: 1, note: moved.length + ' kovan taşındı' + tag });
      addUserTask({ title: 'Göç sonrası: ana, yavru ve besin kontrolü — ' + to.name, apiaryId: toId, due: addDays(date, 7), priority: 2, note: 'Taşınan kovanlar: ' + rec.hiveNames.join(', ') + tag });
    }
    return rec;
  }
  function gocKind(g) { return g && (g.kind === 'tasi' || g.kind === 'birlestir') ? g.kind : 'degistir'; }
  function gocPlaceLabel(a) { if (!a) return ''; var p = String(a.place || '').trim(); return p && p !== '—' ? p : String(a.name || ''); }
  function gocCoord(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return String(v == null ? '' : v).trim() !== '' && isFinite(n) ? n : null; }
  /**
   * Göç (Arılığı Taşı): arılık tüm kovanlarıyla yeni yere gider. Arılık kimliği/adı aynı kalır; yalnız konum değişir,
   * eski yer locHistory’e yazılır. Aynı yerde başka arılık olsa bile ASLA birleştirilmez.
   */
  function gocTasi(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal(), apId = String(o.apiaryId || '');
    var ap = apId ? apiaryById(apId) : null;
    if (!ap) throw new Error('Taşınacak arılığı seçin');
    var lat = gocCoord(o.lat), lon = gocCoord(o.lon);
    if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('Yeni yerin konumunu girin (enlem ve boylam)');
    var place = txt(o.place, 80);
    if (!place) throw new Error('Yeni yerin adını yazın');
    var oldLat = ap.lat, oldLon = ap.lon, oldPlace = gocPlaceLabel(ap);
    if (isFinite(Number(oldLat)) && oldLat != null && haversineMetres(Number(oldLat), Number(oldLon), lat, lon) <= 100) throw new Error('Yeni yer şimdiki yerle aynı (100 m’den yakın)');
    var reason = pick(o.reason, GOC_REASONS.map(function (r) { return r.key; }), 'diger');
    var km = numIn(o.km, 0, 5000);
    if (km == null && isFinite(Number(oldLat)) && oldLat != null) km = Math.round(haversineMetres(Number(oldLat), Number(oldLon), lat, lon) / 1000);
    var note = txt(o.note, 200), id = opsId('gc');
    var patch = { lat: lat, lon: lon, place: place, _gocId: id };
    if (o.il != null) patch.il = txt(o.il, 40);
    if (o.ilce != null) patch.ilce = txt(o.ilce, 40);
    if (o.il != null || o.ilce != null) patch.koy = '';
    var old = { lat: oldLat, lon: oldLon, place: ap.place, il: ap.il || '', ilce: ap.ilce || '', koy: ap.koy || '' };
    var upd = updateApiary(apId, patch);
    if (!upd) throw new Error('Arılık bulunamadı');
    var evText = oldPlace + ' → ' + place + ' (Göç' + (km != null ? ', ' + String(km).replace('.', ',') + ' km' : '') + ')' + (note ? ' · ' + note : '');
    var hs = loadHives(), moved = [];
    var out = hs.map(function (h) {
      if (String(h.apiaryId) !== apId) return h;
      var c = cloneObj(h);
      pushEvent(c, { id: id + '-' + h.id, date: date, type: 'goc', text: evText, gocId: id });
      moved.push(c);
      return normalizeHive(c);
    });
    saveHives(out);
    var rec = { id: id, kind: 'tasi', date: date, apiaryId: apId, fromApiaryId: apId, toApiaryId: apId, apiaryName: upd.name,
      fromName: oldPlace, toName: place, from: old, to: { lat: lat, lon: lon, place: place, il: upd.il || '', ilce: upd.ilce || '' },
      hiveIds: moved.map(function (h) { return h.id; }), hiveNames: moved.map(function (h) { return h.name || ('Kovan ' + h.id); }),
      reason: reason, km: km, note: note, createdAt: new Date().toISOString() };
    if (workMode() === 'demo') rec.demo = true;
    var all = gocRead(); all.push(rec); gocWrite(all);
    if (o.tasks !== false && moved.length) {
      var tag = ' [goc:' + id + ']';
      addUserTask({ title: 'Göç sonrası: uçuş deliklerini açın, su ve dış kontrol — ' + upd.name, apiaryId: apId, due: addDays(date, 1), priority: 1, note: moved.length + ' kovan taşındı' + tag });
      addUserTask({ title: 'Göç sonrası: ana, yavru ve besin kontrolü — ' + upd.name, apiaryId: apId, due: addDays(date, 7), priority: 2, note: 'Yeni yer: ' + place + tag });
    }
    return rec;
  }
  /*
   * Kovan bilgileri kovanla gider: kovan kimliği (id) aynı kalır; muayene, ana arı, hat/genetik, olaylar kovan nesnesinde;
   * fotoğraflar (IndexedDB) yalnız kovan kimliğine bağlı. Ayrıca apiaryId taşıyan ve kovana bağlı (hiveId / hiveIds) her kayıt
   * (görev, hasat, tartım, ekipman, cihaz/sensör, gider, rapor kayıtları…) hedef arılığa çevrilir; her değişiklik geri alma için kaydedilir.
   * hives = null → arılığa bağlı tüm kayıtlar (Birleştir).
   */
  var REF_SKIP = /^superari\.(ariliklar|kovanlar|goc|hava|bulut|sezon|stok\.fiyatcache|ors|sensor|sartlar|workMode|ana\.selected|breedMig|hiveType|swarmTendency|queenSeed|devices\.disabled|discovered)|Seed|[Mm]igrated|seeded|orphanPurge/;
  var REF_DEMO_ONLY = /^superari\.rapor\.(hasat|gelir|muayene|uyari\.gecmis|gorev\.gecmis)\.v1$/;
  function refKeys() {
    var out = [], live = workMode() === 'live';
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('superari.') !== 0 || REF_SKIP.test(k)) continue;
        var isDemoKey = k.indexOf('.demo.') !== -1 || k === 'superari.devices.demoUser' || REF_DEMO_ONLY.test(k);
        if (live ? !isDemoKey : isDemoKey) out.push(k);
      }
    } catch (e) { /* */ }
    return out;
  }
  function hiveLinked(v, hives) {
    if (!hives) return true;
    var h = v.hiveId != null ? v.hiveId : (v.hive_id != null ? v.hive_id : null);
    if (h != null && hives[Number(h)]) return true;
    if (Array.isArray(v.hiveIds) && v.hiveIds.length && v.hiveIds.every(function (x) { return hives[Number(x)]; })) return true;
    return false;
  }
  /** dry=true → yalnız sayar. Dönen: { n, log: [{ k, id, path, from, to, fromName, toName }] } */
  function moveRefs(srcId, tgtId, hives, tgtName, dry) {
    srcId = String(srcId); tgtId = String(tgtId);
    var src = null, n = 0, log = [];
    loadApiaries().forEach(function (a) { if (String(a.id) === srcId) src = a; });
    var srcName = src ? src.name : '';
    refKeys().forEach(function (k) {
      var raw, root; try { raw = localStorage.getItem(k); if (!raw || raw.indexOf(srcId) === -1) return; root = JSON.parse(raw); } catch (e) { return; }
      var touched = false;
      (function walk(v, path, depth) {
        if (!v || typeof v !== 'object' || depth > 4) return;
        if (!Array.isArray(v) && v.apiaryId != null && String(v.apiaryId) === srcId && hiveLinked(v, hives)) {
          n++;
          if (!dry) {
            var e = { k: k, id: v.id != null ? String(v.id) : null, path: path.slice(), from: srcId, to: tgtId };
            v.apiaryId = tgtId;
            if (v.apiaryName != null && String(v.apiaryName) === String(srcName) && tgtName) { e.fromName = v.apiaryName; v.apiaryName = tgtName; e.toName = tgtName; }
            log.push(e); touched = true;
          }
        }
        for (var key in v) if (Object.prototype.hasOwnProperty.call(v, key) && v[key] && typeof v[key] === 'object') walk(v[key], path.concat([key]), depth + 1);
      })(root, [], 0);
      if (touched) { try { localStorage.setItem(k, JSON.stringify(root)); } catch (e2) { /* */ } }
    });
    return { n: n, log: log };
  }
  function undoRefs(log) {
    var byKey = {};
    (log || []).forEach(function (e) { (byKey[e.k] = byKey[e.k] || []).push(e); });
    Object.keys(byKey).forEach(function (k) {
      var root; try { root = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return; } if (!root) return;
      var ids = {}; byKey[k].forEach(function (e) { if (e.id != null) ids[e.id] = e; });
      (function walk(v, depth) {
        if (!v || typeof v !== 'object' || depth > 4) return;
        if (!Array.isArray(v) && v.id != null && ids[String(v.id)] && String(v.apiaryId) === ids[String(v.id)].to) {
          var e = ids[String(v.id)]; v.apiaryId = e.from; if (e.fromName != null && v.apiaryName === e.toName) v.apiaryName = e.fromName; e.done = 1;
        }
        for (var key in v) if (Object.prototype.hasOwnProperty.call(v, key) && v[key] && typeof v[key] === 'object') walk(v[key], depth + 1);
      })(root, 0);
      byKey[k].forEach(function (e) {
        if (e.done || e.id != null && e.done) return;
        var v = root; for (var i = 0; i < (e.path || []).length && v; i++) v = v[e.path[i]];
        if (v && typeof v === 'object' && String(v.apiaryId) === e.to) { v.apiaryId = e.from; if (e.fromName != null && v.apiaryName === e.toName) v.apiaryName = e.fromName; }
      });
      try { localStorage.setItem(k, JSON.stringify(root)); } catch (e3) { /* */ }
    });
  }
  /** Onay özeti: kovan sayısı + kovanla gidecek ek kayıt sayısı (taşımadan) */
  function gocPreview(o) {
    o = o || {};
    var kind = o.kind || 'degistir', from = String(o.fromApiaryId || ''), ids = (o.hiveIds || []).map(Number);
    if (kind === 'tasi') return { hives: hivesForApiary(from).length, refs: 0 };
    if (kind === 'birlestir') return { hives: hivesForApiary(from).length, refs: moveRefs(from, String(o.toApiaryId || ''), null, '', true).n };
    var set = {}; ids.forEach(function (x) { set[x] = 1; });
    return { hives: ids.length, refs: moveRefs(from, String(o.toApiaryId || ''), set, '', true).n };
  }
  /**
   * Birleştir: YALNIZ kullanıcı açıkça seçerse. keepId arılığı (konumu kalan) yeni adla devam eder; mergeId arılığının
   * tüm kovanları (geçmiş, ana arı, muayene, olaylar) aktarılır, kovanlar izlenmeye devam eder; mergeId listeden kalkar.
   */
  function gocBirlestir(o) {
    o = o || {};
    var date = isoDate(o.date) || todayLocal(), keepId = String(o.keepId || ''), srcId = String(o.mergeId || '');
    if (!keepId || !srcId) throw new Error('Birleştirilecek iki arılığı seçin');
    if (keepId === srcId) throw new Error('Aynı arılık kendisiyle birleştirilemez');
    var name = txt(o.name, 80);
    if (!name) throw new Error('Birleşik arılığın adını yazın');
    var keep = apiaryById(keepId), src = apiaryById(srcId);
    if (!keep || !src) throw new Error('Arılık bulunamadı');
    var oldKeepName = keep.name, snap = cloneObj(src), note = txt(o.note, 200), id = opsId('gc');
    var evText = src.name + ' → ' + name + ' (Birleştirme)' + (note ? ' · ' + note : '');
    var hs = loadHives(), moved = [];
    var out = hs.map(function (h) {
      if (String(h.apiaryId) !== srcId) return h;
      var c = cloneObj(h);
      c.apiaryId = keepId;
      pushEvent(c, { id: id + '-' + h.id, date: date, type: 'goc', text: evText, gocId: id });
      moved.push(c);
      return normalizeHive(c);
    });
    var aps = loadApiaries();
    aps.forEach(function (a) {
      if (String(a.id) === keepId) { a.hiveCount = out.filter(function (h) { return String(h.apiaryId) === keepId; }).length; a.name = name; a.userRenamedAt = new Date().toISOString(); }
      if (String(a.id) === srcId) a.hiveCount = 0;
    });
    saveApiaries(aps);
    saveHives(out);
    var refMv = moveRefs(srcId, keepId, null, name);
    removeApiary(srcId);
    var rec = { id: id, kind: 'birlestir', date: date, apiaryId: keepId, fromApiaryId: srcId, toApiaryId: keepId, fromName: src.name, toName: name,
      keepOldName: oldKeepName, source: snap, refLog: refMv.log, hiveIds: moved.map(function (h) { return h.id; }), hiveNames: moved.map(function (h) { return h.name || ('Kovan ' + h.id); }),
      reason: 'birlestirme', km: null, note: note, createdAt: new Date().toISOString() };
    if (workMode() === 'demo') rec.demo = true;
    var all = gocRead(); all.push(rec); gocWrite(all);
    return rec;
  }
  function stripGocEvents(h, gid) {
    var c = cloneObj(h);
    c.colonyEvents = (Array.isArray(c.colonyEvents) ? c.colonyEvents : []).filter(function (e) { return !(e && e.gocId === gid); });
    return c;
  }
  /**
   * Göç kaydını siler. opts.revert: geri al — Kovan arılık değiştir: kovanlar eski arılığa döner; Göç (Arılığı Taşı): arılık eski konuma döner;
   * Birleştir: ayrılan arılık geri gelir, kovanları ona döner, kalan arılığın eski adı geri yazılır. Kovan olaylarından bu kayıt silinir.
   */
  function gocRemove(id, opts) {
    var a = gocRead(), g = null;
    a.forEach(function (x) { if (x && x.id === id) g = x; });
    if (!g) return false;
    if (opts && opts.revert) {
      var k = gocKind(g), ids = {}; (g.hiveIds || []).forEach(function (x) { ids[Number(x)] = 1; });
      var cur = loadApiaries(), hs0 = loadHives(), restoreSrc = null;
      if (k === 'birlestir' && g.source && g.source.id && !cur.some(function (x) { return String(x.id) === String(g.source.id); })) restoreSrc = cloneObj(g.source);
      var fromOk = !!restoreSrc || cur.some(function (x) { return String(x.id) === String(g.fromApiaryId); });
      var hs = hs0.map(function (h) {
        if (!ids[Number(h.id)]) return h;
        var c = stripGocEvents(h, g.id);
        if (k !== 'tasi' && fromOk && String(c.apiaryId) === String(g.toApiaryId)) c.apiaryId = String(g.fromApiaryId);
        return normalizeHive(c);
      });
      if (restoreSrc) cur.push(restoreSrc);
      cur.forEach(function (x) { x.hiveCount = hs.filter(function (h) { return String(h.apiaryId) === String(x.id); }).length; if (k === 'birlestir' && String(x.id) === String(g.toApiaryId) && g.keepOldName) x.name = g.keepOldName; });
      /* Kovanlar ve arılık aynı anda yazılır (arada okuma yok): örnek arılık yeni kovanlarla yeniden doğmaz. */
      saveHives(hs); saveApiaries(cur);
      if (g.refLog && g.refLog.length) undoRefs(g.refLog);
      if (restoreSrc) { try { var m = readDeletedSeedIds(); if (m[String(restoreSrc.id)]) { delete m[String(restoreSrc.id)]; localStorage.setItem(mk(DELETED_SEEDS_KEY), JSON.stringify(Object.keys(m))); } } catch (eS) { /* */ } }
      if (k === 'tasi' && g.from && g.from.lat != null) {
        var ap = apiaryById(g.apiaryId);
        if (ap && g.to && Math.abs(Number(ap.lat) - Number(g.to.lat)) < 1e-6 && Math.abs(Number(ap.lon) - Number(g.to.lon)) < 1e-6) {
          updateApiary(g.apiaryId, { lat: g.from.lat, lon: g.from.lon, place: g.from.place || ap.place, il: g.from.il || '', ilce: g.from.ilce || '', koy: g.from.koy || '', _noHistory: true });
          var aps2 = loadApiaries();
          aps2.forEach(function (x) { if (String(x.id) === String(g.apiaryId) && Array.isArray(x.locHistory)) x.locHistory = x.locHistory.filter(function (e) { return e.gocId !== g.id; }); });
          saveApiaries(aps2);
        }
      }
    }
    var n = a.filter(function (x) { return x && x.id !== id; });
    gocWrite(n);
    return true;
  }
  /** Arılığın konum geçmişi (eskiden yeniye) + şimdiki yer */
  function gocLocHistory(apId) { var ap = apiaryById(apId); return ap && Array.isArray(ap.locHistory) ? ap.locHistory.slice() : []; }
  /** Kovanın taşınma geçmişi (eskiden yeniye): [{ date, fromApiaryId, toApiaryId, fromName, toName, gocId }] — göç kaydı silinse de kovan olayından ad okunur */
  function gocMovesForHive(hiveId) {
    var n = Number(hiveId), out = [], seen = {};
    gocList().forEach(function (g) {
      if (!(g.hiveIds || []).some(function (x) { return Number(x) === n; })) return;
      seen[g.id] = 1;
      out.push({ date: g.date, fromApiaryId: String(g.fromApiaryId), toApiaryId: String(g.toApiaryId), fromName: apiaryNameOf(g.fromApiaryId) || g.fromName || '', toName: apiaryNameOf(g.toApiaryId) || g.toName || '', gocId: g.id });
    });
    var h = hiveById(n);
    ((h && h.colonyEvents) || []).forEach(function (e) {
      if (!e || e.type !== 'goc' || (e.gocId && seen[e.gocId])) return;
      var m = /^(.+?) → (.+?) \(/.exec(String(e.text || '')); if (!m) return;
      if (out.some(function (o) { return o.date === e.date && (o.fromName === m[1] || o.toName === m[2]); }) || (e.id && seen[String(e.id).replace(/-\d+$/, '')])) return;
      out.push({ date: e.date, fromApiaryId: '', toApiaryId: '', fromName: m[1], toName: m[2], gocId: e.gocId || '' });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }
  /** Kovanın verilen tarihteki arılığı (göç geçmişine göre; bilinmiyorsa bugünkü) */
  function gocApiaryAt(hiveId, date) {
    var h = hiveById(hiveId), ap = h ? String(h.apiaryId) : '', ms = gocMovesForHive(hiveId), d = String(date || '').slice(0, 10);
    for (var i = ms.length - 1; i >= 0; i--) { if (ms[i].date > d && ms[i].fromApiaryId) ap = ms[i].fromApiaryId; else break; }
    return ap;
  }
  var gocStore = { REASONS: GOC_REASONS, reasonLabel: gocReasonLabel, list: gocList, forApiary: gocForApiary, recentForHive: gocRecentForHive, movesForHive: gocMovesForHive, apiaryAt: gocApiaryAt, airKm: gocAirKm, add: gocAdd, remove: gocRemove, tasi: gocTasi, birlestir: gocBirlestir, preview: gocPreview, kind: gocKind, locHistory: gocLocHistory };

  var colonyOps = {
    GRAFT_TIMELINE: GRAFT_TIMELINE,
    recordSwarm: recordSwarm,
    swarmEvents: swarmEvents,
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
    { key: 'ekipman', label: 'Ekipman' }, { key: 'anaari', label: 'Ana arı' }, { key: 'ariKoloni', label: 'Arı / koloni' }
  ];
  var STOCK_UNITS = ['L', 'kg', 'adet', 'şerit', 'ml', 'g', 'paket', 'kutu'];
  var STOCK_CAT_LABEL = { diger: 'Diğer' }; STOCK_CATS.forEach(function (c) { STOCK_CAT_LABEL[c.key] = c.label; });
  /* Kullanıcı kategorileri (koloni-75): { id, label, at } — id 'u…' (eski «Diğer» kalemleri için 'diger').
   * superari.stok.kategoriler.v1 (canlı, bulut.js ile eşitlenir) / .demo.v1. Yeniden adlandırma / silme yalnız boşken. */
  var SCAT_LIVE = 'superari.stok.kategoriler.v1', SCAT_DEMO = 'superari.stok.kategoriler.demo.v1';
  function isBuiltinCat(k) { return Object.prototype.hasOwnProperty.call(STOCK_CAT_LABEL, k) && k !== 'diger'; }
  function isCustomCatKey(k) { return k === 'diger' || /^u[a-z0-9]{3,24}$/.test(String(k || '')); }
  function scatKey() { return workMode() === 'live' ? SCAT_LIVE : SCAT_DEMO; }
  function readScat() { try { var a = JSON.parse(localStorage.getItem(scatKey()) || '[]'); return Array.isArray(a) ? a.filter(function (c) { return c && isCustomCatKey(c.id); }) : []; } catch (e) { return []; } }
  function writeScat(a) { try { localStorage.setItem(scatKey(), JSON.stringify(a || [])); } catch (e) { /* ignore */ } }
  function trKey(s) { return String(s || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' '); }
  /** Kullanıcı kategorileri; kategorisi listede olmayan kalem varsa (eski «Diğer», başka cihazdan gelen) kendiliğinden eklenir — kalem kaybolmaz. */
  function customCats() {
    var a = readScat(), have = {}, ch = false;
    a.forEach(function (c) { have[c.id] = 1; });
    readStock().forEach(function (x) {
      if (!x) return;
      var k = x.category && (isBuiltinCat(x.category) || isCustomCatKey(x.category)) ? x.category : 'diger';
      if (isBuiltinCat(k) || have[k]) return;
      have[k] = 1; ch = true;
      a.push({ id: k, label: k === 'diger' ? 'Diğer' : (txt(x.catLabel, 30) || 'Kategori'), at: new Date().toISOString() });
    });
    if (ch) writeScat(a);
    return a.map(function (c) { return { id: c.id, key: c.id, label: txt(c.label, 30) || 'Kategori', custom: true }; });
  }
  function catLabel(k) { if (isBuiltinCat(k)) return STOCK_CAT_LABEL[k]; var c = readScat().filter(function (x) { return x.id === k; })[0]; return c ? (txt(c.label, 30) || 'Kategori') : (k === 'diger' ? 'Diğer' : 'Kategori'); }
  function labelTaken(label, except) {
    var t = trKey(label);
    return STOCK_CATS.some(function (c) { return trKey(c.label) === t; }) || readScat().some(function (c) { return c.id !== except && trKey(c.label) === t; });
  }
  function catCount(id) { return readStock().filter(function (x) { return x && x.category === id; }).length; }
  /** Yeni kategori: { ok, id, label } | { ok:false, error } — aynı ad varsa o kategori döner. */
  function addCat(label) {
    var l = txt(label, 30); if (!l) return { ok: false, error: 'Kategori adı girin.' };
    var t = trKey(l), b = STOCK_CATS.filter(function (c) { return trKey(c.label) === t; })[0];
    if (b) return { ok: true, id: b.key, label: b.label, existing: true };
    var ex = readScat().filter(function (c) { return trKey(c.label) === t; })[0];
    if (ex) return { ok: true, id: ex.id, label: ex.label, existing: true };
    var c = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: l, at: new Date().toISOString() };
    if (workMode() !== 'live') c.demo = true;
    var a = readScat(); a.push(c); writeScat(a);
    return { ok: true, id: c.id, label: c.label };
  }
  function renameCat(id, label) {
    var l = txt(label, 30); if (!l) return { ok: false, error: 'Kategori adı girin.' };
    if (!isCustomCatKey(id) || !readScat().some(function (c) { return c.id === id; })) return { ok: false, error: 'Kategori bulunamadı.' };
    if (catCount(id)) return { ok: false, error: 'Kategoride kalem var; yalnız boş kategori yeniden adlandırılabilir.' };
    if (labelTaken(l, id)) return { ok: false, error: 'Bu adda bir kategori zaten var.' };
    writeScat(readScat().map(function (c) { return c.id === id ? Object.assign({}, c, { label: l }) : c; }));
    return { ok: true, id: id, label: l };
  }
  function removeCat(id) {
    if (!isCustomCatKey(id)) return { ok: false, error: 'Bu kategori silinemez.' };
    if (catCount(id)) return { ok: false, error: 'Kategoride kalem var; yalnız boş kategori silinebilir.' };
    var a = readScat(), n = a.filter(function (c) { return c.id !== id; });
    writeScat(n); return { ok: n.length !== a.length };
  }
  function stockKey() { return workMode() === 'live' ? STOCK_LIVE : STOCK_DEMO; }
  function normalizeStock(it) {
    if (!it || !it.id) return null;
    var o = { id: String(it.id).slice(0, 40), name: txt(it.name, 80) || 'Kalem' };
    o.category = it.category && (isBuiltinCat(it.category) || isCustomCatKey(it.category)) ? String(it.category) : 'diger';
    if (!isBuiltinCat(o.category)) { var cl = txt(it.catLabel, 30); if (cl) o.catLabel = cl; } /* başka cihazda kategori adı (bulutla gelen kalem) */
    o.unit = pick(it.unit, STOCK_UNITS, 'adet');
    var q = numIn(it.qty, -100000, 1000000); o.qty = q == null ? 0 : q;
    var th = numIn(it.threshold, 0, 1000000); o.threshold = th == null ? 0 : th;
    if (it.feedType && FEED_LABEL[it.feedType]) o.feedType = it.feedType;
    if (o.category === 'ilac') { var skt = isoDate(it.skt); if (skt) o.skt = skt; var opd = isoDate(it.opened); if (opd) o.opened = opd; } /* son kullanma / açılma tarihi (isteğe bağlı, yalnız ilaç) */
    var note = txt(it.note, 200); if (note) o.note = note;
    if (it.demo === true) o.demo = true;
    o.log = (Array.isArray(it.log) ? it.log : []).filter(Boolean).slice(-40).map(function (l) {
      var r = { date: isoDate(l.date) || todayLocal(), delta: Number(l.delta) || 0, reason: txt(l.reason, 160) };
      if (typeof l.at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(l.at)) r.at = l.at.slice(0, 30); /* kayıt saati: aynı gün sıralaması */
      return r;
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
    ['name', 'category', 'unit', 'threshold', 'feedType', 'note', 'skt', 'opened'].forEach(function (k) { if (Object.prototype.hasOwnProperty.call(it, k)) m[k] = it[k]; });
    if (!m.skt) delete m.skt;
    if (!m.opened) delete m.opened;
    if (m.category && !isBuiltinCat(m.category)) m.catLabel = catLabel(m.category); else delete m.catLabel;
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
      m.log = (Array.isArray(m.log) ? m.log : []).concat([{ date: isoDate(date) || todayLocal(), delta: d, reason: txt(reason, 160) || (d > 0 ? 'Giriş' : 'Kullanım'), at: new Date().toISOString() }]);
      out = normalizeStock(m);
      return out;
    });
    if (out) writeStock(a);
    return out;
  }
  /** Belirli bir stok hareketini geri al: pred'e uyan son kayıt silinir, miktar o kadar düzeltilir (ör. iptal edilen talebin girişi). */
  function unlogStock(id, pred) {
    var a = readStock(), out = null;
    a = a.map(function (x) {
      if (out || !x || x.id !== id || !Array.isArray(x.log)) return x;
      for (var i = x.log.length - 1; i >= 0; i--) {
        if (!x.log[i] || !pred(x.log[i])) continue;
        var m = cloneObj(x), e = m.log.splice(i, 1)[0];
        m.qty = Math.max(0, Math.round(((Number(m.qty) || 0) - (Number(e.delta) || 0)) * 10) / 10);
        var n = normalizeStock(m); out = { item: n, entry: e }; return n;
      }
      return x;
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
    cats: customCats, catLabel: catLabel, addCat: addCat, renameCat: renameCat, removeCat: removeCat, catCount: catCount, isBuiltinCat: isBuiltinCat,
    list: listStock, save: saveStockItem, adjust: adjustStock, unlog: unlogStock, remove: removeStock, alerts: stockAlerts
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
        priority: queenPlan(h).tone === 'red' ? 2 : 3, auto: true, kind: 'ana', sig: 'q' + h.queenYear });
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
        out.push({ id: 'kr-ogul-izle-' + h.id, title: 'Oğul izleme — ' + h.name + ': yüksük ve yer darlığı kontrolü (7–10 günde bir)', hiveId: h.id, apiaryId: h.apiaryId,
          priority: 2, auto: true, kind: 'ogul', due: addDays(ctx.date, 7), sig: 'o-orta-' + ctx.date.slice(0, 4) });
      } else if (orsYuksek(a.key)) {
        out.push({ id: 'kr-ogul-kontrol-' + h.id, title: 'Oğul kontrolü — ' + h.name + ': yüksükleri kontrol et, yer aç / bal katı ver veya böl', hiveId: h.id, apiaryId: h.apiaryId,
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
    try { list = list.concat(extraTasks()); } catch (e) { /* ignore */ }
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
      get STORAGE_KEY() { return mk(STORAGE_KEY); },
      get HIVES_KEY() { return mk(HIVES_KEY); },
      SEED_APIARIES: SEED_APIARIES,
      renumberHivesK279: renumberHivesK279,
      renumBuildMap: renumBuildMap,
      get apiaries() { return loadApiaries(); },
      get hives() { return loadHives(); },
      /* Statik demo + koloni kayıtlarından türetilen otomatik uyarı/görevler. */
      get alerts() {
        var extra = [];
        try { extra = colonyRecords.derived().alerts; } catch (e) { extra = []; }
        try { extra = extra.concat(stockAlerts()); } catch (e) { /* ignore */ }
        /* Ana arı yaşı (ırka göre değişim zamanı). Demo modda Demo etiketi. */
        try { extra = extra.concat(queenAlerts().map(function (x) { if (workMode() === 'demo') x.demo = true; return x; })); } catch (e) { /* ignore */ }
        /* Oğul uyarıları statik değil; hesaplanan oğul riskinden (Yüksek / Çok yüksek). */
        try { extra = extra.concat(swarmAlerts().map(function (x) { if (workMode() === 'demo') x.demo = true; return x; })); } catch (e) { /* ignore */ }
        /* Muayeneden otomatik çıkan ihtiyaç / bulgular: açık görev durdukça uyarı olarak da görünür (aynı kovan + tür uyarısı varsa tekrar edilmez). İlaç uygulanmış sayılmaz. */
        try {
          var OTO_TYPE = { besleme: 'besleme', kislik: 'besleme', varroa: 'hastalik', ilac: 'hastalik', hastalik: 'hastalik', olu: 'hastalik', ana: 'ana', meme: 'ana', anayas: 'ana', ogul: 'ogul', yagma: 'bakim', zayif: 'bakim', yer: 'bakim', guve: 'bakim' };
          var seen = {}; extra.forEach(function (x) { if (x && x.hiveId != null) seen[String(x.hiveId) + '|' + x.type] = true; });
          openTasks().forEach(function (t) {
            var m = /\[muayene-oto:([a-z]+)\]/.exec(String(t.note || ''));
            if (!m) return;
            var ty = OTO_TYPE[m[1]] || 'bakim';
            if ((ty === 'ogul' || ty === 'ana') && seen[String(t.hiveId) + '|' + ty]) return; /* hesaplanan oğul riski / anasız / ana yaşı uyarısı zaten var */
            var hi = t.priority === 1 && (m[1] === 'ana' || m[1] === 'hastalik');
            var a = { id: 'oto-' + m[1] + '-' + t.id, title: t.title, type: ty, severity: hi ? 'high' : (t.priority === 1 ? 'medium' : 'low'),
              hiveId: t.hiveId, apiaryId: t.apiaryId, date: String(t.createdAt || '').slice(0, 10), auto: true, source: 'muayene', taskId: t.id, text: 'Muayeneden otomatik · Görevler’de' };
            if (workMode() === 'demo') a.demo = true;
            extra.push(a);
          });
        } catch (e) { /* ignore */ }
        var base = workMode() === 'demo' ? alerts.filter(function (x) { return x.type !== 'ogul'; }).map(function (x) { var c = {}; Object.keys(x).forEach(function (k) { c[k] = x[k]; }); c.demo = true; return c; }) : [];
        return base.concat(extra);
      },
      /* Açık görevler (tamamlananlar hariç). Statik örnek görevler yalnız demo modda, demo=true. */
      get tasks() {
        try { return openTasks(); } catch (e) { return workMode() === 'demo' ? tasks.slice() : []; }
      },
      taskStore: taskStore,
      colonyOps: colonyOps,
      colonyExtra: colonyExtra,
      goc: gocStore,
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
        BREED_OPTIONS: COLONY_BREED_OPTIONS, BREED_GROUPS: COLONY_BREED_GROUPS, breedOptionsHtml: breedOptionsHtml,
        PURE_BREEDS: PURE_BREEDS,
        breedKind: breedKind,
        joinBreed: joinBreed,
        lineageText: lineageText, normalizeQueenCert: normalizeQueenCert, queenCertText: queenCertText,
        SWARM_TENDENCIES: SWARM_TENDENCIES,
        CALM_LABELS: CALM_LABELS,
        queenAge: queenAge,
        queenColor: queenColor,
        queenStatus: queenStatus,
        queenPlan: queenPlan,
        queenProfile: queenProfile,
        queenAlerts: queenAlerts,
        QUEEN_SEASON_NOTE: QUEEN_SEASON_NOTE,
        calmLabel: calmLabel,
        summary: colonySummary,
        summaryText: colonySummaryText,
        updateHive: updateHiveColony,
        bulkQueenReplace: bulkQueenReplace,
        setQueenClipped: setQueenClipped,
        setBreedEstimate: setBreedEstimate,
        breedLabel: breedLabel,
        lineage: queenLineage,
        setQueenLineage: setQueenLineage,
        apiaryMajorityBreed: apiaryMajorityBreed,
        QUEEN_ORIGIN_LABEL: QUEEN_ORIGIN_LABEL,
        loadQueens: loadQueens,
        queenById: function (id) { return queenById(id); },
        openPlacement: openPlacement,
        queensForHives: queensForHives,
        get QUEENS_KEY() { return mk(QUEENS_KEY); },
        currentYear: currentYear,
        todayLocal: todayLocal,
        SWARM_LEVELS: SWARM_LEVELS, KovanBildirimSablonlari: KovanBildirimSablonlari, varroaHatirlatma: varroaHatirlatma, haftalikHatirlatma: haftalikHatirlatma, saglikHatirlatmalari: saglikHatirlatmalari, genelAgirlikKaybi: genelAgirlikKaybi, KURALLAR: KURALLAR, esekMikDurum: esekMikDurum, esekYolDurum: esekYolDurum, kuralYeni5: kuralYeni5, kuralIr5: kuralIr5, titresimYeni4: titresimYeni4, titresimKis: titresimKis, titresimDurum: titresimDurum, girisSayacDurum: girisSayacDurum, girisSicakDurum: girisSicakDurum, hiveCihazTipDurum: hiveCihazTipDurum, sensorCihazMetin: sensorCihazMetin, kuralAcik: kuralAcik, kuralKullaniciAyarla: kuralKullaniciAyarla, yeniKurallar: yeniKurallar, cihazSaglik: cihazSaglik, GENETIK_SAF: GENETIK_SAF, GENETIK_MELEZ: GENETIK_MELEZ, IRK_PUANSIZ: IRK_PUANSIZ, irkPuansiz: irkPuansiz, genetikScore: genetikScore, CROSS_YON: CROSS_YON, melezYonDefaults: melezYonDefaults, melezYonMerge: melezYonMerge, melezYonVarsayilanGenetik: melezYonVarsayilanGenetik, orsCompute: orsCompute, sensorOkumalar: sensorOkumalar, okumaGonder: okumaGonder, gunlukOzetHesapla: gunlukOzetHesapla, tabanDurum: tabanDurum, hiveSens: hiveSens, ORS_WEIGHTS: ORS_WEIGHTS, GENETIK_ADLAR: GENETIK_ADLAR, ogulSkor: function () { return OGUL_SKOR; }, ogulSkorDefaults: ogulSkorDefaults, ORS_SENSOR: ORS_SENSOR, autoSwarmWindow: function (apId) { var k = seasonProfileKey(apId), w = SWARM_WINDOWS[k]; return { profile: k, label: PROFILE_SHORT[k], from: w.from, to: w.to }; }, customPeriod: customPeriod, ORS_SENSOR_ADLAR: ORS_SENSOR_ADLAR, sensorOrs: sensorOrs, sensorGiris: sensorGiris, sikisiklikOnbellek: function (id) { return SIK_CACHE[Number(id)] || null; }, SES_SINIFLARI: SES_SINIFLARI, ogulSkorMerge: ogulSkorMerge, nemSiraGecerli: nemSiraGecerli, nemDurum: function (rh, T) { return nemDurum(rh, T); }, ogulSkorSet: ogulSkorSet, ucusEsik: ucusEsik, ucusSezon: ucusSezon, camBaliBolge: camBaliBolge, mdNum: mdNum, ucusGruplari: ucusGruplari, apiaryBreed: apiaryBreed, ogulSkorSync: ogulSkorSync,
        swarm: function (h, c) { return swarmAssess(h, c ? (typeof c === 'string' ? { date: c } : c) : null); },
        swarmLevelOf: swarmLevelOf,
        boxes: function (h) { return hiveBoxes(h); },
        setBoxes: setHiveBoxes,
        addEvent: addHiveEvent,
        removeEvent: removeHiveEvent,
        boxLabel: boxLabel,
        recordSwarm: function (o) { return recordSwarm(o); },
        swarmEvents: swarmEvents,
        swarmSeason: function (apId, date) { return swarmSeason(apId, date); }, swarmBucket: swarmBucket,
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
      serverWaterM: serverWaterM,
      applyServerWater: applyServerWater,
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
