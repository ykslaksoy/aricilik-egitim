/**
 * Kovan bazında hangi analizlerin çalıştığı / uyarı verdiği.
 */

const { ANALYSES } = require("../../../../packages/shared/analysisRegistry");
const { CRITICAL_FAULTS } = require("./sensorHealth");

function hasFields(reading, fields) {
  if (!fields?.length) return true;
  return fields.every((f) => {
    if (f === "cameraPresent") return Boolean(reading?.cameraPresent);
    if (f === "mainCameraPresent") {
      return Boolean(reading?.mainCameraPresent || reading?.apiaryCamera?.present);
    }
    const v = reading?.[f];
    return v != null && v !== "" && !(f === "weightKg" && v <= 0 && reading?.fault === "scale");
  });
}

function sensorRuntimeFor(reading, def, hive) {
  const health = hive?.sensorHealth || hive?.colony?.sensorHealth;
  const faults = health?.faults || (reading?.fault ? [reading.fault] : []);
  const critical = faults.some((f) => CRITICAL_FAULTS.has(f));

  if (def.id === "tarti" && health && !health.available?.scale) {
    return "degraded";
  }
  if (def.id === "ir_trafik" && health && !health.available?.ir) {
    return health.available?.camera || health.available?.scale ? "degraded" : "ariza";
  }
  if (def.id === "mikrofon" && health && !health.available?.mic) {
    return "degraded";
  }
  if (def.id === "nem" && health && !health.available?.humidity) {
    return "degraded";
  }
  if (
    (def.id === "kovan_kamera" || def.id === "kamera_ir_ky") &&
    reading?.cameraPresent &&
    health &&
    !health.available?.camera
  ) {
    return "degraded";
  }
  if (critical && !hasFields(reading, def.gerekli)) {
    return "ariza";
  }
  if (reading?.fault && !critical && health?.mode === "degraded") {
    return hasFields(reading, def.gerekli) ? "degraded" : "atlandi";
  }
  return null;
}

function hasPollinationContract(hive) {
  return Boolean(hive?.colony?.pollination?.mod === "calisiyor");
}

function hasAnyCamera(hive) {
  const apiaryMod = hive?.apiaryCamera?.mod;
  return Boolean(
    hive?.cameraPresent ||
    hive?.hiveCamera?.present ||
    apiaryMod === "live" ||
    apiaryMod === "degraded"
  );
}

function ozetFromHive(id, hive) {
  const c = hive?.colony || {};
  const map = {
    sicaklik: c.temperature?.ariciya,
    nem: c.humidity?.ariciya,
    ir_trafik: c.sensors?.ir?.ariciya,
    tarti: c.sensors?.weight?.ariciya,
    mikrofon: c.sensors?.audio?.ariciya,
    titresim: c.sensors?.vibration?.ariciya,
    baglanti: c.sensors?.connectivity?.ariciya,
    kose_tarti: c.sensors?.corner?.ariciya,
    akustik_ml: c.acousticMl?.ariciya,
    gps_devrilme: c.gpsTilt?.ariciya,
    koloni_skoru: c.score != null ? `Skor ${c.score}` : null,
    saglik_skoru: c.healthScore != null ? `Sağlık ${c.healthScore}` : null,
    hastalik_riski: c.diseaseRiskLabel,
    ogul_riski: c.swarmRiskLabel,
    yavru_cikisi: c.broodEmergence?.note,
    ari_tahmini: c.beeEstimate != null ? `~${Math.round(c.beeEstimate / 1000)}k arı` : null,
    ogul_derin: c.scoresDeep?.swarm?.ariciya,
    hastalik_derin: c.scoresDeep?.disease?.ariciya,
    saglik_derin: c.scoresDeep?.health?.ariciya,
    yavru_derin: c.scoresDeep?.brood?.ariciya,
    hasat_zamani: c.harvest?.ariciya,
    kalibrasyon_guven: c.calibration?.ariciya,
    meta_kayit: c.metaInsights?.ariciya,
    tahmin_anomali: c.predictive?.ariciya,
    hava_indeksleri: c.weatherIndices?.ariciya,
    tasima_yerlesme: c.transport?.ariciya,
    muayene_gunlugu: c.inspectionJournal?.ariciya,
    kovan_kamera: hive?.hiveCamera?.ariciya,
    kamera_ir_ky: hive?.hiveCamera?.irComparison?.note || hive?.hiveCamera?.irComparison?.ariciya,
    arilik_kamera: hive?.apiaryCamera?.ariciya,
    kamera_guvenlik: hive?.securityCamera?.ariciya,
    sensor_ciftleri: c.sensors?.pairs?.ozet,
    giris_kapisi: hive?.entranceGate?.ariciya,
    kovan_ozeti: hive?.sensorFusion?.ozet,
    arilik_birlesik: hive?.apiaryFusion?.ariciya,
    pollination_roi: c.pollination?.mod === "calisiyor" ? c.pollination.ariciya : hive?.apiaryPollination?.ariciya,
    kovan_durumlari: hive?.evaluation?.ozet,
    risk_kategorileri: hive?.evaluation?.riskKategorileri?.ozet,
  };
  return map[id] || null;
}

function warnForAnalysis(id, hive) {
  const c = hive?.colony || {};
  const ev = hive?.evaluation?.durumlar || {};
  const warnMap = {
    sicaklik: (ev.sicaklik?.seviye ?? 5) <= 2,
    nem: (ev.nem?.seviye ?? 5) <= 2,
    ir_trafik: ["dusuk", "sifir"].includes(c.sensors?.ir?.profile),
    tarti: ["dusuk", "ogul_dusus"].includes(c.sensors?.weight?.profile),
    ogul_riski: (c.swarmRiskScore ?? 0) >= 50,
    hastalik_riski: (c.diseaseRiskScore ?? 0) >= 45,
    saglik_skoru: (c.healthScore ?? 100) < 45,
    akustik_ml: ["queenless", "swarm_prep", "robbing"].includes(c.acousticMl?.baskin?.key),
    gps_devrilme: c.gpsTilt?.devrilme === true || c.gpsTilt?.konumDurum === "kritik",
    hasat_zamani: c.harvest?.durum === "hazir",
    muayene_gunlugu: ["kritik", "gecikmis"].includes(c.inspectionJournal?.durum),
    kovan_kamera: (hive?.hiveCamera?.alerts?.length ?? 0) > 0,
    kamera_ir_ky: hive?.hiveCamera?.irComparison?.agrees === false,
    kamera_guvenlik: hive?.securityCamera?.uyari === true,
    arilik_birlesik: (hive?.apiaryFusion?.yapilacaklar?.[0]?.oncelik ?? 5) <= 2,
    pollination_roi: c.pollination?.durum === "dusuk",
  };
  return Boolean(warnMap[id]);
}

/**
 * @param {object} hive — hivePayload çıktısı
 */
function statusForHive(hive) {
  const reading = hive || {};
  const results = [];

  for (const def of ANALYSES) {
    const kayitli = def.durum === "calisiyor";
    let runtime = "plan";

    if (!kayitli) {
      runtime = def.durum === "kapali" ? "kapali" : "plan";
    } else if (def.id === "pollination_roi" && !hasPollinationContract(hive)) {
      runtime = "atlandi";
    } else if (def.id === "kamera_guvenlik" && !hasAnyCamera(hive)) {
      runtime = "atlandi";
    } else if (def.id === "arilik_kamera") {
      const ac = hive?.apiaryCamera;
      if (!ac || ac.mod === "off") runtime = "atlandi";
      else if (ac.mod === "optional") runtime = "calisti";
      else if (ac.mod === "degraded") runtime = "degraded";
      else runtime = "calisti";
    } else if (
      def.opsiyonel &&
      def.gerekli?.some((f) => f.includes("camera") || f.includes("mainCamera"))
    ) {
      if (!hasFields(reading, def.gerekli)) runtime = "atlandi";
      else runtime = "calisti";
    } else if (!hasFields(reading, def.gerekli)) {
      const degraded = sensorRuntimeFor(reading, def, hive);
      runtime = degraded || (reading.fault ? "ariza" : "veri_yok");
    } else {
      const degraded = sensorRuntimeFor(reading, def, hive);
      runtime = degraded === "degraded" ? "degraded" : "calisti";
    }

    const ozet =
      runtime === "calisti" || runtime === "degraded"
        ? ozetFromHive(def.id, hive)
        : null;
    const uyari =
      (runtime === "calisti" || runtime === "degraded") && warnForAnalysis(def.id, hive);

    results.push({
      id: def.id,
      ad: def.ad,
      katman: def.katman,
      durum: def.durum,
      runtime,
      uyari,
      ozet: ozet ? String(ozet).slice(0, 120) : null,
    });
  }

  const calisti = results.filter((r) => r.runtime === "calisti").length;
  const atlandi = results.filter((r) => r.runtime === "atlandi").length;
  const uyari = results.filter((r) => r.uyari).length;

  return {
    hiveId: hive.hiveId,
    toplam: ANALYSES.length,
    calisti,
    atlandi,
    uyari,
    analizler: results,
  };
}

module.exports = {
  statusForHive,
  hasFields,
};
