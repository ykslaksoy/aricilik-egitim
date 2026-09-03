/**
 * Analiz kataloğu — tek kaynak.
 * Yeni analiz: bu listeye ekle → API /api/analyses otomatik güncellenir.
 *
 * durum: calisiyor | demo | plan | kapali
 * katman: sensor | skor | skor_derin | birlesik | kamera | arilik | meta | durum
 */

const ANALYSES = [
  // —— Sensör (tek kaynak) ——
  { id: "sicaklik", ad: "Sıcaklık analizi", katman: "sensor", kaynak: "sicaklik", modul: "colony.analyzeTemperature", durum: "calisiyor", gerekli: ["tempC"] },
  { id: "nem", ad: "Nem analizi", katman: "sensor", kaynak: "nem", modul: "colony.analyzeHumidity", durum: "calisiyor", gerekli: ["humidity"] },
  { id: "ir_trafik", ad: "IR trafik analizi", katman: "sensor", kaynak: "ir", modul: "sensorAnalysis.analyzeIrTraffic", durum: "calisiyor", gerekli: ["beeIn", "beeOut"] },
  { id: "tarti", ad: "Tartı analizi", katman: "sensor", kaynak: "tarti", modul: "sensorAnalysis.analyzeWeight", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "mikrofon", ad: "Mikrofon analizi", katman: "sensor", kaynak: "mikrofon", modul: "sensorAnalysis.analyzeAudio", durum: "calisiyor", gerekli: ["audioRms"] },
  { id: "titresim", ad: "Titreşim analizi", katman: "sensor", kaynak: "titresim", modul: "sensorAnalysis.analyzeVibration", durum: "calisiyor", gerekli: ["vibration"] },
  { id: "baglanti", ad: "Pil / LoRa analizi", katman: "sensor", kaynak: "pil", modul: "sensorAnalysis.analyzeConnectivity", durum: "calisiyor", gerekli: ["battery", "rssi"] },
  { id: "kose_tarti", ad: "4 köşe dengesi", katman: "sensor", kaynak: "tarti", modul: "sensorAnalysis.analyzeCornerBalance", durum: "calisiyor", gerekli: ["cornerKg"] },
  { id: "akustik_ml", ad: "Akustik ML (queenless / oğul)", katman: "sensor", kaynak: "mikrofon", modul: "acousticMlAnalysis.analyzeAcousticMl", durum: "calisiyor", gerekli: ["audioRms"] },
  { id: "gps_devrilme", ad: "GPS + devrilme analizi", katman: "sensor", kaynak: "gps,tilt", modul: "gpsTiltAnalysis.analyzeGpsTilt", durum: "calisiyor", gerekli: ["lat", "lon"] },
  { id: "yavru_alani", ad: "Yavru alanı sıcaklık (prob/model)", katman: "sensor", kaynak: "sicaklik,tarti", modul: "broodZoneAnalysis.analyzeBroodZone", durum: "calisiyor", gerekli: ["tempC"] },
  { id: "tek_taraf_tarti", ad: "Tek taraf tartı tahmini", katman: "sensor", kaynak: "tarti", modul: "singleSideScaleAnalysis.analyzeSingleSideScale", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "hava_istasyonu", ad: "Hava istasyonu füzyonu", katman: "sensor", kaynak: "hava", modul: "weatherStationAnalysis.fuseWeatherStation", durum: "calisiyor", gerekli: [], opsiyonel: true },
  { id: "cicek_ziyareti", ad: "Çiçek ziyareti indeksi", katman: "sensor", kaynak: "ir,hava,kamera", modul: "flowerVisitAnalysis.analyzeFlowerVisit", durum: "calisiyor", gerekli: ["beeOut"], opsiyonel: true },

  // —— Skor / koloni ——
  { id: "koloni_skoru", ad: "Koloni skoru", katman: "skor", kaynak: "tarti,ir,sicaklik,nem", modul: "colony.analyzeColony", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "saglik_skoru", ad: "Sağlık skoru", katman: "skor", kaynak: "coklu", modul: "colony.analyzeHealth", durum: "calisiyor", gerekli: ["tempC", "humidity"] },
  { id: "hastalik_riski", ad: "Hastalık riski (proxy)", katman: "skor", kaynak: "coklu", modul: "colony.analyzeDiseaseRisk", durum: "calisiyor", gerekli: [] },
  { id: "ogul_riski", ad: "Oğul riski", katman: "skor", kaynak: "tarti,ir", modul: "colony.analyzeSwarmRisk", durum: "calisiyor", gerekli: [] },
  { id: "yavru_cikisi", ad: "Yavru çıkışı (yaz)", katman: "skor", kaynak: "tarti", modul: "colony.analyzeBroodEmergence", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "ari_tahmini", ad: "Arı sayısı tahmini", katman: "skor", kaynak: "tarti,ir", modul: "colony.analyzeColony", durum: "calisiyor", gerekli: ["weightKg", "beeOut"] },

  // —— Derin skor ——
  { id: "ogul_derin", ad: "Oğul derin analiz", katman: "skor_derin", kaynak: "coklu", modul: "scoreDeep.analyzeSwarmDeep", durum: "calisiyor", gerekli: [] },
  { id: "hastalik_derin", ad: "Hastalık derin analiz", katman: "skor_derin", kaynak: "coklu", modul: "scoreDeep.analyzeDiseaseDeep", durum: "calisiyor", gerekli: [] },
  { id: "saglik_derin", ad: "Sağlık derin analiz", katman: "skor_derin", kaynak: "coklu", modul: "scoreDeep.analyzeHealthDeep", durum: "calisiyor", gerekli: [] },
  { id: "yavru_derin", ad: "Yavru / nektar ayrımı", katman: "skor_derin", kaynak: "tarti,ir", modul: "scoreDeep.analyzeBroodDeep", durum: "calisiyor", gerekli: [] },
  { id: "hasat_zamani", ad: "Hasat zamanı tahmini", katman: "skor_derin", kaynak: "tarti", modul: "harvestAnalysis.analyzeHarvestTiming", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "kis_store", ad: "Kış açlığı / store uyarısı", katman: "skor_derin", kaynak: "tarti", modul: "winterStoreAnalysis.analyzeWinterStore", durum: "calisiyor", gerekli: ["weightKg"] },
  { id: "queenless_fusion", ad: "Ana kaybı 24–48 sa füzyon", katman: "skor_derin", kaynak: "mikrofon,ir", modul: "queenlessFusionAnalysis.analyzeQueenlessFusion", durum: "calisiyor", gerekli: ["audioRms"] },
  { id: "varroa_proxy", ad: "Varroa / hastalık proxy", katman: "skor_derin", kaynak: "coklu", modul: "varroaAnalysis.analyzeVarroaRisk", durum: "calisiyor", gerekli: [] },
  { id: "yagma", ad: "Yağma (robbing) tespiti", katman: "skor_derin", kaynak: "mikrofon,titresim", modul: "robbingAnalysis.analyzeRobbing", durum: "calisiyor", gerekli: ["audioRms"] },
  { id: "ml_filo", ad: "ML filo kalibrasyonu", katman: "skor_derin", kaynak: "ml", modul: "mlFleetAnalysis.analyzeMlFleet", durum: "calisiyor", gerekli: [] },

  // —— Meta / tahmin / hava ——
  { id: "kalibrasyon_guven", ad: "Kalibrasyon güveni", katman: "meta", kaynak: "kalibrasyon", modul: "calibrationAnalysis", durum: "calisiyor", gerekli: [] },
  { id: "petek_tarama", ad: "Kovan Petek Tarama (telefon)", katman: "meta", kaynak: "kalibrasyon,video", modul: "calibrationVisionService.analyzePetekTaramaSession", durum: "calisiyor", gerekli: [], opsiyonel: true },
  { id: "baslangic_skoru", ad: "Başlangıç skoru / revizyon", katman: "meta", kaynak: "kalibrasyon,tarti", modul: "hiveBaselineService.computeRevision", durum: "calisiyor", gerekli: [] },
  { id: "meta_kayit", ad: "Kayıt meta analizi", katman: "meta", kaynak: "kayit", modul: "metaAnalysis", durum: "calisiyor", gerekli: [] },
  { id: "tahmin_anomali", ad: "Tahmin / anomali", katman: "meta", kaynak: "coklu", modul: "predictiveAnalysis", durum: "calisiyor", gerekli: [] },
  { id: "hava_indeksleri", ad: "Nektar / uçuş / stres indeksi", katman: "meta", kaynak: "hava,tarti,ir", modul: "weatherIndices", durum: "calisiyor", gerekli: [] },
  { id: "tasima_yerlesme", ad: "Taşıma / yerleşme", katman: "meta", kaynak: "operasyon", modul: "transportAnalysis", durum: "calisiyor", gerekli: [] },
  { id: "muayene_gunlugu", ad: "Muayene / ilaç günlüğü analizi", katman: "meta", kaynak: "kayit", modul: "inspectionJournalAnalysis.analyzeInspectionJournal", durum: "calisiyor", gerekli: [] },

  // —— Kamera ——
  { id: "kovan_kamera", ad: "Kovan kamerası (CV)", katman: "kamera", kaynak: "kamera", modul: "cameraAnalysis.analyzeHiveCamera", durum: "calisiyor", gerekli: ["cameraPresent"], opsiyonel: true },
  { id: "kamera_ir_ky", ad: "Kamera ↔ IR karşılaştırma", katman: "kamera", kaynak: "kamera,ir", modul: "cameraAnalysis.analyzeIrComparison", durum: "calisiyor", gerekli: ["cameraPresent", "beeOut"], opsiyonel: true },
  { id: "arilik_kamera", ad: "Arılık kamerası analizi", katman: "kamera", kaynak: "ana_kamera", modul: "cameraAnalysis.analyzeApiaryCamera", durum: "calisiyor", gerekli: ["mainCameraPresent"], opsiyonel: true },
  { id: "kamera_guvenlik", ad: "Kamera güvenlik / hırsızlık", katman: "kamera", kaynak: "kamera,titresim", modul: "securityCameraAnalysis.analyzeSecurityCameras", durum: "calisiyor", gerekli: [], opsiyonel: true },

  // —— Birleşik ——
  { id: "sensor_ciftleri", ad: "İki sensör birleşimi", katman: "birlesik", kaynak: "coklu", modul: "sensorAnalysis.analyzePairFusions", durum: "calisiyor", gerekli: [] },
  { id: "giris_kapisi", ad: "Giriş kapısı fusion", katman: "birlesik", kaynak: "coklu", modul: "entranceGate.fuseSensorEvidence", durum: "calisiyor", gerekli: [] },
  { id: "kovan_ozeti", ad: "Kovan birleşik özeti", katman: "birlesik", kaynak: "coklu", modul: "sensorFusion.fuseHiveNarrative", durum: "calisiyor", gerekli: [] },
  { id: "arilik_birlesik", ad: "Arılık birleşik analizi", katman: "arilik", kaynak: "coklu", modul: "apiaryFusion.fuseApiaryNarrative", durum: "calisiyor", gerekli: [] },
  { id: "pollination_roi", ad: "Pollination / tarla ROI", katman: "arilik", kaynak: "coklu", modul: "pollinationAnalysis.analyzePollinationRoi", durum: "calisiyor", gerekli: [], opsiyonel: true },
  { id: "healthy_hive", ad: "Healthy Hive indeksi", katman: "arilik", kaynak: "coklu", modul: "healthyHiveAnalysis.analyzeHealthyHiveIndex", durum: "calisiyor", gerekli: [] },

  // —— Durum boyutları ——
  { id: "kovan_durumlari", ad: "Kovan durum değerlendirmesi", katman: "durum", kaynak: "coklu", modul: "hiveState.evaluateHiveState", durum: "calisiyor", gerekli: [] },
  { id: "risk_kategorileri", ad: "Risk kategorileri (4 başlık)", katman: "durum", kaynak: "coklu", modul: "hiveState.evaluateRiskKategorileri", durum: "calisiyor", gerekli: [] },
];

const KATMAN_LABEL = {
  sensor: "Sensör",
  skor: "Skor",
  skor_derin: "Derin skor",
  birlesik: "Birleşik",
  kamera: "Kamera",
  arilik: "Arılık",
  meta: "Meta / tahmin",
  durum: "Durum",
};

const DURUM_LABEL = {
  calisiyor: "Çalışıyor",
  demo: "Demo / proxy",
  plan: "Plan",
  kapali: "Kapalı",
};

function countAnalyses(list = ANALYSES) {
  const byDurum = {};
  const byKatman = {};
  for (const a of list) {
    byDurum[a.durum] = (byDurum[a.durum] || 0) + 1;
    byKatman[a.katman] = (byKatman[a.katman] || 0) + 1;
  }
  const aktif = list.filter((a) => a.durum === "calisiyor" || a.durum === "demo");
  return {
    toplam: list.length,
    calisiyor: byDurum.calisiyor || 0,
    demo: byDurum.demo || 0,
    plan: byDurum.plan || 0,
    kapali: byDurum.kapali || 0,
    aktif: aktif.length,
    byDurum,
    byKatman,
  };
}

function getAnalysisById(id) {
  return ANALYSES.find((a) => a.id === id) || null;
}

module.exports = {
  ANALYSES,
  KATMAN_LABEL,
  DURUM_LABEL,
  countAnalyses,
  getAnalysisById,
};
