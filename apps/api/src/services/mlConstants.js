/** ML öğrenme — paylaşılan sabitler */

const { ANALYSES } = require("../../../../packages/shared/analysisRegistry");

const SENSORS = ["scale", "temp", "humidity", "ir", "mic", "vibration", "camera"];

const ANALYSIS_SENSOR_MAP = {
  sicaklik: ["temp"],
  nem: ["humidity"],
  ir_trafik: ["ir"],
  tarti: ["scale"],
  mikrofon: ["mic"],
  titresim: ["vibration"],
  baglanti: ["scale"],
  kose_tarti: ["scale"],
  akustik_ml: ["mic"],
  gps_devrilme: ["scale"],
  koloni_skoru: ["scale", "ir", "temp", "humidity"],
  saglik_skoru: ["temp", "humidity", "scale", "ir"],
  ogul_riski: ["scale", "ir"],
  yavru_cikisi: ["scale"],
  ari_tahmini: ["scale", "ir"],
  hasat_zamani: ["scale"],
  kovan_kamera: ["camera"],
  kamera_ir_ky: ["camera", "ir"],
  kamera_guvenlik: ["camera", "vibration"],
  ogul_derin: ["scale", "ir", "mic"],
  hastalik_derin: ["temp", "humidity", "ir"],
  akustik_ml_domain: ["mic"],
};

const DOMAINS = [
  { id: "traffic", label: "IR trafik", analyses: ["ir_trafik", "ari_tahmini"], method: "sensorAnalysis.analyzeIrTraffic", codeRef: "sensorAnalysis.js:analyzeIrTraffic" },
  { id: "weight", label: "Tartı / ağırlık", analyses: ["tarti", "ogul_riski", "hasat_zamani"], method: "sensorAnalysis.analyzeWeight", codeRef: "sensorAnalysis.js:analyzeWeight" },
  { id: "acoustic", label: "Akustik ML", analyses: ["akustik_ml"], method: "acousticMlAnalysis.analyzeAcousticMl", codeRef: "acousticMlAnalysis.js" },
  { id: "health", label: "Sağlık skoru", analyses: ["saglik_skoru", "koloni_skoru"], method: "colony.analyzeColony", codeRef: "colony.js:analyzeColony" },
  { id: "swarm", label: "Oğul riski", analyses: ["ogul_riski", "ogul_derin"], method: "colony.analyzeSwarmRisk", codeRef: "colony.js:analyzeSwarmRisk" },
  { id: "humidity", label: "Nem", analyses: ["nem"], method: "colony.analyzeHumidity", codeRef: "colony.js:analyzeHumidity" },
  { id: "temperature", label: "Sıcaklık", analyses: ["sicaklik"], method: "colony.analyzeTemperature", codeRef: "colony.js:analyzeTemperature" },
  { id: "camera_cv", label: "Kamera CV", analyses: ["kovan_kamera", "kamera_ir_ky"], method: "cameraAnalysis.analyzeHiveCamera", codeRef: "cameraAnalysis.js:analyzeHiveCamera" },
  { id: "fusion", label: "Sensör fusion", analyses: ["kovan_ozeti", "sensor_ciftleri"], method: "sensorFusion.fuseHiveNarrative", codeRef: "sensorFusion.js" },
  { id: "queenless", label: "Ana kaybı proxy", analyses: ["akustik_ml"], method: "acousticMlAnalysis + hiveState", codeRef: "hiveState.js:evaluateAna" },
];

module.exports = {
  SENSORS,
  ANALYSIS_SENSOR_MAP,
  DOMAINS,
  ANALYSES,
};
