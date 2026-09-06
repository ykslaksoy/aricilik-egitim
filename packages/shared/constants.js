/** koloni — paylaşılan sabitler (api + firmware + değerlendirme referans) */

module.exports = {
  BRAND: "koloni",
  HARDWARE: "beepack",

  /** ölçüm periyodu (dk) */
  INTERVAL_MIN: 15,

  /** arı kütlesi modeli */
  BEE_MASS_KG: 0.0001,
  FORAGER_FRACTION: 0.38,
  AVG_TRIP_MIN: 45,

  /** oğul kg düşüş eşikleri */
  SWARM_DROP_6H_KG: -3,
  SWARM_DROP_24H_KG: -4,

  /** oğul risk skoru (0–100) */
  SWARM: {
    RISK_CRITICAL: 75,
    RISK_ELEVATED: 50,
    RISK_WATCH: 28,
  },

  /** arı sayısına göre oğul öncesi alarm katmanları */
  BEE_SWARM_TIERS: [
    {
      min: 55000,
      tier: 5,
      label: "Maksimum (~55k+)",
      alarmLevel: "critical",
      minRisk: 88,
      beeSignal: "~55k+ arı — oğul kaçınılmaz olabilir; hemen kat böl veya süper ekle.",
    },
    {
      min: 48000,
      tier: 4,
      label: "Kritik (~48k+)",
      alarmLevel: "critical",
      minRisk: 75,
      beeSignal: "~48k+ arı — kritik kalabalık; 48 saat içinde müdahale.",
    },
    {
      min: 45000,
      tier: 3,
      label: "Yüksek (~45k+)",
      alarmLevel: "elevated",
      minRisk: 58,
      beeSignal: "~45k+ arı — oğul riski yükseliyor; süper veya kat planla.",
    },
    {
      min: 40000,
      tier: 2,
      label: "Artan (~40k+)",
      alarmLevel: "elevated",
      minRisk: 45,
      beeSignal: "~40k+ arı — yoğunluk artıyor; katman kontrol et.",
    },
    {
      min: 35000,
      tier: 1,
      label: "İzle (~35k+)",
      alarmLevel: "watch",
      minRisk: 30,
      beeSignal: "~35k+ arı — oğul sezonu izle.",
    },
  ],

  /**
   * Sensör okuma → uyarı / skor eşikleri (tek kaynak).
   * Doküman: docs/ozellikler/sensorler/degerlendirme.md
   */
  SENSOR: {
    CORNER_IMBALANCE_KG: 2,
    VIBRATION_HIGH: 12,
    AUDIO_HIGH: 0.55,
    AUDIO_LOW: 0.12,
    TEMP_LOW_C: 28,
    TEMP_HIGH_C: 38.5,
    TEMP_IDEAL_MIN_C: 32,
    TEMP_IDEAL_MAX_C: 36,
    TEMP_FAULT_MIN_C: -10,
    TEMP_FAULT_MAX_C: 50,
    HUM_LOW_PCT: 32,
    HUM_HIGH_PCT: 85,
    HUM_IDEAL_MIN_PCT: 45,
    HUM_IDEAL_MAX_PCT: 70,
    RSSI_LOW_DBM: -105,
    BATTERY_LOW_PCT: 20,
    WEIGHT_FAULT_MAX_KG: 80,
    WEIGHT_FAULT_MIN_KG: 0,
    OFFLINE_MS: 2 * 3600 * 1000,
    MIDDAY_TRAFFIC_LOW: 100,
    QUEENLESS_AUDIO_MIN: 0.52,
    QUEENLESS_INOUT_RATIO_MAX: 0.55,
    QUEENLESS_HEALTH_MAX: 80,
  },

  /** Skor / koloni gücü eşikleri (analyzeColony) */
  SCORE: {
    HEALTH_CRITICAL: 45,
    HEALTH_ATTENTION: 65,
    COLONY_WEAK: 40,
    BEE_WEAK: 18000,
    BEE_STRONG: 28000,
    BEE_MEGA: 45000,
    SWING_IDEAL_MIN_KG: 0.4,
    SWING_IDEAL_MAX_KG: 2.5,
    SWING_HIGH_KG: 4,
    SWING_BROOD_MAX_KG: 4.5,
    TRAFFIC_STRONG: 1200,
    TRAFFIC_GOOD: 600,
    TRAFFIC_WEAK: 200,
    TRAFFIC_HEALTH_MIN: 400,
    TRAFFIC_HEALTH_WEAK: 150,
  },

  /** Besleme görev eşikleri */
  FEEDING: {
    WEIGHT_KG: 24,
    WEIGHT_URGENT_KG: 22,
    BEE_MIN: 18000,
  },

  /** Yavru çıkışı modeli */
  BROOD: {
    CYCLE_DAYS: 21,
    EMERGE_MIN: 400,
    EMERGE_MAX: 2500,
    GAIN_MIN_21D_KG: 0.35,
    GAIN_ACTIVE_7D_KG: 0.12,
    MASS_FRACTION: 0.55,
  },

  /** Konum hava → görev */
  WEATHER: {
    FROST_TEMP_C: 5,
    STORM_WIND_KMH: 40,
    HEAT_OUTDOOR_C: 32,
    PRECIP_MM: 2,
  },

  /**
   * Hastalık riski (sensör proxy — Varroa / chalkbrood / zayıflık).
   * Kesin teşhis değil; muayene önerisi.
   */
  DISEASE: {
    RISK_HIGH: 65,
    RISK_ELEVATED: 45,
    RISK_WATCH: 28,
    TRAFFIC_LOW: 150,
    GRADUAL_DROP_7D_KG: -0.8,
  },

  /**
   * Risk kategorileri (biyolojik, çevresel, yönetim, dış tehdit).
   * Doküman: docs/ozellikler/skorlar/risk-kategorileri.md
   */
  RISK: {
    INSPECTION_DAYS_WARN: 21,
    INSPECTION_DAYS_CRITICAL: 35,
    COMB_AGE_WARN_YEARS: 3,
    COMB_AGE_CRITICAL_YEARS: 5,
    ROBBING_VIBRATION_MIN: 8,
    ROBBING_WEIGHT_DROP_KG: -0.35,
    PESTICIDE_TRAFFIC_MAX: 130,
    AUTUMN_MONTH_START: 9,
    AUTUMN_MONTH_END: 11,
  },

  /** Sıcaklık skoru, trend ve neden analizi */
  TEMP: {
    DELTA_RISE_6H_C: 1.0,
    DELTA_DROP_6H_C: -1.0,
    DELTA_RISE_24H_C: 1.8,
    DELTA_DROP_24H_C: -1.8,
  },

  /** Nem skoru, trend ve yoğuşma analizi */
  HUM: {
    DELTA_RISE_6H_PCT: 5,
    DELTA_DROP_6H_PCT: -5,
    DELTA_RISE_24H_PCT: 8,
    DELTA_DROP_24H_PCT: -8,
    CONDENSATION_GAP_C: 6,
    OUTDOOR_GAP_HIGH_PCT: 25,
  },

  /** IR trafik analizi */
  IR: {
    INOUT_RATIO_LOW: 0.45,
    INOUT_RATIO_HIGH: 0.85,
    PESTICIDE_TRAFFIC_MAX: 130,
    NECTAR_SWING_MIN_KG: 0.8,
  },

  /** Bağlantı / pil tahmini */
  CONNECTIVITY: {
    BATTERY_DAYS_PER_PCT: 0.35,
    RSSI_DEGRADE_DBM: -95,
  },

  /** Giriş kapısı / uçuş deliği pozisyonları */
  GATE: {
    POSITIONS: ["acik", "orta", "dar", "kapali"],
    DEFAULT: "orta",
  },

  /** Kamera CV sayım + IR karşılaştırma (edge motion pipeline) */
  CAMERA: {
    IR_AGREE_PCT: 18,
    CV_BLEND_WEIGHT: 0.28,
    TRAFFIC_HIGH_IN: 1400,
    TRAFFIC_HIGH_OUT: 1500,
    TRAFFIC_LOW_IN: 80,
    TRAFFIC_LOW_OUT: 90,
    REFRESH_SEC: 30,
    MOTION_FRAMES: 4,
    MOTION_BLOB_MIN: 3,
    MOTION_CONFIDENCE_BASE: 72,
  },

  /** Hasat zamanı */
  HARVEST: {
    HONEY_KG_READY: 12,
    HONEY_KG_PARTIAL: 6,
    GAIN_3D_PLATEAU_KG: 0.35,
    SCORE_READY: 70,
    SCORE_SOON: 45,
    SEASON_START_MONTH: 6,
    SEASON_END_MONTH: 9,
  },

  /** Pollination kontrat ROI */
  POLLINATION: {
    TARGET_SCORE_PER_HIVE: 65,
    UNDERPERFORM_PCT: 70,
    OVERPERFORM_PCT: 110,
  },

  /** GPS / devrilme */
  GPS: {
    DRIFT_WARN_M: 25,
    DRIFT_CRITICAL_M: 80,
    TILT_WARN_DEG: 12,
    TILT_CRITICAL_DEG: 45,
    VIBRATION_TIP_M: 10,
  },

  /** Muayene / ilaç günlüğü */
  INSPECTION: {
    VARROA_TREATMENT_MAX_DAYS: 42,
  },

  /** geriye uyumluluk */
  CORNER_IMBALANCE_KG: 2,
  BATTERY_LOW_PCT: 20,

  /** abonelik geçmiş gün */
  PLAN_HISTORY_DAYS: {
    starter: 7,
    pro: 90,
    enterprise: Infinity,
  },

  DEFAULT_BREEDS: [
    "Kafkas",
    "Karniyol",
    "Anadolu",
    "İtalyan",
    "Buckfast",
    "Yerel / melez",
    "Bilinmiyor",
  ],

  CAMERA_OPTIONAL: true,
  MAIN_CAMERA_OPTIONAL: true,
  CAMERA_REQUIRED_FOR_SCORES: false,
};
