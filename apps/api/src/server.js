const express = require("express");
const cors = require("cors");
const path = require("path");
const { analyzeColony, analyzeDiseaseRisk, analyzeTemperature, analyzeHumidity } = require("./colony");
const { assessSensorHealth, hasCriticalFault } = require("./services/sensorHealth");
const {
  syncAlertsFromHives,
  cornerImbalance,
} = require("./services/alertEngine");
const { evaluateHiveState, isQueenlessSuspect, patchEvaluationDurumlar } = require("./hiveState");
const {
  evaluateEntranceGate,
  applyGateState,
} = require("./services/entranceGate");
const {
  analyzeHiveCamera,
  analyzeApiaryCamera,
  blendCameraBeeEstimate,
  fillReadingCameraCounts,
  hiveSnapshotSvg,
  apiarySnapshotSvg,
} = require("./services/cameraAnalysis");
const { analyzeAllSensors } = require("./services/sensorAnalysis");
const { fuseHiveNarrative } = require("./services/sensorFusion");
const { buildScoresDeep } = require("./services/scoreDeep");
const { analyzeCalibrationQuality } = require("./services/calibrationAnalysis");
const {
  suggestCornerOffsets,
  analyzeCornerScaleCalibration,
  readingWithNormalizedCorners,
} = require("./services/cornerScaleCalibration");
const { analyzeMetaInsights } = require("./services/metaAnalysis");
const { analyzePredictive } = require("./services/predictiveAnalysis");
const { analyzeWeatherIndices } = require("./services/weatherIndices");
const { analyzeTransport } = require("./services/transportAnalysis");
const { fuseApiaryNarrative } = require("./services/apiaryFusion");
const { analyzeAcousticMl } = require("./services/acousticMlAnalysis");
const { analyzeHarvestTiming } = require("./services/harvestAnalysis");
const {
  analyzePollinationRoi,
  analyzeApiaryPollination,
} = require("./services/pollinationAnalysis");
const { analyzeGpsTilt } = require("./services/gpsTiltAnalysis");
const apiaryLocationService = require("./services/apiaryLocationService");
const { analyzeInspectionJournal } = require("./services/inspectionJournalAnalysis");
const { analyzeBroodZone, referenceBroodTempFromReading, estimateBroodTempModel } = require("./services/broodZoneAnalysis");
const { analyzeWinterStore } = require("./services/winterStoreAnalysis");
const { analyzeHealthyHiveIndex } = require("./services/healthyHiveAnalysis");
const { analyzeRobbing } = require("./services/robbingAnalysis");
const { analyzeVarroaRisk } = require("./services/varroaAnalysis");
const { analyzeQueenlessFusion } = require("./services/queenlessFusionAnalysis");
const { analyzeSingleSideScale, deriveSides, pickSingleSide, referenceSingleSideFromConfig } = require("./services/singleSideScaleAnalysis");
const { analyzeFlowerVisit, fillReadingPollenLoad } = require("./services/flowerVisitAnalysis");
const { fuseWeatherStation } = require("./services/weatherStationAnalysis");
const { analyzeMlFleet, getFleetStats } = require("./services/mlFleetAnalysis");
const journalService = require("./services/journalService");
const teamService = require("./services/teamService");
const orgPanelService = require("./services/orgPanelService");
const offlineSyncService = require("./services/offlineSyncService");
const subscriptionService = require("./services/subscriptionService");
const slaService = require("./services/slaService");
const openMeteoService = require("./services/openMeteoService");
const { computeProLigScore, flagsFromEnv } = require("./services/proLigScoreService");
const { getStrengthPreserveReport } = require("./services/strengthPreserveService");
const { FEATURES: MASTER_FEATURES } = require("../../../scripts/superhero-score-data.js");
const { getMasterNote, getMasterDurum } = require("../../../scripts/master-notes.js");
const { analyzeSecurityCameras } = require("./services/securityCameraAnalysis");
const {
  LEAGUE_SW_DEFAULTS,
  attachLeagueSoftQualities,
} = require("./services/leagueSoftCalibration");
const pushService = require("./services/pushService");
const dbService = require("./services/dbService");
const mlModelService = require("./services/mlModelService");
const mlLearningService = require("./services/mlLearningService");
const hardwareIntegrityService = require("./services/hardwareIntegrityService");
const mlApprovalService = require("./services/mlApprovalService");
const petekTaramaService = require("./services/petekTaramaService");
const hiveBaselineService = require("./services/hiveBaselineService");
const { requireAdmin } = require("./middleware/adminAuth");
const {
  ANALYSES,
  KATMAN_LABEL,
  DURUM_LABEL,
  countAnalyses,
} = require("../../../packages/shared/analysisRegistry");
const { statusForHive } = require("./services/analysisStatus");
const {
  SENSOR,
  FEEDING,
  WEATHER,
  SCORE,
} = require("../../../packages/shared/constants");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/** @type {Map<number, object[]>} */
const history = new Map();
/** @type {Map<number, object>} */
const latest = new Map();
/** @type {Map<number, object>} */
const hiveConfig = new Map();
/** @type {Map<number, object>} */
const hiveMeta = new Map();
const alerts = [];

/** Eski İngilizce senaryo etiketlerini Türkçeleştir */
function normalizeScenarioLabel(label) {
  if (!label) return label;
  const s = String(label);
  if (/^canlı\s*ingest$/i.test(s) || /^ingest$/i.test(s)) return "Canlı veri";
  return s
    .replace(/\boffline\b/gi, "çevrimdışı")
    .replace(/\bingest\b/gi, "veri");
}

/** Dengeli taban (iyi) — tek alan bozulunca üzerine yazılır */
const BASE_GOOD = {
  weightKg: 28.8,
  tempC: 34.0,
  humidity: 58,
  middayIn: 950,
  middayOut: 1050,
  vibration: 3,
  audioRms: 0.32,
  battery: 80,
  rssi: -78,
  cameraPresent: true,
  tareKg: 8,
  combKg: 18,
  referenceBeeCount: 38000,
  middayBeeOutRef: 1050,
  konumEtiket: "Ev",
  konumTipi: "ev",
  konumId: "ev",
};

/**
 * Kayıtlı konumlar (ev / yayla / başka yayla).
 * Hava: konum lat/lon → demo hava (ileride Open-Meteo).
 */
const LOCATIONS = [
  {
    id: "ev",
    etiket: "Ev",
    tip: "ev",
    lat: 39.92,
    lon: 41.27,
    weather: {
      tempC: 27,
      precipMm: 0,
      windKmh: 10,
      humidity: 42,
      condition: "acik",
      label: "Açık",
    },
  },
  {
    id: "yayla-tortum",
    etiket: "Yayla Tortum",
    tip: "yayla",
    lat: 40.61,
    lon: 41.66,
    weather: {
      tempC: 16,
      precipMm: 5.5,
      windKmh: 24,
      humidity: 82,
      condition: "yagmur",
      label: "Yağmurlu",
    },
  },
  {
    id: "yayla-2",
    etiket: "Yayla 2",
    tip: "yayla",
    lat: 40.45,
    lon: 41.4,
    weather: {
      tempC: 4,
      precipMm: 0.2,
      windKmh: 42,
      humidity: 58,
      condition: "don",
      label: "Don riski",
    },
  },
];

function locationByIdOrEtiket(idOrEtiket) {
  if (!idOrEtiket) return LOCATIONS[0];
  const fromApiary = apiaryLocationService.getApiary(idOrEtiket);
  if (fromApiary) {
    return {
      id: fromApiary.id,
      etiket: fromApiary.etiket,
      tip: fromApiary.tip,
      lat: fromApiary.lat,
      lon: fromApiary.lon,
      weather: LOCATIONS.find((l) => l.id === fromApiary.id)?.weather,
    };
  }
  return (
    LOCATIONS.find((l) => l.id === idOrEtiket || l.etiket === idOrEtiket) ||
    LOCATIONS[0]
  );
}

apiaryLocationService.seedDefaults(LOCATIONS);

function seedLocationGroups() {
  const byApiary = {};
  for (const [hiveId, m] of hiveMeta.entries()) {
    const kid = m.konumId || "ev";
    if (!byApiary[kid]) byApiary[kid] = [];
    byApiary[kid].push(hiveId);
  }
  for (const k of Object.keys(byApiary)) byApiary[k].sort((a, b) => a - b);
  apiaryLocationService.seedDemoGroups(byApiary);
  // meta.groupId yaz
  for (const g of apiaryLocationService.listGroups()) {
    for (const hid of g.hiveIds || []) {
      const meta = hiveMeta.get(hid);
      if (meta) {
        meta.groupId = g.id;
        hiveMeta.set(hid, meta);
      }
    }
  }
}

/** Open-Meteo önbellek — konum id → hava */
const weatherCache = new Map();

function applyWeatherTips(w, reading) {
  const tips = [];
  const tasks = [];
  if (w.condition === "yagmur" || w.precipMm >= WEATHER.PRECIP_MM) {
    tips.push("Yağış var — düşük IR uçuşu hastalık sanma");
    if ((reading?.beeOut ?? 999) < 120) {
      tips.push("IR düşük + yağmur — uçuş yok beklenen");
    }
  }
  if (w.tempC <= WEATHER.FROST_TEMP_C || w.condition === "don") {
    tips.push("Don riski — yalıtım ve besleme kontrol");
    tasks.push({ type: "frost", title: "Don riski — yalıtım kontrol", priority: 2 });
  }
  if (w.windKmh >= WEATHER.STORM_WIND_KMH || w.condition === "firtina") {
    tips.push("Kuvvetli rüzgâr — taşıma ertele");
    tasks.push({ type: "storm", title: "Fırtına / rüzgâr — taşımayı ertele", priority: 2 });
  }
  if (w.tempC >= WEATHER.HEAT_OUTDOOR_C && (reading?.tempC ?? 0) >= SENSOR.TEMP_HIGH_C) {
    tips.push("Dış sıcak + kovan ısısı yüksek — gölge");
    tasks.push({ type: "heat", title: "Sıcak hava + kovan ısısı — gölge", priority: 2 });
  }
  return { tips, tasks };
}

async function refreshWeatherCache() {
  for (const loc of LOCATIONS) {
    const live = await openMeteoService.getWeatherForLocation(loc.lat, loc.lon, loc.weather);
    if (live) weatherCache.set(loc.id, live);
  }
}

function weatherForHive(hiveId, reading) {
  const meta = hiveMeta.get(hiveId) || {};
  const loc = locationByIdOrEtiket(meta.konumId || meta.konumEtiket);
  const cached = weatherCache.get(loc.id);
  const w = cached ? { ...cached } : { ...loc.weather, source: "konum" };
  const { tips, tasks } = applyWeatherTips(w, reading);

  const camPresent = Boolean(reading?.mainCameraPresent || reading?.cameraPresent);
  let camera = { present: camPresent, hint: null, agreesWithApi: null };
  if (camPresent) {
    if (w.condition === "yagmur" || w.precipMm >= WEATHER.PRECIP_MM) {
      camera.hint = "islak_esik";
      camera.agreesWithApi = true;
      tips.push("Kamera: ıslak eşik — API yağmur ile uyumlu");
    } else if (w.condition === "acik") {
      camera.hint = "acik_aydinlik";
      camera.agreesWithApi = true;
    } else {
      camera.hint = "bulutlu";
      camera.agreesWithApi = true;
    }
  }

  return {
    konumId: loc.id,
    konumEtiket: loc.etiket,
    konumTipi: loc.tip,
    lat: loc.lat,
    lon: loc.lon,
    source: w.source || "konum",
    tempC: w.tempC,
    precipMm: w.precipMm,
    windKmh: w.windKmh,
    humidity: w.humidity,
    condition: w.condition,
    label: w.label,
    fetchedAt: w.fetchedAt || null,
    tips,
    weatherTasks: tasks,
    camera,
  };
}

/** Besleme görevleri (hava / tartı / skor — ayrı tür: `feeding`) */
function feedingTasksForHive(hiveId, reading, colony) {
  if (!reading || !colony) return [];
  const meta = hiveMeta.get(hiveId) || {};
  const health = assessSensorHealth(reading, meta);
  if (hasCriticalFault(health)) return [];
  const wx = weatherForHive(hiveId, reading);
  const tasks = [];

  if (wx.tempC <= WEATHER.FROST_TEMP_C || wx.condition === "don") {
    tasks.push({
      key: "feed-frost",
      title: "Besleme — don / soğuk",
      priority: 2,
      detail: `${wx.konumEtiket}: dış ${wx.tempC}°C · şurup veya fondant`,
    });
  }

  const lowWeight =
    health?.available?.scale !== false &&
    reading.weightKg > 0 &&
    reading.weightKg < FEEDING.WEIGHT_KG;
  const weakColony = colony.score < SCORE.COLONY_WEAK;
  const lowBees =
    colony.beeEstimate != null && colony.beeEstimate < FEEDING.BEE_MIN;

  if (lowWeight || weakColony || lowBees) {
    const parts = [];
    if (lowWeight) parts.push(`tartı ${reading.weightKg} kg`);
    if (weakColony) parts.push(`skor ${colony.score}`);
    if (lowBees) parts.push(`~${Math.round(colony.beeEstimate / 1000)}k arı`);
    tasks.push({
      key: "feed-colony",
      title: "Besleme — zayıf koloni",
      priority: lowWeight && reading.weightKg < FEEDING.WEIGHT_URGENT_KG ? 2 : 3,
      detail: parts.join(" · "),
    });
  }

  if (reading.tempC <= SENSOR.TEMP_LOW_C && wx.tempC > WEATHER.FROST_TEMP_C) {
    tasks.push({
      key: "feed-hive-temp",
      title: "Besleme — düşük kovan ısısı",
      priority: 2,
      detail: `Kovan içi ${reading.tempC}°C — enerji desteği`,
    });
  }

  return tasks;
}

/**
 * Senaryo kovanları
 * 1–4: tüm veriler aynı seviyede
 * 10–17: bir sensör düşük
 * 20–27: bir sensör çok yüksek / kritik
 */
const SCENARIOS = [
  {
    hiveId: 1,
    scenario: "tümü_normal",
    label: "Tüm veriler normal",
    ...BASE_GOOD,
    weightKg: 27.2,
    tempC: 33.0,
    humidity: 52,
    middayIn: 620,
    middayOut: 680,
    vibration: 2,
    audioRms: 0.26,
    battery: 62,
    rssi: -88,
    referenceBeeCount: 28000,
    middayBeeOutRef: 680,
  },
  {
    hiveId: 2,
    scenario: "tümü_iyi",
    label: "Tüm veriler iyi",
    ...BASE_GOOD,
    cameraPresent: true,
  },
  {
    hiveId: 3,
    scenario: "tümü_cok_iyi",
    label: "Tüm veriler çok iyi",
    ...BASE_GOOD,
    weightKg: 29.4,
    tempC: 34.5,
    humidity: 60,
    middayIn: 1200,
    middayOut: 1350,
    vibration: 3,
    audioRms: 0.36,
    battery: 90,
    rssi: -70,
    referenceBeeCount: 44000,
    middayBeeOutRef: 1350,
    konumId: "yayla-tortum",
    konumEtiket: "Yayla Tortum",
    konumTipi: "yayla",
  },
  {
    hiveId: 4,
    scenario: "tümü_super",
    label: "Tüm veriler süper",
    ...BASE_GOOD,
    weightKg: 29.8,
    tempC: 34.2,
    humidity: 58,
    middayIn: 1400,
    middayOut: 1550,
    vibration: 3,
    audioRms: 0.38,
    battery: 96,
    rssi: -65,
    referenceBeeCount: 42000,
    middayBeeOutRef: 1550,
    konumId: "yayla-2",
    konumEtiket: "Yayla 2",
    konumTipi: "yayla",
  },

  {
    hiveId: 5,
    scenario: "yazin_yavru_cikisi",
    label: "Yazın yavru çıkışı — koloni büyüyor",
    ...BASE_GOOD,
    springBroodBuildup: true,
    broodGainKg: 2.1,
    broodEmergencePerDay: 1400,
    weightKg: 30.2,
    tempC: 34.8,
    humidity: 56,
    middayIn: 880,
    middayOut: 980,
    vibration: 3,
    audioRms: 0.34,
    battery: 84,
    rssi: -74,
    referenceBeeCount: 36000,
    middayBeeOutRef: 980,
  },

  // --- bir sensör DÜŞÜK ---
  {
    hiveId: 10,
    scenario: "dusuk_tarti",
    label: "Düşük tartı / zayıf koloni",
    ...BASE_GOOD,
    weightKg: 22.5,
    middayIn: 180,
    middayOut: 200,
    referenceBeeCount: 12000,
    middayBeeOutRef: 200,
    sonMuayeneGunOnce: 42,
    petekYasYil: 4.5,
    petekEski: true,
    petekTransferSon: true,
  },
  {
    hiveId: 11,
    scenario: "dusuk_sicaklik",
    label: "Düşük sıcaklık",
    ...BASE_GOOD,
    tempC: 26.5,
    tempTrend: "falling",
  },
  {
    hiveId: 12,
    scenario: "dusuk_nem",
    label: "Düşük nem",
    ...BASE_GOOD,
    humidity: 28,
  },
  {
    hiveId: 13,
    scenario: "dusuk_ir",
    label: "Düşük IR trafik",
    ...BASE_GOOD,
    middayIn: 40,
    middayOut: 55,
    mainCameraPresent: true,
    konumId: "yayla-tortum",
    konumEtiket: "Yayla Tortum",
    konumTipi: "yayla",
  },
  {
    hiveId: 14,
    scenario: "dusuk_pil",
    label: "Düşük pil",
    ...BASE_GOOD,
    battery: 12,
  },
  {
    hiveId: 15,
    scenario: "dusuk_mikrofon",
    label: "Düşük mikrofon (sessiz)",
    ...BASE_GOOD,
    audioRms: 0.08,
    middayIn: 90,
    middayOut: 110,
  },
  {
    hiveId: 16,
    scenario: "dusuk_titresim",
    label: "Düşük titreşim",
    ...BASE_GOOD,
    vibration: 0,
  },
  {
    hiveId: 17,
    scenario: "dusuk_rssi",
    label: "Düşük LoRa sinyali",
    ...BASE_GOOD,
    rssi: -112,
  },

  // --- bir sensör ÇOK YÜKSEK ---
  {
    hiveId: 20,
    scenario: "yuksek_sicaklik",
    label: "Çok yüksek sıcaklık",
    ...BASE_GOOD,
    tempC: 39.8,
    tempTrend: "rising",
  },
  {
    hiveId: 21,
    scenario: "yuksek_nem",
    label: "Çok yüksek nem",
    ...BASE_GOOD,
    humidity: 92,
  },
  {
    hiveId: 22,
    scenario: "yuksek_ir_ogul",
    label: "Çok yüksek IR / oğul riski",
    ...BASE_GOOD,
    weightKg: 30.5,
    middayIn: 1700,
    middayOut: 1900,
    referenceBeeCount: 52000,
    middayBeeOutRef: 1900,
    cameraPresent: true,
    konumId: "yayla-tortum",
    konumEtiket: "Yayla Tortum",
    konumTipi: "yayla",
  },
  {
    hiveId: 23,
    scenario: "yuksek_tarti_kalabalik",
    label: "Çok yüksek tartı / kalabalık",
    ...BASE_GOOD,
    weightKg: 32.8,
    middayIn: 1600,
    middayOut: 1750,
    referenceBeeCount: 56000,
    middayBeeOutRef: 1750,
    konumId: "yayla-2",
    konumEtiket: "Yayla 2",
    konumTipi: "yayla",
    sonMuayeneGunOnce: 45,
  },
  {
    hiveId: 24,
    scenario: "yuksek_titresim",
    label: "Çok yüksek titreşim",
    ...BASE_GOOD,
    vibration: 22,
    tiltDeg: 52,
    fizikselHasar: true,
  },
  {
    hiveId: 25,
    scenario: "yuksek_mikrofon",
    label: "Çok yüksek mikrofon",
    ...BASE_GOOD,
    audioRms: 0.72,
  },
  {
    hiveId: 26,
    scenario: "yuksek_dengesizlik",
    label: "Çok yüksek köşe dengesizliği",
    ...BASE_GOOD,
    cornerSkew: 3.2,
  },
  {
    hiveId: 27,
    scenario: "ogul_gerceklesti",
    label: "Ani ağırlık düşüşü (oğul)",
    ...BASE_GOOD,
    weightKg: 29.5,
    weightDropLate: true,
    middayIn: 1100,
    middayOut: 1200,
    referenceBeeCount: 40000,
    middayBeeOutRef: 1200,
    anaIrk: "Kafkas",
    babaIrk: "Kafkas",
  },

  // --- sensör ARIZASI ---
  {
    hiveId: 30,
    scenario: "ariza_tarti",
    label: "Arıza — tartı",
    ...BASE_GOOD,
    weightKg: 0,
    fault: "scale",
    anaIrk: "Kafkas",
    babaIrk: "Karniyol",
  },
  {
    hiveId: 31,
    scenario: "ariza_sicaklik",
    label: "Arıza — sıcaklık sensörü",
    ...BASE_GOOD,
    tempC: -40,
    fault: "temp",
    anaIrk: "Karniyol",
    babaIrk: "Kafkas",
  },
  {
    hiveId: 32,
    scenario: "ariza_nem",
    label: "Arıza — nem sensörü",
    ...BASE_GOOD,
    humidity: 255,
    fault: "humidity",
    anaIrk: "Anadolu",
    babaIrk: "Kafkas",
  },
  {
    hiveId: 33,
    scenario: "ariza_ir",
    label: "Arıza — IR sayaç",
    ...BASE_GOOD,
    middayIn: 0,
    middayOut: 0,
    fault: "ir",
    anaIrk: "Kafkas",
    babaIrk: "Anadolu",
  },
  {
    hiveId: 34,
    scenario: "ariza_mikrofon",
    label: "Arıza — mikrofon",
    ...BASE_GOOD,
    audioRms: -1,
    fault: "mic",
    anaIrk: "Karniyol",
    babaIrk: "Karniyol",
  },
  {
    hiveId: 35,
    scenario: "ariza_titresim",
    label: "Arıza — titreşim",
    ...BASE_GOOD,
    vibration: -1,
    fault: "vibration",
    anaIrk: "Kafkas",
    babaIrk: "Kafkas",
  },
  {
    hiveId: 36,
    scenario: "ariza_offline",
    label: "Arıza — çevrimdışı / veri yok",
    ...BASE_GOOD,
    fault: "offline",
    offlineHours: 5,
    anaIrk: "Karniyol",
    babaIrk: "Kafkas",
  },
  {
    hiveId: 37,
    scenario: "ariza_kamera",
    label: "Arıza — kamera (kısmi mod)",
    ...BASE_GOOD,
    cameraPresent: true,
    fault: "camera",
    anaIrk: "Kafkas",
    babaIrk: "Karniyol",
  },
  {
    hiveId: 38,
    scenario: "ariza_coklu",
    label: "Arıza — IR + nem (kısmi mod)",
    ...BASE_GOOD,
    cameraPresent: true,
    middayIn: 0,
    middayOut: 0,
    humidity: 255,
    faults: ["ir", "humidity"],
    anaIrk: "Anadolu",
    babaIrk: "Kafkas",
  },

  {
    hiveId: 39,
    scenario: "ariza_ana_kamera",
    label: "Arıza — ana kamera (arılık)",
    ...BASE_GOOD,
    mainCameraPresent: true,
    fault: "mainCamera",
    konumId: "yayla-tortum",
    konumEtiket: "Yayla Tortum",
    konumTipi: "yayla",
  },

  // --- ana kaybı şüphesi ---
  {
    hiveId: 40,
    scenario: "ana_kaybi_suphesi",
    label: "Ana kaybı şüphesi",
    ...BASE_GOOD,
    weightKg: 27.8,
    tempC: 35.8,
    humidity: 62,
    middayIn: 420,
    middayOut: 880,
    vibration: 7,
    audioRms: 0.58,
    battery: 74,
    rssi: -80,
    referenceBeeCount: 30000,
    middayBeeOutRef: 880,
    queenless: true,
    anaIrk: "Kafkas",
    babaIrk: "Karniyol",
    anaDurum: "supheli",
  },
];

/** Kalite kovanlarına varsayılan Ana×Baba */
function withGenetics(list) {
  const map = {
    1: ["Kafkas", "Karniyol"],
    2: ["Karniyol", "Kafkas"],
    3: ["Kafkas", "Kafkas"],
    4: ["Karniyol", "Karniyol"],
    5: ["Kafkas", "Karniyol"],
    10: ["Kafkas", "Kafkas"],
    11: ["Karniyol", "Karniyol"],
    12: ["Anadolu", "Kafkas"],
    13: ["Kafkas", "Anadolu"],
    14: ["Karniyol", "Kafkas"],
    15: ["Kafkas", "Karniyol"],
    16: ["Kafkas", "Kafkas"],
    17: ["Karniyol", "Karniyol"],
    20: ["Kafkas", "Karniyol"],
    21: ["Karniyol", "Kafkas"],
    22: ["Kafkas", "Kafkas"],
    23: ["Karniyol", "Karniyol"],
    24: ["Anadolu", "Anadolu"],
    25: ["Kafkas", "Anadolu"],
    26: ["Karniyol", "Anadolu"],
  };
  return list.map((s) => {
    if (s.anaIrk && s.babaIrk) return s;
    const g = map[s.hiveId] || ["Bilinmiyor", "Bilinmiyor"];
    return { ...s, anaIrk: g[0], babaIrk: g[1] };
  });
}

function cornersFromWeight(weightKg, skewKg = 0) {
  const base = weightKg / 4;
  let corners;
  if (!skewKg) {
    corners = [
      Math.round(base * 100) / 100,
      Math.round(base * 100) / 100,
      Math.round(base * 100) / 100,
      Math.round(base * 100) / 100,
    ];
  } else {
    corners = [
      Math.round((base - skewKg / 2) * 100) / 100,
      Math.round((base - skewKg / 2) * 100) / 100,
      Math.round((base + skewKg / 2) * 100) / 100,
      Math.round((base + skewKg / 2) * 100) / 100,
    ];
  }
  const sum = corners.reduce((s, v) => s + v, 0);
  corners[3] = Math.round((corners[3] + weightKg - sum) * 100) / 100;
  return corners;
}

function trafficForProfile(profile, hour, progress = 1) {
  const scale = profile.springBroodBuildup ? 0.62 + 0.38 * progress : 1;
  const isMidday = hour >= 11 && hour < 15;
  if (!isMidday) {
    return {
      beeIn: Math.round(profile.middayIn * 0.08 * scale),
      beeOut: Math.round(profile.middayOut * 0.07 * scale),
    };
  }
  return {
    beeIn: Math.round(profile.middayIn * scale),
    beeOut: Math.round(profile.middayOut * scale),
  };
}

function buildSeries(profile, now) {
  const series = [];
  let w = profile.weightKg;
  const totalGain = profile.broodGainKg || 2.0;
  for (let i = 96; i >= 0; i--) {
    const progress = (96 - i) / 96;
    if (profile.weightDropLate && i <= 24) {
      w = profile.weightKg - ((24 - i) / 24) * 4.5;
    } else if (profile.fault === "scale") {
      w = 0;
    } else if (profile.springBroodBuildup) {
      w =
        profile.weightKg -
        totalGain +
        totalGain * progress +
        (Math.random() - 0.5) * 0.05;
    } else {
      w = profile.weightKg + (Math.random() - 0.5) * 0.06;
    }
    let tsMs = now - i * 15 * 60 * 1000;
    if (profile.fault === "offline" && i === 0) {
      tsMs = now - (profile.offlineHours || 5) * 3600 * 1000;
    }
    const ts = new Date(tsMs);
    const hour = (ts.getUTCHours() + 3 + 24) % 24;
    const { beeIn, beeOut } = trafficForProfile(profile, hour, progress);
    const weightKg = Math.round(w * 10) / 10;
    let tempC = profile.tempC;
    if (profile.tempTrend === "rising") {
      tempC = profile.tempC - 2 + progress * 2.5;
    } else if (profile.tempTrend === "falling") {
      tempC = profile.tempC + 1.5 - progress * 2;
    } else {
      const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 0.8;
      tempC = profile.tempC + diurnal + (Math.random() - 0.5) * 0.12;
    }
    tempC = Math.round(tempC * 10) / 10;
    const skipBroodProbe =
      profile.fault === "brood_probe" || profile.faults?.includes("brood_probe");
    const modelBrood = estimateBroodTempModel(
      { tempC, weightKg },
      { beeEstimate: profile.referenceBeeCount ?? 30000 }
    );
    const tempBroodC = skipBroodProbe
      ? undefined
      : profile.tempBroodC ?? modelBrood.tempBroodC;
    const loc = locationByIdOrEtiket(profile.konumEtiket);
    const lat =
      profile.lat ??
      loc.lat + ((profile.hiveId % 10) - 5) * 0.00006;
    const lon =
      profile.lon ??
      loc.lon + ((profile.hiveId % 7) - 3) * 0.00006;
    const reading = {
      hiveId: profile.hiveId,
      scenario: profile.scenario,
      scenarioLabel: profile.label,
      weightKg,
      tempC,
      ...(tempBroodC != null && { tempBroodC }),
      humidity: profile.humidity,
      beeIn: profile.fault === "ir" || profile.faults?.includes("ir") ? 0 : beeIn,
      beeOut: profile.fault === "ir" || profile.faults?.includes("ir") ? 0 : beeOut,
      cornerKg: cornersFromWeight(
        weightKg > 0 ? weightKg : 28,
        profile.cornerSkew || 0
      ),
      vibration: profile.vibration,
      audioRms: profile.audioRms,
      battery: profile.battery,
      rssi: profile.rssi,
      lat,
      lon,
      tiltDeg: profile.tiltDeg ?? 0,
      pitchDeg: profile.pitchDeg ?? (profile.tiltDeg ? profile.tiltDeg * 0.7 : 0),
      rollDeg: profile.rollDeg ?? (profile.tiltDeg ? profile.tiltDeg * 0.5 : 0),
      weatherStation: {
        present: true,
        rainMm:
          profile.rainMm ??
          (loc.weather?.condition === "yagmur" ? loc.weather?.precipMm ?? 3.2 : 0.1),
        solarW:
          profile.solarW ??
          (loc.weather?.condition === "acik" ? 620 : loc.weather?.condition === "bulutlu" ? 260 : 140),
        windKmh: profile.windKmh ?? loc.weather?.windKmh ?? 8,
        tempC: profile.outdoorTempC ?? loc.weather?.tempC ?? 22,
        humidityPct: profile.outdoorHumidityPct ?? 48,
      },
      solarChargeW:
        profile.solarChargeW ??
        (loc.weather?.condition === "acik" ? 4.2 : loc.weather?.condition === "bulutlu" ? 1.4 : 0.3),
      charging: profile.charging !== false,
      cellPresent: profile.cellPresent !== false,
      cellularRssi: profile.cellularRssi ?? -78,
      uplink: profile.uplink || "lora",
      cameraPresent: profile.cameraPresent !== false,
      cameraBeeIn: null,
      cameraBeeOut: null,
      mainCameraPresent: Boolean(profile.mainCameraPresent),
      transportMode: false,
      fault: profile.fault || null,
      faults: Array.isArray(profile.faults) ? profile.faults : profile.fault ? [profile.fault] : [],
      ts: ts.toISOString(),
    };
    series.push(reading);
  }
  for (let i = 0; i < series.length; i++) {
    fillReadingCameraCounts(series[i], series.slice(0, i + 1));
    fillReadingPollenLoad(series[i], {});
  }
  return series;
}

function buildMuayeneSeed(profile, now) {
  const daysAgo = profile.sonMuayeneGunOnce ?? 14;
  const entries = [
    {
      tarih: new Date(now - daysAgo * 86400000).toISOString(),
      tip: "muayene",
      not: profile.label || "Rutin kontrol",
    },
  ];
  if (daysAgo <= 30) {
    entries.push({
      tarih: new Date(now - (daysAgo + 18) * 86400000).toISOString(),
      tip: "muayene",
      not: "Yavru tablası — kapalı yavru normal",
    });
  }
  return entries;
}

function buildIlacSeed(profile, now) {
  const varroaDays = profile.sonMuayeneGunOnce != null && profile.sonMuayeneGunOnce > 35 ? 55 : 28;
  return [
    {
      ilac: "Varroa — oksalik asit",
      tarih: new Date(now - varroaDays * 86400000).toISOString(),
    },
  ];
}

function seed() {
  history.clear();
  latest.clear();
  hiveConfig.clear();
  hiveMeta.clear();
  alerts.length = 0;

  const now = Date.now();
  const scenarios = withGenetics(SCENARIOS);
  for (const profile of scenarios) {
    const series = buildSeries(profile, now);
    const lastReading = series[series.length - 1];
    history.set(profile.hiveId, series);
    latest.set(profile.hiveId, lastReading);
    const cornerSeed = lastReading?.cornerKg || cornersFromWeight(
      lastReading?.weightKg ?? profile.weightKg ?? 28,
      profile.cornerSkew || 0
    );
    const cornerOffsetsKg =
      suggestCornerOffsets(cornerSeed)?.cornerOffsetsKg ?? [0, 0, 0, 0];
    const calibDraft = {
      factoryCalibCert: true,
      calibTempC: 22,
      cornerOffsetsKg,
    };
    const broodDraft = {
      broodProbePresent: !(
        profile.fault === "brood_probe" || profile.faults?.includes("brood_probe")
      ),
      factoryProbeCert: true,
      broodProbeOffsetC: 0,
    };
    const mockColony = { beeEstimate: profile.referenceBeeCount ?? 30000 };
    hiveConfig.set(profile.hiveId, {
      tareKg: profile.tareKg,
      combKg: profile.combKg,
      referenceBeeCount: profile.referenceBeeCount,
      middayBeeOutRef: profile.middayBeeOutRef,
      ...calibDraft,
      ...broodDraft,
      referenceWeightKg: lastReading?.weightKg ?? profile.weightKg ?? 28,
      cornerCalibratedAt: new Date(now).toISOString(),
      referenceSingleSideKg: referenceSingleSideFromConfig(lastReading, calibDraft),
      singleSideValidatedAt: new Date(now).toISOString(),
      referenceBroodTempC: referenceBroodTempFromReading(lastReading, mockColony, broodDraft),
      broodProbeCalibratedAt: new Date(now).toISOString(),
      humSensorModel: "SHT31",
      factoryHumCert: true,
      referenceHumidityPct: lastReading?.humidity ?? profile.humidity ?? 55,
      humidityCalibratedAt: new Date(now).toISOString(),
      factoryMicCert: true,
      micMountIsolated: true,
      acousticLabeledSamples: 220,
      referenceAudioRms: lastReading?.audioRms ?? profile.audioRms ?? 0.32,
      acousticCalibratedAt: new Date(now).toISOString(),
      factoryVibCert: true,
      adxlFirmwareProd: true,
      vibrationLabeledEvents: 55,
      referenceVibration: lastReading?.vibration ?? profile.vibration ?? 3,
      vibrationCalibratedAt: new Date(now).toISOString(),
      factoryTiltCert: true,
      tiltMountStandard: true,
      tiltScenarioTests: 24,
      referenceTiltDeg: 0,
      tiltCalibratedAt: new Date(now).toISOString(),
      weatherStationBom: true,
      factoryWeatherCert: true,
      weatherFirmwareProd: true,
      weatherMountStandard: true,
      weatherNectarModel: true,
      weatherScenarioTests: 18,
      referenceRainMm: 0,
      referenceSolarW: 520,
      weatherCalibratedAt: new Date(now).toISOString(),
      cameraBom: true,
      factoryCameraCert: true,
      cameraFirmwareProd: true,
      cameraMountStandard: true,
      cameraYoloOnnx: true,
      cameraLabeledFrames: 520,
      cameraScenarioTests: 16,
      cameraCalibratedAt: new Date(now).toISOString(),
      flowerVisitBom: true,
      factoryFlowerCert: true,
      flowerFirmwareProd: true,
      flowerRoiStandard: true,
      flowerContractModel: true,
      flowerScenarioTests: 12,
      flowerVisitCalibratedAt: new Date(now).toISOString(),
      solarBatteryBom: true,
      factoryPowerCert: true,
      powerFirmwareProd: true,
      sleepModeModel: true,
      chargeEstimateModel: true,
      powerCalibratedAt: new Date(now).toISOString(),
      cellularBom: true,
      factoryCellularCert: true,
      cellularFirmwareProd: true,
      offlineBufferModel: true,
      loraFailoverModel: true,
      cellularCalibratedAt: new Date(now).toISOString(),
      loraBom: true,
      factoryLoraCert: true,
      loraFirmwareProd: true,
      loraRetryModel: true,
      lora4gFailover: true,
      loraCalibratedAt: new Date(now).toISOString(),
      factoryIrCert: true,
      irMountStandard: true,
      irCalibratedAt: new Date(now).toISOString(),
      ...LEAGUE_SW_DEFAULTS,
      calibrated: true,
      ...(profile.broodEmergencePerDay != null && {
        broodEmergencePerDay: profile.broodEmergencePerDay,
      }),
    });
    hiveMeta.set(profile.hiveId, {
      scenario: profile.scenario,
      label: profile.label,
      anaIrk: profile.anaIrk,
      babaIrk: profile.babaIrk,
      capraz: `Ana ${profile.anaIrk} × Baba ${profile.babaIrk}`,
      fault: profile.fault || null,
      queenless: Boolean(profile.queenless),
      anaDurum: profile.anaDurum || "var",
      konumId: profile.konumId || locationByIdOrEtiket(profile.konumEtiket).id,
      konumEtiket: profile.konumEtiket || "Ev",
      konumTipi: profile.konumTipi || "ev",
      lat: profile.lat,
      lon: profile.lon,
      beklenenLat: locationByIdOrEtiket(profile.konumEtiket).lat,
      beklenenLon: locationByIdOrEtiket(profile.konumEtiket).lon,
      tiltDeg: profile.tiltDeg ?? 0,
      sonMuayeneAt: new Date(
        now -
          (profile.sonMuayeneGunOnce != null ? profile.sonMuayeneGunOnce : 14) *
            86400000
      ).toISOString(),
      muayeneGunlugu: buildMuayeneSeed(profile, now),
      ilacGecmisi: buildIlacSeed(profile, now),
      pollination:
        profile.konumId === "yayla-tortum" || profile.konumEtiket === "Yayla Tortum"
          ? {
              aktif: true,
              urun: "Ayva",
              hektar: 12,
              ucretPerHiveGun: 85,
              hedefSkorPerHive: 65,
              bitisAt: new Date(now + 21 * 86400000).toISOString().slice(0, 10),
            }
          : null,
      petekYasYil: profile.petekYasYil ?? 2,
      petekEski: Boolean(profile.petekEski),
      petekTransferSon: Boolean(profile.petekTransferSon),
      anaYasAy: profile.anaYasAy ?? null,
      suKaynagiYakin: profile.suKaynagiYakin ?? true,
      kuraklikBolgesi: Boolean(profile.kuraklikBolgesi),
      yagmacilikSuphesi: Boolean(profile.yagmacilikSuphesi),
      pestisitSuphesi: Boolean(profile.pestisitSuphesi),
      hirsizlikSuphesi: Boolean(profile.hirsizlikSuphesi),
      fizikselHasar: Boolean(profile.fizikselHasar),
      kapiMod: profile.kapiMod || "otomatik",
      kapiMevcut: profile.kapiMevcut || "orta",
      kapiDonanim: profile.kapiDonanim || "plan",
      mainCameraAtLocation: Boolean(profile.mainCameraPresent),
    });
  }

  // Konum bazlı ana kamera: aynı arılıktaki tüm kovanlara yansıt
  for (const loc of LOCATIONS) {
    const anchor = [...hiveMeta.entries()].find(
      ([, m]) => m.konumId === loc.id && m.mainCameraAtLocation
    );
    if (!anchor) continue;
    for (const [id, m] of hiveMeta.entries()) {
      if (m.konumId === loc.id) {
        m.mainCameraAtLocation = true;
        const cur = latest.get(id);
        if (cur) {
          cur.mainCameraPresent = true;
          latest.set(id, cur);
        }
      }
    }
  }

  // Demo: yağmurda düşük IR — kovan 13 Tortum (profilde zaten ana kamera)
  const lowIr = latest.get(13);
  if (lowIr) {
    lowIr.mainCameraPresent = true;
    fillReadingCameraCounts(lowIr, history.get(13) || [], hiveConfig.get(13) || {});
    latest.set(13, lowIr);
    const m13 = hiveMeta.get(13);
    if (m13) {
      m13.konumId = "yayla-tortum";
      m13.konumEtiket = "Yayla Tortum";
      m13.konumTipi = "yayla";
      m13.mainCameraAtLocation = true;
    }
  }

  syncAllAlerts();
}


function colonyWithDisease(hiveId) {
  const series = history.get(hiveId) || [];
  const reading = latest.get(hiveId);
  const meta = hiveMeta.get(hiveId) || {};
  const base = colonyFor(hiveId);
  if (!base || !reading) return base;
  const weather = weatherForHive(hiveId, reading);
  return {
    ...base,
    ...analyzeDiseaseRisk(
      series,
      reading,
      base.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 },
      base.healthScore,
      base.beeEstimate,
      {
        precipMm: weather.precipMm,
        condition: weather.condition,
        queenlessSuspect: isQueenlessSuspect(reading, base, meta),
      }
    ),
  };
}

function syncAllAlerts() {
  const previousIds = new Set(alerts.map((a) => a.id));
  const next = syncAlertsFromHives(
    latest,
    colonyWithDisease,
    hiveMeta,
    weatherForHive,
    evaluateEntranceGate,
    applyGateState
  );
  const newAlerts = next.filter((a) => !previousIds.has(a.id));
  alerts.length = 0;
  alerts.push(...next);
  if (newAlerts.length && pushService.getConfig().enabled) {
    pushService.dispatchAlerts(newAlerts).catch((err) => {
      console.error("push dispatch:", err.message);
    });
  }
}

/** Alarm / skor → görev listesi (Öncelik 1–5) */
function buildTasks() {
  const tasks = [];
  const seen = new Set();

  for (const a of alerts) {
    const key = `${a.type}-${a.hiveId}-${a.fault || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let title = a.message;
    let code = `Öncelik ${a.priority ?? 5}`;

    if (a.type === "swarm_occurred") title = "Oğul gerçekleşti — ana kontrol";
    else if (a.type === "swarm_risk" && a.priority === 1) title = "Oğul alarm — müdahale";
    else if (a.type === "swarm_risk") title = "Oğul risk — süper / kat planla";
    else if (a.type === "bee_swarm_tier" && a.priority <= 2) title = "Kalabalık — kat / süper";
    else if (a.type === "sensor_fault") {
      const faultLabel =
        ({ offline: "çevrimdışı", scale: "tartı", temp: "sıcaklık", humidity: "nem", ir: "IR", vibration: "titreşim", camera: "kamera", audio: "mikrofon" }[
          a.fault
        ] || a.fault || "bilinmiyor");
      title = `Sensör arızası — ${faultLabel}`;
    }
    else if (a.type === "temp_high") title = a.title || "Aşırı sıcak — gölge / havalandır";
    else if (a.type === "temp_low") title = a.title || "Düşük sıcaklık — yalıtım / besleme";
    else if (a.type === "temp_rise") title = a.title || "Sıcaklık yükseliyor — kontrol";
    else if (a.type === "temp_drop") title = a.title || "Sıcaklık düşüyor — kontrol";
    else if (a.type === "gate_auto") title = "Giriş kapısı — otomatik ayar";
    else if (a.type === "humidity_high") title = a.title || "Aşırı nem — havalandır";
    else if (a.type === "humidity_low") title = a.title || "Düşük nem — yavru stresi";
    else if (a.type === "humidity_rise") title = a.title || "Nem yükseliyor — kontrol";
    else if (a.type === "low_battery") title = "Pil bitiyor — şarj / değiştir";
    else if (a.type === "imbalance") title = "Dengesizlik — platform düzelt";
    else if (a.type === "vibration") title = "Yüksek titreşim — kontrol";
    else if (a.type === "health_critical") title = "Sağlık kritik — yerinde bak";
    else if (a.type === "disease_risk" && a.priority <= 2) title = "Hastalık riski — muayene";
    else if (a.type === "disease_risk") title = "Hastalık riski — izle / kontrol";
    else if (a.type === "traffic_low") title = "Düşük IR trafik — kontrol";
    else if (a.type === "queenless") title = "Ana kaybı şüphesi — kontrol";

    const meta = hiveMeta.get(a.hiveId) || {};
    tasks.push({
      id: `task-${a.id}`,
      hiveId: a.hiveId,
      code,
      priority: a.priority ?? 5,
      title,
      detail: a.message,
      type: a.type,
      fault: a.fault || null,
      capraz: meta.capraz || null,
      scenarioLabel: meta.label || null,
      ts: a.ts,
      done: false,
    });
  }

      // Ana×Baba eksik → Öncelik 5
  for (const [hiveId, meta] of hiveMeta.entries()) {
    if (!meta.anaIrk || meta.anaIrk === "Bilinmiyor" || !meta.babaIrk || meta.babaIrk === "Bilinmiyor") {
      tasks.push({
        id: `task-genetics-${hiveId}`,
        hiveId,
        code: "Öncelik 5",
        priority: 5,
        title: "Ana / baba ırkı gir",
        detail: `Kovan ${hiveId} — genetik kayıt eksik`,
        type: "profile_incomplete",
        fault: null,
        capraz: meta.capraz || null,
        scenarioLabel: meta.label || null,
        ts: latest.get(hiveId)?.ts,
        done: false,
      });
    }

    const wx = weatherForHive(hiveId, latest.get(hiveId));
    for (const wt of wx.weatherTasks || []) {
      const key = `wx-${wt.type}-${hiveId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({
        id: `task-${key}`,
        hiveId,
        code: `Öncelik ${wt.priority}`,
        priority: wt.priority,
        title: wt.title,
        detail: `${wx.konumEtiket}: ${wx.label} · ${wx.tempC}°C · rüzgâr ${wx.windKmh} km/s`,
        type: `weather_${wt.type}`,
        fault: null,
        capraz: meta.capraz || null,
        scenarioLabel: meta.label || null,
        konumEtiket: wx.konumEtiket,
        ts: latest.get(hiveId)?.ts,
        done: false,
      });
    }

    const reading = latest.get(hiveId);
    const colony = colonyFor(hiveId);
    for (const ft of feedingTasksForHive(hiveId, reading, colony)) {
      const key = `${ft.key}-${hiveId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({
        id: `task-${key}`,
        hiveId,
        code: `Öncelik ${ft.priority}`,
        priority: ft.priority,
        title: ft.title,
        detail: ft.detail,
        type: "feeding",
        fault: null,
        capraz: meta.capraz || null,
        scenarioLabel: meta.label || null,
        konumEtiket: meta.konumEtiket || null,
        ts: reading?.ts,
        done: false,
      });
    }

    const weather = weatherForHive(hiveId, reading);
    const gate = evaluateEntranceGate(reading, colony, meta, weather);
    for (const y of gate.yapilacaklar || []) {
      if (y.oncelik > 2) continue;
      const key = `gate-${hiveId}-${y.ne.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push({
        id: `task-${key}`,
        hiveId,
        code: `Öncelik ${y.oncelik}`,
        priority: y.oncelik,
        title: `Giriş — ${y.ne}`,
        detail: `${gate.ariciya || ""} · ${y.neZaman}`,
        type: "gate",
        fault: null,
        capraz: meta.capraz || null,
        scenarioLabel: meta.label || null,
        konumEtiket: meta.konumEtiket || null,
        ts: reading?.ts,
        done: false,
      });
    }
  }

  tasks.sort((a, b) => a.priority - b.priority || a.hiveId - b.hiveId);
  return tasks;
}

function fakeSensors(hiveId, weightKg, beeIn, beeOut) {
  const base = weightKg / 4;
  return {
    cornerKg: [base, base, base, base].map((x) => Math.round(x * 100) / 100),
    vibration: 3,
    audioRms: 0.3,
    battery: 80,
    rssi: -80,
    cameraPresent: true,
    cameraBeeIn: null,
    cameraBeeOut: null,
    mainCameraPresent: false,
    transportMode: false,
  };
}

seed();

function hydrateFromDb() {
  dbService.initDb();
  const seedResult = dbService.seedTestRecordsIfMissing();
  const persisted = dbService.loadAllReadings();
  if (!persisted.length) return { ...seedResult, loaded: 0 };

  const byHive = new Map();
  for (const row of persisted) {
    const { dbId, label, note, ...reading } = row;
    const hiveId = reading.hiveId;
    if (!byHive.has(hiveId)) byHive.set(hiveId, []);
    byHive.get(hiveId).push({ ...reading, dbId, dbLabel: label });
  }

  for (const [hiveId, rows] of byHive) {
    if (!hiveMeta.has(hiveId)) {
      const first = rows[0];
      const rawLabel = first.scenarioLabel || first.dbLabel || `Kovan ${hiveId}`;
      hiveMeta.set(hiveId, {
        scenario: first.scenario || "persisted",
        label: normalizeScenarioLabel(rawLabel),
        anaIrk: "Karniyol",
        babaIrk: "Karniyol",
        capraz: "Veritabanı kaydı",
        konumId: "ev",
        konumEtiket: "Ev",
        konumTipi: "ev",
        anaDurum: "var",
        queenless: false,
        persisted: true,
      });
      hiveConfig.set(hiveId, {
        tareKg: 8,
        combKg: 18,
        referenceBeeCount: 35000,
        middayBeeOutRef: 900,
        cameraBom: true,
        factoryCameraCert: true,
        cameraFirmwareProd: true,
        cameraMountStandard: true,
        cameraYoloOnnx: true,
        cameraLabeledFrames: 520,
        cameraScenarioTests: 16,
        flowerVisitBom: true,
        factoryFlowerCert: true,
        flowerFirmwareProd: true,
        flowerRoiStandard: true,
        flowerContractModel: true,
        flowerScenarioTests: 12,
        solarBatteryBom: true,
        factoryPowerCert: true,
        powerFirmwareProd: true,
        sleepModeModel: true,
        chargeEstimateModel: true,
        cellularBom: true,
        factoryCellularCert: true,
        cellularFirmwareProd: true,
        offlineBufferModel: true,
        loraFailoverModel: true,
        loraBom: true,
        factoryLoraCert: true,
        loraFirmwareProd: true,
        loraRetryModel: true,
        lora4gFailover: true,
      });
    }

    const existing = history.get(hiveId) || [];
    const merged = [...existing];
    for (const r of rows) {
      const dup = merged.some(
        (m) => m.ts === r.ts && Math.abs(m.weightKg - r.weightKg) < 0.001
      );
      if (!dup) merged.push(r);
    }
    merged.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    if (merged.length > 200) merged.splice(0, merged.length - 200);
    history.set(hiveId, merged);
    latest.set(hiveId, merged[merged.length - 1]);
  }

  syncAllAlerts();
  return { ...seedResult, loaded: persisted.length, hives: byHive.size };
}

const dbBoot = hydrateFromDb();
seedLocationGroups();

function runMlNecessityCycle() {
  if (!mlLearningService.isLearningActive()) return { processed: 0 };
  let processed = 0;
  const hivePayloads = [];
  for (const reading of latest.values()) {
    const hiveId = reading.hiveId;
    const meta = hiveMeta.get(hiveId) || {};
    const colony = colonyFor(hiveId);
    if (!colony) continue;
    const health = colony.sensorHealth || assessSensorHealth(reading, meta);
    const scores = mlLearningService.computeSensorNecessity(reading, colony, health, meta);
    const cameraDecision = mlLearningService.evaluateCameraDecision(scores, reading);
    dbService.saveMlNecessitySnapshot({
      hiveId,
      scope: "hive",
      scores,
      cameraDecision,
      ts: reading.ts || new Date().toISOString(),
    });
    hivePayloads.push({
      hiveId,
      reading,
      colony,
      meta,
      sensorHealth: health,
      scenarioLabel: meta.label,
    });
    processed += 1;
  }
  if (hivePayloads.length) {
    mlLearningService.computeFleetNecessity(hivePayloads);
  }
  return { processed, fleet: hivePayloads.length };
}

function runMlLearningCycle({ proposalsOnly = true } = {}) {
  if (!mlLearningService.isLearningActive()) return { processed: 0 };
  let processed = 0;
  let proposals = 0;
  for (const reading of latest.values()) {
    const hiveId = reading.hiveId;
    const meta = hiveMeta.get(hiveId) || {};
    const colony = colonyFor(hiveId);
    if (!colony) continue;
    const health = colony.sensorHealth || assessSensorHealth(reading, meta);
    const weather = weatherForHive(hiveId, reading);
    const hiveCamera = analyzeHiveCamera(
      reading,
      colony,
      meta,
      weather,
      history.get(hiveId) || [],
      health,
      hiveConfig.get(hiveId) || {}
    );
    const result = mlLearningService.processHiveLearning(
      hiveId,
      reading,
      { ...colony, hiveCamera },
      meta,
      health,
      { forceProposal: proposalsOnly }
    );
    if (result?.proposalId) proposals += 1;
    processed += 1;
  }
  runMlNecessityCycle();
  return { processed, proposalsCreated: proposals };
}

setImmediate(() => {
  try {
    const r = runMlNecessityCycle();
    if (r.processed > 0) {
      console.log(`ML gereklilik: ${r.processed} kovan güncellendi (onay bekleyen referans yok)`);
    }
  } catch (e) {
    console.warn("ML başlangıç:", e.message);
  }
});

function hivesAtLocation(konumId) {
  const out = [];
  for (const reading of latest.values()) {
    const meta = hiveMeta.get(reading.hiveId) || {};
    const locId = meta.konumId || locationByIdOrEtiket(meta.konumEtiket).id;
    if (locId !== konumId) continue;
    const baseColony = analyzeColony(
      history.get(reading.hiveId) || [],
      reading,
      hiveConfig.get(reading.hiveId) || {}
    );
    out.push({
      reading,
      meta,
      colony: baseColony,
    });
  }
  return out.sort((a, b) => a.reading.hiveId - b.reading.hiveId);
}

function locationForMeta(meta) {
  const id = meta?.konumId || meta?.konumEtiket;
  const apiary = id ? apiaryLocationService.getApiary(id) : null;
  if (apiary) {
    return {
      id: apiary.id,
      etiket: apiary.etiket,
      tip: apiary.tip,
      lat: apiary.lat,
      lon: apiary.lon,
    };
  }
  return LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
}

function attachDeepInsights(hiveId, colony, reading, meta, weather) {
  const series = history.get(hiveId) || [];
  const cfg = hiveConfig.get(hiveId) || {};
  const scoresDeep = buildScoresDeep(series, reading, colony, meta, weather);
  const calibration = analyzeCalibrationQuality(series, reading, colony, cfg, meta);
  const metaInsights = analyzeMetaInsights(reading, colony, meta);
  const transport = analyzeTransport(reading, colony, meta, weather);
  const acousticMl = analyzeAcousticMl(series, reading, colony, meta, cfg);
  const harvest = analyzeHarvestTiming(series, reading, colony, { ...cfg, ...meta }, weather);
  const gpsTilt = analyzeGpsTilt(reading, meta, locationForMeta(meta), cfg);
  const inspectionJournal = analyzeInspectionJournal(colony, meta);
  const pollination = analyzePollinationRoi(reading, colony, meta, weather);
  const broodZone = analyzeBroodZone(reading, colony, cfg, meta);
  const winterStore = analyzeWinterStore(series, reading, colony, weather);
  const weatherStation = fuseWeatherStation(reading, weather, cfg);
  const weatherIndices = analyzeWeatherIndices(reading, colony, weather, weatherStation);
  const singleSideScale = analyzeSingleSideScale(reading, colony, cfg);
  const flowerVisit = analyzeFlowerVisit(
    series,
    reading,
    colony,
    weatherIndices,
    cfg,
    weather,
    meta
  );
  const robbing = analyzeRobbing(series, reading, colony, meta, acousticMl);
  const varroa = analyzeVarroaRisk(colony, meta, inspectionJournal, acousticMl);
  const queenlessFusion = analyzeQueenlessFusion(series, reading, colony, meta, acousticMl);
  const mlFleet = analyzeMlFleet(getFleetStats());
  const partial = {
    ...colony,
    scoresDeep,
    metaInsights,
    calibration,
    harvest,
    inspectionJournal,
    pollination,
    winterStore,
  };
  const healthyHive = analyzeHealthyHiveIndex(
    colony,
    weatherIndices,
    pollination,
    inspectionJournal,
    winterStore
  );
  const predictive = analyzePredictive(series, reading, partial, meta);
  const enriched = {
    ...colony,
    scoresDeep,
    calibration,
    metaInsights,
    predictive,
    weatherIndices,
    transport,
    acousticMl,
    harvest,
    gpsTilt,
    inspectionJournal,
    pollination,
    broodZone,
    winterStore,
    weatherStation,
    singleSideScale,
    flowerVisit,
    robbing,
    varroa,
    queenlessFusion,
    mlFleet,
    healthyHive,
  };
  attachLeagueSoftQualities(enriched, cfg);
  return enriched;
}

function colonyFor(hiveId) {
  const series = history.get(hiveId) || [];
  const cur = latest.get(hiveId);
  if (!cur) return null;
  const meta = hiveMeta.get(hiveId) || {};
  const cfg = hiveConfig.get(hiveId) || {};
  const reading = readingWithNormalizedCorners(cur, cfg);
  const weather = weatherForHive(hiveId, reading);
  const sensorHealth = assessSensorHealth(reading, meta);
  const base = analyzeColony(series, reading, cfg, sensorHealth);
  const withTemp = {
    ...base,
    temperature: analyzeTemperature(series, reading, base, weather, meta),
    humidity: analyzeHumidity(series, reading, base, weather, meta, sensorHealth, cfg),
    sensorHealth,
  };
  const withSensors = {
    ...withTemp,
    sensors: analyzeAllSensors(series, reading, withTemp, weather, meta, cfg, sensorHealth),
  };
  const hiveCam = analyzeHiveCamera(reading, withSensors, meta, weather, series, sensorHealth, cfg);
  const blended = blendCameraBeeEstimate({ ...withSensors, hiveCamera: hiveCam }, hiveCam);
  return attachDeepInsights(hiveId, blended, reading, meta, weather);
}

function statusFor(hiveId, reading, colony) {
  const meta = hiveMeta.get(hiveId) || {};
  const health = colony?.sensorHealth || assessSensorHealth(reading, meta);

  if (!health.available.connectivity) return "offline";
  if (hasCriticalFault(health)) return "fault";

  const ageMs = Date.now() - new Date(reading.ts).getTime();
  if (ageMs > SENSOR.OFFLINE_MS) return "offline";
  if (reading.battery < SENSOR.BATTERY_LOW_PCT) return "low_battery";
  if (colony?.swarmPhase === "occurred") return "alert";
  if (colony?.swarmPhase === "critical") return "alert";
  if (colony?.healthScore < SCORE.HEALTH_CRITICAL) return "alert";
  if (
    health.available.temp &&
    (reading.tempC >= SENSOR.TEMP_HIGH_C ||
      (health.available.vibration && reading.vibration >= SENSOR.VIBRATION_HIGH))
  ) {
    return "alert";
  }
  if (cornerImbalance(reading.cornerKg) >= SENSOR.CORNER_IMBALANCE_KG) return "watch";
  if (colony && colony.score < SCORE.COLONY_WEAK) return "weak";
  if (colony?.swarmPhase === "elevated") return "watch";
  if (health.mode === "degraded") return "degraded";
  return "ok";
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "hive-demo",
    mode: "scenario-mock",
    scenarios: withGenetics(SCENARIOS).length,
    evalConfig: "/api/eval-config",
    push: "/api/push/config",
    db: dbService.getStats(),
    ml: "/api/ml/config",
    admin: "/admin.html",
    export: "/api/export/dataset",
    dbBoot,
  });
});

/** Kalıcı veritabanı kayıtları */
app.get("/api/db/records", (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const stats = dbService.getStats();
  res.json({
    ...stats,
    records: dbService.listRecords(limit),
  });
});

/** ML — etiket tipleri ve model durumu */
app.get("/api/ml/config", (_req, res) => {
  res.json({
    ...mlModelService.getConfig(),
    db: dbService.getStats(),
    labelTypes: dbService.LABEL_TYPES,
  });
});

/** Muayene / olay etiketi (ML eğitim hedefi) */
app.get("/api/labels", (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  const limit = Math.min(500, Number(req.query.limit) || 100);
  res.json({
    labels: dbService.listLabels({
      hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
      eventType: req.query.eventType,
      since: req.query.since,
      limit,
    }),
    types: dbService.LABEL_TYPES,
  });
});

app.post("/api/labels", (req, res) => {
  const result = dbService.saveLabel(req.body || {});
  if (result.error) return res.status(400).json(result);
  const hiveId = result.label?.hiveId;
  if (hiveId != null) {
    try {
      runMlLearningCycle();
    } catch (_) {
      /* ignore */
    }
  }
  res.json(result);
});

/** —— Yönetici paneli (ML) —— */
app.get("/api/admin/ml/dashboard", requireAdmin, (_req, res) => {
  const hives = [...latest.values()].map((reading) => {
    const meta = hiveMeta.get(reading.hiveId) || {};
    const colony = colonyFor(reading.hiveId);
    return {
      hiveId: reading.hiveId,
      reading,
      colony,
      meta,
      sensorHealth: colony?.sensorHealth,
      scenarioLabel: meta.label,
    };
  });
  res.json(mlLearningService.getAdminDashboard(hives));
});

app.get("/api/admin/ml/learning", requireAdmin, (_req, res) => {
  res.json({
    ...mlLearningService.getLearningStatus(),
    log: dbService.listMlLearningLog(60),
  });
});

app.get("/api/admin/ml/references", requireAdmin, (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  res.json({
    records: dbService.listMlReferenceRecords({
      hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
      domain: req.query.domain,
      since: req.query.since,
      limit: Math.min(200, Number(req.query.limit) || 50),
    }),
    domains: mlLearningService.DOMAINS,
  });
});

app.get("/api/admin/ml/necessity", requireAdmin, (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  if (Number.isFinite(hiveId)) {
    const snap = dbService.getLatestMlNecessity(hiveId);
    return res.json({ scope: "hive", hiveId, snapshot: snap });
  }
  const fleet = dbService.getLatestMlNecessity(null);
  res.json({ scope: "fleet", snapshot: fleet });
});

app.get("/api/admin/ml/hardware-impact", requireAdmin, (_req, res) => {
  res.json({
    matrix: dbService.listMlHardwareImpact(),
    sensors: mlLearningService.SENSORS,
  });
});

app.get("/api/admin/ml/camera-decision", requireAdmin, (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  const snap = Number.isFinite(hiveId)
    ? dbService.getLatestMlNecessity(hiveId)
    : dbService.getLatestMlNecessity(null);
  res.json({
    hiveId: Number.isFinite(hiveId) ? hiveId : null,
    cameraDecision: snap?.cameraDecision,
    scores: snap?.scores,
    ts: snap?.ts,
  });
});

app.post("/api/admin/ml/learning/refresh", requireAdmin, (_req, res) => {
  const result = runMlLearningCycle({ proposalsOnly: true });
  res.json({ ok: true, ...result, note: "Referanslar onay kuyruğuna eklendi" });
});

app.get("/api/admin/ml/proposals", requireAdmin, (req, res) => {
  const status = req.query.status || "pending";
  res.json({
    proposals: mlApprovalService.listProposals({
      status: status === "all" ? undefined : status,
      hiveId: req.query.hiveId != null ? Number(req.query.hiveId) : undefined,
      limit: Math.min(100, Number(req.query.limit) || 50),
    }),
    pendingCount: dbService.countPendingMlProposals(),
    requiresApproval: mlApprovalService.requiresApproval(),
  });
});

app.get("/api/admin/ml/proposals/:id", requireAdmin, (req, res) => {
  const p = dbService.getMlProposal(Number(req.params.id));
  if (!p) return res.status(404).json({ error: "proposal_not_found" });
  res.json({ proposal: p });
});

app.post("/api/admin/ml/proposals/:id/approve", requireAdmin, (req, res) => {
  const result = mlApprovalService.applyProposal(
    Number(req.params.id),
    req.body?.reviewedBy || "admin"
  );
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/admin/ml/proposals/:id/reject", requireAdmin, (req, res) => {
  const result = mlApprovalService.rejectProposal(
    Number(req.params.id),
    req.body?.reviewedBy || "admin",
    req.body?.reason || null
  );
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get("/api/admin/ml/quality", requireAdmin, (_req, res) => {
  const stats = dbService.getStats();
  const mlStats = dbService.getMlStats();
  const coverage = {};
  for (const t of dbService.LABEL_TYPES) {
    coverage[t] = dbService.listLabels({ eventType: t, limit: 1000 }).length;
  }
  res.json({
    readings: stats.readings,
    labels: stats.labels,
    ml: mlStats,
    labelCoverage: coverage,
    labelRatio:
      stats.readings?.total > 0
        ? Math.round((stats.labels.total / stats.readings.total) * 1000) / 10
        : 0,
  });
});

app.get("/api/export/dataset", (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  const format = (req.query.format || "json").toLowerCase();
  const data = dbService.exportDataset({
    hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
    since: req.query.since,
    until: req.query.until,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  if (format === "csv") {
    const readingsCsv = dbService.readingsToCsv(
      dbService.loadAllReadings({
        hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
        since: req.query.since,
        until: req.query.until,
      })
    );
    const labelsCsv = dbService.labelsToCsv(data.labels);
    res.type("text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="koloni-readings.csv"'
    );
    return res.send(
      `# labels below (event_type = ML target)\n${labelsCsv}\n\n# readings\n${readingsCsv}`
    );
  }

  res.json(data);
});

app.get("/api/export/readings", (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  const format = (req.query.format || "json").toLowerCase();
  const readings = dbService.loadAllReadings({
    hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
    since: req.query.since,
    until: req.query.until,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  if (format === "csv") {
    res.type("text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="koloni-readings.csv"'
    );
    return res.send(dbService.readingsToCsv(readings));
  }
  res.json({ exportedAt: new Date().toISOString(), readings: readings.map((r) => dbService.flattenReading(r)) });
});

app.get("/api/export/labels", (req, res) => {
  const hiveId = req.query.hiveId != null ? Number(req.query.hiveId) : undefined;
  const format = (req.query.format || "json").toLowerCase();
  const labels = dbService.listLabels({
    hiveId: Number.isFinite(hiveId) ? hiveId : undefined,
    since: req.query.since,
    limit: 50000,
  });
  if (format === "csv") {
    res.type("text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="koloni-labels.csv"'
    );
    return res.send(dbService.labelsToCsv(labels));
  }
  res.json({ exportedAt: new Date().toISOString(), labels });
});

/** Sensör değerlendirme eşikleri (tek kaynak özeti) */
/** Analiz kataloğu — yeni analiz: packages/shared/analysisRegistry.js */
app.get("/api/analyses", (_req, res) => {
  const counts = countAnalyses();
  const hives = [...latest.values()].map((r) =>
    hivePayload(r, hiveMeta.get(r.hiveId) || {})
  );
  const fleet = hives.map((h) => statusForHive(h));
  const ortalamaCalisti =
    fleet.length > 0
      ? Math.round(fleet.reduce((s, f) => s + f.calisti, 0) / fleet.length)
      : 0;
  const toplamUyari = fleet.reduce((s, f) => s + f.uyari, 0);

  res.json({
    ...counts,
    katmanLabel: KATMAN_LABEL,
    durumLabel: DURUM_LABEL,
    analizler: ANALYSES,
    fleet: {
      kovanSayisi: hives.length,
      ortalamaCalisti,
      toplamUyari,
    },
    doc: "docs/ozellikler/analiz/KATALOG.md",
    yeniAnaliz: "packages/shared/analysisRegistry.js içine kayıt ekle",
  });
});

app.get("/api/hives/:id/analyses", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur) return res.status(404).json({ error: "hive_not_found" });
  const meta = hiveMeta.get(id) || {};
  res.json(statusForHive(hivePayload(cur, meta)));
});

app.get("/api/eval-config", (_req, res) => {
  const {
    SENSOR: S,
    SWARM,
    SCORE,
    FEEDING,
    BROOD,
    WEATHER,
    BEE_SWARM_TIERS,
    SWARM_DROP_6H_KG,
    SWARM_DROP_24H_KG,
    RISK,
    TEMP,
    HUM,
    IR,
  } = require("../../../packages/shared/constants");
  res.json({
    source: "packages/shared/constants.js",
    doc: "docs/ozellikler/sensorler/degerlendirme.md",
    sensor: S,
    swarm: { ...SWARM, drop6hKg: SWARM_DROP_6H_KG, drop24hKg: SWARM_DROP_24H_KG },
    score: SCORE,
    feeding: FEEDING,
    brood: BROOD,
    weather: WEATHER,
    risk: RISK,
    temp: TEMP,
    hum: HUM,
    ir: IR,
    beeSwarmTiers: BEE_SWARM_TIERS,
    pipeline: [
      "ingest → history",
      "analyzeColony → skorlar",
      "evaluateHiveState → evaluation.durumlar + riskKategorileri",
      "alertEngine.buildHiveAlerts → uyarılar",
      "buildTasks → görevler",
    ],
    stateDimensions: [
      "saglik",
      "sicaklik",
      "hastalikRiski",
      "koloni",
      "koloniGucu",
      "ariSayisi",
      "ogulRiski",
      "ogulDurumu",
      "ana",
      "anaOgul",
      "yavru",
      "besleme",
      "sensor",
      "operasyon",
      "kayit",
    ],
    riskCategories: [
      "biyolojik",
      "cevresel",
      "yonetimsel",
      "kimyasal_dis",
    ],
    riskDoc: "docs/ozellikler/skorlar/risk-kategorileri.md",
  });
});

app.get("/api/scenarios", (_req, res) => {
  res.json({
    scenarios: withGenetics(SCENARIOS).map((s) => ({
      hiveId: s.hiveId,
      scenario: s.scenario,
      label: s.label,
      anaIrk: s.anaIrk,
      babaIrk: s.babaIrk,
      fault: s.fault || null,
    })),
  });
});

app.get("/api/tasks", (_req, res) => {
  res.json({ tasks: buildTasks() });
});

app.get("/api/locations", (_req, res) => {
  res.json({
    locations: apiaryLocationService.listApiaries().map((a) => ({
      id: a.id,
      etiket: a.etiket,
      tip: a.tip,
      lat: a.lat,
      lon: a.lon,
      konumKaynak: a.konumKaynak,
      gpsModulePresent: a.gpsModulePresent,
      durum: a.durum,
      guzergah: a.guzergah,
    })),
    note: "Öncelik: kovan GPS → grup GPS → arılık GPS → manuel; GPS zorunlu değil",
  });
});

app.get("/api/apiaries", (_req, res) => {
  res.json({
    apiaries: apiaryLocationService.listApiaries(),
    note: "Merkez GPS veya manuel; taşınma güzergahı destekli",
  });
});

app.post("/api/apiaries", (req, res) => {
  const apiary = apiaryLocationService.upsertApiary(req.body || {});
  res.status(201).json({ ok: true, apiary });
});

app.patch("/api/apiaries/:id", (req, res) => {
  const prev = apiaryLocationService.getApiary(req.params.id);
  if (!prev) return res.status(404).json({ error: "apiary_not_found" });
  const apiary = apiaryLocationService.upsertApiary({ ...req.body, id: req.params.id });
  res.json({ ok: true, apiary });
});

app.post("/api/apiaries/:id/gps", (req, res) => {
  const result = apiaryLocationService.ingestApiaryGps(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  syncAllAlerts();
  res.json(result);
});

app.post("/api/apiaries/:id/transport/start", (req, res) => {
  const result = apiaryLocationService.startTransport(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  const hiveIds = result.apiary?.tasima?.hiveIds || [];
  for (const hiveId of hiveIds) {
    if (!latest.has(hiveId)) continue;
    const meta = hiveMeta.get(hiveId) || {};
    meta.transportMode = true;
    meta.tasindiAt = new Date().toISOString();
    meta.tasimaGuzergah = result.apiary.guzergah;
    hiveMeta.set(hiveId, meta);
    const reading = latest.get(hiveId);
    if (reading) {
      reading.transportMode = true;
      latest.set(hiveId, reading);
    }
  }
  syncAllAlerts();
  res.json(result);
});

app.post("/api/apiaries/:id/transport/complete", (req, res) => {
  const result = apiaryLocationService.completeTransport(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  const hiveIds = result.apiary?.tasima?.hiveIds || [];
  const hedefId = result.apiary?.id;
  for (const hiveId of hiveIds) {
    if (!latest.has(hiveId)) continue;
    const meta = hiveMeta.get(hiveId) || {};
    meta.transportMode = false;
    meta.konumId = hedefId;
    meta.konumEtiket = result.apiary.etiket;
    meta.konumTipi = result.apiary.tip;
    meta.beklenenLat = result.apiary.lat;
    meta.beklenenLon = result.apiary.lon;
    meta.tasindiAt = new Date().toISOString();
    hiveMeta.set(hiveId, meta);
    const reading = latest.get(hiveId);
    if (reading) {
      reading.transportMode = false;
      latest.set(hiveId, reading);
    }
  }
  syncAllAlerts();
  res.json(result);
});

app.get("/api/groups", (_req, res) => {
  res.json({
    groups: apiaryLocationService.listGroups(),
    note: "Grupta bir kovana GPS yeter — diğerleri miras alır; yoksa arılık → manuel",
  });
});

app.post("/api/groups", (req, res) => {
  const group = apiaryLocationService.upsertGroup(req.body || {});
  for (const hid of group.hiveIds || []) {
    const meta = hiveMeta.get(hid);
    if (meta) {
      meta.groupId = group.id;
      if (group.apiaryId) {
        const a = apiaryLocationService.getApiary(group.apiaryId);
        if (a) {
          meta.konumId = a.id;
          meta.konumEtiket = a.etiket;
          meta.konumTipi = a.tip;
        }
      }
      hiveMeta.set(hid, meta);
    }
  }
  res.status(201).json({ ok: true, group });
});

app.patch("/api/groups/:id", (req, res) => {
  const prev = apiaryLocationService.getGroup(req.params.id);
  if (!prev) return res.status(404).json({ error: "group_not_found" });
  const group = apiaryLocationService.upsertGroup({ ...req.body, id: req.params.id });
  res.json({ ok: true, group });
});

app.post("/api/groups/:id/assign", (req, res) => {
  const hiveIds = Array.isArray(req.body?.hiveIds) ? req.body.hiveIds.map(Number) : [];
  const result = apiaryLocationService.assignHivesToGroup(req.params.id, hiveIds);
  if (result.error) return res.status(400).json(result);
  const group = result.group;
  for (const hid of hiveIds) {
    const meta = hiveMeta.get(hid) || {};
    meta.groupId = group.id;
    if (group.apiaryId) {
      const a = apiaryLocationService.getApiary(group.apiaryId);
      if (a) {
        meta.konumId = a.id;
        meta.konumEtiket = a.etiket;
        meta.konumTipi = a.tip;
        meta.beklenenLat = a.lat;
        meta.beklenenLon = a.lon;
      }
    }
    hiveMeta.set(hid, meta);
  }
  syncAllAlerts();
  res.json(result);
});

app.post("/api/groups/:id/transport/start", (req, res) => {
  const result = apiaryLocationService.startGroupTransport(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  for (const hiveId of result.group.hiveIds || []) {
    if (!latest.has(hiveId)) continue;
    const meta = hiveMeta.get(hiveId) || {};
    meta.transportMode = true;
    meta.tasimaGuzergah = result.group.guzergah;
    meta.groupId = result.group.id;
    hiveMeta.set(hiveId, meta);
  }
  syncAllAlerts();
  res.json(result);
});

app.post("/api/groups/:id/transport/complete", (req, res) => {
  const result = apiaryLocationService.completeGroupTransport(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  const hedefId = req.body?.hedefKonumId || result.group.apiaryId;
  const a = hedefId ? apiaryLocationService.getApiary(hedefId) : null;
  for (const hiveId of result.group.hiveIds || []) {
    if (!latest.has(hiveId)) continue;
    const meta = hiveMeta.get(hiveId) || {};
    meta.transportMode = false;
    if (a) {
      meta.konumId = a.id;
      meta.konumEtiket = a.etiket;
      meta.konumTipi = a.tip;
      meta.beklenenLat = a.lat;
      meta.beklenenLon = a.lon;
    }
    hiveMeta.set(hiveId, meta);
  }
  syncAllAlerts();
  res.json(result);
});

app.post("/api/hives/:id/gps", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const result = apiaryLocationService.ingestHiveGps(id, req.body || {});
  if (result.error) return res.status(400).json(result);
  const meta = hiveMeta.get(id) || {};
  meta.gpsModulePresent = true;
  if (req.body?.lat != null) {
    meta.lat = Number(req.body.lat);
    meta.lon = Number(req.body.lon);
  }
  hiveMeta.set(id, meta);
  const reading = latest.get(id);
  if (reading && req.body?.lat != null) {
    reading.lat = Number(req.body.lat);
    reading.lon = Number(req.body.lon);
    latest.set(id, reading);
  }
  syncAllAlerts();
  res.json(result);
});

app.post("/api/hives/:id/konum/manual", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const { lat, lon } = req.body || {};
  if (lat == null || lon == null) return res.status(400).json({ error: "lat_lon_required" });
  const row = apiaryLocationService.setHiveManual(id, { lat, lon });
  const meta = hiveMeta.get(id) || {};
  meta.beklenenLat = Number(lat);
  meta.beklenenLon = Number(lon);
  meta.lat = Number(lat);
  meta.lon = Number(lon);
  hiveMeta.set(id, meta);
  syncAllAlerts();
  res.json({
    ok: true,
    hiveGps: row,
    resolved: apiaryLocationService.resolveHiveLocation({ ...meta, hiveId: id }, latest.get(id)),
  });
});

app.post("/api/hives/konum/bulk", (req, res) => {
  const b = req.body || {};
  const hiveIds = Array.isArray(b.hiveIds) ? b.hiveIds.map(Number) : [];
  const loc = locationByIdOrEtiket(b.konumId || b.konumEtiket || b.etiket);
  const apiary = apiaryLocationService.getApiary(loc.id);
  const groupId = b.groupId || null;
  if (groupId) {
    apiaryLocationService.assignHivesToGroup(groupId, hiveIds);
  }
  const updated = [];
  for (const id of hiveIds) {
    if (!latest.has(id)) continue;
    const meta = hiveMeta.get(id) || {};
    meta.konumId = loc.id;
    meta.konumEtiket = loc.etiket || apiary?.etiket;
    meta.konumTipi = loc.tip || apiary?.tip;
    meta.beklenenLat = apiary?.lat ?? loc.lat;
    meta.beklenenLon = apiary?.lon ?? loc.lon;
    if (groupId) meta.groupId = groupId;
    meta.tasindiAt = new Date().toISOString();
    hiveMeta.set(id, meta);
    updated.push(id);
  }
  syncAllAlerts();
  res.json({
    ok: true,
    updated,
    konumId: loc.id,
    konumEtiket: loc.etiket,
    groupId: groupId || null,
    konumKaynak: apiary?.konumKaynak || "manuel",
    gpsModulePresent: Boolean(apiary?.gpsModulePresent),
  });
});

app.get("/api/weather", (req, res) => {
  const q = req.query.konum || req.query.konumId || req.query.etiket || "ev";
  const loc = locationByIdOrEtiket(String(q));
  const apiary = apiaryLocationService.getApiary(loc.id);
  res.json({
    konumId: loc.id,
    konumEtiket: loc.etiket,
    konumTipi: loc.tip,
    lat: apiary?.lat ?? loc.lat,
    lon: apiary?.lon ?? loc.lon,
    konumKaynak: apiary?.konumKaynak || "manuel",
    source: "konum",
    ...(loc.weather || {}),
  });
});

app.patch("/api/hives/:id/konum", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const b = req.body || {};
  const loc = locationByIdOrEtiket(b.konumId || b.konumEtiket || b.etiket);
  const apiary = apiaryLocationService.getApiary(loc.id);
  const meta = hiveMeta.get(id) || {};
  meta.konumId = loc.id;
  meta.konumEtiket = loc.etiket || apiary?.etiket;
  meta.konumTipi = loc.tip || apiary?.tip;
  meta.beklenenLat = apiary?.lat ?? loc.lat;
  meta.beklenenLon = apiary?.lon ?? loc.lon;
  meta.tasindiAt = new Date().toISOString();
  hiveMeta.set(id, meta);
  syncAllAlerts();
  const reading = latest.get(id);
  const resolved = apiaryLocationService.resolveHiveLocation(
    { ...meta, hiveId: id },
    reading
  );
  res.json({
    ok: true,
    hiveId: id,
    konumId: loc.id,
    konumEtiket: meta.konumEtiket,
    konumTipi: meta.konumTipi,
    tasindiAt: meta.tasindiAt,
    apiaryLocation: resolved,
    weather: weatherForHive(id, reading),
  });
});

app.get("/api/hives/:id/camera", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur) return res.status(404).json({ error: "hive_not_found" });
  const meta = hiveMeta.get(id) || {};
  const payload = hivePayload(cur, meta);
  res.json({
    hiveId: id,
    hiveCamera: payload.hiveCamera,
    apiaryCamera:
      payload.apiaryCamera?.mod && payload.apiaryCamera.mod !== "off"
        ? payload.apiaryCamera
        : null,
    colony: {
      beeEstimate: payload.colony?.beeEstimate,
      beeEstimateSource: payload.colony?.beeEstimateSource,
      cameraBoost: payload.colony?.cameraBoost,
    },
  });
});

app.get("/api/hives/:id/camera/snapshot", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur?.cameraPresent) return res.status(404).json({ error: "camera_not_present" });
  fillReadingCameraCounts(cur, history.get(id) || [], hiveConfig.get(id) || {});
  const svg = hiveSnapshotSvg(id, cur.cameraBeeIn ?? 0, cur.cameraBeeOut ?? 0, hiveMeta.get(id)?.label);
  res.redirect(302, svg);
});

app.get("/api/locations/:id/camera", (req, res) => {
  const konumId = req.params.id;
  const loc = locationByIdOrEtiket(konumId);
  if (!loc) return res.status(404).json({ error: "location_not_found" });
  const hives = hivesAtLocation(loc.id);
  const sample = hives[0];
  const weather = sample
    ? weatherForHive(sample.reading.hiveId, sample.reading)
    : { konumEtiket: loc.etiket, ...loc.weather };
  res.json({
    konumId: loc.id,
    konumEtiket: loc.etiket,
    apiaryCamera: analyzeApiaryCamera(loc.id, weather, hives),
    hives: hives.map((h) => ({
      hiveId: h.reading.hiveId,
      cameraPresent: h.reading.cameraPresent,
      beeOut: h.reading.beeOut,
    })),
  });
});

app.get("/api/locations/:id/camera/snapshot", (req, res) => {
  const loc = locationByIdOrEtiket(req.params.id);
  if (!loc) return res.status(404).json({ error: "location_not_found" });
  const hives = hivesAtLocation(loc.id);
  const w = hives[0]
    ? weatherForHive(hives[0].reading.hiveId, hives[0].reading)
    : { konumEtiket: loc.etiket, condition: loc.weather?.condition || "acik" };
  const svg = apiarySnapshotSvg(
    w.konumEtiket || loc.etiket,
    hives.length || 8,
    w.condition || "acik"
  );
  res.redirect(302, svg);
});

app.get("/api/locations/:id/fusion", (req, res) => {
  const loc = locationByIdOrEtiket(req.params.id);
  if (!loc) return res.status(404).json({ error: "location_not_found" });
  const hives = hivesAtLocation(loc.id);
  const sample = hives[0];
  const weather = sample
    ? weatherForHive(sample.reading.hiveId, sample.reading)
    : { konumEtiket: loc.etiket, ...loc.weather };
  const apiaryCamera = analyzeApiaryCamera(loc.id, weather, hives);
  res.json({
    konumId: loc.id,
    konumEtiket: loc.etiket,
    apiaryFusion: fuseApiaryNarrative(loc.id, loc.etiket, weather, hives, apiaryCamera),
  });
});

app.patch("/api/hives/:id/kapi", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const b = req.body || {};
  const meta = hiveMeta.get(id) || {};
  if (b.mod === "otomatik" || b.mod === "manuel") meta.kapiMod = b.mod;
  if (b.hedef && ["acik", "orta", "dar", "kapali"].includes(b.hedef)) {
    meta.kapiHedef = b.hedef;
    if (meta.kapiMod === "manuel") {
      meta.kapiMevcut = b.hedef;
      meta.kapiSonDegisim = new Date().toISOString();
    }
  }
  if (b.not != null) meta.kapiManuelNot = String(b.not).slice(0, 120);
  hiveMeta.set(id, meta);
  syncAllAlerts();
  const reading = latest.get(id);
  res.json({
    ok: true,
    hiveId: id,
    entranceGate: hivePayload(reading, meta).entranceGate,
  });
});

function hivePayload(reading, meta) {
  const weather = weatherForHive(reading.hiveId, reading);
  const colony = colonyWithDisease(reading.hiveId);
  const evaluation = evaluateHiveState(reading, colony, { ...meta, weather });
  const entranceGate = evaluateEntranceGate(reading, colony, meta, weather);
  const { LABELS: gateLabels } = require("./services/entranceGate");
  entranceGate.mevcut = meta.kapiMevcut || entranceGate.mevcut;
  entranceGate.mevcutLabel =
    gateLabels[entranceGate.mevcut] || entranceGate.mevcutLabel;
  const hiveCamera = analyzeHiveCamera(
    reading,
    colony,
    meta,
    weather,
    history.get(reading.hiveId) || [],
    colony?.sensorHealth,
    hiveConfig.get(reading.hiveId) || {}
  );
  const konumId = meta.konumId || weather.konumId;
  const locHives = hivesAtLocation(konumId);
  const apiaryCamera = analyzeApiaryCamera(konumId, weather, locHives);
  const sensorFusion = fuseHiveNarrative(reading, colony, meta, weather, {
    entranceGate,
    hiveCamera,
    evaluation,
    sensorHealth: colony?.sensorHealth,
  });
  patchEvaluationDurumlar(evaluation, colony, sensorFusion);
  const konumEtiket = meta.konumEtiket || weather.konumEtiket || "Ev";
  const apiaryFusion = fuseApiaryNarrative(
    konumId,
    konumEtiket,
    weather,
    locHives,
    apiaryCamera
  );
  const apiaryPollination = analyzeApiaryPollination(
    konumId,
    konumEtiket,
    locHives,
    weather
  );
  const securityCamera = analyzeSecurityCameras(
    reading,
    colony,
    meta,
    weather,
    hiveCamera,
    apiaryCamera
  );
  const sensorHealth = colony?.sensorHealth || assessSensorHealth(reading, meta);
  const cfg = hiveConfig.get(reading.hiveId) || {};
  const normalizedReading = readingWithNormalizedCorners(reading, cfg);
  const cornerScale = analyzeCornerScaleCalibration(cfg, normalizedReading);
  const payload = {
    ...reading,
    cornerKg: normalizedReading.cornerKg,
    cornerKgRaw: normalizedReading.cornerKgRaw ?? reading.cornerKg,
    scenario: meta.scenario,
    scenarioLabel: meta.label,
    anaIrk: meta.anaIrk,
    babaIrk: meta.babaIrk,
    capraz: meta.capraz,
    anaDurum: meta.anaDurum || "var",
    queenlessSuspect:
      evaluation.durumlar?.ana?.suspect ||
      meta.anaDurum === "supheli" ||
      meta.anaDurum === "yok",
    konumId: meta.konumId || weather.konumId,
    konumEtiket: meta.konumEtiket || "Ev",
    konumTipi: meta.konumTipi || "ev",
    apiaryLocation: apiaryLocationService.resolveHiveLocation(
      { ...meta, hiveId: reading.hiveId },
      reading
    ),
    weather,
    colony,
    evaluation,
    entranceGate,
    hiveCamera,
    apiaryCamera,
    sensorFusion,
    apiaryFusion,
    apiaryPollination,
    securityCamera,
    sensorHealth,
    status: statusFor(reading.hiveId, reading, colony),
  };
  payload.hardwareIntegrity = hardwareIntegrityService.evaluateHardwareIntegrity(payload);
  payload.cornerScale = cornerScale;
  payload.hiveConfig = cfg;
  attachLeagueSoftQualities(payload, cfg);
  if (payload.colony) attachLeagueSoftQualities(payload.colony, cfg);
  const baseline = hiveBaselineService.getBaseline(reading.hiveId);
  const revision = hiveBaselineService.getRevision(
    reading.hiveId,
    reading,
    colony,
    hiveConfig.get(reading.hiveId) || {}
  );
  payload.baseline = baseline
    ? {
        ts: baseline.ts,
        source: baseline.source,
        scores: baseline.scores,
        sessionId: baseline.sessionId,
      }
    : null;
  payload.scoreRevision = revision.revision;
  return payload;
}

app.get("/api/hives", (_req, res) => {
  const list = [...latest.values()].map((r) => {
    const meta = hiveMeta.get(r.hiveId) || {};
    return hivePayload(r, meta);
  });
  list.sort((a, b) => a.hiveId - b.hiveId);
  res.json({ hives: list });
});

app.get("/api/hives/:id", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur) return res.status(404).json({ error: "hive_not_found" });
  const colony = colonyFor(id);
  const meta = hiveMeta.get(id) || {};
  res.json({
    hive: hivePayload(cur, meta),
    history: history.get(id) || [],
    config: hiveConfig.get(id) || {},
    status: statusFor(id, cur, colonyFor(id)),
  });
});

app.get("/api/integrity/matrix", (_req, res) => {
  res.json({
    packages: hardwareIntegrityService.PACKAGE,
    matrix: hardwareIntegrityService.getPackageImpactMatrix(),
  });
});

app.get("/api/hives/:id/integrity", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur) return res.status(404).json({ error: "hive_not_found" });
  const meta = hiveMeta.get(id) || {};
  const hive = hivePayload(cur, meta);
  res.json({
    hiveId: id,
    integrity: hive.hardwareIntegrity,
    matrix: hardwareIntegrityService.getPackageImpactMatrix(),
  });
});

app.get("/api/admin/integrity/fleet", requireAdmin, (_req, res) => {
  const hives = [...latest.values()].map((r) => hivePayload(r, hiveMeta.get(r.hiveId) || {}));
  res.json(hardwareIntegrityService.evaluateFleetIntegrity(hives));
});

app.post("/api/hives/:id/calibrate", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });

  const b = req.body || {};
  const prev = hiveConfig.get(id) || {};
  const reading = latest.get(id);

  let cornerOffsetsKg = b.cornerOffsetsKg;
  if (b.autoCornerCalibrate && Array.isArray(reading?.cornerKg)) {
    const suggested = suggestCornerOffsets(reading.cornerKg);
    if (suggested) cornerOffsetsKg = suggested.cornerOffsetsKg;
  }

  let referenceSingleSideKg = b.referenceSingleSideKg;
  const draftCfg = {
    ...prev,
    ...(Array.isArray(cornerOffsetsKg) &&
      cornerOffsetsKg.length === 4 && { cornerOffsetsKg: cornerOffsetsKg.map(Number) }),
    ...(b.calibTempC != null && { calibTempC: Number(b.calibTempC) }),
    ...(b.calibTempC == null &&
      reading?.tempC != null &&
      (b.autoCornerCalibrate || cornerOffsetsKg) && { calibTempC: Number(reading.tempC) }),
    factoryCalibCert: prev.factoryCalibCert ?? true,
  };
  if (
    (b.autoSingleSideCalibrate || b.autoCornerCalibrate) &&
    Array.isArray(reading?.cornerKg) &&
    referenceSingleSideKg == null
  ) {
    referenceSingleSideKg = referenceSingleSideFromConfig(reading, draftCfg);
  }

  let referenceBroodTempC = b.referenceBroodTempC;
  const broodDraftCfg = {
    ...prev,
    ...draftCfg,
    broodProbePresent: b.broodProbePresent != null ? Boolean(b.broodProbePresent) : prev.broodProbePresent ?? true,
    broodProbeOffsetC: b.broodProbeOffsetC != null ? Number(b.broodProbeOffsetC) : prev.broodProbeOffsetC ?? 0,
    factoryProbeCert: b.factoryProbeCert != null ? Boolean(b.factoryProbeCert) : prev.factoryProbeCert ?? true,
  };
  if (
    (b.autoBroodProbeCalibrate || b.autoCornerCalibrate) &&
    reading &&
    referenceBroodTempC == null
  ) {
    const colonyDraft = colonyFor(id) || { beeEstimate: prev.referenceBeeCount ?? 30000 };
    referenceBroodTempC = referenceBroodTempFromReading(reading, colonyDraft, broodDraftCfg);
  }

  const next = {
    ...prev,
    ...(b.tareKg != null && { tareKg: Number(b.tareKg) }),
    ...(b.combKg != null && { combKg: Number(b.combKg) }),
    ...(b.referenceBeeCount != null && {
      referenceBeeCount: Number(b.referenceBeeCount),
    }),
    ...(b.middayBeeOut != null && { middayBeeOutRef: Number(b.middayBeeOut) }),
    ...(Array.isArray(cornerOffsetsKg) &&
      cornerOffsetsKg.length === 4 && {
        cornerOffsetsKg: cornerOffsetsKg.map(Number),
      }),
    ...(b.calibTempC != null && { calibTempC: Number(b.calibTempC) }),
    ...(b.calibTempC == null &&
      reading?.tempC != null &&
      (b.autoCornerCalibrate || cornerOffsetsKg) && {
        calibTempC: Number(reading.tempC),
      }),
    ...(b.factoryCalibCert != null && { factoryCalibCert: Boolean(b.factoryCalibCert) }),
    ...((b.autoCornerCalibrate || cornerOffsetsKg) &&
      b.factoryCalibCert !== false && { factoryCalibCert: true }),
    ...(b.referenceWeightKg != null && { referenceWeightKg: Number(b.referenceWeightKg) }),
    ...(referenceSingleSideKg != null && {
      referenceSingleSideKg: Number(referenceSingleSideKg),
    }),
    ...(b.broodProbePresent != null && { broodProbePresent: Boolean(b.broodProbePresent) }),
    ...(b.broodProbeOffsetC != null && { broodProbeOffsetC: Number(b.broodProbeOffsetC) }),
    ...(b.factoryProbeCert != null && { factoryProbeCert: Boolean(b.factoryProbeCert) }),
    ...(b.autoBroodProbeCalibrate && { factoryProbeCert: true, broodProbePresent: true }),
    ...(referenceBroodTempC != null && { referenceBroodTempC: Number(referenceBroodTempC) }),
    ...(b.humSensorModel != null && { humSensorModel: String(b.humSensorModel) }),
    ...(b.factoryHumCert != null && { factoryHumCert: Boolean(b.factoryHumCert) }),
    ...(b.referenceHumidityPct != null && { referenceHumidityPct: Number(b.referenceHumidityPct) }),
    ...(b.autoHumidityCalibrate &&
      reading?.humidity != null && {
        referenceHumidityPct: Number(reading.humidity),
        factoryHumCert: true,
        humSensorModel: "SHT31",
      }),
    ...(b.factoryMicCert != null && { factoryMicCert: Boolean(b.factoryMicCert) }),
    ...(b.micMountIsolated != null && { micMountIsolated: Boolean(b.micMountIsolated) }),
    ...(b.acousticLabeledSamples != null && {
      acousticLabeledSamples: Number(b.acousticLabeledSamples),
    }),
    ...(b.referenceAudioRms != null && { referenceAudioRms: Number(b.referenceAudioRms) }),
    ...(b.autoAcousticCalibrate &&
      reading?.audioRms != null && {
        referenceAudioRms: Number(reading.audioRms),
        factoryMicCert: true,
        micMountIsolated: true,
        acousticLabeledSamples: Math.max(Number(prev.acousticLabeledSamples) || 0, 200),
      }),
    ...(b.factoryVibCert != null && { factoryVibCert: Boolean(b.factoryVibCert) }),
    ...(b.adxlFirmwareProd != null && { adxlFirmwareProd: Boolean(b.adxlFirmwareProd) }),
    ...(b.vibrationLabeledEvents != null && {
      vibrationLabeledEvents: Number(b.vibrationLabeledEvents),
    }),
    ...(b.referenceVibration != null && { referenceVibration: Number(b.referenceVibration) }),
    ...(b.autoVibrationCalibrate &&
      reading?.vibration != null && {
        referenceVibration: Number(reading.vibration),
        factoryVibCert: true,
        adxlFirmwareProd: true,
        vibrationLabeledEvents: Math.max(Number(prev.vibrationLabeledEvents) || 0, 50),
      }),
    ...(b.factoryIrCert != null && { factoryIrCert: Boolean(b.factoryIrCert) }),
    ...(b.irMountStandard != null && { irMountStandard: Boolean(b.irMountStandard) }),
    ...(b.autoIrCalibrate && {
      factoryIrCert: true,
      irMountStandard: true,
      ...(reading?.beeOut != null && { middayBeeOutRef: Number(reading.beeOut) }),
    }),
    ...(b.weatherStationBom != null && { weatherStationBom: Boolean(b.weatherStationBom) }),
    ...(b.factoryWeatherCert != null && { factoryWeatherCert: Boolean(b.factoryWeatherCert) }),
    ...(b.weatherFirmwareProd != null && { weatherFirmwareProd: Boolean(b.weatherFirmwareProd) }),
    ...(b.weatherMountStandard != null && { weatherMountStandard: Boolean(b.weatherMountStandard) }),
    ...(b.weatherNectarModel != null && { weatherNectarModel: Boolean(b.weatherNectarModel) }),
    ...(b.weatherScenarioTests != null && { weatherScenarioTests: Number(b.weatherScenarioTests) }),
    ...(b.referenceRainMm != null && { referenceRainMm: Number(b.referenceRainMm) }),
    ...(b.referenceSolarW != null && { referenceSolarW: Number(b.referenceSolarW) }),
    ...(b.autoWeatherCalibrate && {
      weatherStationBom: true,
      factoryWeatherCert: true,
      weatherFirmwareProd: true,
      weatherMountStandard: true,
      weatherNectarModel: true,
      weatherScenarioTests: Math.max(Number(prev.weatherScenarioTests) || 0, 15),
      referenceRainMm:
        b.referenceRainMm != null
          ? Number(b.referenceRainMm)
          : reading?.weatherStation?.rainMm != null
            ? Number(reading.weatherStation.rainMm)
            : reading?.rainMm != null
              ? Number(reading.rainMm)
              : prev.referenceRainMm ?? 0,
      referenceSolarW:
        b.referenceSolarW != null
          ? Number(b.referenceSolarW)
          : reading?.weatherStation?.solarW != null
            ? Number(reading.weatherStation.solarW)
            : reading?.solarW != null
              ? Number(reading.solarW)
              : prev.referenceSolarW ?? 500,
    }),
    ...(b.cameraBom != null && { cameraBom: Boolean(b.cameraBom) }),
    ...(b.factoryCameraCert != null && { factoryCameraCert: Boolean(b.factoryCameraCert) }),
    ...(b.cameraFirmwareProd != null && { cameraFirmwareProd: Boolean(b.cameraFirmwareProd) }),
    ...(b.cameraMountStandard != null && { cameraMountStandard: Boolean(b.cameraMountStandard) }),
    ...(b.cameraYoloOnnx != null && { cameraYoloOnnx: Boolean(b.cameraYoloOnnx) }),
    ...(b.cameraLabeledFrames != null && { cameraLabeledFrames: Number(b.cameraLabeledFrames) }),
    ...(b.cameraScenarioTests != null && { cameraScenarioTests: Number(b.cameraScenarioTests) }),
    ...(b.autoCameraCalibrate && {
      cameraBom: true,
      factoryCameraCert: true,
      cameraFirmwareProd: true,
      cameraMountStandard: true,
      cameraYoloOnnx: true,
      cameraLabeledFrames: Math.max(Number(prev.cameraLabeledFrames) || 0, 500),
      cameraScenarioTests: Math.max(Number(prev.cameraScenarioTests) || 0, 12),
    }),
    ...(b.flowerVisitBom != null && { flowerVisitBom: Boolean(b.flowerVisitBom) }),
    ...(b.factoryFlowerCert != null && { factoryFlowerCert: Boolean(b.factoryFlowerCert) }),
    ...(b.flowerFirmwareProd != null && { flowerFirmwareProd: Boolean(b.flowerFirmwareProd) }),
    ...(b.flowerRoiStandard != null && { flowerRoiStandard: Boolean(b.flowerRoiStandard) }),
    ...(b.flowerContractModel != null && { flowerContractModel: Boolean(b.flowerContractModel) }),
    ...(b.flowerScenarioTests != null && { flowerScenarioTests: Number(b.flowerScenarioTests) }),
    ...(b.autoFlowerVisitCalibrate && {
      flowerVisitBom: true,
      factoryFlowerCert: true,
      flowerFirmwareProd: true,
      flowerRoiStandard: true,
      flowerContractModel: true,
      flowerScenarioTests: Math.max(Number(prev.flowerScenarioTests) || 0, 10),
    }),
    ...(b.solarBatteryBom != null && { solarBatteryBom: Boolean(b.solarBatteryBom) }),
    ...(b.factoryPowerCert != null && { factoryPowerCert: Boolean(b.factoryPowerCert) }),
    ...(b.powerFirmwareProd != null && { powerFirmwareProd: Boolean(b.powerFirmwareProd) }),
    ...(b.sleepModeModel != null && { sleepModeModel: Boolean(b.sleepModeModel) }),
    ...(b.chargeEstimateModel != null && { chargeEstimateModel: Boolean(b.chargeEstimateModel) }),
    ...(b.autoPowerCalibrate && {
      solarBatteryBom: true,
      factoryPowerCert: true,
      powerFirmwareProd: true,
      sleepModeModel: true,
      chargeEstimateModel: true,
    }),
    ...(b.cellularBom != null && { cellularBom: Boolean(b.cellularBom) }),
    ...(b.factoryCellularCert != null && { factoryCellularCert: Boolean(b.factoryCellularCert) }),
    ...(b.cellularFirmwareProd != null && { cellularFirmwareProd: Boolean(b.cellularFirmwareProd) }),
    ...(b.offlineBufferModel != null && { offlineBufferModel: Boolean(b.offlineBufferModel) }),
    ...(b.loraFailoverModel != null && { loraFailoverModel: Boolean(b.loraFailoverModel) }),
    ...(b.autoCellularCalibrate && {
      cellularBom: true,
      factoryCellularCert: true,
      cellularFirmwareProd: true,
      offlineBufferModel: true,
      loraFailoverModel: true,
    }),
    ...(b.loraBom != null && { loraBom: Boolean(b.loraBom) }),
    ...(b.factoryLoraCert != null && { factoryLoraCert: Boolean(b.factoryLoraCert) }),
    ...(b.loraFirmwareProd != null && { loraFirmwareProd: Boolean(b.loraFirmwareProd) }),
    ...(b.loraRetryModel != null && { loraRetryModel: Boolean(b.loraRetryModel) }),
    ...(b.lora4gFailover != null && { lora4gFailover: Boolean(b.lora4gFailover) }),
    ...(b.autoLoraCalibrate && {
      loraBom: true,
      factoryLoraCert: true,
      loraFirmwareProd: true,
      loraRetryModel: true,
      lora4gFailover: true,
    }),
    calibrated: true,
    calibratedAt: new Date().toISOString(),
    cornerCalibratedAt:
      cornerOffsetsKg || b.autoCornerCalibrate ? new Date().toISOString() : prev.cornerCalibratedAt,
    singleSideValidatedAt:
      referenceSingleSideKg != null || b.autoSingleSideCalibrate
        ? new Date().toISOString()
        : prev.singleSideValidatedAt,
    broodProbeCalibratedAt:
      referenceBroodTempC != null || b.autoBroodProbeCalibrate
        ? new Date().toISOString()
        : prev.broodProbeCalibratedAt,
    humidityCalibratedAt:
      b.referenceHumidityPct != null || b.autoHumidityCalibrate
        ? new Date().toISOString()
        : prev.humidityCalibratedAt,
    acousticCalibratedAt:
      b.referenceAudioRms != null ||
      b.autoAcousticCalibrate ||
      b.acousticLabeledSamples != null
        ? new Date().toISOString()
        : prev.acousticCalibratedAt,
    vibrationCalibratedAt:
      b.referenceVibration != null ||
      b.autoVibrationCalibrate ||
      b.vibrationLabeledEvents != null
        ? new Date().toISOString()
        : prev.vibrationCalibratedAt,
    irCalibratedAt:
      b.autoIrCalibrate || b.factoryIrCert != null || b.middayBeeOut != null
        ? new Date().toISOString()
        : prev.irCalibratedAt,
    weatherCalibratedAt:
      b.autoWeatherCalibrate ||
      b.factoryWeatherCert != null ||
      b.referenceRainMm != null ||
      b.referenceSolarW != null
        ? new Date().toISOString()
        : prev.weatherCalibratedAt,
    cameraCalibratedAt:
      b.autoCameraCalibrate ||
      b.factoryCameraCert != null ||
      b.cameraLabeledFrames != null
        ? new Date().toISOString()
        : prev.cameraCalibratedAt,
    flowerVisitCalibratedAt:
      b.autoFlowerVisitCalibrate ||
      b.factoryFlowerCert != null ||
      b.flowerScenarioTests != null
        ? new Date().toISOString()
        : prev.flowerVisitCalibratedAt,
    powerCalibratedAt:
      b.autoPowerCalibrate || b.factoryPowerCert != null
        ? new Date().toISOString()
        : prev.powerCalibratedAt,
    cellularCalibratedAt:
      b.autoCellularCalibrate || b.factoryCellularCert != null
        ? new Date().toISOString()
        : prev.cellularCalibratedAt,
    loraCalibratedAt:
      b.autoLoraCalibrate || b.factoryLoraCert != null
        ? new Date().toISOString()
        : prev.loraCalibratedAt,
  };
  hiveConfig.set(id, next);

  const series = history.get(id) || [];
  const meta = hiveMeta.get(id) || {};
  const normalizedReading = readingWithNormalizedCorners(reading, next);
  const colony = colonyFor(id);
  const calibration = analyzeCalibrationQuality(series, normalizedReading, colony, next, meta);
  const cornerScale = analyzeCornerScaleCalibration(next, normalizedReading);
  const broodZone = analyzeBroodZone(normalizedReading, colony, next, meta);
  res.json({ ok: true, config: next, colony, calibration, cornerScale, broodZone });
});

/** Kovan Petek Tarama — telefon rehberli kalibrasyon */
function applyPetekTaramaConfig(hiveId, config) {
  const prev = hiveConfig.get(hiveId) || {};
  hiveConfig.set(hiveId, { ...prev, ...config, calibrated: true });
}

app.post("/api/hives/:id/petek-tarama/session", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const result = petekTaramaService.createSession(id, req.body || {});
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result);
});

app.get("/api/hives/:id/petek-tarama/session/:sessionId", (req, res) => {
  const id = Number(req.params.id);
  const result = petekTaramaService.getSession(req.params.sessionId);
  if (result.error) return res.status(404).json(result);
  if (result.session.hiveId !== id) return res.status(404).json({ error: "hive_mismatch" });
  res.json(result);
});

app.post("/api/hives/:id/petek-tarama/session/:sessionId/segment", (req, res) => {
  const id = Number(req.params.id);
  const raw = petekTaramaService.getSession(req.params.sessionId);
  if (raw.error) return res.status(404).json(raw);
  if (raw.session.hiveId !== id) return res.status(404).json({ error: "hive_mismatch" });
  const result = petekTaramaService.submitSegment(req.params.sessionId, req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/hives/:id/petek-tarama/session/:sessionId/audio", (req, res) => {
  const id = Number(req.params.id);
  const raw = petekTaramaService.getSession(req.params.sessionId);
  if (raw.error) return res.status(404).json(raw);
  if (raw.session.hiveId !== id) return res.status(404).json({ error: "hive_mismatch" });
  const result = petekTaramaService.submitAudio(req.params.sessionId, req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/hives/:id/petek-tarama/session/:sessionId/analyze", (req, res) => {
  const id = Number(req.params.id);
  const raw = petekTaramaService.getSession(req.params.sessionId);
  if (raw.error) return res.status(404).json(raw);
  if (raw.session.hiveId !== id) return res.status(404).json({ error: "hive_mismatch" });
  const result = petekTaramaService.runAnalysis(req.params.sessionId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/hives/:id/petek-tarama/session/:sessionId/confirm", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const raw = petekTaramaService.getSession(req.params.sessionId);
  if (raw.error) return res.status(404).json(raw);
  if (raw.session.hiveId !== id) return res.status(404).json({ error: "hive_mismatch" });
  const result = petekTaramaService.confirmSession(
    req.params.sessionId,
    req.body || {},
    applyPetekTaramaConfig
  );
  if (result.error) return res.status(400).json(result);
  const reading = latest.get(id);
  const colony = colonyFor(id);
  const config = hiveConfig.get(id) || {};
  if (result.analysis && reading) {
    const baseline = hiveBaselineService.saveBaselineFromPetekTarama(
      id,
      result.session,
      result.analysis,
      { ...reading, weightKg: result.config.weightKgAtCalibration ?? reading.weightKg },
      colony,
      result.config
    );
    result.baseline = baseline;
  }
  res.json({ ...result, colony });
});

app.get("/api/petek-tarama/spec", (_req, res) => {
  res.json({
    name: "Kovan Petek Tarama",
    version: "1.0",
    gapCount: petekTaramaService.GAP_COUNT,
    sides: petekTaramaService.SIDES,
    doc: "docs/ozellikler/kalibrasyon/petek-tarama.md",
    endpoints: [
      "POST /api/hives/:id/petek-tarama/session",
      "GET /api/hives/:id/petek-tarama/session/:sessionId",
      "POST .../segment",
      "POST .../audio",
      "POST .../analyze",
      "POST .../confirm",
    ],
  });
});

/** Başlangıç skoru + trend + revizyon */
app.get("/api/hives/:id/baseline", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const baseline = hiveBaselineService.getBaseline(id);
  if (!baseline) {
    return res.json({
      hiveId: id,
      hasBaseline: false,
      ariciya: "Başlangıç skoru yok — Kovan Petek Tarama yapın",
    });
  }
  res.json({ hiveId: id, hasBaseline: true, baseline });
});

app.get("/api/hives/:id/revision", (req, res) => {
  const id = Number(req.params.id);
  const cur = latest.get(id);
  if (!cur) return res.status(404).json({ error: "hive_not_found" });
  const colony = colonyFor(id);
  const config = hiveConfig.get(id) || {};
  const data = hiveBaselineService.getRevision(id, cur, colony, config);
  res.json({ hiveId: id, ...data });
});

app.get("/api/hives/:id/trends", (req, res) => {
  const id = Number(req.params.id);
  if (!latest.has(id)) return res.status(404).json({ error: "hive_not_found" });
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 90));
  let data = hiveBaselineService.getTrends(id, days);
  if (data.pointCount === 0) {
    const cfg = hiveConfig.get(id) || {};
    data = hiveBaselineService.buildTrendsFromMemory(
      id,
      history.get(id) || [],
      cfg,
      (series, reading, c) => analyzeColony(series, reading, c)
    );
  }
  res.json(data);
});

app.get("/api/alerts", (_req, res) => {
  res.json({ alerts });
});

/** Push bildirim — iOS / Android / web */
app.get("/api/push/config", (_req, res) => {
  res.json(pushService.getConfig());
});

app.post("/api/push/register", (req, res) => {
  const result = pushService.registerDevice(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.delete("/api/push/register/:deviceId", (req, res) => {
  pushService.unregisterDevice(req.params.deviceId);
  res.json({ ok: true });
});

app.get("/api/push/devices", (_req, res) => {
  res.json({ devices: pushService.listDevices() });
});

app.get("/api/push/inbox", (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) return res.status(400).json({ error: "deviceId_required" });
  const since = req.query.since ? Number(req.query.since) : 0;
  const messages = pushService.getInbox(String(deviceId), since);
  const unread = messages.filter((m) => !m.read).length;
  res.json({ deviceId, messages, unread });
});

app.patch("/api/push/inbox/:pushId/read", (req, res) => {
  const deviceId = req.body?.deviceId || req.query.deviceId;
  if (!deviceId) return res.status(400).json({ error: "deviceId_required" });
  const item = pushService.markRead(String(deviceId), req.params.pushId);
  if (!item) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, item });
});

app.post("/api/push/inbox/read-all", (req, res) => {
  const deviceId = req.body?.deviceId;
  if (!deviceId) return res.status(400).json({ error: "deviceId_required" });
  const count = pushService.markAllRead(String(deviceId));
  res.json({ ok: true, count });
});

app.patch("/api/push/preferences", (req, res) => {
  res.json({ ok: true, preferences: pushService.setPreferences(req.body || {}) });
});

app.get("/api/push/history", (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 50);
  res.json({ history: pushService.getHistory(limit) });
});

app.post("/api/push/test", async (req, res) => {
  const { deviceId, message } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "deviceId_required" });
  const result = await pushService.sendTest(deviceId, message);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get("/api/hives/:id/journal", (req, res) => {
  const hiveId = Number(req.params.id);
  if (!latest.has(hiveId)) return res.status(404).json({ error: "hive_not_found" });
  res.json({ hiveId, entries: journalService.listJournal(hiveId) });
});

app.post("/api/hives/:id/journal", (req, res) => {
  const hiveId = Number(req.params.id);
  if (!latest.has(hiveId)) return res.status(404).json({ error: "hive_not_found" });
  const entry = journalService.addJournalEntry(hiveId, req.body || {}, hiveMeta);
  const colony = colonyFor(hiveId);
  res.json({ ok: true, entry, inspectionJournal: colony?.inspectionJournal });
});

app.get("/api/teams", (_req, res) => {
  res.json({ teams: teamService.listTeams() });
});

app.get("/api/orgs", (_req, res) => {
  res.json({ orgs: orgPanelService.listOrgs() });
});

app.get("/api/orgs/panel-links", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `${proto}://${host}`;
  res.json(orgPanelService.panelLinks(base));
});

app.get("/api/orgs/:id", (req, res) => {
  const org = orgPanelService.getOrg(req.params.id);
  if (!org) return res.status(404).json({ error: "org_not_found" });
  res.json({ org: orgPanelService.publicOrg(org) });
});

app.post("/api/orgs", (req, res) => {
  const result = orgPanelService.createOrg(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result);
});

app.post("/api/orgs/:id/members", (req, res) => {
  const result = orgPanelService.addMember(req.params.id, req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/orgs/login", (req, res) => {
  const result = orgPanelService.login(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get("/api/orgs/:id/sessions", (req, res) => {
  res.json({ sessions: orgPanelService.listSessions(req.params.id) });
});

app.post("/api/teams", (req, res) => {
  const { name, ownerEmail } = req.body || {};
  if (!name) return res.status(400).json({ error: "name_required" });
  const team = teamService.createTeam(name, ownerEmail);
  res.json({ ok: true, team });
});

app.post("/api/teams/:id/members", (req, res) => {
  const { email, role } = req.body || {};
  if (!email) return res.status(400).json({ error: "email_required" });
  const team = teamService.addMember(req.params.id, email, role);
  if (!team) return res.status(404).json({ error: "team_not_found" });
  res.json({ ok: true, team });
});

app.get("/api/hives/:id/team", (req, res) => {
  const hiveId = Number(req.params.id);
  res.json({ hiveId, team: teamService.teamForHive(hiveId) });
});

app.get("/api/subscription", (req, res) => {
  const accountId = req.query.accountId || "default";
  res.json(subscriptionService.getPlan(accountId));
});

app.post("/api/subscription", (req, res) => {
  const { accountId = "default", planId } = req.body || {};
  if (!planId) return res.status(400).json({ error: "planId_required" });
  try {
    res.json({ ok: true, plan: subscriptionService.setPlan(accountId, planId) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/offline/queue", (req, res) => {
  const clientId = req.query.clientId || "default";
  res.json({ clientId, pending: offlineSyncService.listPending(clientId) });
});

app.post("/api/offline/sync", (req, res) => {
  const { clientId = "default", items = [] } = req.body || {};
  const results = offlineSyncService.processBatch(clientId, items, (payload) => {
    const hiveId = Number(payload.hiveId);
    if (!Number.isFinite(hiveId)) throw new Error("hiveId_required");
    const series = history.get(hiveId) || [];
    const reading = { ...payload, ts: payload.ts || new Date().toISOString() };
    series.push(reading);
    if (series.length > 200) series.shift();
    history.set(hiveId, series);
    latest.set(hiveId, reading);
    dbService.saveReading(reading, "offline_sync");
  });
  res.json({ ok: true, results });
});

app.get("/api/sla", (req, res) => {
  const teamId = req.query.teamId || null;
  res.json({ records: slaService.listInstallations(teamId).map(slaService.slaStatus) });
});

app.post("/api/sla", (req, res) => {
  const record = slaService.createInstallation(req.body || {});
  res.json({ ok: true, record: slaService.slaStatus(record) });
});

app.patch("/api/sla/:id", (req, res) => {
  const record = slaService.updateInstallation(Number(req.params.id), req.body || {});
  if (!record) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, record: slaService.slaStatus(record) });
});

app.get("/api/strength/preserve", (_req, res) => {
  res.json(getStrengthPreserveReport());
});

function masterKoloniScore(f) {
  if (f.g === "A") return f.aHw;
  if (f.g === "C") return f.cSw;
  return f.k;
}

app.get("/api/master/score", (_req, res) => {
  const items = MASTER_FEATURES.map((f, i) => {
    const k = masterKoloniScore(f);
    const sh = f.sh;
    return {
      no: i + 1,
      g: f.g,
      n: f.n,
      k,
      sh,
      not: getMasterNote(f.n, k, sh),
      durum: getMasterDurum(f.n, k, sh),
    };
  });
  res.json({ count: items.length, items });
});

app.get("/api/pro-lig/score", (_req, res) => {
  const flags = flagsFromEnv();
  const score = computeProLigScore(flags);
  const colony = colonyFor([...latest.keys()][0] || 1);
  res.json({
    updatedAt: new Date().toISOString(),
    ...score,
    healthyHiveIndex: colony?.healthyHive?.healthyHiveIndex ?? null,
    mlFleet: colony?.mlFleet ?? analyzeMlFleet(getFleetStats()),
    weatherCache: openMeteoService.getCacheStats(),
    weatherLive: weatherCache.get("ev")?.source === "open_meteo",
  });
});

app.post("/api/pro-lig/refresh-weather", async (_req, res) => {
  await refreshWeatherCache();
  res.json({ ok: true, cache: openMeteoService.getCacheStats(), locations: [...weatherCache.keys()] });
});

app.get("/api/ingest/spec", (_req, res) => {
  const base = process.env.INGEST_BASE_URL || "http://localhost:3847";
  res.json({
    version: "1.0",
    method: "POST",
    path: "/api/ingest",
    contentType: "application/json",
    required: ["hiveId"],
    fields: {
      hiveId: { type: "number", desc: "Kovan kimliği" },
      weightKg: { type: "number", desc: "Platform tartı (kg)" },
      cornerKg: { type: "number[4]", desc: "4 köşe tartı (kg)" },
      tempC: { type: "number", desc: "İç sıcaklık (°C)" },
      tempBroodC: { type: "number", desc: "Petek içi yavru alanı prob (°C, DS18B20)" },
      humidity: { type: "number", desc: "Nem (%)" },
      beeIn: { type: "number", desc: "IR giriş sayacı" },
      beeOut: { type: "number", desc: "IR çıkış sayacı" },
      vibration: { type: "number", desc: "Titreşim RMS" },
      audioRms: { type: "number", desc: "Akustik RMS" },
      battery: { type: "number", desc: "Pil (%)" },
      solarChargeW: { type: "number", desc: "Güneş şarj gücü (W)" },
      charging: { type: "boolean", desc: "Şarj aktif mi" },
      sleepMode: { type: "boolean", desc: "Uyku modu" },
      cellPresent: { type: "boolean", desc: "GATE 4G var mı" },
      cellularRssi: { type: "number", desc: "4G/GSM RSSI (dBm)" },
      uplink: { type: "string", desc: "lora | 4g | gsm" },
      rssi: { type: "number", desc: "LoRa RSSI (dBm)" },
      loraRssi: { type: "number", desc: "LoRa RSSI kısa yol" },
      lat: { type: "number", desc: "GPS enlem" },
      lon: { type: "number", desc: "GPS boylam" },
      tiltDeg: { type: "number", desc: "Devrilme açısı" },
      pitchDeg: { type: "number", desc: "ADXL pitch (°)" },
      rollDeg: { type: "number", desc: "ADXL roll (°)" },
      weatherStation: {
        type: "object",
        desc: "Arılık hava istasyonu { present, rainMm, solarW, windKmh, tempC, humidityPct }",
      },
      rainMm: { type: "number", desc: "Yağış (mm) — istasyon kısa yol" },
      solarW: { type: "number", desc: "Güneş ışınımı (W/m²)" },
      windKmh: { type: "number", desc: "Rüzgâr (km/s)" },
      outdoorTempC: { type: "number", desc: "Dış sıcaklık (°C)" },
      cameraPresent: { type: "boolean", desc: "Giriş kamerası var mı" },
      cameraBeeIn: { type: "number", desc: "Kamera giriş sayımı" },
      cameraBeeOut: { type: "number", desc: "Kamera çıkış sayımı" },
      cameraCvMethod: { type: "string", desc: "CV yöntemi (yolo_onnx_v1 | motion_blob_v1)" },
      pollenLoadPct: { type: "number", desc: "Dönen arılarda polen yükü (%) — kamera ROI veya tuzak" },
      flowerVisit: { type: "object", desc: "Çiçek ziyareti { pollenLoadPct }" },
      mainCameraPresent: { type: "boolean", desc: "Ana kamera var mı" },
      transportMode: { type: "boolean", desc: "Taşıma modu aktif" },
      fault: { type: "string", desc: "Tek sensör arızası kodu" },
      faults: { type: "string[]", desc: "Çoklu arıza kodları" },
      ts: { type: "ISO8601", desc: "Okuma zamanı (varsayılan: şimdi)" },
    },
    example: {
      hiveId: 1,
      weightKg: 42.5,
      cornerKg: [10.6, 10.5, 10.8, 10.6],
      tempC: 34.2,
      tempBroodC: 36.8,
      humidity: 55,
      beeIn: 1200,
      beeOut: 980,
      rssi: -85,
      battery: 88,
    },
    curl: `curl -X POST ${base}/api/ingest -H 'Content-Type: application/json' -d '{"hiveId":1,"weightKg":42.5,"beeIn":1200,"beeOut":980,"tempC":34,"humidity":55,"rssi":-85}'`,
    calibrate: {
      method: "POST",
      path: "/api/hives/:id/calibrate",
      fields: {
        tareKg: "Boş kovan ağırlığı",
        combKg: "Petek ağırlığı",
        referenceBeeCount: "Referans arı sayısı",
        middayBeeOut: "Öğlen çıkış referansı",
        cornerOffsetsKg: "4 köşe offset dizisi [kg]",
        autoCornerCalibrate: "true → otomatik köşe sıfırlama",
        calibTempC: "Kalibrasyon sıcaklığı (°C)",
        factoryCalibCert: "Fabrika kalibrasyon sertifikası",
        referenceWeightKg: "Referans tartım (kg)",
        referenceSingleSideKg: "Referans tek taraf tartım (kg)",
        autoSingleSideCalibrate: "true → mevcut köşeden tek taraf referansı",
        referenceBroodTempC: "Referans yavru prob sıcaklığı (°C)",
        broodProbeOffsetC: "Prob offset düzeltmesi (°C)",
        autoBroodProbeCalibrate: "true → prob referans kalibrasyonu",
        factoryProbeCert: "DS18B20 fabrika kalibrasyon sertifikası",
        broodProbePresent: "Petek probu takılı",
        referenceHumidityPct: "Mevsimsel referans nem (%)",
        autoHumidityCalibrate: "true → mevcut nem referans kaydı",
        factoryHumCert: "SHT31 fabrika kalibrasyon",
        humSensorModel: "SHT31",
        factoryMicCert: "MEMS mikrofon fabrika kalibrasyon",
        micMountIsolated: "İzole MEMS montaj",
        acousticLabeledSamples: "Etiketli ses kayıt sayısı",
        referenceAudioRms: "Referans akustik RMS",
        autoAcousticCalibrate: "true → RMS ref + etiket arşivi",
        factoryVibCert: "ADXL345 fabrika kalibrasyon",
        adxlFirmwareProd: "ADXL firmware prod",
        vibrationLabeledEvents: "Yağma/rüzgar/taşıma etiket sayısı",
        referenceVibration: "Referans titreşim değeri",
        autoVibrationCalibrate: "true → vib ref + etiket seti",
        factoryIrCert: "IR sayaç fabrika kalibrasyon",
        irMountStandard: "Standart giriş IR montajı",
        autoIrCalibrate: "true → öğlen ref + montaj sertifikası",
        weatherStationBom: "Yağmur+güneş istasyonu BOM (1/15 kovan)",
        factoryWeatherCert: "Hava istasyonu fabrika kalibrasyon",
        weatherFirmwareProd: "İstasyon firmware rain/solar",
        weatherMountStandard: "Arılık direk standart montaj",
        weatherNectarModel: "İstasyon→nektar modeli",
        weatherScenarioTests: "Yağmur/güneş senaryo R sayısı",
        referenceRainMm: "Referans yağış (mm)",
        referenceSolarW: "Referans güneş (W/m²)",
        cameraBom: "Giriş kamera + edge box BOM (opsiyonel takılır)",
        factoryCameraCert: "Kamera fabrika lens/odak kalibrasyon",
        cameraFirmwareProd: "Edge firmware motion+YOLO",
        cameraMountStandard: "Uçuş deliği standart montaj",
        cameraYoloOnnx: "YOLO/ONNX arı sayımı",
        cameraLabeledFrames: "Etiketli kare sayısı (hedef ≥500)",
        cameraScenarioTests: "CV senaryo R sayısı (hedef ≥12)",
        autoCameraCalibrate: "true → kamera fabrika + YOLO + 500 etiket",
        flowerVisitBom: "Giriş ROI polen (ek tuzak yok)",
        factoryFlowerCert: "Polen sınıfı fabrika kalibrasyon",
        flowerFirmwareProd: "Edge firmware polen sepeti",
        flowerRoiStandard: "Uçuş deliği ROI standart",
        flowerContractModel: "Pollination ROI bağ",
        flowerScenarioTests: "Çiçeklenme senaryo R sayısı (hedef ≥10)",
        autoFlowerVisitCalibrate: "true → ROI polen + senaryo R",
        solarBatteryBom: "6W panel + LiFePO4 / CN3065 BOM",
        factoryPowerCert: "Şarj/BMS fabrika test",
        powerFirmwareProd: "Uyku + şarj firmware",
        sleepModeModel: "Uyku modu modeli",
        chargeEstimateModel: "Şarj/gün tahmini",
        autoPowerCalibrate: "true → panel+pil + uyku + şarj",
        cellularBom: "GATE A7670E 4G/GSM BOM",
        factoryCellularCert: "Modem fabrika test",
        cellularFirmwareProd: "4G firmware + SIM",
        offlineBufferModel: "Offline buffer + retry",
        loraFailoverModel: "LoRa→4G failover",
        autoCellularCalibrate: "true → 4G GATE + buffer + failover",
        loraBom: "NODE LoRa + GATE LoRaWAN BOM",
        factoryLoraCert: "LoRa fabrika RSSI test",
        loraFirmwareProd: "LoRa firmware + ADR",
        loraRetryModel: "Ingest retry / queue",
        lora4gFailover: "LoRa→4G failover hazır",
        autoLoraCalibrate: "true → LoRa + retry + failover",
      },
    },
  });
});

app.post("/api/ingest", (req, res) => {
  const b = req.body || {};
  const hiveId = Number(b.hiveId);
  if (!Number.isFinite(hiveId)) {
    return res.status(400).json({ error: "hiveId_required" });
  }
  const weightKg = Number(b.weightKg) || 0;
  const beeIn = Number(b.beeIn) || 0;
  const beeOut = Number(b.beeOut) || 0;
  const filled = fakeSensors(hiveId, weightKg || 28, beeIn, beeOut);
  const meta = hiveMeta.get(hiveId) || {};
  const loc = locationForMeta(meta);
  const faults = [];
  if (b.fault) faults.push(String(b.fault));
  if (Array.isArray(b.faults)) {
    for (const f of b.faults) if (f) faults.push(String(f));
  }
  const resolvedLoc = apiaryLocationService.resolveHiveLocation(
    { ...meta, hiveId },
    null
  );
  // Ingest lat/lon + GPS modülü → kovan GPS güncelle
  if (b.lat != null && b.lon != null && (b.gpsModulePresent || meta.gpsModulePresent)) {
    apiaryLocationService.ingestHiveGps(hiveId, {
      lat: Number(b.lat),
      lon: Number(b.lon),
      gpsModulePresent: true,
      ts: b.ts,
    });
    meta.gpsModulePresent = true;
    hiveMeta.set(hiveId, meta);
  }
  const refreshed = apiaryLocationService.resolveHiveLocation(
    { ...meta, hiveId },
    { hiveId, lat: b.lat != null ? Number(b.lat) : null, lon: b.lon != null ? Number(b.lon) : null }
  );
  const reading = {
    hiveId,
    weightKg,
    tempC: Number(b.tempC) || 0,
    ...(b.tempBroodC != null && { tempBroodC: Number(b.tempBroodC) }),
    humidity: Number(b.humidity) || 0,
    beeIn,
    beeOut,
    cornerKg:
      Array.isArray(b.cornerKg) && b.cornerKg.length === 4
        ? b.cornerKg.map(Number)
        : filled.cornerKg,
    vibration: b.vibration != null ? Number(b.vibration) : filled.vibration,
    audioRms: b.audioRms != null ? Number(b.audioRms) : filled.audioRms,
    battery: b.battery != null ? Number(b.battery) : filled.battery,
    rssi: b.rssi != null ? Number(b.rssi) : filled.rssi,
    loraRssi: b.loraRssi != null ? Number(b.loraRssi) : b.rssi != null ? Number(b.rssi) : filled.rssi,
    solarChargeW: b.solarChargeW != null ? Number(b.solarChargeW) : b.solarPanelW != null ? Number(b.solarPanelW) : null,
    charging: b.charging != null ? Boolean(b.charging) : undefined,
    sleepMode: b.sleepMode != null ? Boolean(b.sleepMode) : undefined,
    cellPresent: b.cellPresent != null ? Boolean(b.cellPresent) : undefined,
    cellularRssi: b.cellularRssi != null ? Number(b.cellularRssi) : b.gsmRssi != null ? Number(b.gsmRssi) : null,
    uplink: b.uplink != null ? String(b.uplink) : undefined,
    lat: b.lat != null ? Number(b.lat) : refreshed.lat ?? meta.beklenenLat ?? loc?.lat,
    lon: b.lon != null ? Number(b.lon) : refreshed.lon ?? meta.beklenenLon ?? loc?.lon,
      tiltDeg: b.tiltDeg != null ? Number(b.tiltDeg) : meta.tiltDeg ?? 0,
      pitchDeg: b.pitchDeg != null ? Number(b.pitchDeg) : null,
      rollDeg: b.rollDeg != null ? Number(b.rollDeg) : null,
      accelX: b.accelX != null ? Number(b.accelX) : null,
      accelY: b.accelY != null ? Number(b.accelY) : null,
      accelZ: b.accelZ != null ? Number(b.accelZ) : null,
      rainMm: b.rainMm != null ? Number(b.rainMm) : null,
      solarW: b.solarW != null ? Number(b.solarW) : null,
      windKmh: b.windKmh != null ? Number(b.windKmh) : null,
      outdoorTempC: b.outdoorTempC != null ? Number(b.outdoorTempC) : null,
      outdoorHumidityPct: b.outdoorHumidityPct != null ? Number(b.outdoorHumidityPct) : null,
      weatherStation: (() => {
        const ws = b.weatherStation && typeof b.weatherStation === "object" ? b.weatherStation : null;
        if (!ws && b.rainMm == null && b.solarW == null) return undefined;
        return {
          present: ws?.present != null ? Boolean(ws.present) : true,
          rainMm: ws?.rainMm != null ? Number(ws.rainMm) : b.rainMm != null ? Number(b.rainMm) : null,
          solarW: ws?.solarW != null ? Number(ws.solarW) : b.solarW != null ? Number(b.solarW) : null,
          windKmh: ws?.windKmh != null ? Number(ws.windKmh) : b.windKmh != null ? Number(b.windKmh) : null,
          tempC: ws?.tempC != null ? Number(ws.tempC) : b.outdoorTempC != null ? Number(b.outdoorTempC) : null,
          humidityPct:
            ws?.humidityPct != null
              ? Number(ws.humidityPct)
              : b.outdoorHumidityPct != null
                ? Number(b.outdoorHumidityPct)
                : null,
        };
      })(),
    cameraPresent: b.cameraPresent != null ? Boolean(b.cameraPresent) : true,
    cameraBeeIn: b.cameraBeeIn != null ? Number(b.cameraBeeIn) : null,
    cameraBeeOut: b.cameraBeeOut != null ? Number(b.cameraBeeOut) : null,
    pollenLoadPct: b.pollenLoadPct != null ? Number(b.pollenLoadPct) : b.flowerVisit?.pollenLoadPct != null ? Number(b.flowerVisit.pollenLoadPct) : null,
    flowerVisit:
      b.flowerVisit && typeof b.flowerVisit === "object"
        ? {
            pollenLoadPct:
              b.flowerVisit.pollenLoadPct != null
                ? Number(b.flowerVisit.pollenLoadPct)
                : b.pollenLoadPct != null
                  ? Number(b.pollenLoadPct)
                  : null,
          }
        : undefined,
    mainCameraPresent: b.mainCameraPresent != null ? Boolean(b.mainCameraPresent) : false,
    transportMode: b.transportMode != null ? Boolean(b.transportMode) : false,
    fault: faults[0] || null,
    faults: faults.length ? faults : null,
    scenario: meta.scenario || "ingest",
    scenarioLabel: meta.label || "Canlı veri",
    ts: b.ts || new Date().toISOString(),
  };
  const series = history.get(hiveId) || [];
  const config = hiveConfig.get(hiveId) || {};
  fillReadingCameraCounts(reading, [...series, reading], config);
  fillReadingPollenLoad(reading, config);
  series.push(reading);
  if (series.length > 200) series.shift();
  history.set(hiveId, series);
  latest.set(hiveId, reading);

  const saved = dbService.saveReading(
    reading,
    meta.label || meta.scenarioLabel || "canlı veri"
  );

  syncAllAlerts();

  const colony = colonyFor(hiveId);
  let scoreTrack = null;
  try {
    scoreTrack = hiveBaselineService.recordSensorRevision(hiveId, reading, colony, config);
  } catch (e) {
    console.warn("Score history:", e.message);
  }
  try {
    const health = colony?.sensorHealth || assessSensorHealth(reading, meta);
    const weather = weatherForHive(hiveId, reading);
    const hiveCamera = analyzeHiveCamera(
      reading,
      colony,
      meta,
      weather,
      series,
      health,
      config
    );
    mlLearningService.processHiveLearning(
      hiveId,
      reading,
      { ...colony, hiveCamera },
      meta,
      health
    );
    mlLearningService.computeFleetNecessity(
      [...latest.values()].map((r) => {
        const m = hiveMeta.get(r.hiveId) || {};
        const c = colonyFor(r.hiveId);
        return {
          hiveId: r.hiveId,
          reading: r,
          colony: c,
          meta: m,
          sensorHealth: c?.sensorHealth,
          scenarioLabel: m.label,
        };
      })
    );
  } catch (e) {
    console.warn("ML ingest:", e.message);
  }
  res.json({ ok: true, reading, colony, db: saved, scoreRevision: scoreTrack?.revision || null });
});

app.use(express.static(path.join(__dirname, "../../web")));

const PORT = process.env.PORT || 3847;

refreshWeatherCache().catch((e) => console.warn("Open-Meteo:", e.message));
setInterval(() => refreshWeatherCache().catch(() => {}), 30 * 60 * 1000);

app.listen(PORT, () => {
  const stats = dbService.getStats();
  console.log(`Hive demo → http://localhost:${PORT}`);
  console.log(`Ana:      http://localhost:${PORT}/ana.html`);
  console.log(
    `DB: ${dbService.DB_PATH} (${stats.readings?.total ?? 0} okuma, ${stats.labels?.total ?? 0} etiket)`
  );
  console.log(`ML export: GET /api/export/dataset · Etiket: POST /api/labels`);
  console.log(`Yönetici: http://localhost:${PORT}/yonetici.html?org=koloni-demo`);
  console.log(`Arıcı:    http://localhost:${PORT}/arici.html?org=koloni-demo`);
  console.log(`İşçi:     http://localhost:${PORT}/isci.html?org=koloni-demo`);
  console.log(`ML admin: http://localhost:${PORT}/admin.html`);
  console.log(`Kovan Petek Tarama: http://localhost:${PORT}/petek-tarama.html?hiveId=1`);
});
