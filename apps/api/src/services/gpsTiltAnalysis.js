/**
 * GPS konum + devrilme / eğim analizi.
 * Eğim: ADXL345 pitch/roll (mevcut BOM) + tiltDeg ingest + 4 köşe proxy.
 * Öncelik konum: kovan GPS → grup GPS → arılık GPS → manuel. GPS zorunlu değil.
 */

const { GPS } = require("../../../../packages/shared/constants");
const apiaryLocationService = require("./apiaryLocationService");
const {
  analyzeTiltSensorQuality,
  tiltFromAdxl,
  tiltFromCorners,
} = require("./tiltSensorCalibration");

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

const KAYNAK_LABEL = {
  hive_gps: "kovan GPS",
  group_gps: "grup GPS",
  apiary_gps: "arılık GPS",
  manuel: "manuel",
  yok: "yok",
};

function resolveTilt(reading = {}, meta = {}) {
  const adxl = tiltFromAdxl(reading);
  const cornerTilt = tiltFromCorners(reading.cornerKg ?? reading.cornerKgRaw);
  let tilt = adxl.tiltDeg;
  let tiltSource = adxl.source;

  if (tilt == null && meta.tiltDeg != null) {
    tilt = Number(meta.tiltDeg);
    tiltSource = "meta";
  }
  if (tilt == null && cornerTilt != null) {
    tilt = cornerTilt;
    tiltSource = "corners";
  }
  if (tilt == null) tilt = 0;

  // Köşe ile ADXL çelişirse daha yüksek olanı al (güvenlik)
  if (adxl.tiltDeg != null && cornerTilt != null && cornerTilt > adxl.tiltDeg + 8) {
    tilt = Math.max(adxl.tiltDeg, cornerTilt * 0.85);
    tiltSource = "adxl+corners";
  }

  return {
    tiltDeg: Math.round(Number(tilt) * 10) / 10,
    pitchDeg: adxl.pitchDeg,
    rollDeg: adxl.rollDeg,
    cornerTiltDeg: cornerTilt,
    tiltSource,
  };
}

function analyzeGpsTilt(reading, meta = {}, expectedLoc = null, cfg = {}) {
  const metaWithId = { ...meta, hiveId: meta.hiveId ?? reading?.hiveId };
  const resolved = apiaryLocationService.resolveHiveLocation(metaWithId, reading);
  const lat = resolved.lat ?? reading?.lat ?? meta.lat ?? expectedLoc?.lat;
  const lon = resolved.lon ?? reading?.lon ?? meta.lon ?? expectedLoc?.lon;
  const bekLat = resolved.beklenenLat ?? meta.beklenenLat ?? expectedLoc?.lat;
  const bekLon = resolved.beklenenLon ?? meta.beklenenLon ?? expectedLoc?.lon;
  const vib = reading?.vibration ?? 0;
  const konumKaynak = resolved.konumKaynak || "yok";
  const apiaryDurum = resolved.apiaryDurum || "sabit";
  const transport = Boolean(meta.transportMode || reading?.transportMode);

  const tiltInfo = resolveTilt(reading, meta);
  let tilt = tiltInfo.tiltDeg;

  const apiary = resolved.apiary
    ? apiaryLocationService.getApiary(resolved.apiary.id)
    : null;
  const locationQuality = apiaryLocationService.analyzeApiaryLocationQuality(
    apiary,
    resolved
  );

  const tiltBase = {
    egimDurum: "duz",
    tiltDeg: tilt,
    pitchDeg: tiltInfo.pitchDeg,
    rollDeg: tiltInfo.rollDeg,
    tiltSource: tiltInfo.tiltSource,
  };
  const tiltQuality = analyzeTiltSensorQuality(tiltBase, cfg, reading, meta);

  if (lat == null || lon == null || resolved.needManual) {
    return {
      mod: "manuel_bekleniyor",
      ariciya:
        "Konum yok — kovan/grup/arılık GPS bağla veya manuel lat/lon gir (GPS zorunlu değil)",
      konumOk: null,
      devrilme: false,
      egimDurum: tilt >= GPS.TILT_CRITICAL_DEG ? "devrildi" : tilt >= GPS.TILT_WARN_DEG ? "egik" : "duz",
      tiltDeg: tilt,
      pitchDeg: tiltInfo.pitchDeg,
      rollDeg: tiltInfo.rollDeg,
      tiltSource: tiltInfo.tiltSource,
      konumKaynak: "yok",
      needManual: true,
      gpsModulePresent: false,
      gpsZorunluDegil: true,
      chain: resolved.chain,
      group: resolved.group,
      quality: locationQuality,
      tiltQuality,
      ariciyaEgim: tiltQuality.ariciya,
    };
  }

  let sapmaM = null;
  if (bekLat != null && bekLon != null) {
    sapmaM = haversineM(lat, lon, bekLat, bekLon);
  }

  let konumDurum = "ok";
  if (apiaryDurum === "tasiniyor" || transport) {
    konumDurum = "tasiniyor";
  } else if (sapmaM != null) {
    if (sapmaM >= GPS.DRIFT_CRITICAL_M) konumDurum = "kritik";
    else if (sapmaM >= GPS.DRIFT_WARN_M) konumDurum = "suphe";
  }

  // Taşıma sırasında eğim alarmını bastır (yanlış pozitif)
  let devrilme = !transport && tilt >= GPS.TILT_CRITICAL_DEG;
  let egimDurum = "duz";
  if (transport) {
    egimDurum = "tasima_bastirildi";
  } else if (devrilme) {
    egimDurum = "devrildi";
  } else if (tilt >= GPS.TILT_WARN_DEG) {
    egimDurum = "egik";
  }

  if (!transport && vib >= GPS.VIBRATION_TIP_M && tilt >= GPS.TILT_WARN_DEG) {
    devrilme = true;
    egimDurum = "devrildi";
  }
  if (!transport && meta.fizikselHasar && tilt >= GPS.TILT_WARN_DEG) {
    devrilme = true;
    egimDurum = "devrildi";
  }

  const oneriler = [];
  if (konumDurum === "kritik") {
    oneriler.push("Konum sapması büyük — GPS veya manuel merkezi güncelle.");
  }
  if (konumDurum === "tasiniyor") {
    const g = resolved.guzergah;
    const guz = Array.isArray(g) ? g.join(" → ") : g || "güzergah kayıtlı";
    oneriler.push(`Taşınıyor: ${guz}`);
    if (!resolved.gpsModulePresent) {
      oneriler.push("GPS yok — varışta manuel konum güncelle.");
    }
  }
  if (devrilme) {
    oneriler.push("Acil: kovanı düzelt; ana ve petek hasarı bak.");
  } else if (egimDurum === "egik") {
    oneriler.push("Platform / sehpa dengesini düzelt.");
  }

  const kaynakLabel = KAYNAK_LABEL[konumKaynak] || konumKaynak;
  let ariciya = `${resolved.konumEtiket || "Arılık"} · ${lat.toFixed(4)}, ${lon.toFixed(4)} (${kaynakLabel})`;
  if (konumKaynak === "group_gps" && resolved.gpsHiveId != null) {
    ariciya += ` · GPS kovan #${resolved.gpsHiveId}`;
  }
  if (resolved.group) {
    ariciya += ` · grup ${resolved.group.etiket}`;
  }
  if (apiaryDurum === "tasiniyor" || transport) {
    const g = resolved.guzergah;
    const guz = Array.isArray(g) ? g.join(" → ") : g || "—";
    ariciya += ` · TAŞINIYOR: ${guz}`;
    if (resolved.tasima?.kalanM != null) ariciya += ` · kalan ~${resolved.tasima.kalanM} m`;
  } else if (sapmaM != null && sapmaM > 0) {
    ariciya += ` · sapma ${sapmaM} m`;
  }
  ariciya += ` · eğim ${Math.round(tilt)}°`;
  if (tiltInfo.pitchDeg != null && tiltInfo.rollDeg != null) {
    ariciya += ` (P${tiltInfo.pitchDeg}/R${tiltInfo.rollDeg})`;
  }
  if (devrilme) ariciya += " — DEVRİLME";
  else if (egimDurum === "egik") ariciya += " — eğik";
  else if (egimDurum === "tasima_bastirildi") ariciya += " — taşıma (alarm kapalı)";
  else if (konumDurum === "suphe") ariciya += " — konum şüphesi";

  return {
    mod: "calisiyor",
    lat,
    lon,
    beklenenLat: bekLat,
    beklenenLon: bekLon,
    sapmaM,
    konumDurum,
    konumOk: konumDurum === "ok",
    konumKaynak,
    gpsModulePresent: Boolean(resolved.gpsModulePresent),
    gpsHiveId: resolved.gpsHiveId,
    gpsZorunluDegil: true,
    needManual: false,
    chain: resolved.chain,
    apiaryDurum,
    guzergah: resolved.guzergah,
    tasima: resolved.tasima,
    group: resolved.group,
    hiveGps: resolved.hiveGps,
    apiary: resolved.apiary,
    tiltDeg: tilt,
    pitchDeg: tiltInfo.pitchDeg,
    rollDeg: tiltInfo.rollDeg,
    cornerTiltDeg: tiltInfo.cornerTiltDeg,
    tiltSource: tiltInfo.tiltSource,
    egimDurum,
    devrilme,
    transportSuppressed: transport,
    quality: locationQuality,
    tiltQuality,
    oneriler: oneriler.slice(0, 3),
    ariciya: `${ariciya} · konum ${locationQuality.score}/100 · eğim ${tiltQuality.score}/100`,
  };
}

module.exports = { analyzeGpsTilt, haversineM, resolveTilt };
