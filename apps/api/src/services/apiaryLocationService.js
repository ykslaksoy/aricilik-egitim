/**
 * Konum çözümü — öncelik zinciri:
 * 1) Kovanın kendi GPS'i
 * 2) Gruptaki GPS'li kovan (grup mirası)
 * 3) Arılık merkezi GPS
 * 4) Manuel lat/lon (zorunlu fallback)
 * Taşınma: "taşınıyor" + güzergah — GPS yokken de sistem çalışır.
 */

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** @type {Map<string, object>} */
const apiaries = new Map();
/** @type {Map<string, object>} */
const groups = new Map();
/** @type {Map<number, object>} */
const hiveGps = new Map();

function seedDefaults(locations = []) {
  for (const loc of locations) {
    if (apiaries.has(loc.id)) continue;
    apiaries.set(loc.id, {
      id: loc.id,
      etiket: loc.etiket,
      tip: loc.tip || "ev",
      lat: loc.lat,
      lon: loc.lon,
      gpsModulePresent: false,
      gpsLat: null,
      gpsLon: null,
      gpsUpdatedAt: null,
      manualLat: loc.lat,
      manualLon: loc.lon,
      durum: "sabit",
      guzergah: null,
      tasima: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Demo grupları — bir kovanda GPS, diğerleri miras */
function seedDemoGroups(hiveIdsByApiary = {}) {
  const ensure = (g) => {
    if (groups.has(g.id)) return;
    groups.set(g.id, {
      ...g,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const evHives = hiveIdsByApiary.ev || [1, 2, 5];
  const tortum = hiveIdsByApiary["yayla-tortum"] || [3, 13, 14];
  const yayla2 = hiveIdsByApiary["yayla-2"] || [4, 15];

  ensure({
    id: "grp-ev-a",
    etiket: "Ev grup A",
    apiaryId: "ev",
    hiveIds: evHives.slice(0, 3),
    gpsAnchorHiveId: evHives[0] || 1,
    durum: "sabit",
    guzergah: null,
    tasima: null,
  });
  ensure({
    id: "grp-tortum",
    etiket: "Tortum grup",
    apiaryId: "yayla-tortum",
    hiveIds: tortum.slice(0, 3),
    gpsAnchorHiveId: tortum[0] || null,
    durum: "sabit",
    guzergah: null,
    tasima: null,
  });
  ensure({
    id: "grp-yayla2",
    etiket: "Yayla 2 grup",
    apiaryId: "yayla-2",
    hiveIds: yayla2.slice(0, 2),
    gpsAnchorHiveId: null,
    durum: "sabit",
    guzergah: null,
    tasima: null,
  });

  // Ev grup A — lider kovanda GPS
  const anchor = evHives[0] || 1;
  if (!hiveGps.has(anchor)) {
    ingestHiveGps(anchor, {
      lat: 39.9205,
      lon: 41.2705,
      gpsModulePresent: true,
    });
  }
}

function resolveCoords(apiary) {
  if (!apiary) return { lat: null, lon: null, kaynak: "yok", gpsModulePresent: false };
  if (apiary.gpsModulePresent && apiary.gpsLat != null && apiary.gpsLon != null) {
    return {
      lat: apiary.gpsLat,
      lon: apiary.gpsLon,
      kaynak: "apiary_gps",
      gpsModulePresent: true,
    };
  }
  if (apiary.manualLat != null && apiary.manualLon != null) {
    return {
      lat: apiary.manualLat,
      lon: apiary.manualLon,
      kaynak: "manuel",
      gpsModulePresent: Boolean(apiary.gpsModulePresent),
    };
  }
  if (apiary.lat != null && apiary.lon != null) {
    return {
      lat: apiary.lat,
      lon: apiary.lon,
      kaynak: "manuel",
      gpsModulePresent: Boolean(apiary.gpsModulePresent),
    };
  }
  return { lat: null, lon: null, kaynak: "yok", gpsModulePresent: false };
}

function enrich(apiary) {
  if (!apiary) return null;
  const coords = resolveCoords(apiary);
  return {
    ...apiary,
    lat: coords.lat,
    lon: coords.lon,
    konumKaynak: coords.kaynak,
    gpsModulePresent: coords.gpsModulePresent,
    calisirGpsYokken: true,
  };
}

function listApiaries() {
  return [...apiaries.values()].map(enrich).sort((a, b) => a.etiket.localeCompare(b.etiket, "tr"));
}

function getApiary(id) {
  return enrich(apiaries.get(id) || null);
}

function upsertApiary(body = {}) {
  const id =
    body.id ||
    String(body.etiket || "arilik")
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/gi, "-")
      .replace(/^-|-$/g, "") ||
    `arilik-${Date.now()}`;
  const prev = apiaries.get(id) || {};
  const next = {
    ...prev,
    id,
    etiket: body.etiket || prev.etiket || id,
    tip: body.tip || prev.tip || "yayla",
    gpsModulePresent:
      body.gpsModulePresent != null ? Boolean(body.gpsModulePresent) : prev.gpsModulePresent || false,
    gpsLat: body.gpsLat != null ? Number(body.gpsLat) : prev.gpsLat ?? null,
    gpsLon: body.gpsLon != null ? Number(body.gpsLon) : prev.gpsLon ?? null,
    gpsUpdatedAt:
      body.gpsLat != null || body.gpsLon != null
        ? new Date().toISOString()
        : prev.gpsUpdatedAt || null,
    manualLat:
      body.manualLat != null
        ? Number(body.manualLat)
        : body.lat != null && !body.gpsModulePresent
          ? Number(body.lat)
          : prev.manualLat ?? prev.lat ?? null,
    manualLon:
      body.manualLon != null
        ? Number(body.manualLon)
        : body.lon != null && !body.gpsModulePresent
          ? Number(body.lon)
          : prev.manualLon ?? prev.lon ?? null,
    durum: body.durum || prev.durum || "sabit",
    guzergah: body.guzergah !== undefined ? body.guzergah : prev.guzergah || null,
    tasima: body.tasima !== undefined ? body.tasima : prev.tasima || null,
    createdAt: prev.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (next.gpsModulePresent && next.gpsLat != null) {
    next.lat = next.gpsLat;
    next.lon = next.gpsLon;
  } else {
    next.lat = next.manualLat;
    next.lon = next.manualLon;
  }
  apiaries.set(id, next);
  return enrich(next);
}

function ingestApiaryGps(apiaryId, { lat, lon, ts } = {}) {
  const prev = apiaries.get(apiaryId);
  if (!prev) return { error: "apiary_not_found" };
  if (lat == null || lon == null) return { error: "lat_lon_required" };
  const next = {
    ...prev,
    gpsModulePresent: true,
    gpsLat: Number(lat),
    gpsLon: Number(lon),
    gpsUpdatedAt: ts || new Date().toISOString(),
    lat: Number(lat),
    lon: Number(lon),
    updatedAt: new Date().toISOString(),
  };
  if (prev.durum === "tasiniyor" && prev.tasima) {
    const hedef = prev.tasima.hedef;
    if (hedef?.lat != null && hedef?.lon != null) {
      const kalanM = haversineM(next.gpsLat, next.gpsLon, hedef.lat, hedef.lon);
      next.tasima = {
        ...prev.tasima,
        anlikLat: next.gpsLat,
        anlikLon: next.gpsLon,
        kalanM,
        sonGpsAt: next.gpsUpdatedAt,
      };
      if (kalanM <= 150) {
        next.durum = "sabit";
        next.manualLat = next.gpsLat;
        next.manualLon = next.gpsLon;
        next.guzergah = null;
        next.tasima = {
          ...next.tasima,
          tamamlandiAt: next.gpsUpdatedAt,
          durum: "ulasti",
        };
      }
    }
  }
  apiaries.set(apiaryId, next);
  return { ok: true, apiary: enrich(next) };
}

function parseGuzergah(body, fromEtiket, hedefEtiket) {
  const routeRaw = body.guzergah ?? body.routeLabel ?? null;
  if (Array.isArray(routeRaw)) return routeRaw.map(String);
  if (routeRaw) {
    return String(routeRaw)
      .split(/[→>,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [fromEtiket, hedefEtiket || "Hedef"].filter(Boolean);
}

function startTransport(apiaryId, body = {}) {
  const prev = apiaries.get(apiaryId);
  if (!prev) return { error: "apiary_not_found" };
  const from = resolveCoords(prev);
  let hedefLat = body.hedefLat != null ? Number(body.hedefLat) : null;
  let hedefLon = body.hedefLon != null ? Number(body.hedefLon) : null;
  let hedefEtiket = body.hedefEtiket || null;
  let hedefKonumId = body.hedefKonumId || null;

  if (hedefKonumId && apiaries.has(hedefKonumId)) {
    const hedef = enrich(apiaries.get(hedefKonumId));
    hedefLat = hedef.lat;
    hedefLon = hedef.lon;
    hedefEtiket = hedef.etiket;
  }

  const guzergahList = parseGuzergah(body, prev.etiket, hedefEtiket);
  const mesafeM =
    from.lat != null && hedefLat != null
      ? haversineM(from.lat, from.lon, hedefLat, hedefLon)
      : null;

  const next = {
    ...prev,
    durum: "tasiniyor",
    guzergah: guzergahList,
    tasima: {
      basladiAt: new Date().toISOString(),
      kaynak: { id: prev.id, etiket: prev.etiket, lat: from.lat, lon: from.lon, konumKaynak: from.kaynak },
      hedef: {
        konumId: hedefKonumId,
        etiket: hedefEtiket || "Hedef",
        lat: hedefLat,
        lon: hedefLon,
      },
      guzergah: guzergahList,
      mesafeM,
      gpsIleTakip: Boolean(prev.gpsModulePresent),
      hiveIds: Array.isArray(body.hiveIds) ? body.hiveIds.map(Number) : [],
      durum: "tasiniyor",
      not: body.not || null,
    },
    updatedAt: new Date().toISOString(),
  };
  apiaries.set(apiaryId, next);
  return { ok: true, apiary: enrich(next) };
}

function completeTransport(apiaryId, body = {}) {
  const prev = apiaries.get(apiaryId);
  if (!prev) return { error: "apiary_not_found" };
  const hedef = prev.tasima?.hedef || {};
  const lat = body.lat != null ? Number(body.lat) : hedef.lat ?? prev.lat;
  const lon = body.lon != null ? Number(body.lon) : hedef.lon ?? prev.lon;
  const next = {
    ...prev,
    durum: "sabit",
    manualLat: lat,
    manualLon: lon,
    lat,
    lon,
    guzergah: null,
    tasima: prev.tasima
      ? {
          ...prev.tasima,
          tamamlandiAt: new Date().toISOString(),
          durum: "ulasti",
          anlikLat: lat,
          anlikLon: lon,
          kalanM: 0,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };
  if (hedef.etiket && body.hedefEtiketiGuncelle !== false) {
    next.etiket = body.etiket || hedef.etiket || next.etiket;
  }
  apiaries.set(apiaryId, next);
  return { ok: true, apiary: enrich(next) };
}

/* ─── Gruplar ─────────────────────────────────────────────────────────── */

function enrichGroup(g) {
  if (!g) return null;
  const anchor = g.gpsAnchorHiveId != null ? getHiveGps(Number(g.gpsAnchorHiveId)) : null;
  const memberGps = (g.hiveIds || [])
    .map((id) => getHiveGps(Number(id)))
    .filter((h) => h?.gpsModulePresent && h.gpsLat != null);
  const active = anchor?.gpsModulePresent && anchor.gpsLat != null ? anchor : memberGps[0] || null;
  return {
    ...g,
    gpsModulePresent: Boolean(active),
    gpsHiveId: active?.hiveId ?? null,
    lat: active?.gpsLat ?? null,
    lon: active?.gpsLon ?? null,
    konumKaynak: active ? "group_gps" : "yok",
    uyeSayisi: (g.hiveIds || []).length,
  };
}

function listGroups() {
  return [...groups.values()].map(enrichGroup).sort((a, b) => a.etiket.localeCompare(b.etiket, "tr"));
}

function getGroup(id) {
  return enrichGroup(groups.get(id) || null);
}

function findGroupForHive(hiveId) {
  const id = Number(hiveId);
  for (const g of groups.values()) {
    if ((g.hiveIds || []).map(Number).includes(id)) return enrichGroup(g);
  }
  return null;
}

function upsertGroup(body = {}) {
  const id =
    body.id ||
    String(body.etiket || "grup")
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/gi, "-")
      .replace(/^-|-$/g, "") ||
    `grp-${Date.now()}`;
  const prev = groups.get(id) || {};
  const hiveIds = Array.isArray(body.hiveIds)
    ? body.hiveIds.map(Number)
    : prev.hiveIds || [];
  const next = {
    ...prev,
    id,
    etiket: body.etiket || prev.etiket || id,
    apiaryId: body.apiaryId || prev.apiaryId || null,
    hiveIds,
    gpsAnchorHiveId:
      body.gpsAnchorHiveId != null
        ? Number(body.gpsAnchorHiveId)
        : prev.gpsAnchorHiveId ?? hiveIds[0] ?? null,
    durum: body.durum || prev.durum || "sabit",
    guzergah: body.guzergah !== undefined ? body.guzergah : prev.guzergah || null,
    tasima: body.tasima !== undefined ? body.tasima : prev.tasima || null,
    createdAt: prev.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  groups.set(id, next);
  return enrichGroup(next);
}

function assignHivesToGroup(groupId, hiveIds = []) {
  const prev = groups.get(groupId);
  if (!prev) return { error: "group_not_found" };
  const ids = hiveIds.map(Number);
  // Diğer gruplardan çıkar
  for (const [gid, g] of groups) {
    if (gid === groupId) continue;
    const filtered = (g.hiveIds || []).filter((h) => !ids.includes(Number(h)));
    if (filtered.length !== (g.hiveIds || []).length) {
      groups.set(gid, { ...g, hiveIds: filtered, updatedAt: new Date().toISOString() });
    }
  }
  const merged = [...new Set([...(prev.hiveIds || []).map(Number), ...ids])];
  const next = {
    ...prev,
    hiveIds: merged,
    gpsAnchorHiveId: prev.gpsAnchorHiveId ?? merged[0] ?? null,
    updatedAt: new Date().toISOString(),
  };
  groups.set(groupId, next);
  return { ok: true, group: enrichGroup(next) };
}

function startGroupTransport(groupId, body = {}) {
  const prev = groups.get(groupId);
  if (!prev) return { error: "group_not_found" };
  const enriched = enrichGroup(prev);
  const guzergahList = parseGuzergah(body, prev.etiket, body.hedefEtiket);
  let hedefLat = body.hedefLat != null ? Number(body.hedefLat) : null;
  let hedefLon = body.hedefLon != null ? Number(body.hedefLon) : null;
  if (body.hedefKonumId && apiaries.has(body.hedefKonumId)) {
    const h = enrich(apiaries.get(body.hedefKonumId));
    hedefLat = h.lat;
    hedefLon = h.lon;
  }
  const next = {
    ...prev,
    durum: "tasiniyor",
    guzergah: guzergahList,
    tasima: {
      basladiAt: new Date().toISOString(),
      guzergah: guzergahList,
      hedef: {
        konumId: body.hedefKonumId || null,
        etiket: body.hedefEtiket || "Hedef",
        lat: hedefLat,
        lon: hedefLon,
      },
      gpsIleTakip: Boolean(enriched.gpsModulePresent),
      hiveIds: prev.hiveIds || [],
      durum: "tasiniyor",
      not: body.not || null,
    },
    updatedAt: new Date().toISOString(),
  };
  groups.set(groupId, next);
  return { ok: true, group: enrichGroup(next) };
}

function completeGroupTransport(groupId, body = {}) {
  const prev = groups.get(groupId);
  if (!prev) return { error: "group_not_found" };
  const next = {
    ...prev,
    durum: "sabit",
    guzergah: null,
    tasima: prev.tasima
      ? { ...prev.tasima, tamamlandiAt: new Date().toISOString(), durum: "ulasti" }
      : null,
    apiaryId: body.hedefKonumId || prev.apiaryId,
    updatedAt: new Date().toISOString(),
  };
  groups.set(groupId, next);
  return { ok: true, group: enrichGroup(next) };
}

/* ─── Kovan GPS ───────────────────────────────────────────────────────── */

function getHiveGps(hiveId) {
  const id = Number(hiveId);
  const row = hiveGps.get(id);
  if (!row) {
    return {
      hiveId: id,
      gpsModulePresent: false,
      gpsLat: null,
      gpsLon: null,
      gpsUpdatedAt: null,
      manualLat: null,
      manualLon: null,
    };
  }
  return { ...row };
}

function setHiveManual(hiveId, { lat, lon } = {}) {
  const id = Number(hiveId);
  const prev = hiveGps.get(id) || getHiveGps(id);
  const next = {
    ...prev,
    hiveId: id,
    manualLat: lat != null ? Number(lat) : prev.manualLat,
    manualLon: lon != null ? Number(lon) : prev.manualLon,
    updatedAt: new Date().toISOString(),
  };
  hiveGps.set(id, next);
  return next;
}

function ingestHiveGps(hiveId, { lat, lon, ts, gpsModulePresent } = {}) {
  const id = Number(hiveId);
  if (!Number.isFinite(id)) return { error: "hiveId_required" };
  if (lat == null || lon == null) return { error: "lat_lon_required" };
  const prev = hiveGps.get(id) || getHiveGps(id);
  const next = {
    ...prev,
    hiveId: id,
    gpsModulePresent: gpsModulePresent != null ? Boolean(gpsModulePresent) : true,
    gpsLat: Number(lat),
    gpsLon: Number(lon),
    gpsUpdatedAt: ts || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  hiveGps.set(id, next);

  // Taşınan grubu GPS ile güncelle
  const group = findGroupForHive(id);
  if (group?.durum === "tasiniyor" && group.tasima?.hedef?.lat != null) {
    const kalanM = haversineM(next.gpsLat, next.gpsLon, group.tasima.hedef.lat, group.tasima.hedef.lon);
    const raw = groups.get(group.id);
    if (raw) {
      const tasima = { ...raw.tasima, anlikLat: next.gpsLat, anlikLon: next.gpsLon, kalanM };
      let durum = raw.durum;
      if (kalanM <= 150) {
        durum = "sabit";
        tasima.tamamlandiAt = next.gpsUpdatedAt;
        tasima.durum = "ulasti";
      }
      groups.set(group.id, {
        ...raw,
        durum,
        guzergah: durum === "sabit" ? null : raw.guzergah,
        tasima,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { ok: true, hiveGps: next, group: findGroupForHive(id) };
}

/**
 * Öncelik: hive_gps → group_gps → apiary_gps → manuel → yok
 */
function resolveHiveLocation(meta = {}, reading = null) {
  const hiveId = meta.hiveId != null ? Number(meta.hiveId) : reading?.hiveId != null ? Number(reading.hiveId) : null;
  const konumId = meta.konumId || meta.konumEtiket;
  const apiary = konumId ? getApiary(konumId) || getApiary(String(konumId).toLowerCase()) : null;
  const group = hiveId != null ? findGroupForHive(hiveId) : meta.groupId ? getGroup(meta.groupId) : null;
  const own = hiveId != null ? getHiveGps(hiveId) : null;

  let lat = null;
  let lon = null;
  let konumKaynak = "yok";
  let gpsModulePresent = false;
  let gpsHiveId = null;
  let needManual = false;

  // 1) Kovan GPS
  if (own?.gpsModulePresent && own.gpsLat != null && own.gpsLon != null) {
    lat = own.gpsLat;
    lon = own.gpsLon;
    konumKaynak = "hive_gps";
    gpsModulePresent = true;
    gpsHiveId = own.hiveId;
  }
  // 2) Grup GPS (başka kovandaki modül)
  else if (group?.gpsModulePresent && group.lat != null && group.lon != null) {
    lat = group.lat;
    lon = group.lon;
    konumKaynak = "group_gps";
    gpsModulePresent = true;
    gpsHiveId = group.gpsHiveId;
  }
  // 3) Arılık GPS
  else if (apiary) {
    const fromApiary = resolveCoords(apiary);
    if (fromApiary.kaynak === "apiary_gps") {
      lat = fromApiary.lat;
      lon = fromApiary.lon;
      konumKaynak = "apiary_gps";
      gpsModulePresent = true;
    } else if (fromApiary.lat != null && fromApiary.lon != null) {
      // 4) Manuel (arılık veya kovan)
      lat = own?.manualLat ?? fromApiary.lat ?? meta.beklenenLat ?? meta.lat ?? reading?.lat ?? null;
      lon = own?.manualLon ?? fromApiary.lon ?? meta.beklenenLon ?? meta.lon ?? reading?.lon ?? null;
      konumKaynak = lat != null ? "manuel" : "yok";
      gpsModulePresent = false;
      if (lat == null) needManual = true;
    } else {
      lat = own?.manualLat ?? meta.beklenenLat ?? meta.lat ?? reading?.lat ?? null;
      lon = own?.manualLon ?? meta.beklenenLon ?? meta.lon ?? reading?.lon ?? null;
      konumKaynak = lat != null ? "manuel" : "yok";
      needManual = lat == null;
    }
  } else {
    lat = own?.manualLat ?? meta.beklenenLat ?? meta.lat ?? reading?.lat ?? null;
    lon = own?.manualLon ?? meta.beklenenLon ?? meta.lon ?? reading?.lon ?? null;
    konumKaynak = lat != null ? "manuel" : "yok";
    needManual = lat == null;
  }

  const apiaryDurum =
    group?.durum === "tasiniyor" ? "tasiniyor" : apiary?.durum || "sabit";
  const guzergah =
    group?.durum === "tasiniyor" ? group.guzergah : apiary?.guzergah || null;
  const tasima =
    group?.durum === "tasiniyor" ? group.tasima : apiary?.tasima || null;

  return {
    konumId: apiary?.id || meta.konumId || null,
    konumEtiket: apiary?.etiket || meta.konumEtiket || null,
    konumTipi: apiary?.tip || meta.konumTipi || null,
    lat,
    lon,
    beklenenLat: lat,
    beklenenLon: lon,
    konumKaynak,
    gpsModulePresent,
    gpsHiveId,
    needManual,
    gpsZorunluDegil: true,
    chain: ["hive_gps", "group_gps", "apiary_gps", "manuel"],
    apiaryDurum,
    guzergah,
    tasima,
    group: group
      ? {
          id: group.id,
          etiket: group.etiket,
          gpsModulePresent: group.gpsModulePresent,
          gpsHiveId: group.gpsHiveId,
          durum: group.durum,
          uyeSayisi: group.uyeSayisi,
        }
      : null,
    hiveGps: own
      ? {
          gpsModulePresent: Boolean(own.gpsModulePresent),
          lat: own.gpsLat,
          lon: own.gpsLon,
          updatedAt: own.gpsUpdatedAt,
        }
      : null,
    apiary: apiary
      ? {
          id: apiary.id,
          etiket: apiary.etiket,
          konumKaynak: apiary.konumKaynak,
          gpsModulePresent: apiary.gpsModulePresent,
          durum: apiary.durum,
        }
      : null,
  };
}

function analyzeApiaryLocationQuality(apiary, resolved = null) {
  const a = apiary ? enrich(apiary) : null;
  let score = 50;
  const strengths = [];
  const issues = [];

  if (resolved?.konumKaynak === "hive_gps") {
    score += 28;
    strengths.push("Kovan GPS aktif (1. öncelik)");
  } else if (resolved?.konumKaynak === "group_gps") {
    score += 26;
    strengths.push("Grup GPS mirası (paylaşımlı modül)");
  } else if (resolved?.konumKaynak === "apiary_gps" || a?.konumKaynak === "apiary_gps") {
    score += 22;
    strengths.push("Arılık GPS merkezi");
  } else if (resolved?.konumKaynak === "manuel" || (a && a.lat != null)) {
    score += 14;
    strengths.push("Manuel konum fallback");
  } else {
    issues.push("Manuel lat/lon gerekli");
    score -= 10;
  }

  if (resolved?.group || groups.size > 0) {
    score += 8;
    strengths.push("Kovan grubu + paylaşımlı GPS modeli");
  }
  if (a?.lat != null || resolved?.lat != null) {
    score += 6;
    strengths.push("Koordinat çözüldü");
  }
  if (resolved?.apiaryDurum === "tasiniyor" || a?.durum === "tasiniyor") {
    score += 4;
    strengths.push("Taşınıyor — güzergah");
  }
  score += 8;
  strengths.push("GPS yokken sistem çalışır");
  if (resolved?.needManual) issues.push("Manuel konum girilmeli");

  score = Math.max(0, Math.min(100, score));
  const kaynak = resolved?.konumKaynak || a?.konumKaynak || "yok";
  return {
    score,
    shRef: 94,
    shParityPct: Math.min(100, Math.round((score / 94) * 100)),
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 2),
    chain: ["hive_gps", "group_gps", "apiary_gps", "manuel"],
    ariciya:
      score >= 85
        ? `Konum kalite ${score}/100 — ${kaynak}${resolved?.apiaryDurum === "tasiniyor" ? " · taşınıyor" : ""}`
        : `Konum kalite ${score}/100${issues[0] ? ` — ${issues[0]}` : ""}`,
  };
}

module.exports = {
  seedDefaults,
  seedDemoGroups,
  listApiaries,
  getApiary,
  upsertApiary,
  ingestApiaryGps,
  startTransport,
  completeTransport,
  listGroups,
  getGroup,
  findGroupForHive,
  upsertGroup,
  assignHivesToGroup,
  startGroupTransport,
  completeGroupTransport,
  getHiveGps,
  setHiveManual,
  ingestHiveGps,
  resolveHiveLocation,
  resolveCoords,
  analyzeApiaryLocationQuality,
  apiaries,
  groups,
  hiveGps,
};
